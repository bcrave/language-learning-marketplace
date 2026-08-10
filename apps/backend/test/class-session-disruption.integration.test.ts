import { randomUUID } from "node:crypto";

import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApi } from "../src/api/app.js";
import { createDatabase, type Database } from "../src/database/database.js";
import { migrateDatabase } from "../src/database/migrate.js";

describe("Class Session disruption GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  const now = new Date("2026-08-10T12:00:00.000Z");
  let currentNow = now;
  const administratorId = randomUUID();
  const administratorSubject = randomUUID();
  const teacherId = randomUUID();
  const teacherSubject = randomUUID();
  const studentId = randomUUID();
  const studentSubject = randomUUID();
  let classSessionId: string;
  let bookingId: string;
  let absenceRequestId: string;
  let lessonUnitId: string;

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `class_session_disruption_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test", now: () => currentNow });

    await db.insertInto("users").values([
      { id: administratorId, identity_issuer: "https://fake.local/", identity_subject: administratorSubject, display_name: "Alex Administrator", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: teacherId, identity_issuer: "https://fake.local/", identity_subject: teacherSubject, display_name: "Taylor Teacher", interface_locale: "es", display_time_zone: "America/Denver" },
      { id: studentId, identity_issuer: "https://fake.local/", identity_subject: studentSubject, display_name: "Sam Student", interface_locale: "en", display_time_zone: "America/Denver" },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: administratorId, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: teacherId, role: "TEACHER" },
      { user_id: studentId, role: "STUDENT" },
    ]).execute();
    const course = await db.insertInto("courses").values({ stable_key: "es-b1", target_language: "es", curriculum_level: "B1", title: "Spanish B1", summary: "Intermediate Spanish" }).returning("id").executeTakeFirstOrThrow();
    await db.insertInto("topics").values({ key: "DS", label_en: "Disruption", label_es: "Interrupción" }).execute();
    const lessonUnit = await db.transaction().execute(async (transaction) => {
      const unit = await transaction.insertInto("lesson_units").values({ stable_key: "es-b1-99", course_id: course.id, title: "Conversation", summary: "Practice", objectives: JSON.stringify(["Converse"]), sort_order: 1, state: "ACTIVE", replacement_lesson_unit_id: null, retired_at: null }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: unit.id, topic_key: "DS" }).execute();
      return unit;
    });
    lessonUnitId = lessonUnit.id;
    await db.insertInto("teacher_qualifications").values({ teacher_user_id: teacherId, target_language: "es", curriculum_level: "B1", granted_by_user_id: administratorId }).execute();
    classSessionId = (await db.insertInto("class_sessions").values({ lesson_unit_id: lessonUnit.id, teacher_user_id: teacherId, starts_at: new Date("2026-08-11T10:00:00.000Z"), scheduling_time_zone: "America/Denver", seat_capacity: 5, occupied_seats: 1, state: "PUBLISHED" }).returning("id").executeTakeFirstOrThrow()).id;
    bookingId = (await db.insertInto("bookings").values({ student_user_id: studentId, class_session_id: classSessionId, teacher_user_id_at_booking: teacherId, state: "ACTIVE", terminal_reason: null, class_credit_refunded: false, late_cancellation_refund_until: null, booked_at: now, ended_at: null }).returning("id").executeTakeFirstOrThrow()).id;
    await db.insertInto("class_credit_accounts").values({ student_user_id: studentId, available_balance: 0 }).execute();
    await db.insertInto("schedule_commitments").values({ user_id: studentId, class_session_id: classSessionId, commitment_role: "STUDENT", starts_at: new Date("2026-08-11T10:00:00.000Z"), ends_at: new Date("2026-08-11T11:00:00.000Z"), active: true }).execute();
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("records an Absence Request without changing the published Class Session or active Booking", async () => {
    const correlationId = `absence-${randomUUID()}`;
    const result = await graphql(`
      mutation ReportAbsence($input: ReportAbsenceInput!) {
        reportAbsence(input: $input) {
          ... on ReportAbsenceSuccess {
            absenceRequest { id state classSessions { id state teacherUserId startsAt } }
          }
          ... on ClassSessionDisruptionError { code message }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), classSessionIds: [classSessionId] } }, correlationId, teacherSubject);

    expect(result.errors).toBeUndefined();
    expect(result).toMatchObject({ data: { reportAbsence: { absenceRequest: {
      id: expect.any(String),
      state: "OPEN",
      classSessions: [{ id: classSessionId, state: "PUBLISHED", teacherUserId: teacherId, startsAt: "2026-08-11T10:00:00Z" }],
    } } } });
    absenceRequestId = (await db.selectFrom("absence_requests").select("id").where("teacher_user_id", "=", teacherId).executeTakeFirstOrThrow()).id;
    expect(await db.selectFrom("bookings").select("state").where("id", "=", bookingId).executeTakeFirstOrThrow()).toEqual({ state: "ACTIVE" });
    expect(await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", administratorId).execute()).toContainEqual({ message_id: "absence-request.created.administrator" });
    expect(await db.selectFrom("email_notification_intents").select(["variables", "rendered_content"]).where("recipient_user_id", "=", administratorId).where("message_id", "=", "absence-request.created.administrator").executeTakeFirstOrThrow()).toMatchObject({ variables: { classSessionIds: classSessionId, resolutionLink: `/administration/operations?absenceRequestId=${absenceRequestId}` }, rendered_content: expect.stringContaining(classSessionId) });
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({ outcome: "SUCCEEDED", reason_code: "ABSENCE_REQUEST_CREATED" });
  });

  it("substitutes a matching-qualified Teacher while preserving the Class Session and refunding a later Student Cancellation", async () => {
    const replacementTeacherId = randomUUID();
    await db.insertInto("users").values({ id: replacementTeacherId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Riley Replacement", interface_locale: "en", display_time_zone: "America/Denver" }).execute();
    await db.insertInto("role_assignments").values({ user_id: replacementTeacherId, role: "TEACHER" }).execute();
    await db.insertInto("teacher_qualifications").values({ teacher_user_id: replacementTeacherId, target_language: "es", curriculum_level: "B1", granted_by_user_id: administratorId }).execute();
    await db.insertInto("class_session_reminders").values({ class_session_id: classSessionId, recipient_user_id: teacherId, commitment_role: "TEACHER", due_at: new Date("2026-08-10T13:00:00.000Z"), terminal_outcome: null, completed_at: null }).execute();

    const substitution = await graphql(`
      mutation Substitute($input: SubstituteTeacherInput!) {
        substituteTeacher(input: $input) {
          ... on SubstituteTeacherSuccess { classSession { id teacherUserId startsAt state } absenceRequest { id state } }
          ... on ClassSessionDisruptionError { code message }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), absenceRequestId, classSessionId, replacementTeacherUserId: replacementTeacherId } });

    expect(substitution).toMatchObject({ data: { substituteTeacher: {
      classSession: { id: classSessionId, teacherUserId: replacementTeacherId, startsAt: "2026-08-11T10:00:00Z", state: "PUBLISHED" },
      absenceRequest: { id: absenceRequestId, state: "RESOLVED" },
    } } });
    expect(await db.selectFrom("schedule_commitments").select(["user_id", "active", "starts_at"]).where("class_session_id", "=", classSessionId).where("commitment_role", "=", "TEACHER").executeTakeFirstOrThrow()).toEqual({ user_id: replacementTeacherId, active: true, starts_at: new Date("2026-08-11T10:00:00.000Z") });
    expect(await db.selectFrom("class_session_reminders").select(["recipient_user_id", "terminal_outcome"]).where("class_session_id", "=", classSessionId).execute()).toEqual([{ recipient_user_id: teacherId, terminal_outcome: "SUPPRESSED" }]);
    const cancellation = await graphql(`
      mutation Cancel($input: CancelBookingInput!) {
        cancelBooking(input: $input) {
          ... on CancelBookingSuccess { booking { id classCreditRefunded state } account { availableBalance } }
          ... on BookingError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), bookingId } }, randomUUID(), studentSubject);
    expect(cancellation).toMatchObject({ data: { cancelBooking: { booking: { id: bookingId, classCreditRefunded: true, state: "ENDED" }, account: { availableBalance: 1 } } } });
    expect(await db.selectFrom("in_app_notifications").select(["recipient_user_id", "message_id"]).where("message_id", "in", ["class-session.teacher-removed.teacher", "class-session.teacher-substituted.teacher", "class-session.teacher-substituted.student"]).execute()).toEqual(expect.arrayContaining([
      { recipient_user_id: teacherId, message_id: "class-session.teacher-removed.teacher" },
      { recipient_user_id: replacementTeacherId, message_id: "class-session.teacher-substituted.teacher" },
      { recipient_user_id: studentId, message_id: "class-session.teacher-substituted.student" },
    ]));
    expect(await db.selectFrom("email_notification_intents").select(["variables", "rendered_content", "source_reference"]).where("recipient_user_id", "=", studentId).where("message_id", "=", "class-session.teacher-substituted.student").executeTakeFirstOrThrow()).toMatchObject({ variables: { replacementTeacherDisplayName: "Riley Replacement" }, rendered_content: expect.stringContaining("Riley Replacement"), source_reference: `class-session.teacher-substituted.student:${absenceRequestId}:${classSessionId}` });
    expect(await db.selectFrom("email_notification_intents").select("variables").where("recipient_user_id", "=", replacementTeacherId).where("message_id", "=", "class-session.teacher-substituted.teacher").executeTakeFirstOrThrow()).toMatchObject({ variables: { imminent: true } });
  });

  it("irreversibly cancels a Class Session with a reason, refunds Bookings, and removes Waitlist Entries", async () => {
    const session = await createSessionWithBooking("2026-08-13T16:00:00.000Z");
    const waitlistedStudentId = randomUUID();
    await db.insertInto("users").values({ id: waitlistedStudentId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Wendy Waitlist", interface_locale: "es", display_time_zone: "America/Denver" }).execute();
    await db.insertInto("role_assignments").values({ user_id: waitlistedStudentId, role: "STUDENT" }).execute();
    await db.insertInto("waitlist_entries").values({ student_user_id: waitlistedStudentId, class_session_id: session.classSessionId, state: "ACTIVE", terminal_reason: null, joined_at: now, expires_at: new Date("2026-08-13T14:00:00.000Z"), completed_at: null, promoted_booking_id: null }).execute();
    const request = await reportAbsenceFor(session.classSessionId);

    const cancellation = await graphql(`
      mutation CancelSession($input: CancelClassSessionInput!) {
        cancelClassSession(input: $input) {
          ... on CancelClassSessionSuccess { classSession { id state cancellationReason startsAt } absenceRequest { id state } refundedBookingCount removedWaitlistEntryCount }
          ... on ClassSessionDisruptionError { code message }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), absenceRequestId: request.id, classSessionId: session.classSessionId, reason: "Teacher unavailable and no qualified substitute accepted the assignment." } });

    expect(cancellation).toMatchObject({ data: { cancelClassSession: {
      classSession: { id: session.classSessionId, state: "CANCELLED", cancellationReason: "Teacher unavailable and no qualified substitute accepted the assignment.", startsAt: "2026-08-13T16:00:00Z" },
      absenceRequest: { id: request.id, state: "RESOLVED" },
      refundedBookingCount: 1,
      removedWaitlistEntryCount: 1,
    } } });
    expect(await db.selectFrom("bookings").select(["state", "terminal_reason", "class_credit_refunded"]).where("id", "=", session.bookingId).executeTakeFirstOrThrow()).toEqual({ state: "ENDED", terminal_reason: "CLASS_SESSION_CANCELLATION", class_credit_refunded: true });
    expect(await db.selectFrom("waitlist_entries").select(["state", "terminal_reason"]).where("class_session_id", "=", session.classSessionId).executeTakeFirstOrThrow()).toEqual({ state: "INELIGIBLE", terminal_reason: "CLASS_SESSION_UNAVAILABLE" });
    expect(await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", waitlistedStudentId).execute()).toContainEqual({ message_id: "waitlist-entry.ineligible.student" });
    const repeated = await graphql(`mutation CancelAgain($input: CancelClassSessionInput!) { cancelClassSession(input: $input) { ... on CancelClassSessionSuccess { classSession { id } } ... on ClassSessionDisruptionError { code } } }`, { input: { idempotencyKey: randomUUID(), absenceRequestId: request.id, classSessionId: session.classSessionId, reason: "Try again." } });
    expect(repeated).toMatchObject({ data: { cancelClassSession: { code: "DISRUPTION_ALREADY_RESOLVED" } } });
    await expect(db.updateTable("class_sessions").set({ state: "PUBLISHED", cancellation_reason: null, cancelled_at: null }).where("id", "=", session.classSessionId).execute()).rejects.toMatchObject({ code: "23514" });
    await expect(db.updateTable("class_sessions").set({ cancellation_reason: "A rewritten reason is forbidden." }).where("id", "=", session.classSessionId).execute()).rejects.toMatchObject({ code: "23514" });
  });

  it("rejects Class Session Cancellation after an Attendance Record submission", async () => {
    const session = await createSessionWithBooking("2026-08-14T16:00:00.000Z");
    const request = await reportAbsenceFor(session.classSessionId);
    await db.insertInto("attendance_records").values({ booking_id: session.bookingId, outcome: "ATTENDED" }).execute();
    const result = await graphql(`mutation CancelSession($input: CancelClassSessionInput!) { cancelClassSession(input: $input) { ... on CancelClassSessionSuccess { classSession { id } } ... on ClassSessionDisruptionError { code } } }`, { input: { idempotencyKey: randomUUID(), absenceRequestId: request.id, classSessionId: session.classSessionId, reason: "Cannot proceed." } });
    expect(result).toMatchObject({ data: { cancelClassSession: { code: "ATTENDANCE_ALREADY_SUBMITTED" } } });
    expect(await db.selectFrom("class_sessions").select("state").where("id", "=", session.classSessionId).executeTakeFirstOrThrow()).toEqual({ state: "PUBLISHED" });
  });

  it("rejects an unqualified substitute and denies disruption administration outside the Platform Administrator role", async () => {
    const session = await createSessionWithBooking("2026-08-15T16:00:00.000Z");
    const request = await reportAbsenceFor(session.classSessionId);
    const unqualifiedTeacherId = randomUUID();
    await db.insertInto("users").values({ id: unqualifiedTeacherId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Una Unqualified", interface_locale: "en", display_time_zone: "America/Denver" }).execute();
    await db.insertInto("role_assignments").values({ user_id: unqualifiedTeacherId, role: "TEACHER" }).execute();
    const substitution = await graphql(`mutation Substitute($input: SubstituteTeacherInput!) { substituteTeacher(input: $input) { ... on SubstituteTeacherSuccess { classSession { id } } ... on ClassSessionDisruptionError { code } } }`, { input: { idempotencyKey: randomUUID(), absenceRequestId: request.id, classSessionId: session.classSessionId, replacementTeacherUserId: unqualifiedTeacherId } });
    expect(substitution).toMatchObject({ data: { substituteTeacher: { code: "TEACHER_QUALIFICATION_REQUIRED" } } });

    const correlationId = `denied-disruption-${randomUUID()}`;
    const denied = await graphql(`{ administrationAbsenceRequests { id } }`, undefined, correlationId, studentSubject);
    expect(denied.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({ outcome: "DENIED", reason_code: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED" });

    const reportCorrelationId = `denied-report-absence-${randomUUID()}`;
    const deniedReport = await graphql(`mutation Report($input: ReportAbsenceInput!) { reportAbsence(input: $input) { ... on ReportAbsenceSuccess { absenceRequest { id } } ... on ClassSessionDisruptionError { code } } }`, { input: { idempotencyKey: randomUUID(), classSessionIds: [session.classSessionId] } }, reportCorrelationId, administratorSubject);
    expect(deniedReport.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    const substituteCorrelationId = `denied-substitute-${randomUUID()}`;
    const deniedSubstitute = await graphql(`mutation Substitute($input: SubstituteTeacherInput!) { substituteTeacher(input: $input) { ... on SubstituteTeacherSuccess { classSession { id } } ... on ClassSessionDisruptionError { code } } }`, { input: { idempotencyKey: randomUUID(), absenceRequestId: request.id, classSessionId: session.classSessionId, replacementTeacherUserId: unqualifiedTeacherId } }, substituteCorrelationId, studentSubject);
    expect(deniedSubstitute.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    const cancelCorrelationId = `denied-cancel-session-${randomUUID()}`;
    const deniedCancellation = await graphql(`mutation Cancel($input: CancelClassSessionInput!) { cancelClassSession(input: $input) { ... on CancelClassSessionSuccess { classSession { id } } ... on ClassSessionDisruptionError { code } } }`, { input: { idempotencyKey: randomUUID(), absenceRequestId: request.id, classSessionId: session.classSessionId, reason: "A valid but unauthorized cancellation reason." } }, cancelCorrelationId, studentSubject);
    expect(deniedCancellation.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    expect(await db.selectFrom("audit_entries").select(["correlation_id", "reason_code"]).where("correlation_id", "in", [reportCorrelationId, substituteCorrelationId, cancelCorrelationId]).orderBy("correlation_id").execute()).toEqual(expect.arrayContaining([
      { correlation_id: reportCorrelationId, reason_code: "TEACHER_ROLE_REQUIRED" },
      { correlation_id: substituteCorrelationId, reason_code: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED" },
      { correlation_id: cancelCorrelationId, reason_code: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED" },
    ]));
  });

  it("rejects resolution after the Class Session start instant", async () => {
    const session = await createSessionWithBooking("2026-08-16T16:00:00.000Z");
    const request = await reportAbsenceFor(session.classSessionId);
    currentNow = new Date("2026-08-16T16:00:00.000Z");
    try {
      const result = await graphql(`mutation CancelSession($input: CancelClassSessionInput!) { cancelClassSession(input: $input) { ... on CancelClassSessionSuccess { classSession { id } } ... on ClassSessionDisruptionError { code } } }`, { input: { idempotencyKey: randomUUID(), absenceRequestId: request.id, classSessionId: session.classSessionId, reason: "The request was not resolved before the start." } });
      expect(result).toMatchObject({ data: { cancelClassSession: { code: "CLASS_SESSION_ALREADY_STARTED" } } });
    } finally {
      currentNow = now;
    }
  });

  it("serializes Class Session Cancellation with Attendance submission", async () => {
    const session = await createSessionWithBooking("2026-08-17T16:00:00.000Z");
    const request = await reportAbsenceFor(session.classSessionId);
    const [cancellationAttempt, attendanceAttempt] = await Promise.allSettled([
      graphql(`mutation CancelSession($input: CancelClassSessionInput!) { cancelClassSession(input: $input) { ... on CancelClassSessionSuccess { refundedBookingCount } ... on ClassSessionDisruptionError { code } } }`, { input: { idempotencyKey: randomUUID(), absenceRequestId: request.id, classSessionId: session.classSessionId, reason: "Concurrent cancellation and Attendance submission." } }),
      db.insertInto("attendance_records").values({ booking_id: session.bookingId, outcome: "ATTENDED" }).execute(),
    ]);
    expect(cancellationAttempt.status).toBe("fulfilled");
    if (attendanceAttempt.status === "fulfilled") {
      expect(cancellationAttempt.status === "fulfilled" ? cancellationAttempt.value : null).toMatchObject({ data: { cancelClassSession: { code: "ATTENDANCE_ALREADY_SUBMITTED" } } });
      expect(await db.selectFrom("class_sessions").select("state").where("id", "=", session.classSessionId).executeTakeFirstOrThrow()).toEqual({ state: "PUBLISHED" });
    } else {
      expect(attendanceAttempt.reason).toMatchObject({ code: "23514" });
      expect(cancellationAttempt.status === "fulfilled" ? cancellationAttempt.value : null).toMatchObject({ data: { cancelClassSession: { refundedBookingCount: 1 } } });
    }
  });

  async function createSessionWithBooking(startsAt: string) {
    const classSessionId = (await db.insertInto("class_sessions").values({ lesson_unit_id: lessonUnitId, teacher_user_id: teacherId, starts_at: new Date(startsAt), scheduling_time_zone: "America/Denver", seat_capacity: 5, occupied_seats: 1, state: "PUBLISHED" }).returning("id").executeTakeFirstOrThrow()).id;
    const bookingId = (await db.insertInto("bookings").values({ student_user_id: studentId, class_session_id: classSessionId, teacher_user_id_at_booking: teacherId, state: "ACTIVE", terminal_reason: null, class_credit_refunded: false, late_cancellation_refund_until: null, booked_at: now, ended_at: null }).returning("id").executeTakeFirstOrThrow()).id;
    await db.insertInto("schedule_commitments").values({ user_id: studentId, class_session_id: classSessionId, commitment_role: "STUDENT", starts_at: new Date(startsAt), ends_at: new Date(new Date(startsAt).getTime() + 60 * 60_000), active: true }).execute();
    return { classSessionId, bookingId };
  }

  async function reportAbsenceFor(targetClassSessionId: string) {
    await graphql(`mutation Report($input: ReportAbsenceInput!) { reportAbsence(input: $input) { ... on ReportAbsenceSuccess { absenceRequest { id } } ... on ClassSessionDisruptionError { code } } }`, { input: { idempotencyKey: randomUUID(), classSessionIds: [targetClassSessionId] } }, randomUUID(), teacherSubject);
    return db.selectFrom("absence_requests").innerJoin("absence_request_sessions", "absence_request_sessions.absence_request_id", "absence_requests.id").select("absence_requests.id").where("absence_request_sessions.class_session_id", "=", targetClassSessionId).executeTakeFirstOrThrow();
  }

  async function graphql(source: string, variables?: Record<string, unknown>, correlationId: string = randomUUID(), subject: string = administratorSubject) {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", "x-correlation-id": correlationId, "x-demo-user-id": subject },
      body: JSON.stringify({ query: source, variables }),
    });
    return response.json() as Promise<{ data?: Record<string, unknown>; errors?: Array<{ extensions?: { code?: string } }> }>;
  }
});
