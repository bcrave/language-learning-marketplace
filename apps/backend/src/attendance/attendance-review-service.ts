import {
  attendanceReviewDeadline,
  attendanceReviewWindowIsOpen,
  decidedAttendanceOutcome,
  type AttendanceOutcome,
  type AttendanceReviewDecision,
} from "@marketplace/core";
import { sql } from "kysely";

import type { Database } from "../database/database.js";
import { attendanceCorrectionSummaries, classSessionEndsAt, lockLessonUnitCompletion, reconcileLessonUnitCompletion } from "./attendance-reconciliation.js";
import {
  notifyAttendanceReviewCreatedAdministrators,
  notifyAttendanceReviewCreatedStudent,
  notifyAttendanceReviewDecidedTeacher,
  notifyAttendanceReviewResolvedStudent,
  type CompletionChange,
  type FeedbackWindowChange,
} from "./attendance-review-notifications.js";

type RequestAttendanceReviewInput = { bookingId: string; explanation?: string | null };
type DecideAttendanceReviewInput = {
  attendanceReviewRequestId: string;
  decision: AttendanceReviewDecision;
  studentVisibleRationale: string;
  privateAdministratorNote?: string | null;
};

type ReviewErrorCode =
  | "BOOKING_NOT_FOUND"
  | "ATTENDANCE_NOT_PUBLISHED"
  | "REVIEW_WINDOW_CLOSED"
  | "REVIEW_ALREADY_REQUESTED"
  | "INVALID_EXPLANATION"
  | "REVIEW_REQUEST_NOT_FOUND"
  | "REVIEW_ALREADY_DECIDED"
  | "INVALID_REASON";

const reviewError = (code: ReviewErrorCode, message: string) => ({
  __typename: "AttendanceReviewError" as const,
  code,
  message,
});

type ReviewRequestRow = {
  id: string;
  booking_id: string;
  student_user_id: string;
  outcome_at_request: AttendanceOutcome;
  explanation: string;
  state: "PENDING" | "UPHELD" | "CORRECTED";
  requested_at: Date;
  decided_at: Date | null;
  decision_outcome: AttendanceOutcome | null;
  student_visible_rationale: string | null;
  private_administrator_note: string | null;
};

function attendanceReviewRequestProjection(
  request: ReviewRequestRow,
  context: { classSessionId: string; studentDisplayName: string; effectiveOutcome: AttendanceOutcome },
  viewer: "STUDENT" | "PLATFORM_ADMINISTRATOR",
) {
  return {
    id: request.id,
    bookingId: request.booking_id,
    classSessionId: context.classSessionId,
    studentDisplayName: context.studentDisplayName,
    outcomeAtRequest: request.outcome_at_request,
    effectiveOutcome: context.effectiveOutcome,
    explanation: request.explanation,
    state: request.state,
    requestedAt: request.requested_at.toISOString(),
    decidedAt: request.decided_at?.toISOString() ?? null,
    studentVisibleRationale: request.student_visible_rationale,
    privateAdministratorNote: viewer === "PLATFORM_ADMINISTRATOR" ? request.private_administrator_note : null,
  };
}

async function recordReviewAudit(db: Database, actor: { id: string; role: "STUDENT" | "PLATFORM_ADMINISTRATOR" }, input: {
  operation: string;
  targetId: string;
  correlationId: string;
  outcome: "SUCCEEDED" | "DENIED";
  reasonCode: string;
}) {
  await db.insertInto("audit_entries").values({
    actor_user_id: actor.id,
    acting_role: actor.role,
    operation: input.operation,
    target_type: "AttendanceReviewRequest",
    target_id: input.targetId,
    outcome: input.outcome,
    reason_code: input.reasonCode,
    correlation_id: input.correlationId,
  }).execute();
}

async function bookingAttendanceContext(db: Database, bookingId: string) {
  return db.selectFrom("bookings")
    .innerJoin("class_sessions", "class_sessions.id", "bookings.class_session_id")
    .innerJoin("users as student", "student.id", "bookings.student_user_id")
    .innerJoin("attendance_records", "attendance_records.booking_id", "bookings.id")
    .select([
      "bookings.id as booking_id",
      "bookings.student_user_id",
      "bookings.class_session_id",
      "class_sessions.lesson_unit_id",
      "class_sessions.teacher_user_id",
      "class_sessions.starts_at",
      "student.display_name as student_display_name",
      "attendance_records.outcome",
      "attendance_records.submitted_at",
    ])
    .where("bookings.id", "=", bookingId)
    .executeTakeFirst();
}

export async function requestAttendanceReview(
  transaction: Database,
  student: { id: string },
  input: RequestAttendanceReviewInput,
  correlationId: string,
  now: Date,
) {
  const actor = { id: student.id, role: "STUDENT" as const };
  const operation = "attendance-review.created";
  const deny = async (targetId: string, code: ReviewErrorCode, message: string) => {
    await recordReviewAudit(transaction, actor, { operation, targetId, correlationId, outcome: "DENIED", reasonCode: code });
    return reviewError(code, message);
  };

  await sql`select pg_advisory_xact_lock(hashtextextended(${`attendance-review:${input.bookingId}`}, 41))`.execute(transaction);
  const explanation = input.explanation?.trim() ?? "";
  if (explanation.length > 500) {
    return deny(student.id, "INVALID_EXPLANATION", "Keep the optional explanation to at most 500 characters.");
  }

  const context = await bookingAttendanceContext(transaction, input.bookingId);
  if (!context || context.student_user_id !== student.id) {
    const booking = await transaction.selectFrom("bookings").select(["id", "student_user_id"]).where("id", "=", input.bookingId).executeTakeFirst();
    if (booking && booking.student_user_id === student.id) {
      return deny(booking.id, "ATTENDANCE_NOT_PUBLISHED", "Attendance remains Unrecorded for this Booking.");
    }
    return deny(student.id, "BOOKING_NOT_FOUND", "Choose one of your own Bookings with published Attendance.");
  }
  if (!attendanceReviewWindowIsOpen(now, context.submitted_at)) {
    return deny(context.booking_id, "REVIEW_WINDOW_CLOSED", "The seven-day Attendance Review Request window has closed.");
  }
  const existing = await transaction.selectFrom("attendance_review_requests").select("id").where("booking_id", "=", input.bookingId).executeTakeFirst();
  if (existing) {
    return deny(existing.id, "REVIEW_ALREADY_REQUESTED", "One Attendance Review Request may be created for each Booking.");
  }

  const request = await transaction.insertInto("attendance_review_requests").values({
    booking_id: context.booking_id,
    student_user_id: student.id,
    outcome_at_request: context.outcome,
    explanation,
    state: "PENDING",
    requested_at: now,
  }).returningAll().executeTakeFirstOrThrow();

  await notifyAttendanceReviewCreatedStudent(transaction, student.id, context.class_session_id, request.id);
  await notifyAttendanceReviewCreatedAdministrators(transaction, context.class_session_id, request.id);
  await recordReviewAudit(transaction, actor, { operation, targetId: request.id, correlationId, outcome: "SUCCEEDED", reasonCode: "ATTENDANCE_REVIEW_REQUESTED" });
  return {
    __typename: "RequestAttendanceReviewSuccess" as const,
    attendanceReviewRequest: attendanceReviewRequestProjection(request, {
      classSessionId: context.class_session_id,
      studentDisplayName: context.student_display_name,
      effectiveOutcome: context.outcome,
    }, "STUDENT"),
  };
}

export async function decideAttendanceReview(
  transaction: Database,
  administrator: { id: string },
  input: DecideAttendanceReviewInput,
  correlationId: string,
  now: Date,
) {
  const actor = { id: administrator.id, role: "PLATFORM_ADMINISTRATOR" as const };
  const operation = "attendance-review.resolved";
  const deny = async (targetId: string, code: ReviewErrorCode, message: string) => {
    await recordReviewAudit(transaction, actor, { operation, targetId, correlationId, outcome: "DENIED", reasonCode: code });
    return reviewError(code, message);
  };

  await sql`select pg_advisory_xact_lock(hashtextextended(${`attendance-review-decision:${input.attendanceReviewRequestId}`}, 41))`.execute(transaction);
  const request = await transaction.selectFrom("attendance_review_requests")
    .selectAll()
    .where("id", "=", input.attendanceReviewRequestId)
    .forUpdate()
    .executeTakeFirst();
  if (!request) {
    return deny(administrator.id, "REVIEW_REQUEST_NOT_FOUND", "Choose an Attendance Review Request awaiting a decision.");
  }
  if (request.state !== "PENDING") {
    return deny(request.id, "REVIEW_ALREADY_DECIDED", "This Attendance Review Request was already decided.");
  }
  const studentVisibleRationale = input.studentVisibleRationale.trim();
  const privateAdministratorNote = input.privateAdministratorNote?.trim() ?? "";
  if (studentVisibleRationale.length < 10 || studentVisibleRationale.length > 500 || privateAdministratorNote.length > 500) {
    return deny(request.id, "INVALID_REASON", "Give a Student-visible rationale from 10 through 500 characters and keep any private note to 500 characters.");
  }

  const context = await bookingAttendanceContext(transaction, request.booking_id);
  if (!context) {
    return deny(request.id, "REVIEW_REQUEST_NOT_FOUND", "The reviewed Attendance Record is no longer available.");
  }
  await lockLessonUnitCompletion(transaction, context.student_user_id, context.lesson_unit_id);

  const effectiveOutcome = context.outcome;
  const decidedOutcome = decidedAttendanceOutcome(input.decision, effectiveOutcome);
  const corrected = input.decision === "CORRECT";

  let correctionId: string | null = null;
  let completionChange: CompletionChange = "UNCHANGED";
  // A correction always moves the authoring windows, even when another Attended
  // Booking leaves Lesson Unit Completion itself untouched.
  const windowChange: FeedbackWindowChange = !corrected ? "UNCHANGED" : decidedOutcome === "ATTENDED" ? "OPENED" : "HIDDEN";
  if (corrected) {
    correctionId = (await transaction.insertInto("attendance_record_corrections").values({
      booking_id: context.booking_id,
      prior_outcome: effectiveOutcome,
      corrected_outcome: decidedOutcome,
      corrected_by_user_id: administrator.id,
      reason: studentVisibleRationale,
      corrected_at: now,
    }).returning("id").executeTakeFirstOrThrow()).id;
    await transaction.updateTable("attendance_records").set({ outcome: decidedOutcome, updated_at: now }).where("booking_id", "=", context.booking_id).execute();
    completionChange = await reconcileLessonUnitCompletion(transaction, {
      studentUserId: context.student_user_id,
      lessonUnitId: context.lesson_unit_id,
      bookingId: context.booking_id,
      priorOutcome: effectiveOutcome,
      outcome: decidedOutcome,
      earnedAt: classSessionEndsAt(context.starts_at),
      now,
    });
  }

  const decided = await transaction.updateTable("attendance_review_requests").set({
    state: corrected ? "CORRECTED" : "UPHELD",
    decided_by_user_id: administrator.id,
    decided_at: now,
    decision_outcome: decidedOutcome,
    student_visible_rationale: studentVisibleRationale,
    private_administrator_note: privateAdministratorNote === "" ? null : privateAdministratorNote,
    attendance_record_correction_id: correctionId,
  }).where("id", "=", request.id).returningAll().executeTakeFirstOrThrow();

  await notifyAttendanceReviewResolvedStudent(transaction, context.student_user_id, {
    classSessionId: context.class_session_id,
    reviewRequestId: decided.id,
    state: decided.state === "CORRECTED" ? "CORRECTED" : "UPHELD",
    outcome: decidedOutcome,
    studentVisibleRationale,
    completionChange,
    windowChange,
  });
  await notifyAttendanceReviewDecidedTeacher(transaction, context.teacher_user_id, {
    classSessionId: context.class_session_id,
    reviewRequestId: decided.id,
    state: decided.state === "CORRECTED" ? "CORRECTED" : "UPHELD",
    outcome: decidedOutcome,
  });
  await recordReviewAudit(transaction, actor, {
    operation,
    targetId: decided.id,
    correlationId,
    outcome: "SUCCEEDED",
    reasonCode: corrected ? "ATTENDANCE_REVIEW_CORRECTED" : "ATTENDANCE_REVIEW_UPHELD",
  });
  return {
    __typename: "DecideAttendanceReviewSuccess" as const,
    attendanceReviewRequest: attendanceReviewRequestProjection(decided, {
      classSessionId: context.class_session_id,
      studentDisplayName: context.student_display_name,
      effectiveOutcome: decidedOutcome,
    }, "PLATFORM_ADMINISTRATOR"),
  };
}

export async function studentAttendanceRecords(db: Database, student: { id: string }, now: Date) {
  const rows = await db.selectFrom("bookings")
    .innerJoin("class_sessions", "class_sessions.id", "bookings.class_session_id")
    .innerJoin("users as teacher", "teacher.id", "class_sessions.teacher_user_id")
    .innerJoin("users as studentUser", "studentUser.id", "bookings.student_user_id")
    .innerJoin("attendance_records", "attendance_records.booking_id", "bookings.id")
    .select([
      "bookings.id as booking_id",
      "bookings.class_session_id",
      "class_sessions.starts_at",
      "teacher.display_name as teacher_display_name",
      "studentUser.display_name as student_display_name",
      "attendance_records.outcome",
      "attendance_records.submitted_at",
    ])
    .where("bookings.student_user_id", "=", student.id)
    .orderBy("class_sessions.starts_at", "desc")
    .orderBy("bookings.id")
    .execute();
  const bookingIds = rows.map(({ booking_id: bookingId }) => bookingId);
  const summaries = await attendanceCorrectionSummaries(db, bookingIds);
  const requests = bookingIds.length === 0 ? [] : await db.selectFrom("attendance_review_requests").selectAll().where("booking_id", "in", bookingIds).execute();

  return rows.map((row) => {
    const summary = summaries.get(row.booking_id);
    const request = requests.find(({ booking_id: bookingId }) => bookingId === row.booking_id);
    return {
      bookingId: row.booking_id,
      classSessionId: row.class_session_id,
      classSessionStartsAt: row.starts_at.toISOString(),
      teacherDisplayName: row.teacher_display_name,
      outcome: row.outcome,
      publishedAt: row.submitted_at.toISOString(),
      correctedAt: summary?.correctedAt?.toISOString() ?? null,
      correctionCount: summary?.correctionCount ?? 0,
      reviewDeadline: attendanceReviewDeadline(row.submitted_at).toISOString(),
      reviewRequestOpen: !request && attendanceReviewWindowIsOpen(now, row.submitted_at),
      reviewRequest: request
        ? attendanceReviewRequestProjection(request, {
          classSessionId: row.class_session_id,
          studentDisplayName: row.student_display_name,
          effectiveOutcome: row.outcome,
        }, "STUDENT")
        : null,
    };
  });
}

export async function administrationAttendanceReviewRequests(db: Database) {
  const requests = await db.selectFrom("attendance_review_requests")
    .innerJoin("bookings", "bookings.id", "attendance_review_requests.booking_id")
    .innerJoin("users as student", "student.id", "attendance_review_requests.student_user_id")
    .innerJoin("attendance_records", "attendance_records.booking_id", "bookings.id")
    .selectAll("attendance_review_requests")
    .select([
      "bookings.class_session_id",
      "student.display_name as student_display_name",
      "attendance_records.outcome as effective_outcome",
    ])
    .orderBy(sql`case when attendance_review_requests.state = 'PENDING' then 0 else 1 end`)
    .orderBy("attendance_review_requests.requested_at")
    .orderBy("attendance_review_requests.id")
    .execute();
  return requests.map((request) => attendanceReviewRequestProjection(request, {
    classSessionId: request.class_session_id,
    studentDisplayName: request.student_display_name,
    effectiveOutcome: request.effective_outcome,
  }, "PLATFORM_ADMINISTRATOR"));
}
