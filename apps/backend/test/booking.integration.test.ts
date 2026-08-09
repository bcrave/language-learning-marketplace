import { randomUUID } from "node:crypto";

import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import fc from "fast-check";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApi } from "../src/api/app.js";
import { deliverDueClassSessionReminders } from "../src/class-session/class-session-reminder-worker.js";
import { createDatabase, type Database } from "../src/database/database.js";
import { migrateDatabase } from "../src/database/migrate.js";

describe("Student Booking GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  const now = new Date("2026-08-10T12:00:00.000Z");
  const studentId = randomUUID();
  const studentSubject = randomUUID();
  const teacherId = randomUUID();
  let lessonUnitId: string;
  let classSessionId: string;

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `booking_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test", now: () => now });

    await db.insertInto("users").values([
      {
        id: studentId,
        identity_issuer: "https://fake.local/",
        identity_subject: studentSubject,
        display_name: "Sam Student",
        interface_locale: "en",
        display_time_zone: "America/Denver",
      },
      {
        id: teacherId,
        identity_issuer: "https://fake.local/",
        identity_subject: randomUUID(),
        display_name: "Taylor Teacher",
        interface_locale: "en",
        display_time_zone: "America/Denver",
      },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: studentId, role: "STUDENT" },
      { user_id: teacherId, role: "TEACHER" },
    ]).execute();
    const course = await db.insertInto("courses").values({
      stable_key: "es-b1",
      target_language: "es",
      curriculum_level: "B1",
      title: "Spanish B1",
      summary: "Intermediate Spanish",
    }).returning("id").executeTakeFirstOrThrow();
    await db.insertInto("topics").values({
      key: "BK",
      label_en: "Booking",
      label_es: "Reserva",
    }).execute();
    const lessonUnit = await db.transaction().execute(async (transaction) => {
      const inserted = await transaction.insertInto("lesson_units").values({
        stable_key: "es-b1-99",
        course_id: course.id,
        title: "Practical conversation",
        summary: "Practice conversation",
        objectives: JSON.stringify(["Hold a conversation"]),
        sort_order: 1,
        state: "ACTIVE",
        replacement_lesson_unit_id: null,
        retired_at: null,
      }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values({
        lesson_unit_id: inserted.id,
        topic_key: "BK",
      }).execute();
      return inserted;
    });
    lessonUnitId = lessonUnit.id;
    await db.insertInto("teacher_qualifications").values({
      teacher_user_id: teacherId,
      target_language: "es",
      curriculum_level: "B1",
      granted_by_user_id: teacherId,
    }).execute();
    classSessionId = (await db.insertInto("class_sessions").values({
      lesson_unit_id: lessonUnit.id,
      teacher_user_id: teacherId,
      starts_at: new Date("2026-08-10T14:00:00.000Z"),
      scheduling_time_zone: "America/Denver",
      seat_capacity: 2,
      occupied_seats: 0,
      state: "PUBLISHED",
    }).returning("id").executeTakeFirstOrThrow()).id;
    await db.insertInto("class_credit_accounts").values({
      student_user_id: studentId,
      available_balance: 2,
    }).execute();
    await db.insertInto("class_credit_ledger_entries").values({
      student_user_id: studentId,
      amount: 2,
      source: "CREDIT_ADJUSTMENT",
      source_reference: randomUUID(),
      reason: "Initial test balance",
    }).execute();
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("books an actionable Class Session by atomically claiming a seat and consuming one Class Credit", async () => {
    const correlationId = `booking-created-${randomUUID()}`;
    const result = await graphql(`
      mutation Book($input: BookClassSessionInput!) {
        bookClassSession(input: $input) {
          ... on BookClassSessionSuccess {
            booking {
              id state terminalReason
              classSession { id occupiedSeats }
            }
            account { availableBalance }
          }
          ... on BookingError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), classSessionId } }, correlationId);

    expect(result).toEqual({
      data: {
        bookClassSession: {
          booking: {
            id: expect.any(String),
            state: "ACTIVE",
            terminalReason: null,
            classSession: { id: classSessionId, occupiedSeats: 1 },
          },
          account: { availableBalance: 1 },
        },
      },
    });
    expect(await graphql(`
      query {
        studentBookings {
          id state terminalReason classSession { id occupiedSeats }
        }
      }
    `)).toEqual({
      data: {
        studentBookings: [{
          id: expect.any(String),
          state: "ACTIVE",
          terminalReason: null,
          classSession: { id: classSessionId, occupiedSeats: 1 },
        }],
      },
    });
    expect(await db.selectFrom("audit_entries")
      .select(["actor_user_id", "acting_role", "outcome", "reason_code"])
      .where("correlation_id", "=", correlationId)
      .executeTakeFirstOrThrow()).toEqual({
      actor_user_id: studentId,
      acting_role: "STUDENT",
      outcome: "SUCCEEDED",
      reason_code: "BOOKING_CREATED",
    });
    expect(await db.selectFrom("email_notification_intents")
      .select(["variables", "rendered_content"])
      .where("recipient_user_id", "=", studentId)
      .where("message_id", "=", "booking.created.student")
      .executeTakeFirstOrThrow()).toEqual({
      variables: expect.objectContaining({ timeZone: "America/Denver" }),
      rendered_content: expect.stringMatching(/8:00\sAM/),
    });
  });

  it("cancels at least 24 hours before start, returns the Class Credit, and preserves ended Booking history", async () => {
    const refundableSessionId = await insertClassSession("2026-08-12T14:00:00.000Z");
    const booked = await book(refundableSessionId) as BookingMutationResponse;
    const bookingId = booked.data.bookClassSession.booking.id;
    const correlationId = `booking-cancelled-${randomUUID()}`;

    const result = await graphql(`
      mutation Cancel($input: CancelBookingInput!) {
        cancelBooking(input: $input) {
          ... on CancelBookingSuccess {
            booking {
              id state terminalReason classCreditRefunded endedAt
              classSession { id occupiedSeats }
            }
            account { availableBalance }
          }
          ... on BookingError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), bookingId } }, correlationId);

    expect(result).toEqual({ data: { cancelBooking: {
      booking: {
        id: bookingId,
        state: "ENDED",
        terminalReason: "STUDENT_CANCELLATION",
        classCreditRefunded: true,
        endedAt: now.toISOString(),
        classSession: { id: refundableSessionId, occupiedSeats: 0 },
      },
      account: { availableBalance: 1 },
    } } });
    expect(await db.selectFrom("class_credit_ledger_entries")
      .select(["amount", "source", "source_reference"])
      .where("source_reference", "=", bookingId)
      .orderBy("amount")
      .execute()).toEqual([
      { amount: -1, source: "BOOKING_DEDUCTION", source_reference: bookingId },
      { amount: 1, source: "BOOKING_REFUND", source_reference: bookingId },
    ]);
    expect(await db.selectFrom("schedule_commitments").select("active")
      .where("class_session_id", "=", refundableSessionId)
      .where("user_id", "=", studentId).executeTakeFirstOrThrow()).toEqual({ active: false });
    expect(await db.selectFrom("class_session_reminders").select("terminal_outcome")
      .where("class_session_id", "=", refundableSessionId)
      .where("recipient_user_id", "=", studentId).executeTakeFirstOrThrow()).toEqual({ terminal_outcome: "SUPPRESSED" });
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"])
      .where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({
      outcome: "SUCCEEDED",
      reason_code: "BOOKING_CANCELLED_WITH_REFUND",
    });
    expect(await db.selectFrom("in_app_notifications").select("message_id")
      .where("source_reference", "=", `booking.cancelled:${bookingId}`).executeTakeFirstOrThrow()).toEqual({
      message_id: "booking.cancelled.student",
    });
  });

  it("reschedules an active Booking to another Class Session for the same Lesson Unit without exchanging another Class Credit", async () => {
    const reschedulingStudent = await createStudentWithCredits(1);
    const originalTeacher = await createTeacher();
    const originalSessionId = await insertClassSession(
      "2026-08-12T14:00:00.000Z",
      originalTeacher.id,
    );
    const replacementTeacher = await createTeacher();
    const replacementSessionId = await insertClassSession(
      "2026-08-13T14:00:00.000Z",
      replacementTeacher.id,
    );
    const booked = await bookAs(reschedulingStudent.subject, originalSessionId) as BookingMutationResponse;
    const originalBookingId = booked.data.bookClassSession.booking.id;

    const correlationId = `booking-rescheduled-${randomUUID()}`;
    const result = await rescheduleAs(
      reschedulingStudent.subject,
      originalBookingId,
      replacementSessionId,
      randomUUID(),
      correlationId,
    );

    expect(result).toEqual({ data: { rescheduleBooking: {
      originalBooking: {
        id: originalBookingId,
        state: "ENDED",
        terminalReason: "RESCHEDULED",
        classSession: { id: originalSessionId, occupiedSeats: 0 },
      },
      replacementBooking: {
        id: expect.any(String),
        state: "ACTIVE",
        terminalReason: null,
        classSession: { id: replacementSessionId, occupiedSeats: 1 },
      },
      account: { availableBalance: 0 },
    } } });
    expect(await db.selectFrom("class_credit_ledger_entries").select(["amount", "source"])
      .where("student_user_id", "=", reschedulingStudent.id)
      .orderBy("created_at").execute()).toEqual([
      { amount: 1, source: "CREDIT_ADJUSTMENT" },
      { amount: -1, source: "BOOKING_DEDUCTION" },
    ]);
    expect(await db.selectFrom("schedule_commitments").select(["class_session_id", "active"])
      .where("user_id", "=", reschedulingStudent.id).orderBy("class_session_id").execute())
      .toEqual(expect.arrayContaining([
        { class_session_id: originalSessionId, active: false },
        { class_session_id: replacementSessionId, active: true },
      ]));
    expect(await db.selectFrom("bookings").select("rescheduled_from_booking_id")
      .where("student_user_id", "=", reschedulingStudent.id)
      .where("state", "=", "ACTIVE").executeTakeFirstOrThrow())
      .toEqual({ rescheduled_from_booking_id: originalBookingId });
    expect(await db.selectFrom("audit_entries").select(["operation", "outcome", "reason_code"])
      .where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({
      operation: "booking.rescheduled",
      outcome: "SUCCEEDED",
      reason_code: "BOOKING_RESCHEDULED",
    });
    expect(await db.selectFrom("in_app_notifications").select("message_id")
      .where("source_reference", "=", `booking.rescheduled:${originalBookingId}`)
      .executeTakeFirstOrThrow()).toEqual({ message_id: "booking.rescheduled.student" });
    expect(await db.selectFrom("class_session_reminders").select(["class_session_id", "terminal_outcome"])
      .where("recipient_user_id", "=", reschedulingStudent.id).orderBy("class_session_id").execute())
      .toEqual(expect.arrayContaining([
        { class_session_id: originalSessionId, terminal_outcome: "SUPPRESSED" },
        { class_session_id: replacementSessionId, terminal_outcome: null },
      ]));
    await deliverDueClassSessionReminders(
      db,
      new Date("2026-08-12T14:00:00.000Z"),
      `rescheduled-reminder-${randomUUID()}`,
    );
    expect(await db.selectFrom("in_app_notifications").select(["message_id", "variables"])
      .where("recipient_user_id", "=", reschedulingStudent.id)
      .where("message_id", "=", "class-session.reminder.student").executeTakeFirstOrThrow())
      .toEqual({
        message_id: "class-session.reminder.student",
        variables: expect.objectContaining({ classSessionId: replacementSessionId }),
      });
  });

  it("leaves the original Booking and Class Credit unchanged when a replacement is ineligible", async () => {
    const reschedulingStudent = await createStudentWithCredits(1);
    const originalTeacher = await createTeacher();
    const replacementTeacher = await createTeacher();
    const originalSessionId = await insertClassSession("2026-08-20T14:00:00.000Z", originalTeacher.id);
    const fullReplacementId = await insertClassSession("2026-08-22T14:00:00.000Z", replacementTeacher.id);
    const firstFiller = await createStudentWithCredits(1);
    const secondFiller = await createStudentWithCredits(1);
    await bookAs(firstFiller.subject, fullReplacementId);
    await bookAs(secondFiller.subject, fullReplacementId);
    const booked = await bookAs(reschedulingStudent.subject, originalSessionId) as BookingMutationResponse;

    expect(await rescheduleAs(
      reschedulingStudent.subject,
      booked.data.bookClassSession.booking.id,
      fullReplacementId,
    )).toEqual({ data: { rescheduleBooking: { code: "SESSION_FULL" } } });
    expect(await db.selectFrom("bookings").select(["state", "terminal_reason"])
      .where("id", "=", booked.data.bookClassSession.booking.id).executeTakeFirstOrThrow())
      .toEqual({ state: "ACTIVE", terminal_reason: null });
    expect(await db.selectFrom("class_credit_accounts").select("available_balance")
      .where("student_user_id", "=", reschedulingStudent.id).executeTakeFirstOrThrow())
      .toEqual({ available_balance: 0 });
    expect(await db.selectFrom("class_sessions").select(["id", "occupied_seats"])
      .where("id", "in", [originalSessionId, fullReplacementId]).orderBy("id").execute())
      .toEqual(expect.arrayContaining([
        { id: originalSessionId, occupied_seats: 1 },
        { id: fullReplacementId, occupied_seats: 2 },
      ]));
  });

  it("replays one durable replacement Booking for the same reschedule Idempotency Key", async () => {
    const reschedulingStudent = await createStudentWithCredits(1);
    const originalTeacher = await createTeacher();
    const replacementTeacher = await createTeacher();
    const originalSessionId = await insertClassSession("2026-08-23T14:00:00.000Z", originalTeacher.id);
    const replacementSessionId = await insertClassSession("2026-08-24T14:00:00.000Z", replacementTeacher.id);
    const booked = await bookAs(reschedulingStudent.subject, originalSessionId) as BookingMutationResponse;
    const idempotencyKey = randomUUID();

    const first = await rescheduleAs(reschedulingStudent.subject, booked.data.bookClassSession.booking.id, replacementSessionId, idempotencyKey);
    const replay = await rescheduleAs(reschedulingStudent.subject, booked.data.bookClassSession.booking.id, replacementSessionId, idempotencyKey);

    expect(replay).toEqual(first);
    expect(await db.selectFrom("bookings").select("id")
      .where("student_user_id", "=", reschedulingStudent.id).execute()).toHaveLength(2);
    expect(await db.selectFrom("in_app_notifications").select("id")
      .where("recipient_user_id", "=", reschedulingStudent.id)
      .where("message_id", "=", "booking.rescheduled.student").execute()).toHaveLength(1);
  });

  it("preserves atomic reschedule and replay invariants across generated replacement capacity states", async () => {
    await fc.assert(fc.asyncProperty(
      fc.boolean(),
      fc.integer({ min: 1, max: 4 }),
      async (replacementIsFull, replayCount) => {
        const reschedulingStudent = await createStudentWithCredits(1);
        const originalTeacher = await createTeacher();
        const replacementTeacher = await createTeacher();
        const originalSessionId = await insertClassSession("2026-08-25T18:00:00.000Z", originalTeacher.id);
        const replacementSessionId = await insertClassSession("2026-08-26T18:00:00.000Z", replacementTeacher.id);
        if (replacementIsFull) {
          const firstFiller = await createStudentWithCredits(1);
          const secondFiller = await createStudentWithCredits(1);
          await bookAs(firstFiller.subject, replacementSessionId);
          await bookAs(secondFiller.subject, replacementSessionId);
        }
        const booked = await bookAs(reschedulingStudent.subject, originalSessionId) as BookingMutationResponse;
        const originalBookingId = booked.data.bookClassSession.booking.id;
        const idempotencyKey = randomUUID();

        const outcomes: unknown[] = [];
        for (let replay = 0; replay < replayCount; replay += 1) {
          outcomes.push(await rescheduleAs(
            reschedulingStudent.subject,
            originalBookingId,
            replacementSessionId,
            idempotencyKey,
          ));
        }

        expect(outcomes.every((outcome) => JSON.stringify(outcome) === JSON.stringify(outcomes[0])))
          .toBe(true);
        const studentBookings = await db.selectFrom("bookings").select(["state", "rescheduled_from_booking_id"])
          .where("student_user_id", "=", reschedulingStudent.id).orderBy("booked_at").execute();
        expect(studentBookings).toEqual(replacementIsFull
          ? [{ state: "ACTIVE", rescheduled_from_booking_id: null }]
          : [
              { state: "ENDED", rescheduled_from_booking_id: null },
              { state: "ACTIVE", rescheduled_from_booking_id: originalBookingId },
            ]);
        expect(await db.selectFrom("class_credit_accounts").select("available_balance")
          .where("student_user_id", "=", reschedulingStudent.id).executeTakeFirstOrThrow())
          .toEqual({ available_balance: 0 });
      },
    ), { numRuns: 6 });
  }, 30_000);

  it("applies replacement timing, Lesson Unit, publication, and dual-role Schedule Conflict rules", async () => {
    const reschedulingStudent = await createStudentWithCredits(1, true);
    const originalTeacher = await createTeacher();
    const originalSessionId = await insertClassSession("2026-08-25T18:00:00.000Z", originalTeacher.id);
    const booked = await bookAs(reschedulingStudent.subject, originalSessionId) as BookingMutationResponse;
    const originalBookingId = booked.data.bookClassSession.booking.id;

    const closedTeacher = await createTeacher();
    const closedSessionId = await insertClassSession("2026-08-10T12:29:59.999Z", closedTeacher.id);
    expect(await rescheduleAs(reschedulingStudent.subject, originalBookingId, closedSessionId))
      .toEqual({ data: { rescheduleBooking: { code: "BOOKING_WINDOW_CLOSED" } } });

    const originalLesson = await db.selectFrom("lesson_units").select("course_id")
      .where("id", "=", lessonUnitId).executeTakeFirstOrThrow();
    const otherLessonUnit = await db.transaction().execute(async (transaction) => {
      const lessonUnit = await transaction.insertInto("lesson_units").values({
        stable_key: "es-b1-98",
        course_id: originalLesson.course_id,
        title: "Different Lesson Unit",
        summary: "Different content",
        objectives: JSON.stringify(["Practice something different"]),
        sort_order: 2,
        state: "ACTIVE",
        replacement_lesson_unit_id: null,
        retired_at: null,
      }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values({
        lesson_unit_id: lessonUnit.id,
        topic_key: "BK",
      }).execute();
      return lessonUnit;
    });
    const mismatchTeacher = await createTeacher();
    const mismatchSessionId = await insertClassSession(
      "2026-08-27T18:00:00.000Z",
      mismatchTeacher.id,
      { lessonUnitId: otherLessonUnit.id },
    );
    expect(await rescheduleAs(reschedulingStudent.subject, originalBookingId, mismatchSessionId))
      .toEqual({ data: { rescheduleBooking: { code: "LESSON_UNIT_MISMATCH" } } });

    const cancelledTeacher = await createTeacher();
    const cancelledSessionId = await insertClassSession(
      "2026-08-28T18:00:00.000Z",
      cancelledTeacher.id,
      { state: "CANCELLED" },
    );
    expect(await rescheduleAs(reschedulingStudent.subject, originalBookingId, cancelledSessionId))
      .toEqual({ data: { rescheduleBooking: { code: "CLASS_SESSION_NOT_FOUND" } } });

    await insertClassSession("2026-08-29T18:00:00.000Z", reschedulingStudent.id);
    const conflictTeacher = await createTeacher();
    const conflictSessionId = await insertClassSession("2026-08-29T18:30:00.000Z", conflictTeacher.id);
    expect(await rescheduleAs(reschedulingStudent.subject, originalBookingId, conflictSessionId))
      .toEqual({ data: { rescheduleBooking: { code: "SCHEDULE_CONFLICT" } } });
    expect(await db.selectFrom("bookings").select(["state", "terminal_reason"])
      .where("id", "=", originalBookingId).executeTakeFirstOrThrow())
      .toEqual({ state: "ACTIVE", terminal_reason: null });
  });

  it("serializes concurrent reschedules for the final replacement seat", async () => {
    const targetTeacher = await createTeacher();
    const replacementSessionId = await insertClassSession("2026-08-30T18:00:00.000Z", targetTeacher.id);
    const filler = await createStudentWithCredits(1);
    await bookAs(filler.subject, replacementSessionId);
    const contenders = await Promise.all([createStudentWithCredits(1), createStudentWithCredits(1)]);
    const originalBookings = await Promise.all(contenders.map(async (contender, index) => {
      const teacher = await createTeacher();
      const sessionId = await insertClassSession(
        `2026-08-${31 - index}T20:00:00.000Z`,
        teacher.id,
      );
      const booked = await bookAs(contender.subject, sessionId) as BookingMutationResponse;
      return booked.data.bookClassSession.booking.id;
    }));

    const outcomes = await Promise.all(contenders.map((contender, index) =>
      rescheduleAs(contender.subject, originalBookings[index]!, replacementSessionId))) as Array<{
      data: { rescheduleBooking: { replacementBooking?: { id: string }; code?: string } };
    }>;

    expect(outcomes.filter(({ data }) => data.rescheduleBooking.replacementBooking)).toHaveLength(1);
    expect(outcomes.filter(({ data }) => data.rescheduleBooking.code === "SESSION_FULL")).toHaveLength(1);
    expect(await db.selectFrom("class_sessions").select("occupied_seats")
      .where("id", "=", replacementSessionId).executeTakeFirstOrThrow()).toEqual({ occupied_seats: 2 });
    expect(await db.selectFrom("class_credit_accounts").select("available_balance")
      .where("student_user_id", "in", contenders.map(({ id }) => id)).execute())
      .toEqual(expect.arrayContaining([{ available_balance: 0 }, { available_balance: 0 }]));
  });

  it("forfeits the Class Credit for a late Student Cancellation before the Class Session starts", async () => {
    const lateStudent = await createStudentWithCredits(1);
    const lateSessionId = await insertClassSession("2026-08-11T11:00:00.000Z");
    const booked = await bookAs(lateStudent.subject, lateSessionId) as BookingMutationResponse;
    const bookingId = booked.data.bookClassSession.booking.id;

    const result = await graphqlAs(lateStudent.subject, `
      mutation Cancel($input: CancelBookingInput!) {
        cancelBooking(input: $input) {
          ... on CancelBookingSuccess {
            booking { state terminalReason classCreditRefunded }
            account { availableBalance }
          }
          ... on BookingError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), bookingId } });

    expect(result).toEqual({ data: { cancelBooking: {
      booking: {
        state: "ENDED",
        terminalReason: "STUDENT_CANCELLATION",
        classCreditRefunded: false,
      },
      account: { availableBalance: 0 },
    } } });
    expect(await db.selectFrom("class_credit_ledger_entries").select("source")
      .where("source_reference", "=", bookingId).execute()).toEqual([
      { source: "BOOKING_DEDUCTION" },
    ]);
  });

  it("serializes concurrent attempts for the final seat without losing or duplicating Class Credits", async () => {
    const filler = await createStudentWithCredits(1);
    const firstContender = await createStudentWithCredits(2);
    const secondContender = await createStudentWithCredits(2);
    const sessionId = await insertClassSession("2026-08-13T14:00:00.000Z");
    await bookAs(filler.subject, sessionId);

    const outcomes = await Promise.all([
      bookAs(firstContender.subject, sessionId),
      bookAs(secondContender.subject, sessionId),
    ]) as Array<{
      data: { bookClassSession: { booking?: { id: string }; code?: string } };
    }>;

    expect(outcomes.filter(({ data }) => data.bookClassSession.booking)).toHaveLength(1);
    expect(outcomes.filter(({ data }) => data.bookClassSession.code === "SESSION_FULL")).toHaveLength(1);
    expect(await db.selectFrom("class_sessions").select("occupied_seats")
      .where("id", "=", sessionId).executeTakeFirstOrThrow()).toEqual({ occupied_seats: 2 });
    const balances = await db.selectFrom("class_credit_accounts").select(["student_user_id", "available_balance"])
      .where("student_user_id", "in", [firstContender.id, secondContender.id]).execute();
    expect(balances.reduce((sum, account) => sum + account.available_balance, 0)).toBe(3);
    expect(await db.selectFrom("bookings").select("id")
      .where("class_session_id", "=", sessionId).where("state", "=", "ACTIVE").execute()).toHaveLength(2);
  });

  it("rejects a Schedule Conflict across the User's Student and Teacher commitments", async () => {
    const multiRoleUser = await createStudentWithCredits(1, true);
    const assignedSessionId = await insertClassSession(
      "2026-08-14T14:00:00.000Z",
      multiRoleUser.id,
    );
    const otherTeacher = await createTeacher();
    const targetSessionId = await insertClassSession(
      "2026-08-14T14:30:00.000Z",
      otherTeacher.id,
    );

    const result = await bookAs(multiRoleUser.subject, targetSessionId);

    expect(result).toEqual({ data: { bookClassSession: { code: "SCHEDULE_CONFLICT" } } });
    expect(await db.selectFrom("schedule_commitments").select(["class_session_id", "commitment_role", "active"])
      .where("user_id", "=", multiRoleUser.id).execute()).toEqual([
      { class_session_id: assignedSessionId, commitment_role: "TEACHER", active: true },
    ]);
    expect(await db.selectFrom("class_credit_accounts").select("available_balance")
      .where("student_user_id", "=", multiRoleUser.id).executeTakeFirstOrThrow()).toEqual({ available_balance: 1 });
  });

  it("accepts Booking exactly 30 minutes before start and rejects it after the deadline", async () => {
    const boundaryStudent = await createStudentWithCredits(2);
    const exactDeadlineSessionId = await insertClassSession("2026-08-10T12:30:00.000Z");
    const otherTeacher = await createTeacher();
    const closedSessionId = await insertClassSession("2026-08-10T12:29:59.999Z", otherTeacher.id);

    expect(await bookAs(boundaryStudent.subject, exactDeadlineSessionId)).toMatchObject({
      data: { bookClassSession: { booking: { id: expect.any(String) } } },
    });
    expect(await bookAs(boundaryStudent.subject, closedSessionId)).toEqual({
      data: { bookClassSession: { code: "BOOKING_WINDOW_CLOSED" } },
    });
    expect(await db.selectFrom("class_credit_accounts").select("available_balance")
      .where("student_user_id", "=", boundaryStudent.id).executeTakeFirstOrThrow()).toEqual({ available_balance: 1 });
  });

  it("replays an identical Booking outcome and rejects changed input for the same Idempotency Key", async () => {
    const idempotentStudent = await createStudentWithCredits(2);
    const firstSessionId = await insertClassSession("2026-08-15T14:00:00.000Z");
    const secondSessionId = await insertClassSession("2026-08-15T16:00:00.000Z");
    const idempotencyKey = randomUUID();

    const first = await bookAs(idempotentStudent.subject, firstSessionId, idempotencyKey);
    const replay = await bookAs(idempotentStudent.subject, firstSessionId, idempotencyKey);
    const mismatched = await bookAs(idempotentStudent.subject, secondSessionId, idempotencyKey);

    expect(replay).toEqual(first);
    expect(mismatched).toEqual({ data: { bookClassSession: { code: "IDEMPOTENCY_KEY_REUSED" } } });
    expect(await db.selectFrom("bookings").select("id")
      .where("student_user_id", "=", idempotentStudent.id).execute()).toHaveLength(1);
    expect(await db.selectFrom("class_credit_ledger_entries").select("id")
      .where("student_user_id", "=", idempotentStudent.id)
      .where("source", "=", "BOOKING_DEDUCTION").execute()).toHaveLength(1);
    expect(await db.selectFrom("in_app_notifications").select("id")
      .where("recipient_user_id", "=", idempotentStudent.id)
      .where("message_id", "=", "booking.created.student").execute()).toHaveLength(1);
  });

  it("returns typed failures for insufficient Class Credits and inactive or unrelated Bookings", async () => {
    const noCreditStudent = await createStudentWithCredits(0);
    const otherStudent = await createStudentWithCredits(1);
    const sessionId = await insertClassSession("2026-08-16T14:00:00.000Z");
    const otherSessionId = await insertClassSession("2026-08-16T16:00:00.000Z");
    const otherBooking = await bookAs(otherStudent.subject, otherSessionId) as BookingMutationResponse;

    expect(await bookAs(noCreditStudent.subject, sessionId)).toEqual({
      data: { bookClassSession: { code: "INSUFFICIENT_CLASS_CREDITS" } },
    });
    expect(await cancelAs(noCreditStudent.subject, otherBooking.data.bookClassSession.booking.id)).toEqual({
      data: { cancelBooking: { code: "BOOKING_NOT_FOUND" } },
    });
    const cancelled = await cancelAs(otherStudent.subject, otherBooking.data.bookClassSession.booking.id);
    expect(cancelled).toMatchObject({ data: { cancelBooking: { booking: { state: "ENDED" } } } });
    expect(await cancelAs(otherStudent.subject, otherBooking.data.bookClassSession.booking.id)).toEqual({
      data: { cancelBooking: { code: "BOOKING_NOT_ACTIVE" } },
    });
  });

  it("denies Booking mutations without a Student Role Assignment and records the sensitive denial", async () => {
    const teacher = await createTeacher();
    const sessionId = await insertClassSession("2026-08-17T14:00:00.000Z");
    const correlationId = `booking-role-denied-${randomUUID()}`;

    const result = await graphqlAs(teacher.subject, `
      mutation Book($input: BookClassSessionInput!) {
        bookClassSession(input: $input) {
          ... on BookClassSessionSuccess { booking { id } }
          ... on BookingError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), classSessionId: sessionId } }, correlationId) as {
      data: null;
      errors: Array<{ extensions: { code: string } }>;
    };

    expect(result.data).toBeNull();
    expect(result.errors[0]?.extensions.code).toBe("FORBIDDEN");
    expect(await db.selectFrom("audit_entries").select(["target_type", "outcome", "reason_code"])
      .where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({
      target_type: "Booking",
      outcome: "DENIED",
      reason_code: "STUDENT_ROLE_REQUIRED",
    });
  });

  it("denies rescheduling without a Student Role Assignment and audits the authenticated attempt", async () => {
    const teacher = await createTeacher();
    const correlationId = `booking-reschedule-role-denied-${randomUUID()}`;

    const result = await graphqlAs(teacher.subject, `
      mutation Reschedule($input: RescheduleBookingInput!) {
        rescheduleBooking(input: $input) {
          ... on RescheduleBookingSuccess { replacementBooking { id } }
          ... on BookingError { code }
        }
      }
    `, { input: {
      idempotencyKey: randomUUID(),
      bookingId: randomUUID(),
      replacementClassSessionId: randomUUID(),
    } }, correlationId) as {
      data: null;
      errors: Array<{ extensions: { code: string } }>;
    };

    expect(result.data).toBeNull();
    expect(result.errors[0]?.extensions.code).toBe("FORBIDDEN");
    expect(await db.selectFrom("audit_entries").select(["operation", "target_type", "outcome", "reason_code"])
      .where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({
      operation: "booking.rescheduled",
      target_type: "Booking",
      outcome: "DENIED",
      reason_code: "STUDENT_ROLE_REQUIRED",
    });
  });

  it("rejects malformed reschedule identifiers at the GraphQL boundary and audits the denial", async () => {
    const correlationId = `booking-reschedule-input-denied-${randomUUID()}`;
    const result = await graphql(`
      mutation Reschedule($input: RescheduleBookingInput!) {
        rescheduleBooking(input: $input) {
          ... on RescheduleBookingSuccess { replacementBooking { id } }
          ... on BookingError { code }
        }
      }
    `, { input: {
      idempotencyKey: randomUUID(),
      bookingId: "not-a-booking-id",
      replacementClassSessionId: "not-a-class-session-id",
    } }, correlationId) as {
      data: null;
      errors: Array<{ extensions: { code: string } }>;
    };

    expect(result.data).toBeNull();
    expect(result.errors[0]?.extensions.code).toBe("BAD_USER_INPUT");
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"])
      .where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({
      outcome: "DENIED",
      reason_code: "INVALID_RESCHEDULE_BOOKING_INPUT",
    });
  });

  it("delivers the durable Student reminder through the background worker exactly once", async () => {
    const remindedStudent = await createStudentWithCredits(1);
    const sessionId = await insertClassSession("2026-08-18T14:00:00.000Z");
    await bookAs(remindedStudent.subject, sessionId);

    await deliverDueClassSessionReminders(db, new Date("2026-08-17T14:00:00.000Z"), "student-reminder-first");
    await deliverDueClassSessionReminders(db, new Date("2026-08-17T14:00:00.000Z"), "student-reminder-replay");

    expect(await db.selectFrom("in_app_notifications").select(["message_id", "variables"])
      .where("recipient_user_id", "=", remindedStudent.id)
      .where("message_id", "like", "class-session.reminder.%").execute()).toEqual([{
      message_id: "class-session.reminder.student",
      variables: expect.objectContaining({ classSessionId: sessionId }),
    }]);
    expect(await db.selectFrom("class_session_reminders").select("terminal_outcome")
      .where("class_session_id", "=", sessionId)
      .where("recipient_user_id", "=", remindedStudent.id).executeTakeFirstOrThrow()).toEqual({ terminal_outcome: "DELIVERED" });
  });

  it("allows a Student to create a new active Booking after preserving an earlier cancellation in history", async () => {
    const returningStudent = await createStudentWithCredits(1);
    const sessionId = await insertClassSession("2026-08-19T14:00:00.000Z");
    const first = await bookAs(returningStudent.subject, sessionId) as BookingMutationResponse;
    await cancelAs(returningStudent.subject, first.data.bookClassSession.booking.id);

    const second = await bookAs(returningStudent.subject, sessionId);

    expect(second).toMatchObject({ data: { bookClassSession: { booking: { id: expect.any(String) } } } });
    expect(await db.selectFrom("bookings").select(["id", "state"])
      .where("student_user_id", "=", returningStudent.id)
      .where("class_session_id", "=", sessionId)
      .orderBy("booked_at").execute()).toEqual([
      { id: first.data.bookClassSession.booking.id, state: "ENDED" },
      { id: expect.any(String), state: "ACTIVE" },
    ]);
    expect(await db.selectFrom("schedule_commitments").select("active")
      .where("user_id", "=", returningStudent.id)
      .where("class_session_id", "=", sessionId).execute()).toEqual([{ active: true }]);
  });

  it("returns the Class Credit for a late Student Cancellation after a Teacher Substitution", async () => {
    const substitutedStudent = await createStudentWithCredits(1);
    const originalTeacher = await createTeacher();
    const replacementTeacher = await createTeacher();
    const sessionId = await insertClassSession("2026-08-11T10:00:00.000Z", originalTeacher.id);
    const booked = await bookAs(substitutedStudent.subject, sessionId) as BookingMutationResponse;

    await db.updateTable("class_sessions").set({ teacher_user_id: replacementTeacher.id })
      .where("id", "=", sessionId).executeTakeFirstOrThrow();
    const cancelled = await cancelAs(substitutedStudent.subject, booked.data.bookClassSession.booking.id);

    expect(cancelled).toMatchObject({ data: { cancelBooking: {
      booking: { state: "ENDED", classCreditRefunded: true },
      account: { availableBalance: 1 },
    } } });
  });

  it("rejects persistence that would drift occupied seats from active Booking history", async () => {
    const driftStudent = await createStudentWithCredits(1);
    const driftTeacher = await createTeacher();
    const sessionId = await insertClassSession("2026-08-21T14:00:00.000Z", driftTeacher.id);

    await expect(db.transaction().execute(async (transaction) => {
      await transaction.insertInto("bookings").values({
        student_user_id: driftStudent.id,
        class_session_id: sessionId,
        teacher_user_id_at_booking: driftTeacher.id,
        state: "ACTIVE",
        terminal_reason: null,
        class_credit_refunded: false,
        late_cancellation_refund_until: null,
        ended_at: null,
      }).execute();
    })).rejects.toThrow("occupied seats must equal active Booking history");

    await bookAs(driftStudent.subject, sessionId);
    await expect(db.transaction().execute(async (transaction) => {
      await transaction.updateTable("class_sessions").set({ occupied_seats: 0 })
        .where("id", "=", sessionId).execute();
    })).rejects.toThrow("occupied seats must equal active Booking history");
  });

  async function insertClassSession(
    startsAt: string,
    assignedTeacherId = teacherId,
    options: {
      lessonUnitId?: string;
      seatCapacity?: number;
      state?: "PUBLISHED" | "CANCELLED";
    } = {},
  ) {
    return (await db.insertInto("class_sessions").values({
      lesson_unit_id: options.lessonUnitId ?? lessonUnitId,
      teacher_user_id: assignedTeacherId,
      starts_at: new Date(startsAt),
      scheduling_time_zone: "America/Denver",
      seat_capacity: options.seatCapacity ?? 2,
      occupied_seats: 0,
      state: options.state ?? "PUBLISHED",
    }).returning("id").executeTakeFirstOrThrow()).id;
  }

  async function book(sessionId: string, idempotencyKey = randomUUID()) {
    return bookAs(studentSubject, sessionId, idempotencyKey);
  }

  async function bookAs(subject: string, sessionId: string, idempotencyKey = randomUUID()) {
    return graphqlAs(subject, `
      mutation Book($input: BookClassSessionInput!) {
        bookClassSession(input: $input) {
          ... on BookClassSessionSuccess { booking { id } account { availableBalance } }
          ... on BookingError { code }
        }
      }
    `, { input: { idempotencyKey, classSessionId: sessionId } });
  }

  async function cancelAs(subject: string, bookingId: string, idempotencyKey = randomUUID()) {
    return graphqlAs(subject, `
      mutation Cancel($input: CancelBookingInput!) {
        cancelBooking(input: $input) {
          ... on CancelBookingSuccess {
            booking { id state classCreditRefunded }
            account { availableBalance }
          }
          ... on BookingError { code }
        }
      }
    `, { input: { idempotencyKey, bookingId } });
  }

  async function rescheduleAs(
    subject: string,
    bookingId: string,
    replacementClassSessionId: string,
    idempotencyKey: string = randomUUID(),
    correlationId: string = randomUUID(),
  ) {
    return graphqlAs(subject, `
      mutation Reschedule($input: RescheduleBookingInput!) {
        rescheduleBooking(input: $input) {
          ... on RescheduleBookingSuccess {
            originalBooking { id state terminalReason classSession { id occupiedSeats } }
            replacementBooking { id state terminalReason classSession { id occupiedSeats } }
            account { availableBalance }
          }
          ... on BookingError { code }
        }
      }
    `, { input: { idempotencyKey, bookingId, replacementClassSessionId } }, correlationId);
  }

  async function createStudentWithCredits(availableBalance: number, teacherRole = false) {
    const id = randomUUID();
    const subject = randomUUID();
    await db.insertInto("users").values({
      id,
      identity_issuer: "https://fake.local/",
      identity_subject: subject,
      display_name: "Test Student",
      interface_locale: "en",
      display_time_zone: "America/Denver",
    }).execute();
    await db.insertInto("role_assignments").values([
      { user_id: id, role: "STUDENT" },
      ...(teacherRole ? [{ user_id: id, role: "TEACHER" as const }] : []),
    ]).execute();
    await db.insertInto("class_credit_accounts").values({
      student_user_id: id,
      available_balance: availableBalance,
    }).execute();
    if (availableBalance > 0) {
      await db.insertInto("class_credit_ledger_entries").values({
        student_user_id: id,
        amount: availableBalance,
        source: "CREDIT_ADJUSTMENT",
        source_reference: randomUUID(),
        reason: "Initial test balance",
      }).execute();
    }
    if (teacherRole) {
      await db.insertInto("teacher_qualifications").values({
        teacher_user_id: id,
        target_language: "es",
        curriculum_level: "B1",
        granted_by_user_id: id,
      }).execute();
    }
    return { id, subject };
  }

  async function createTeacher() {
    const id = randomUUID();
    const subject = randomUUID();
    await db.insertInto("users").values({
      id,
      identity_issuer: "https://fake.local/",
      identity_subject: subject,
      display_name: "Test Teacher",
      interface_locale: "en",
      display_time_zone: "America/Denver",
    }).execute();
    await db.insertInto("role_assignments").values({ user_id: id, role: "TEACHER" }).execute();
    await db.insertInto("teacher_qualifications").values({
      teacher_user_id: id,
      target_language: "es",
      curriculum_level: "B1",
      granted_by_user_id: id,
    }).execute();
    return { id, subject };
  }

  async function graphql(
    query: string,
    variables?: Record<string, unknown>,
    correlationId: string = randomUUID(),
  ) {
    return graphqlAs(studentSubject, query, variables, correlationId);
  }

  async function graphqlAs(
    subject: string,
    query: string,
    variables?: Record<string, unknown>,
    correlationId: string = randomUUID(),
  ) {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
        "x-demo-user-id": subject,
      },
      body: JSON.stringify({ query, variables }),
    });
    return await response.json();
  }
});

type BookingMutationResponse = {
  data: { bookClassSession: { booking: { id: string }; account: { availableBalance: number } } };
};
