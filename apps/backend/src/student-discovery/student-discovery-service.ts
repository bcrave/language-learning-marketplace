import type { Database } from "../database/database.js";
import type { CurriculumLevel } from "../database/types.js";
import { publicTeacherProfile } from "../curriculum/curriculum-service.js";
import { Temporal } from "@js-temporal/polyfill";
import { sql } from "kysely";
import { z } from "zod";

export class InvalidStudentPlacement extends Error {}

const curriculumLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
const targetLanguageSchema = z.string().regex(/^[a-z]{2,3}$/);
const placementInputSchema = z.object({
  targetLanguage: targetLanguageSchema,
  curriculumLevel: curriculumLevelSchema,
}).strict();

const topicProjection = (topic: { key: string; label_en: string; label_es: string }, locale: "en" | "es") => ({
  key: topic.key,
  label: locale === "es" ? topic.label_es : topic.label_en,
  labelEn: topic.label_en,
  labelEs: topic.label_es,
});

export async function setStudentPlacement(
  db: Database,
  student: { id: string },
  input: { targetLanguage: string; curriculumLevel: CurriculumLevel },
  correlationId: string,
) {
  const parsedInput = placementInputSchema.safeParse(input);
  if (!parsedInput.success) {
    await db.insertInto("audit_entries").values({
      actor_user_id: student.id,
      acting_role: "STUDENT",
      operation: "student-placement.changed",
      target_type: "StudentPlacement",
      target_id: student.id,
      outcome: "DENIED",
      reason_code: "INVALID_STUDENT_PLACEMENT",
      correlation_id: correlationId,
    }).execute();
    throw new InvalidStudentPlacement("Choose a valid target language and Curriculum Level.");
  }
  const placementInput = parsedInput.data;
  return db.transaction().execute(async (transaction) => {
    const placement = await transaction
      .insertInto("student_placements")
      .values({
        student_user_id: student.id,
        target_language: placementInput.targetLanguage,
        curriculum_level: placementInput.curriculumLevel,
      })
      .onConflict((conflict) =>
        conflict.columns(["student_user_id", "target_language"]).doUpdateSet({
          curriculum_level: placementInput.curriculumLevel,
          updated_at: new Date(),
        }),
      )
      .returning(["target_language", "curriculum_level"])
      .executeTakeFirstOrThrow();

    await transaction
      .insertInto("audit_entries")
      .values({
        actor_user_id: student.id,
        acting_role: "STUDENT",
        operation: "student-placement.changed",
        target_type: "StudentPlacement",
        target_id: student.id,
        outcome: "SUCCEEDED",
        reason_code: "STUDENT_PLACEMENT_CHANGED",
        correlation_id: correlationId,
      })
      .execute();

    return {
      targetLanguage: placement.target_language,
      curriculumLevel: placement.curriculum_level,
    };
  });
}

export async function studentPlacements(db: Database, student: { id: string }) {
  const placements = await db
    .selectFrom("student_placements")
    .select(["target_language", "curriculum_level"])
    .where("student_user_id", "=", student.id)
    .orderBy("updated_at", "desc")
    .orderBy("target_language")
    .limit(50)
    .execute();
  return placements.map((placement) => ({
    targetLanguage: placement.target_language,
    curriculumLevel: placement.curriculum_level,
  }));
}

export async function classSessionDiscoveryOptions(db: Database, student: { id: string }) {
  const user = await db.selectFrom("users").select("interface_locale").where("id", "=", student.id).executeTakeFirstOrThrow();
  if (!user.interface_locale) throw new Error("Saved User preferences are required for Class Session Discovery");
  const locale = user.interface_locale;
  const [languages, topics, teachers] = await Promise.all([
    db.selectFrom("courses").select("target_language").distinct().orderBy("target_language").limit(50).execute(),
    db.selectFrom("topics").selectAll().orderBy("key").limit(50).execute(),
    db.selectFrom("teacher_profiles")
      .innerJoin("users", "users.id", "teacher_profiles.teacher_user_id")
      .select(["users.id", "users.display_name"])
      .orderBy("users.display_name")
      .orderBy("users.id")
      .limit(50)
      .execute(),
  ]);
  return {
    targetLanguages: languages.map(({ target_language }) => target_language),
    topics: topics.map((topic) => topicProjection(topic, locale)),
    teachers: teachers.map((teacher) => ({ id: teacher.id, displayName: teacher.display_name })),
  };
}

async function discoveryLessonUnit(db: Database, lessonUnitId: string, locale: "en" | "es") {
  const [unit, topics] = await Promise.all([
    db.selectFrom("lesson_units")
      .select(["id", "title", "summary", "objectives"])
      .where("id", "=", lessonUnitId)
      .executeTakeFirstOrThrow(),
    db.selectFrom("lesson_unit_topics")
      .innerJoin("topics", "topics.key", "lesson_unit_topics.topic_key")
      .select(["topics.key", "topics.label_en", "topics.label_es"])
      .where("lesson_unit_topics.lesson_unit_id", "=", lessonUnitId)
      .orderBy("topics.key")
      .execute(),
  ]);
  return {
    ...unit,
    topics: topics.map((topic) => topicProjection(topic, locale)),
  };
}

const discoveryInputSchema = z.object({
  targetLanguage: targetLanguageSchema,
  curriculumLevel: curriculumLevelSchema.nullish(),
  teacherUserId: z.uuid().nullish(),
  topicKeys: z.array(z.string().regex(/^[A-Z]{2,8}$/)).max(8).nullish(),
  localDate: z.iso.date().nullish(),
  after: z.string().min(1).max(512).nullish(),
}).strict();

type DiscoveryInput = z.input<typeof discoveryInputSchema>;

const apiInstant = (value: Date) => value.toISOString().replace(".000Z", "Z");
const cursorSchema = z.object({ startsAt: z.iso.datetime(), id: z.uuid() }).strict();

export class InvalidDiscoveryInput extends Error {}

function decodeCursor(cursor: string) {
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
  } catch {
    throw new InvalidDiscoveryInput("Choose a valid Class Session Discovery cursor.");
  }
}

function encodeCursor(cursor: z.infer<typeof cursorSchema>) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export async function discoverClassSessions(
  db: Database,
  student: { id: string },
  input: DiscoveryInput,
  now: Date,
) {
  const parsedInput = discoveryInputSchema.safeParse(input);
  if (!parsedInput.success) throw new InvalidDiscoveryInput("Choose valid Class Session Discovery filters.");
  const discoveryInput = parsedInput.data;
  const user = await db
    .selectFrom("users")
    .select(["display_time_zone", "interface_locale"])
    .where("id", "=", student.id)
    .executeTakeFirstOrThrow();
  if (!user.display_time_zone || !user.interface_locale) {
    throw new Error("Saved User preferences are required for Class Session Discovery");
  }
  const locale = user.interface_locale;

  const placement = await db
    .selectFrom("student_placements")
    .select("curriculum_level")
    .where("student_user_id", "=", student.id)
    .where("target_language", "=", discoveryInput.targetLanguage)
    .executeTakeFirst();
  const curriculumLevel = discoveryInput.curriculumLevel ?? placement?.curriculum_level ?? null;
  let firstDate: Temporal.PlainDate;
  try {
    firstDate = discoveryInput.localDate
      ? Temporal.PlainDate.from(discoveryInput.localDate)
      : Temporal.Instant.from(now.toISOString()).toZonedDateTimeISO(user.display_time_zone).toPlainDate();
  } catch {
    throw new InvalidDiscoveryInput("Choose a valid local date.");
  }
  const lastDateExclusive = discoveryInput.localDate ? firstDate.add({ days: 1 }) : firstDate.add({ days: 7 });
  let windowStart: Temporal.Instant;
  let windowEnd: Temporal.Instant;
  try {
    windowStart = firstDate.toPlainDateTime("00:00").toZonedDateTime(user.display_time_zone, { disambiguation: "reject" }).toInstant();
    windowEnd = lastDateExclusive.toPlainDateTime("00:00").toZonedDateTime(user.display_time_zone, { disambiguation: "reject" }).toInstant();
  } catch {
    throw new InvalidDiscoveryInput("Choose a local date with valid boundaries in the saved Display Time Zone.");
  }
  const nowInstant = Temporal.Instant.from(now.toISOString());
  const bookingCutoff = new Date(nowInstant.add({ minutes: 30 }).epochMilliseconds);
  const waitlistCutoff = new Date(nowInstant.add({ hours: 2 }).epochMilliseconds);

  let query = db
    .selectFrom("class_sessions")
    .innerJoin("lesson_units", "lesson_units.id", "class_sessions.lesson_unit_id")
    .innerJoin("courses", "courses.id", "lesson_units.course_id")
    .select([
      "class_sessions.id",
      "class_sessions.lesson_unit_id",
      "class_sessions.teacher_user_id",
      "class_sessions.starts_at",
      "class_sessions.scheduling_time_zone",
      "class_sessions.seat_capacity",
      "class_sessions.occupied_seats",
    ])
    .where("class_sessions.state", "=", "PUBLISHED")
    .where("courses.target_language", "=", discoveryInput.targetLanguage)
    .where("class_sessions.starts_at", ">=", new Date(windowStart.epochMilliseconds))
    .where("class_sessions.starts_at", "<", new Date(windowEnd.epochMilliseconds))
    .where((expression) => expression.or([
      expression.and([
        expression("class_sessions.occupied_seats", "<", expression.ref("class_sessions.seat_capacity")),
        expression("class_sessions.starts_at", ">=", bookingCutoff),
      ]),
      expression.and([
        expression("class_sessions.occupied_seats", "=", expression.ref("class_sessions.seat_capacity")),
        expression("class_sessions.starts_at", ">", waitlistCutoff),
      ]),
    ]));
  if (curriculumLevel) query = query.where("courses.curriculum_level", "=", curriculumLevel);
  if (discoveryInput.teacherUserId) query = query.where("class_sessions.teacher_user_id", "=", discoveryInput.teacherUserId);
  const topicKeys = [...new Set(discoveryInput.topicKeys ?? [])];
  if (topicKeys.length > 0) {
    query = query.where(({ exists, selectFrom }) => exists(
      selectFrom("lesson_unit_topics")
        .select(sql<number>`1`.as("present"))
        .whereRef("lesson_unit_topics.lesson_unit_id", "=", "class_sessions.lesson_unit_id")
        .where("lesson_unit_topics.topic_key", "in", topicKeys),
    ));
  }
  if (discoveryInput.after) {
    const cursor = decodeCursor(discoveryInput.after);
    const cursorStart = new Date(cursor.startsAt);
    query = query.where((expression) => expression.or([
      expression("class_sessions.starts_at", ">", cursorStart),
      expression.and([
        expression("class_sessions.starts_at", "=", cursorStart),
        expression("class_sessions.id", ">", cursor.id),
      ]),
    ]));
  }

  const rows = await query
    .orderBy("class_sessions.starts_at")
    .orderBy("class_sessions.id")
    .limit(21)
    .execute();
  const hasNextPage = rows.length > 20;
  const pageRows = rows.slice(0, 20);
  const nodes = await Promise.all(pageRows.map(async (session) => {
    const [unit, teacherProfile] = await Promise.all([
      discoveryLessonUnit(db, session.lesson_unit_id, locale),
      publicTeacherProfile(db, session.teacher_user_id, locale),
    ]);
    if (!teacherProfile) throw new Error("Published Class Session requires a public Teacher Profile");
    return {
      id: session.id,
      startsAt: apiInstant(session.starts_at),
      endsAt: apiInstant(new Date(Temporal.Instant.from(session.starts_at.toISOString()).add({ hours: 1 }).epochMilliseconds)),
      schedulingTimeZone: session.scheduling_time_zone,
      seatCapacity: session.seat_capacity,
      occupiedSeats: session.occupied_seats,
      lessonUnit: {
        id: unit.id,
        title: unit.title,
        summary: unit.summary,
        objectives: unit.objectives,
        topics: unit.topics,
      },
      teacherProfile,
    };
  }));

  return {
    appliedFilter: {
      targetLanguage: discoveryInput.targetLanguage,
      curriculumLevel,
      teacherUserId: discoveryInput.teacherUserId ?? null,
      topicKeys,
      localDate: discoveryInput.localDate ?? null,
    },
    nodes,
    pageInfo: {
      endCursor: hasNextPage && pageRows.at(-1)
        ? encodeCursor({
            startsAt: pageRows.at(-1)!.starts_at.toISOString(),
            id: pageRows.at(-1)!.id,
          })
        : null,
      hasNextPage,
    },
  };
}
