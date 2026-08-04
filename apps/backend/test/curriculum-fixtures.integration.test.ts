import { randomUUID } from "node:crypto";

import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase, type Database } from "../src/database/database.js";
import { canonicalCurriculumFixtures } from "../src/database/canonical-curriculum-fixtures.js";
import { migrateDatabase } from "../src/database/migrate.js";
import { seedDemoCurriculum, seedDemoStudents } from "../src/database/seed.js";

describe("Canonical synthetic curriculum fixtures", () => {
  let db: Database;
  let postgres: StartedPostgreSqlContainer;

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    db = createDatabase(await clonePostgreSqlTemplate(postgres, `curriculum_fixtures_${randomUUID().replaceAll("-", "")}`));
    await seedDemoStudents(db);
    await seedDemoCurriculum(db);
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("contains the versioned catalog inventory and retirement identity", async () => {
    expect(Number((await db.selectFrom("courses").select(({ fn }) => fn.countAll().as("count")).executeTakeFirstOrThrow()).count)).toBe(12);
    expect(Number((await db.selectFrom("lesson_units").select(({ fn }) => fn.countAll().as("count")).executeTakeFirstOrThrow()).count)).toBe(33);
    expect(Number((await db.selectFrom("lesson_units").select(({ fn }) => fn.countAll().as("count")).where("state", "=", "ACTIVE").executeTakeFirstOrThrow()).count)).toBe(32);
    expect(Number((await db.selectFrom("lesson_materials").select(({ fn }) => fn.countAll().as("count")).executeTakeFirstOrThrow()).count)).toBe(37);
    expect(Number((await db.selectFrom("lesson_materials").select(({ fn }) => fn.countAll().as("count")).where("kind", "=", "HTTPS_REFERENCE").executeTakeFirstOrThrow()).count)).toBe(4);
    expect(Number((await db.selectFrom("topics").select(({ fn }) => fn.countAll().as("count")).executeTakeFirstOrThrow()).count)).toBe(8);

    const retired = await db.selectFrom("lesson_units as retired")
      .innerJoin("lesson_units as replacement", "replacement.id", "retired.replacement_lesson_unit_id")
      .select(["retired.stable_key as retired_key", "retired.state", "replacement.stable_key as replacement_key"])
      .where("retired.stable_key", "=", "en-a1-00").executeTakeFirstOrThrow();
    expect(retired).toEqual({ retired_key: "en-a1-00", state: "RETIRED", replacement_key: "en-a1-01" });
  });

  it("persists every canonical authored summary, objective, Topic, state, and order", async () => {
    for (const courseFixture of canonicalCurriculumFixtures) {
      const course = await db.selectFrom("courses").select(["id", "title", "summary"]).where("stable_key", "=", courseFixture.stableKey).executeTakeFirstOrThrow();
      expect(course).toMatchObject({ title: courseFixture.title, summary: courseFixture.summary });
      for (const unitFixture of courseFixture.units) {
        const unit = await db.selectFrom("lesson_units").select(["id", "title", "summary", "objectives", "sort_order", "state"]).where("stable_key", "=", unitFixture.stableKey).executeTakeFirstOrThrow();
        const topicKeys = (await db.selectFrom("lesson_unit_topics").select("topic_key").where("lesson_unit_id", "=", unit.id).orderBy("topic_key").execute()).map(({ topic_key }) => topic_key);
        expect(unit).toMatchObject({ title: unitFixture.title, summary: unitFixture.summary, objectives: [...unitFixture.objectives], sort_order: unitFixture.order, state: unitFixture.state });
        expect(topicKeys).toEqual([...unitFixture.topicKeys].sort());
      }
    }
  });
});
