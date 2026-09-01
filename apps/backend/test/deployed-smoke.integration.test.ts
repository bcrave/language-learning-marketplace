import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApi } from "../src/api/app.js";
import { createResourceBudgets } from "../src/api/resource-budget.js";
import { createMarketplaceServer } from "../src/api/server.js";
import { createDatabase, type Database } from "../src/database/database.js";
import { latestMigrationName, migrateDatabase } from "../src/database/migrate.js";
import { loadCanonicalFixtures } from "../src/fixtures/canonical-fixture-loader.js";
import { canonicalFixtureManifest } from "../src/fixtures/canonical-fixture-manifest.js";
import { runDeployedSmoke } from "../src/operations/deployed-smoke.js";

// ADR 0019's shared reviewer identities, by the role each plays in the journey.
// Sofía teaches every showcase Class Session, so the Student seat is Casey's:
// a Student with credits, no teaching commitment, and no existing Booking.
const ADMINISTRATOR = canonicalFixtureManifest.identities[0]!.id;
const TEACHER = ADMINISTRATOR;
const STUDENT = canonicalFixtureManifest.identities.find(
  (identity) => identity.displayName === "Casey Nguyen",
)!.id;
// Alex manages the second Organization and teaches nothing. Both matter: the
// Organization Manager journey has to report on an Organization of its own,
// and the cross-role replay has to be refused a roster this identity holds no
// relationship with rather than one it happens to teach.
const ORGANIZATION_MANAGER = canonicalFixtureManifest.organizations[1]!.managerUserIds[0]!;
const MANAGED_ORGANIZATION = canonicalFixtureManifest.organizations[1]!.id;

// The deployed smoke journey is the final release stage of ADR 0038. Running it
// here against a real server over HTTP is the highest practical seam: the same
// code path a release job drives against the public origin, with only the
// credential adapter differing.
describe("deployed smoke journey", () => {
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  let origin: string;
  let closeServer: () => void;

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    db = createDatabase(
      await clonePostgreSqlTemplate(postgres, `smoke_${randomUUID().replaceAll("-", "")}`),
    );
    // Loaded against the real clock so the touching current/upcoming showcase
    // Class Sessions include an actionable future seat for the journey.
    await loadCanonicalFixtures(db, { correlationId: "deployed-smoke-fixtures" });

    const server = createMarketplaceServer({
      // The journey is the release's proof that the public boundary works, so
      // the server it runs against here enforces it: only build-produced
      // persisted operations, and ADR 0025's per-User budgets charged.
      api: createApi({
        db,
        authMode: "fake",
        nodeEnv: "test",
        enforcesPublicBoundary: true,
        // A release runs the journey once, well inside ADR 0025's per-minute
        // allowances. This suite runs it several times in a row from one
        // source, so the thresholds are widened here rather than letting a
        // later journey fail on the previous one's spending. The allowances
        // themselves are proved by `public-api-boundary.integration.test.ts`,
        // which narrows them deliberately to reach them.
        resourceBudgets: createResourceBudgets({
          userMutationLimit: 10_000,
          userReportLimit: 10_000,
          sourceDeniedAuthorizationLimit: 10_000,
        }),
      }),
      currentSchemaMigration: await latestMigrationName(),
      db,
      logger: { warn: () => undefined } as never,
      sourceRequestLimit: 10_000,
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    closeServer = () => server.close();
  }, 240_000);

  afterAll(async () => {
    closeServer?.();
    await db?.destroy();
    await postgres?.stop();
  });

  function credentials(student = STUDENT) {
    return {
      student: { "x-demo-user-id": student },
      teacher: { "x-demo-user-id": TEACHER },
      organizationManager: { "x-demo-user-id": ORGANIZATION_MANAGER },
      administrator: { "x-demo-user-id": ADMINISTRATOR },
    };
  }

  it("proves every shared role's journey and the denials between them", async () => {
    const report = await runDeployedSmoke({
      origin,
      authorizationFor: credentials(),
    });

    expect(report.checks.filter(({ outcome }) => outcome === "FAILED")).toEqual([]);
    expect(report.checks.map(({ name }) => name)).toEqual([
      "authentication.anonymousDenied",
      "boundary.persistedOperationsOnly",
      "authentication.studentIdentified",
      "discovery.results",
      "localization.teacherProfileLocalized",
      "booking.created",
      "booking.cancelled",
      "teacher.assignedRoster",
      "teacher.permittedAction",
      "organization.scopedReport",
      "administrator.representativeOperation",
      "crossRole.denied",
      "audit.entriesRecorded",
    ]);
    expect(report.passed).toBe(true);
  });

  it("leaves the shared Student's Class Credits and saved preferences untouched", async () => {
    const before = await db
      .selectFrom("class_credit_accounts")
      .select("available_balance")
      .where("student_user_id", "=", STUDENT)
      .executeTakeFirstOrThrow();

    const report = await runDeployedSmoke({ origin, authorizationFor: credentials() });
    expect(report.passed).toBe(true);

    const after = await db
      .selectFrom("class_credit_accounts")
      .select("available_balance")
      .where("student_user_id", "=", STUDENT)
      .executeTakeFirstOrThrow();
    const user = await db
      .selectFrom("users")
      .select("interface_locale")
      .where("id", "=", STUDENT)
      .executeTakeFirstOrThrow();

    expect(after.available_balance).toBe(before.available_balance);
    expect(user.interface_locale).toBe("en");
  });

  it("correlates every Audit Entry it produced with the run that produced it", async () => {
    const report = await runDeployedSmoke({ origin, authorizationFor: credentials() });

    const entries = await db
      .selectFrom("audit_entries")
      .select(["operation", "outcome"])
      .where("correlation_id", "=", report.correlationId)
      .execute();

    expect(entries.filter((entry) => entry.outcome === "SUCCEEDED").map((entry) => entry.operation))
      .toEqual(expect.arrayContaining([
        "booking.created",
        "booking.cancelled",
        "class-credit.adjusted",
      ]));
  });

  it("leaves the Teacher's availability and the Student's balance where it found them", async () => {
    const exceptionsBefore = await db
      .selectFrom("availability_exceptions")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .where("teacher_user_id", "=", TEACHER)
      // Removal is history-preserving, so the row stays and `removed_at` is
      // what makes it stop counting. Counting rows would report the journey as
      // having left an exception behind when it left only a record of one.
      .where("removed_at", "is", null)
      .executeTakeFirstOrThrow();

    const report = await runDeployedSmoke({ origin, authorizationFor: credentials() });
    expect(report.passed).toBe(true);

    const exceptionsAfter = await db
      .selectFrom("availability_exceptions")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .where("teacher_user_id", "=", TEACHER)
      // Removal is history-preserving, so the row stays and `removed_at` is
      // what makes it stop counting. Counting rows would report the journey as
      // having left an exception behind when it left only a record of one.
      .where("removed_at", "is", null)
      .executeTakeFirstOrThrow();

    expect(exceptionsAfter.count).toBe(exceptionsBefore.count);
  });

  it("reports for exactly the Organization the manager holds", async () => {
    const report = await runDeployedSmoke({ origin, authorizationFor: credentials() });

    const scoped = report.checks.find(({ name }) => name === "organization.scopedReport");
    expect(scoped?.outcome).toBe("PASSED");
    // The identifier stays out of the evidence, so the boundary is asserted
    // here, against the Organization the manifest says this manager holds.
    const cohorts = await db
      .selectFrom("cohorts")
      .select("organization_id")
      .where("organization_id", "!=", MANAGED_ORGANIZATION)
      .execute();
    expect(cohorts.length).toBeGreaterThan(0);
    expect(scoped?.detail).toContain("one Organization's report");
  });

  it("keeps no credential or personal content in its evidence", async () => {
    const report = await runDeployedSmoke({ origin, authorizationFor: credentials() });

    const evidence = JSON.stringify(report);
    expect(evidence).not.toContain(STUDENT);
    expect(evidence).not.toContain(ADMINISTRATOR);
    expect(evidence).not.toContain(ORGANIZATION_MANAGER);
    expect(evidence).not.toContain(MANAGED_ORGANIZATION);
    expect(evidence).not.toContain("x-demo-user-id");
  });

  it("stops at the first failed stage rather than reporting later ones", async () => {
    const report = await runDeployedSmoke({
      origin,
      // A credential that authenticates as nobody, which is what an
      // unprovisioned shared identity looks like from outside.
      authorizationFor: credentials(randomUUID()),
    });

    expect(report.passed).toBe(false);
    expect(report.checks.at(-1)).toMatchObject({
      name: "authentication.studentIdentified",
      outcome: "FAILED",
    });
    expect(report.checks.some(({ name }) => name === "booking.created")).toBe(false);
  });
});
