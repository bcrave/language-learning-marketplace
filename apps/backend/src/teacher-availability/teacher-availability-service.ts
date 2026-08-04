import { createHash } from "node:crypto";

import { namedRegionalTimeZones, type UserIdentity } from "@marketplace/core";
import { Temporal } from "@js-temporal/polyfill";
import { sql } from "kysely";

import type { Database } from "../database/database.js";
import {
  resolveLocalDateTime,
  resolveWeeklyRangeOccurrence,
  type LocalTimeDisambiguation,
} from "./teacher-availability-time.js";

export const WEEKDAYS = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

type Teacher = { id: string; displayTimeZone: string | null };
type ValidationError = {
  __typename: "TeacherAvailabilityValidationError";
  code: string;
  message: string;
};

export async function teacherFor(
  db: Database,
  identity: UserIdentity,
  correlationId: string,
  operation: string,
) {
  const user = await db.selectFrom("users")
    .select(["id", "display_time_zone"])
    .where("identity_issuer", "=", identity.issuer)
    .where("identity_subject", "=", identity.subject)
    .executeTakeFirst();
  if (!user) return { status: "UNKNOWN_USER" as const };
  const role = await db.selectFrom("role_assignments").select("role")
    .where("user_id", "=", user.id).where("role", "=", "TEACHER").executeTakeFirst();
  if (!role) {
    await recordAudit(db, user.id, correlationId, operation, "TeacherAvailability", user.id, "DENIED", "TEACHER_ROLE_REQUIRED");
    return { status: "ROLE_REQUIRED" as const, userId: user.id };
  }
  return { status: "SUCCEEDED" as const, teacher: { id: user.id, displayTimeZone: user.display_time_zone } satisfies Teacher };
}

export async function loadTeacherAvailability(db: Database, teacher: Teacher) {
  const [setting, ranges, exceptions] = await Promise.all([
    db.selectFrom("teacher_availability_settings").select("time_zone").where("teacher_user_id", "=", teacher.id).executeTakeFirst(),
    db.selectFrom("teacher_availability_ranges").selectAll().where("teacher_user_id", "=", teacher.id).orderBy("effective_from").orderBy("weekday").orderBy("start_local_time").execute(),
    db.selectFrom("availability_exceptions").selectAll().where("teacher_user_id", "=", teacher.id).where("removed_at", "is", null).orderBy("starts_at").execute(),
  ]);
  const timeZone = setting?.time_zone ?? teacher.displayTimeZone ?? "America/Denver";
  return {
    timeZone,
    weeklyRanges: ranges.map((range) => ({
      id: range.id,
      weekday: WEEKDAYS[range.weekday - 1],
      startLocalTime: shortTime(range.start_local_time),
      endLocalTime: shortTime(range.end_local_time),
      effectiveFrom: dateString(range.effective_from),
      effectiveUntil: range.effective_until ? dateString(range.effective_until) : null,
      timeZone: range.time_zone,
    })),
    exceptions: exceptions.map(exceptionResult),
  };
}

export async function previewTeacherAvailability(db: Database, teacher: Teacher, localDates: string[]) {
  const dates = localDates.map((value) => Temporal.PlainDate.from(value));
  const ranges = await db.selectFrom("teacher_availability_ranges").selectAll().where("teacher_user_id", "=", teacher.id).execute();
  return dates.flatMap((date) => ranges
    .filter((range) => range.weekday === date.dayOfWeek
      && Temporal.PlainDate.compare(date, Temporal.PlainDate.from(dateString(range.effective_from))) >= 0
      && (range.effective_until === null || Temporal.PlainDate.compare(date, Temporal.PlainDate.from(dateString(range.effective_until))) <= 0))
    .map((range) => {
      const startLocalTime = shortTime(range.start_local_time);
      const endLocalTime = shortTime(range.end_local_time);
      const occurrence = resolveWeeklyRangeOccurrence(date.toString(), startLocalTime, endLocalTime, range.time_zone);
      return { rangeId: range.id, localDate: date.toString(), startLocalTime, endLocalTime, startsAt: occurrence.startsAt.toString(), endsAt: occurrence.endsAt.toString() };
    }));
}

export async function saveTeacherAvailabilityRange(
  db: Database,
  teacher: Teacher,
  input: {
    idempotencyKey: string;
    weekday: Weekday;
    startLocalTime: string;
    endLocalTime: string;
    effectiveFrom: string;
    timeZone: string;
  },
  correlationId: string,
) {
  const validation = validateRange(input);
  if (validation) {
    await recordAudit(db, teacher.id, correlationId, "teacher-availability.changed", "TeacherAvailability", teacher.id, "DENIED", validation.code);
    return validation;
  }

  return db.transaction().execute(async (transaction) => {
    await sql`select pg_advisory_xact_lock(hashtextextended(${teacher.id}, 27))`.execute(transaction);
    const replay = await replayedOutcome(transaction as Database, teacher.id, "teacher-availability.changed", input, correlationId);
    if (replay) return replay;

    await transaction.insertInto("teacher_availability_settings")
      .values({ teacher_user_id: teacher.id, time_zone: input.timeZone })
      .onConflict((conflict) => conflict.column("teacher_user_id").doUpdateSet({ time_zone: input.timeZone, updated_at: new Date() }))
      .execute();
    const weekday = WEEKDAYS.indexOf(input.weekday) + 1;
    const nextRange = await transaction.selectFrom("teacher_availability_ranges")
      .select("effective_from")
      .where("teacher_user_id", "=", teacher.id)
      .where("weekday", "=", weekday)
      .where("effective_from", ">", input.effectiveFrom)
      .orderBy("effective_from")
      .executeTakeFirst();
    const effectiveUntil = nextRange
      ? Temporal.PlainDate.from(dateString(nextRange.effective_from)).subtract({ days: 1 }).toString()
      : null;
    await transaction.updateTable("teacher_availability_ranges")
      .set({ effective_until: sql<string>`${input.effectiveFrom}::date - 1` })
      .where("teacher_user_id", "=", teacher.id)
      .where("weekday", "=", weekday)
      .where("effective_from", "<", input.effectiveFrom)
      .where((expressions) => expressions.or([
        expressions("effective_until", "is", null),
        expressions("effective_until", ">=", input.effectiveFrom),
      ]))
      .execute();
    const range = await transaction.insertInto("teacher_availability_ranges").values({
      teacher_user_id: teacher.id,
      weekday,
      start_local_time: input.startLocalTime,
      end_local_time: input.endLocalTime,
      effective_from: input.effectiveFrom,
      effective_until: effectiveUntil,
      time_zone: input.timeZone,
    }).returningAll().executeTakeFirstOrThrow();
    const outcome = {
      __typename: "SaveTeacherAvailabilityRangeSuccess" as const,
      range: {
        id: range.id,
        weekday: input.weekday,
        startLocalTime: shortTime(range.start_local_time),
        endLocalTime: shortTime(range.end_local_time),
        effectiveFrom: dateString(range.effective_from),
        effectiveUntil,
        timeZone: range.time_zone,
      },
    };
    await recordAudit(transaction as Database, teacher.id, correlationId, "teacher-availability.changed", "TeacherAvailabilityRange", range.id, "SUCCEEDED", "TEACHER_AVAILABILITY_SAVED");
    await rememberOutcome(transaction as Database, teacher.id, "teacher-availability.changed", input, outcome);
    return outcome;
  });
}

export async function addAvailabilityException(
  db: Database,
  teacher: Teacher,
  input: {
    idempotencyKey: string;
    startsAtLocal: string;
    endsAtLocal: string;
    startDisambiguation: LocalTimeDisambiguation;
    endDisambiguation: LocalTimeDisambiguation;
  },
  correlationId: string,
) {
  const setting = await db.selectFrom("teacher_availability_settings").select("time_zone").where("teacher_user_id", "=", teacher.id).executeTakeFirst();
  const timeZone = setting?.time_zone ?? teacher.displayTimeZone;
  if (!timeZone || !namedRegionalTimeZones().includes(timeZone)) {
    return deniedValidation(db, teacher.id, correlationId, "INVALID_TIME_ZONE", "Choose a named regional time zone.");
  }

  let startsAt: Temporal.Instant;
  let endsAt: Temporal.Instant;
  try {
    startsAt = resolveLocalDateTime(input.startsAtLocal, timeZone, input.startDisambiguation);
    endsAt = resolveLocalDateTime(input.endsAtLocal, timeZone, input.endDisambiguation);
  } catch (error) {
    const code = error instanceof Error && error.message === "LOCAL_TIME_FOLD" ? "LOCAL_TIME_FOLD" : error instanceof Error && error.message === "LOCAL_TIME_GAP" ? "LOCAL_TIME_GAP" : "INVALID_LOCAL_DATE_TIME";
    const message = code === "LOCAL_TIME_FOLD" ? "Choose the earlier or later occurrence of the repeated local time." : code === "LOCAL_TIME_GAP" ? "The local time does not exist because of a daylight-saving transition." : "Enter valid local start and end date-times.";
    return deniedValidation(db, teacher.id, correlationId, code, message);
  }
  if (Temporal.Instant.compare(startsAt, endsAt) >= 0) {
    return deniedValidation(db, teacher.id, correlationId, "INVALID_TIME_RANGE", "The end must be after the start.");
  }

  return db.transaction().execute(async (transaction) => {
    await sql`select pg_advisory_xact_lock(hashtextextended(${teacher.id}, 28))`.execute(transaction);
    const replay = await replayedOutcome(transaction as Database, teacher.id, "availability-exception.changed", input, correlationId);
    if (replay) return replay;
    const startDate = new Date(Number(startsAt.epochMilliseconds));
    const endDate = new Date(Number(endsAt.epochMilliseconds));
    const conflicts = await transaction.selectFrom("class_sessions").select("id")
      .where("teacher_user_id", "=", teacher.id).where("state", "=", "PUBLISHED")
      .where("starts_at", "<", endDate)
      .where(sql<boolean>`starts_at + interval '60 minutes' > ${startDate}`)
      .orderBy("starts_at").execute();
    if (conflicts.length > 0) {
      const outcome = {
        __typename: "AvailabilityExceptionSessionConflict" as const,
        code: "PUBLISHED_CLASS_SESSION_OVERLAP",
        message: "A published Class Session occupies this time. Create an Absence Request instead.",
        classSessionIds: conflicts.map(({ id }) => id),
        absenceRequestPath: "/teacher/schedule",
      };
      await recordAudit(transaction as Database, teacher.id, correlationId, "availability-exception.changed", "AvailabilityException", teacher.id, "DENIED", outcome.code);
      await rememberOutcome(transaction as Database, teacher.id, "availability-exception.changed", input, outcome);
      return outcome;
    }
    const exception = await transaction.insertInto("availability_exceptions").values({
      teacher_user_id: teacher.id,
      starts_at_local: input.startsAtLocal,
      ends_at_local: input.endsAtLocal,
      starts_at: startDate,
      ends_at: endDate,
      time_zone: timeZone,
      removed_at: null,
    }).returningAll().executeTakeFirstOrThrow();
    const outcome = { __typename: "AddAvailabilityExceptionSuccess" as const, exception: exceptionResult(exception) };
    await recordAudit(transaction as Database, teacher.id, correlationId, "availability-exception.changed", "AvailabilityException", exception.id, "SUCCEEDED", "AVAILABILITY_EXCEPTION_ADDED");
    await rememberOutcome(transaction as Database, teacher.id, "availability-exception.changed", input, outcome);
    return outcome;
  });
}

export async function endTeacherAvailabilityRange(
  db: Database,
  teacher: Teacher,
  input: { idempotencyKey: string; rangeId: string; effectiveUntil: string },
  correlationId: string,
) {
  let effectiveUntil: Temporal.PlainDate;
  try { effectiveUntil = Temporal.PlainDate.from(input.effectiveUntil); } catch {
    return deniedRangeValidation(db, teacher.id, correlationId, "INVALID_EFFECTIVE_DATE", "Enter a valid effective-until date.");
  }
  return db.transaction().execute(async (transaction) => {
    await sql`select pg_advisory_xact_lock(hashtextextended(${teacher.id}, 27))`.execute(transaction);
    const replay = await replayedOutcome(transaction as Database, teacher.id, "teacher-availability.ended", input, correlationId);
    if (replay) return replay;
    const range = await transaction.selectFrom("teacher_availability_ranges").selectAll().where("id", "=", input.rangeId).where("teacher_user_id", "=", teacher.id).executeTakeFirst();
    const startsOn = range ? Temporal.PlainDate.from(dateString(range.effective_from)) : null;
    const nextRange = range ? await transaction.selectFrom("teacher_availability_ranges")
      .select("effective_from")
      .where("teacher_user_id", "=", teacher.id)
      .where("weekday", "=", range.weekday)
      .where("effective_from", ">", dateString(range.effective_from))
      .orderBy("effective_from")
      .executeTakeFirst() : null;
    const overlapsNextRange = nextRange
      ? Temporal.PlainDate.compare(effectiveUntil, Temporal.PlainDate.from(dateString(nextRange.effective_from))) >= 0
      : false;
    if (!range || !startsOn || Temporal.PlainDate.compare(effectiveUntil, startsOn) < 0 || overlapsNextRange) {
      const outcome = validation("INVALID_EFFECTIVE_DATE", "The range was not found or the end precedes its effective date.");
      await recordAudit(transaction as Database, teacher.id, correlationId, "teacher-availability.ended", "TeacherAvailabilityRange", input.rangeId, "DENIED", outcome.code);
      await rememberOutcome(transaction as Database, teacher.id, "teacher-availability.ended", input, outcome);
      return outcome;
    }
    const updated = await transaction.updateTable("teacher_availability_ranges").set({ effective_until: input.effectiveUntil }).where("id", "=", range.id).returningAll().executeTakeFirstOrThrow();
    const outcome = { __typename: "EndTeacherAvailabilityRangeSuccess" as const, range: {
      id: updated.id, weekday: WEEKDAYS[updated.weekday - 1], startLocalTime: shortTime(updated.start_local_time), endLocalTime: shortTime(updated.end_local_time), effectiveFrom: dateString(updated.effective_from), effectiveUntil: dateString(updated.effective_until!), timeZone: updated.time_zone,
    } };
    await recordAudit(transaction as Database, teacher.id, correlationId, "teacher-availability.ended", "TeacherAvailabilityRange", range.id, "SUCCEEDED", "TEACHER_AVAILABILITY_ENDED");
    await rememberOutcome(transaction as Database, teacher.id, "teacher-availability.ended", input, outcome);
    return outcome;
  });
}

export async function removeAvailabilityException(
  db: Database,
  teacher: Teacher,
  input: { idempotencyKey: string; exceptionId: string },
  correlationId: string,
) {
  return db.transaction().execute(async (transaction) => {
    await sql`select pg_advisory_xact_lock(hashtextextended(${teacher.id}, 28))`.execute(transaction);
    const replay = await replayedOutcome(transaction as Database, teacher.id, "availability-exception.removed", input, correlationId);
    if (replay) return replay;
    const removed = await transaction.updateTable("availability_exceptions").set({ removed_at: new Date() }).where("id", "=", input.exceptionId).where("teacher_user_id", "=", teacher.id).where("removed_at", "is", null).returning("id").executeTakeFirst();
    if (!removed) {
      const outcome = validation("AVAILABILITY_EXCEPTION_NOT_FOUND", "The Availability Exception was not found.");
      await recordAudit(transaction as Database, teacher.id, correlationId, "availability-exception.removed", "AvailabilityException", input.exceptionId, "DENIED", outcome.code);
      await rememberOutcome(transaction as Database, teacher.id, "availability-exception.removed", input, outcome);
      return outcome;
    }
    const outcome = { __typename: "RemoveAvailabilityExceptionSuccess" as const, exceptionId: removed.id };
    await recordAudit(transaction as Database, teacher.id, correlationId, "availability-exception.removed", "AvailabilityException", removed.id, "SUCCEEDED", "AVAILABILITY_EXCEPTION_REMOVED");
    await rememberOutcome(transaction as Database, teacher.id, "availability-exception.removed", input, outcome);
    return outcome;
  });
}

function validateRange(input: { startLocalTime: string; endLocalTime: string; effectiveFrom: string; timeZone: string }): ValidationError | null {
  try {
    Temporal.PlainTime.from(input.startLocalTime);
    Temporal.PlainTime.from(input.endLocalTime);
    Temporal.PlainDate.from(input.effectiveFrom);
  } catch {
    return validation("INVALID_AVAILABILITY_RANGE", "Enter valid local times and an effective date.");
  }
  if (Temporal.PlainTime.compare(input.startLocalTime, input.endLocalTime) >= 0) return validation("INVALID_AVAILABILITY_RANGE", "The end time must be after the start time.");
  if (!namedRegionalTimeZones().includes(input.timeZone)) return validation("INVALID_TIME_ZONE", "Choose a named regional time zone.");
  return null;
}

async function deniedValidation(db: Database, teacherId: string, correlationId: string, code: string, message: string) {
  await recordAudit(db, teacherId, correlationId, "availability-exception.changed", "AvailabilityException", teacherId, "DENIED", code);
  return validation(code, message);
}

async function deniedRangeValidation(db: Database, teacherId: string, correlationId: string, code: string, message: string) {
  await recordAudit(db, teacherId, correlationId, "teacher-availability.ended", "TeacherAvailabilityRange", teacherId, "DENIED", code);
  return validation(code, message);
}

function validation(code: string, message: string): ValidationError {
  return { __typename: "TeacherAvailabilityValidationError", code, message };
}

function shortTime(value: string) { return value.slice(0, 5); }
function dateString(value: string | Date) { return value instanceof Date ? value.toISOString().slice(0, 10) : value; }
function localDateTimeString(value: string | Date) { return value instanceof Date ? value.toISOString().slice(0, 16) : value.replace(" ", "T").slice(0, 16); }
function exceptionResult(exception: { id: string; starts_at_local: string | Date; ends_at_local: string | Date; starts_at: Date; ends_at: Date; time_zone: string }) {
  return { id: exception.id, startsAtLocal: localDateTimeString(exception.starts_at_local), endsAtLocal: localDateTimeString(exception.ends_at_local), startsAt: exception.starts_at.toISOString(), endsAt: exception.ends_at.toISOString(), timeZone: exception.time_zone };
}

async function recordAudit(db: Database, teacherId: string, correlationId: string, operation: string, targetType: string, targetId: string, outcome: "SUCCEEDED" | "DENIED" | "FAILED", reasonCode: string) {
  await db.insertInto("audit_entries").values({ actor_user_id: teacherId, acting_role: "TEACHER", operation, target_type: targetType, target_id: targetId, outcome, reason_code: reasonCode, correlation_id: correlationId }).execute();
}

function fingerprint(input: object) { return createHash("sha256").update(JSON.stringify(input)).digest("hex"); }
async function replayedOutcome(db: Database, teacherId: string, operation: string, input: { idempotencyKey: string }, correlationId: string) {
  await db.deleteFrom("mutation_idempotency_records").where("actor_user_id", "=", teacherId).where("operation", "=", operation).where("idempotency_key", "=", input.idempotencyKey).where("created_at", "<=", sql<Date>`now() - interval '7 days'`).execute();
  const existing = await db.selectFrom("mutation_idempotency_records").select(["input_fingerprint", "outcome"]).where("actor_user_id", "=", teacherId).where("operation", "=", operation).where("idempotency_key", "=", input.idempotencyKey).executeTakeFirst();
  if (!existing) return null;
  if (existing.input_fingerprint !== fingerprint(input)) {
    await recordAudit(db, teacherId, correlationId, operation, "IdempotencyKey", teacherId, "DENIED", "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT");
    return validation("IDEMPOTENCY_KEY_REUSED", "The Idempotency Key was already used with different input.");
  }
  const outcome = existing.outcome as { __typename?: string };
  const succeeded = outcome.__typename?.endsWith("Success") ?? false;
  await recordAudit(db, teacherId, correlationId, operation, "IdempotencyKey", teacherId, succeeded ? "SUCCEEDED" : "DENIED", succeeded ? "IDEMPOTENT_REPLAY_SUCCEEDED" : "IDEMPOTENT_REPLAY_DENIED");
  return existing.outcome;
}
async function rememberOutcome(db: Database, teacherId: string, operation: string, input: { idempotencyKey: string }, outcome: Record<string, unknown>) {
  await db.insertInto("mutation_idempotency_records").values({ actor_user_id: teacherId, operation, idempotency_key: input.idempotencyKey, input_fingerprint: fingerprint(input), outcome: JSON.stringify(outcome) }).execute();
}
