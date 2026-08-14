import { classSessionEndsAt, establishesLessonUnitCompletion, type AttendanceOutcome } from "@marketplace/core";
import { sql } from "kysely";

import type { Database } from "../database/database.js";
import { reviseCourseProgressSnapshots } from "../sponsorship/course-progress-snapshot.js";

/**
 * The correction facts every authorized Attendance view shows beside the effective
 * outcome. It deliberately carries no Attendance Review Request state: an authorized
 * viewer sees that an outcome was corrected, never that a Student contested one.
 */
export async function attendanceCorrectionSummaries(db: Database, bookingIds: string[]) {
  const summaries = new Map<string, { correctedAt: Date | null; correctionCount: number }>();
  if (bookingIds.length === 0) return summaries;
  const corrections = await db.selectFrom("attendance_record_corrections")
    .select(["booking_id", "corrected_at"])
    .where("booking_id", "in", bookingIds)
    .orderBy("corrected_at")
    .orderBy("id")
    .execute();
  for (const bookingId of bookingIds) {
    const bookingCorrections = corrections.filter((correction) => correction.booking_id === bookingId);
    summaries.set(bookingId, {
      correctedAt: bookingCorrections.at(-1)?.corrected_at ?? null,
      correctionCount: bookingCorrections.length,
    });
  }
  return summaries;
}

/**
 * Serializes every reconciliation touching one Student's Lesson Unit Completion so
 * concurrent Attendance corrections cannot interleave their completion decisions.
 */
export async function lockLessonUnitCompletion(transaction: Database, studentUserId: string, lessonUnitId: string) {
  await sql`select pg_advisory_xact_lock(hashtextextended(${`${studentUserId}:${lessonUnitId}`}, 37))`.execute(transaction);
}

/**
 * Brings Lesson Unit Completion — and with it Course Progress, the frozen Course
 * Progress Snapshots of any Sponsorship covering the period, and Lesson Material
 * access — back in step with one Booking's effective Attendance outcome. Completion
 * survives while any other Attended Booking still supports it.
 */
export async function reconcileLessonUnitCompletion(transaction: Database, input: {
  studentUserId: string;
  lessonUnitId: string;
  bookingId: string;
  priorOutcome: AttendanceOutcome | null;
  outcome: AttendanceOutcome;
  earnedAt: Date;
  now: Date;
}): Promise<"EARNED" | "REMOVED" | "UNCHANGED"> {
  const change = await applyLessonUnitCompletion(transaction, input);
  await reviseCourseProgressSnapshots(transaction, input.studentUserId, input.lessonUnitId, input.now);
  return change;
}

async function applyLessonUnitCompletion(transaction: Database, input: {
  studentUserId: string;
  lessonUnitId: string;
  bookingId: string;
  priorOutcome: AttendanceOutcome | null;
  outcome: AttendanceOutcome;
  earnedAt: Date;
}): Promise<"EARNED" | "REMOVED" | "UNCHANGED"> {
  if (establishesLessonUnitCompletion([input.outcome])) {
    const earned = await transaction.insertInto("lesson_unit_completions").values({
      student_user_id: input.studentUserId,
      lesson_unit_id: input.lessonUnitId,
      established_by_booking_id: input.bookingId,
      earned_at: input.earnedAt,
    }).onConflict((conflict) => conflict.columns(["student_user_id", "lesson_unit_id"]).doNothing()).returning("id").executeTakeFirst();
    return earned ? "EARNED" : "UNCHANGED";
  }
  if (input.priorOutcome !== "ATTENDED") return "UNCHANGED";

  const otherAttended = await transaction.selectFrom("attendance_records")
    .innerJoin("bookings", "bookings.id", "attendance_records.booking_id")
    .innerJoin("class_sessions", "class_sessions.id", "bookings.class_session_id")
    .select(["bookings.id as booking_id", "class_sessions.starts_at"])
    .where("bookings.student_user_id", "=", input.studentUserId)
    .where("class_sessions.lesson_unit_id", "=", input.lessonUnitId)
    .where("attendance_records.outcome", "=", "ATTENDED")
    .where("bookings.id", "!=", input.bookingId)
    .orderBy("class_sessions.starts_at")
    .orderBy("bookings.id")
    .executeTakeFirst();
  if (!otherAttended) {
    const removed = await transaction.deleteFrom("lesson_unit_completions")
      .where("student_user_id", "=", input.studentUserId)
      .where("lesson_unit_id", "=", input.lessonUnitId)
      .returning("id")
      .executeTakeFirst();
    return removed ? "REMOVED" : "UNCHANGED";
  }
  await transaction.updateTable("lesson_unit_completions").set({
    established_by_booking_id: otherAttended.booking_id,
    earned_at: classSessionEndsAt(otherAttended.starts_at),
  })
    .where("student_user_id", "=", input.studentUserId)
    .where("lesson_unit_id", "=", input.lessonUnitId)
    .execute();
  return "UNCHANGED";
}
