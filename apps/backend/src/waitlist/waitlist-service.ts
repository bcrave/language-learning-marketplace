import { waitlistExpiresAt, waitlistIsOpen } from "@marketplace/core";
import { sql } from "kysely";

import { projectBooking } from "../booking/booking-service.js";
import { classSessionProjection } from "../class-session/class-session-service.js";
import type { Database } from "../database/database.js";

type Student = { id: string };
type WaitlistErrorCode =
  | "CLASS_SESSION_NOT_FOUND"
  | "WAITLIST_NOT_OPEN"
  | "SESSION_NOT_FULL"
  | "INSUFFICIENT_CLASS_CREDITS"
  | "SCHEDULE_CONFLICT"
  | "ALREADY_BOOKED"
  | "ALREADY_WAITLISTED"
  | "WAITLIST_ENTRY_NOT_FOUND"
  | "WAITLIST_ENTRY_NOT_ACTIVE"
  | "IDEMPOTENCY_KEY_REUSED";

const waitlistError = (code: WaitlistErrorCode, message: string) => ({
  __typename: "WaitlistError" as const,
  code,
  message,
});

async function recordWaitlistAudit(
  db: Database,
  actorUserId: string,
  targetId: string,
  correlationId: string,
  outcome: "SUCCEEDED" | "DENIED",
  reasonCode: string,
  operation: "waitlist-entry.created" | "waitlist-entry.withdrawn" = "waitlist-entry.created",
) {
  await db.insertInto("audit_entries").values({
    actor_user_id: actorUserId,
    acting_role: "STUDENT",
    operation,
    target_type: "WaitlistEntry",
    target_id: targetId,
    outcome,
    reason_code: reasonCode,
    correlation_id: correlationId,
  }).execute();
}

async function notifyWaitlistWithdrawn(
  db: Database,
  studentId: string,
  entryId: string,
  classSessionId: string,
) {
  await db.insertInto("in_app_notifications").values({
    recipient_user_id: studentId,
    message_id: "waitlist-entry.withdrawn.student",
    variables: JSON.stringify({ classSessionId }),
    source_reference: `waitlist-entry.withdrawn:${entryId}`,
  }).execute();
}

async function denyJoin(
  db: Database,
  studentId: string,
  classSessionId: string,
  correlationId: string,
  code: WaitlistErrorCode,
  message: string,
) {
  await recordWaitlistAudit(db, studentId, classSessionId, correlationId, "DENIED", code);
  return waitlistError(code, message);
}

export async function projectWaitlistEntry(db: Database, entryId: string) {
  const row = await db.selectFrom("waitlist_entries")
    .innerJoin("class_sessions", "class_sessions.id", "waitlist_entries.class_session_id")
    .select([
      "waitlist_entries.id",
      "waitlist_entries.state",
      "waitlist_entries.terminal_reason",
      "waitlist_entries.joined_at",
      "waitlist_entries.expires_at",
      "waitlist_entries.completed_at",
      "waitlist_entries.promoted_booking_id",
      "class_sessions.id as class_session_id",
      "class_sessions.lesson_unit_id",
      "class_sessions.teacher_user_id",
      "class_sessions.starts_at",
      "class_sessions.scheduling_time_zone",
      "class_sessions.seat_capacity",
      "class_sessions.occupied_seats",
    ])
    .where("waitlist_entries.id", "=", entryId)
    .executeTakeFirstOrThrow();
  return {
    id: row.id,
    state: row.state,
    terminalReason: row.terminal_reason,
    joinedAt: row.joined_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
    classSession: classSessionProjection({
      id: row.class_session_id,
      lesson_unit_id: row.lesson_unit_id,
      teacher_user_id: row.teacher_user_id,
      starts_at: row.starts_at,
      scheduling_time_zone: row.scheduling_time_zone,
      seat_capacity: row.seat_capacity,
      occupied_seats: row.occupied_seats,
    }),
    resultingBooking: row.promoted_booking_id
      ? await projectBooking(db, row.promoted_booking_id)
      : null,
  };
}

export async function waitlistEntriesForStudent(db: Database, studentId: string) {
  const entries = await db.selectFrom("waitlist_entries").select("id")
    .where("student_user_id", "=", studentId)
    .orderBy("joined_at", "desc").orderBy("id", "desc").execute();
  return Promise.all(entries.map(({ id }) => projectWaitlistEntry(db, id)));
}

async function notifyWaitlistJoined(
  db: Database,
  studentId: string,
  entryId: string,
  classSessionId: string,
  expiresAt: Date,
) {
  const student = await db.selectFrom("users").select("display_time_zone")
    .where("id", "=", studentId).executeTakeFirstOrThrow();
  await db.insertInto("in_app_notifications").values({
    recipient_user_id: studentId,
    message_id: "waitlist-entry.created.student",
    variables: JSON.stringify({
      classSessionId,
      expiresAt: expiresAt.toISOString(),
      timeZone: student.display_time_zone ?? "UTC",
    }),
    source_reference: `waitlist-entry.created:${entryId}`,
  }).execute();
}

export async function joinWaitlist(
  transaction: Database,
  student: Student,
  input: { classSessionId: string },
  correlationId: string,
  now: Date,
) {
  await sql`select pg_advisory_xact_lock(hashtextextended(${student.id}, 28))`.execute(transaction);
  const session = await transaction.selectFrom("class_sessions").selectAll()
    .where("id", "=", input.classSessionId).forUpdate().executeTakeFirst();
  if (!session || session.state !== "PUBLISHED") {
    return denyJoin(transaction, student.id, input.classSessionId, correlationId, "CLASS_SESSION_NOT_FOUND", "Choose a published Class Session.");
  }
  const expiresAt = waitlistExpiresAt(session.starts_at);
  if (!waitlistIsOpen(now, session.starts_at)) {
    return denyJoin(transaction, student.id, session.id, correlationId, "WAITLIST_NOT_OPEN", "The Waitlist closes two hours before the Class Session starts.");
  }
  if (session.occupied_seats < session.seat_capacity) {
    return denyJoin(transaction, student.id, session.id, correlationId, "SESSION_NOT_FULL", "Book the available seat instead of joining the Waitlist.");
  }
  const existingBooking = await transaction.selectFrom("bookings").select("id")
    .where("student_user_id", "=", student.id).where("class_session_id", "=", session.id)
    .where("state", "=", "ACTIVE").executeTakeFirst();
  if (existingBooking) {
    return denyJoin(transaction, student.id, existingBooking.id, correlationId, "ALREADY_BOOKED", "You already have an active Booking for this Class Session.");
  }
  const existingEntry = await transaction.selectFrom("waitlist_entries").select("id")
    .where("student_user_id", "=", student.id).where("class_session_id", "=", session.id)
    .where("state", "=", "ACTIVE").executeTakeFirst();
  if (existingEntry) {
    return denyJoin(transaction, student.id, existingEntry.id, correlationId, "ALREADY_WAITLISTED", "You already have an active Waitlist Entry for this Class Session.");
  }
  const endsAt = new Date(session.starts_at.getTime() + 60 * 60_000);
  const conflict = await transaction.selectFrom("schedule_commitments").select("id")
    .where("user_id", "=", student.id).where("active", "=", true)
    .where("starts_at", "<", endsAt).where("ends_at", ">", session.starts_at)
    .executeTakeFirst();
  if (conflict) {
    return denyJoin(transaction, student.id, session.id, correlationId, "SCHEDULE_CONFLICT", "This Class Session overlaps another active Student or Teacher commitment.");
  }
  const account = await transaction.selectFrom("class_credit_accounts").select("available_balance")
    .where("student_user_id", "=", student.id).executeTakeFirst();
  if (!account || account.available_balance < 1) {
    return denyJoin(transaction, student.id, session.id, correlationId, "INSUFFICIENT_CLASS_CREDITS", "One available Class Credit is required to join the Waitlist.");
  }
  const entry = await transaction.insertInto("waitlist_entries").values({
    student_user_id: student.id,
    class_session_id: session.id,
    state: "ACTIVE",
    terminal_reason: null,
    joined_at: now,
    expires_at: expiresAt,
    completed_at: null,
    promoted_booking_id: null,
  }).returning("id").executeTakeFirstOrThrow();
  await recordWaitlistAudit(transaction, student.id, entry.id, correlationId, "SUCCEEDED", "WAITLIST_ENTRY_CREATED");
  await notifyWaitlistJoined(transaction, student.id, entry.id, session.id, expiresAt);
  return {
    __typename: "JoinWaitlistSuccess" as const,
    entry: await projectWaitlistEntry(transaction, entry.id),
  };
}

export async function withdrawWaitlist(
  transaction: Database,
  student: Student,
  input: { waitlistEntryId: string },
  correlationId: string,
  now: Date,
) {
  await sql`select pg_advisory_xact_lock(hashtextextended(${student.id}, 28))`.execute(transaction);
  const entry = await transaction.selectFrom("waitlist_entries").selectAll()
    .where("id", "=", input.waitlistEntryId)
    .where("student_user_id", "=", student.id)
    .forUpdate().executeTakeFirst();
  if (!entry) {
    await recordWaitlistAudit(transaction, student.id, input.waitlistEntryId, correlationId, "DENIED", "WAITLIST_ENTRY_NOT_FOUND", "waitlist-entry.withdrawn");
    return waitlistError("WAITLIST_ENTRY_NOT_FOUND", "The Waitlist Entry was not found.");
  }
  if (entry.state === "PROMOTED" && entry.promoted_booking_id) {
    await recordWaitlistAudit(transaction, student.id, entry.id, correlationId, "DENIED", "WAITLIST_PROMOTION_WON", "waitlist-entry.withdrawn");
    return {
      __typename: "WaitlistPromotionWon" as const,
      booking: await projectBooking(transaction, entry.promoted_booking_id),
    };
  }
  if (entry.state !== "ACTIVE") {
    await recordWaitlistAudit(transaction, student.id, entry.id, correlationId, "DENIED", "WAITLIST_ENTRY_NOT_ACTIVE", "waitlist-entry.withdrawn");
    return waitlistError("WAITLIST_ENTRY_NOT_ACTIVE", "Only an active Waitlist Entry can be withdrawn.");
  }
  await transaction.updateTable("waitlist_entries").set({
    state: "WITHDRAWN",
    terminal_reason: "WITHDRAWN",
    completed_at: now,
  }).where("id", "=", entry.id).executeTakeFirstOrThrow();
  await recordWaitlistAudit(transaction, student.id, entry.id, correlationId, "SUCCEEDED", "WAITLIST_ENTRY_WITHDRAWN", "waitlist-entry.withdrawn");
  await notifyWaitlistWithdrawn(transaction, student.id, entry.id, entry.class_session_id);
  return {
    __typename: "WithdrawWaitlistSuccess" as const,
    entry: await projectWaitlistEntry(transaction, entry.id),
  };
}
