import { pathToFileURL } from "node:url";

import { parseAppConfig } from "../config.js";
import { canonicalCurriculumFixtures } from "./canonical-curriculum-fixtures.js";
import { createDatabase, type Database } from "./database.js";
import { migrateDatabase } from "./migrate.js";
import type { CurriculumLevel } from "./types.js";
import { monthlySubscriptionAnniversary } from "../subscription/subscription-time.js";

export const DEMO_STUDENT_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_ENGLISH_STUDENT_ID = "00000000-0000-4000-8000-000000000002";
export const DEMO_FIRST_USE_STUDENT_ID = "00000000-0000-4000-8000-000000000003";
export const DEMO_LIMITED_STUDENT_ID = "00000000-0000-4000-8000-000000000004";

export async function seedDemoStudents(db: Database) {
  const demoStudents = [
    {
      id: DEMO_STUDENT_ID,
      identity_issuer: "https://fake.local/",
      identity_subject: DEMO_STUDENT_ID,
      display_name: "Sofía Rivera",
      interface_locale: "es" as const,
      display_time_zone: "America/Denver",
    },
    {
      id: DEMO_ENGLISH_STUDENT_ID,
      identity_issuer: "https://fake.local/",
      identity_subject: DEMO_ENGLISH_STUDENT_ID,
      display_name: "Alex Morgan",
      interface_locale: "en" as const,
      display_time_zone: "America/New_York",
    },
    {
      id: DEMO_FIRST_USE_STUDENT_ID,
      identity_issuer: "https://fake.local/",
      identity_subject: DEMO_FIRST_USE_STUDENT_ID,
      display_name: "Jordan Lee",
      interface_locale: null,
      display_time_zone: null,
    },
    {
      id: DEMO_LIMITED_STUDENT_ID,
      identity_issuer: "https://fake.local/",
      identity_subject: DEMO_LIMITED_STUDENT_ID,
      display_name: "Casey Nguyen",
      interface_locale: "en" as const,
      display_time_zone: "America/Chicago",
    },
  ];
  for (const student of demoStudents) {
    await db
      .insertInto("users")
      .values(student)
      .onConflict((conflict) => conflict.column("id").doUpdateSet(student))
      .execute();
  }
  await db
    .insertInto("role_assignments")
    .values([
      { user_id: DEMO_STUDENT_ID, role: "STUDENT" },
      { user_id: DEMO_STUDENT_ID, role: "TEACHER" },
      { user_id: DEMO_STUDENT_ID, role: "ORGANIZATION_MANAGER" },
      { user_id: DEMO_STUDENT_ID, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: DEMO_ENGLISH_STUDENT_ID, role: "STUDENT" },
      { user_id: DEMO_ENGLISH_STUDENT_ID, role: "TEACHER" },
      { user_id: DEMO_ENGLISH_STUDENT_ID, role: "ORGANIZATION_MANAGER" },
      { user_id: DEMO_ENGLISH_STUDENT_ID, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: DEMO_FIRST_USE_STUDENT_ID, role: "STUDENT" },
      { user_id: DEMO_LIMITED_STUDENT_ID, role: "STUDENT" },
    ])
    .onConflict((conflict) => conflict.columns(["user_id", "role"]).doNothing())
    .execute();
}

export async function seedDemoSubscription(db: Database, now = new Date()) {
  if (!db.isTransaction) {
    await db.transaction().execute((transaction) => seedDemoSubscription(transaction as Database, now));
    return;
  }
  const activatedAt = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
  activatedAt.setUTCMilliseconds(0);
  const nextAnniversaryAt = monthlySubscriptionAnniversary(activatedAt, 1);
  await db.insertInto("class_credit_accounts").values({ student_user_id: DEMO_STUDENT_ID })
    .onConflict((conflict) => conflict.column("student_user_id").doNothing()).execute();
  const grant = await db.insertInto("class_credit_ledger_entries").values({
    student_user_id: DEMO_STUDENT_ID,
    amount: 8,
    source: "SUBSCRIPTION_GRANT",
    source_reference: "canonical-subscription:initial",
    reason: null,
  }).onConflict((conflict) => conflict.columns(["source", "source_reference"]).doNothing())
    .returning("id").executeTakeFirst();
  if (grant) {
    const account = await db.selectFrom("class_credit_accounts").select("available_balance")
      .where("student_user_id", "=", DEMO_STUDENT_ID).forUpdate().executeTakeFirstOrThrow();
    await db.updateTable("class_credit_accounts").set({ available_balance: account.available_balance + 8, updated_at: now })
      .where("student_user_id", "=", DEMO_STUDENT_ID).executeTakeFirstOrThrow();
  }
  await db.insertInto("subscriptions").values({
    id: "00000000-0000-4000-8000-000000000031",
    student_user_id: DEMO_STUDENT_ID,
    state: "ACTIVE",
    activated_at: activatedAt,
    anchor_day: activatedAt.getUTCDate(),
    accounting_time_utc: [activatedAt.getUTCHours(), activatedAt.getUTCMinutes(), activatedAt.getUTCSeconds()].map((part) => String(part).padStart(2, "0")).join(":"),
    next_anniversary_at: nextAnniversaryAt,
    cancellation_effective_at: null,
  }).onConflict((conflict) => conflict.column("student_user_id").doUpdateSet({
    state: "ACTIVE",
    activated_at: activatedAt,
    anchor_day: activatedAt.getUTCDate(),
    accounting_time_utc: [activatedAt.getUTCHours(), activatedAt.getUTCMinutes(), activatedAt.getUTCSeconds()].map((part) => String(part).padStart(2, "0")).join(":"),
    renewal_count: 0,
    next_anniversary_at: nextAnniversaryAt,
    cancellation_effective_at: null,
    updated_at: now,
  })).execute();
}

const referenceFixtures: Record<string, [string, string]> = {
  "en-a1-02": ["Transport for London maps", "https://tfl.gov.uk/maps_/maps"],
  "en-a1-05": ["Met Office UK forecast guide", "https://weather.metoffice.gov.uk/guides/uk-forecast"],
  "es-a1-03": ["Gastronomía y enoturismo — Spain.info", "https://www.spain.info/es/gastronomia-enoturismo/"],
  "es-a1-04": ["Actividades del AVE: pedir y dar la hora", "https://cvc.cervantes.es/ensenanza/actividades_ave/niveli/ficha_02.htm"],
};

export async function seedDemoCurriculum(db: Database) {
  if (!db.isTransaction) {
    await db.transaction().execute((transaction) => seedDemoCurriculum(transaction as Database));
    return;
  }
  const courseIds = new Map<string, string>();
  for (const fixture of canonicalCurriculumFixtures) {
    const stable_key = fixture.stableKey;
    const [target_language, level] = stable_key.split("-") as [string, string];
    const curriculum_level = level!.toUpperCase() as CurriculumLevel;
    const { title, summary } = fixture;
    const course = await db.insertInto("courses").values({ stable_key, target_language, curriculum_level, title, summary })
      .onConflict((conflict) => conflict.column("stable_key").doUpdateSet({ title, summary }))
      .returning("id").executeTakeFirstOrThrow();
    courseIds.set(stable_key, course.id);
  }
  const unitIds = new Map<string, string>();
  for (const courseFixture of canonicalCurriculumFixtures) for (const unitFixture of courseFixture.units) {
    const { stableKey: stable_key, title, summary, objectives, topicKeys, order, state } = unitFixture;
    const courseKey = stable_key.slice(0, 5);
    const retired = state === "RETIRED";
    const authoredInSpanish = stable_key.startsWith("es-");
    const unit = await db.insertInto("lesson_units").values({
      stable_key, course_id: courseIds.get(courseKey)!, title,
      summary,
      objectives: JSON.stringify(objectives), sort_order: order, state: retired ? "RETIRED" : "ACTIVE",
      replacement_lesson_unit_id: null, retired_at: retired ? new Date("2025-01-01T00:00:00Z") : null,
    }).onConflict((conflict) => conflict.column("stable_key").doUpdateSet({ title, summary, objectives: JSON.stringify(objectives), sort_order: order, state }))
      .returning("id").executeTakeFirstOrThrow();
    unitIds.set(stable_key, unit.id);
    await db.deleteFrom("lesson_unit_topics").where("lesson_unit_id", "=", unit.id).execute();
    await db.insertInto("lesson_unit_topics").values(topicKeys.map((topic_key) => ({ lesson_unit_id: unit.id, topic_key }))).execute();
    const guideTitle = authoredInSpanish ? `Guía de la unidad: ${title}` : `Lesson guide: ${title}`;
    const structured_content = [
      { type: "heading", level: 2, text: guideTitle },
      { type: "paragraph", text: authoredInSpanish ? "Guía original para una sesión de clase de 60 minutos." : "Original guide for a teacher-led 60-minute Class Session." },
      { type: "list", items: objectives },
      { type: "heading", level: 3, text: authoredInSpanish ? "Lenguaje clave" : "Key language" },
      { type: "paragraph", text: authoredInSpanish ? `Expresiones prácticas para ${title.toLocaleLowerCase("es")}.` : `Practical expressions for ${title.toLocaleLowerCase("en")}.` },
      { type: "heading", level: 3, text: authoredInSpanish ? "Ejemplo original" : "Original example" },
      { type: "paragraph", text: authoredInSpanish ? "A: ¿Practicamos juntos? B: Sí, empecemos con un ejemplo." : "A: Shall we practise together? B: Yes, let's begin with an example." },
      { type: "heading", level: 3, text: authoredInSpanish ? "Propuestas para la sesión" : "Session prompts" },
      { type: "list", items: authoredInSpanish ? ["Activación y modelo.", "Práctica guiada en parejas.", "Comprobación y reflexión final."] : ["Warm-up and model.", "Guided pair practice.", "Final check and reflection."] },
      { type: "emphasis", text: authoredInSpanish ? "Practica, comprueba y reflexiona." : "Practice, check, and reflect." },
    ];
    await db.insertInto("lesson_materials").values({ lesson_unit_id: unit.id, kind: "STRUCTURED_TEXT", title: guideTitle, structured_content: JSON.stringify(structured_content), https_url: null, publisher: null })
      .onConflict((conflict) => conflict.columns(["lesson_unit_id", "title"]).doUpdateSet({ structured_content: JSON.stringify(structured_content) })).execute();
    const reference = referenceFixtures[stable_key];
    if (reference) await db.insertInto("lesson_materials").values({ lesson_unit_id: unit.id, kind: "HTTPS_REFERENCE", title: reference[0], structured_content: null, https_url: reference[1], publisher: new URL(reference[1]).hostname })
      .onConflict((conflict) => conflict.columns(["lesson_unit_id", "title"]).doUpdateSet({ https_url: reference[1] })).execute();
  }
  await db.updateTable("lesson_units").set({ replacement_lesson_unit_id: unitIds.get("en-a1-01")! }).where("stable_key", "=", "en-a1-00").execute();
  await db.insertInto("teacher_profiles").values({ teacher_user_id: DEMO_STUDENT_ID, pronouns: "ella/she", profile_image_url: null, professional_bio: "Bilingual teacher focused on practical conversation." })
    .onConflict((conflict) => conflict.column("teacher_user_id").doUpdateSet({ professional_bio: "Bilingual teacher focused on practical conversation." })).execute();
  await db.insertInto("teacher_profile_topics").values([{ teacher_user_id: DEMO_STUDENT_ID, topic_key: "EC" }, { teacher_user_id: DEMO_STUDENT_ID, topic_key: "PL" }]).onConflict((conflict) => conflict.doNothing()).execute();
  await db.insertInto("teacher_qualifications").values([{ teacher_user_id: DEMO_STUDENT_ID, target_language: "en", curriculum_level: "A1", granted_by_user_id: DEMO_STUDENT_ID }, { teacher_user_id: DEMO_STUDENT_ID, target_language: "es", curriculum_level: "A1", granted_by_user_id: DEMO_STUDENT_ID }]).onConflict((conflict) => conflict.doNothing()).execute();
}

async function main() {
  const config = parseAppConfig(process.env);
  const db = createDatabase(config.DATABASE_URL);
  try {
    await migrateDatabase(db);
    await seedDemoStudents(db);
    await seedDemoSubscription(db);
    await seedDemoCurriculum(db);
  } finally {
    await db.destroy();
  }
}

const invokedPath = process.argv[1];
if (
  process.env.BUNDLED_TEST_API !== "true" &&
  invokedPath &&
  import.meta.url === pathToFileURL(invokedPath).href
) {
  await main();
}
