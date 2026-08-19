import { interfaceMessages } from "@marketplace/core";
import IntlMessageFormat from "intl-messageformat";
import { sql } from "kysely";
import { z } from "zod";

import type { Administrator } from "../authorization/administrator-policy.js";
import type { Database } from "../database/database.js";
import { classCreditsForStudent } from "../class-credit/class-credit-service.js";
import { monthlySubscriptionAnniversary } from "./subscription-time.js";

type Student = { id: string };
type ProviderEventInput = {
  effectiveAt: string;
  eventType: "ACTIVATED" | "RENEWED" | "CANCELLED" | "REACTIVATED";
  providerEventId: string;
  reason: string;
  studentUserId: string;
};
type LockedSubscription = {
  id: string;
  state: "ACTIVE" | "CANCELLATION_SCHEDULED" | "CANCELLED";
  activated_at: Date;
  renewal_count: number;
  next_anniversary_at: Date | null;
  cancellation_effective_at: Date | null;
};

const providerEventSchema = z.object({
  effectiveAt: z.string().refine((value) => {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
  }),
  eventType: z.enum(["ACTIVATED", "RENEWED", "CANCELLED", "REACTIVATED"]),
  providerEventId: z.string().min(1).max(200),
  reason: z.string().trim().min(3).max(200),
  studentUserId: z.uuid(),
});

type SubscriptionConflictCode =
  | "INVALID_PROVIDER_EVENT"
  | "STUDENT_NOT_FOUND"
  | "SUBSCRIPTION_ALREADY_EXISTS"
  | "SUBSCRIPTION_NOT_FOUND"
  | "SUBSCRIPTION_NOT_ACTIVE"
  | "SUBSCRIPTION_CANCELLATION_NOT_SCHEDULED"
  | "SUBSCRIPTION_CANCELLATION_EFFECTIVE"
  | "SUBSCRIPTION_PERIOD_ALREADY_GRANTED"
  | "UNEXPECTED_SUBSCRIPTION_ANNIVERSARY"
  | "PROVIDER_EVENT_ID_REUSED";

function conflict(code: SubscriptionConflictCode, message: string) {
  return { __typename: "SubscriptionConflict" as const, code, message };
}

async function projectSubscription(db: Database, studentUserId: string) {
  const subscription = await db.selectFrom("subscriptions")
    .selectAll()
    .where("student_user_id", "=", studentUserId)
    .executeTakeFirst();
  if (!subscription) return null;
  return {
    id: subscription.id,
    studentUserId: subscription.student_user_id,
    state: subscription.state,
    anchorDay: subscription.anchor_day,
    accountingTimeUtc: utcAccountingTime(subscription.activated_at),
    activatedAt: subscription.activated_at.toISOString(),
    nextAnniversaryAt: subscription.next_anniversary_at?.toISOString() ?? null,
    cancellationEffectiveAt: subscription.cancellation_effective_at?.toISOString() ?? null,
  };
}

function utcAccountingTime(value: Date) {
  return [value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export async function subscriptionForStudent(db: Database, studentUserId: string) {
  return projectSubscription(db, studentUserId);
}

export async function processSubscriptionProviderEvent(
  transaction: Database,
  administrator: Administrator,
  input: ProviderEventInput,
  correlationId: string,
) {
  if (input.providerEventId.length < 1 || input.providerEventId.length > 200) {
    await recordProviderAudit(transaction, administrator.id, input.studentUserId, correlationId, "DENIED", "INVALID_PROVIDER_EVENT");
    return conflict("INVALID_PROVIDER_EVENT", "Provide a valid provider event identifier.");
  }
  const fingerprint = JSON.stringify({
    effectiveAt: input.effectiveAt,
    eventType: input.eventType,
    providerEventId: input.providerEventId,
    reason: input.reason,
    studentUserId: input.studentUserId,
  });
  await sql`select pg_advisory_xact_lock(hashtextextended(${`subscription-provider:${input.providerEventId}`}, 0))`.execute(transaction);
  await sql`select pg_advisory_xact_lock(hashtextextended(${input.studentUserId}, 28))`.execute(transaction);
  const existingEvent = await transaction.selectFrom("subscription_provider_events")
    .select(["input_fingerprint", "outcome"])
    .where("provider_event_id", "=", input.providerEventId)
    .executeTakeFirst();
  if (existingEvent) {
    if (existingEvent.input_fingerprint !== fingerprint) {
      await recordProviderAudit(transaction, administrator.id, input.studentUserId, correlationId, "DENIED", "PROVIDER_EVENT_ID_REUSED_WITH_DIFFERENT_INPUT");
      return conflict("PROVIDER_EVENT_ID_REUSED", "The provider event identifier was already used with different input.");
    }
    const replaySucceeded = typeof existingEvent.outcome === "object"
      && existingEvent.outcome !== null
      && "__typename" in existingEvent.outcome
      && existingEvent.outcome.__typename === "ProcessSubscriptionProviderEventSuccess";
    await recordProviderAudit(transaction, administrator.id, input.studentUserId, correlationId, replaySucceeded ? "SUCCEEDED" : "DENIED", replaySucceeded ? "SUBSCRIPTION_PROVIDER_EVENT_REPLAYED" : "SUBSCRIPTION_PROVIDER_EVENT_DENIED_REPLAYED");
    return existingEvent.outcome;
  }

  const validated = providerEventSchema.safeParse(input);
  if (!validated.success) {
    await recordProviderAudit(transaction, administrator.id, input.studentUserId, correlationId, "DENIED", "INVALID_PROVIDER_EVENT");
    return conflict("INVALID_PROVIDER_EVENT", "Provide a canonical UTC instant and a concise reason.");
  }
  const effectiveAt = new Date(validated.data.effectiveAt);
  const student = await transaction.selectFrom("users")
    .innerJoin("role_assignments", "role_assignments.user_id", "users.id")
    .select(["users.id", "users.interface_locale", "users.access_status"])
    .where("users.id", "=", input.studentUserId)
    .where("role_assignments.role", "=", "STUDENT")
    .executeTakeFirst();
  if (!student) {
    await recordProviderAudit(transaction, administrator.id, input.studentUserId, correlationId, "DENIED", "STUDENT_NOT_FOUND");
    return conflict("STUDENT_NOT_FOUND", "Choose a User with a Student Role Assignment.");
  }

  const subscription = await transaction.selectFrom("subscriptions")
    .selectAll()
    .where("student_user_id", "=", input.studentUserId)
    .forUpdate()
    .executeTakeFirst();
  let outcome;
  if (input.eventType === "ACTIVATED") {
    outcome = subscription
      ? conflict("SUBSCRIPTION_ALREADY_EXISTS", "The Student already has a Subscription.")
      : student.access_status === "SUSPENDED"
        ? await activateSuspendedSubscription(transaction, student.id, effectiveAt)
        : await activateSubscription(transaction, student, input, effectiveAt);
    if (!subscription && student.access_status === "SUSPENDED" && outcome.__typename === "ProcessSubscriptionProviderEventSuccess") {
      await recordProviderAudit(transaction, administrator.id, input.studentUserId, correlationId, "SUCCEEDED", "SUBSCRIPTION_GRANT_SKIPPED_USER_SUSPENDED");
    }
  } else if (!subscription) {
    outcome = conflict("SUBSCRIPTION_NOT_FOUND", "The Student does not have a Subscription.");
  } else if (input.eventType === "RENEWED") {
    if (student.access_status === "SUSPENDED") {
      outcome = await skipSuspendedRenewal(transaction, student.id, subscription, effectiveAt);
      if (outcome.__typename === "ProcessSubscriptionProviderEventSuccess") {
        await recordProviderAudit(transaction, administrator.id, input.studentUserId, correlationId, "SUCCEEDED", "SUBSCRIPTION_GRANT_SKIPPED_USER_SUSPENDED");
      }
    } else {
      outcome = await renewSubscription(transaction, student, subscription, effectiveAt, input.providerEventId);
    }
  } else if (input.eventType === "REACTIVATED") {
    outcome = await reactivateSubscription(transaction, student, subscription, effectiveAt, input.providerEventId);
  } else {
    outcome = await cancelSubscription(transaction, input.studentUserId, subscription, effectiveAt);
  }
  return rememberProviderOutcome(transaction, input, fingerprint, effectiveAt, administrator.id, correlationId, outcome);
}

async function activateSuspendedSubscription(transaction: Database, studentUserId: string, effectiveAt: Date) {
  await transaction.insertInto("class_credit_accounts").values({ student_user_id: studentUserId })
    .onConflict((builder) => builder.column("student_user_id").doNothing()).execute();
  await transaction.insertInto("subscriptions").values({
    student_user_id: studentUserId,
    state: "ACTIVE",
    activated_at: effectiveAt,
    anchor_day: effectiveAt.getUTCDate(),
    accounting_time_utc: utcAccountingTime(effectiveAt),
    next_anniversary_at: monthlySubscriptionAnniversary(effectiveAt, 1),
    cancellation_effective_at: null,
  }).executeTakeFirstOrThrow();
  return providerSuccess(transaction, studentUserId);
}

async function skipSuspendedRenewal(
  transaction: Database,
  studentUserId: string,
  subscription: LockedSubscription,
  effectiveAt: Date,
) {
  if (subscription.state !== "ACTIVE") return conflict("SUBSCRIPTION_NOT_ACTIVE", "The Subscription is not active for renewal.");
  if (!subscription.next_anniversary_at || subscription.next_anniversary_at.getTime() !== effectiveAt.getTime()) {
    return conflict("UNEXPECTED_SUBSCRIPTION_ANNIVERSARY", "The renewal does not match the original Subscription anniversary.");
  }
  const renewalCount = subscription.renewal_count + 1;
  const nextAnniversaryAt = monthlySubscriptionAnniversary(subscription.activated_at, renewalCount + 1);
  await transaction.updateTable("subscriptions")
    .set({ renewal_count: renewalCount, next_anniversary_at: nextAnniversaryAt, updated_at: new Date() })
    .where("id", "=", subscription.id)
    .executeTakeFirstOrThrow();
  return providerSuccess(transaction, studentUserId);
}

async function activateSubscription(
  transaction: Database,
  student: { id: string; interface_locale: "en" | "es" | null },
  input: ProviderEventInput,
  effectiveAt: Date,
) {
  await transaction.insertInto("class_credit_accounts").values({ student_user_id: student.id })
    .onConflict((builder) => builder.column("student_user_id").doNothing()).execute();
  const account = await transaction.selectFrom("class_credit_accounts").select("available_balance")
    .where("student_user_id", "=", student.id).forUpdate().executeTakeFirstOrThrow();
  const nextAnniversaryAt = monthlySubscriptionAnniversary(effectiveAt, 1);
  const inserted = await transaction.insertInto("subscriptions").values({
    student_user_id: student.id,
    state: "ACTIVE",
    activated_at: effectiveAt,
    anchor_day: effectiveAt.getUTCDate(),
    accounting_time_utc: utcAccountingTime(effectiveAt),
    next_anniversary_at: nextAnniversaryAt,
    cancellation_effective_at: null,
  }).returning("id").executeTakeFirstOrThrow();
  const availableBalance = account.available_balance + 8;
  await transaction.insertInto("class_credit_ledger_entries").values({
    student_user_id: student.id,
    amount: 8,
    source: "SUBSCRIPTION_GRANT",
    source_reference: subscriptionPeriodReference(inserted.id, effectiveAt),
    reason: null,
  }).execute();
  await transaction.updateTable("class_credit_accounts").set({ available_balance: availableBalance, updated_at: new Date() })
    .where("student_user_id", "=", student.id).executeTakeFirstOrThrow();
  await notifyStudent(transaction, student, "subscription.activated.student", { amount: 8, availableBalance, nextAnniversaryAt: nextAnniversaryAt.getTime() }, `subscription-provider:${input.providerEventId}`);
  return providerSuccess(transaction, student.id);
}

async function renewSubscription(
  transaction: Database,
  student: { id: string; interface_locale: "en" | "es" | null },
  subscription: LockedSubscription,
  effectiveAt: Date,
  providerEventId: string,
) {
  const reference = subscriptionPeriodReference(subscription.id, effectiveAt);
  const priorGrant = await transaction.selectFrom("class_credit_ledger_entries").select("id")
    .where("source", "=", "SUBSCRIPTION_GRANT").where("source_reference", "=", reference).executeTakeFirst();
  if (priorGrant) return conflict("SUBSCRIPTION_PERIOD_ALREADY_GRANTED", "This Subscription period was already granted.");
  if (subscription.state !== "ACTIVE") return conflict("SUBSCRIPTION_NOT_ACTIVE", "The Subscription is not active for renewal.");
  if (!subscription.next_anniversary_at || subscription.next_anniversary_at.getTime() !== effectiveAt.getTime()) {
    return conflict("UNEXPECTED_SUBSCRIPTION_ANNIVERSARY", "The renewal does not match the original Subscription anniversary.");
  }
  const account = await transaction.selectFrom("class_credit_accounts").select("available_balance")
    .where("student_user_id", "=", student.id).forUpdate().executeTakeFirstOrThrow();
  const renewalCount = subscription.renewal_count + 1;
  const nextAnniversaryAt = monthlySubscriptionAnniversary(subscription.activated_at, renewalCount + 1);
  const availableBalance = account.available_balance + 8;
  await transaction.insertInto("class_credit_ledger_entries").values({ student_user_id: student.id, amount: 8, source: "SUBSCRIPTION_GRANT", source_reference: reference, reason: null }).execute();
  await transaction.updateTable("class_credit_accounts").set({ available_balance: availableBalance, updated_at: new Date() }).where("student_user_id", "=", student.id).executeTakeFirstOrThrow();
  await transaction.updateTable("subscriptions").set({ renewal_count: renewalCount, next_anniversary_at: nextAnniversaryAt, updated_at: new Date() }).where("id", "=", subscription.id).executeTakeFirstOrThrow();
  await notifyStudent(transaction, student, "subscription.renewed.student", { amount: 8, availableBalance, nextAnniversaryAt: nextAnniversaryAt.getTime() }, `subscription-provider:${providerEventId}`);
  return providerSuccess(transaction, student.id);
}

async function reactivateSubscription(
  transaction: Database,
  student: { id: string; interface_locale: "en" | "es" | null },
  subscription: LockedSubscription,
  effectiveAt: Date,
  providerEventId: string,
) {
  if (subscription.state !== "CANCELLATION_SCHEDULED" || !subscription.next_anniversary_at || !subscription.cancellation_effective_at) {
    return conflict("SUBSCRIPTION_CANCELLATION_NOT_SCHEDULED", "Subscription cancellation is not scheduled.");
  }
  if (effectiveAt.getTime() >= subscription.cancellation_effective_at.getTime()) {
    return conflict("SUBSCRIPTION_CANCELLATION_EFFECTIVE", "Subscription cancellation can only be undone before its effective anniversary.");
  }
  await transaction.updateTable("subscriptions").set({ state: "ACTIVE", cancellation_effective_at: null, updated_at: new Date() }).where("id", "=", subscription.id).executeTakeFirstOrThrow();
  await notifyStudent(transaction, student, "subscription.cancellation-undone.student", { nextAnniversaryAt: subscription.next_anniversary_at.getTime() }, `subscription-provider:${providerEventId}`);
  return providerSuccess(transaction, student.id);
}

async function cancelSubscription(
  transaction: Database,
  studentUserId: string,
  subscription: LockedSubscription,
  effectiveAt: Date,
) {
  if (subscription.state !== "CANCELLATION_SCHEDULED" || !subscription.cancellation_effective_at) {
    return conflict("SUBSCRIPTION_CANCELLATION_NOT_SCHEDULED", "Subscription cancellation is not scheduled.");
  }
  if (subscription.cancellation_effective_at.getTime() !== effectiveAt.getTime()) {
    return conflict("UNEXPECTED_SUBSCRIPTION_ANNIVERSARY", "Cancellation must become effective on the scheduled anniversary.");
  }
  await transaction.updateTable("subscriptions").set({ state: "CANCELLED", next_anniversary_at: null, updated_at: new Date() }).where("id", "=", subscription.id).executeTakeFirstOrThrow();
  return providerSuccess(transaction, studentUserId);
}

async function providerSuccess(transaction: Database, studentUserId: string) {
  return {
    __typename: "ProcessSubscriptionProviderEventSuccess" as const,
    subscription: await projectSubscription(transaction, studentUserId),
    account: await classCreditsForStudent(transaction, studentUserId),
  };
}

async function rememberProviderOutcome(
  transaction: Database,
  input: ProviderEventInput,
  fingerprint: string,
  effectiveAt: Date,
  administratorId: string,
  correlationId: string,
  outcome: Record<string, unknown>,
) {
  await transaction.insertInto("subscription_provider_events").values({
    provider_event_id: input.providerEventId,
    student_user_id: input.studentUserId,
    event_type: input.eventType,
    effective_at: effectiveAt,
    reason: input.reason,
    input_fingerprint: fingerprint,
    outcome: JSON.stringify(outcome),
  }).execute();
  const succeeded = outcome.__typename === "ProcessSubscriptionProviderEventSuccess";
  await recordProviderAudit(transaction, administratorId, input.studentUserId, correlationId, succeeded ? "SUCCEEDED" : "DENIED", succeeded ? `SUBSCRIPTION_${input.eventType}` : String((outcome as { code?: string }).code ?? "PROVIDER_EVENT_DENIED"));
  return outcome;
}

async function recordProviderAudit(db: Database, administratorId: string, studentUserId: string, correlationId: string, outcome: "SUCCEEDED" | "DENIED", reasonCode: string) {
  const targetId = z.uuid().safeParse(studentUserId).success ? studentUserId : administratorId;
  await db.insertInto("audit_entries").values({ actor_user_id: administratorId, acting_role: "PLATFORM_ADMINISTRATOR", operation: "subscription.provider-event.processed", target_type: "Subscription", target_id: targetId, outcome, reason_code: reasonCode, correlation_id: correlationId }).execute();
}

export async function scheduleSubscriptionCancellation(db: Database, student: Student, correlationId: string) {
  return changeCancellation(db, student, correlationId, "schedule");
}

export async function undoSubscriptionCancellation(db: Database, student: Student, correlationId: string) {
  return changeCancellation(db, student, correlationId, "undo");
}

async function changeCancellation(db: Database, student: Student, correlationId: string, change: "schedule" | "undo") {
    const subscription = await db.selectFrom("subscriptions").selectAll().where("student_user_id", "=", student.id).forUpdate().executeTakeFirst();
    const operation = change === "schedule" ? "subscription.cancellation-scheduled" : "subscription.cancellation-undone";
    const expectedState = change === "schedule" ? "ACTIVE" : "CANCELLATION_SCHEDULED";
    if (!subscription) return auditedStudentConflict(db, student.id, correlationId, operation, "SUBSCRIPTION_NOT_FOUND", "The Student does not have a Subscription.");
    if (subscription.state !== expectedState) return auditedStudentConflict(db, student.id, correlationId, operation, "SUBSCRIPTION_NOT_ACTIVE", "The Subscription is not in the required state.");
    if (change === "undo" && subscription.cancellation_effective_at) {
      const databaseTime = await sql<{ current_time: Date }>`select now() as current_time`.execute(db);
      if (databaseTime.rows[0]!.current_time.getTime() >= subscription.cancellation_effective_at.getTime()) {
        return auditedStudentConflict(db, student.id, correlationId, operation, "SUBSCRIPTION_CANCELLATION_EFFECTIVE", "Subscription cancellation can only be undone before its effective anniversary.");
      }
    }
    await db.updateTable("subscriptions").set(change === "schedule" ? {
      state: "CANCELLATION_SCHEDULED",
      cancellation_effective_at: subscription.next_anniversary_at,
      updated_at: new Date(),
    } : {
      state: "ACTIVE",
      cancellation_effective_at: null,
      updated_at: new Date(),
    }).where("id", "=", subscription.id).executeTakeFirstOrThrow();
    const projected = await projectSubscription(db, student.id);
    const user = await db.selectFrom("users").select(["id", "interface_locale"]).where("id", "=", student.id).executeTakeFirstOrThrow();
    await notifyStudent(db, user, change === "schedule" ? "subscription.cancellation-scheduled.student" : "subscription.cancellation-undone.student", change === "schedule"
      ? { cancellationEffectiveAt: Date.parse(projected!.cancellationEffectiveAt!) }
      : { nextAnniversaryAt: Date.parse(projected!.nextAnniversaryAt!) }, `subscription-command:${operation}:${correlationId}`);
    await db.insertInto("audit_entries").values({ actor_user_id: student.id, acting_role: "STUDENT", operation, target_type: "Subscription", target_id: subscription.id, outcome: "SUCCEEDED", reason_code: change === "schedule" ? "SUBSCRIPTION_CANCELLATION_SCHEDULED" : "SUBSCRIPTION_CANCELLATION_UNDONE", correlation_id: correlationId }).execute();
    return { __typename: change === "schedule" ? "ScheduleSubscriptionCancellationSuccess" as const : "UndoSubscriptionCancellationSuccess" as const, subscription: projected };
}

async function auditedStudentConflict(db: Database, studentId: string, correlationId: string, operation: string, code: SubscriptionConflictCode, message: string) {
  await db.insertInto("audit_entries").values({ actor_user_id: studentId, acting_role: "STUDENT", operation, target_type: "Subscription", target_id: studentId, outcome: "DENIED", reason_code: code, correlation_id: correlationId }).execute();
  return conflict(code, message);
}

async function notifyStudent(
  db: Database,
  student: { id: string; interface_locale: "en" | "es" | null },
  messageId: "subscription.activated.student" | "subscription.renewed.student" | "subscription.cancellation-scheduled.student" | "subscription.cancellation-undone.student",
  variables: Record<string, unknown>,
  sourceReference: string,
) {
  const locale = student.interface_locale ?? "en";
  const renderedContent = String(new IntlMessageFormat(interfaceMessages[locale][messageId], locale).format(variables));
  await db.insertInto("in_app_notifications").values({ recipient_user_id: student.id, message_id: messageId, variables: JSON.stringify(variables), source_reference: sourceReference }).execute();
  await db.insertInto("email_notification_intents").values({ recipient_user_id: student.id, message_id: messageId, locale, variables: JSON.stringify(variables), rendered_content: renderedContent, source_reference: sourceReference }).execute();
}

function subscriptionPeriodReference(subscriptionId: string, effectiveAt: Date) {
  return `subscription:${subscriptionId}:${effectiveAt.toISOString()}`;
}
