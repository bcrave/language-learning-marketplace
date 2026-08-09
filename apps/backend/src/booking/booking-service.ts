import {
  bookingWindowIsOpen,
  interfaceMessages,
  studentCancellationCreditOutcome,
} from "@marketplace/core";
import IntlMessageFormat from "intl-messageformat";
import { sql, type Selectable } from "kysely";

import type { Database } from "../database/database.js";
import type { ClassSessionsTable } from "../database/types.js";
import { projectClassCreditAccount } from "../class-credit/class-credit-service.js";
import { classSessionProjection } from "../class-session/class-session-service.js";

type Student = { id: string };
type BookingErrorCode =
  | "CLASS_SESSION_NOT_FOUND"
  | "BOOKING_WINDOW_CLOSED"
  | "SESSION_FULL"
  | "INSUFFICIENT_CLASS_CREDITS"
  | "SCHEDULE_CONFLICT"
  | "ALREADY_BOOKED"
  | "BOOKING_NOT_FOUND"
  | "BOOKING_NOT_ACTIVE"
  | "CANCELLATION_WINDOW_CLOSED"
  | "LESSON_UNIT_MISMATCH"
  | "IDEMPOTENCY_KEY_REUSED";

const bookingError = (code: BookingErrorCode, message: string) => ({
  __typename: "BookingError" as const,
  code,
  message,
});

async function recordBookingAudit(
  db: Database,
  studentId: string,
  operation: "booking.created" | "booking.cancelled" | "booking.rescheduled",
  targetId: string,
  correlationId: string,
  outcome: "SUCCEEDED" | "DENIED",
  reasonCode: string,
) {
  await db.insertInto("audit_entries").values({
    actor_user_id: studentId,
    acting_role: "STUDENT",
    operation,
    target_type: "Booking",
    target_id: targetId,
    outcome,
    reason_code: reasonCode,
    correlation_id: correlationId,
  }).execute();
}

async function denyBooking(
  db: Database,
  studentId: string,
  operation: "booking.created" | "booking.cancelled" | "booking.rescheduled",
  targetId: string,
  correlationId: string,
  code: BookingErrorCode,
  message: string,
) {
  await recordBookingAudit(db, studentId, operation, targetId, correlationId, "DENIED", code);
  return bookingError(code, message);
}

async function projectBooking(db: Database, bookingId: string) {
  const row = await db.selectFrom("bookings")
    .innerJoin("class_sessions", "class_sessions.id", "bookings.class_session_id")
    .select([
      "bookings.id", "bookings.state", "bookings.terminal_reason",
      "bookings.class_credit_refunded", "bookings.booked_at", "bookings.ended_at",
      "class_sessions.id as class_session_id", "class_sessions.lesson_unit_id",
      "class_sessions.teacher_user_id", "class_sessions.starts_at",
      "class_sessions.scheduling_time_zone", "class_sessions.seat_capacity",
      "class_sessions.occupied_seats",
    ])
    .where("bookings.id", "=", bookingId)
    .executeTakeFirstOrThrow();
  return {
    id: row.id,
    state: row.state,
    terminalReason: row.terminal_reason,
    classCreditRefunded: row.class_credit_refunded,
    bookedAt: row.booked_at.toISOString(),
    endedAt: row.ended_at?.toISOString() ?? null,
    classSession: classSessionProjection({
      id: row.class_session_id,
      lesson_unit_id: row.lesson_unit_id,
      teacher_user_id: row.teacher_user_id,
      starts_at: row.starts_at,
      scheduling_time_zone: row.scheduling_time_zone,
      seat_capacity: row.seat_capacity,
      occupied_seats: row.occupied_seats,
    }),
  };
}

export async function bookingsForStudent(db: Database, studentId: string) {
  const ids = await db.selectFrom("bookings").select("id")
    .where("student_user_id", "=", studentId)
    .orderBy("booked_at", "desc").orderBy("id", "desc").execute();
  return Promise.all(ids.map(({ id }) => projectBooking(db, id)));
}

async function notifyStudent(
  transaction: Database,
  studentId: string,
  sourceReference: string,
  messageId: "booking.created.student" | "booking.cancelled.student" | "booking.rescheduled.student",
  variables: Record<string, unknown>,
) {
  const student = await transaction.selectFrom("users").select(["interface_locale", "display_time_zone"])
    .where("id", "=", studentId).executeTakeFirstOrThrow();
  const locale = student.interface_locale ?? "en";
  const timeZone = student.display_time_zone ?? "UTC";
  const localizedVariables = { ...variables, timeZone };
  const renderedContent = String(new IntlMessageFormat(
    interfaceMessages[locale][messageId],
    locale,
    {
      date: { long: { ...IntlMessageFormat.formats.date.long, timeZone } },
      time: { short: { ...IntlMessageFormat.formats.time.short, timeZone } },
    },
  ).format(variables));
  await transaction.insertInto("in_app_notifications").values({
    recipient_user_id: studentId,
    message_id: messageId,
    variables: JSON.stringify(localizedVariables),
    source_reference: sourceReference,
  }).execute();
  await transaction.insertInto("email_notification_intents").values({
    recipient_user_id: studentId,
    message_id: messageId,
    locale,
    variables: JSON.stringify(localizedVariables),
    rendered_content: renderedContent,
    source_reference: sourceReference,
  }).execute();
}

async function activateStudentBooking(
  transaction: Database,
  studentId: string,
  session: Selectable<ClassSessionsTable>,
  now: Date,
  rescheduledFromBookingId: string | null = null,
) {
  const booking = await transaction.insertInto("bookings").values({
    student_user_id: studentId,
    class_session_id: session.id,
    teacher_user_id_at_booking: session.teacher_user_id,
    state: "ACTIVE",
    terminal_reason: null,
    class_credit_refunded: false,
    late_cancellation_refund_until: null,
    rescheduled_from_booking_id: rescheduledFromBookingId,
    ended_at: null,
  }).returning("id").executeTakeFirstOrThrow();
  const endsAt = new Date(session.starts_at.getTime() + 60 * 60_000);
  await transaction.insertInto("schedule_commitments").values({
    user_id: studentId,
    class_session_id: session.id,
    commitment_role: "STUDENT",
    starts_at: session.starts_at,
    ends_at: endsAt,
    active: true,
  }).onConflict((conflict) => conflict
    .columns(["class_session_id", "user_id", "commitment_role"])
    .doUpdateSet({ starts_at: session.starts_at, ends_at: endsAt, active: true }))
    .execute();
  await transaction.updateTable("class_sessions")
    .set({ occupied_seats: session.occupied_seats + 1 })
    .where("id", "=", session.id).executeTakeFirstOrThrow();
  const reminderDueAt = new Date(session.starts_at.getTime() - 24 * 60 * 60_000);
  if (reminderDueAt > now) {
    await transaction.insertInto("class_session_reminders").values({
      class_session_id: session.id,
      recipient_user_id: studentId,
      commitment_role: "STUDENT",
      due_at: reminderDueAt,
      terminal_outcome: null,
      completed_at: null,
    }).onConflict((conflict) => conflict
      .columns(["class_session_id", "recipient_user_id", "commitment_role"])
      .doUpdateSet({ due_at: reminderDueAt, terminal_outcome: null, completed_at: null }))
      .execute();
  }
  return booking;
}

async function deactivateStudentBookingCommitment(
  transaction: Database,
  studentId: string,
  session: Selectable<ClassSessionsTable>,
  now: Date,
) {
  await transaction.updateTable("schedule_commitments").set({ active: false })
    .where("class_session_id", "=", session.id).where("user_id", "=", studentId)
    .where("commitment_role", "=", "STUDENT").executeTakeFirstOrThrow();
  await transaction.updateTable("class_sessions")
    .set({ occupied_seats: session.occupied_seats - 1 })
    .where("id", "=", session.id).executeTakeFirstOrThrow();
  await transaction.updateTable("class_session_reminders")
    .set({ terminal_outcome: "SUPPRESSED", completed_at: now })
    .where("class_session_id", "=", session.id).where("recipient_user_id", "=", studentId)
    .where("commitment_role", "=", "STUDENT").where("terminal_outcome", "is", null).execute();
}

export async function bookClassSession(
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
    return denyBooking(transaction, student.id, "booking.created", input.classSessionId, correlationId, "CLASS_SESSION_NOT_FOUND", "Choose a published Class Session.");
  }
  if (!bookingWindowIsOpen(now, session.starts_at)) {
    return denyBooking(transaction, student.id, "booking.created", session.id, correlationId, "BOOKING_WINDOW_CLOSED", "Booking closes 30 minutes before the Class Session starts.");
  }
  const existing = await transaction.selectFrom("bookings").select("id")
    .where("student_user_id", "=", student.id).where("class_session_id", "=", session.id)
    .where("state", "=", "ACTIVE").executeTakeFirst();
  if (existing) {
    return denyBooking(transaction, student.id, "booking.created", existing.id, correlationId, "ALREADY_BOOKED", "You already have an active Booking for this Class Session.");
  }
  if (session.occupied_seats >= session.seat_capacity) {
    return denyBooking(transaction, student.id, "booking.created", session.id, correlationId, "SESSION_FULL", "The Class Session has no available seats.");
  }
  const endsAt = new Date(session.starts_at.getTime() + 60 * 60_000);
  const conflict = await transaction.selectFrom("schedule_commitments").select("id")
    .where("user_id", "=", student.id).where("active", "=", true)
    .where("starts_at", "<", endsAt).where("ends_at", ">", session.starts_at)
    .executeTakeFirst();
  if (conflict) {
    return denyBooking(transaction, student.id, "booking.created", session.id, correlationId, "SCHEDULE_CONFLICT", "This Class Session overlaps another active Student or Teacher commitment.");
  }
  const account = await transaction.selectFrom("class_credit_accounts").select("available_balance")
    .where("student_user_id", "=", student.id).forUpdate().executeTakeFirst();
  if (!account || account.available_balance < 1) {
    return denyBooking(transaction, student.id, "booking.created", session.id, correlationId, "INSUFFICIENT_CLASS_CREDITS", "One available Class Credit is required to book.");
  }

  const booking = await activateStudentBooking(transaction, student.id, session, now);
  const availableBalance = account.available_balance - 1;
  await transaction.insertInto("class_credit_ledger_entries").values({
    student_user_id: student.id,
    amount: -1,
    source: "BOOKING_DEDUCTION",
    source_reference: booking.id,
    reason: null,
  }).execute();
  await transaction.updateTable("class_credit_accounts")
    .set({ available_balance: availableBalance, updated_at: now })
    .where("student_user_id", "=", student.id).executeTakeFirstOrThrow();
  await recordBookingAudit(transaction, student.id, "booking.created", booking.id, correlationId, "SUCCEEDED", "BOOKING_CREATED");
  await notifyStudent(transaction, student.id, `booking.created:${booking.id}`, "booking.created.student", {
    classSessionId: session.id,
    startsAt: session.starts_at,
    availableBalance,
  });
  return {
    __typename: "BookClassSessionSuccess" as const,
    booking: await projectBooking(transaction, booking.id),
    account: await projectClassCreditAccount(transaction, student.id, availableBalance),
  };
}

export async function cancelBooking(
  transaction: Database,
  student: Student,
  input: { bookingId: string },
  correlationId: string,
  now: Date,
) {
  await sql`select pg_advisory_xact_lock(hashtextextended(${student.id}, 28))`.execute(transaction);
  const booking = await transaction.selectFrom("bookings")
    .selectAll().where("id", "=", input.bookingId)
    .where("student_user_id", "=", student.id).forUpdate().executeTakeFirst();
  if (!booking) {
    return denyBooking(transaction, student.id, "booking.cancelled", input.bookingId, correlationId, "BOOKING_NOT_FOUND", "The Booking was not found.");
  }
  if (booking.state !== "ACTIVE") {
    return denyBooking(transaction, student.id, "booking.cancelled", booking.id, correlationId, "BOOKING_NOT_ACTIVE", "Only an active Booking can be cancelled.");
  }
  const session = await transaction.selectFrom("class_sessions").selectAll()
    .where("id", "=", booking.class_session_id).forUpdate().executeTakeFirstOrThrow();
  const cancellationOutcome = studentCancellationCreditOutcome(now, session.starts_at);
  if (cancellationOutcome === "CLOSED") {
    return denyBooking(transaction, student.id, "booking.cancelled", booking.id, correlationId, "CANCELLATION_WINDOW_CLOSED", "A Booking cannot be cancelled after its Class Session starts.");
  }
  const account = await transaction.selectFrom("class_credit_accounts").select("available_balance")
    .where("student_user_id", "=", student.id).forUpdate().executeTakeFirstOrThrow();
  const classCreditRefunded = cancellationOutcome === "REFUND"
    || booking.teacher_user_id_at_booking !== session.teacher_user_id
    || (booking.late_cancellation_refund_until !== null
      && now <= booking.late_cancellation_refund_until);
  const availableBalance = account.available_balance + (classCreditRefunded ? 1 : 0);
  await transaction.updateTable("bookings").set({
    state: "ENDED",
    terminal_reason: "STUDENT_CANCELLATION",
    class_credit_refunded: classCreditRefunded,
    ended_at: now,
  }).where("id", "=", booking.id).executeTakeFirstOrThrow();
  await deactivateStudentBookingCommitment(transaction, student.id, session, now);
  if (classCreditRefunded) {
    await transaction.insertInto("class_credit_ledger_entries").values({
      student_user_id: student.id,
      amount: 1,
      source: "BOOKING_REFUND",
      source_reference: booking.id,
      reason: null,
    }).execute();
    await transaction.updateTable("class_credit_accounts")
      .set({ available_balance: availableBalance, updated_at: now })
      .where("student_user_id", "=", student.id).executeTakeFirstOrThrow();
  }
  await recordBookingAudit(transaction, student.id, "booking.cancelled", booking.id, correlationId, "SUCCEEDED", classCreditRefunded ? "BOOKING_CANCELLED_WITH_REFUND" : "BOOKING_CANCELLED_WITH_FORFEITURE");
  await notifyStudent(transaction, student.id, `booking.cancelled:${booking.id}`, "booking.cancelled.student", {
    classSessionId: session.id,
    classCreditRefunded,
    availableBalance,
  });
  return {
    __typename: "CancelBookingSuccess" as const,
    booking: await projectBooking(transaction, booking.id),
    account: await projectClassCreditAccount(transaction, student.id, availableBalance),
  };
}

export async function rescheduleBooking(
  transaction: Database,
  student: Student,
  input: { bookingId: string; replacementClassSessionId: string },
  correlationId: string,
  now: Date,
) {
  await sql`select pg_advisory_xact_lock(hashtextextended(${student.id}, 28))`.execute(transaction);
  const originalBooking = await transaction.selectFrom("bookings").selectAll()
    .where("id", "=", input.bookingId).where("student_user_id", "=", student.id)
    .forUpdate().executeTakeFirst();
  if (!originalBooking) {
    return denyBooking(transaction, student.id, "booking.rescheduled", input.bookingId, correlationId, "BOOKING_NOT_FOUND", "The Booking was not found.");
  }
  if (originalBooking.state !== "ACTIVE") {
    return denyBooking(transaction, student.id, "booking.rescheduled", originalBooking.id, correlationId, "BOOKING_NOT_ACTIVE", "Only an active Booking can be rescheduled.");
  }

  const sessions = await transaction.selectFrom("class_sessions").selectAll()
    .where("id", "in", [originalBooking.class_session_id, input.replacementClassSessionId])
    .orderBy("id").forUpdate().execute();
  const originalSession = sessions.find(({ id }) => id === originalBooking.class_session_id)!;
  const replacementSession = sessions.find(({ id }) => id === input.replacementClassSessionId);
  if (!replacementSession || replacementSession.state !== "PUBLISHED") {
    return denyBooking(transaction, student.id, "booking.rescheduled", input.replacementClassSessionId, correlationId, "CLASS_SESSION_NOT_FOUND", "Choose a published replacement Class Session.");
  }
  if (!bookingWindowIsOpen(now, replacementSession.starts_at)) {
    return denyBooking(transaction, student.id, "booking.rescheduled", replacementSession.id, correlationId, "BOOKING_WINDOW_CLOSED", "Booking closes 30 minutes before the replacement Class Session starts.");
  }
  if (replacementSession.lesson_unit_id !== originalSession.lesson_unit_id) {
    return denyBooking(transaction, student.id, "booking.rescheduled", replacementSession.id, correlationId, "LESSON_UNIT_MISMATCH", "Choose a replacement Class Session delivering the same Lesson Unit.");
  }
  if (replacementSession.id === originalSession.id) {
    return denyBooking(transaction, student.id, "booking.rescheduled", replacementSession.id, correlationId, "ALREADY_BOOKED", "Choose a different replacement Class Session.");
  }
  if (replacementSession.occupied_seats >= replacementSession.seat_capacity) {
    return denyBooking(transaction, student.id, "booking.rescheduled", replacementSession.id, correlationId, "SESSION_FULL", "The replacement Class Session has no available seats.");
  }
  const replacementEndsAt = new Date(replacementSession.starts_at.getTime() + 60 * 60_000);
  const conflict = await transaction.selectFrom("schedule_commitments").select("id")
    .where("user_id", "=", student.id).where("active", "=", true)
    .where((expression) => expression.or([
      expression("class_session_id", "!=", originalSession.id),
      expression("commitment_role", "!=", "STUDENT"),
    ]))
    .where("starts_at", "<", replacementEndsAt).where("ends_at", ">", replacementSession.starts_at)
    .executeTakeFirst();
  if (conflict) {
    return denyBooking(transaction, student.id, "booking.rescheduled", replacementSession.id, correlationId, "SCHEDULE_CONFLICT", "The replacement Class Session overlaps another active Student or Teacher commitment.");
  }

  await transaction.updateTable("bookings").set({
    state: "ENDED",
    terminal_reason: "RESCHEDULED",
    class_credit_refunded: false,
    ended_at: now,
  }).where("id", "=", originalBooking.id).executeTakeFirstOrThrow();
  await deactivateStudentBookingCommitment(transaction, student.id, originalSession, now);

  const replacementBooking = await activateStudentBooking(
    transaction,
    student.id,
    replacementSession,
    now,
    originalBooking.id,
  );
  const account = await transaction.selectFrom("class_credit_accounts").select("available_balance")
    .where("student_user_id", "=", student.id).executeTakeFirstOrThrow();
  await recordBookingAudit(transaction, student.id, "booking.rescheduled", originalBooking.id, correlationId, "SUCCEEDED", "BOOKING_RESCHEDULED");
  await notifyStudent(transaction, student.id, `booking.rescheduled:${originalBooking.id}`, "booking.rescheduled.student", {
    originalClassSessionId: originalSession.id,
    replacementClassSessionId: replacementSession.id,
    startsAt: replacementSession.starts_at,
  });
  return {
    __typename: "RescheduleBookingSuccess" as const,
    originalBooking: await projectBooking(transaction, originalBooking.id),
    replacementBooking: await projectBooking(transaction, replacementBooking.id),
    account: await projectClassCreditAccount(transaction, student.id, account.available_balance),
  };
}
