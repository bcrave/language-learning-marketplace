import { interfaceMessages, type UserRole } from "@marketplace/core";
import IntlMessageFormat from "intl-messageformat";
import { sql } from "kysely";

import { recordAdministrationAudit } from "../audit/administration-audit.js";
import type { Administrator } from "./administrator-policy.js";
import type { Database } from "../database/database.js";
import { requestWaitlistPromotion } from "../waitlist/waitlist-promotion-request.js";
import { projectAdministrationUser } from "./user-administration-projection.js";

type ChangeRoleAssignmentInput = {
  organizationId?: string | null;
  reason: string;
  role: UserRole;
  userId: string;
};

type RoleAssignmentErrorCode =
  | "INVALID_REASON"
  | "USER_NOT_FOUND"
  | "ROLE_ALREADY_ASSIGNED"
  | "ROLE_NOT_ASSIGNED"
  | "ORGANIZATION_REQUIRED"
  | "ORGANIZATION_NOT_FOUND"
  | "FINAL_PLATFORM_ADMINISTRATOR"
  | "SELF_PLATFORM_ADMINISTRATOR_REMOVAL"
  | "TEACHER_ASSIGNMENTS_REQUIRE_RESOLUTION";

function roleAssignmentError(
  code: RoleAssignmentErrorCode,
  message: string,
  classSessionIds: string[] = [],
) {
  return { __typename: "RoleAssignmentError" as const, code, message, classSessionIds };
}

async function deniedChange(
  transaction: Database,
  administrator: Administrator,
  input: ChangeRoleAssignmentInput,
  correlationId: string,
  code: RoleAssignmentErrorCode,
  message: string,
) {
  await recordAdministrationAudit(transaction, {
    administratorId: administrator.id,
    correlationId,
    operation: "role-assignment.granted",
    targetType: "User",
    targetId: input.userId,
    outcome: "DENIED",
    reasonCode: code,
  });
  return roleAssignmentError(code, message);
}

async function notifyRoleAssignmentChange(
  transaction: Database,
  user: { id: string; interface_locale: "en" | "es" | null; display_time_zone: string | null },
  messageId: "role-assignment.granted.user" | "role-assignment.removed.user",
  variables: Record<string, unknown>,
  changedAt: Date,
  changeId: string,
) {
  const locale = user.interface_locale ?? "en";
  const timeZone = user.display_time_zone ?? "UTC";
  const storedVariables = { ...variables, effectiveAt: changedAt.toISOString() };
  const renderedContent = String(new IntlMessageFormat(interfaceMessages[locale][messageId], locale, {
    date: { long: { ...IntlMessageFormat.formats.date.long, timeZone } },
    time: { short: { ...IntlMessageFormat.formats.time.short, timeZone } },
  }).format({ ...storedVariables, effectiveAt: changedAt }));
  const sourceReference = `${messageId}:${changeId}`;
  await transaction.insertInto("in_app_notifications").values({
    recipient_user_id: user.id,
    message_id: messageId,
    variables: JSON.stringify(storedVariables),
    source_reference: sourceReference,
  }).execute();
  await transaction.insertInto("email_notification_intents").values({
    recipient_user_id: user.id,
    message_id: messageId,
    locale,
    variables: JSON.stringify(storedVariables),
    rendered_content: renderedContent,
    source_reference: sourceReference,
  }).execute();
}

const initialWorkspacePaths: Record<UserRole, string> = {
  STUDENT: "/student/discover",
  TEACHER: "/teacher/schedule",
  ORGANIZATION_MANAGER: "/organization/students",
  PLATFORM_ADMINISTRATOR: "/administration/operations",
};

export async function roleAssignmentAdministration(db: Database) {
  const [userIds, organizations] = await Promise.all([
    db.selectFrom("users").select("id").orderBy("display_name").orderBy("id").execute(),
    db.selectFrom("organizations").select(["id", "name"]).orderBy("name").orderBy("id").execute(),
  ]);
  return {
    users: await Promise.all(userIds.map(({ id }) => projectAdministrationUser(db, id))),
    organizations,
  };
}

export async function grantRoleAssignment(
  transaction: Database,
  administrator: Administrator,
  input: ChangeRoleAssignmentInput,
  correlationId: string,
) {
  const reason = input.reason.trim();
  if (reason !== input.reason || reason.length < 3 || reason.length > 200) {
    return deniedChange(transaction, administrator, input, correlationId, "INVALID_REASON", "Enter a concise reason from 3 through 200 characters without surrounding spaces.");
  }
  const user = await transaction.selectFrom("users")
    .select(["id", "interface_locale", "display_time_zone"])
    .where("id", "=", input.userId)
    .forUpdate()
    .executeTakeFirst();
  if (!user) {
    return deniedChange(transaction, administrator, input, correlationId, "USER_NOT_FOUND", "Choose an existing User.");
  }
  const existing = await transaction.selectFrom("role_assignments")
    .select("role")
    .where("user_id", "=", input.userId)
    .where("role", "=", input.role)
    .executeTakeFirst();
  if (existing) {
    return deniedChange(transaction, administrator, input, correlationId, "ROLE_ALREADY_ASSIGNED", "The User already has this Role Assignment.");
  }
  if (input.role === "ORGANIZATION_MANAGER") {
    if (!input.organizationId) {
      return deniedChange(transaction, administrator, input, correlationId, "ORGANIZATION_REQUIRED", "Choose an Organization for the Organization Manager Role Assignment.");
    }
    const organization = await transaction.selectFrom("organizations").select("id").where("id", "=", input.organizationId).executeTakeFirst();
    if (!organization) {
      return deniedChange(transaction, administrator, input, correlationId, "ORGANIZATION_NOT_FOUND", "Choose an existing Organization.");
    }
  }

  await transaction.insertInto("role_assignments").values({ user_id: input.userId, role: input.role }).execute();
  if (input.role === "ORGANIZATION_MANAGER") {
    await transaction.insertInto("organization_managers").values({
      user_id: input.userId,
      organization_id: input.organizationId!,
    }).execute();
  }
  if (input.role === "STUDENT") {
    await transaction.insertInto("class_credit_accounts")
      .values({ student_user_id: input.userId })
      .onConflict((conflict) => conflict.column("student_user_id").doNothing())
      .execute();
  }
  const change = await transaction.insertInto("role_assignment_changes").values({
    user_id: input.userId,
    role: input.role,
    action: "GRANTED",
    reason,
    changed_by_user_id: administrator.id,
  }).returning(["id", "changed_at"]).executeTakeFirstOrThrow();
  await recordAdministrationAudit(transaction, {
    administratorId: administrator.id,
    correlationId,
    operation: "role-assignment.granted",
    targetType: "User",
    targetId: input.userId,
    reasonCode: "ROLE_ASSIGNMENT_GRANTED",
  });
  await notifyRoleAssignmentChange(transaction, user, "role-assignment.granted.user", {
    role: input.role,
    workspacePath: initialWorkspacePaths[input.role],
  }, change.changed_at, change.id);
  return {
    __typename: "RoleAssignmentChangeSuccess" as const,
    user: await projectAdministrationUser(transaction, input.userId),
    endedBookingCount: 0,
    removedWaitlistEntryCount: 0,
    refundedClassCreditCount: 0,
    subscriptionEnded: false,
    sponsorshipEnded: false,
  };
}

export async function removeRoleAssignment(
  transaction: Database,
  administrator: Administrator,
  input: ChangeRoleAssignmentInput,
  correlationId: string,
  now: Date,
) {
  const reason = input.reason.trim();
  const deny = async (code: RoleAssignmentErrorCode, message: string, classSessionIds: string[] = []) => {
    await recordAdministrationAudit(transaction, { administratorId: administrator.id, correlationId, operation: "role-assignment.removed", targetType: "User", targetId: input.userId, outcome: "DENIED", reasonCode: code });
    return roleAssignmentError(code, message, classSessionIds);
  };
  if (reason !== input.reason || reason.length < 3 || reason.length > 200) {
    return deny("INVALID_REASON", "Enter a concise reason from 3 through 200 characters without surrounding spaces.");
  }
  if (input.role === "STUDENT" || input.role === "TEACHER") {
    // Booking, Waitlist, Class Session publication, and Teacher Substitution use
    // this same per-User lock. No new future commitment can cross the cleanup.
    await sql`select pg_advisory_xact_lock(hashtextextended(${input.userId}, 28))`.execute(transaction);
  }
  const user = await transaction.selectFrom("users").select(["id", "interface_locale", "display_time_zone"]).where("id", "=", input.userId).forUpdate().executeTakeFirst();
  if (!user) return deny("USER_NOT_FOUND", "Choose an existing User.");
  const assignmentQuery = transaction.selectFrom("role_assignments").select("role").where("user_id", "=", input.userId).where("role", "=", input.role);
  const assignment = input.role === "PLATFORM_ADMINISTRATOR"
    ? await assignmentQuery.executeTakeFirst()
    : await assignmentQuery.forUpdate().executeTakeFirst();
  if (!assignment) return deny("ROLE_NOT_ASSIGNED", "The User does not have this Role Assignment.");

  if (input.role === "TEACHER") {
    const futureAssignments = await transaction.selectFrom("class_sessions")
      .select("id")
      .where("teacher_user_id", "=", input.userId)
      .where("state", "=", "PUBLISHED")
      .where("starts_at", ">", now)
      .orderBy("starts_at")
      .forUpdate()
      .execute();
    if (futureAssignments.length > 0) {
      return deny("TEACHER_ASSIGNMENTS_REQUIRE_RESOLUTION", "Substitute the Teacher or cancel every future Class Session before removing this Role Assignment.", futureAssignments.map(({ id }) => id));
    }
  }
  if (input.role === "PLATFORM_ADMINISTRATOR") {
    const administrators = await transaction.selectFrom("role_assignments")
      .select("user_id")
      .where("role", "=", "PLATFORM_ADMINISTRATOR")
      .orderBy("user_id")
      .forUpdate()
      .execute();
    if (!administrators.some(({ user_id }) => user_id === input.userId)) {
      return deny("ROLE_NOT_ASSIGNED", "The User does not have this Role Assignment.");
    }
    if (administrators.length === 1) {
      return deny("FINAL_PLATFORM_ADMINISTRATOR", "The final active Platform Administrator Role Assignment cannot be removed.");
    }
    if (administrator.id === input.userId) {
      return deny("SELF_PLATFORM_ADMINISTRATOR_REMOVAL", "A Platform Administrator cannot remove their own administrative access.");
    }
  }

  let endedBookingCount = 0;
  let removedWaitlistEntryCount = 0;
  let refundedClassCreditCount = 0;
  let subscriptionEnded = false;
  if (input.role === "STUDENT") {
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
        await transaction.updateTable("bookings").set({ state: "ENDED", terminal_reason: "ROLE_ASSIGNMENT_REMOVAL", class_credit_refunded: true, ended_at: now }).where("id", "=", booking.id).execute();
        await transaction.insertInto("class_credit_ledger_entries").values({ student_user_id: input.userId, amount: 1, source: "BOOKING_REFUND", source_reference: booking.id, reason }).execute();
        await transaction.updateTable("class_sessions").set({ occupied_seats: sql<number>`occupied_seats - 1` }).where("id", "=", booking.class_session_id).execute();
        await requestWaitlistPromotion(transaction, booking.class_session_id);
      }
      await transaction.updateTable("class_credit_accounts").set({ available_balance: account.available_balance + bookings.length, updated_at: now }).where("student_user_id", "=", input.userId).execute();
      const classSessionIds = bookings.map(({ class_session_id }) => class_session_id);
      await transaction.updateTable("schedule_commitments").set({ active: false }).where("user_id", "=", input.userId).where("commitment_role", "=", "STUDENT").where("class_session_id", "in", classSessionIds).execute();
      await transaction.updateTable("class_session_reminders").set({ terminal_outcome: "SUPPRESSED", completed_at: now }).where("recipient_user_id", "=", input.userId).where("class_session_id", "in", classSessionIds).where("terminal_outcome", "is", null).execute();
      endedBookingCount = bookings.length;
      refundedClassCreditCount = bookings.length;
    }
    const waitlistEntries = await transaction.selectFrom("waitlist_entries")
      .select("id")
      .where("student_user_id", "=", input.userId)
      .where("state", "=", "ACTIVE")
      .forUpdate()
      .execute();
    if (waitlistEntries.length > 0) {
      await transaction.updateTable("waitlist_entries").set({ state: "INELIGIBLE", terminal_reason: "ROLE_ASSIGNMENT_REMOVAL", completed_at: now }).where("id", "in", waitlistEntries.map(({ id }) => id)).execute();
      removedWaitlistEntryCount = waitlistEntries.length;
    }
    const endedSubscription = await transaction.updateTable("subscriptions")
      .set({ state: "CANCELLED", next_anniversary_at: null, cancellation_effective_at: now, updated_at: now })
      .where("student_user_id", "=", input.userId)
      .where("state", "in", ["ACTIVE", "CANCELLATION_SCHEDULED"])
      .returning("id")
      .executeTakeFirst();
    subscriptionEnded = Boolean(endedSubscription);
  }

  await transaction.deleteFrom("role_workspace_places").where("user_id", "=", input.userId).where("role", "=", input.role).execute();
  await transaction.deleteFrom("role_assignments").where("user_id", "=", input.userId).where("role", "=", input.role).executeTakeFirstOrThrow();
  const change = await transaction.insertInto("role_assignment_changes").values({ user_id: input.userId, role: input.role, action: "REMOVED", reason, changed_by_user_id: administrator.id, changed_at: now }).returning(["id", "changed_at"]).executeTakeFirstOrThrow();
  await recordAdministrationAudit(transaction, { administratorId: administrator.id, correlationId, operation: "role-assignment.removed", targetType: "User", targetId: input.userId, reasonCode: "ROLE_ASSIGNMENT_REMOVED" });
  await notifyRoleAssignmentChange(transaction, user, "role-assignment.removed.user", {
    role: input.role,
    reason,
    endedBookingCount,
    refundedClassCreditCount,
    subscriptionEnded,
  }, change.changed_at, change.id);
  return { __typename: "RoleAssignmentChangeSuccess" as const, user: await projectAdministrationUser(transaction, input.userId), endedBookingCount, removedWaitlistEntryCount, refundedClassCreditCount, subscriptionEnded, sponsorshipEnded: false };
}
