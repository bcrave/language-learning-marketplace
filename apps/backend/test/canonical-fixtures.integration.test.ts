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
import { validateCanonicalFixtures } from "../src/fixtures/canonical-fixture-invariants.js";
import {
  CanonicalFixtureValidationError,
  loadCanonicalFixtures,
} from "../src/fixtures/canonical-fixture-loader.js";
import {
  CANONICAL_CORRECTED_STUDENT_ID,
  CANONICAL_ENGLISH_STUDENT_ID,
  CANONICAL_FIXTURE_MANIFEST_VERSION,
  CANONICAL_LIMITED_STUDENT_ID,
  CANONICAL_STUDENT_ID,
  CANONICAL_SUSPENDED_STUDENT_ID,
  canonicalFixtureManifest,
} from "../src/fixtures/canonical-fixture-manifest.js";

describe("Canonical synthetic fixture load", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  const loadedAt = new Date();
  const manifest = canonicalFixtureManifest;
  const unitId = new Map<string, string>();

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    db = createDatabase(await clonePostgreSqlTemplate(postgres, `canonical_fixtures_${randomUUID().replaceAll("-", "")}`));
    api = createApi({ db, authMode: "fake", nodeEnv: "test", now: () => loadedAt });

    await loadCanonicalFixtures(db, { now: loadedAt, correlationId: "canonical-load" });
    for (const unit of await db.selectFrom("lesson_units").select(["id", "stable_key"]).execute()) {
      unitId.set(unit.stable_key, unit.id);
    }
  }, 180_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("publishes the versioned manifest with every publication invariant satisfied", async () => {
    expect(manifest.version).toBe(CANONICAL_FIXTURE_MANIFEST_VERSION);
    expect(await validateCanonicalFixtures(db, manifest, loadedAt)).toEqual([]);
  });

  it("records privacy-safe Audit Entries for the background load", async () => {
    const entries = await db.selectFrom("audit_entries")
      .select(["actor_user_id", "system_identity", "acting_role", "operation", "target_type", "target_id", "outcome", "reason_code"])
      .where("correlation_id", "=", "canonical-load")
      .orderBy("occurred_at")
      .execute();

    expect(entries).toEqual([
      { actor_user_id: null, system_identity: "CANONICAL_FIXTURE_LOADER", acting_role: null, operation: "canonical-fixtures.load-started", target_type: "CanonicalFixtureManifest", target_id: CANONICAL_FIXTURE_MANIFEST_VERSION, outcome: "SUCCEEDED", reason_code: "CANONICAL_FIXTURE_LOAD_STARTED" },
      { actor_user_id: null, system_identity: "CANONICAL_FIXTURE_LOADER", acting_role: null, operation: "canonical-fixtures.load-completed", target_type: "CanonicalFixtureManifest", target_id: CANONICAL_FIXTURE_MANIFEST_VERSION, outcome: "SUCCEEDED", reason_code: "CANONICAL_FIXTURE_LOAD_COMPLETED" },
    ]);
    // Nothing about the fixture content, and no person, reaches the entry.
    expect(JSON.stringify(entries)).not.toContain("Alex Morgan");
  });

  it("shows the shared Student the accepted Course Progress, excluding the retired unit", async () => {
    const response = await graphql(
      `query { studentCourseProgress { targetLanguage curriculumLevel activeLessonUnitCount completedActiveLessonUnitCount learningHistory { state countsTowardProgress } } }`,
      undefined,
      CANONICAL_ENGLISH_STUDENT_ID,
    );

    expect(response.data?.studentCourseProgress).toEqual([
      { targetLanguage: "en", curriculumLevel: "A1", activeLessonUnitCount: 6, completedActiveLessonUnitCount: 3, learningHistory: expect.any(Array) },
      { targetLanguage: "en", curriculumLevel: "A2", activeLessonUnitCount: 2, completedActiveLessonUnitCount: 2, learningHistory: expect.any(Array) },
      { targetLanguage: "es", curriculumLevel: "A1", activeLessonUnitCount: 6, completedActiveLessonUnitCount: 2, learningHistory: expect.any(Array) },
      { targetLanguage: "es", curriculumLevel: "B1", activeLessonUnitCount: 2, completedActiveLessonUnitCount: 0, learningHistory: [] },
    ]);
    // The retired unit stays in learning history without counting toward progress.
    const englishA1 = (response.data?.studentCourseProgress as Array<{ learningHistory: Array<{ state: string; countsTowardProgress: boolean }> }>)[0]!;
    expect(englishA1.learningHistory).toHaveLength(4);
    expect(englishA1.learningHistory.filter((entry) => entry.state === "RETIRED")).toEqual([
      { state: "RETIRED", countsTowardProgress: false },
    ]);
  });

  it("opens Lesson Materials only through the accepted relationship", async () => {
    // A Completion on the retired unit keeps its guide reachable; the replacement
    // unit was never completed, so it stays closed.
    expect(await materialTitles("en-a1-00", "STUDENT", CANONICAL_ENGLISH_STUDENT_ID)).toEqual(["Lesson guide: First Introductions"]);
    expect(await materialError("en-a1-01", "STUDENT", CANONICAL_ENGLISH_STUDENT_ID)).toBe("NOT_FOUND");

    // An active future Booking opens both materials of the delivered unit.
    expect(await materialTitles("en-a1-05", "STUDENT", CANONICAL_ENGLISH_STUDENT_ID)).toEqual([
      "Lesson guide: Weather and Simple Plans",
      "Met Office UK forecast guide",
    ]);
    // The same person acting as a qualified but unassigned Teacher reaches nothing.
    expect(await materialError("en-a1-05", "TEACHER", CANONICAL_ENGLISH_STUDENT_ID)).toBe("NOT_FOUND");
    // The assigned Teacher does.
    expect(await materialTitles("en-a1-05", "TEACHER", CANONICAL_STUDENT_ID)).toHaveLength(2);
    // A reporting relationship never opens curriculum content.
    expect(await materialError("en-a1-05", "ORGANIZATION_MANAGER", CANONICAL_STUDENT_ID)).toBe("NOT_FOUND");
    // A Student Cancellation without a Completion leaves nothing behind.
    expect(await materialError("es-a1-03", "STUDENT", CANONICAL_LIMITED_STUDENT_ID)).toBe("NOT_FOUND");
    // The corrected Student loses the Completion but keeps her still-active Booking,
    // which is its own path to the same materials.
    expect(await materialTitles("en-a1-05", "STUDENT", CANONICAL_CORRECTED_STUDENT_ID)).toHaveLength(2);
    expect(await db.selectFrom("lesson_unit_completions").select("id")
      .where("student_user_id", "=", CANONICAL_CORRECTED_STUDENT_ID).execute()).toEqual([]);
  });

  it("reports the frozen Sponsorship boundaries without the pre-Sponsorship unit identity", async () => {
    const response = await graphql(
      `query { organizationAttendanceAndProgressReport {
        organization { name }
        students { studentUserId state cohortNames courseProgress { courseTitle baseline { completedActiveLessonUnitCount activeLessonUnitCount } endingSnapshot { completedActiveLessonUnitCount activeLessonUnitCount } completedLessonUnitGain } }
      } }`,
      undefined,
      CANONICAL_STUDENT_ID,
    );
    const report = response.data?.organizationAttendanceAndProgressReport as {
      organization: { name: string };
      students: Array<{ studentUserId: string; state: string; cohortNames: string[]; courseProgress: Array<Record<string, unknown>> }>;
    };

    expect(report.organization.name).toBe("Nimbus Logistics");
    expect(report.students).toHaveLength(1);
    expect(report.students[0]).toMatchObject({ studentUserId: CANONICAL_ENGLISH_STUDENT_ID, state: "ENDED", cohortNames: ["Warehouse Operations"] });
    expect(report.students[0]!.courseProgress).toContainEqual({
      courseTitle: "Everyday English Foundations",
      baseline: { completedActiveLessonUnitCount: 1, activeLessonUnitCount: 6 },
      endingSnapshot: { completedActiveLessonUnitCount: 3, activeLessonUnitCount: 6 },
      completedLessonUnitGain: 2,
    });
    // The Organization sees counts, never which units the Student completed before
    // the Sponsorship began.
    expect(JSON.stringify(report)).not.toContain("Introductions That Continue");
  });

  it("suspends the lifecycle identity and blocks its authenticated operations", async () => {
    const suspended = await db.selectFrom("users").select(["access_status", "suspension_reason"])
      .where("id", "=", CANONICAL_SUSPENDED_STUDENT_ID).executeTakeFirstOrThrow();
    expect(suspended.access_status).toBe("SUSPENDED");
    expect(suspended.suspension_reason).toBeTruthy();

    const response = await graphql(`query { studentClassCredits { availableBalance } }`, undefined, CANONICAL_SUSPENDED_STUDENT_ID);
    expect(response.errors?.[0]?.extensions.code).toBeDefined();
  });

  it("reloads onto its own published state without changing it", async () => {
    const before = await publishedCounts();
    await loadCanonicalFixtures(db, { now: loadedAt, correlationId: "canonical-reload" });

    expect(await publishedCounts()).toEqual(before);
    expect(await validateCanonicalFixtures(db, manifest, loadedAt)).toEqual([]);
  });

  it("publishes nothing when an invariant fails, and audits the refusal", async () => {
    const emptyDb = createDatabase(await clonePostgreSqlTemplate(postgres, `canonical_refused_${randomUUID().replaceAll("-", "")}`));
    try {
      const overstated = structuredClone(manifest);
      overstated.expectations.inventory.courses += 1;

      await expect(loadCanonicalFixtures(emptyDb, { now: loadedAt, correlationId: "canonical-refused", manifest: overstated }))
        .rejects.toThrow(CanonicalFixtureValidationError);

      // The transaction rolled back, so no half-built demonstration is reachable.
      expect(await emptyDb.selectFrom("courses").select("id").execute()).toEqual([]);
      expect(await emptyDb.selectFrom("users").select("id").execute()).toEqual([]);
      expect(await emptyDb.selectFrom("audit_entries").select(["operation", "outcome", "reason_code"])
        .where("correlation_id", "=", "canonical-refused").orderBy("occurred_at").execute()).toEqual([
        { operation: "canonical-fixtures.load-started", outcome: "SUCCEEDED", reason_code: "CANONICAL_FIXTURE_LOAD_STARTED" },
        { operation: "canonical-fixtures.load-failed", outcome: "FAILED", reason_code: "CANONICAL_FIXTURE_VALIDATION_FAILED" },
      ]);
    } finally {
      await emptyDb.destroy();
    }
  });

  it("names every rule it refused on", async () => {
    const understated = structuredClone(manifest);
    understated.expectations.creditBalances[0]!.availableBalance += 1;
    understated.expectations.completions[0]!.unitKeys = [];

    expect((await validateCanonicalFixtures(db, understated, loadedAt)).map(({ invariant }) => invariant)).toEqual([
      "ledger.expectedBalance",
      "completion.expected",
    ]);
  });

  async function publishedCounts() {
    const tables = ["courses", "lesson_units", "lesson_materials", "users", "class_sessions", "bookings", "attendance_records", "lesson_unit_completions", "class_credit_ledger_entries", "course_progress_snapshots"] as const;
    const counts: Record<string, number> = {};
    for (const table of tables) {
      counts[table] = (await db.selectFrom(table).select("id").execute()).length;
    }
    counts.balances = (await db.selectFrom("class_credit_accounts").select("available_balance").execute())
      .reduce((sum, account) => sum + account.available_balance, 0);
    return counts;
  }

  async function materials(unitKey: string, actingRole: string, subject: string) {
    return graphql(
      `query Materials($lessonUnitId: ID!, $actingRole: UserRole!) { lessonMaterials(lessonUnitId: $lessonUnitId, actingRole: $actingRole) { title } }`,
      { lessonUnitId: unitId.get(unitKey), actingRole },
      subject,
    );
  }

  async function materialTitles(unitKey: string, actingRole: string, subject: string) {
    const response = await materials(unitKey, actingRole, subject);
    expect(response.errors).toBeUndefined();
    return (response.data?.lessonMaterials as Array<{ title: string }>).map(({ title }) => title);
  }

  async function materialError(unitKey: string, actingRole: string, subject: string) {
    return (await materials(unitKey, actingRole, subject)).errors?.[0]?.extensions.code;
  }

  async function graphql(query: string, variables: Record<string, unknown> | undefined, subject: string) {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": randomUUID(),
        "x-demo-user-id": subject,
      },
      body: JSON.stringify({ query, variables }),
    });
    return await response.json() as {
      data?: Record<string, unknown>;
      errors?: Array<{ extensions: { code: string } }>;
    };
  }

});
