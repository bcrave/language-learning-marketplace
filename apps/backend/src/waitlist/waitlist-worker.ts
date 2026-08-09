import { randomUUID } from "node:crypto";

import { interfaceMessages } from "@marketplace/core";
import type { TaskList } from "graphile-worker";
import IntlMessageFormat from "intl-messageformat";
import { sql } from "kysely";

import { activateStudentBooking } from "../booking/booking-service.js";
import type { Database } from "../database/database.js";
import type { WaitlistTerminalReason } from "../database/types.js";

type BusinessIneligibility = Extract<
  WaitlistTerminalReason,
  "CLASS_SESSION_UNAVAILABLE" | "INSUFFICIENT_CLASS_CREDITS" | "SCHEDULE_CONFLICT" | "ALREADY_BOOKED"
>;

export function waitlistTasks(
  db: Database,
  options: { now?: () => Date; correlationId?: () => string } = {},
): TaskList {
  return {
    process_waitlist_entries: async () => {
      await processWaitlistEntries(
        db,
        options.now?.() ?? new Date(),
        options.correlationId?.() ?? `waitlist-worker-${randomUUID()}`,
      );
    },
  };
}

export async function processWaitlistEntries(
  db: Database,
  now: Date,
  correlationId: string,
) {
  const candidates = await db.selectFrom("waitlist_entries")
    .select(["id", "student_user_id"])
    .where("state", "=", "ACTIVE")
    .orderBy("joined_at")
    .orderBy("id")
    .execute();
  let processedCount = 0;

  for (const candidate of candidates) {
    try {
      const processed = await db.transaction().execute(async (transaction) => {
        await sql`select pg_advisory_xact_lock(hashtextextended(${candidate.student_user_id}, 28))`.execute(transaction);
        const entry = await transaction.selectFrom("waitlist_entries").selectAll()
          .where("id", "=", candidate.id).where("state", "=", "ACTIVE")
          .forUpdate().executeTakeFirst();
        if (!entry) return false;

        if (entry.expires_at <= now) {
          await closeEntry(transaction as Database, entry, now, "EXPIRED", correlationId);
          return true;
        }

        const session = await transaction.selectFrom("class_sessions").selectAll()
          .where("id", "=", entry.class_session_id).forUpdate().executeTakeFirst();
        if (!session || session.state !== "PUBLISHED") {
          await closeEntry(transaction as Database, entry, now, "CLASS_SESSION_UNAVAILABLE", correlationId);
          return true;
        }
        if (session.occupied_seats >= session.seat_capacity) return false;

        const existingBooking = await transaction.selectFrom("bookings").select("id")
          .where("student_user_id", "=", entry.student_user_id)
          .where("class_session_id", "=", session.id)
          .where("state", "=", "ACTIVE").executeTakeFirst();
        if (existingBooking) {
          await closeEntry(transaction as Database, entry, now, "ALREADY_BOOKED", correlationId);
          return true;
        }
        const endsAt = new Date(session.starts_at.getTime() + 60 * 60_000);
        const conflict = await transaction.selectFrom("schedule_commitments").select("id")
          .where("user_id", "=", entry.student_user_id).where("active", "=", true)
          .where("starts_at", "<", endsAt).where("ends_at", ">", session.starts_at)
          .executeTakeFirst();
        if (conflict) {
          await closeEntry(transaction as Database, entry, now, "SCHEDULE_CONFLICT", correlationId);
          return true;
        }
        const account = await transaction.selectFrom("class_credit_accounts").select("available_balance")
          .where("student_user_id", "=", entry.student_user_id).forUpdate().executeTakeFirst();
        if (!account || account.available_balance < 1) {
          await closeEntry(transaction as Database, entry, now, "INSUFFICIENT_CLASS_CREDITS", correlationId);
          return true;
        }

        const refundUntil = new Date(now.getTime() + 30 * 60_000);
        const booking = await activateStudentBooking(
          transaction as Database,
          entry.student_user_id,
          session,
          now,
          null,
          refundUntil,
        );
        const availableBalance = account.available_balance - 1;
        await transaction.insertInto("class_credit_ledger_entries").values({
          student_user_id: entry.student_user_id,
          amount: -1,
          source: "BOOKING_DEDUCTION",
          source_reference: booking.id,
          reason: null,
        }).execute();
        await transaction.updateTable("class_credit_accounts")
          .set({ available_balance: availableBalance, updated_at: now })
          .where("student_user_id", "=", entry.student_user_id).executeTakeFirstOrThrow();
        await transaction.updateTable("waitlist_entries").set({
          state: "PROMOTED",
          terminal_reason: "PROMOTED",
          completed_at: now,
          promoted_booking_id: booking.id,
        }).where("id", "=", entry.id).executeTakeFirstOrThrow();
        await notifyWaitlistOutcome(transaction as Database, {
          studentId: entry.student_user_id,
          entryId: entry.id,
          messageId: "waitlist-entry.promoted.student",
          variables: {
            bookingId: booking.id,
            classSessionId: session.id,
            startsAt: session.starts_at,
            refundUntil,
            availableBalance,
          },
        });
        await recordWorkerAudit(transaction as Database, entry.id, correlationId, "SUCCEEDED", "WAITLIST_ENTRY_PROMOTED");
        return true;
      });
      if (processed) processedCount += 1;
    } catch (error) {
      await recordWorkerAudit(db, candidate.id, correlationId, "FAILED", "WAITLIST_PROCESSING_FAILED");
      throw error;
    }
  }

  return processedCount;
}

async function closeEntry(
  db: Database,
  entry: { id: string; student_user_id: string; class_session_id: string },
  now: Date,
  reason: "EXPIRED" | BusinessIneligibility,
  correlationId: string,
) {
  const state = reason === "EXPIRED" ? "EXPIRED" : "INELIGIBLE";
  await db.updateTable("waitlist_entries").set({
    state,
    terminal_reason: reason,
    completed_at: now,
  }).where("id", "=", entry.id).executeTakeFirstOrThrow();
  await notifyWaitlistOutcome(db, {
    studentId: entry.student_user_id,
    entryId: entry.id,
    messageId: reason === "EXPIRED"
      ? "waitlist-entry.expired.student"
      : "waitlist-entry.ineligible.student",
    variables: { classSessionId: entry.class_session_id, reasonCode: reason },
  });
  await recordWorkerAudit(
    db,
    entry.id,
    correlationId,
    "SUCCEEDED",
    reason === "EXPIRED" ? "WAITLIST_ENTRY_EXPIRED" : `WAITLIST_ENTRY_INELIGIBLE_${reason}`,
  );
}

async function notifyWaitlistOutcome(
  db: Database,
  notification: {
    studentId: string;
    entryId: string;
    messageId: "waitlist-entry.promoted.student" | "waitlist-entry.ineligible.student" | "waitlist-entry.expired.student";
    variables: Record<string, unknown>;
  },
) {
  const student = await db.selectFrom("users").select(["interface_locale", "display_time_zone"])
    .where("id", "=", notification.studentId).executeTakeFirstOrThrow();
  const locale = student.interface_locale ?? "en";
  const timeZone = student.display_time_zone ?? "UTC";
  const storedVariables = { ...notification.variables, timeZone };
  const renderedContent = String(new IntlMessageFormat(
    interfaceMessages[locale][notification.messageId],
    locale,
    {
      date: { long: { ...IntlMessageFormat.formats.date.long, timeZone } },
      time: { short: { ...IntlMessageFormat.formats.time.short, timeZone } },
    },
  ).format(notification.variables));
  const sourceReference = `${notification.messageId}:${notification.entryId}`;
  await db.insertInto("in_app_notifications").values({
    recipient_user_id: notification.studentId,
    message_id: notification.messageId,
    variables: JSON.stringify(storedVariables),
    source_reference: sourceReference,
  }).execute();
  await db.insertInto("email_notification_intents").values({
    recipient_user_id: notification.studentId,
    message_id: notification.messageId,
    locale,
    variables: JSON.stringify(storedVariables),
    rendered_content: renderedContent,
    source_reference: sourceReference,
  }).execute();
}

async function recordWorkerAudit(
  db: Database,
  entryId: string,
  correlationId: string,
  outcome: "SUCCEEDED" | "FAILED",
  reasonCode: string,
) {
  await db.insertInto("audit_entries").values({
    actor_user_id: null,
    system_identity: "WAITLIST_WORKER",
    acting_role: null,
    operation: "waitlist-entry.processed",
    target_type: "WaitlistEntry",
    target_id: entryId,
    outcome,
    reason_code: reasonCode,
    correlation_id: correlationId,
  }).execute();
}
