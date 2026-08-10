import { interfaceMessages, type UserIdentity } from "@marketplace/core";
import IntlMessageFormat from "intl-messageformat";

import type { Database } from "../database/database.js";

function renderVariables(variables: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(variables).map(([key, value]) => [
    key,
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) ? new Date(value) : value,
  ]));
}

export async function userForNotificationAccess(db: Database, identity: UserIdentity) {
  return db.selectFrom("users")
    .select(["id", "interface_locale", "display_time_zone"])
    .where("identity_issuer", "=", identity.issuer)
    .where("identity_subject", "=", identity.subject)
    .executeTakeFirst();
}

export async function notificationsForUser(db: Database, user: { id: string; interface_locale: "en" | "es" | null; display_time_zone: string | null }) {
  const locale = user.interface_locale ?? "en";
  const timeZone = user.display_time_zone ?? "UTC";
  const notifications = await db.selectFrom("in_app_notifications")
    .selectAll()
    .where("recipient_user_id", "=", user.id)
    .where("archived_at", "is", null)
    .orderBy("created_at", "desc")
    .limit(100)
    .execute();
  return notifications.map((notification) => {
    const message = (interfaceMessages[locale] as Record<string, string>)[notification.message_id];
    return {
      id: notification.id,
      messageId: notification.message_id,
      renderedContent: message
        ? String(new IntlMessageFormat(message, locale, {
          date: { long: { ...IntlMessageFormat.formats.date.long, timeZone } },
          time: { short: { ...IntlMessageFormat.formats.time.short, timeZone } },
        }).format(renderVariables(notification.variables)))
        : notification.message_id,
      readAt: notification.read_at?.toISOString() ?? null,
      archivedAt: notification.archived_at?.toISOString() ?? null,
      createdAt: notification.created_at.toISOString(),
    };
  });
}

export async function updateNotificationState(
  db: Database,
  input: { notificationId: string; userId: string; action: "READ" | "ARCHIVE"; correlationId: string; now: Date },
) {
  return db.transaction().execute(async (transaction) => {
    const updated = await transaction.updateTable("in_app_notifications")
      .set(input.action === "READ" ? { read_at: input.now } : { archived_at: input.now })
      .where("id", "=", input.notificationId)
      .where("recipient_user_id", "=", input.userId)
      .returningAll()
      .executeTakeFirst();
    await transaction.insertInto("audit_entries").values({
      actor_user_id: input.userId,
      acting_role: null,
      operation: input.action === "READ" ? "notification.mark-read" : "notification.archive",
      target_type: "Notification",
      target_id: input.notificationId,
      outcome: updated ? "SUCCEEDED" : "DENIED",
      reason_code: updated
        ? input.action === "READ" ? "NOTIFICATION_MARKED_READ" : "NOTIFICATION_ARCHIVED"
        : "NOTIFICATION_NOT_OWNED",
      correlation_id: input.correlationId,
    }).execute();
    return updated;
  });
}

export async function openAdministratorTasks(db: Database) {
  return db.selectFrom("administrator_task_items")
    .selectAll()
    .where("state", "=", "OPEN")
    .orderBy("created_at")
    .execute();
}

export async function resolveAdministratorTask(db: Database, administratorId: string, taskId: string, reason: string, correlationId: string, now: Date) {
    const task = await db.updateTable("administrator_task_items")
      .set({ state: "RESOLVED", resolved_at: now, resolution_reason: reason })
      .where("id", "=", taskId)
      .where("state", "=", "OPEN")
      .returningAll()
      .executeTakeFirst();
    if (task) {
      await db.updateTable("email_notification_intents").set({ state: "SUPPRESSED", completed_at: now })
        .where("source_reference", "=", task.source_reference)
        .where("recipient_user_id", "=", task.recipient_reference)
        .where("state", "=", "EXHAUSTED")
        .execute();
      await db.insertInto("delivery_receipts").values({
        source_reference: task.source_reference,
        recipient_user_id: task.recipient_reference,
        channel: "EMAIL",
        outcome: "SUPPRESSED",
        completed_at: now,
        provider_message_id: null,
      }).onConflict((conflict) => conflict.columns(["source_reference", "recipient_user_id", "channel"]).doNothing()).execute();
    }
    await db.insertInto("audit_entries").values({
      actor_user_id: administratorId,
      acting_role: "PLATFORM_ADMINISTRATOR",
      operation: "administrator-task.resolve",
      target_type: "AdministratorTaskItem",
      target_id: taskId,
      outcome: task ? "SUCCEEDED" : "DENIED",
      reason_code: task ? "ADMINISTRATOR_TASK_RESOLVED" : "ADMINISTRATOR_TASK_NOT_OPEN",
      correlation_id: correlationId,
    }).execute();
    return task;
}
