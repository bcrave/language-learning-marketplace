import { interfaceMessages } from "@marketplace/core";
import IntlMessageFormat from "intl-messageformat";

import type { Database } from "../database/database.js";

export async function deliverDueClassSessionReminders(
  db: Database,
  now: Date,
  correlationId: string,
) {
  return db.transaction().execute(async (transaction) => {
    const reminders = await transaction.selectFrom("class_session_reminders")
      .selectAll()
      .where("terminal_outcome", "is", null)
      .where("due_at", "<=", now)
      .orderBy("due_at")
      .orderBy("id")
      .forUpdate()
      .skipLocked()
      .execute();

    for (const reminder of reminders) {
      const commitment = await transaction.selectFrom("schedule_commitments")
        .innerJoin("class_sessions", "class_sessions.id", "schedule_commitments.class_session_id")
        .select(["class_sessions.starts_at", "class_sessions.state"])
        .where("schedule_commitments.class_session_id", "=", reminder.class_session_id)
        .where("schedule_commitments.user_id", "=", reminder.recipient_user_id)
        .where("schedule_commitments.commitment_role", "=", reminder.commitment_role)
        .where("schedule_commitments.active", "=", true)
        .executeTakeFirst();

      if (!commitment || commitment.state !== "PUBLISHED") {
        await transaction.updateTable("class_session_reminders").set({ terminal_outcome: "SUPPRESSED", completed_at: now }).where("id", "=", reminder.id).execute();
        await recordReminderAudit(transaction as Database, reminder.class_session_id, correlationId, "CLASS_SESSION_REMINDER_SUPPRESSED");
        continue;
      }

      const recipient = await transaction.selectFrom("users").select(["interface_locale", "display_time_zone"]).where("id", "=", reminder.recipient_user_id).executeTakeFirstOrThrow();
      const locale = recipient.interface_locale ?? "en";
      const timeZone = recipient.display_time_zone ?? "UTC";
      const messageId = "class-session.reminder.teacher" as const;
      const variables = { classSessionId: reminder.class_session_id, startsAt: commitment.starts_at.toISOString(), timeZone };
      const renderedContent = String(new IntlMessageFormat(interfaceMessages[locale][messageId], locale, {
        date: { long: { ...IntlMessageFormat.formats.date.long, timeZone } },
        time: { short: { ...IntlMessageFormat.formats.time.short, timeZone } },
      }).format({ ...variables, startsAt: commitment.starts_at }));
      await transaction.insertInto("in_app_notifications").values({ recipient_user_id: reminder.recipient_user_id, message_id: messageId, variables: JSON.stringify(variables) }).execute();
      await transaction.insertInto("email_notification_intents").values({ recipient_user_id: reminder.recipient_user_id, message_id: messageId, locale, variables: JSON.stringify(variables), rendered_content: renderedContent }).execute();
      await transaction.updateTable("class_session_reminders").set({ terminal_outcome: "DELIVERED", completed_at: now }).where("id", "=", reminder.id).execute();
      await recordReminderAudit(transaction as Database, reminder.class_session_id, correlationId, "CLASS_SESSION_REMINDER_DELIVERED");
    }

    return reminders.length;
  });
}

async function recordReminderAudit(
  db: Database,
  classSessionId: string,
  correlationId: string,
  reasonCode: "CLASS_SESSION_REMINDER_DELIVERED" | "CLASS_SESSION_REMINDER_SUPPRESSED",
) {
  await db.insertInto("audit_entries").values({
    actor_user_id: null,
    acting_role: null,
    operation: "class-session.reminder-processed",
    target_type: "ClassSession",
    target_id: classSessionId,
    outcome: "SUCCEEDED",
    reason_code: reasonCode,
    correlation_id: correlationId,
  }).execute();
}
