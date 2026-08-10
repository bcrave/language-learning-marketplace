import { interfaceMessages } from "@marketplace/core";
import IntlMessageFormat from "intl-messageformat";
import { sql } from "kysely";

import type { Database } from "../database/database.js";
import { classSessionProjection } from "./class-session-service.js";
import { notifyClassSessionTeacher, notifyClassSessionUser } from "./class-session-notifications.js";

type Teacher = { id: string };

type DisruptionErrorCode =
  | "INVALID_CLASS_SESSIONS"
  | "CLASS_SESSION_NOT_FOUND"
  | "CLASS_SESSION_NOT_ASSIGNED"
  | "ABSENCE_ALREADY_REPORTED"
  | "ABSENCE_REQUEST_NOT_FOUND"
  | "DISRUPTION_ALREADY_RESOLVED"
  | "TEACHER_QUALIFICATION_REQUIRED"
  | "TEACHER_SCHEDULE_CONFLICT"
  | "REPLACEMENT_TEACHER_REQUIRED"
  | "CLASS_SESSION_ALREADY_STARTED"
  | "INVALID_REASON"
  | "ATTENDANCE_ALREADY_SUBMITTED"
  | "IDEMPOTENCY_KEY_REUSED";

const disruptionError = (code: DisruptionErrorCode, message: string) => ({
  __typename: "ClassSessionDisruptionError" as const,
  code,
  message,
});

async function recordAbsenceAudit(
  db: Database,
  teacherId: string,
  targetId: string,
  correlationId: string,
  outcome: "SUCCEEDED" | "DENIED",
  reasonCode: string,
) {
  await db.insertInto("audit_entries").values({
    actor_user_id: teacherId,
    acting_role: "TEACHER",
    operation: "absence-request.created",
    target_type: "AbsenceRequest",
    target_id: targetId,
    outcome,
    reason_code: reasonCode,
    correlation_id: correlationId,
  }).execute();
}

export async function teacherClassSessions(db: Database, teacher: Teacher, now: Date) {
  const sessions = await db.selectFrom("class_sessions").selectAll()
    .where("teacher_user_id", "=", teacher.id)
    .where("state", "=", "PUBLISHED")
    .where("starts_at", ">", now)
    .orderBy("starts_at").orderBy("id").execute();
  return sessions.map(classSessionProjection);
}

async function projectAbsenceRequest(db: Database, absenceRequestId: string) {
  const request = await db.selectFrom("absence_requests").selectAll().where("id", "=", absenceRequestId).executeTakeFirstOrThrow();
  const sessions = await db.selectFrom("absence_request_sessions")
    .innerJoin("class_sessions", "class_sessions.id", "absence_request_sessions.class_session_id")
    .selectAll("class_sessions")
    .where("absence_request_sessions.absence_request_id", "=", absenceRequestId)
    .orderBy("class_sessions.starts_at").orderBy("class_sessions.id").execute();
  return {
    id: request.id,
    state: request.state,
    requestedAt: request.requested_at.toISOString(),
    classSessions: sessions.map(classSessionProjection),
  };
}

export async function teacherAbsenceRequests(db: Database, teacher: Teacher) {
  const requests = await db.selectFrom("absence_requests").select("id").where("teacher_user_id", "=", teacher.id).orderBy("requested_at", "desc").orderBy("id", "desc").execute();
  return Promise.all(requests.map(({ id }) => projectAbsenceRequest(db, id)));
}

export async function administrationAbsenceRequests(db: Database) {
  const requests = await db.selectFrom("absence_requests").select("id").where("state", "=", "OPEN").orderBy("requested_at").orderBy("id").execute();
  return Promise.all(requests.map(({ id }) => projectAbsenceRequest(db, id)));
}

async function notifyAdministrators(db: Database, absenceRequestId: string, teacherId: string, classSessionIds: string[]) {
  const administrators = await db.selectFrom("role_assignments")
    .innerJoin("users", "users.id", "role_assignments.user_id")
    .select(["users.id", "users.interface_locale"])
    .where("role_assignments.role", "=", "PLATFORM_ADMINISTRATOR")
    .execute();
  for (const administrator of administrators) {
    const locale = administrator.interface_locale ?? "en";
    const variables = { absenceRequestId, teacherUserId: teacherId, classSessionIds: classSessionIds.join(", "), resolutionLink: `/administration/operations?absenceRequestId=${absenceRequestId}` };
    const renderedContent = String(new IntlMessageFormat(interfaceMessages[locale]["absence-request.created.administrator"], locale).format(variables));
    const sourceReference = `absence-request.created:${absenceRequestId}`;
    await db.insertInto("in_app_notifications").values({ recipient_user_id: administrator.id, message_id: "absence-request.created.administrator", variables: JSON.stringify(variables), source_reference: sourceReference }).execute();
    await db.insertInto("email_notification_intents").values({ recipient_user_id: administrator.id, message_id: "absence-request.created.administrator", locale, variables: JSON.stringify(variables), rendered_content: renderedContent, source_reference: sourceReference }).execute();
  }
}

async function notifyRemovedWaitlistStudent(db: Database, waitlistEntryId: string, studentUserId: string, classSessionId: string) {
  const student = await db.selectFrom("users").select("interface_locale").where("id", "=", studentUserId).executeTakeFirstOrThrow();
  const locale = student.interface_locale ?? "en";
  const variables = { classSessionId, reasonCode: "CLASS_SESSION_UNAVAILABLE" };
  const renderedContent = String(new IntlMessageFormat(interfaceMessages[locale]["waitlist-entry.ineligible.student"], locale).format(variables));
  const sourceReference = `waitlist-entry.ineligible:${waitlistEntryId}`;
  await db.insertInto("in_app_notifications").values({ recipient_user_id: studentUserId, message_id: "waitlist-entry.ineligible.student", variables: JSON.stringify(variables), source_reference: sourceReference }).execute();
  await db.insertInto("email_notification_intents").values({ recipient_user_id: studentUserId, message_id: "waitlist-entry.ineligible.student", locale, variables: JSON.stringify(variables), rendered_content: renderedContent, source_reference: sourceReference }).execute();
}

export async function reportAbsence(
  transaction: Database,
  teacher: Teacher,
  input: { classSessionIds: string[] },
  correlationId: string,
  now: Date,
) {
  const classSessionIds = [...new Set(input.classSessionIds)];
  if (classSessionIds.length === 0 || classSessionIds.length > 20) {
    await recordAbsenceAudit(transaction, teacher.id, teacher.id, correlationId, "DENIED", "INVALID_CLASS_SESSIONS");
    return disruptionError("INVALID_CLASS_SESSIONS", "Choose from one through 20 Class Sessions.");
  }
  const sessions = await transaction.selectFrom("class_sessions").selectAll()
    .where("id", "in", classSessionIds).forUpdate().execute();
  if (sessions.length !== classSessionIds.length || sessions.some((session) => session.state !== "PUBLISHED" || session.starts_at <= now)) {
    await recordAbsenceAudit(transaction, teacher.id, teacher.id, correlationId, "DENIED", "CLASS_SESSION_NOT_FOUND");
    return disruptionError("CLASS_SESSION_NOT_FOUND", "Choose future published Class Sessions.");
  }
  if (sessions.some((session) => session.teacher_user_id !== teacher.id)) {
    await recordAbsenceAudit(transaction, teacher.id, teacher.id, correlationId, "DENIED", "CLASS_SESSION_NOT_ASSIGNED");
    return disruptionError("CLASS_SESSION_NOT_ASSIGNED", "An Absence Request can include only assigned Class Sessions.");
  }
  const existing = await transaction.selectFrom("absence_request_sessions").select("class_session_id")
    .where("class_session_id", "in", classSessionIds).where("resolution", "is", null).executeTakeFirst();
  if (existing) {
    await recordAbsenceAudit(transaction, teacher.id, existing.class_session_id, correlationId, "DENIED", "ABSENCE_ALREADY_REPORTED");
    return disruptionError("ABSENCE_ALREADY_REPORTED", "An Absence Request already includes one of these Class Sessions.");
  }
  const request = await transaction.insertInto("absence_requests").values({ teacher_user_id: teacher.id, state: "OPEN", resolved_at: null }).returning("id").executeTakeFirstOrThrow();
  await transaction.insertInto("absence_request_sessions").values(classSessionIds.map((classSessionId) => ({
    absence_request_id: request.id,
    class_session_id: classSessionId,
    original_teacher_user_id: teacher.id,
    resolution: null,
    replacement_teacher_user_id: null,
    resolution_reason: null,
    resolved_at: null,
  }))).execute();
  await recordAbsenceAudit(transaction, teacher.id, request.id, correlationId, "SUCCEEDED", "ABSENCE_REQUEST_CREATED");
  await notifyAdministrators(transaction, request.id, teacher.id, classSessionIds);
  return { __typename: "ReportAbsenceSuccess" as const, absenceRequest: await projectAbsenceRequest(transaction, request.id) };
}

async function recordResolutionAudit(
  db: Database,
  administratorId: string,
  classSessionId: string,
  correlationId: string,
  outcome: "SUCCEEDED" | "DENIED",
  reasonCode: string,
) {
  await db.insertInto("audit_entries").values({ actor_user_id: administratorId, acting_role: "PLATFORM_ADMINISTRATOR", operation: "class-session.teacher-substituted", target_type: "ClassSession", target_id: classSessionId, outcome, reason_code: reasonCode, correlation_id: correlationId }).execute();
}

async function resolveAbsenceRequestIfComplete(db: Database, absenceRequestId: string, now: Date) {
  const unresolved = await db.selectFrom("absence_request_sessions").select("class_session_id")
    .where("absence_request_id", "=", absenceRequestId).where("resolution", "is", null).executeTakeFirst();
  if (!unresolved) {
    await db.updateTable("absence_requests").set({ state: "RESOLVED", resolved_at: now }).where("id", "=", absenceRequestId).execute();
  }
}

export async function substituteTeacher(
  transaction: Database,
  administrator: { id: string },
  input: { absenceRequestId: string; classSessionId: string; replacementTeacherUserId: string },
  correlationId: string,
  now: Date,
) {
  await sql`select pg_advisory_xact_lock(hashtextextended(${input.replacementTeacherUserId}, 28))`.execute(transaction);
  const disruption = await transaction.selectFrom("absence_request_sessions")
    .innerJoin("absence_requests", "absence_requests.id", "absence_request_sessions.absence_request_id")
    .innerJoin("class_sessions", "class_sessions.id", "absence_request_sessions.class_session_id")
    .innerJoin("lesson_units", "lesson_units.id", "class_sessions.lesson_unit_id")
    .innerJoin("courses", "courses.id", "lesson_units.course_id")
    .select([
      "absence_request_sessions.resolution", "absence_request_sessions.original_teacher_user_id",
      "class_sessions.id", "class_sessions.starts_at", "class_sessions.state", "class_sessions.teacher_user_id",
      "courses.target_language", "courses.curriculum_level",
    ])
    .where("absence_requests.id", "=", input.absenceRequestId)
    .where("class_sessions.id", "=", input.classSessionId)
    .forUpdate().executeTakeFirst();
  if (!disruption || disruption.state !== "PUBLISHED") {
    await recordResolutionAudit(transaction, administrator.id, input.classSessionId, correlationId, "DENIED", "ABSENCE_REQUEST_NOT_FOUND");
    return disruptionError("ABSENCE_REQUEST_NOT_FOUND", "Choose an unresolved Class Session from an Absence Request.");
  }
  if (disruption.resolution !== null) {
    await recordResolutionAudit(transaction, administrator.id, input.classSessionId, correlationId, "DENIED", "DISRUPTION_ALREADY_RESOLVED");
    return disruptionError("DISRUPTION_ALREADY_RESOLVED", "This Class Session disruption is already resolved.");
  }
  if (disruption.starts_at <= now) {
    await recordResolutionAudit(transaction, administrator.id, input.classSessionId, correlationId, "DENIED", "CLASS_SESSION_ALREADY_STARTED");
    return disruptionError("CLASS_SESSION_ALREADY_STARTED", "A Class Session disruption must be resolved before its start instant.");
  }
  if (input.replacementTeacherUserId === disruption.teacher_user_id) {
    await recordResolutionAudit(transaction, administrator.id, input.classSessionId, correlationId, "DENIED", "REPLACEMENT_TEACHER_REQUIRED");
    return disruptionError("REPLACEMENT_TEACHER_REQUIRED", "Choose a different Teacher as the replacement.");
  }
  const qualification = await transaction.selectFrom("teacher_qualifications").select("id")
    .where("teacher_user_id", "=", input.replacementTeacherUserId)
    .where("target_language", "=", disruption.target_language)
    .where("curriculum_level", "=", disruption.curriculum_level)
    .executeTakeFirst();
  if (!qualification) {
    await recordResolutionAudit(transaction, administrator.id, input.classSessionId, correlationId, "DENIED", "TEACHER_QUALIFICATION_REQUIRED");
    return disruptionError("TEACHER_QUALIFICATION_REQUIRED", "The replacement Teacher needs a matching Teacher Qualification.");
  }
  const endsAt = new Date(disruption.starts_at.getTime() + 60 * 60_000);
  const conflict = await transaction.selectFrom("schedule_commitments").select("id")
    .where("user_id", "=", input.replacementTeacherUserId).where("active", "=", true)
    .where("class_session_id", "!=", input.classSessionId)
    .where("starts_at", "<", endsAt).where("ends_at", ">", disruption.starts_at).executeTakeFirst();
  if (conflict) {
    await recordResolutionAudit(transaction, administrator.id, input.classSessionId, correlationId, "DENIED", "TEACHER_SCHEDULE_CONFLICT");
    return disruptionError("TEACHER_SCHEDULE_CONFLICT", "The replacement Teacher has an overlapping commitment.");
  }
  const session = await transaction.updateTable("class_sessions").set({ teacher_user_id: input.replacementTeacherUserId }).where("id", "=", input.classSessionId).returningAll().executeTakeFirstOrThrow();
  await transaction.updateTable("absence_request_sessions").set({ resolution: "TEACHER_SUBSTITUTION", replacement_teacher_user_id: input.replacementTeacherUserId, resolved_at: now }).where("absence_request_id", "=", input.absenceRequestId).where("class_session_id", "=", input.classSessionId).execute();
  await transaction.updateTable("class_session_reminders").set({ terminal_outcome: "SUPPRESSED", completed_at: now }).where("class_session_id", "=", input.classSessionId).where("commitment_role", "=", "TEACHER").where("terminal_outcome", "is", null).execute();
  const reminderDueAt = new Date(disruption.starts_at.getTime() - 24 * 60 * 60_000);
  if (reminderDueAt > now) {
    await transaction.insertInto("class_session_reminders").values({ class_session_id: input.classSessionId, recipient_user_id: input.replacementTeacherUserId, commitment_role: "TEACHER", due_at: reminderDueAt, terminal_outcome: null, completed_at: null }).execute();
  }
  await notifyClassSessionTeacher(transaction, { teacherUserId: disruption.original_teacher_user_id, messageId: "class-session.teacher-removed.teacher", classSessionId: input.classSessionId, startsAt: disruption.starts_at, sourceReference: `class-session.teacher-removed:${input.absenceRequestId}:${input.classSessionId}` });
  const replacementTeacher = await transaction.selectFrom("users").select("display_name").where("id", "=", input.replacementTeacherUserId).executeTakeFirstOrThrow();
  const imminent = disruption.starts_at >= now && disruption.starts_at.getTime() - now.getTime() <= 24 * 60 * 60_000;
  await notifyClassSessionTeacher(transaction, { teacherUserId: input.replacementTeacherUserId, messageId: "class-session.teacher-substituted.teacher", classSessionId: input.classSessionId, startsAt: disruption.starts_at, imminent, sourceReference: `class-session.teacher-substituted.teacher:${input.absenceRequestId}:${input.classSessionId}` });
  const students = await transaction.selectFrom("bookings").select("student_user_id").where("class_session_id", "=", input.classSessionId).where("state", "=", "ACTIVE").execute();
  for (const student of students) {
    await notifyClassSessionUser(transaction, { recipientUserId: student.student_user_id, messageId: "class-session.teacher-substituted.student", classSessionId: input.classSessionId, startsAt: disruption.starts_at, replacementTeacherDisplayName: replacementTeacher.display_name, sourceReference: `class-session.teacher-substituted.student:${input.absenceRequestId}:${input.classSessionId}` });
  }
  await resolveAbsenceRequestIfComplete(transaction, input.absenceRequestId, now);
  await recordResolutionAudit(transaction, administrator.id, input.classSessionId, correlationId, "SUCCEEDED", "TEACHER_SUBSTITUTED");
  return { __typename: "SubstituteTeacherSuccess" as const, classSession: classSessionProjection(session), absenceRequest: await projectAbsenceRequest(transaction, input.absenceRequestId) };
}

export async function cancelClassSession(
  transaction: Database,
  administrator: { id: string },
  input: { absenceRequestId: string; classSessionId: string; reason: string },
  correlationId: string,
  now: Date,
) {
  const reason = input.reason.trim();
  const recordAudit = async (outcome: "SUCCEEDED" | "DENIED", reasonCode: string) => {
    await transaction.insertInto("audit_entries").values({ actor_user_id: administrator.id, acting_role: "PLATFORM_ADMINISTRATOR", operation: "class-session.cancelled", target_type: "ClassSession", target_id: input.classSessionId, outcome, reason_code: reasonCode, correlation_id: correlationId }).execute();
  };
  if (reason.length < 10 || reason.length > 500) {
    await recordAudit("DENIED", "INVALID_REASON");
    return disruptionError("INVALID_REASON", "Provide a cancellation reason from 10 through 500 characters.");
  }
  const disruption = await transaction.selectFrom("absence_request_sessions")
    .innerJoin("class_sessions", "class_sessions.id", "absence_request_sessions.class_session_id")
    .select(["absence_request_sessions.resolution", "class_sessions.id", "class_sessions.state", "class_sessions.teacher_user_id", "class_sessions.starts_at"])
    .where("absence_request_sessions.absence_request_id", "=", input.absenceRequestId)
    .where("absence_request_sessions.class_session_id", "=", input.classSessionId)
    .forUpdate().executeTakeFirst();
  if (!disruption) {
    await recordAudit("DENIED", "ABSENCE_REQUEST_NOT_FOUND");
    return disruptionError("ABSENCE_REQUEST_NOT_FOUND", "Choose an unresolved Class Session from an Absence Request.");
  }
  if (disruption.resolution !== null || disruption.state !== "PUBLISHED") {
    await recordAudit("DENIED", "DISRUPTION_ALREADY_RESOLVED");
    return disruptionError("DISRUPTION_ALREADY_RESOLVED", "This Class Session disruption is already resolved and cannot be changed.");
  }
  if (disruption.starts_at <= now) {
    await recordAudit("DENIED", "CLASS_SESSION_ALREADY_STARTED");
    return disruptionError("CLASS_SESSION_ALREADY_STARTED", "A Class Session disruption must be resolved before its start instant.");
  }
  const attendance = await transaction.selectFrom("attendance_records")
    .innerJoin("bookings", "bookings.id", "attendance_records.booking_id")
    .select("attendance_records.id").where("bookings.class_session_id", "=", input.classSessionId).executeTakeFirst();
  if (attendance) {
    await recordAudit("DENIED", "ATTENDANCE_ALREADY_SUBMITTED");
    return disruptionError("ATTENDANCE_ALREADY_SUBMITTED", "A Class Session cannot be cancelled after an Attendance Record is submitted.");
  }
  const bookings = await transaction.selectFrom("bookings").select(["id", "student_user_id"])
    .where("class_session_id", "=", input.classSessionId).where("state", "=", "ACTIVE").forUpdate().execute();
  for (const booking of bookings) {
    const account = await transaction.selectFrom("class_credit_accounts").select("available_balance").where("student_user_id", "=", booking.student_user_id).forUpdate().executeTakeFirstOrThrow();
    await transaction.updateTable("bookings").set({ state: "ENDED", terminal_reason: "CLASS_SESSION_CANCELLATION", class_credit_refunded: true, ended_at: now }).where("id", "=", booking.id).execute();
    await transaction.insertInto("class_credit_ledger_entries").values({ student_user_id: booking.student_user_id, amount: 1, source: "BOOKING_REFUND", source_reference: booking.id, reason: null }).execute();
    await transaction.updateTable("class_credit_accounts").set({ available_balance: account.available_balance + 1, updated_at: now }).where("student_user_id", "=", booking.student_user_id).execute();
    await notifyClassSessionUser(transaction, { recipientUserId: booking.student_user_id, messageId: "class-session.cancelled.student", classSessionId: input.classSessionId, startsAt: disruption.starts_at, sourceReference: `class-session.cancelled.student:${input.absenceRequestId}:${input.classSessionId}` });
  }
  await transaction.updateTable("schedule_commitments").set({ active: false }).where("class_session_id", "=", input.classSessionId).execute();
  const waitlist = await transaction.selectFrom("waitlist_entries").select(["id", "student_user_id"]).where("class_session_id", "=", input.classSessionId).where("state", "=", "ACTIVE").forUpdate().execute();
  if (waitlist.length > 0) {
    await transaction.updateTable("waitlist_entries").set({ state: "INELIGIBLE", terminal_reason: "CLASS_SESSION_UNAVAILABLE", completed_at: now }).where("id", "in", waitlist.map(({ id }) => id)).execute();
    for (const entry of waitlist) await notifyRemovedWaitlistStudent(transaction, entry.id, entry.student_user_id, input.classSessionId);
  }
  await transaction.updateTable("class_session_reminders").set({ terminal_outcome: "SUPPRESSED", completed_at: now }).where("class_session_id", "=", input.classSessionId).where("terminal_outcome", "is", null).execute();
  const session = await transaction.updateTable("class_sessions").set({ state: "CANCELLED", cancellation_reason: reason, cancelled_at: now, occupied_seats: 0 }).where("id", "=", input.classSessionId).returningAll().executeTakeFirstOrThrow();
  await transaction.updateTable("absence_request_sessions").set({ resolution: "CLASS_SESSION_CANCELLATION", resolution_reason: reason, resolved_at: now }).where("absence_request_id", "=", input.absenceRequestId).where("class_session_id", "=", input.classSessionId).execute();
  await notifyClassSessionTeacher(transaction, { teacherUserId: disruption.teacher_user_id, messageId: "class-session.cancelled.teacher", classSessionId: input.classSessionId, startsAt: disruption.starts_at, sourceReference: `class-session.cancelled.teacher:${input.absenceRequestId}:${input.classSessionId}` });
  await resolveAbsenceRequestIfComplete(transaction, input.absenceRequestId, now);
  await recordAudit("SUCCEEDED", "CLASS_SESSION_CANCELLED");
  return { __typename: "CancelClassSessionSuccess" as const, classSession: classSessionProjection(session), absenceRequest: await projectAbsenceRequest(transaction, input.absenceRequestId), refundedBookingCount: bookings.length, removedWaitlistEntryCount: waitlist.length };
}
