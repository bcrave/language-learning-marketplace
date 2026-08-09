import { namedRegionalTimeZones } from "@marketplace/core";
import { Temporal } from "@js-temporal/polyfill";
import { sql } from "kysely";

import type { Administrator } from "../curriculum/curriculum-service.js";
import { recordCurriculumAudit } from "../curriculum/curriculum-service.js";
import type { Database } from "../database/database.js";
import { resolveFixedDurationLocalInterval, type LocalTimeDisambiguation } from "../teacher-availability/teacher-availability-time.js";
import {
  ClassSessionPublicationErrorCode,
  ClassSessionSeatCapacityErrorCode,
} from "../api/generated/resolvers.js";
import { notifyClassSessionTeacher } from "./class-session-notifications.js";

type PublishClassSessionInput = {
  lessonUnitId: string;
  teacherUserId: string;
  startsAtLocal: string;
  schedulingTimeZone: string;
  timeDisambiguation: LocalTimeDisambiguation;
  seatCapacity?: number | null;
};

const publicationError = (code: ClassSessionPublicationErrorCode, message: string) => ({
  __typename: "ClassSessionPublicationError" as const,
  code,
  message,
});

export async function administrationClassSessions(db: Database) {
  const sessions = await db.selectFrom("class_sessions").selectAll().where("state", "=", "PUBLISHED").orderBy("starts_at").orderBy("id").execute();
  return sessions.map(classSessionProjection);
}

export function classSessionProjection(session: {
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
  code: ClassSessionPublicationErrorCode,
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
  const startsAtInstant = Temporal.Instant.fromEpochMilliseconds(startsAt.getTime());
  const now = Temporal.Now.instant();
  const imminent = Temporal.Instant.compare(startsAtInstant, now) >= 0
    && startsAtInstant.since(now).total({ unit: "hours" }) <= 24;
  await notifyClassSessionTeacher(transaction, { teacherUserId, messageId: "class-session.teacher-assigned.teacher", classSessionId, startsAt, imminent });
}

export async function publishClassSession(
  db: Database,
  administrator: Administrator,
  input: PublishClassSessionInput,
  correlationId: string,
) {
  const seatCapacity = input.seatCapacity ?? 5;
  if (!Number.isInteger(seatCapacity) || seatCapacity < 2 || seatCapacity > 8) {
    return denyPublication(db, administrator, correlationId, input.lessonUnitId, ClassSessionPublicationErrorCode.InvalidSeatCapacity, "Seat Capacity must be from 2 through 8.");
  }
  if (!namedRegionalTimeZones().includes(input.schedulingTimeZone)) {
    return denyPublication(db, administrator, correlationId, input.lessonUnitId, ClassSessionPublicationErrorCode.InvalidSchedulingTimeZone, "Choose a named regional scheduling time zone.");
  }

  let localStart: Temporal.PlainDateTime;
  let interval: ReturnType<typeof resolveFixedDurationLocalInterval>;
  try {
    localStart = Temporal.PlainDateTime.from(input.startsAtLocal);
    interval = resolveFixedDurationLocalInterval(input.startsAtLocal, input.schedulingTimeZone, input.timeDisambiguation, 60);
  } catch (error) {
    const code = error instanceof Error && error.message === "LOCAL_TIME_FOLD"
      ? ClassSessionPublicationErrorCode.LocalTimeFold
      : error instanceof Error && error.message === "LOCAL_TIME_GAP"
        ? ClassSessionPublicationErrorCode.LocalTimeGap
        : ClassSessionPublicationErrorCode.InvalidLocalDateTime;
    const message = code === ClassSessionPublicationErrorCode.LocalTimeFold
      ? "Choose the earlier or later occurrence of the repeated local time."
      : code === ClassSessionPublicationErrorCode.LocalTimeGap
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
      return denyPublication(transaction, administrator, correlationId, input.lessonUnitId, ClassSessionPublicationErrorCode.InvalidLessonUnit, "Choose an active Lesson Unit.");
    }

    await sql`select pg_advisory_xact_lock(hashtextextended(${`qualification:${input.teacherUserId}:${lessonUnit.target_language}:${lessonUnit.curriculum_level}`}, 0))`.execute(transaction);
    const qualification = await transaction.selectFrom("teacher_qualifications").select("id")
      .where("teacher_user_id", "=", input.teacherUserId)
      .where("target_language", "=", lessonUnit.target_language)
      .where("curriculum_level", "=", lessonUnit.curriculum_level)
      .executeTakeFirst();
    if (!qualification) {
      return denyPublication(transaction, administrator, correlationId, input.teacherUserId, ClassSessionPublicationErrorCode.TeacherQualificationRequired, "The Teacher needs a matching Teacher Qualification.");
    }

    const localEnd = interval.endsAtLocal;
    const localDate = localStart.toPlainDate().toString();
    const availabilityRanges = await transaction.selectFrom("teacher_availability_ranges").select(["id", "start_local_time", "end_local_time"])
      .where("teacher_user_id", "=", input.teacherUserId)
      .where("weekday", "=", localStart.dayOfWeek)
      .where("effective_from", "<=", localDate)
      .where((expression) => expression.or([expression("effective_until", "is", null), expression("effective_until", ">=", localDate)]))
      .where("time_zone", "=", input.schedulingTimeZone)
      .where("start_local_time", "<=", localStart.toPlainTime().toString())
      .where("end_local_time", ">=", localEnd.toPlainTime().toString())
      .execute();
    const hasSufficientAvailability = availabilityRanges.some((range) =>
      Temporal.PlainTime.from(range.end_local_time)
        .since(Temporal.PlainTime.from(range.start_local_time))
        .total({ unit: "minutes" }) >= 60,
    );
    if (!hasSufficientAvailability || !localStart.toPlainDate().equals(localEnd.toPlainDate())) {
      return denyPublication(transaction, administrator, correlationId, input.teacherUserId, ClassSessionPublicationErrorCode.TeacherAvailabilityRequired, "The full Class Session must fit within compatible Teacher Availability.");
    }

    const startsAt = new Date(Number(interval.startsAt.epochMilliseconds));
    const endsAt = new Date(Number(interval.endsAt.epochMilliseconds));
    const exception = await transaction.selectFrom("availability_exceptions").select("id")
      .where("teacher_user_id", "=", input.teacherUserId).where("removed_at", "is", null)
      .where("starts_at", "<", endsAt).where("ends_at", ">", startsAt).executeTakeFirst();
    if (exception) {
      return denyPublication(transaction, administrator, correlationId, input.teacherUserId, ClassSessionPublicationErrorCode.AvailabilityExceptionConflict, "An Availability Exception overlaps this Class Session.");
    }
    const scheduleConflict = await transaction.selectFrom("schedule_commitments").select("id")
      .where("user_id", "=", input.teacherUserId).where("active", "=", true)
      .where("starts_at", "<", endsAt).where("ends_at", ">", startsAt).executeTakeFirst();
    if (scheduleConflict) {
      return denyPublication(transaction, administrator, correlationId, input.teacherUserId, ClassSessionPublicationErrorCode.TeacherScheduleConflict, "The Teacher already has an overlapping Class Session.");
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
    const reminderDueAt = interval.startsAt.subtract({ hours: 24 });
    if (Temporal.Instant.compare(reminderDueAt, Temporal.Now.instant()) > 0) {
      await transaction.insertInto("class_session_reminders").values({
        class_session_id: session.id,
        recipient_user_id: input.teacherUserId,
        commitment_role: "TEACHER",
        due_at: new Date(Number(reminderDueAt.epochMilliseconds)),
        terminal_outcome: null,
        completed_at: null,
      }).execute();
    }
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
  const deny = async (transaction: Database, code: ClassSessionSeatCapacityErrorCode, message: string) => {
    await recordCurriculumAudit(transaction, { administratorId: administrator.id, correlationId, operation: "class-session.seat-capacity-changed", targetType: "ClassSession", targetId: input.classSessionId, outcome: "DENIED", reasonCode: code });
    return { __typename: "ClassSessionSeatCapacityError" as const, code, message };
  };
  if (!Number.isInteger(input.seatCapacity) || input.seatCapacity < 2 || input.seatCapacity > 8) {
    return deny(db, ClassSessionSeatCapacityErrorCode.InvalidSeatCapacity, "Seat Capacity must be from 2 through 8.");
  }
  const perform = async (transaction: Database) => {
    const session = await transaction.selectFrom("class_sessions").selectAll().where("id", "=", input.classSessionId).forUpdate().executeTakeFirst();
    if (!session || session.state !== "PUBLISHED") return deny(transaction, ClassSessionSeatCapacityErrorCode.ClassSessionNotFound, "Choose a published Class Session.");
    if (input.seatCapacity < session.occupied_seats) return deny(transaction, ClassSessionSeatCapacityErrorCode.SeatCapacityBelowOccupiedSeats, "Seat Capacity cannot be lower than the occupied seats.");
    const updated = await transaction.updateTable("class_sessions").set({ seat_capacity: input.seatCapacity }).where("id", "=", input.classSessionId).returningAll().executeTakeFirstOrThrow();
    await recordCurriculumAudit(transaction, { administratorId: administrator.id, correlationId, operation: "class-session.seat-capacity-changed", targetType: "ClassSession", targetId: input.classSessionId, reasonCode: "CLASS_SESSION_SEAT_CAPACITY_CHANGED" });
    return { __typename: "ChangeClassSessionSeatCapacitySuccess" as const, classSession: classSessionProjection(updated) };
  };
  if (db.isTransaction) return perform(db);
  return db.transaction().execute((transaction) => perform(transaction as Database));
}
