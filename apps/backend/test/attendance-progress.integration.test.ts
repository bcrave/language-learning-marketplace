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

describe("Attendance and Course Progress GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  const administratorId = randomUUID();
  const administratorSubject = randomUUID();
  const teacherId = randomUUID();
  const teacherSubject = randomUUID();
  const studentId = randomUUID();
  const studentSubject = randomUUID();
  const now = new Date("2026-08-10T12:00:00.000Z");
  let currentNow = now;
  let courseId: string;
  let lessonUnitId: string;
  let classSessionId: string;
  let bookingId: string;

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `attendance_progress_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test", now: () => currentNow });

    await db.insertInto("users").values([
      { id: administratorId, identity_issuer: "https://fake.local/", identity_subject: administratorSubject, display_name: "Alex Administrator", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: teacherId, identity_issuer: "https://fake.local/", identity_subject: teacherSubject, display_name: "Taylor Teacher", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: studentId, identity_issuer: "https://fake.local/", identity_subject: studentSubject, display_name: "Sam Student", interface_locale: "en", display_time_zone: "America/Denver" },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: administratorId, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: teacherId, role: "TEACHER" },
      { user_id: studentId, role: "STUDENT" },
    ]).execute();
    const course = await db.insertInto("courses").values({ stable_key: "es-b2", target_language: "es", curriculum_level: "B2", title: "Spanish B2", summary: "Upper-intermediate Spanish" }).returning("id").executeTakeFirstOrThrow();
    courseId = course.id;
    const unit = await db.transaction().execute(async (transaction) => {
      const inserted = await transaction.insertInto("lesson_units").values({ stable_key: "es-b2-99", course_id: course.id, title: "Tell a story", summary: "Narrate a past experience", objectives: JSON.stringify(["Narrate clearly"]), sort_order: 1, state: "ACTIVE", replacement_lesson_unit_id: null, retired_at: null }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: inserted.id, topic_key: "EC" }).execute();
      return inserted;
    });
    lessonUnitId = unit.id;
    await db.insertInto("student_placements").values({ student_user_id: studentId, target_language: "es", curriculum_level: "B2" }).execute();
    await db.insertInto("teacher_qualifications").values({ teacher_user_id: teacherId, target_language: "es", curriculum_level: "B2", granted_by_user_id: administratorId }).execute();
    classSessionId = (await db.insertInto("class_sessions").values({ lesson_unit_id: lessonUnitId, teacher_user_id: teacherId, starts_at: new Date("2026-08-10T10:00:00.000Z"), scheduling_time_zone: "America/Denver", seat_capacity: 5, occupied_seats: 1, state: "PUBLISHED" }).returning("id").executeTakeFirstOrThrow()).id;
    bookingId = (await db.insertInto("bookings").values({ student_user_id: studentId, class_session_id: classSessionId, teacher_user_id_at_booking: teacherId, state: "ACTIVE", terminal_reason: null, class_credit_refunded: false, late_cancellation_refund_until: null, booked_at: new Date("2026-08-01T12:00:00.000Z"), ended_at: null }).returning("id").executeTakeFirstOrThrow()).id;
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("lets the assigned Teacher view the Class Roster and relevant Student Placement", async () => {
    const result = await graphql(`
      query ClassRoster($classSessionId: ID!) {
        classRoster(classSessionId: $classSessionId, actingRole: TEACHER) {
          classSession { id lessonUnitId }
          students { bookingId studentUserId displayName placement { targetLanguage curriculumLevel } attendance { outcome } }
        }
      }
    `, { classSessionId }, randomUUID(), teacherSubject);

    expect(result.errors).toBeUndefined();
    expect(result).toMatchObject({ data: { classRoster: {
      classSession: { id: classSessionId, lessonUnitId },
      students: [{
        bookingId,
        studentUserId: studentId,
        displayName: "Sam Student",
        placement: { targetLanguage: "es", curriculumLevel: "B2" },
        attendance: null,
      }],
    } } });
  });

  it("publishes Attendance after the Class Session and notifies the Student", async () => {
    currentNow = new Date("2026-08-10T11:01:00.000Z");
    const correlationId = `attendance-${randomUUID()}`;
    const result = await graphql(`
      mutation RecordAttendance($input: RecordAttendanceInput!) {
        recordAttendance(input: $input) {
          ... on RecordAttendanceSuccess {
            classRoster { students { bookingId attendance { outcome submittedAt } } }
          }
          ... on AttendanceError { code message }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), classSessionId, records: [{ bookingId, outcome: "ATTENDED" }] } }, correlationId, teacherSubject);

    expect(result.errors).toBeUndefined();
    expect(result).toMatchObject({ data: { recordAttendance: { classRoster: { students: [{
      bookingId,
      attendance: { outcome: "ATTENDED", submittedAt: "2026-08-10T11:01:00.000Z" },
    }] } } } });
    expect(await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", studentId).execute()).toContainEqual({ message_id: "attendance.published.student" });
    expect(await db.selectFrom("in_app_notifications").select("variables").where("recipient_user_id", "=", studentId).where("message_id", "=", "attendance.published.student").executeTakeFirstOrThrow()).toMatchObject({ variables: expect.objectContaining({ ratingDeadline: "2026-08-17T11:00:00.000Z" }) });
    expect(await db.selectFrom("email_notification_intents").select("rendered_content").where("recipient_user_id", "=", studentId).where("message_id", "=", "attendance.published.student").executeTakeFirstOrThrow()).toMatchObject({ rendered_content: expect.stringContaining("Attended") });
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({ outcome: "SUCCEEDED", reason_code: "ATTENDANCE_PUBLISHED" });
  });

  it("shows Course Progress over active Lesson Units while retaining retired learning history", async () => {
    const units = await db.transaction().execute(async (transaction) => {
      const active = await transaction.insertInto("lesson_units").values({ stable_key: "es-b2-98", course_id: courseId, title: "Explain an opinion", summary: "Support an opinion", objectives: JSON.stringify(["Give reasons"]), sort_order: 2, state: "ACTIVE", replacement_lesson_unit_id: null, retired_at: null }).returning("id").executeTakeFirstOrThrow();
      const retired = await transaction.insertInto("lesson_units").values({ stable_key: "es-b2-97", course_id: courseId, title: "Legacy narration", summary: "Retired narration practice", objectives: JSON.stringify(["Narrate"]), sort_order: 3, state: "RETIRED", replacement_lesson_unit_id: null, retired_at: currentNow }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values([
        { lesson_unit_id: active.id, topic_key: "EC" },
        { lesson_unit_id: retired.id, topic_key: "EC" },
      ]).execute();
      return { active, retired };
    });
    await db.insertInto("lesson_unit_completions").values({ student_user_id: studentId, lesson_unit_id: units.retired.id, established_by_booking_id: bookingId, earned_at: new Date("2026-07-01T12:00:00.000Z") }).execute();

    const result = await graphql(`
      query StudentCourseProgress {
        studentCourseProgress {
          courseId title targetLanguage curriculumLevel activeLessonUnitCount completedActiveLessonUnitCount percentage
          learningHistory { lessonUnitId title state earnedAt countsTowardProgress }
        }
      }
    `, {}, randomUUID(), studentSubject);

    expect(result.errors).toBeUndefined();
    expect(result).toMatchObject({ data: { studentCourseProgress: [{
      courseId,
      title: "Spanish B2",
      targetLanguage: "es",
      curriculumLevel: "B2",
      activeLessonUnitCount: 2,
      completedActiveLessonUnitCount: 1,
      percentage: 50,
      learningHistory: expect.arrayContaining([
        expect.objectContaining({ lessonUnitId, state: "ACTIVE", countsTowardProgress: true }),
        expect.objectContaining({ lessonUnitId: units.retired.id, state: "RETIRED", countsTowardProgress: false }),
      ]),
    }] } });
  });

  it("corrects Attendance within 24 hours and reconciles Lesson Unit Completion", async () => {
    currentNow = new Date("2026-08-11T10:59:00.000Z");
    const correlationId = `attendance-correction-${randomUUID()}`;
    const result = await graphql(`
      mutation CorrectAttendance($input: RecordAttendanceInput!) {
        recordAttendance(input: $input) {
          ... on RecordAttendanceSuccess { classRoster { students { bookingId attendance { outcome } } } }
          ... on AttendanceError { code message }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), classSessionId, records: [{ bookingId, outcome: "NO_SHOW", correctionReason: "The submitted roster was checked against the teacher's session notes." }] } }, correlationId, teacherSubject);

    expect(result).toMatchObject({ data: { recordAttendance: { classRoster: { students: [{ bookingId, attendance: { outcome: "NO_SHOW" } }] } } } });
    expect(await db.selectFrom("lesson_unit_completions").select("id").where("student_user_id", "=", studentId).where("lesson_unit_id", "=", lessonUnitId).executeTakeFirst()).toBeUndefined();
    expect(await db.selectFrom("attendance_record_corrections").select(["prior_outcome", "corrected_outcome", "corrected_by_user_id", "reason"]).where("booking_id", "=", bookingId).executeTakeFirstOrThrow()).toEqual({ prior_outcome: "ATTENDED", corrected_outcome: "NO_SHOW", corrected_by_user_id: teacherId, reason: "The submitted roster was checked against the teacher's session notes." });
    expect(await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", studentId).execute()).toContainEqual({ message_id: "attendance.corrected.student" });
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({ outcome: "SUCCEEDED", reason_code: "ATTENDANCE_CORRECTED" });
  });

  it("hides the Class Roster from unrelated and expired Teacher relationships while allowing Platform Administrators", async () => {
    const unrelatedTeacherSubject = randomUUID();
    const unrelatedTeacherId = randomUUID();
    await db.insertInto("users").values({ id: unrelatedTeacherId, identity_issuer: "https://fake.local/", identity_subject: unrelatedTeacherSubject, display_name: "Unrelated Teacher", interface_locale: "en", display_time_zone: "America/Denver" }).execute();
    await db.insertInto("role_assignments").values({ user_id: unrelatedTeacherId, role: "TEACHER" }).execute();
    const deniedCorrelationId = `denied-roster-${randomUUID()}`;
    const unrelated = await graphql(`query Roster($id: ID!) { classRoster(classSessionId: $id, actingRole: TEACHER) { students { bookingId } } }`, { id: classSessionId }, deniedCorrelationId, unrelatedTeacherSubject);
    expect(unrelated.errors?.[0]?.extensions?.code).toBe("NOT_FOUND");
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", deniedCorrelationId).executeTakeFirstOrThrow()).toEqual({ outcome: "DENIED", reason_code: "CLASS_ROSTER_NOT_FOUND" });

    currentNow = new Date("2026-08-12T11:01:00.000Z");
    const expired = await graphql(`query Roster($id: ID!) { classRoster(classSessionId: $id, actingRole: TEACHER) { students { bookingId } } }`, { id: classSessionId }, randomUUID(), teacherSubject);
    expect(expired.errors?.[0]?.extensions?.code).toBe("NOT_FOUND");
    const administrator = await graphql(`query Roster($id: ID!) { classRoster(classSessionId: $id, actingRole: PLATFORM_ADMINISTRATOR) { students { bookingId } } }`, { id: classSessionId }, randomUUID(), administratorSubject);
    expect(administrator).toMatchObject({ data: { classRoster: { students: [{ bookingId }] } } });
  });

  it("keeps Attendance Unrecorded before the end and closes the Teacher window after 24 hours", async () => {
    currentNow = new Date("2026-08-10T10:59:59.999Z");
    const beforeEnd = await graphql(`mutation Record($input: RecordAttendanceInput!) { recordAttendance(input: $input) { ... on AttendanceError { code } ... on RecordAttendanceSuccess { classRoster { classSession { id } } } } }`, { input: { idempotencyKey: randomUUID(), classSessionId, records: [{ bookingId, outcome: "ATTENDED" }] } }, randomUUID(), teacherSubject);
    expect(beforeEnd).toMatchObject({ data: { recordAttendance: { code: "ATTENDANCE_RECORDING_NOT_OPEN" } } });

    currentNow = new Date("2026-08-11T11:00:00.001Z");
    const afterWindow = await graphql(`mutation Record($input: RecordAttendanceInput!) { recordAttendance(input: $input) { ... on AttendanceError { code } ... on RecordAttendanceSuccess { classRoster { classSession { id } } } } }`, { input: { idempotencyKey: randomUUID(), classSessionId, records: [{ bookingId, outcome: "ATTENDED" }] } }, randomUUID(), teacherSubject);
    expect(afterWindow).toMatchObject({ data: { recordAttendance: { code: "ATTENDANCE_RECORDING_WINDOW_CLOSED" } } });
  });

  it("lets a Platform Administrator correct Attendance after the Teacher window", async () => {
    currentNow = new Date("2026-08-15T12:00:00.000Z");
    const correlationId = `admin-attendance-${randomUUID()}`;
    const result = await graphql(`mutation Administer($input: RecordAttendanceInput!) { administerAttendance(input: $input) { ... on RecordAttendanceSuccess { classRoster { students { bookingId attendance { outcome } } } } ... on AttendanceError { code } } }`, { input: { idempotencyKey: randomUUID(), classSessionId, records: [{ bookingId, outcome: "ATTENDED", correctionReason: "The administrator verified the Teacher's supporting session record." }] } }, correlationId, administratorSubject);
    expect(result).toMatchObject({ data: { administerAttendance: { classRoster: { students: [{ bookingId, attendance: { outcome: "ATTENDED" } }] } } } });
    expect(await db.selectFrom("lesson_unit_completions").select("earned_at").where("student_user_id", "=", studentId).where("lesson_unit_id", "=", lessonUnitId).executeTakeFirstOrThrow()).toEqual({ earned_at: new Date("2026-08-10T11:00:00.000Z") });
    expect(await db.selectFrom("in_app_notifications").select(["recipient_user_id", "message_id"]).where("message_id", "=", "attendance.corrected.teacher").execute()).toContainEqual({ recipient_user_id: teacherId, message_id: "attendance.corrected.teacher" });
    expect(await db.selectFrom("audit_entries").select(["acting_role", "target_type", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({ acting_role: "PLATFORM_ADMINISTRATOR", target_type: "ClassSession", reason_code: "ATTENDANCE_CORRECTED" });
  });

  it("serializes completion reconciliation across concurrent Class Session corrections", async () => {
    const concurrentStudentId = randomUUID();
    await db.insertInto("users").values({ id: concurrentStudentId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Concurrent Student", interface_locale: "en", display_time_zone: "America/Denver" }).execute();
    await db.insertInto("role_assignments").values({ user_id: concurrentStudentId, role: "STUDENT" }).execute();
    const sessions = await Promise.all(["2026-08-20T08:00:00.000Z", "2026-08-20T10:00:00.000Z"].map(async (startsAt) => {
      const sessionId = (await db.insertInto("class_sessions").values({ lesson_unit_id: lessonUnitId, teacher_user_id: teacherId, starts_at: new Date(startsAt), scheduling_time_zone: "America/Denver", seat_capacity: 5, occupied_seats: 1, state: "PUBLISHED" }).returning("id").executeTakeFirstOrThrow()).id;
      const targetBookingId = (await db.insertInto("bookings").values({ student_user_id: concurrentStudentId, class_session_id: sessionId, teacher_user_id_at_booking: teacherId, state: "ACTIVE", terminal_reason: null, class_credit_refunded: false, late_cancellation_refund_until: null, booked_at: new Date("2026-08-01T12:00:00.000Z"), ended_at: null }).returning("id").executeTakeFirstOrThrow()).id;
      await db.insertInto("attendance_records").values({ booking_id: targetBookingId, outcome: "ATTENDED", submitted_by_user_id: teacherId, submitted_at: new Date("2026-08-20T11:00:00.000Z"), updated_at: new Date("2026-08-20T11:00:00.000Z") }).execute();
      return { bookingId: targetBookingId, classSessionId: sessionId };
    }));
    await db.insertInto("lesson_unit_completions").values({ student_user_id: concurrentStudentId, lesson_unit_id: lessonUnitId, established_by_booking_id: sessions[0]!.bookingId, earned_at: new Date("2026-08-20T11:00:00.000Z") }).execute();
    currentNow = new Date("2026-08-20T11:01:00.000Z");
    const corrections = await Promise.all(sessions.map((session, index) => graphql(`mutation Correct($input: RecordAttendanceInput!) { recordAttendance(input: $input) { ... on RecordAttendanceSuccess { classRoster { classSession { id } } } ... on AttendanceError { code } } }`, { input: { idempotencyKey: randomUUID(), classSessionId: session.classSessionId, records: [{ bookingId: session.bookingId, outcome: "NO_SHOW", correctionReason: `Concurrent correction ${index + 1} has a verified roster reason.` }] } }, randomUUID(), teacherSubject)));
    expect(corrections).toEqual([
      expect.objectContaining({ data: { recordAttendance: expect.objectContaining({ classRoster: { classSession: { id: sessions[0]!.classSessionId } } }) } }),
      expect.objectContaining({ data: { recordAttendance: expect.objectContaining({ classRoster: { classSession: { id: sessions[1]!.classSessionId } } }) } }),
    ]);
    expect(await db.selectFrom("lesson_unit_completions").select("id").where("student_user_id", "=", concurrentStudentId).where("lesson_unit_id", "=", lessonUnitId).executeTakeFirst()).toBeUndefined();
  });

  async function graphql(source: string, variables: Record<string, unknown>, correlationId: string, subject: string) {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", "x-correlation-id": correlationId, "x-demo-user-id": subject },
      body: JSON.stringify({ query: source, variables }),
    });
    return response.json() as Promise<{ data?: Record<string, unknown>; errors?: Array<{ message?: string; extensions?: { code?: string } }> }>;
  }
});
