import { interfaceMessages, namedRegionalTimeZones } from "@marketplace/core";
import { Temporal } from "@js-temporal/polyfill";
import IntlMessageFormat from "intl-messageformat";
import { sql } from "kysely";

import type { Administrator } from "../curriculum/curriculum-service.js";
import { recordCurriculumAudit } from "../curriculum/curriculum-service.js";
import type { Database } from "../database/database.js";
import { resolveFixedDurationLocalInterval, type LocalTimeDisambiguation } from "../teacher-availability/teacher-availability-time.js";

type PublishClassSessionInput = {
  lessonUnitId: string;
  teacherUserId: string;
  startsAtLocal: string;
  schedulingTimeZone: string;
  timeDisambiguation: LocalTimeDisambiguation;
  seatCapacity?: number | null;
};

const publicationError = (code: string, message: string) => ({
  __typename: "ClassSessionPublicationError" as const,
  code,
  message,
});

export async function administrationClassSessions(db: Database) {
  const sessions = await db.selectFrom("class_sessions").selectAll().where("state", "=", "PUBLISHED").orderBy("starts_at").orderBy("id").execute();
  return sessions.map(classSessionProjection);
}

function classSessionProjection(session: {
  id: string;
  lesson_unit_id: string;
  teacher_user_id: string;
  starts_at: Date;
  scheduling_time_zone: string;
  seat_capacity: number;
  occupied_seats: number;
}) {
  const startsAt = Temporal.Instant.fromEpochMilliseconds(session.starts_at.getTime());
  return {
    id: session.id,
    lessonUnitId: session.lesson_unit_id,
    teacherUserId: session.teacher_user_id,
    startsAt: startsAt.toString(),
    endsAt: startsAt.add({ minutes: 60 }).toString(),
    schedulingTimeZone: session.scheduling_time_zone,
    seatCapacity: session.seat_capacity,
    occupiedSeats: session.occupied_seats,
  };
}

async function denyPublication(
  db: Database,
  administrator: Administrator,
  correlationId: string,
  targetId: string,
  code: string,
  message: string,
) {
  await recordCurriculumAudit(db, {
    administratorId: administrator.id,
    correlationId,
    operation: "class-session.published",
    targetType: "ClassSession",
    targetId,
    outcome: "DENIED",
    reasonCode: code,
  });
  return publicationError(code, message);
}

async function notifyAssignedTeacher(transaction: Database, classSessionId: string, teacherUserId: string, startsAt: Date) {
  const teacher = await transaction.selectFrom("users").select(["interface_locale", "display_time_zone"]).where("id", "=", teacherUserId).executeTakeFirstOrThrow();
  const locale = teacher.interface_locale ?? "en";
  const timeZone = teacher.display_time_zone ?? "UTC";
  const messageId = "class-session.teacher-assigned.teacher" as const;
  const variables = { classSessionId, startsAt: startsAt.toISOString(), timeZone, imminent: startsAt.getTime() - Date.now() <= 24 * 60 * 60 * 1_000 };
  const renderedContent = String(new IntlMessageFormat(interfaceMessages[locale][messageId], locale, {
    date: { long: { ...IntlMessageFormat.formats.date.long, timeZone } },
    time: { short: { ...IntlMessageFormat.formats.time.short, timeZone } },
  }).format({ ...variables, startsAt }));
  await transaction.insertInto("in_app_notifications").values({ recipient_user_id: teacherUserId, message_id: messageId, variables: JSON.stringify(variables) }).execute();
  await transaction.insertInto("email_notification_intents").values({ recipient_user_id: teacherUserId, message_id: messageId, locale, variables: JSON.stringify(variables), rendered_content: renderedContent }).execute();
}

export async function publishClassSession(
  db: Database,
  administrator: Administrator,
  input: PublishClassSessionInput,
  correlationId: string,
) {
  const seatCapacity = input.seatCapacity ?? 5;
  if (!Number.isInteger(seatCapacity) || seatCapacity < 2 || seatCapacity > 8) {
    return denyPublication(db, administrator, correlationId, input.lessonUnitId, "INVALID_SEAT_CAPACITY", "Seat Capacity must be from 2 through 8.");
  }
  if (!namedRegionalTimeZones().includes(input.schedulingTimeZone)) {
    return denyPublication(db, administrator, correlationId, input.lessonUnitId, "INVALID_SCHEDULING_TIME_ZONE", "Choose a named regional scheduling time zone.");
  }

  let localStart: Temporal.PlainDateTime;
  let interval: ReturnType<typeof resolveFixedDurationLocalInterval>;
  try {
    localStart = Temporal.PlainDateTime.from(input.startsAtLocal);
    interval = resolveFixedDurationLocalInterval(input.startsAtLocal, input.schedulingTimeZone, input.timeDisambiguation, 60);
  } catch (error) {
    const code = error instanceof Error && error.message === "LOCAL_TIME_FOLD"
      ? "LOCAL_TIME_FOLD"
      : error instanceof Error && error.message === "LOCAL_TIME_GAP"
        ? "LOCAL_TIME_GAP"
        : "INVALID_LOCAL_DATE_TIME";
    const message = code === "LOCAL_TIME_FOLD"
      ? "Choose the earlier or later occurrence of the repeated local time."
      : code === "LOCAL_TIME_GAP"
        ? "The local time does not exist because of a daylight-saving transition."
        : "Enter a valid local Class Session start time.";
    return denyPublication(db, administrator, correlationId, input.lessonUnitId, code, message);
  }

  const perform = async (transaction: Database) => {
    await sql`select pg_advisory_xact_lock(hashtextextended(${input.teacherUserId}, 28))`.execute(transaction);
    const lessonUnit = await transaction.selectFrom("lesson_units")
      .innerJoin("courses", "courses.id", "lesson_units.course_id")
      .select(["lesson_units.id", "lesson_units.state", "courses.target_language", "courses.curriculum_level"])
      .where("lesson_units.id", "=", input.lessonUnitId)
      .forUpdate()
      .executeTakeFirst();
    if (!lessonUnit || lessonUnit.state !== "ACTIVE") {
      return denyPublication(transaction, administrator, correlationId, input.lessonUnitId, "INVALID_LESSON_UNIT", "Choose an active Lesson Unit.");
    }

    await sql`select pg_advisory_xact_lock(hashtextextended(${`qualification:${input.teacherUserId}:${lessonUnit.target_language}:${lessonUnit.curriculum_level}`}, 0))`.execute(transaction);
    const qualification = await transaction.selectFrom("teacher_qualifications").select("id")
      .where("teacher_user_id", "=", input.teacherUserId)
      .where("target_language", "=", lessonUnit.target_language)
      .where("curriculum_level", "=", lessonUnit.curriculum_level)
      .executeTakeFirst();
    if (!qualification) {
      return denyPublication(transaction, administrator, correlationId, input.teacherUserId, "TEACHER_QUALIFICATION_REQUIRED", "The Teacher needs a matching Teacher Qualification.");
    }

    const localEnd = interval.endsAtLocal;
    const localDate = localStart.toPlainDate().toString();
    const availability = await transaction.selectFrom("teacher_availability_ranges").select("id")
      .where("teacher_user_id", "=", input.teacherUserId)
      .where("weekday", "=", localStart.dayOfWeek)
      .where("effective_from", "<=", localDate)
      .where((expression) => expression.or([expression("effective_until", "is", null), expression("effective_until", ">=", localDate)]))
      .where("time_zone", "=", input.schedulingTimeZone)
      .where("start_local_time", "<=", localStart.toPlainTime().toString())
      .where("end_local_time", ">=", localEnd.toPlainTime().toString())
      .executeTakeFirst();
    if (!availability || !localStart.toPlainDate().equals(localEnd.toPlainDate())) {
      return denyPublication(transaction, administrator, correlationId, input.teacherUserId, "TEACHER_AVAILABILITY_REQUIRED", "The full Class Session must fit within compatible Teacher Availability.");
    }

    const startsAt = new Date(Number(interval.startsAt.epochMilliseconds));
    const endsAt = new Date(Number(interval.endsAt.epochMilliseconds));
    const exception = await transaction.selectFrom("availability_exceptions").select("id")
      .where("teacher_user_id", "=", input.teacherUserId).where("removed_at", "is", null)
      .where("starts_at", "<", endsAt).where("ends_at", ">", startsAt).executeTakeFirst();
    if (exception) {
      return denyPublication(transaction, administrator, correlationId, input.teacherUserId, "AVAILABILITY_EXCEPTION_CONFLICT", "An Availability Exception overlaps this Class Session.");
    }
    const scheduleConflict = await transaction.selectFrom("schedule_commitments").select("id")
      .where("user_id", "=", input.teacherUserId).where("active", "=", true)
      .where("starts_at", "<", endsAt).where("ends_at", ">", startsAt).executeTakeFirst();
    if (scheduleConflict) {
      return denyPublication(transaction, administrator, correlationId, input.teacherUserId, "TEACHER_SCHEDULE_CONFLICT", "The Teacher already has an overlapping Class Session.");
    }

    const session = await transaction.insertInto("class_sessions").values({
      lesson_unit_id: input.lessonUnitId,
      teacher_user_id: input.teacherUserId,
      starts_at: startsAt,
      scheduling_time_zone: input.schedulingTimeZone,
      seat_capacity: seatCapacity,
      occupied_seats: 0,
      state: "PUBLISHED",
    }).returningAll().executeTakeFirstOrThrow();
    await recordCurriculumAudit(transaction, { administratorId: administrator.id, correlationId, operation: "class-session.published", targetType: "ClassSession", targetId: session.id, reasonCode: "CLASS_SESSION_PUBLISHED" });
    await notifyAssignedTeacher(transaction, session.id, input.teacherUserId, startsAt);
    return { __typename: "PublishClassSessionSuccess" as const, classSession: classSessionProjection(session) };
  };
  if (db.isTransaction) return perform(db);
  return db.transaction().execute((transaction) => perform(transaction as Database));
}

export async function changeClassSessionSeatCapacity(
  db: Database,
  administrator: Administrator,
  input: { classSessionId: string; seatCapacity: number },
  correlationId: string,
) {
  const deny = async (transaction: Database, code: string, message: string) => {
    await recordCurriculumAudit(transaction, { administratorId: administrator.id, correlationId, operation: "class-session.seat-capacity-changed", targetType: "ClassSession", targetId: input.classSessionId, outcome: "DENIED", reasonCode: code });
    return { __typename: "ClassSessionSeatCapacityError" as const, code, message };
  };
  if (!Number.isInteger(input.seatCapacity) || input.seatCapacity < 2 || input.seatCapacity > 8) {
    return deny(db, "INVALID_SEAT_CAPACITY", "Seat Capacity must be from 2 through 8.");
  }
  const perform = async (transaction: Database) => {
    const session = await transaction.selectFrom("class_sessions").selectAll().where("id", "=", input.classSessionId).forUpdate().executeTakeFirst();
    if (!session || session.state !== "PUBLISHED") return deny(transaction, "CLASS_SESSION_NOT_FOUND", "Choose a published Class Session.");
    if (input.seatCapacity < session.occupied_seats) return deny(transaction, "SEAT_CAPACITY_BELOW_OCCUPIED_SEATS", "Seat Capacity cannot be lower than the occupied seats.");
    const updated = await transaction.updateTable("class_sessions").set({ seat_capacity: input.seatCapacity }).where("id", "=", input.classSessionId).returningAll().executeTakeFirstOrThrow();
    await recordCurriculumAudit(transaction, { administratorId: administrator.id, correlationId, operation: "class-session.seat-capacity-changed", targetType: "ClassSession", targetId: input.classSessionId, reasonCode: "CLASS_SESSION_SEAT_CAPACITY_CHANGED" });
    return { __typename: "ChangeClassSessionSeatCapacitySuccess" as const, classSession: classSessionProjection(updated) };
  };
  if (db.isTransaction) return perform(db);
  return db.transaction().execute((transaction) => perform(transaction as Database));
}
