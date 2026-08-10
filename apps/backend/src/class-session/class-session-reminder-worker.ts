import { randomUUID } from "node:crypto";

import { Temporal } from "@js-temporal/polyfill";
import type { TaskList } from "graphile-worker";

import type { Database } from "../database/database.js";
import { notifyClassSessionUser } from "./class-session-notifications.js";

export function classSessionReminderTasks(
  db: Database,
  options: { now?: () => Date; correlationId?: () => string } = {},
): TaskList {
  return {
    deliver_class_session_reminders: async () => {
      await deliverDueClassSessionReminders(
        db,
        options.now?.() ?? new Date(),
        options.correlationId?.() ?? `class-session-reminder-${randomUUID()}`,
      );
    },
  };
}

export async function deliverDueClassSessionReminders(
  db: Database,
  now: Date,
  correlationId: string,
) {
  const dueReminders = await db.selectFrom("class_session_reminders")
    .select(["id", "class_session_id"])
    .where("terminal_outcome", "is", null)
    .where("due_at", "<=", now)
    .orderBy("due_at")
    .orderBy("id")
    .execute();
  let processedCount = 0;

  for (const dueReminder of dueReminders) {
    try {
      const processed = await db.transaction().execute(async (transaction) => {
        const reminder = await transaction.selectFrom("class_session_reminders")
          .selectAll()
          .where("id", "=", dueReminder.id)
          .where("terminal_outcome", "is", null)
          .forUpdate()
          .skipLocked()
          .executeTakeFirst();
        if (!reminder) return false;

        const commitment = await transaction.selectFrom("schedule_commitments")
          .innerJoin("class_sessions", "class_sessions.id", "schedule_commitments.class_session_id")
          .select(["class_sessions.starts_at", "class_sessions.state"])
          .where("schedule_commitments.class_session_id", "=", reminder.class_session_id)
          .where("schedule_commitments.user_id", "=", reminder.recipient_user_id)
          .where("schedule_commitments.commitment_role", "=", reminder.commitment_role)
          .where("schedule_commitments.active", "=", true)
          .executeTakeFirst();
        const classSessionHasStarted = commitment
          ? Temporal.Instant.compare(
            Temporal.Instant.fromEpochMilliseconds(commitment.starts_at.getTime()),
            Temporal.Instant.fromEpochMilliseconds(now.getTime()),
          ) <= 0
          : false;

        if (!commitment || commitment.state !== "PUBLISHED" || classSessionHasStarted) {
          await transaction.updateTable("class_session_reminders").set({ terminal_outcome: "SUPPRESSED", completed_at: now }).where("id", "=", reminder.id).execute();
          await recordReminderAudit(transaction as Database, reminder.class_session_id, correlationId, "SUCCEEDED", "CLASS_SESSION_REMINDER_SUPPRESSED");
          return true;
        }

        await notifyClassSessionUser(transaction as Database, {
          recipientUserId: reminder.recipient_user_id,
          messageId: reminder.commitment_role === "STUDENT"
            ? "class-session.reminder.student"
            : "class-session.reminder.teacher",
          classSessionId: reminder.class_session_id,
          startsAt: commitment.starts_at,
          sourceReference: `class-session.reminder.${reminder.commitment_role.toLowerCase()}:${reminder.id}`,
        });
        await transaction.updateTable("class_session_reminders").set({ terminal_outcome: "DELIVERED", completed_at: now }).where("id", "=", reminder.id).execute();
        await recordReminderAudit(transaction as Database, reminder.class_session_id, correlationId, "SUCCEEDED", "CLASS_SESSION_REMINDER_DELIVERED");
        return true;
      });
      if (processed) processedCount += 1;
    } catch (error) {
      await recordReminderAudit(db, dueReminder.class_session_id, correlationId, "FAILED", "CLASS_SESSION_REMINDER_FAILED");
      throw error;
    }
  }

  return processedCount;
}

async function recordReminderAudit(
  db: Database,
  classSessionId: string,
  correlationId: string,
  outcome: "SUCCEEDED" | "FAILED",
  reasonCode: "CLASS_SESSION_REMINDER_DELIVERED" | "CLASS_SESSION_REMINDER_SUPPRESSED" | "CLASS_SESSION_REMINDER_FAILED",
) {
  await db.insertInto("audit_entries").values({
    actor_user_id: null,
    system_identity: "CLASS_SESSION_REMINDER_WORKER",
    acting_role: null,
    operation: "class-session.reminder-processed",
    target_type: "ClassSession",
    target_id: classSessionId,
    outcome,
    reason_code: reasonCode,
    correlation_id: correlationId,
  }).execute();
}
