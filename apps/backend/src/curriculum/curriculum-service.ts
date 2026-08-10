import { interfaceMessages } from "@marketplace/core";
import IntlMessageFormat from "intl-messageformat";
import { sql } from "kysely";
import { z } from "zod";

import { recordAdministrationAudit as recordCurriculumAudit } from "../audit/administration-audit.js";
import type { Administrator } from "../authorization/administrator-policy.js";
import type { Database } from "../database/database.js";
import type { CurriculumLevel, StructuredContent } from "../database/types.js";

const shortText = z.string().trim().min(1);
const structuredBlock = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heading"), level: z.union([z.literal(2), z.literal(3)]), text: shortText.max(160), items: z.null().optional() }).strict(),
  z.object({ type: z.literal("paragraph"), text: shortText.max(2_000), level: z.null().optional(), items: z.null().optional() }).strict(),
  z.object({ type: z.literal("emphasis"), text: shortText.max(500), level: z.null().optional(), items: z.null().optional() }).strict(),
  z.object({ type: z.literal("list"), items: z.array(shortText.max(500)).min(1).max(12), level: z.null().optional(), text: z.null().optional() }).strict(),
]);

export { administratorFor } from "../authorization/administrator-policy.js";
export type { Administrator } from "../authorization/administrator-policy.js";

export { recordAdministrationAudit as recordCurriculumAudit } from "../audit/administration-audit.js";

async function topicsFor(db: Database, locale: "en" | "es") {
  const topics = await db.selectFrom("topics").selectAll().orderBy("key").execute();
  return topics.map((topic) => ({
    key: topic.key,
    label: locale === "es" ? topic.label_es : topic.label_en,
    labelEn: topic.label_en,
    labelEs: topic.label_es,
  }));
}

async function materialsFor(db: Database, lessonUnitId: string) {
  const materials = await db.selectFrom("lesson_materials").selectAll()
    .where("lesson_unit_id", "=", lessonUnitId).orderBy("created_at").execute();
  return materials.map((material) => ({
    id: material.id,
    kind: material.kind,
    title: material.title,
    structuredContent: material.structured_content === null ? null : JSON.stringify(material.structured_content),
    httpsUrl: material.https_url,
    publisher: material.publisher,
  }));
}

export async function lessonUnitProjection(db: Database, lessonUnitId: string, locale: "en" | "es") {
  const unit = await db.selectFrom("lesson_units").selectAll().where("id", "=", lessonUnitId).executeTakeFirstOrThrow();
  const assignedTopics = await db.selectFrom("lesson_unit_topics").innerJoin("topics", "topics.key", "lesson_unit_topics.topic_key")
    .selectAll("topics").where("lesson_unit_id", "=", unit.id).orderBy("topics.key").execute();
  return {
    id: unit.id,
    key: unit.stable_key,
    courseId: unit.course_id,
    title: unit.title,
    summary: unit.summary,
    objectives: unit.objectives,
    order: unit.sort_order,
    state: unit.state,
    topics: assignedTopics.map((topic) => ({ key: topic.key, label: locale === "es" ? topic.label_es : topic.label_en, labelEn: topic.label_en, labelEs: topic.label_es })),
    materials: await materialsFor(db, unit.id),
  };
}

export async function publicTeacherProfile(db: Database, teacherUserId: string, locale: "en" | "es") {
  const profile = await db.selectFrom("teacher_profiles").innerJoin("users", "users.id", "teacher_profiles.teacher_user_id")
    .select(["users.id", "users.display_name", "teacher_profiles.pronouns", "teacher_profiles.profile_image_url", "teacher_profiles.professional_bio"])
    .where("teacher_profiles.teacher_user_id", "=", teacherUserId).executeTakeFirst();
  if (!profile) return null;
  const qualifications = await db.selectFrom("teacher_qualifications").select(["target_language", "curriculum_level"])
    .where("teacher_user_id", "=", teacherUserId).orderBy("target_language").orderBy("curriculum_level").execute();
  const teachingTopics = await db.selectFrom("teacher_profile_topics").innerJoin("topics", "topics.key", "teacher_profile_topics.topic_key")
    .selectAll("topics").where("teacher_user_id", "=", teacherUserId).orderBy("topics.key").execute();
  const completed = await db.selectFrom("class_sessions").select(({ fn }) => fn.countAll<number>().as("count"))
    .where("teacher_user_id", "=", teacherUserId).where("state", "=", "PUBLISHED").where(sql<boolean>`starts_at + interval '60 minutes' < now()`).executeTakeFirstOrThrow();
  return {
    id: profile.id,
    displayName: profile.display_name,
    pronouns: profile.pronouns,
    profileImageUrl: profile.profile_image_url,
    professionalBiography: profile.professional_bio,
    taughtLanguages: [...new Set(qualifications.map((item) => item.target_language))],
    qualifiedCurriculumLevels: [...new Set(qualifications.map((item) => item.curriculum_level))],
    teachingTopics: teachingTopics.map((topic) => ({ key: topic.key, label: locale === "es" ? topic.label_es : topic.label_en, labelEn: topic.label_en, labelEs: topic.label_es })),
    completedSessionCount: Number(completed.count),
  };
}

export async function administrationCurriculum(db: Database, locale: "en" | "es") {
  const courses = await db.selectFrom("courses").innerJoin("curriculum_levels", "curriculum_levels.code", "courses.curriculum_level")
    .selectAll("courses").orderBy("target_language").orderBy("curriculum_levels.sort_order").execute();
  const teachers = await db.selectFrom("teacher_profiles").select("teacher_user_id").orderBy("teacher_user_id").execute();
  return {
    courses: await Promise.all(courses.map(async (course) => ({
      id: course.id,
      key: course.stable_key,
      targetLanguage: course.target_language,
      curriculumLevel: course.curriculum_level,
      title: course.title,
      summary: course.summary,
      lessonUnits: await Promise.all((await db.selectFrom("lesson_units").select("id").where("course_id", "=", course.id).orderBy("sort_order").execute()).map(({ id }) => lessonUnitProjection(db, id, locale))),
    }))),
    topics: await topicsFor(db, locale),
    teachers: (await Promise.all(teachers.map(({ teacher_user_id }) => publicTeacherProfile(db, teacher_user_id, locale)))).filter((profile) => profile !== null),
  };
}

const conflict = (message: string) => ({ __typename: "CurriculumConflict" as const, code: "CURRICULUM_CONFLICT", message });

class CurriculumRuleViolation extends Error {}

async function inTransaction<T>(db: Database, perform: (transaction: Database) => Promise<T>): Promise<T> {
  if (db.isTransaction) return perform(db);
  return db.transaction().execute((transaction) => perform(transaction as Database));
}

async function recordCaughtMutation(db: Database, administrator: Administrator, correlationId: string, operation: string, targetType: string, targetId: string, error: unknown) {
  if (!(error instanceof CurriculumRuleViolation)) return false;
  await recordCurriculumAudit(db, { administratorId: administrator.id, correlationId, operation, targetType, targetId, outcome: "DENIED", reasonCode: "BUSINESS_RULE_REJECTED" });
  return true;
}

export async function createCourse(db: Database, administrator: Administrator, input: { targetLanguage: string; curriculumLevel: CurriculumLevel; title: string; summary: string }, correlationId: string) {
  if (!/^[a-z]{2}$/.test(input.targetLanguage) || !input.title.trim() || !input.summary.trim()) {
    await recordCurriculumAudit(db, { administratorId: administrator.id, correlationId, operation: "course.created", targetType: "Course", targetId: administrator.id, outcome: "DENIED", reasonCode: "INVALID_COURSE_DETAILS" });
    return conflict("Valid authored Course details are required.");
  }
  try {
    const course = await inTransaction(db, async (transaction) => {
      await sql`select pg_advisory_xact_lock(hashtextextended(${`course:${input.targetLanguage}:${input.curriculumLevel}`}, 0))`.execute(transaction);
      const existing = await transaction.selectFrom("courses").select("id").where("target_language", "=", input.targetLanguage).where("curriculum_level", "=", input.curriculumLevel).executeTakeFirst();
      if (existing) throw new CurriculumRuleViolation("course already exists");
      const created = await transaction.insertInto("courses").values({ stable_key: `${input.targetLanguage}-${input.curriculumLevel.toLowerCase()}`, target_language: input.targetLanguage, curriculum_level: input.curriculumLevel, title: input.title.trim(), summary: input.summary.trim() }).returningAll().executeTakeFirstOrThrow();
      await recordCurriculumAudit(transaction, { administratorId: administrator.id, correlationId, operation: "course.created", targetType: "Course", targetId: created.id, reasonCode: "COURSE_CREATED" });
      return created;
    });
    return { __typename: "CreateCourseSuccess" as const, course: { id: course.id, key: course.stable_key, targetLanguage: course.target_language, curriculumLevel: course.curriculum_level, title: course.title, summary: course.summary, lessonUnits: [] } };
  } catch (error) {
    if (await recordCaughtMutation(db, administrator, correlationId, "course.created", "Course", administrator.id, error)) return conflict("A Course already exists for that target language and Curriculum Level.");
    throw error;
  }
}

export async function reviseCourseDetails(db: Database, administrator: Administrator, input: { courseId: string; title: string; summary: string }, correlationId: string) {
  if (!input.title.trim() || !input.summary.trim()) {
    await recordCurriculumAudit(db, { administratorId: administrator.id, correlationId, operation: "course.updated", targetType: "Course", targetId: input.courseId, outcome: "DENIED", reasonCode: "INVALID_COURSE_DETAILS" });
    return conflict("Valid authored Course details are required.");
  }
  try {
    const course = await inTransaction(db, async (transaction) => {
      const saved = await transaction.updateTable("courses").set({ title: input.title.trim(), summary: input.summary.trim() }).where("id", "=", input.courseId).returningAll().executeTakeFirst();
      if (!saved) throw new CurriculumRuleViolation("course does not exist");
      await recordCurriculumAudit(transaction, { administratorId: administrator.id, correlationId, operation: "course.updated", targetType: "Course", targetId: input.courseId, reasonCode: "COURSE_UPDATED" });
      return saved;
    });
    return { __typename: "UpdateCourseSuccess" as const, course: { id: course.id, key: course.stable_key, targetLanguage: course.target_language, curriculumLevel: course.curriculum_level, title: course.title, summary: course.summary, lessonUnits: [] } };
  } catch (error) {
    if (await recordCaughtMutation(db, administrator, correlationId, "course.updated", "Course", input.courseId, error)) return conflict("Valid Course details are required.");
    throw error;
  }
}

export async function createLessonUnit(db: Database, administrator: Administrator, input: { courseId: string; title: string; summary: string; objectives: string[]; topicKeys: string[] }, correlationId: string) {
  const topicKeys = [...new Set(input.topicKeys)];
  if (!input.title.trim() || !input.summary.trim() || input.objectives.length < 1 || input.objectives.length > 6 || input.objectives.some((objective) => !objective.trim()) || topicKeys.length !== input.topicKeys.length || topicKeys.length < 1 || topicKeys.length > 2) {
    await recordCurriculumAudit(db, { administratorId: administrator.id, correlationId, operation: "lesson-unit.created", targetType: "Course", targetId: input.courseId, outcome: "DENIED", reasonCode: "INVALID_LESSON_UNIT_DETAILS" });
    return conflict("Valid Lesson Unit details and one or two Topics are required.");
  }
  try {
    const id = await inTransaction(db, async (transaction) => {
      const course = await transaction.selectFrom("courses").select("stable_key").where("id", "=", input.courseId).forUpdate().executeTakeFirst();
      if (!course) throw new CurriculumRuleViolation("course does not exist");
      const topics = await transaction.selectFrom("topics").select("key").where("key", "in", topicKeys).execute();
      if (topics.length !== topicKeys.length) throw new CurriculumRuleViolation("topic does not exist");
      const next = await transaction.selectFrom("lesson_units").select(sql<number>`coalesce(max(sort_order), 0) + 1`.as("next")).where("course_id", "=", input.courseId).executeTakeFirstOrThrow();
      const unit = await transaction.insertInto("lesson_units").values({ stable_key: `${course.stable_key}-${String(next.next).padStart(2, "0")}`, course_id: input.courseId, title: input.title.trim(), summary: input.summary.trim(), objectives: JSON.stringify(input.objectives.map((value) => value.trim())), sort_order: Number(next.next), state: "ACTIVE", replacement_lesson_unit_id: null, retired_at: null }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values(topicKeys.map((topic_key) => ({ lesson_unit_id: unit.id, topic_key }))).execute();
      await recordCurriculumAudit(transaction, { administratorId: administrator.id, correlationId, operation: "lesson-unit.created", targetType: "LessonUnit", targetId: unit.id, reasonCode: "LESSON_UNIT_CREATED" });
      return unit.id;
    });
    return { __typename: "CreateLessonUnitSuccess" as const, lessonUnit: await lessonUnitProjection(db, id, administrator.locale) };
  } catch (error) {
    if (await recordCaughtMutation(db, administrator, correlationId, "lesson-unit.created", "Course", input.courseId, error)) return conflict("The Course and Topic identities must exist and ordering must remain unique.");
    throw error;
  }
}

export async function reviseLessonUnitIdentity(db: Database, administrator: Administrator, input: { lessonUnitId: string; title: string; summary: string; objectives: string[]; topicKeys: string[] }, correlationId: string) {
  const topicKeys = [...new Set(input.topicKeys)];
  if (!input.title.trim() || !input.summary.trim() || input.objectives.length < 1 || input.objectives.length > 6 || input.objectives.some((objective) => !objective.trim()) || topicKeys.length !== input.topicKeys.length || topicKeys.length < 1 || topicKeys.length > 2) {
    await recordCurriculumAudit(db, { administratorId: administrator.id, correlationId, operation: "lesson-unit.updated", targetType: "LessonUnit", targetId: input.lessonUnitId, outcome: "DENIED", reasonCode: "INVALID_LESSON_UNIT_DETAILS" });
    return conflict("Valid Lesson Unit details and one or two Topics are required.");
  }
  try {
    const outcome = await inTransaction(db, async (transaction) => {
      const unit = await transaction.selectFrom("lesson_units").select("id").where("id", "=", input.lessonUnitId).forUpdate().executeTakeFirst();
      if (!unit) throw new CurriculumRuleViolation("lesson unit does not exist");
      const topics = await transaction.selectFrom("topics").select("key").where("key", "in", topicKeys).execute();
      if (topics.length !== topicKeys.length) throw new CurriculumRuleViolation("topic does not exist");
      const published = await transaction.selectFrom("class_sessions").select("id").where("lesson_unit_id", "=", input.lessonUnitId).where("state", "=", "PUBLISHED").executeTakeFirst();
      if (published) return "LOCKED" as const;
      await transaction.updateTable("lesson_units").set({ title: input.title.trim(), summary: input.summary.trim(), objectives: JSON.stringify(input.objectives.map((value) => value.trim())) }).where("id", "=", input.lessonUnitId).executeTakeFirstOrThrow();
      await transaction.deleteFrom("lesson_unit_topics").where("lesson_unit_id", "=", input.lessonUnitId).execute();
      await transaction.insertInto("lesson_unit_topics").values(topicKeys.map((topic_key) => ({ lesson_unit_id: input.lessonUnitId, topic_key }))).execute();
      await recordCurriculumAudit(transaction, { administratorId: administrator.id, correlationId, operation: "lesson-unit.updated", targetType: "LessonUnit", targetId: input.lessonUnitId, reasonCode: "LESSON_UNIT_UPDATED" });
      return "UPDATED" as const;
    });
    if (outcome === "LOCKED") {
      await recordCurriculumAudit(db, { administratorId: administrator.id, correlationId, operation: "lesson-unit.updated", targetType: "LessonUnit", targetId: input.lessonUnitId, outcome: "DENIED", reasonCode: "INSTRUCTIONAL_IDENTITY_LOCKED" });
      return { __typename: "InstructionalIdentityLocked" as const, code: "INSTRUCTIONAL_IDENTITY_LOCKED", lessonUnitId: input.lessonUnitId };
    }
    return { __typename: "UpdateLessonUnitSuccess" as const, lessonUnit: await lessonUnitProjection(db, input.lessonUnitId, administrator.locale) };
  } catch (error) {
    if (await recordCaughtMutation(db, administrator, correlationId, "lesson-unit.updated", "LessonUnit", input.lessonUnitId, error)) return conflict("The Lesson Unit and Topic identities must exist.");
    throw error;
  }
}

export async function placeLessonUnitInCourse(db: Database, administrator: Administrator, input: { lessonUnitId: string; order: number }, correlationId: string) {
  try {
    await inTransaction(db, async (transaction) => {
      await sql`set constraints lesson_units_course_order_unique deferred`.execute(transaction);
      const candidate = await transaction.selectFrom("lesson_units").select("course_id").where("id", "=", input.lessonUnitId).executeTakeFirst();
      if (!candidate) throw new CurriculumRuleViolation("lesson unit does not exist");
      await transaction.selectFrom("courses").select("id").where("id", "=", candidate.course_id).forUpdate().executeTakeFirstOrThrow();
      const courseUnits = await transaction.selectFrom("lesson_units").select(["id", "sort_order"]).where("course_id", "=", candidate.course_id).orderBy("id").forUpdate().execute();
      const unit = courseUnits.find(({ id }) => id === input.lessonUnitId);
      if (!unit) throw new CurriculumRuleViolation("lesson unit moved between Courses");
      if (!Number.isInteger(input.order) || input.order < 1 || input.order > courseUnits.length) throw new CurriculumRuleViolation("invalid order");
      await transaction.updateTable("lesson_units").set({ sort_order: 1_000_000 }).where("id", "=", input.lessonUnitId).execute();
      if (input.order < unit.sort_order) await transaction.updateTable("lesson_units").set({ sort_order: sql`sort_order + 1` }).where("course_id", "=", candidate.course_id).where("sort_order", ">=", input.order).where("sort_order", "<", unit.sort_order).execute();
      if (input.order > unit.sort_order) await transaction.updateTable("lesson_units").set({ sort_order: sql`sort_order - 1` }).where("course_id", "=", candidate.course_id).where("sort_order", ">", unit.sort_order).where("sort_order", "<=", input.order).execute();
      await transaction.updateTable("lesson_units").set({ sort_order: input.order }).where("id", "=", input.lessonUnitId).execute();
      await recordCurriculumAudit(transaction, { administratorId: administrator.id, correlationId, operation: "lesson-unit.reordered", targetType: "LessonUnit", targetId: input.lessonUnitId, reasonCode: "LESSON_UNIT_REORDERED" });
    });
    return { __typename: "ReorderLessonUnitSuccess" as const, lessonUnit: await lessonUnitProjection(db, input.lessonUnitId, administrator.locale) };
  } catch (error) {
    if (await recordCaughtMutation(db, administrator, correlationId, "lesson-unit.reordered", "LessonUnit", input.lessonUnitId, error)) return conflict("The Lesson Unit order must stay within its Course.");
    throw error;
  }
}

export async function retireLessonUnit(db: Database, administrator: Administrator, input: { lessonUnitId: string; replacementLessonUnitId?: string | null }, correlationId: string) {
  try {
    await inTransaction(db, async (transaction) => {
      const unit = await transaction.selectFrom("lesson_units").select("course_id").where("id", "=", input.lessonUnitId).forUpdate().executeTakeFirst();
      if (!unit) throw new CurriculumRuleViolation("lesson unit does not exist");
      if (input.replacementLessonUnitId) {
        const replacement = await transaction.selectFrom("lesson_units").select(["course_id", "state"]).where("id", "=", input.replacementLessonUnitId).executeTakeFirst();
        if (!replacement || replacement.course_id !== unit.course_id || replacement.state !== "ACTIVE" || input.replacementLessonUnitId === input.lessonUnitId) throw new CurriculumRuleViolation("replacement must be an active Lesson Unit in the same course");
      }
      await transaction.updateTable("lesson_units").set({ state: "RETIRED", retired_at: new Date(), replacement_lesson_unit_id: input.replacementLessonUnitId ?? null }).where("id", "=", input.lessonUnitId).executeTakeFirstOrThrow();
      await recordCurriculumAudit(transaction, { administratorId: administrator.id, correlationId, operation: "lesson-unit.retired", targetType: "LessonUnit", targetId: input.lessonUnitId, reasonCode: "LESSON_UNIT_RETIRED" });
    });
    return { __typename: "RetireLessonUnitSuccess" as const, lessonUnit: await lessonUnitProjection(db, input.lessonUnitId, administrator.locale) };
  } catch (error) {
    if (await recordCaughtMutation(db, administrator, correlationId, "lesson-unit.retired", "LessonUnit", input.lessonUnitId, error)) return conflict("The replacement must be a different existing Lesson Unit.");
    throw error;
  }
}

export async function saveLocalizedTopic(db: Database, administrator: Administrator, input: { key: string; labelEn: string; labelEs: string }, correlationId: string) {
  try {
    const topic = await inTransaction(db, async (transaction) => {
      const saved = await transaction.insertInto("topics").values({ key: input.key, label_en: input.labelEn.trim(), label_es: input.labelEs.trim() }).onConflict((candidate) => candidate.column("key").doUpdateSet({ label_en: input.labelEn.trim(), label_es: input.labelEs.trim() })).returningAll().executeTakeFirstOrThrow();
      await recordCurriculumAudit(transaction, { administratorId: administrator.id, correlationId, operation: "topic.saved", targetType: "Topic", targetId: saved.id, reasonCode: "TOPIC_SAVED" });
      return saved;
    });
    return { __typename: "UpsertTopicSuccess" as const, topic: { key: topic.key, label: administrator.locale === "es" ? topic.label_es : topic.label_en, labelEn: topic.label_en, labelEs: topic.label_es } };
  } catch (error) {
    await recordCaughtMutation(db, administrator, correlationId, "topic.saved", "Topic", administrator.id, error);
    throw error;
  }
}

type LessonMaterialDefinition = { kind: "STRUCTURED_TEXT" | "HTTPS_REFERENCE"; title: string; structuredContent?: unknown[] | null; httpsUrl?: string | null; publisher?: string | null };

function normalizeLessonMaterial(input: LessonMaterialDefinition): { valid: true; structuredContent: StructuredContent | null; httpsUrl: string | null; publisher: string | null } | { valid: false; message: string } {
  if (input.kind === "STRUCTURED_TEXT") {
    const parsed = z.array(structuredBlock).min(1).max(40).safeParse(input.structuredContent);
    if (!parsed.success || input.httpsUrl || input.publisher) {
      return { valid: false, message: "Structured text may contain only headings, paragraphs, lists, and emphasis." };
    }
    return { valid: true, structuredContent: parsed.data as unknown as StructuredContent, httpsUrl: null, publisher: null };
  }
  try {
    const url = new URL(input.httpsUrl ?? "");
    if (url.protocol !== "https:" || !input.publisher?.trim() || input.structuredContent) throw new Error();
    return { valid: true, structuredContent: null, httpsUrl: url.href, publisher: input.publisher.trim() };
  } catch {
    return { valid: false, message: "A valid HTTPS reference and publisher are required." };
  }
}

function lessonMaterialProjection(material: { id: string; kind: "STRUCTURED_TEXT" | "HTTPS_REFERENCE"; title: string; structured_content: StructuredContent | null; https_url: string | null; publisher: string | null }) {
  return { id: material.id, kind: material.kind, title: material.title, structuredContent: material.structured_content === null ? null : JSON.stringify(material.structured_content), httpsUrl: material.https_url, publisher: material.publisher };
}

export async function addLessonMaterial(db: Database, administrator: Administrator, input: { lessonUnitId: string } & LessonMaterialDefinition, correlationId: string) {
  const normalized = normalizeLessonMaterial(input);
  if (!normalized.valid || !input.title.trim()) {
    await recordCurriculumAudit(db, { administratorId: administrator.id, correlationId, operation: "lesson-material.created", targetType: "LessonUnit", targetId: input.lessonUnitId, outcome: "DENIED", reasonCode: "INVALID_LESSON_MATERIAL" });
    return { __typename: "InvalidLessonMaterial" as const, code: "INVALID_LESSON_MATERIAL", message: normalized.valid ? "A Lesson Material title is required." : normalized.message };
  }
  try {
    const material = await inTransaction(db, async (transaction) => {
      const unit = await transaction.selectFrom("lesson_units").select("id").where("id", "=", input.lessonUnitId).forUpdate().executeTakeFirst();
      if (!unit) throw new CurriculumRuleViolation("lesson unit does not exist");
      const duplicate = await transaction.selectFrom("lesson_materials").select("id").where("lesson_unit_id", "=", input.lessonUnitId).where("title", "=", input.title.trim()).executeTakeFirst();
      if (duplicate) throw new CurriculumRuleViolation("material title already exists");
      const created = await transaction.insertInto("lesson_materials").values({ lesson_unit_id: input.lessonUnitId, kind: input.kind, title: input.title.trim(), structured_content: normalized.structuredContent === null ? null : JSON.stringify(normalized.structuredContent), https_url: normalized.httpsUrl, publisher: normalized.publisher }).returningAll().executeTakeFirstOrThrow();
      await recordCurriculumAudit(transaction, { administratorId: administrator.id, correlationId, operation: "lesson-material.created", targetType: "LessonMaterial", targetId: created.id, reasonCode: "LESSON_MATERIAL_CREATED" });
      return created;
    });
    return { __typename: "AddLessonMaterialSuccess" as const, material: lessonMaterialProjection(material) };
  } catch (error) {
    if (await recordCaughtMutation(db, administrator, correlationId, "lesson-material.created", "LessonUnit", input.lessonUnitId, error)) return conflict("The Lesson Unit must exist.");
    throw error;
  }
}

export async function reviseLessonMaterial(db: Database, administrator: Administrator, input: { materialId: string } & LessonMaterialDefinition, correlationId: string) {
  const normalized = normalizeLessonMaterial(input);
  if (!normalized.valid || !input.title.trim()) {
    await recordCurriculumAudit(db, { administratorId: administrator.id, correlationId, operation: "lesson-material.revised", targetType: "LessonMaterial", targetId: input.materialId, outcome: "DENIED", reasonCode: "INVALID_LESSON_MATERIAL" });
    return { __typename: "InvalidLessonMaterial" as const, code: "INVALID_LESSON_MATERIAL", message: normalized.valid ? "A Lesson Material title is required." : normalized.message };
  }
  try {
    const material = await inTransaction(db, async (transaction) => {
      const existing = await transaction.selectFrom("lesson_materials").select(["id", "lesson_unit_id"]).where("id", "=", input.materialId).forUpdate().executeTakeFirst();
      if (!existing) throw new CurriculumRuleViolation("lesson material does not exist");
      await transaction.selectFrom("lesson_units").select("id").where("id", "=", existing.lesson_unit_id).forUpdate().executeTakeFirstOrThrow();
      const duplicate = await transaction.selectFrom("lesson_materials").select("id").where("lesson_unit_id", "=", existing.lesson_unit_id).where("title", "=", input.title.trim()).where("id", "!=", input.materialId).executeTakeFirst();
      if (duplicate) throw new CurriculumRuleViolation("material title already exists");
      const revised = await transaction.updateTable("lesson_materials").set({ kind: input.kind, title: input.title.trim(), structured_content: normalized.structuredContent === null ? null : JSON.stringify(normalized.structuredContent), https_url: normalized.httpsUrl, publisher: normalized.publisher }).where("id", "=", input.materialId).returningAll().executeTakeFirstOrThrow();
      await recordCurriculumAudit(transaction, { administratorId: administrator.id, correlationId, operation: "lesson-material.revised", targetType: "LessonMaterial", targetId: input.materialId, reasonCode: "LESSON_MATERIAL_REVISED" });
      return revised;
    });
    return { __typename: "ReviseLessonMaterialSuccess" as const, material: lessonMaterialProjection(material) };
  } catch (error) {
    if (await recordCaughtMutation(db, administrator, correlationId, "lesson-material.revised", "LessonMaterial", input.materialId, error)) return conflict("The Lesson Material must exist and its title must be unique within the Lesson Unit.");
    throw error;
  }
}

export async function saveTeacherProfile(db: Database, administrator: Administrator, input: { teacherUserId: string; pronouns?: string | null; profileImageUrl?: string | null; professionalBiography: string; topicKeys: string[] }, correlationId: string) {
  try {
    await inTransaction(db, async (transaction) => {
      const role = await transaction.selectFrom("role_assignments").select("role").where("user_id", "=", input.teacherUserId).where("role", "=", "TEACHER").executeTakeFirst();
      if (!role) throw new CurriculumRuleViolation("teacher role required");
      const topicKeys = [...new Set(input.topicKeys)];
      const topics = topicKeys.length ? await transaction.selectFrom("topics").select("key").where("key", "in", topicKeys).execute() : [];
      if (topics.length !== topicKeys.length) throw new CurriculumRuleViolation("topic does not exist");
      await transaction.insertInto("teacher_profiles").values({ teacher_user_id: input.teacherUserId, pronouns: input.pronouns ?? null, profile_image_url: input.profileImageUrl ?? null, professional_bio: input.professionalBiography.trim() }).onConflict((candidate) => candidate.column("teacher_user_id").doUpdateSet({ pronouns: input.pronouns ?? null, profile_image_url: input.profileImageUrl ?? null, professional_bio: input.professionalBiography.trim(), updated_at: new Date() })).execute();
      await transaction.deleteFrom("teacher_profile_topics").where("teacher_user_id", "=", input.teacherUserId).execute();
      if (topicKeys.length) await transaction.insertInto("teacher_profile_topics").values(topicKeys.map((topic_key) => ({ teacher_user_id: input.teacherUserId, topic_key }))).execute();
      await recordCurriculumAudit(transaction, { administratorId: administrator.id, correlationId, operation: "teacher-profile.saved", targetType: "TeacherProfile", targetId: input.teacherUserId, reasonCode: "TEACHER_PROFILE_SAVED" });
    });
    return { __typename: "SaveTeacherProfileSuccess" as const, teacherProfile: (await publicTeacherProfile(db, input.teacherUserId, administrator.locale))! };
  } catch (error) {
    await recordCaughtMutation(db, administrator, correlationId, "teacher-profile.saved", "TeacherProfile", input.teacherUserId, error);
    throw error;
  }
}

async function qualificationNotification(transaction: Database, teacherUserId: string, messageId: string, variables: Record<string, unknown>, sourceReference: string) {
  const teacher = await transaction.selectFrom("users").select("interface_locale").where("id", "=", teacherUserId).executeTakeFirstOrThrow();
  const locale = teacher.interface_locale ?? "en";
  const level = String((variables.curriculumLevels as string[])[0]);
  const targetLanguage = String(variables.targetLanguage);
  const template = interfaceMessages[locale][messageId as "teacher-qualification.granted.teacher" | "teacher-qualification.removed.teacher"];
  const renderedContent = String(new IntlMessageFormat(template, locale).format({ targetLanguage, curriculumLevel: level, effectiveTime: new Date(String(variables.effectiveTime)) }));
  await transaction.insertInto("in_app_notifications").values({ recipient_user_id: teacherUserId, message_id: messageId, variables: JSON.stringify(variables), source_reference: sourceReference }).execute();
  await transaction.insertInto("email_notification_intents").values({ recipient_user_id: teacherUserId, message_id: messageId, locale, variables: JSON.stringify(variables), rendered_content: renderedContent, source_reference: sourceReference }).execute();
}

export async function changeTeacherQualification(db: Database, administrator: Administrator, input: { teacherUserId: string; targetLanguage: string; curriculumLevel: CurriculumLevel }, correlationId: string, action: "grant" | "remove") {
  try {
    const result = await inTransaction(db, async (transaction) => {
      await sql`select pg_advisory_xact_lock(hashtextextended(${`qualification:${input.teacherUserId}:${input.targetLanguage}:${input.curriculumLevel}`}, 0))`.execute(transaction);
      const existingQualification = await transaction.selectFrom("teacher_qualifications").select("id").where("teacher_user_id", "=", input.teacherUserId).where("target_language", "=", input.targetLanguage).where("curriculum_level", "=", input.curriculumLevel).forUpdate().executeTakeFirst();
      let qualificationId = existingQualification?.id;
      if (action === "grant" && existingQualification) return { blocked: null, unchanged: "ALREADY_GRANTED" as const, qualificationId };
      if (action === "remove" && !existingQualification) return { blocked: null, unchanged: "NOT_GRANTED" as const, qualificationId };
      if (action === "remove") {
        const sessions = await transaction.selectFrom("class_sessions").innerJoin("lesson_units", "lesson_units.id", "class_sessions.lesson_unit_id").innerJoin("courses", "courses.id", "lesson_units.course_id")
          .select("class_sessions.id").where("class_sessions.teacher_user_id", "=", input.teacherUserId).where("class_sessions.state", "=", "PUBLISHED").where("class_sessions.starts_at", ">", new Date()).where("courses.target_language", "=", input.targetLanguage).where("courses.curriculum_level", "=", input.curriculumLevel).orderBy("class_sessions.starts_at").execute();
        if (sessions.length) return { blocked: sessions.map(({ id }) => id), unchanged: null, qualificationId };
      }
      if (action === "grant") {
        const role = await transaction.selectFrom("role_assignments").select("role").where("user_id", "=", input.teacherUserId).where("role", "=", "TEACHER").executeTakeFirst();
        const profile = await transaction.selectFrom("teacher_profiles").select("teacher_user_id").where("teacher_user_id", "=", input.teacherUserId).executeTakeFirst();
        if (!role || !profile) throw new CurriculumRuleViolation("teacher role and profile required");
        const qualification = await transaction.insertInto("teacher_qualifications").values({ teacher_user_id: input.teacherUserId, target_language: input.targetLanguage, curriculum_level: input.curriculumLevel, granted_by_user_id: administrator.id }).onConflict((candidate) => candidate.columns(["teacher_user_id", "target_language", "curriculum_level"]).doUpdateSet({ granted_by_user_id: administrator.id })).returning("id").executeTakeFirstOrThrow();
        qualificationId = qualification.id;
      } else {
        await transaction.deleteFrom("teacher_qualifications").where("teacher_user_id", "=", input.teacherUserId).where("target_language", "=", input.targetLanguage).where("curriculum_level", "=", input.curriculumLevel).executeTakeFirstOrThrow();
      }
      const messageId = action === "grant" ? "teacher-qualification.granted.teacher" : "teacher-qualification.removed.teacher";
      const notificationSourceReference = `${messageId}:${qualificationId ?? `${input.teacherUserId}:${input.targetLanguage}:${input.curriculumLevel}`}`;
      await qualificationNotification(transaction, input.teacherUserId, messageId, { targetLanguage: input.targetLanguage, curriculumLevels: [input.curriculumLevel], effectiveTime: new Date().toISOString() }, notificationSourceReference);
      await recordCurriculumAudit(transaction, { administratorId: administrator.id, correlationId, operation: `teacher-qualification.${action === "grant" ? "granted" : "removed"}`, targetType: "TeacherQualification", targetId: qualificationId ?? input.teacherUserId, reasonCode: action === "grant" ? "TEACHER_QUALIFICATION_GRANTED" : "TEACHER_QUALIFICATION_REMOVED" });
      return { blocked: null, unchanged: null, qualificationId };
    });
    if (result.blocked) {
      await recordCurriculumAudit(db, { administratorId: administrator.id, correlationId, operation: "teacher-qualification.removed", targetType: "TeacherQualification", targetId: result.qualificationId ?? input.teacherUserId, outcome: "DENIED", reasonCode: "FUTURE_CLASS_SESSIONS_REQUIRE_QUALIFICATION" });
      return { __typename: "TeacherQualificationRemovalBlocked" as const, code: "FUTURE_CLASS_SESSIONS_REQUIRE_QUALIFICATION", classSessionIds: result.blocked };
    }
    if (result.unchanged) {
      await recordCurriculumAudit(db, { administratorId: administrator.id, correlationId, operation: action === "grant" ? "teacher-qualification.granted" : "teacher-qualification.removed", targetType: "TeacherQualification", targetId: result.qualificationId ?? input.teacherUserId, outcome: "DENIED", reasonCode: result.unchanged });
      return conflict(result.unchanged === "ALREADY_GRANTED" ? "That Teacher Qualification is already granted." : "That Teacher Qualification is not currently granted.");
    }
    return { __typename: "ChangeTeacherQualificationSuccess" as const, teacherProfile: (await publicTeacherProfile(db, input.teacherUserId, administrator.locale))! };
  } catch (error) {
    if (await recordCaughtMutation(db, administrator, correlationId, action === "grant" ? "teacher-qualification.granted" : "teacher-qualification.removed", "TeacherQualification", input.teacherUserId, error)) return conflict("The User must have a Teacher Role Assignment and public Teacher Profile.");
    throw error;
  }
}
