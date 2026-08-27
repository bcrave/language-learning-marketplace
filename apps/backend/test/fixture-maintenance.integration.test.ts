import { randomUUID } from "node:crypto";

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
import {
  assessCanonicalDataRecovery,
  reconcileRollingFixtures,
  runCanonicalDataRebuild,
  verifyAndReopenCanonicalData,
} from "../src/fixtures/fixture-maintenance.js";
import { startWorkerHeartbeat } from "../src/worker/worker-heartbeat.js";

describe("fixture maintenance", () => {
  let db: Database;
  let databaseUrl: string;
  let postgres: StartedPostgreSqlContainer;
  const loadedAt = new Date("2026-08-27T12:23:00.000Z");

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const template = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(template);
    await template.destroy();
    databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `fixture_maintenance_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    await loadCanonicalFixtures(db, { now: loadedAt, correlationId: "initial-load" });
  }, 180_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("advances only designated real-clock fixtures and safely replays an hourly run", async () => {
    const before = await db.selectFrom("class_sessions")
      .select(["id", "starts_at", "is_rolling_fixture"])
      .orderBy("id")
      .execute();
    const now = new Date("2026-08-27T13:08:00.000Z");

    const first = await reconcileRollingFixtures(db, {
      now,
      correlationId: "hourly-2026-08-27T13",
    });
    const replay = await reconcileRollingFixtures(db, {
      now,
      correlationId: "hourly-2026-08-27T13",
    });
    const after = await db.selectFrom("class_sessions")
      .select(["id", "starts_at", "is_rolling_fixture"])
      .orderBy("id")
      .execute();

    expect(first).toEqual({ outcome: "ADVANCED", advancedFixtureCount: 3 });
    expect(replay).toEqual({ outcome: "ALREADY_RECONCILED", advancedFixtureCount: 0 });
    expect(after.filter((row) => !row.is_rolling_fixture)).toEqual(
      before.filter((row) => !row.is_rolling_fixture),
    );
    expect(after.filter((row) => row.is_rolling_fixture).map((row) => row.starts_at)).toEqual([
      new Date("2026-08-27T13:00:00.000Z"),
      new Date("2026-08-27T14:00:00.000Z"),
      new Date("2026-08-27T15:00:00.000Z"),
    ]);
    expect(await db.selectFrom("audit_entries")
      .select(["operation", "outcome", "reason_code"])
      .where("correlation_id", "=", "hourly-2026-08-27T13")
      .execute()).toEqual([
      {
        operation: "canonical-fixtures.rolling-reconciled",
        outcome: "SUCCEEDED",
        reason_code: "ROLLING_FIXTURES_ADVANCED",
      },
    ]);
  });

  it("returns reviewer-safe maintenance behavior and rebuilds mutable state transactionally", async () => {
    await db.updateTable("users")
      .set({ display_name: "Reviewer mutation" })
      .where("id", "=", "00000000-0000-4000-8000-000000000001")
      .execute();
    await db.insertInto("users").values({
      id: "10000000-0000-4000-8000-000000000001",
      identity_issuer: "https://synthetic-extra.local/",
      identity_subject: "extra-reviewer",
      display_name: "Extra Reviewer",
      interface_locale: "en",
      display_time_zone: "America/Denver",
    }).execute();

    const rebuilding = runCanonicalDataRebuild(db, {
      correlationId: "rebuild-success",
      dispatchId: "dispatch-success",
      reason: "Restore the public demonstration after reviewer use.",
      now: new Date("2026-08-28T03:00:00.000Z"),
    });
    await waitForMaintenance();

    const server = createMarketplaceServer({
      api: createApi({ db, authMode: "fake", nodeEnv: "test" }),
      currentSchemaMigration: await latestMigrationName(),
      db,
      logger: { warn: () => undefined } as never,
      sourceRequestLimit: 10_000,
    });
    const response = await serverResponse(server, "/health/ready");
    expect(response).toEqual({
      status: 503,
      retryAfter: "60",
      body: { status: "maintenance" },
    });
    server.close();

    expect(await rebuilding).toMatchObject({ outcome: "COMPLETED" });
    expect((await db.selectFrom("users").select("display_name")
      .where("id", "=", "00000000-0000-4000-8000-000000000001")
      .executeTakeFirstOrThrow()).display_name).toBe("Sofía Rivera");
    expect(await db.selectFrom("users").select(["display_name", "access_status"])
      .where("id", "=", "10000000-0000-4000-8000-000000000001")
      .executeTakeFirstOrThrow()).toEqual({
      display_name: "Former User",
      access_status: "FIXTURE_REMOVED",
    });
    expect((await db.selectFrom("maintenance_state").select("state")
      .where("singleton", "=", true).executeTakeFirstOrThrow()).state).toBe("AVAILABLE");
    expect(await db.selectFrom("audit_entries")
      .select(["operation", "outcome", "reason_code"])
      .where("correlation_id", "=", "rebuild-success")
      .orderBy("occurred_at")
      .execute()).toEqual([
      { operation: "canonical-data-rebuild.started", outcome: "SUCCEEDED", reason_code: "CANONICAL_DATA_REBUILD_STARTED" },
      { operation: "canonical-data-rebuild.completed", outcome: "SUCCEEDED", reason_code: "CANONICAL_DATA_REBUILD_COMPLETED" },
    ]);
    expect(await db.selectFrom("canonical_data_rebuilds")
      .select(["initiator", "owner_reason", "fixture_generation", "schema_version", "validation_evidence"])
      .where("dispatch_id", "=", "dispatch-success").executeTakeFirstOrThrow())
      .toMatchObject({
        initiator: "PROJECT_OWNER",
        owner_reason: "Restore the public demonstration after reviewer use.",
        fixture_generation: 1,
        schema_version: "0032_fixture_maintenance.sql",
        validation_evidence: {
          canonicalFixtureInvariants: "PASSED",
          rollingFixtureReconciliation: "PASSED",
        },
      });
    const completedEvidence = await db.selectFrom("audit_entries").select("evidence")
      .where("correlation_id", "=", "rebuild-success")
      .where("operation", "=", "canonical-data-rebuild.completed")
      .executeTakeFirstOrThrow();
    expect(completedEvidence.evidence).toMatchObject({
      initiator: "PROJECT_OWNER",
      fixtureGeneration: 1,
      manifestVersion: canonicalFixtureManifest.version,
      schemaVersion: "0032_fixture_maintenance.sql",
      aggregateValidation: "PASSED",
    });
  });

  it("fails closed during maintenance and rolls a refused replacement back", async () => {
    await db.updateTable("maintenance_state").set({
      state: "REBUILDING",
      holder_id: "another-dispatch",
      correlation_id: "another-correlation",
    }).where("singleton", "=", true).execute();
    await expect(db.updateTable("users").set({ display_name: "must not commit" })
      .where("id", "=", "00000000-0000-4000-8000-000000000001").execute())
      .rejects.toMatchObject({ code: "57P03" });
    await db.updateTable("maintenance_state").set({
      state: "AVAILABLE", holder_id: null, correlation_id: null,
    }).where("singleton", "=", true).execute();

    const before = await db.selectFrom("courses").select("stable_key").orderBy("stable_key").execute();
    const invalidManifest = structuredClone((await import("../src/fixtures/canonical-fixture-manifest.js")).canonicalFixtureManifest);
    invalidManifest.courses.push({
      stableKey: "fr-a1",
      title: "Unaccepted French A1",
      summary: "Must roll back.",
      units: [{
        stableKey: "fr-a1-01", title: "Unaccepted unit", summary: "Must roll back.",
        objectives: ["Never publish."], topicKeys: ["EC"], order: 1, state: "ACTIVE",
      }],
    });

    await expect(runCanonicalDataRebuild(db, {
      correlationId: "rebuild-refused",
      dispatchId: "dispatch-refused",
      reason: "Exercise transactional rollback for a refused fixture generation.",
      now: new Date("2026-08-29T03:00:00.000Z"),
      manifest: invalidManifest,
    })).rejects.toBeDefined();

    expect(await db.selectFrom("courses").select("stable_key").orderBy("stable_key").execute()).toEqual(before);
    expect((await db.selectFrom("maintenance_state").select("state")
      .where("singleton", "=", true).executeTakeFirstOrThrow()).state).toBe("AVAILABLE");
    expect(await db.selectFrom("audit_entries").select(["operation", "outcome", "reason_code"])
      .where("correlation_id", "=", "rebuild-refused").orderBy("occurred_at").execute()).toEqual([
      { operation: "canonical-data-rebuild.started", outcome: "SUCCEEDED", reason_code: "CANONICAL_DATA_REBUILD_STARTED" },
      { operation: "canonical-data-rebuild.rolled-back", outcome: "FAILED", reason_code: "CANONICAL_FIXTURE_VALIDATION_FAILED" },
    ]);
  });

  it("drains an admitted mutation before replacement and serializes another rebuild", async () => {
    const admittedDb = createDatabase(databaseUrl);
    let releaseMutation!: () => void;
    let mutationAdmitted!: () => void;
    const release = new Promise<void>((resolve) => { releaseMutation = resolve; });
    const admitted = new Promise<void>((resolve) => { mutationAdmitted = resolve; });
    const mutation = admittedDb.transaction().execute(async (transaction) => {
      await transaction.updateTable("users").set({ display_name: "Admitted before maintenance" })
        .where("id", "=", "00000000-0000-4000-8000-000000000001").execute();
      mutationAdmitted();
      await release;
    });
    await admitted;

    const rebuild = runCanonicalDataRebuild(db, {
      correlationId: "rebuild-drain",
      dispatchId: "dispatch-drain",
      reason: "Verify that already admitted mutable work drains before replacement.",
      now: new Date("2026-08-30T03:00:00.000Z"),
    });
    await waitForMaintenance();
    await expect(runCanonicalDataRebuild(db, {
      correlationId: "rebuild-overlap",
      dispatchId: "dispatch-overlap",
      reason: "This overlapping rebuild must serialize behind the active holder.",
      now: new Date("2026-08-30T03:00:01.000Z"),
    })).rejects.toThrow("maintenance is active");
    expect(await Promise.race([
      rebuild.then(() => "completed"),
      new Promise<string>((resolve) => setTimeout(() => resolve("waiting"), 25)),
    ])).toBe("waiting");

    releaseMutation();
    await mutation;
    await expect(rebuild).resolves.toMatchObject({ outcome: "COMPLETED" });
    expect((await db.selectFrom("users").select("display_name")
      .where("id", "=", "00000000-0000-4000-8000-000000000001")
      .executeTakeFirstOrThrow()).display_name).toBe("Sofía Rivera");
    await admittedDb.destroy();
  });

  it("requires three healthy observations and an advancing worker heartbeat before reopening", async () => {
    const heartbeat = startWorkerHeartbeat({
      db,
      release: "fixture-maintenance-test",
      intervalMilliseconds: 2,
    });
    await heartbeat.written;
    try {
      await expect(runCanonicalDataRebuild(db, {
        correlationId: "rebuild-readiness",
        dispatchId: "dispatch-readiness",
        reason: "Verify operational readiness before reviewer access returns.",
        now: new Date("2026-08-30T04:00:00.000Z"),
        verifyOperationalReadiness: true,
        readinessObservationIntervalMilliseconds: 10,
        beforeReopen: async () => {
          expect((await db.selectFrom("maintenance_state").select("state")
            .where("singleton", "=", true).executeTakeFirstOrThrow()).state).toBe("REBUILDING");
        },
      })).resolves.toMatchObject({ outcome: "COMPLETED" });
    } finally {
      heartbeat.stop();
    }
  }, 20_000);

  it("keeps a post-commit verification failure closed until a separate recovery verifies and reopens", async () => {
    await expect(runCanonicalDataRebuild(db, {
      correlationId: "rebuild-stale-heartbeat",
      dispatchId: "dispatch-stale-heartbeat",
      reason: "Exercise fail-closed recovery after operational verification fails.",
      now: new Date("2026-08-30T05:00:00.000Z"),
      verifyOperationalReadiness: true,
      readinessObservationIntervalMilliseconds: 2,
    })).rejects.toBeDefined();
    expect((await assessCanonicalDataRecovery(db, new Date("2026-08-30T05:00:00.000Z"))).state)
      .toBe("INDETERMINATE");

    const heartbeat = startWorkerHeartbeat({ db, release: "recovery-test", intervalMilliseconds: 2 });
    await heartbeat.written;
    try {
      await expect(verifyAndReopenCanonicalData(db, {
        correlationId: "recovery-verify-reopen",
        reason: "Verified canonical aggregates and restored reviewer access safely.",
        now: new Date("2026-08-30T05:01:00.000Z"),
      })).resolves.toEqual({ outcome: "REOPENED" });
    } finally {
      heartbeat.stop();
    }
  }, 20_000);

  it("does not reopen when the protected role smoke fails", async () => {
    await expect(runCanonicalDataRebuild(db, {
      correlationId: "rebuild-role-smoke-failed",
      dispatchId: "dispatch-role-smoke-failed",
      reason: "Keep maintenance closed when protected role verification fails.",
      beforeReopen: async () => {
        throw new Error("role smoke failed");
      },
    })).rejects.toThrow("role smoke failed");
    expect(await db.selectFrom("maintenance_state").select(["state", "holder_id"])
      .where("singleton", "=", true).executeTakeFirstOrThrow()).toEqual({
      state: "INDETERMINATE",
      holder_id: "dispatch-role-smoke-failed",
    });
    const assessment = await assessCanonicalDataRecovery(db);
    expect(assessment).toMatchObject({
      state: "INDETERMINATE",
      leaseOwned: true,
      auditEvidenceComplete: true,
      expectedSchemaVersion: "0032_fixture_maintenance.sql",
    });

    const heartbeat = startWorkerHeartbeat({ db, release: "smoke-recovery", intervalMilliseconds: 2 });
    await heartbeat.written;
    try {
      await verifyAndReopenCanonicalData(db, {
        correlationId: "role-smoke-recovery",
        reason: "Verify and reopen after the protected role smoke incident.",
        beforeReopen: async () => undefined,
      });
    } finally {
      heartbeat.stop();
    }
  }, 20_000);

  it("keeps maintenance fail-closed when rollback safety cannot be established", async () => {
    await db.updateTable("class_credit_accounts").set({ available_balance: 99 })
      .where("student_user_id", "=", "00000000-0000-4000-8000-000000000001").execute();
    const invalidManifest = structuredClone((await import("../src/fixtures/canonical-fixture-manifest.js")).canonicalFixtureManifest);
    invalidManifest.expectations.inventory.courses += 1;

    await expect(runCanonicalDataRebuild(db, {
      correlationId: "rebuild-indeterminate",
      dispatchId: "dispatch-indeterminate",
      reason: "Keep reviewer access closed when the prior state cannot be verified.",
      now: new Date("2026-08-31T03:00:00.000Z"),
      manifest: invalidManifest,
    })).rejects.toBeDefined();

    expect(await db.selectFrom("maintenance_state").select(["state", "holder_id"])
      .where("singleton", "=", true).executeTakeFirstOrThrow()).toEqual({
      state: "INDETERMINATE",
      holder_id: "dispatch-indeterminate",
    });
    expect(await db.selectFrom("audit_entries").select(["operation", "reason_code"])
      .where("correlation_id", "=", "rebuild-indeterminate").orderBy("occurred_at").execute())
      .toContainEqual({
        operation: "canonical-data-rebuild.indeterminate",
        reason_code: "CANONICAL_DATA_REBUILD_INDETERMINATE",
      });
    expect((await assessCanonicalDataRecovery(db, new Date("2026-08-31T03:00:00.000Z"))).recommendation)
      .toBe("CLEAN_CANONICAL_DATA_REBUILD");

    await expect(runCanonicalDataRebuild(db, {
      correlationId: "recovery-wrong-incident",
      dispatchId: "recovery-wrong-dispatch",
      reason: "Reject a clean rebuild authorized for a different incident.",
      recoverIndeterminate: true,
      incidentCorrelationId: "different-incident",
    })).rejects.toThrow("incident correlation identifier");

    await expect(runCanonicalDataRebuild(db, {
      correlationId: "recovery-clean-rebuild",
      dispatchId: "recovery-dispatch",
      reason: "Replace the unverifiable prior state with a clean canonical generation.",
      now: new Date("2026-08-31T04:00:00.000Z"),
      recoverIndeterminate: true,
      incidentCorrelationId: "rebuild-indeterminate",
    })).resolves.toMatchObject({ outcome: "COMPLETED" });
  });

  async function waitForMaintenance() {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const row = await db.selectFrom("maintenance_state").select("state")
        .where("singleton", "=", true).executeTakeFirst();
      if (row?.state === "REBUILDING") return;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error("Canonical Data Rebuild did not enter maintenance");
  }
});

async function serverResponse(server: ReturnType<typeof createMarketplaceServer>, path: string) {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server did not listen");
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
  return {
    status: response.status,
    retryAfter: response.headers.get("retry-after"),
    body: await response.json(),
  };
}
