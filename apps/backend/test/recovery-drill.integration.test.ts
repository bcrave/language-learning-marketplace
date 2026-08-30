import { randomUUID } from "node:crypto";

import { TELEMETRY_SAFE_CONTEXT_KEYS } from "@marketplace/core";
import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { sql } from "kysely";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase, type Database } from "../src/database/database.js";
import { latestMigrationName, migrateDatabase } from "../src/database/migrate.js";
import { loadCanonicalFixtures } from "../src/fixtures/canonical-fixture-loader.js";
import { canonicalFixtureManifest } from "../src/fixtures/canonical-fixture-manifest.js";
import { RECOVERY_TIME_TARGET_MILLISECONDS } from "../src/observability/alert-policy.js";
import {
  buildReadinessEvidenceRecord,
  readinessEvidenceFindings,
  readinessExercisesFor,
} from "../src/operations/readiness-evidence.js";
import {
  recordRecoveryDrillEvidence,
  renderRecoveryDrillSummary,
  runRecoveryDrill,
  type RecoveryDrillCheckId,
  type RecoveryDrillReport,
} from "../src/operations/recovery-drills.js";
import { writeWorkerHeartbeat } from "../src/worker/worker-heartbeat.js";

const EVIDENCE_LINK = "https://github.com/bcrave/language-learning-marketplace/actions/runs/42";

/**
 * The schema this build ships, rather than a name that has to be edited into
 * three places every time a migration lands.
 */
const SCHEMA_VERSION = await latestMigrationName();

/**
 * The drills are exercised at the highest seam they have: a real PostgreSQL
 * database carrying the canonical fixtures, standing in for the restored copy.
 * Everything the drill reports is read out of that database, so a check that
 * passed because it had nothing to look at fails here.
 */
describe("recovery drills", () => {
  let postgres: StartedPostgreSqlContainer;
  let restored: Database;
  let deployment: Database;
  const loadedAt = new Date();

  const outcomeOf = (report: RecoveryDrillReport, check: RecoveryDrillCheckId) =>
    report.checks.find((entry) => entry.check === check)?.outcome;

  const runDrill = (
    db: Database,
    options: Partial<Parameters<typeof runRecoveryDrill>[1]> = {},
  ) =>
    runRecoveryDrill(db, {
      kind: "BACKUP_RESTORATION",
      correlationId: `recovery-drill-${randomUUID()}`,
      release: "9b8b961",
      startedAt: loadedAt,
      now: () => loadedAt,
      ...options,
    });

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const template = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(template);
    await template.destroy();

    restored = createDatabase(
      await clonePostgreSqlTemplate(postgres, `drill_restored_${randomUUID().replaceAll("-", "")}`),
    );
    deployment = createDatabase(
      await clonePostgreSqlTemplate(postgres, `drill_deployment_${randomUUID().replaceAll("-", "")}`),
    );
    await loadCanonicalFixtures(restored, { now: loadedAt, correlationId: "restored-load" });

    // Graphile Worker installs its own schema on first run, so a restored copy
    // that ever ran the worker carries it. This is that copy.
    await sql`create schema graphile_worker`.execute(restored);
    await sql`
      create table graphile_worker.jobs (
        id bigserial primary key,
        task_identifier text not null,
        run_at timestamptz not null default now(),
        attempts integer not null default 0,
        max_attempts integer not null default 4,
        locked_at timestamptz
      )
    `.execute(restored);
    await writeWorkerHeartbeat(restored, { release: "9b8b961", observedAt: loadedAt });
  }, 240_000);

  afterEachRestoreState();

  afterAll(async () => {
    await restored?.destroy();
    await deployment?.destroy();
    await postgres?.stop();
  });

  /** Puts back anything an individual test corrupted to prove a check catches it. */
  function afterEachRestoreState() {
    beforeEach(async () => {
      await sql`delete from graphile_worker.jobs`.execute(restored);
      await writeWorkerHeartbeat(restored, { release: "9b8b961", observedAt: loadedAt });
      await restored
        .updateTable("maintenance_state")
        .set({ state: "AVAILABLE", holder_id: null, correlation_id: null })
        .where("singleton", "=", true)
        .execute();
    });
  }

  it("proves a healthy restored copy on every check an isolated copy can answer", async () => {
    const report = await runDrill(restored);

    expect(report.outcome).toBe("PASSED");
    expect(report.appliedSchemaVersion).toBe(SCHEMA_VERSION);
    expect(report.expectedSchemaVersion).toBe(SCHEMA_VERSION);
    expect(report.fixtureManifestVersion).toBe(canonicalFixtureManifest.version);
    expect(report.withinRecoveryTimeTarget).toBe(true);
    expect(outcomeOf(report, "drill.schemaCompatible")).toBe("PASSED");
    expect(outcomeOf(report, "drill.fixtureInvariants")).toBe("PASSED");
    expect(outcomeOf(report, "drill.canonicalAggregates")).toBe("PASSED");
    expect(outcomeOf(report, "drill.ledgerInvariantSample")).toBe("PASSED");
    expect(outcomeOf(report, "drill.workerRecovery")).toBe("PASSED");
    expect(outcomeOf(report, "drill.safeReturnToService")).toBe("PASSED");
  });

  // An isolated copy serves no public origin and has no live worker. Saying so
  // is the point: a check that reported PASSED here would put a journey in the
  // readiness record that nobody drove.
  it("says plainly which checks an isolated copy cannot answer, rather than passing them", async () => {
    const report = await runDrill(restored);

    expect(outcomeOf(report, "drill.criticalRoleJourneys")).toBe("NOT_APPLICABLE");
    expect(outcomeOf(report, "drill.authentication")).toBe("NOT_APPLICABLE");
    expect(report.outcome).toBe("PASSED");
  });

  it("catches a Booking whose Class Credit deduction did not survive the restore", async () => {
    const booking = await restored
      .selectFrom("bookings")
      .select(["id", "student_user_id"])
      .where("state", "=", "ACTIVE")
      .executeTakeFirstOrThrow();

    // The application cannot lose a ledger entry — the append-only trigger is
    // there precisely so it cannot — but a partial restore can, which is the
    // failure this drill exists to catch. Suspending the trigger is how the
    // test reaches a state only a damaged restore produces.
    await sql`
      alter table class_credit_ledger_entries disable trigger class_credit_ledger_entries_append_only
    `.execute(restored);
    // The deduction and the balance it produced are both undone, so the account
    // still equals the sum of its ledger. Only comparing the Booking against its
    // own entries finds a session that was taken for free.
    await restored
      .deleteFrom("class_credit_ledger_entries")
      .where("source", "=", "BOOKING_DEDUCTION")
      .where("source_reference", "=", booking.id)
      .execute();
    await sql`
      update class_credit_accounts set available_balance = available_balance + 1
      where student_user_id = ${booking.student_user_id}
    `.execute(restored);

    const report = await runDrill(restored);
    expect(outcomeOf(report, "drill.canonicalAggregates")).toBe("PASSED");
    expect(outcomeOf(report, "drill.ledgerInvariantSample")).toBe("FAILED");
    expect(report.outcome).toBe("FAILED");

    await sql`
      update class_credit_accounts set available_balance = available_balance - 1
      where student_user_id = ${booking.student_user_id}
    `.execute(restored);
    await restored
      .insertInto("class_credit_ledger_entries")
      .values({
        student_user_id: booking.student_user_id,
        amount: -1,
        source: "BOOKING_DEDUCTION",
        source_reference: booking.id,
        reason: null,
      })
      .execute();
    await sql`
      alter table class_credit_ledger_entries enable trigger class_credit_ledger_entries_append_only
    `.execute(restored);
  });

  it("fails a restore that carries no worker state to resume from", async () => {
    await sql`delete from worker_heartbeats`.execute(restored);

    const report = await runDrill(restored);
    expect(outcomeOf(report, "drill.workerRecovery")).toBe("FAILED");
    expect(report.outcome).toBe("FAILED");
  });

  it("refuses to call a copy still holding a maintenance lease ready for service", async () => {
    await restored
      .updateTable("maintenance_state")
      .set({ state: "INDETERMINATE", holder_id: "github-rebuild:1", correlation_id: "rebuild-1" })
      .where("singleton", "=", true)
      .execute();

    const report = await runDrill(restored);
    expect(outcomeOf(report, "drill.safeReturnToService")).toBe("FAILED");
    expect(report.outcome).toBe("FAILED");
  });

  // ADR 0023 sets one hour as the target recovery time. A restore that proved
  // every invariant six hours later has not proved the demonstration recoverable
  // in the sense the target means, so the drill fails on the clock alone.
  it("fails a drill that proved everything past the recovery-time target", async () => {
    const report = await runDrill(restored, {
      startedAt: new Date(loadedAt.getTime() - RECOVERY_TIME_TARGET_MILLISECONDS - 1),
    });

    expect(report.checks.every((check) => check.outcome !== "FAILED")).toBe(true);
    expect(report.withinRecoveryTimeTarget).toBe(false);
    expect(report.outcome).toBe("FAILED");
  });

  it("measures recovery from when it began, not from when validation started", async () => {
    const report = await runDrill(restored, {
      startedAt: new Date(loadedAt.getTime() - 12 * 60_000),
    });
    expect(report.durationMilliseconds).toBe(12 * 60_000);
  });

  describe("a change-triggered drill", () => {
    it("requires the deployed role journeys rather than clearing on database state", async () => {
      const report = await runDrill(restored, { kind: "CHANGE_TRIGGERED_RECOVERY" });

      expect(outcomeOf(report, "drill.criticalRoleJourneys")).toBe("FAILED");
      expect(report.outcome).toBe("FAILED");
    });

    it("passes when the journeys pass and the worker is writing now", async () => {
      const report = await runDrill(restored, {
        kind: "CHANGE_TRIGGERED_RECOVERY",
        roleJourneys: async () => ({ passed: true, detail: "9 deployed role smoke check(s) passed" }),
      });

      expect(outcomeOf(report, "drill.criticalRoleJourneys")).toBe("PASSED");
      expect(outcomeOf(report, "drill.workerRecovery")).toBe("PASSED");
      expect(report.outcome).toBe("PASSED");
    });

    it("fails on a stale heartbeat, where an isolated restore only needs resumable state", async () => {
      await writeWorkerHeartbeat(restored, {
        release: "9b8b961",
        observedAt: new Date(loadedAt.getTime() - 10 * 60_000),
      });

      const stale = await runDrill(restored, {
        kind: "CHANGE_TRIGGERED_RECOVERY",
        roleJourneys: async () => ({ passed: true, detail: "smoke passed" }),
      });
      expect(outcomeOf(stale, "drill.workerRecovery")).toBe("FAILED");

      const restore = await runDrill(restored);
      expect(outcomeOf(restore, "drill.workerRecovery")).toBe("PASSED");
    });

    it("fails rather than throwing when the journeys cannot be driven at all", async () => {
      const report = await runDrill(restored, {
        kind: "CHANGE_TRIGGERED_RECOVERY",
        roleJourneys: async () => {
          throw new Error("the public origin refused the connection");
        },
      });

      expect(outcomeOf(report, "drill.criticalRoleJourneys")).toBe("FAILED");
      expect(report.outcome).toBe("FAILED");
    });
  });

  describe("the evidence it leaves behind", () => {
    it("records the drill in the deployment, not in the copy it is discarding", async () => {
      const report = await runDrill(restored);
      await recordRecoveryDrillEvidence(deployment, report, {
        evidenceLink: EVIDENCE_LINK,
        schemaVersion: SCHEMA_VERSION,
        persistedOperationManifestVersion: "persisted.v4",
        signedOffBy: "Project Owner",
        signedOffAt: report.completedAt,
      });

      const audit = await deployment
        .selectFrom("audit_entries")
        .selectAll()
        .where("correlation_id", "=", report.correlationId)
        .executeTakeFirstOrThrow();
      expect(audit.system_identity).toBe("RECOVERY_DRILL");
      expect(audit.operation).toBe("recovery-drill.passed");
      expect(audit.outcome).toBe("SUCCEEDED");
      expect(audit.target_type).toBe("RecoveryDrill");

      expect(
        await restored
          .selectFrom("audit_entries")
          .selectAll()
          .where("correlation_id", "=", report.correlationId)
          .executeTakeFirst(),
      ).toBeUndefined();
      expect(await readinessExercisesFor(restored, report.release)).toEqual([]);
    });

    it("keeps the Audit Entry to evidence the telemetry filter would also carry", async () => {
      const report = await runDrill(restored);
      await recordRecoveryDrillEvidence(deployment, report, {
        evidenceLink: EVIDENCE_LINK,
        schemaVersion: SCHEMA_VERSION,
        persistedOperationManifestVersion: null,
      });

      const audit = await deployment
        .selectFrom("audit_entries")
        .select("evidence")
        .where("correlation_id", "=", report.correlationId)
        .executeTakeFirstOrThrow();
      const safe = new Set<string>([
        ...TELEMETRY_SAFE_CONTEXT_KEYS,
        "drillKind",
        "withinRecoveryTimeTarget",
        "failedChecks",
        "fixtureGeneration",
        "fixtureManifestVersion",
      ]);
      for (const key of Object.keys(audit.evidence)) expect(safe.has(key)).toBe(true);
      expect(JSON.stringify(audit.evidence)).not.toContain(EVIDENCE_LINK);
    });

    // `recovery-drill.passed.system` and `recovery-drill.failed.system` are both
    // None in the notification policy: a drill changes no marketplace state, and
    // the protected workflow run the owner dispatched is the confirmation.
    it("notifies nobody, in app or by email", async () => {
      const before = await deployment
        .selectFrom("in_app_notifications")
        .select((eb) => eb.fn.countAll<string>().as("count"))
        .executeTakeFirstOrThrow();
      const report = await runDrill(restored);
      await recordRecoveryDrillEvidence(deployment, report, {
        evidenceLink: EVIDENCE_LINK,
        schemaVersion: SCHEMA_VERSION,
        persistedOperationManifestVersion: null,
      });

      expect(
        await deployment
          .selectFrom("in_app_notifications")
          .select((eb) => eb.fn.countAll<string>().as("count"))
          .executeTakeFirstOrThrow(),
      ).toEqual(before);
      expect(
        await deployment.selectFrom("email_notification_intents").selectAll().execute(),
      ).toEqual([]);
    });

    // ADR 0059 narrows an Organization Manager to entries acted *by* a manager of
    // their own Organization. A background action carries no actor and no acting
    // role, which is what keeps operational evidence out of that scope.
    it("carries no actor or acting role, so no Organization scope can reach it", async () => {
      const report = await runDrill(restored);
      await recordRecoveryDrillEvidence(deployment, report, {
        evidenceLink: EVIDENCE_LINK,
        schemaVersion: SCHEMA_VERSION,
        persistedOperationManifestVersion: null,
      });

      const audit = await deployment
        .selectFrom("audit_entries")
        .selectAll()
        .where("correlation_id", "=", report.correlationId)
        .executeTakeFirstOrThrow();
      expect(audit.actor_user_id).toBeNull();
      expect(audit.acting_role).toBeNull();
    });

    it("replaces an earlier run of the same drill for the same candidate", async () => {
      const first = await runDrill(restored);
      await recordRecoveryDrillEvidence(deployment, first, {
        evidenceLink: EVIDENCE_LINK,
        schemaVersion: SCHEMA_VERSION,
        persistedOperationManifestVersion: null,
      });
      const second = await runDrill(restored);
      await recordRecoveryDrillEvidence(deployment, second, {
        evidenceLink: EVIDENCE_LINK,
        schemaVersion: SCHEMA_VERSION,
        persistedOperationManifestVersion: null,
      });

      const recorded = await readinessExercisesFor(deployment, second.release);
      const drills = recorded.filter((row) => row.exercise === "backup-restoration-drill");
      expect(drills).toHaveLength(1);
      expect(drills[0]!.correlationId).toBe(second.correlationId);
    });

    it("keeps the two drills apart, so one cannot stand in for the other", async () => {
      const backup = await runDrill(restored);
      const change = await runDrill(restored, {
        kind: "CHANGE_TRIGGERED_RECOVERY",
        roleJourneys: async () => ({ passed: true, detail: "smoke passed" }),
      });
      for (const report of [backup, change]) {
        await recordRecoveryDrillEvidence(deployment, report, {
          evidenceLink: EVIDENCE_LINK,
          schemaVersion: SCHEMA_VERSION,
          persistedOperationManifestVersion: null,
          signedOffBy: "Project Owner",
          signedOffAt: report.completedAt,
        });
      }

      expect(
        (await readinessExercisesFor(deployment, backup.release))
          .map((row) => row.exercise)
          .sort(),
      ).toEqual(["backup-restoration-drill", "change-triggered-recovery-drill"]);
    });

    it("lists only the checks that actually ran among the tests it claims to have passed", async () => {
      const report = await runDrill(restored);
      await recordRecoveryDrillEvidence(deployment, report, {
        evidenceLink: EVIDENCE_LINK,
        schemaVersion: SCHEMA_VERSION,
        persistedOperationManifestVersion: null,
      });

      const recorded = (await readinessExercisesFor(deployment, report.release)).find(
        (row) => row.exercise === "backup-restoration-drill",
      );
      expect(recorded?.testIdentifiers).not.toContain("drill.criticalRoleJourneys");
      expect(recorded?.testIdentifiers).toContain("drill.ledgerInvariantSample");
    });

    it("refuses to record a drill whose evidence link would publish access", async () => {
      const report = await runDrill(restored);
      await expect(
        recordRecoveryDrillEvidence(deployment, report, {
          evidenceLink: "https://railway.com/download?token=abc123",
          schemaVersion: SCHEMA_VERSION,
          persistedOperationManifestVersion: null,
        }),
      ).rejects.toThrow(/private provider evidence/);

      expect(
        await deployment
          .selectFrom("audit_entries")
          .selectAll()
          .where("correlation_id", "=", report.correlationId)
          .executeTakeFirst(),
      ).toBeUndefined();
    });

    it("feeds the readiness record's backup row from the drill that ran", async () => {
      const report = await runDrill(restored);
      await recordRecoveryDrillEvidence(deployment, report, {
        evidenceLink: EVIDENCE_LINK,
        schemaVersion: SCHEMA_VERSION,
        persistedOperationManifestVersion: "persisted.v4",
        signedOffBy: "Project Owner",
        signedOffAt: report.completedAt,
      });

      const record = buildReadinessEvidenceRecord({
        candidate: {
          release: report.release,
          schemaVersion: SCHEMA_VERSION,
          fixtureManifestVersion: canonicalFixtureManifest.version,
          persistedOperationManifestVersion: "persisted.v4",
          configurationFingerprints: { "Operator guide": "8f1c2d3e4a5b6c7d" },
          generatedAt: loadedAt,
          projectOwnerSignOff: "Project Owner",
        },
        exercises: await readinessExercisesFor(deployment, report.release),
      });

      const backups = record.rows.find(
        (row) => row.family === "backups-and-recovery-verification",
      );
      expect(backups?.exercises.map((row) => row.exercise)).toContain("backup-restoration-drill");
      expect(backups?.conditions.map((condition) => condition.id))
        .toContain("backups.restore-drill-failed");

      // Every other family is still unexercised, and the release stays blocked
      // on exactly those — a passing drill does not release a candidate.
      const blocked = readinessEvidenceFindings(record);
      expect(blocked.every((finding) => finding.check === "readiness.familyExercised")).toBe(true);
      expect(blocked.map((finding) => finding.family))
        .not.toContain("backups-and-recovery-verification");
    });
  });

  it("renders a summary carrying check outcomes and no raw evidence", async () => {
    const report = await runDrill(restored);
    const summary = renderRecoveryDrillSummary(report);

    expect(summary).toContain("drill.ledgerInvariantSample");
    expect(summary).toContain(report.correlationId);
    expect(summary).toContain(canonicalFixtureManifest.version);
    expect(summary).not.toMatch(/postgres(?:ql)?:\/\//);
    expect(summary).not.toMatch(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  });
});
