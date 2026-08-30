import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApi } from "../src/api/app.js";
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
const STUDENT = canonicalFixtureManifest.identities.find(
  (identity) => identity.displayName === "Casey Nguyen",
)!.id;

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
      administrator: { "x-demo-user-id": ADMINISTRATOR },
    };
  }

  it("proves authentication, localization, discovery, Booking, and cancellation", async () => {
    const report = await runDeployedSmoke({
      origin,
      authorizationFor: credentials(),
    });

    expect(report.checks.map(({ name }) => name)).toEqual([
      "authentication.anonymousDenied",
      "boundary.persistedOperationsOnly",
      "authentication.studentIdentified",
      "discovery.results",
      "localization.teacherProfileLocalized",
      "booking.created",
      "booking.cancelled",
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
      .toEqual(expect.arrayContaining(["booking.created", "booking.cancelled"]));
  });

  it("keeps no credential or personal content in its evidence", async () => {
    const report = await runDeployedSmoke({ origin, authorizationFor: credentials() });

    const evidence = JSON.stringify(report);
    expect(evidence).not.toContain(STUDENT);
    expect(evidence).not.toContain(ADMINISTRATOR);
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
