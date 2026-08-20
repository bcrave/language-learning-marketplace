import { interfaceMessages, type UserRole } from "@marketplace/core";
import IntlMessageFormat from "intl-messageformat";
import { sql } from "kysely";

import type { Administrator } from "./administrator-policy.js";
import { recordAdministrationAudit } from "../audit/administration-audit.js";
import type { Database } from "../database/database.js";
import { requestWaitlistPromotion } from "../waitlist/waitlist-promotion-request.js";
import { projectAdministrationUser } from "./user-administration-projection.js";

type ChangeUserAccessInput = { reason: string; userId: string };
type UserAccessErrorCode =
  | "INVALID_REASON"
  | "USER_NOT_FOUND"
  | "USER_ALREADY_SUSPENDED"
  | "USER_NOT_SUSPENDED"
  | "USER_ANONYMIZED"
  | "USER_ANONYMIZATION_PENDING"
  | "SELF_SUSPENSION"
  | "FINAL_ACTIVE_PLATFORM_ADMINISTRATOR";

const roleMessageIds: Record<UserRole, "role.student" | "role.teacher" | "role.organizationManager" | "role.platformAdministrator"> = {
  STUDENT: "role.student",
  TEACHER: "role.teacher",
  ORGANIZATION_MANAGER: "role.organizationManager",
  PLATFORM_ADMINISTRATOR: "role.platformAdministrator",
};

function accessError(code: UserAccessErrorCode, message: string) {
  return { __typename: "UserAccessError" as const, code, message };
}

async function notifyUser(
  transaction: Database,
  user: { id: string; interface_locale: "en" | "es" | null; display_time_zone: string | null },
  messageId: "user.suspended.user" | "user.reactivated.user",
  variables: Record<string, unknown>,
  sourceReference: string,
) {
  const locale = user.interface_locale ?? "en";
  const timeZone = user.display_time_zone ?? "UTC";
  const renderedContent = String(new IntlMessageFormat(interfaceMessages[locale][messageId], locale, {
    date: { long: { ...IntlMessageFormat.formats.date.long, timeZone } },
    time: { short: { ...IntlMessageFormat.formats.time.short, timeZone } },
  }).format({ ...variables, effectiveAt: new Date(String(variables.effectiveAt)) }));
  await transaction.insertInto("in_app_notifications").values({ recipient_user_id: user.id, message_id: messageId, variables: JSON.stringify(variables), source_reference: sourceReference }).execute();
  await transaction.insertInto("email_notification_intents").values({ recipient_user_id: user.id, message_id: messageId, locale, variables: JSON.stringify(variables), rendered_content: renderedContent, source_reference: sourceReference }).execute();
}

async function notifyAdministratorsOfTeacherWork(
  transaction: Database,
  suspendedUserId: string,
  classSessionIds: string[],
  changedAt: Date,
  changeId: string,
  correlationId: string,
) {
  if (classSessionIds.length === 0) return;
  const administrators = await transaction.selectFrom("users")
    .innerJoin("role_assignments", "role_assignments.user_id", "users.id")
    .select(["users.id", "users.interface_locale", "users.display_time_zone"])
    .where("role_assignments.role", "=", "PLATFORM_ADMINISTRATOR")
    .where("users.access_status", "=", "ACTIVE")
    .execute();
  for (const classSessionId of classSessionIds) {
    await transaction.insertInto("administrator_task_items").values({
      kind: "USER_SUSPENSION_TEACHER_ASSIGNMENT",
      correlation_reference: correlationId,
      safe_context: JSON.stringify({ classSessionId, suspendedUserId }),
      source_reference: `user-suspension:${changeId}:class-session:${classSessionId}`,
      recipient_reference: suspendedUserId,
    }).execute();
  }
  for (const administrator of administrators) {
    const locale = administrator.interface_locale ?? "en";
    const timeZone = administrator.display_time_zone ?? "UTC";
    const messageId = "user.suspended.administrator" as const;
    const variables = { classSessionCount: classSessionIds.length, classSessionReferences: classSessionIds.join(", "), effectiveAt: changedAt.toISOString() };
    const renderedContent = String(new IntlMessageFormat(interfaceMessages[locale][messageId], locale, {
      date: { long: { ...IntlMessageFormat.formats.date.long, timeZone } },
      time: { short: { ...IntlMessageFormat.formats.time.short, timeZone } },
    }).format({ ...variables, effectiveAt: changedAt }));
    const sourceReference = `${messageId}:${changeId}`;
    await transaction.insertInto("in_app_notifications").values({ recipient_user_id: administrator.id, message_id: messageId, variables: JSON.stringify(variables), source_reference: sourceReference }).execute();
    await transaction.insertInto("email_notification_intents").values({ recipient_user_id: administrator.id, message_id: messageId, locale, variables: JSON.stringify(variables), rendered_content: renderedContent, source_reference: sourceReference }).execute();
  }
}

async function deny(
  transaction: Database,
  administrator: Administrator,
  input: { userId: string },
  operation: "user.suspended" | "user.reactivated",
  correlationId: string,
  code: UserAccessErrorCode,
  message: string,
) {
  await recordAdministrationAudit(transaction, { administratorId: administrator.id, correlationId, operation, targetType: "User", targetId: input.userId, outcome: "DENIED", reasonCode: code });
  return accessError(code, message);
}

export async function suspendUser(
  transaction: Database,
  administrator: Administrator,
  input: ChangeUserAccessInput,
  correlationId: string,
  now: Date,
) {
  const reason = input.reason.trim();
  if (reason !== input.reason || reason.length < 3 || reason.length > 200) return deny(transaction, administrator, input, "user.suspended", correlationId, "INVALID_REASON", "Enter a concise reason from 3 through 200 characters without surrounding spaces.");
  if (input.userId === administrator.id) return deny(transaction, administrator, input, "user.suspended", correlationId, "SELF_SUSPENSION", "A Platform Administrator cannot suspend their own User.");

  await sql`select pg_advisory_xact_lock(hashtextextended(${input.userId}, 28))`.execute(transaction);
  const user = await transaction.selectFrom("users").select(["id", "interface_locale", "display_time_zone", "access_status"]).where("id", "=", input.userId).forUpdate().executeTakeFirst();
  if (!user) return deny(transaction, administrator, input, "user.suspended", correlationId, "USER_NOT_FOUND", "Choose an existing User.");
  if (user.access_status === "ANONYMIZATION_PENDING") return deny(transaction, administrator, input, "user.suspended", correlationId, "USER_ANONYMIZATION_PENDING", "The User's anonymization is pending identity deletion.");
  if (user.access_status === "ANONYMIZED") return deny(transaction, administrator, input, "user.suspended", correlationId, "USER_ANONYMIZED", "An anonymized Former User cannot be suspended or reactivated.");
  if (user.access_status === "SUSPENDED") return deny(transaction, administrator, input, "user.suspended", correlationId, "USER_ALREADY_SUSPENDED", "The User is already suspended.");

  const targetIsAdministrator = await transaction.selectFrom("role_assignments").select("user_id").where("user_id", "=", input.userId).where("role", "=", "PLATFORM_ADMINISTRATOR").executeTakeFirst();
  if (targetIsAdministrator) {
    const activeAdministrators = await transaction.selectFrom("users")
      .innerJoin("role_assignments", "role_assignments.user_id", "users.id")
      .select("users.id")
      .where("role_assignments.role", "=", "PLATFORM_ADMINISTRATOR")
      .where("users.access_status", "=", "ACTIVE")
      .forUpdate()
      .execute();
    if (activeAdministrators.length === 1) return deny(transaction, administrator, input, "user.suspended", correlationId, "FINAL_ACTIVE_PLATFORM_ADMINISTRATOR", "The final active Platform Administrator cannot be suspended.");
  }

  const bookings = await transaction.selectFrom("bookings")
    .innerJoin("class_sessions", "class_sessions.id", "bookings.class_session_id")
    .select(["bookings.id", "bookings.class_session_id"])
    .where("bookings.student_user_id", "=", input.userId)
    .where("bookings.state", "=", "ACTIVE")
    .where("class_sessions.starts_at", ">", now)
    .forUpdate()
    .execute();
  if (bookings.length > 0) {
    const account = await transaction.selectFrom("class_credit_accounts").select("available_balance").where("student_user_id", "=", input.userId).forUpdate().executeTakeFirstOrThrow();
    for (const booking of bookings) {
      await transaction.updateTable("bookings").set({ state: "ENDED", terminal_reason: "USER_SUSPENSION", class_credit_refunded: true, ended_at: now }).where("id", "=", booking.id).execute();
      await transaction.insertInto("class_credit_ledger_entries").values({ student_user_id: input.userId, amount: 1, source: "BOOKING_REFUND", source_reference: booking.id, reason }).execute();
      await transaction.updateTable("class_sessions").set({ occupied_seats: sql<number>`occupied_seats - 1` }).where("id", "=", booking.class_session_id).execute();
      await requestWaitlistPromotion(transaction, booking.class_session_id);
    }
    await transaction.updateTable("class_credit_accounts").set({ available_balance: account.available_balance + bookings.length, updated_at: now }).where("student_user_id", "=", input.userId).execute();
    const classSessionIds = bookings.map(({ class_session_id }) => class_session_id);
    await transaction.updateTable("schedule_commitments").set({ active: false }).where("user_id", "=", input.userId).where("commitment_role", "=", "STUDENT").where("class_session_id", "in", classSessionIds).execute();
    await transaction.updateTable("class_session_reminders").set({ terminal_outcome: "SUPPRESSED", completed_at: now }).where("recipient_user_id", "=", input.userId).where("class_session_id", "in", classSessionIds).where("terminal_outcome", "is", null).execute();
  }

  const waitlistEntries = await transaction.selectFrom("waitlist_entries").select("id").where("student_user_id", "=", input.userId).where("state", "=", "ACTIVE").forUpdate().execute();
  if (waitlistEntries.length > 0) {
    await transaction.updateTable("waitlist_entries").set({ state: "INELIGIBLE", terminal_reason: "USER_SUSPENSION", completed_at: now }).where("id", "in", waitlistEntries.map(({ id }) => id)).execute();
  }

  const teacherAssignments = await transaction.selectFrom("class_sessions")
    .select("id")
    .where("teacher_user_id", "=", input.userId)
    .where("state", "=", "PUBLISHED")
    .where("starts_at", ">", now)
    .orderBy("starts_at")
    .forUpdate()
    .execute();
  const teacherClassSessionIds = teacherAssignments.map(({ id }) => id);

  await transaction.updateTable("users").set({ access_status: "SUSPENDED", suspension_reason: reason, suspended_at: now, suspended_by_user_id: administrator.id }).where("id", "=", input.userId).executeTakeFirstOrThrow();
  const change = await transaction.insertInto("user_access_changes").values({ user_id: input.userId, action: "SUSPENDED", reason, changed_by_user_id: administrator.id, changed_at: now }).returning("id").executeTakeFirstOrThrow();
  await recordAdministrationAudit(transaction, { administratorId: administrator.id, correlationId, operation: "user.suspended", targetType: "User", targetId: input.userId, reasonCode: "USER_SUSPENDED" });
  const roles = await transaction.selectFrom("role_assignments").select("role").where("user_id", "=", input.userId).orderBy("role").execute();
  await notifyUser(transaction, user, "user.suspended.user", { effectiveAt: now.toISOString(), reason, endedBookingCount: bookings.length, refundedClassCreditCount: bookings.length, roles: roles.map(({ role }) => role) }, `user.suspended.user:${change.id}`);
  await notifyAdministratorsOfTeacherWork(transaction, input.userId, teacherClassSessionIds, now, change.id, correlationId);

  return { __typename: "UserAccessChangeSuccess" as const, user: await projectAdministrationUser(transaction, input.userId), endedBookingCount: bookings.length, removedWaitlistEntryCount: waitlistEntries.length, refundedClassCreditCount: bookings.length, teacherClassSessionIds };
}

export async function reactivateUser(
  transaction: Database,
  administrator: Administrator,
  input: { userId: string },
  correlationId: string,
  now: Date,
) {
  await sql`select pg_advisory_xact_lock(hashtextextended(${input.userId}, 28))`.execute(transaction);
  const user = await transaction.selectFrom("users").select(["id", "interface_locale", "display_time_zone", "access_status"]).where("id", "=", input.userId).forUpdate().executeTakeFirst();
  if (!user) return deny(transaction, administrator, input, "user.reactivated", correlationId, "USER_NOT_FOUND", "Choose an existing User.");
  if (user.access_status === "ANONYMIZATION_PENDING") return deny(transaction, administrator, input, "user.reactivated", correlationId, "USER_ANONYMIZATION_PENDING", "The User's anonymization is pending identity deletion.");
  if (user.access_status === "ANONYMIZED") return deny(transaction, administrator, input, "user.reactivated", correlationId, "USER_ANONYMIZED", "An anonymized Former User cannot be suspended or reactivated.");
  if (user.access_status !== "SUSPENDED") return deny(transaction, administrator, input, "user.reactivated", correlationId, "USER_NOT_SUSPENDED", "The User is not suspended.");

  await transaction.updateTable("users").set({ access_status: "ACTIVE", suspension_reason: null, suspended_at: null, suspended_by_user_id: null }).where("id", "=", input.userId).executeTakeFirstOrThrow();
  const change = await transaction.insertInto("user_access_changes").values({ user_id: input.userId, action: "REACTIVATED", reason: "User reactivated", changed_by_user_id: administrator.id, changed_at: now }).returning("id").executeTakeFirstOrThrow();
  await recordAdministrationAudit(transaction, { administratorId: administrator.id, correlationId, operation: "user.reactivated", targetType: "User", targetId: input.userId, reasonCode: "USER_REACTIVATED" });
  const roles = await transaction.selectFrom("role_assignments").select("role").where("user_id", "=", input.userId).orderBy("role").execute();
  const locale = user.interface_locale ?? "en";
  await notifyUser(transaction, user, "user.reactivated.user", { effectiveAt: now.toISOString(), restoredRoles: roles.map(({ role }) => interfaceMessages[locale][roleMessageIds[role]]).join(", ") }, `user.reactivated.user:${change.id}`);
  return { __typename: "UserAccessChangeSuccess" as const, user: await projectAdministrationUser(transaction, input.userId), endedBookingCount: 0, removedWaitlistEntryCount: 0, refundedClassCreditCount: 0, teacherClassSessionIds: [] as string[] };
}
