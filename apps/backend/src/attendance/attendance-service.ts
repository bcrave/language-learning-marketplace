import { classSessionEndsAt, type UserIdentity, type UserRole } from "@marketplace/core";

import type { Database } from "../database/database.js";
import { classSessionProjection } from "../class-session/class-session-service.js";

import { attendanceCorrectionSummaries, lockLessonUnitCompletion, reconcileLessonUnitCompletion } from "./attendance-reconciliation.js";
import { notifyAttendanceCorrected, notifyAttendancePublished, notifyTeacherAttendanceCorrected } from "./attendance-notifications.js";

export type RosterAccessResult =
  | { status: "OK"; roster: Awaited<ReturnType<typeof loadClassRoster>> }
  | { status: "UNKNOWN_USER" }
  | { status: "NOT_FOUND" };

export async function classRosterForViewer(
  db: Database,
  identity: UserIdentity,
  actingRole: UserRole,
  classSessionId: string,
  correlationId: string,
  now: Date,
): Promise<RosterAccessResult> {
  const user = await db.selectFrom("users")
    .select("id")
    .where("identity_issuer", "=", identity.issuer)
    .where("identity_subject", "=", identity.subject)
    .executeTakeFirst();
  if (!user) return { status: "UNKNOWN_USER" };

  const role = await db.selectFrom("role_assignments")
    .select("role")
    .where("user_id", "=", user.id)
    .where("role", "=", actingRole)
    .executeTakeFirst();
  const session = await db.selectFrom("class_sessions")
    .select(["id", "teacher_user_id", "starts_at"])
    .where("id", "=", classSessionId)
    .executeTakeFirst();
  const teacherRelationshipEndsAt = session
    ? new Date(session.starts_at.getTime() + 49 * 60 * 60_000)
    : null;
  const authorized = Boolean(role && session && (
    actingRole === "PLATFORM_ADMINISTRATOR"
    || (actingRole === "TEACHER"
      && session.teacher_user_id === user.id
      && now <= teacherRelationshipEndsAt!)
  ));

  if (!authorized) {
    await db.insertInto("audit_entries").values({
      actor_user_id: user.id,
      acting_role: actingRole,
      operation: "class-roster.read",
      target_type: "ClassRoster",
      target_id: session?.id ?? user.id,
      outcome: "DENIED",
      reason_code: "CLASS_ROSTER_NOT_FOUND",
      correlation_id: correlationId,
    }).execute();
    return { status: "NOT_FOUND" };
  }

  return { status: "OK", roster: await loadClassRoster(db, classSessionId) };
}

export async function loadClassRoster(db: Database, classSessionId: string) {
  const session = await db.selectFrom("class_sessions")
    .innerJoin("lesson_units", "lesson_units.id", "class_sessions.lesson_unit_id")
    .innerJoin("courses", "courses.id", "lesson_units.course_id")
    .selectAll("class_sessions")
    .select("courses.target_language")
    .where("class_sessions.id", "=", classSessionId)
    .executeTakeFirstOrThrow();
  const students = await db.selectFrom("bookings")
    .innerJoin("users", "users.id", "bookings.student_user_id")
    .leftJoin("student_placements", (join) => join
      .onRef("student_placements.student_user_id", "=", "bookings.student_user_id")
      .on("student_placements.target_language", "=", session.target_language))
    .leftJoin("attendance_records", "attendance_records.booking_id", "bookings.id")
    .select([
      "bookings.id as booking_id",
      "bookings.student_user_id",
      "users.display_name",
      "student_placements.target_language",
      "student_placements.curriculum_level",
      "attendance_records.outcome",
      "attendance_records.submitted_at",
    ])
    .where("bookings.class_session_id", "=", classSessionId)
    .where("bookings.state", "=", "ACTIVE")
    .orderBy("users.display_name")
    .orderBy("bookings.id")
    .execute();
  const corrections = await attendanceCorrectionSummaries(db, students.map(({ booking_id: bookingId }) => bookingId));
  return {
    classSession: classSessionProjection(session),
    students: students.map((student) => {
      const correction = corrections.get(student.booking_id);
      return {
        bookingId: student.booking_id,
        studentUserId: student.student_user_id,
        displayName: student.display_name,
        placement: student.target_language && student.curriculum_level
          ? { targetLanguage: student.target_language, curriculumLevel: student.curriculum_level }
          : null,
        attendance: student.outcome
          ? {
            outcome: student.outcome,
            submittedAt: student.submitted_at!.toISOString(),
            correctedAt: correction?.correctedAt?.toISOString() ?? null,
            correctionCount: correction?.correctionCount ?? 0,
          }
          : null,
      };
    }),
  };
}


type AttendanceInput = {
  classSessionId: string;
  records: Array<{ bookingId: string; outcome: "ATTENDED" | "NO_SHOW"; correctionReason?: string | null }>;
};

type AttendanceActor = { id: string; actingRole: "TEACHER" | "PLATFORM_ADMINISTRATOR" };

const attendanceError = (code: string, message: string) => ({
  __typename: "AttendanceError" as const,
  code,
  message,
});

export async function recordAttendance(
  transaction: Database,
  teacher: { id: string },
  input: AttendanceInput,
  correlationId: string,
  now: Date,
) {
  return recordAttendanceAs(transaction, { id: teacher.id, actingRole: "TEACHER" }, input, correlationId, now);
}

export async function administerAttendance(
  transaction: Database,
  administrator: { id: string },
  input: AttendanceInput,
  correlationId: string,
  now: Date,
) {
  return recordAttendanceAs(transaction, { id: administrator.id, actingRole: "PLATFORM_ADMINISTRATOR" }, input, correlationId, now);
}

async function recordAttendanceAs(
  transaction: Database,
  actor: AttendanceActor,
  input: AttendanceInput,
  correlationId: string,
  now: Date,
) {
  const session = await transaction.selectFrom("class_sessions")
    .select(["id", "lesson_unit_id", "teacher_user_id", "starts_at", "state"])
    .where("id", "=", input.classSessionId)
    .forUpdate()
    .executeTakeFirst();
  const endsAt = session ? classSessionEndsAt(session.starts_at) : null;
  const recordAudit = async (outcome: "SUCCEEDED" | "DENIED", reasonCode: string) => {
    await transaction.insertInto("audit_entries").values({ actor_user_id: actor.id, acting_role: actor.actingRole, operation: actor.actingRole === "TEACHER" ? "attendance.recorded" : "attendance.administered", target_type: "ClassSession", target_id: session?.id ?? actor.id, outcome, reason_code: reasonCode, correlation_id: correlationId }).execute();
  };
  if (!session || session.state !== "PUBLISHED" || (actor.actingRole === "TEACHER" && session.teacher_user_id !== actor.id)) {
    await recordAudit("DENIED", "CLASS_SESSION_NOT_FOUND");
    return attendanceError("CLASS_SESSION_NOT_FOUND", "Choose an assigned published Class Session.");
  }
  if (now < endsAt!) {
    await recordAudit("DENIED", "ATTENDANCE_RECORDING_NOT_OPEN");
    return attendanceError("ATTENDANCE_RECORDING_NOT_OPEN", "Attendance remains Unrecorded until the Class Session ends.");
  }
  if (actor.actingRole === "TEACHER" && now > new Date(endsAt!.getTime() + 24 * 60 * 60_000)) {
    await recordAudit("DENIED", "ATTENDANCE_RECORDING_WINDOW_CLOSED");
    return attendanceError("ATTENDANCE_RECORDING_WINDOW_CLOSED", "The Teacher Attendance recording window has closed.");
  }
  const preliminaryBookings = await transaction.selectFrom("bookings")
    .select(["id", "student_user_id"])
    .where("class_session_id", "=", input.classSessionId)
    .where("state", "=", "ACTIVE")
    .orderBy("id")
    .execute();
  for (const studentUserId of [...new Set(preliminaryBookings.map(({ student_user_id: studentUserId }) => studentUserId))].sort()) {
    await lockLessonUnitCompletion(transaction, studentUserId, session.lesson_unit_id);
  }
  const bookings = await transaction.selectFrom("bookings")
    .select(["id", "student_user_id"])
    .where("class_session_id", "=", input.classSessionId)
    .where("state", "=", "ACTIVE")
    .orderBy("id")
    .forUpdate()
    .execute();
  const submittedIds = [...new Set(input.records.map(({ bookingId }) => bookingId))].sort();
  if (submittedIds.length !== input.records.length || submittedIds.length !== bookings.length || submittedIds.some((id, index) => id !== bookings[index]?.id)) {
    await recordAudit("DENIED", "ATTENDANCE_ROSTER_MISMATCH");
    return attendanceError("ATTENDANCE_ROSTER_MISMATCH", "Submit exactly one Attendance outcome for every active Booking in the Class Roster.");
  }
  const existing = await transaction.selectFrom("attendance_records")
    .select(["booking_id", "outcome"])
    .where("booking_id", "in", submittedIds)
    .execute();
  if (existing.length > 0 && existing.length !== bookings.length) {
    await recordAudit("DENIED", "ATTENDANCE_ROSTER_MISMATCH");
    return attendanceError("ATTENDANCE_ROSTER_MISMATCH", "The published Class Roster is incomplete and requires administrator review.");
  }
  const invalidCorrection = input.records.find((record) => {
    const current = existing.find(({ booking_id: bookingId }) => bookingId === record.bookingId);
    if (!current || current.outcome === record.outcome) return false;
    const reason = record.correctionReason?.trim() ?? "";
    return reason.length < 10 || reason.length > 500;
  });
  if (invalidCorrection) {
    await recordAudit("DENIED", "ATTENDANCE_CORRECTION_REASON_REQUIRED");
    return attendanceError("ATTENDANCE_CORRECTION_REASON_REQUIRED", "Give a correction reason from 10 through 500 characters.");
  }

  let correctionCount = 0;
  for (const record of input.records) {
    const booking = bookings.find(({ id }) => id === record.bookingId)!;
    const current = existing.find(({ booking_id: bookingId }) => bookingId === record.bookingId);
    if (current && current.outcome !== record.outcome) {
      const reason = record.correctionReason!.trim();
      const correction = await transaction.insertInto("attendance_record_corrections").values({ booking_id: record.bookingId, prior_outcome: current.outcome, corrected_outcome: record.outcome, corrected_by_user_id: actor.id, reason, corrected_at: now }).returning("id").executeTakeFirstOrThrow();
      await transaction.updateTable("attendance_records").set({ outcome: record.outcome, updated_at: now }).where("booking_id", "=", record.bookingId).execute();
      correctionCount += 1;
      await notifyAttendanceCorrected(transaction, booking.student_user_id, input.classSessionId, record.outcome, correction.id);
      if (actor.actingRole === "PLATFORM_ADMINISTRATOR") {
        await notifyTeacherAttendanceCorrected(transaction, session.teacher_user_id, input.classSessionId, record.outcome, correction.id);
      }
    } else if (!current) {
      await transaction.insertInto("attendance_records").values({ booking_id: record.bookingId, outcome: record.outcome, submitted_by_user_id: actor.id, submitted_at: now, updated_at: now }).execute();
      await notifyAttendancePublished(transaction, booking.student_user_id, input.classSessionId, record.bookingId, record.outcome, now);
    }
    await reconcileLessonUnitCompletion(transaction, {
      studentUserId: booking.student_user_id,
      lessonUnitId: session.lesson_unit_id,
      bookingId: booking.id,
      priorOutcome: current?.outcome ?? null,
      outcome: record.outcome,
      earnedAt: endsAt!,
      now,
    });
  }
  await recordAudit("SUCCEEDED", existing.length === 0 ? "ATTENDANCE_PUBLISHED" : correctionCount > 0 ? "ATTENDANCE_CORRECTED" : "ATTENDANCE_UNCHANGED");
  return { __typename: "RecordAttendanceSuccess" as const, classRoster: await loadClassRoster(transaction, input.classSessionId) };
}
