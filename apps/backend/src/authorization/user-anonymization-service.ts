import { sql } from "kysely";
import { USER_ANONYMIZATION_CONFIRMATION } from "@marketplace/core";

import { recordAdministrationAudit } from "../audit/administration-audit.js";
import type { Database } from "../database/database.js";
import type { Administrator } from "./administrator-policy.js";
import { projectAdministrationUser } from "./user-administration-projection.js";

type AnonymizeUserInput = { confirmation: string; reason: string; userId: string };
type AnonymizeUserErrorCode =
  | "CONFIRMATION_REQUIRED"
  | "INVALID_ANONYMIZATION_REASON"
  | "USER_NOT_FOUND"
  | "USER_ALREADY_ANONYMIZED"
  | "USER_ANONYMIZATION_PENDING"
  | "SELF_ANONYMIZATION"
  | "PRIVILEGED_ACCESS_REQUIRES_RESOLUTION"
  | "FUTURE_COMMITMENTS_REQUIRE_RESOLUTION";

const redactionReason = "User anonymized";

function error(code: AnonymizeUserErrorCode, message: string, classSessionIds: string[] = []) {
  return { __typename: "AnonymizeUserError" as const, code, message, classSessionIds };
}

async function deny(db: Database, administrator: Administrator, input: AnonymizeUserInput, correlationId: string, code: AnonymizeUserErrorCode, message: string, classSessionIds: string[] = []) {
  await recordAdministrationAudit(db, { administratorId: administrator.id, correlationId, operation: "user.anonymized", targetType: "User", targetId: input.userId, outcome: "DENIED", reasonCode: code });
  return error(code, message, classSessionIds);
}

export async function anonymizeUser(
  transaction: Database,
  administrator: Administrator,
  input: AnonymizeUserInput,
  correlationId: string,
  now: Date,
) {
  const reason = input.reason.trim();
  if (input.confirmation !== USER_ANONYMIZATION_CONFIRMATION) return deny(transaction, administrator, input, correlationId, "CONFIRMATION_REQUIRED", `Type ${USER_ANONYMIZATION_CONFIRMATION} exactly to accept this irreversible operation.`);
  if (reason !== input.reason || reason.length < 10 || reason.length > 500) return deny(transaction, administrator, input, correlationId, "INVALID_ANONYMIZATION_REASON", "Give a reason from 10 through 500 characters without surrounding spaces.");
  if (input.userId === administrator.id) return deny(transaction, administrator, input, correlationId, "SELF_ANONYMIZATION", "A Platform Administrator cannot anonymize their own User.");

  await sql`select pg_advisory_xact_lock(hashtextextended(${input.userId}, 28))`.execute(transaction);
  const user = await transaction.selectFrom("users").select(["id", "identity_issuer", "identity_subject", "access_status"]).where("id", "=", input.userId).forUpdate().executeTakeFirst();
  if (!user) return deny(transaction, administrator, input, correlationId, "USER_NOT_FOUND", "Choose an existing User.");
  if (user.access_status === "ANONYMIZED") return deny(transaction, administrator, input, correlationId, "USER_ALREADY_ANONYMIZED", "The User is already anonymized.");
  if (user.access_status === "ANONYMIZATION_PENDING") return deny(transaction, administrator, input, correlationId, "USER_ANONYMIZATION_PENDING", "The User's anonymization is already pending identity deletion.");

  const privilegedRole = await transaction.selectFrom("role_assignments").select("role").where("user_id", "=", input.userId).where("role", "in", ["ORGANIZATION_MANAGER", "PLATFORM_ADMINISTRATOR"]).executeTakeFirst();
  if (privilegedRole) return deny(transaction, administrator, input, correlationId, "PRIVILEGED_ACCESS_REQUIRES_RESOLUTION", "Remove privileged Role Assignments before anonymizing the User.");

  const [studentSessions, teacherSessions, waitlist, subscription, sponsorship, invitation, absenceRequest, attendanceReview] = await Promise.all([
    transaction.selectFrom("bookings").innerJoin("class_sessions", "class_sessions.id", "bookings.class_session_id").select("class_sessions.id").where("bookings.student_user_id", "=", input.userId).where("bookings.state", "=", "ACTIVE").where("class_sessions.starts_at", ">", now).forUpdate().execute(),
    transaction.selectFrom("class_sessions").select("id").where("teacher_user_id", "=", input.userId).where("state", "=", "PUBLISHED").where("starts_at", ">", now).forUpdate().execute(),
    transaction.selectFrom("waitlist_entries").select("id").where("student_user_id", "=", input.userId).where("state", "=", "ACTIVE").forUpdate().executeTakeFirst(),
    transaction.selectFrom("subscriptions").select("id").where("student_user_id", "=", input.userId).where("state", "!=", "CANCELLED").forUpdate().executeTakeFirst(),
    transaction.selectFrom("sponsorships").select("id").where("student_user_id", "=", input.userId).where("state", "=", "ACTIVE").forUpdate().executeTakeFirst(),
    transaction.selectFrom("sponsorship_invitations").select("id").where("student_user_id", "=", input.userId).where("state", "=", "PENDING").forUpdate().executeTakeFirst(),
    transaction.selectFrom("absence_requests").select("id").where("teacher_user_id", "=", input.userId).where("state", "=", "OPEN").forUpdate().executeTakeFirst(),
    transaction.selectFrom("attendance_review_requests").select("id").where("student_user_id", "=", input.userId).where("state", "=", "PENDING").forUpdate().executeTakeFirst(),
  ]);
  const classSessionIds = [...new Set([...studentSessions, ...teacherSessions].map(({ id }) => id))].sort();
  if (classSessionIds.length > 0 || waitlist || subscription || sponsorship || invitation || absenceRequest || attendanceReview) {
    return deny(transaction, administrator, input, correlationId, "FUTURE_COMMITMENTS_REQUIRE_RESOLUTION", "Resolve every future commitment and open request before anonymizing the User.", classSessionIds);
  }

  const feedback = await transaction.selectFrom("learning_feedback").innerJoin("bookings", "bookings.id", "learning_feedback.booking_id").select(["learning_feedback.id", "learning_feedback.state"]).where("bookings.student_user_id", "=", input.userId).forUpdate().execute();
  for (const item of feedback) {
    await transaction.insertInto("learning_feedback_redactions").values({ learning_feedback_id: item.id, redacted_by_user_id: administrator.id, feedback_state_at_redaction: item.state, reason: redactionReason, redacted_at: now }).execute();
  }
  if (feedback.length > 0) await transaction.updateTable("learning_feedback").set({ observed_strengths: [], suggested_focuses: [], observations: "", next_practice: "", redacted_at: now, redacted_by_user_id: administrator.id, redaction_reason: redactionReason, updated_at: now }).where("id", "in", feedback.map(({ id }) => id)).execute();

  const ratings = await transaction.selectFrom("session_ratings").select("id").where("student_user_id", "=", input.userId).forUpdate().execute();
  for (const rating of ratings) await transaction.insertInto("session_rating_redactions").values({ session_rating_id: rating.id, redacted_by_user_id: administrator.id, reason: redactionReason, redacted_at: now }).execute();
  if (ratings.length > 0) await transaction.updateTable("session_ratings").set({ positive_tags: [], improvement_tags: [], comment: "", redacted_at: now, redacted_by_user_id: administrator.id, redaction_reason: redactionReason, updated_at: now }).where("id", "in", ratings.map(({ id }) => id)).execute();

  await transaction.deleteFrom("in_app_notifications").where("recipient_user_id", "=", input.userId).execute();
  await transaction.deleteFrom("email_notification_intents").where("recipient_user_id", "=", input.userId).execute();
  await transaction.updateTable("recorded_email_deliveries").set({ rendered_content: null, content_expired_at: now }).where("recipient_user_id", "=", input.userId).execute();
  await transaction.deleteFrom("teacher_profile_topics").where("teacher_user_id", "=", input.userId).execute();
  await transaction.deleteFrom("teacher_profiles").where("teacher_user_id", "=", input.userId).execute();
  await transaction.deleteFrom("teacher_qualifications").where("teacher_user_id", "=", input.userId).execute();
  await transaction.deleteFrom("availability_exceptions").where("teacher_user_id", "=", input.userId).execute();
  await transaction.deleteFrom("teacher_availability_ranges").where("teacher_user_id", "=", input.userId).execute();
  await transaction.deleteFrom("teacher_availability_settings").where("teacher_user_id", "=", input.userId).execute();
  await transaction.deleteFrom("role_assignments").where("user_id", "=", input.userId).execute();
  await transaction.insertInto("user_anonymization_requests").values({ user_id: input.userId, identity_issuer: user.identity_issuer, identity_subject: user.identity_subject, reason, requested_by_user_id: administrator.id, state: "PENDING", redacted_learning_feedback_count: feedback.length, redacted_session_rating_count: ratings.length, correlation_id: correlationId, requested_at: now, completed_at: null }).execute();
  await transaction.updateTable("users").set({ display_name: "Former User", interface_locale: null, display_time_zone: null, access_status: "ANONYMIZATION_PENDING", suspension_reason: null, suspended_at: null, suspended_by_user_id: null, anonymized_at: now, anonymized_by_user_id: administrator.id }).where("id", "=", input.userId).executeTakeFirstOrThrow();
  await recordAdministrationAudit(transaction, { administratorId: administrator.id, correlationId, operation: "user.anonymization-requested", targetType: "User", targetId: input.userId, reasonCode: "USER_ANONYMIZATION_REQUESTED" });

  return { __typename: "AnonymizeUserSuccess" as const, state: "PENDING" as const, user: await projectAdministrationUser(transaction, input.userId), redactedLearningFeedbackCount: feedback.length, redactedSessionRatingCount: ratings.length };
}
