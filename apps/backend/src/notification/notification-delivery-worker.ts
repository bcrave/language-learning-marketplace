import { randomUUID } from "node:crypto";

import type { TaskList } from "graphile-worker";
import { sql } from "kysely";

import type { Database } from "../database/database.js";

export type EmailDelivery = {
  idempotencyKey: string;
  locale: "en" | "es";
  recipientUserId: string;
  renderedContent: string;
};

export interface EmailAdapter {
  deliver(delivery: EmailDelivery, database?: Database): Promise<{ providerMessageId: string }>;
}

export class EmailDeliveryFailure extends Error {
  constructor(
    public readonly safeCode: string,
    public readonly retryable: boolean,
  ) {
    super(safeCode);
  }
}

const RETRY_DELAYS_MILLISECONDS = [60_000, 5 * 60_000, 30 * 60_000] as const;

export function localRecordingEmailAdapter(db: Database): EmailAdapter {
  return {
    async deliver(delivery, database = db) {
      const existing = await database.selectFrom("recorded_email_deliveries")
        .select("id")
        .where("idempotency_key", "=", delivery.idempotencyKey)
        .executeTakeFirst();
      if (existing) return { providerMessageId: existing.id };
      const accepted = await database.insertInto("recorded_email_deliveries").values({
        idempotency_key: delivery.idempotencyKey,
        recipient_user_id: delivery.recipientUserId,
        locale: delivery.locale,
        rendered_content: delivery.renderedContent,
      }).returning("id").executeTakeFirstOrThrow();
      return { providerMessageId: accepted.id };
    },
  };
}

export async function compactTerminalNotifications(
  db: Database,
  now: Date,
  correlationId = `notification-maintenance-${randomUUID()}`,
) {
  const inAppCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60_000);
  const emailCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
  return db.transaction().execute(async (transaction) => {
    const inApp = await transaction.deleteFrom("in_app_notifications")
      .where("created_at", "<", inAppCutoff)
      .executeTakeFirst();
    const email = await transaction.deleteFrom("email_notification_intents")
      .where("state", "in", ["DELIVERED", "SUPPRESSED"])
      .where("completed_at", "<", emailCutoff)
      .executeTakeFirst();
    const recordedEmail = await transaction.updateTable("recorded_email_deliveries")
      .set({ rendered_content: null, content_expired_at: now })
      .where("accepted_at", "<", emailCutoff)
      .where("rendered_content", "is not", null)
      .executeTakeFirst();
    const result = {
      inAppDeleted: Number(inApp.numDeletedRows),
      emailIntentsDeleted: Number(email.numDeletedRows),
      recordedEmailContentExpired: Number(recordedEmail.numUpdatedRows),
    };
    await transaction.insertInto("audit_entries").values({
      actor_user_id: null,
      system_identity: "NOTIFICATION_MAINTENANCE_WORKER",
      acting_role: null,
      operation: "notification.terminal-records-compacted",
      target_type: "NotificationRetention",
      target_id: "notification-retention:terminal-records",
      outcome: "SUCCEEDED",
      reason_code: "TERMINAL_NOTIFICATION_RECORDS_COMPACTED",
      correlation_id: correlationId,
    }).execute();
    return result;
  });
}

export function notificationDeliveryTasks(
  db: Database,
  adapter: EmailAdapter = localRecordingEmailAdapter(db),
  options: { now?: () => Date; correlationId?: () => string } = {},
): TaskList {
  return {
    deliver_notification_intents: async () => {
      await processNotificationDeliveries(
        db,
        adapter,
        options.now?.() ?? new Date(),
        options.correlationId?.() ?? `notification-delivery-${randomUUID()}`,
      );
    },
    compact_terminal_notifications: async () => {
      await compactTerminalNotifications(
        db,
        options.now?.() ?? new Date(),
        options.correlationId?.() ?? `notification-maintenance-${randomUUID()}`,
      );
    },
  };
}

export async function processNotificationDeliveries(
  db: Database,
  adapter: EmailAdapter,
  now: Date,
  correlationId: string,
) {
  const due = await db.selectFrom("email_notification_intents")
    .select("id")
    .where("state", "=", "PENDING")
    .where("next_attempt_at", "<=", now)
    .orderBy("next_attempt_at")
    .orderBy("id")
    .execute();
  let deliveredCount = 0;

  for (const dueIntent of due) {
    const intent = await db.transaction().execute(async (transaction) => {
      const claimed = await transaction.selectFrom("email_notification_intents")
        .selectAll()
        .where("id", "=", dueIntent.id)
        .where("state", "=", "PENDING")
        .where("next_attempt_at", "<=", now)
        .forUpdate()
        .skipLocked()
        .executeTakeFirst();
      if (!claimed) return undefined;
      await transaction.updateTable("email_notification_intents").set({
        attempt_count: claimed.attempt_count + 1,
        next_attempt_at: new Date(now.getTime() + 24 * 60 * 60_000),
      }).where("id", "=", claimed.id).execute();
      return { ...claimed, attempt_count: claimed.attempt_count + 1 };
    });
    if (!intent) continue;
    const sourceReference = intent.source_reference;
    const priorReceipt = await db.selectFrom("delivery_receipts")
      .select(["outcome", "provider_message_id"])
      .where("source_reference", "=", sourceReference)
      .where("recipient_user_id", "=", intent.recipient_user_id)
      .where("channel", "=", "EMAIL")
      .executeTakeFirst();
    if (priorReceipt) {
      await db.transaction().execute(async (transaction) => {
        await transaction.updateTable("email_notification_intents").set({
          state: priorReceipt.outcome === "SUPPRESSED" ? "SUPPRESSED" : "DELIVERED",
          completed_at: now,
          provider_message_id: priorReceipt.provider_message_id,
        }).where("id", "=", intent.id).where("state", "=", "PENDING").execute();
        await transaction.insertInto("audit_entries").values({
          actor_user_id: null,
          system_identity: "NOTIFICATION_DELIVERY_WORKER",
          acting_role: null,
          operation: "notification.delivery-processed",
          target_type: "NotificationIntent",
          target_id: intent.id,
          outcome: "SUCCEEDED",
          reason_code: "TERMINAL_DELIVERY_RECEIPT_REUSED",
          correlation_id: correlationId,
        }).execute();
      });
      continue;
    }

    const attemptNumber = intent.attempt_count;
    let delivered = false;
    try {
      delivered = await db.transaction().execute(async (transaction) => {
        await sql`select pg_advisory_xact_lock(hashtextextended(${intent.recipient_user_id}, 28))`.execute(transaction);
        const [pendingIntent, recipient] = await Promise.all([
          transaction.selectFrom("email_notification_intents").select("id").where("id", "=", intent.id).where("state", "=", "PENDING").executeTakeFirst(),
          transaction.selectFrom("users").select("access_status").where("id", "=", intent.recipient_user_id).executeTakeFirst(),
        ]);
        if (!pendingIntent) return false;
        if (!recipient || recipient.access_status === "ANONYMIZATION_PENDING" || recipient.access_status === "ANONYMIZED" || recipient.access_status === "FIXTURE_REMOVED") {
          await transaction.deleteFrom("email_notification_intents").where("id", "=", intent.id).execute();
          await transaction.insertInto("delivery_receipts").values({ source_reference: sourceReference, recipient_user_id: intent.recipient_user_id, channel: "EMAIL", outcome: "SUPPRESSED", completed_at: now, provider_message_id: null }).onConflict((conflict) => conflict.columns(["source_reference", "recipient_user_id", "channel"]).doNothing()).execute();
          // A Fixture-Removed User is not an anonymized one: CONTEXT.md keeps the two
          // apart, and the suppression reason has to say which one actually happened.
          const suppressionReason = recipient?.access_status === "FIXTURE_REMOVED"
            ? "FIXTURE_REMOVAL_SUPPRESSED"
            : "USER_ANONYMIZATION_SUPPRESSED";
          await transaction.insertInto("audit_entries").values({ actor_user_id: null, system_identity: "NOTIFICATION_DELIVERY_WORKER", acting_role: null, operation: "notification.delivery-processed", target_type: "NotificationIntent", target_id: intent.id, outcome: "SUCCEEDED", reason_code: suppressionReason, correlation_id: correlationId }).execute();
          return false;
        }
        const result = await adapter.deliver({
          idempotencyKey: `${sourceReference}:${intent.recipient_user_id}:EMAIL`,
          locale: intent.locale,
          recipientUserId: intent.recipient_user_id,
          renderedContent: intent.rendered_content,
        }, transaction as Database);
        await transaction.insertInto("notification_delivery_attempts").values({ notification_intent_id: intent.id, attempt_number: attemptNumber, outcome: "DELIVERED", safe_failure_code: null, attempted_at: now }).execute();
        await transaction.insertInto("delivery_receipts").values({ source_reference: sourceReference, recipient_user_id: intent.recipient_user_id, channel: "EMAIL", outcome: "DELIVERED", completed_at: now, provider_message_id: result.providerMessageId }).execute();
        await transaction.updateTable("email_notification_intents").set({ state: "DELIVERED", completed_at: now, provider_message_id: result.providerMessageId }).where("id", "=", intent.id).execute();
        await transaction.insertInto("audit_entries").values({ actor_user_id: null, system_identity: "NOTIFICATION_DELIVERY_WORKER", acting_role: null, operation: "notification.delivery-processed", target_type: "NotificationIntent", target_id: intent.id, outcome: "SUCCEEDED", reason_code: "NOTIFICATION_DELIVERED", correlation_id: correlationId }).execute();
        return true;
      });
    } catch (error) {
      const failure = error instanceof EmailDeliveryFailure
        ? error
        : new EmailDeliveryFailure("EMAIL_ADAPTER_FAILURE", false);
      const exhausted = !failure.retryable || attemptNumber >= 4;
      await db.transaction().execute(async (transaction) => {
        await sql`select pg_advisory_xact_lock(hashtextextended(${intent.recipient_user_id}, 28))`.execute(transaction);
        const pendingIntent = await transaction.selectFrom("email_notification_intents").select("id").where("id", "=", intent.id).where("state", "=", "PENDING").executeTakeFirst();
        if (!pendingIntent) return;
        await transaction.insertInto("notification_delivery_attempts").values({
          notification_intent_id: intent.id,
          attempt_number: attemptNumber,
          outcome: exhausted ? "PERMANENT_FAILURE" : "RETRYABLE_FAILURE",
          safe_failure_code: failure.safeCode,
          attempted_at: now,
        }).execute();
        await transaction.updateTable("email_notification_intents").set(exhausted ? {
          state: "EXHAUSTED",
          completed_at: now,
        } : {
          next_attempt_at: new Date(now.getTime() + RETRY_DELAYS_MILLISECONDS[attemptNumber - 1]!),
        }).where("id", "=", intent.id).execute();
        if (exhausted) {
          await transaction.insertInto("administrator_task_items").values({
            kind: "NOTIFICATION_DELIVERY_RECONCILIATION",
            correlation_reference: correlationId,
            safe_context: JSON.stringify({ channel: "EMAIL", messageId: intent.message_id, recipientReference: intent.recipient_user_id }),
            source_reference: sourceReference,
            recipient_reference: intent.recipient_user_id,
          }).onConflict((conflict) => conflict.columns(["source_reference", "recipient_reference"]).doNothing()).execute();
        }
        await transaction.insertInto("audit_entries").values({
          actor_user_id: null,
          system_identity: "NOTIFICATION_DELIVERY_WORKER",
          acting_role: null,
          operation: "notification.delivery-processed",
          target_type: "NotificationIntent",
          target_id: intent.id,
          outcome: "FAILED",
          reason_code: exhausted ? "NOTIFICATION_DELIVERY_EXHAUSTED" : "NOTIFICATION_DELIVERY_RETRYING",
          correlation_id: correlationId,
        }).execute();
      });
      continue;
    }
    if (delivered) deliveredCount += 1;
  }
  return deliveredCount;
}
