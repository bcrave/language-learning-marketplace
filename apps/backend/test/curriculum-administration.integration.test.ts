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

describe("Curriculum administration GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  const administratorId = randomUUID();
  const administratorSubject = randomUUID();
  const teacherId = randomUUID();
  const nonAdministratorId = randomUUID();
  const nonAdministratorSubject = randomUUID();

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `curriculum_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test" });
    await db.insertInto("users").values([
      { id: administratorId, identity_issuer: "https://fake.local/", identity_subject: administratorSubject, display_name: "Avery Admin", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: teacherId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "María Torres", interface_locale: "es", display_time_zone: "Europe/Madrid" },
      { id: nonAdministratorId, identity_issuer: "https://fake.local/", identity_subject: nonAdministratorSubject, display_name: "Student Only", interface_locale: "en", display_time_zone: "America/Chicago" },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: administratorId, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: teacherId, role: "TEACHER" },
      { user_id: nonAdministratorId, role: "STUDENT" },
    ]).execute();
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("rejects unapproved Lesson Material forms and records the denied mutation", async () => {
    const courseId = await insertCourseAndUnit("A2");
    const unit = await db.selectFrom("lesson_units").select("id").where("course_id", "=", courseId).executeTakeFirstOrThrow();
    const correlationId = `invalid-material-${randomUUID()}`;
    const result = await graphql(`
      mutation AddMaterial($input: AddLessonMaterialInput!) {
        addLessonMaterial(input: $input) {
          ... on AddLessonMaterialSuccess { material { id } }
          ... on InvalidLessonMaterial { code message }
          ... on CurriculumConflict { code message }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), lessonUnitId: unit.id, kind: "STRUCTURED_TEXT", title: "Unsafe guide", structuredContent: [{ type: "html", text: "<script>alert(1)</script>" }] } }, correlationId);

    expect(result).toEqual({ data: { addLessonMaterial: { code: "INVALID_LESSON_MATERIAL", message: "Structured text may contain only headings, paragraphs, lists, and emphasis." } } });
    expect(await db.selectFrom("lesson_materials").select("id").where("lesson_unit_id", "=", unit.id).execute()).toEqual([]);
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({ outcome: "DENIED", reason_code: "INVALID_LESSON_MATERIAL" });

    const structured = await graphql(`mutation AddMaterial($input: AddLessonMaterialInput!) { addLessonMaterial(input: $input) { ... on AddLessonMaterialSuccess { material { id kind } } ... on InvalidLessonMaterial { code } ... on CurriculumConflict { code } } }`, { input: { idempotencyKey: randomUUID(), lessonUnitId: unit.id, kind: "STRUCTURED_TEXT", title: "Approved guide", structuredContent: [{ type: "heading", level: 2, text: "Plan" }, { type: "list", items: ["Model", "Practice"] }, { type: "emphasis", text: "Reflect" }] } });
    const materialId = (await db.selectFrom("lesson_materials").select("id").where("lesson_unit_id", "=", unit.id).where("title", "=", "Approved guide").executeTakeFirstOrThrow()).id;
    const reference = await graphql(`mutation AddMaterial($input: AddLessonMaterialInput!) { addLessonMaterial(input: $input) { ... on AddLessonMaterialSuccess { material { id kind } } ... on InvalidLessonMaterial { code } ... on CurriculumConflict { code } } }`, { input: { idempotencyKey: randomUUID(), lessonUnitId: unit.id, kind: "HTTPS_REFERENCE", title: "Publisher reference", httpsUrl: "https://example.org/guide", publisher: "Example Publisher" } });
    const revised = await graphql(`mutation Revise($input: ReviseLessonMaterialInput!) { reviseLessonMaterial(input: $input) { ... on ReviseLessonMaterialSuccess { material { id title structuredContent } } ... on InvalidLessonMaterial { code } ... on CurriculumConflict { code } } }`, { input: { idempotencyKey: randomUUID(), materialId, kind: "STRUCTURED_TEXT", title: "Revised guide", structuredContent: [{ type: "paragraph", text: "Corrected content." }] } });
    expect(structured).toMatchObject({ data: { addLessonMaterial: { material: { kind: "STRUCTURED_TEXT" } } } });
    expect(reference).toMatchObject({ data: { addLessonMaterial: { material: { kind: "HTTPS_REFERENCE" } } } });
    expect(revised).toMatchObject({ data: { reviseLessonMaterial: { material: { id: materialId, title: "Revised guide" } } } });
  });

  it("projects only public Teacher Profile data and blocks Qualification removal for a future assignment", async () => {
    const courseId = await insertCourseAndUnit("B1");
    const unit = await db.selectFrom("lesson_units").select("id").where("course_id", "=", courseId).executeTakeFirstOrThrow();
    const sessionId = randomUUID();
    await graphql(`mutation Profile($input: SaveTeacherProfileInput!) { saveTeacherProfile(input: $input) { teacherProfile { id } } }`, { input: { idempotencyKey: randomUUID(), teacherUserId: teacherId, pronouns: "ella/she", profileImageUrl: "https://example.org/teacher.jpg", professionalBiography: "Teacher of practical conversation.", topicKeys: ["EC"] } });
    const grantMutation = `mutation Grant($input: ChangeTeacherQualificationInput!) { grantTeacherQualification(input: $input) { ... on ChangeTeacherQualificationSuccess { teacherProfile { id } } ... on CurriculumConflict { code } } }`;
    const concurrentGrants = await Promise.all([randomUUID(), randomUUID()].map((idempotencyKey) => graphql(grantMutation, { input: { idempotencyKey, teacherUserId: teacherId, targetLanguage: "en", curriculumLevel: "B1" } })));
    expect(concurrentGrants.filter((result) => JSON.stringify(result).includes("CURRICULUM_CONFLICT"))).toHaveLength(1);
    expect(concurrentGrants.filter((result) => JSON.stringify(result).includes(teacherId))).toHaveLength(1);
    await db.insertInto("class_sessions").values({ id: sessionId, lesson_unit_id: unit.id, teacher_user_id: teacherId, starts_at: new Date(Date.now() + 86_400_000), state: "PUBLISHED" }).execute();
    const removalCorrelationId = `remove-qualification-${randomUUID()}`;
    const removal = await graphql(`mutation Remove($input: ChangeTeacherQualificationInput!) { removeTeacherQualification(input: $input) { ... on ChangeTeacherQualificationSuccess { teacherProfile { id } } ... on TeacherQualificationRemovalBlocked { code classSessionIds } ... on CurriculumConflict { code } } }`, { input: { idempotencyKey: randomUUID(), teacherUserId: teacherId, targetLanguage: "en", curriculumLevel: "B1" } }, removalCorrelationId);
    const profile = await graphql(`query PublicProfile($teacherId: ID!) { publicTeacherProfile(teacherUserId: $teacherId, locale: ES) { id displayName pronouns profileImageUrl professionalBiography taughtLanguages qualifiedCurriculumLevels teachingTopics { key label } completedSessionCount } }`, { teacherId });

    expect(removal).toEqual({ data: { removeTeacherQualification: { code: "FUTURE_CLASS_SESSIONS_REQUIRE_QUALIFICATION", classSessionIds: [sessionId] } } });
    expect(profile).toEqual({ data: { publicTeacherProfile: { id: teacherId, displayName: "María Torres", pronouns: "ella/she", profileImageUrl: "https://example.org/teacher.jpg", professionalBiography: "Teacher of practical conversation.", taughtLanguages: ["en"], qualifiedCurriculumLevels: ["B1"], teachingTopics: [{ key: "EC", label: "Conversación cotidiana" }], completedSessionCount: 0 } } });
    expect(await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", teacherId).execute()).toEqual([{ message_id: "teacher-qualification.granted.teacher" }]);
    const emailIntent = await db.selectFrom("email_notification_intents").select(["message_id", "locale", "rendered_content"]).where("recipient_user_id", "=", teacherId).executeTakeFirstOrThrow();
    expect(emailIntent).toMatchObject({ message_id: "teacher-qualification.granted.teacher", locale: "es" });
    expect(emailIntent.rendered_content).toContain("en B1");
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", removalCorrelationId).executeTakeFirstOrThrow()).toEqual({ outcome: "DENIED", reason_code: "FUTURE_CLASS_SESSIONS_REQUIRE_QUALIFICATION" });
  });

  it("denies a sensitive administration read without the Platform Administrator Role Assignment", async () => {
    const correlationId = `denied-curriculum-${randomUUID()}`;
    const result = await graphql(`{ administrationCurriculum(locale: EN) { courses { id } } }`, undefined, correlationId, nonAdministratorSubject);
    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
    expect(await db.selectFrom("audit_entries").select(["actor_user_id", "outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({ actor_user_id: nonAdministratorId, outcome: "DENIED", reason_code: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED" });
  });

  it("creates ordered curriculum and locks a Lesson Unit's instructional identity after publication", async () => {
    const createCourseMutation = `
      mutation {
        createCourse(input: {
          idempotencyKey: "create-en-a1"
          targetLanguage: "en"
          curriculumLevel: A1
          title: "Everyday English Foundations"
          summary: "Build confidence in practical exchanges."
        }) {
          ... on CreateCourseSuccess { course { id targetLanguage curriculumLevel title } }
          ... on CurriculumConflict { code }
        }
      }
    `;
    const createCourse = await graphql(createCourseMutation);
    const course = createCourse.data?.createCourse?.course as { id: string };
    const replayedCourse = await graphql(createCourseMutation);
    const changedReplay = await graphql(createCourseMutation.replace("Build confidence in practical exchanges.", "Different summary"));
    expect(replayedCourse.data?.createCourse?.course).toEqual({ id: course.id, targetLanguage: "en", curriculumLevel: "A1", title: "Everyday English Foundations" });
    expect(changedReplay).toEqual({ data: { createCourse: { code: "IDEMPOTENCY_KEY_REUSED" } } });
    expect(Number((await db.selectFrom("courses").select(({ fn }) => fn.countAll().as("count")).where("stable_key", "=", "en-a1").executeTakeFirstOrThrow()).count)).toBe(1);

    const createUnit = await graphql(`
      mutation CreateLessonUnit($courseId: ID!) {
        createLessonUnit(input: {
          idempotencyKey: "create-en-a1-01"
          courseId: $courseId
          title: "Introductions That Continue"
          summary: "Ask and answer simple follow-up questions."
          objectives: ["Introduce yourself.", "Ask two follow-up questions."]
          topicKeys: ["EC", "PL"]
        }) {
          ... on CreateLessonUnitSuccess { lessonUnit { id order title state } }
          ... on CurriculumConflict { code }
        }
      }
    `, { courseId: course.id });
    const lessonUnit = createUnit.data?.createLessonUnit?.lessonUnit as { id: string };

    await db.insertInto("teacher_profiles").values({ teacher_user_id: teacherId, pronouns: null, profile_image_url: null, professional_bio: "Teacher of practical conversation." }).onConflict((conflict) => conflict.column("teacher_user_id").doNothing()).execute();
    await db.insertInto("teacher_qualifications").values({ teacher_user_id: teacherId, target_language: "en", curriculum_level: "A1", granted_by_user_id: administratorId }).onConflict((conflict) => conflict.doNothing()).execute();
    await db.insertInto("class_sessions").values({
      id: randomUUID(),
      lesson_unit_id: lessonUnit.id,
      teacher_user_id: teacherId,
      starts_at: new Date(Date.now() + 2 * 86_400_000),
      state: "PUBLISHED",
    }).execute();

    const update = await graphql(`
      mutation UpdateLessonUnit($lessonUnitId: ID!) {
        reviseLessonUnitIdentity(input: {
          lessonUnitId: $lessonUnitId
          title: "Changed identity"
          summary: "Changed summary"
          objectives: ["Changed objective"]
          topicKeys: ["EC"]
        }) {
          ... on UpdateLessonUnitSuccess { lessonUnit { title } }
          ... on InstructionalIdentityLocked { code lessonUnitId }
        }
      }
    `, { lessonUnitId: lessonUnit.id });

    expect(createCourse).toMatchObject({
      data: { createCourse: { course: {
        targetLanguage: "en",
        curriculumLevel: "A1",
        title: "Everyday English Foundations",
      } } },
    });
    expect(createUnit).toMatchObject({
      data: { createLessonUnit: { lessonUnit: {
        order: 1,
        state: "ACTIVE",
        title: "Introductions That Continue",
      } } },
    });
    expect(update).toEqual({
      data: {
        reviseLessonUnitIdentity: {
          code: "INSTRUCTIONAL_IDENTITY_LOCKED",
          lessonUnitId: lessonUnit.id,
        },
      },
    });
  });

  it("rejects duplicate Topic assignments and cross-Course retirement replacements", async () => {
    const a1 = await db.selectFrom("courses").select("id").where("stable_key", "=", "en-a1").executeTakeFirstOrThrow();
    const a2 = await db.selectFrom("courses").select("id").where("stable_key", "=", "en-a2").executeTakeFirstOrThrow();
    const a1Unit = await db.selectFrom("lesson_units").select("id").where("course_id", "=", a1.id).where("state", "=", "ACTIVE").executeTakeFirstOrThrow();
    const a2Unit = await db.selectFrom("lesson_units").select("id").where("course_id", "=", a2.id).executeTakeFirstOrThrow();
    const duplicateTopics = await graphql(`mutation Create($input: CreateLessonUnitInput!) { createLessonUnit(input: $input) { ... on CreateLessonUnitSuccess { lessonUnit { id } } ... on CurriculumConflict { code } } }`, { input: { idempotencyKey: randomUUID(), courseId: a2.id, title: "Duplicate topics", summary: "Should not persist.", objectives: ["One objective."], topicKeys: ["EC", "EC"] } });
    const crossCourseReplacement = await graphql(`mutation Retire($input: RetireLessonUnitInput!) { retireLessonUnit(input: $input) { ... on RetireLessonUnitSuccess { lessonUnit { id } } ... on CurriculumConflict { code } } }`, { input: { idempotencyKey: randomUUID(), lessonUnitId: a1Unit.id, replacementLessonUnitId: a2Unit.id } });

    expect(duplicateTopics).toEqual({ data: { createLessonUnit: { code: "CURRICULUM_CONFLICT" } } });
    expect(crossCourseReplacement).toEqual({ data: { retireLessonUnit: { code: "CURRICULUM_CONFLICT" } } });
    expect((await db.selectFrom("lesson_units").select("state").where("id", "=", a1Unit.id).executeTakeFirstOrThrow()).state).toBe("ACTIVE");

    const tooManyTopics = await graphql(`mutation Create($input: CreateLessonUnitInput!) { createLessonUnit(input: $input) { ... on CreateLessonUnitSuccess { lessonUnit { id } } ... on CurriculumConflict { code } } }`, { input: { idempotencyKey: randomUUID(), courseId: a2.id, title: "Too many topics", summary: "Should not persist.", objectives: ["One objective."], topicKeys: ["EC", "PL", "RW"] } });
    const blankObjective = await graphql(`mutation Create($input: CreateLessonUnitInput!) { createLessonUnit(input: $input) { ... on CreateLessonUnitSuccess { lessonUnit { id } } ... on CurriculumConflict { code } } }`, { input: { idempotencyKey: randomUUID(), courseId: a2.id, title: "Blank objective", summary: "Should not persist.", objectives: ["   "], topicKeys: ["EC"] } });
    const validSecond = await graphql(`mutation Create($input: CreateLessonUnitInput!) { createLessonUnit(input: $input) { ... on CreateLessonUnitSuccess { lessonUnit { id order } } ... on CurriculumConflict { code } } }`, { input: { idempotencyKey: randomUUID(), courseId: a2.id, title: "A second unit", summary: "A valid second unit.", objectives: ["Complete the practice."], topicKeys: ["EC", "WS"] } });
    const secondId = (await db.selectFrom("lesson_units").select("id").where("course_id", "=", a2.id).where("title", "=", "A second unit").executeTakeFirstOrThrow()).id;
    const placed = await graphql(`mutation Place($input: ReorderLessonUnitInput!) { placeLessonUnitInCourse(input: $input) { ... on ReorderLessonUnitSuccess { lessonUnit { id order } } ... on CurriculumConflict { code } } }`, { input: { lessonUnitId: secondId, order: 1 } });
    const sameCourseReplacement = await graphql(`mutation Retire($input: RetireLessonUnitInput!) { retireLessonUnit(input: $input) { ... on RetireLessonUnitSuccess { lessonUnit { id state } } ... on CurriculumConflict { code } } }`, { input: { idempotencyKey: randomUUID(), lessonUnitId: a2Unit.id, replacementLessonUnitId: secondId } });
    expect(tooManyTopics).toEqual({ data: { createLessonUnit: { code: "CURRICULUM_CONFLICT" } } });
    expect(blankObjective).toEqual({ data: { createLessonUnit: { code: "CURRICULUM_CONFLICT" } } });
    expect(validSecond).toMatchObject({ data: { createLessonUnit: { lessonUnit: { id: secondId, order: 2 } } } });
    expect(placed).toMatchObject({ data: { placeLessonUnitInCourse: { lessonUnit: { id: secondId, order: 1 } } } });
    expect(sameCourseReplacement).toMatchObject({ data: { retireLessonUnit: { lessonUnit: { id: a2Unit.id, state: "RETIRED" } } } });
  });

  it("preserves contiguous unique ordering for every Lesson Unit and target-position permutation", async () => {
    const course = await db.selectFrom("courses").select("id").where("stable_key", "=", "en-a2").executeTakeFirstOrThrow();
    await graphql(`mutation Create($input: CreateLessonUnitInput!) { createLessonUnit(input: $input) { ... on CreateLessonUnitSuccess { lessonUnit { id } } ... on CurriculumConflict { code } } }`, { input: { idempotencyKey: randomUUID(), courseId: course.id, title: "Ordering property unit", summary: "Exercises every target position.", objectives: ["Preserve contiguous order."], topicKeys: ["GS"] } });
    const unitIds = (await db.selectFrom("lesson_units").select("id").where("course_id", "=", course.id).orderBy("id").execute()).map(({ id }) => id);
    expect(unitIds).toHaveLength(3);

    for (const lessonUnitId of unitIds) for (let order = 1; order <= unitIds.length; order += 1) {
      const result = await graphql(`mutation Place($input: ReorderLessonUnitInput!) { placeLessonUnitInCourse(input: $input) { ... on ReorderLessonUnitSuccess { lessonUnit { id order } } ... on CurriculumConflict { code } } }`, { input: { lessonUnitId, order } });
      expect(result).toMatchObject({ data: { placeLessonUnitInCourse: { lessonUnit: { id: lessonUnitId, order } } } });
      const ordered = await db.selectFrom("lesson_units").select(["id", "sort_order"]).where("course_id", "=", course.id).orderBy("sort_order").execute();
      expect(ordered.map(({ sort_order }) => sort_order)).toEqual([1, 2, 3]);
      expect(new Set(ordered.map(({ sort_order }) => sort_order)).size).toBe(3);
      expect(ordered[order - 1]?.id).toBe(lessonUnitId);
    }
  });

  async function insertCourseAndUnit(level: "A2" | "B1") {
    const stableKey = `en-${level.toLowerCase()}`;
    return db.transaction().execute(async (transaction) => {
      const course = await transaction.insertInto("courses").values({ stable_key: stableKey, target_language: "en", curriculum_level: level, title: `${level} Course`, summary: `${level} summary` }).returning("id").executeTakeFirstOrThrow();
      const unit = await transaction.insertInto("lesson_units").values({ stable_key: `${stableKey}-01`, course_id: course.id, title: `${level} Unit`, summary: `${level} unit summary`, objectives: JSON.stringify(["One objective"]), sort_order: 1, state: "ACTIVE", replacement_lesson_unit_id: null, retired_at: null }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: unit.id, topic_key: "EC" }).execute();
      return course.id;
    });
  }

  async function graphql(query: string, variables?: Record<string, unknown>, correlationId?: string, subject = administratorSubject) {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-demo-user-id": subject,
        ...(correlationId ? { "x-correlation-id": correlationId } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
    return await response.json() as {
      data: null | {
        createCourse?: { course?: { id: string } };
        createLessonUnit?: { lessonUnit?: { id: string } };
      };
      errors?: Array<{ extensions: { code: string } }>;
    };
  }
});
