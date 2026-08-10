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

describe("Lesson Material and Classroom Access GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  let currentNow = new Date("2026-08-10T15:44:00.000Z");
  const administratorId = randomUUID();
  const teacherId = randomUUID();
  const teacherSubject = randomUUID();
  const studentId = randomUUID();
  const studentSubject = randomUUID();
  const unrelatedStudentId = randomUUID();
  const unrelatedStudentSubject = randomUUID();
  let lessonUnitId: string;
  let materialId: string;
  let classSessionId: string;
  let bookingId: string;
  let classroomSessionId: string;
  let classroomBookingId: string;
  let classroomLessonUnitId: string;
  let expiredLessonUnitId: string;
  let completionSessionId: string;

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `learning_access_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test", now: () => currentNow });

    await db.insertInto("users").values([
      { id: administratorId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Alex Administrator", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: teacherId, identity_issuer: "https://fake.local/", identity_subject: teacherSubject, display_name: "Taylor Teacher", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: studentId, identity_issuer: "https://fake.local/", identity_subject: studentSubject, display_name: "Sam Student", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: unrelatedStudentId, identity_issuer: "https://fake.local/", identity_subject: unrelatedStudentSubject, display_name: "Uma Student", interface_locale: "en", display_time_zone: "America/Denver" },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: administratorId, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: teacherId, role: "TEACHER" },
      { user_id: studentId, role: "STUDENT" },
      { user_id: unrelatedStudentId, role: "STUDENT" },
    ]).execute();
    const course = await db.insertInto("courses").values({ stable_key: "fr-a2", target_language: "fr", curriculum_level: "A2", title: "French A2", summary: "Elementary French" }).returning("id").executeTakeFirstOrThrow();
    lessonUnitId = (await db.transaction().execute(async (transaction) => {
      const unit = await transaction.insertInto("lesson_units").values({ stable_key: "fr-a2-99", course_id: course.id, title: "Plan a visit", summary: "Arrange a visit", objectives: JSON.stringify(["Arrange a meeting place"]), sort_order: 1, state: "ACTIVE", replacement_lesson_unit_id: null, retired_at: null }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: unit.id, topic_key: "TN" }).execute();
      return unit.id;
    }));
    materialId = (await db.insertInto("lesson_materials").values({ lesson_unit_id: lessonUnitId, kind: "STRUCTURED_TEXT", title: "Visit planning guide", structured_content: JSON.stringify([{ type: "heading", text: "Meet-up phrases" }, { type: "paragraph", text: "Choose a time and place." }]), https_url: null, publisher: null }).returning("id").executeTakeFirstOrThrow()).id;
    await db.insertInto("teacher_qualifications").values({ teacher_user_id: teacherId, target_language: "fr", curriculum_level: "A2", granted_by_user_id: administratorId }).execute();

    classroomLessonUnitId = await db.transaction().execute(async (transaction) => {
      const unit = await transaction.insertInto("lesson_units").values({ stable_key: "fr-a2-98", course_id: course.id, title: "Share directions", summary: "Guide someone through town", objectives: JSON.stringify(["Give clear directions"]), sort_order: 2, state: "ACTIVE", replacement_lesson_unit_id: null, retired_at: null }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: unit.id, topic_key: "TN" }).execute();
      return unit.id;
    });
    expiredLessonUnitId = await db.transaction().execute(async (transaction) => {
      const unit = await transaction.insertInto("lesson_units").values({ stable_key: "fr-a2-97", course_id: course.id, title: "Expired assignment", summary: "An old assignment", objectives: JSON.stringify(["Review old phrases"]), sort_order: 3, state: "ACTIVE", replacement_lesson_unit_id: null, retired_at: null }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: unit.id, topic_key: "TN" }).execute();
      await transaction.insertInto("lesson_materials").values({ lesson_unit_id: unit.id, kind: "STRUCTURED_TEXT", title: "Expired guide", structured_content: JSON.stringify([{ type: "paragraph", text: "Old material." }]), https_url: null, publisher: null }).execute();
      return unit.id;
    });

    classSessionId = (await db.insertInto("class_sessions").values({ lesson_unit_id: lessonUnitId, teacher_user_id: teacherId, starts_at: new Date("2026-08-10T16:00:00.000Z"), scheduling_time_zone: "America/Denver", seat_capacity: 5, occupied_seats: 1, state: "PUBLISHED" }).returning("id").executeTakeFirstOrThrow()).id;
    bookingId = (await db.insertInto("bookings").values({ student_user_id: studentId, class_session_id: classSessionId, teacher_user_id_at_booking: teacherId, state: "ACTIVE", terminal_reason: null, class_credit_refunded: false, late_cancellation_refund_until: null, booked_at: new Date("2026-08-01T12:00:00.000Z"), ended_at: null }).returning("id").executeTakeFirstOrThrow()).id;

    classroomSessionId = (await db.insertInto("class_sessions").values({ lesson_unit_id: classroomLessonUnitId, teacher_user_id: teacherId, starts_at: new Date("2026-08-11T16:00:00.000Z"), scheduling_time_zone: "America/Denver", seat_capacity: 5, occupied_seats: 1, state: "PUBLISHED" }).returning("id").executeTakeFirstOrThrow()).id;
    classroomBookingId = (await db.insertInto("bookings").values({ student_user_id: studentId, class_session_id: classroomSessionId, teacher_user_id_at_booking: teacherId, state: "ACTIVE", terminal_reason: null, class_credit_refunded: false, late_cancellation_refund_until: null, booked_at: new Date("2026-08-01T12:00:00.000Z"), ended_at: null }).returning("id").executeTakeFirstOrThrow()).id;
    await db.insertInto("class_sessions").values({ lesson_unit_id: expiredLessonUnitId, teacher_user_id: teacherId, starts_at: new Date("2026-08-07T16:00:00.000Z"), scheduling_time_zone: "America/Denver", seat_capacity: 5, occupied_seats: 0, state: "PUBLISHED" }).execute();
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("returns Lesson Materials only through an assigned Teacher, active Booking, or Lesson Unit Completion", async () => {
    const query = `
      query LessonMaterials($lessonUnitId: ID!, $actingRole: UserRole!) {
        lessonMaterials(lessonUnitId: $lessonUnitId, actingRole: $actingRole) {
          id kind title structuredContent httpsUrl publisher
        }
      }
    `;

    const teacherResult = await graphqlAs(teacherSubject, query, { lessonUnitId, actingRole: "TEACHER" });
    const studentResult = await graphqlAs(studentSubject, query, { lessonUnitId, actingRole: "STUDENT" });
    expect(teacherResult).toEqual({ data: { lessonMaterials: [{ id: materialId, kind: "STRUCTURED_TEXT", title: "Visit planning guide", structuredContent: '[{"text":"Meet-up phrases","type":"heading"},{"text":"Choose a time and place.","type":"paragraph"}]', httpsUrl: null, publisher: null }] } });
    expect(studentResult).toEqual(teacherResult);
    expect(await graphqlAs(teacherSubject, query, { lessonUnitId: expiredLessonUnitId, actingRole: "TEACHER" })).toMatchObject({ data: { lessonMaterials: null }, errors: [{ extensions: { code: "NOT_FOUND" } }] });

    const deniedCorrelationId = randomUUID();
    const denied = await graphqlAs(unrelatedStudentSubject, query, { lessonUnitId, actingRole: "STUDENT" }, deniedCorrelationId);
    expect(denied).toMatchObject({ data: { lessonMaterials: null }, errors: [{ extensions: { code: "NOT_FOUND" } }] });
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", deniedCorrelationId).executeTakeFirstOrThrow()).toEqual({ outcome: "DENIED", reason_code: "LESSON_MATERIALS_NOT_FOUND" });
    const malformedCorrelationId = randomUUID();
    expect(await graphqlAs(unrelatedStudentSubject, query, { lessonUnitId: "not-a-uuid", actingRole: "STUDENT" }, malformedCorrelationId)).toMatchObject({ data: { lessonMaterials: null }, errors: [{ extensions: { code: "NOT_FOUND" } }] });
    expect(await db.selectFrom("audit_entries").select(["target_type", "target_id", "outcome"]).where("correlation_id", "=", malformedCorrelationId).executeTakeFirstOrThrow()).toEqual({ target_type: "User", target_id: unrelatedStudentId, outcome: "DENIED" });

    await db.transaction().execute(async (transaction) => {
      await transaction.updateTable("bookings").set({ state: "ENDED", terminal_reason: "STUDENT_CANCELLATION", ended_at: currentNow }).where("id", "=", bookingId).execute();
      await transaction.updateTable("class_sessions").set({ occupied_seats: 0 }).where("id", "=", classSessionId).execute();
    });
    const cancelled = await graphqlAs(studentSubject, query, { lessonUnitId, actingRole: "STUDENT" });
    expect(cancelled).toMatchObject({ data: { lessonMaterials: null }, errors: [{ extensions: { code: "NOT_FOUND" } }] });

    completionSessionId = (await db.insertInto("class_sessions").values({ lesson_unit_id: lessonUnitId, teacher_user_id: teacherId, starts_at: new Date("2026-08-08T16:00:00.000Z"), scheduling_time_zone: "America/Denver", seat_capacity: 5, occupied_seats: 1, state: "PUBLISHED" }).returning("id").executeTakeFirstOrThrow()).id;
    const completionBookingId = (await db.insertInto("bookings").values({ student_user_id: studentId, class_session_id: completionSessionId, teacher_user_id_at_booking: teacherId, state: "ACTIVE", terminal_reason: null, class_credit_refunded: false, late_cancellation_refund_until: null, booked_at: new Date("2026-08-01T12:00:00.000Z"), ended_at: null }).returning("id").executeTakeFirstOrThrow()).id;
    await db.insertInto("lesson_unit_completions").values({ student_user_id: studentId, lesson_unit_id: lessonUnitId, established_by_booking_id: completionBookingId, earned_at: new Date("2026-08-08T17:00:00.000Z") }).execute();
    const completed = await graphqlAs(studentSubject, query, { lessonUnitId, actingRole: "STUDENT" });
    expect(completed).toEqual(studentResult);
    expect(await db.selectFrom("lesson_unit_completions").select("established_by_booking_id").where("student_user_id", "=", studentId).where("lesson_unit_id", "=", lessonUnitId).executeTakeFirstOrThrow()).toEqual({ established_by_booking_id: completionBookingId });
    expect(await graphqlAs(studentSubject, `query { learningAccessLessonUnits(actingRole: STUDENT) { id title } }`, {})).toEqual({ data: { learningAccessLessonUnits: [{ id: lessonUnitId, title: "Plan a visit" }, { id: classroomLessonUnitId, title: "Share directions" }] } });
    expect(await db.selectFrom("attendance_records").select("id").execute()).toEqual([]);
  });

  it("enforces separate Classroom Access windows and never establishes Attendance", async () => {
    const accessSessions = await graphqlAs(studentSubject, `
      query LearningAccessClassSessions($actingRole: UserRole!) {
        learningAccessClassSessions(actingRole: $actingRole) { id lessonUnitId startsAt endsAt }
      }
    `, { actingRole: "STUDENT" });
    expect(accessSessions).toEqual({ data: { learningAccessClassSessions: [
      { id: completionSessionId, lessonUnitId, startsAt: "2026-08-08T16:00:00Z", endsAt: "2026-08-08T17:00:00Z" },
      { id: classroomSessionId, lessonUnitId: classroomLessonUnitId, startsAt: "2026-08-11T16:00:00Z", endsAt: "2026-08-11T17:00:00Z" },
    ] } });

    const mutation = `
      mutation EnterClassroom($input: EnterClassroomInput!) {
        enterClassroom(input: $input) {
          ... on EnterClassroomSuccess { classroom { classSessionId lessonUnitId teacherUserId simulationStatus } }
          ... on ClassroomAccessError { code message }
        }
      }
    `;
    const variables = (actingRole: "STUDENT" | "TEACHER") => ({ input: { classSessionId: classroomSessionId, actingRole } });

    currentNow = new Date("2026-08-11T15:45:00.000Z");
    const teacher = await graphqlAs(teacherSubject, mutation, variables("TEACHER"));
    expect(teacher).toEqual({ data: { enterClassroom: { classroom: { classSessionId: classroomSessionId, lessonUnitId: classroomLessonUnitId, teacherUserId: teacherId, simulationStatus: "SIMULATED" } } } });

    currentNow = new Date("2026-08-11T15:49:00.000Z");
    expect(await graphqlAs(studentSubject, mutation, variables("STUDENT"))).toMatchObject({ data: { enterClassroom: { code: "CLASSROOM_NOT_OPEN" } } });
    currentNow = new Date("2026-08-11T15:50:00.000Z");
    let releaseProvider!: () => void;
    let providerStarted!: () => void;
    const providerStartedPromise = new Promise<void>((resolve) => { providerStarted = resolve; });
    const providerReleasePromise = new Promise<void>((resolve) => { releaseProvider = resolve; });
    const raceApi = createApi({ db, authMode: "fake", nodeEnv: "test", now: () => currentNow, classroomProvider: { enterClassroom: async (input) => {
      providerStarted();
      await providerReleasePromise;
      return { ...input, simulationStatus: "SIMULATED" };
    } } });
    const entry = graphqlThrough(raceApi, studentSubject, mutation, variables("STUDENT"));
    await providerStartedPromise;
    let cancellationCompleted = false;
    const cancellation = db.transaction().execute(async (transaction) => {
      await transaction.updateTable("bookings").set({ state: "ENDED", terminal_reason: "STUDENT_CANCELLATION", ended_at: currentNow }).where("id", "=", classroomBookingId).execute();
      await transaction.updateTable("class_sessions").set({ occupied_seats: 0 }).where("id", "=", classroomSessionId).execute();
    }).then(() => { cancellationCompleted = true; });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(cancellationCompleted).toBe(false);
    releaseProvider();
    expect(await entry).toEqual(teacher);
    await cancellation;
    expect(await graphqlAs(studentSubject, mutation, variables("STUDENT"))).toMatchObject({ data: { enterClassroom: { code: "CLASS_SESSION_NOT_FOUND" } } });
    const malformedCorrelationId = randomUUID();
    expect(await graphqlAs(studentSubject, mutation, { input: { classSessionId: "not-a-uuid", actingRole: "STUDENT" } }, malformedCorrelationId)).toMatchObject({ data: { enterClassroom: { code: "CLASS_SESSION_NOT_FOUND" } } });
    expect(await db.selectFrom("audit_entries").select(["target_type", "target_id", "outcome"]).where("correlation_id", "=", malformedCorrelationId).executeTakeFirstOrThrow()).toEqual({ target_type: "User", target_id: studentId, outcome: "DENIED" });

    currentNow = new Date("2026-08-11T17:00:00.000Z");
    expect(await graphqlAs(teacherSubject, mutation, variables("TEACHER"))).toEqual(teacher);
    currentNow = new Date("2026-08-11T17:00:00.001Z");
    expect(await graphqlAs(teacherSubject, mutation, variables("TEACHER"))).toMatchObject({ data: { enterClassroom: { code: "CLASSROOM_CLOSED" } } });

    expect(await db.selectFrom("attendance_records").select("id").execute()).toEqual([]);
    expect(await db.selectFrom("lesson_unit_completions").select("id").where("established_by_booking_id", "=", classroomBookingId).execute()).toEqual([]);
    expect(await db.selectFrom("audit_entries").select(["operation", "outcome", "reason_code"]).where("operation", "=", "classroom.entered").orderBy("occurred_at").execute()).toEqual(expect.arrayContaining([
      { operation: "classroom.entered", outcome: "SUCCEEDED", reason_code: "CLASSROOM_ENTERED" },
      { operation: "classroom.entered", outcome: "DENIED", reason_code: "CLASSROOM_NOT_OPEN" },
      { operation: "classroom.entered", outcome: "DENIED", reason_code: "CLASS_SESSION_NOT_FOUND" },
      { operation: "classroom.entered", outcome: "DENIED", reason_code: "CLASSROOM_CLOSED" },
    ]));
  });

  async function graphqlAs(subject: string, query: string, variables: Record<string, unknown>, correlationId = randomUUID()) {
    return graphqlThrough(api, subject, query, variables, correlationId);
  }

  async function graphqlThrough(targetApi: ReturnType<typeof createApi>, subject: string, query: string, variables: Record<string, unknown>, correlationId = randomUUID()) {
    const response = await targetApi.fetch("http://localhost/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", "x-correlation-id": correlationId, "x-demo-user-id": subject },
      body: JSON.stringify({ query, variables }),
    });
    return response.json() as Promise<{ data?: Record<string, unknown>; errors?: Array<{ extensions?: { code?: string } }> }>;
  }
});
