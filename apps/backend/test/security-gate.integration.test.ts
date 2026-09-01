import { randomUUID } from "node:crypto";

import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase, type Database } from "../src/database/database.js";
import { latestMigrationName, migrateDatabase } from "../src/database/migrate.js";
import { canonicalFixtureManifest } from "../src/fixtures/canonical-fixture-manifest.js";
import { INCIDENT_FAMILIES } from "../src/observability/alert-policy.js";
import {
  buildReadinessEvidenceRecord,
  readinessEvidenceFindings,
  readinessExercisesFor,
  recordReadinessExercise,
} from "../src/operations/readiness-evidence.js";
import {
  buildSecurityGateRecord,
  recordSecurityCheckResult,
  recordSecurityGateEvidence,
  securityCheckResultsFor,
  securityGateFindings,
  securityResultsFromRecoveryDrills,
  SECURITY_GATE_SYSTEM_IDENTITY,
  type SecurityCheckResult,
  type SecurityGateCandidate,
} from "../src/operations/security-gate.js";
import { SECURITY_VERIFICATION_CATALOG } from "../src/operations/security-verification-catalog.js";

const shaped = (...parts: readonly string[]) => parts.join("");
const RAILWAY_TOKEN_SHAPED = shaped("railway", "_", "0123456789abcdefghij");

const EVIDENCE = "https://github.com/bcrave/language-learning-marketplace/actions/runs/9";
const OBSERVED_AT = new Date("2026-09-01T09:00:00.000Z");
const GENERATED_AT = new Date("2026-09-01T10:00:00.000Z");

const SCHEMA_VERSION = await latestMigrationName();

/**
 * The Security Gate is exercised against a real database because that is where
 * its evidence actually lives: results recorded at different times, by
 * different jobs and by a person, then read back for one candidate. A suite
 * that assembled the record from an array in memory would never meet the case
 * the whole design exists for — a check recorded a week ago, against a release
 * that is or is not this one.
 */
describe("the Security Release Gate", () => {
  let postgres: StartedPostgreSqlContainer;
  let db: Database;
  /**
   * A candidate of its own per test. Audit Entries are append-only by design,
   * so the suite cannot clear them between tests and must not share a release
   * identifier across them — the second test would read the first one's record.
   */
  let RELEASE: string;

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const template = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(template);
    await template.destroy();
    db = createDatabase(
      await clonePostgreSqlTemplate(postgres, `gate_${randomUUID().replaceAll("-", "")}`),
    );
  }, 240_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  beforeEach(() => {
    RELEASE = randomUUID().slice(0, 8);
  });

  function candidate(overrides: Partial<SecurityGateCandidate> = {}): SecurityGateCandidate {
    return {
      release: RELEASE,
      schemaVersion: SCHEMA_VERSION,
      fixtureManifestVersion: canonicalFixtureManifest.version,
      persistedOperationManifestVersion: "persisted.v4",
      cspPolicyFingerprint: "0f1e2d3c4b5a6978",
      configurationFingerprints: { "Threat model": "8f1c2d3e4a5b6c7d" },
      scope: "PUBLIC_LAUNCH",
      changedBoundaries: [],
      notRepeated: {},
      evidenceLink: EVIDENCE,
      generatedAt: GENERATED_AT,
      projectOwnerSignOff: "Project Owner",
      ...overrides,
    };
  }

  function result(
    check: string,
    overrides: Partial<SecurityCheckResult> = {},
  ): SecurityCheckResult {
    const catalogued = SECURITY_VERIFICATION_CATALOG.find((entry) => entry.id === check);
    const signed = catalogued?.evidence === "OWNER";
    return {
      check,
      release: RELEASE,
      evidenceKind: catalogued?.evidence ?? "SUITE",
      outcome: "PASSED",
      observedAt: OBSERVED_AT,
      evidenceLink: EVIDENCE,
      observation: `${check} produced its required evidence`,
      residualRisk: null,
      correlationId: "security-gate-1",
      signedOffBy: signed ? "Project Owner" : null,
      signedOffAt: signed ? OBSERVED_AT : null,
      ...overrides,
    };
  }

  /** The two recovery drills, written the way the drill workflow writes them. */
  async function recordRecoveryDrills(release = RELEASE) {
    for (const exercise of ["backup-restoration-drill", "change-triggered-recovery-drill"]) {
      await recordReadinessExercise(db, {
        exercise,
        family: "backups-and-recovery-verification",
        release,
        schemaVersion: SCHEMA_VERSION,
        fixtureManifestVersion: canonicalFixtureManifest.version,
        persistedOperationManifestVersion: "persisted.v4",
        testIdentifiers: ["drill.schemaCompatible", "drill.fixtureInvariants"],
        exercisedAt: OBSERVED_AT,
        measuredRecoveryMilliseconds: 900_000,
        result: "PASSED",
        evidenceLink: EVIDENCE,
        limitation: null,
        followUpOwner: null,
        correlationId: `recovery-drill-${exercise}`,
        signedOffBy: "Project Owner",
        signedOffAt: OBSERVED_AT,
      });
    }
  }

  /** Every check the gate records for itself, passing. */
  async function recordEveryGateCheck() {
    for (const check of SECURITY_VERIFICATION_CATALOG) {
      if (check.evidence === "DRILL") continue;
      await recordSecurityCheckResult(db, result(check.id));
    }
  }

  async function assembleRecord(overrides: Partial<SecurityGateCandidate> = {}) {
    return buildSecurityGateRecord({
      candidate: candidate(overrides),
      results: [
        ...(await securityCheckResultsFor(db, RELEASE)),
        ...securityResultsFromRecoveryDrills(await readinessExercisesFor(db, RELEASE), RELEASE),
      ],
    });
  }

  describe("recording a result", () => {
    it("reads back exactly what was recorded, for this candidate only", async () => {
      await recordSecurityCheckResult(db, result("configuration.sentry"));
      await recordSecurityCheckResult(
        db,
        result("configuration.caddy", { release: "a0d9c74" }),
      );

      const recorded = await securityCheckResultsFor(db, RELEASE);
      expect(recorded).toEqual([result("configuration.sentry")]);
    });

    it("keeps every attempt so a rerun cannot bury the one that failed", async () => {
      await recordSecurityCheckResult(
        db,
        result("smoke.student", { outcome: "FAILED", observedAt: OBSERVED_AT }),
      );
      await recordSecurityCheckResult(
        db,
        result("smoke.student", {
          outcome: "PASSED",
          observedAt: new Date(OBSERVED_AT.getTime() + 60_000),
        }),
      );

      const recorded = await securityCheckResultsFor(db, RELEASE);
      expect(recorded.map((entry) => entry.outcome)).toEqual(["FAILED", "PASSED"]);
    });

    it("blocks a check that answered differently twice on one candidate", async () => {
      await recordRecoveryDrills();
      await recordEveryGateCheck();
      // The same commit, the same check, a passing rerun after a failure. Each
      // attempt looks ordinary; only the pair is evidence of flakiness, which
      // the release rule blocks on by name.
      await recordSecurityCheckResult(
        db,
        result("smoke.student", {
          outcome: "FAILED",
          observedAt: new Date(OBSERVED_AT.getTime() + 60_000),
        }),
      );
      await recordSecurityCheckResult(
        db,
        result("smoke.student", {
          outcome: "PASSED",
          observedAt: new Date(OBSERVED_AT.getTime() + 120_000),
        }),
      );

      const record = await assembleRecord();
      expect(securityGateFindings(record)).toEqual([
        {
          finding: "security.resultStable",
          check: "smoke.student",
          detail: "1 earlier attempt(s) on this candidate disagreed with the result that stands",
        },
      ]);
    });

    it("refuses a check the verification catalog does not define", async () => {
      await expect(recordSecurityCheckResult(db, result("manual.inventedCase")))
        .rejects.toThrow(/verification catalog/);
      expect(await securityCheckResultsFor(db, RELEASE)).toEqual([]);
    });

    it("refuses evidence that is not a private provider link", async () => {
      await expect(
        recordSecurityCheckResult(
          db,
          result("smoke.anonymous", { evidenceLink: "https://paste.example.test/dump" }),
        ),
      ).rejects.toThrow(/private provider evidence/);
    });

    it("refuses an observation carrying a credential", async () => {
      await expect(
        recordSecurityCheckResult(
          db,
          result("manual.copiedCredentials", {
            observation: `the script sent ${RAILWAY_TOKEN_SHAPED}`,
          }),
        ),
      ).rejects.toThrow(/no raw evidence/);
    });

    it("refuses a residual risk the threat model does not accept", async () => {
      await expect(
        recordSecurityCheckResult(
          db,
          result("manual.replayAndRace", {
            outcome: "FAILED",
            residualRisk: "residual.weWillFixItLater",
            signedOffBy: "Project Owner",
            signedOffAt: OBSERVED_AT,
          }),
        ),
      ).rejects.toThrow(/already accepts/);
    });
  });

  describe("recording what the gate proved", () => {
    it("writes one Audit Entry and every readiness exercise it evidences", async () => {
      await recordRecoveryDrills();
      await recordEveryGateCheck();
      const record = await assembleRecord();
      expect(securityGateFindings(record)).toEqual([]);

      await recordSecurityGateEvidence(db, record, {
        evidenceLink: EVIDENCE,
        correlationId: "security-gate-run-9",
        signedOffBy: "Project Owner",
        signedOffAt: GENERATED_AT,
      });

      const audit = await db
        .selectFrom("audit_entries")
        .selectAll()
        .where("correlation_id", "=", "security-gate-run-9")
        .execute();
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        system_identity: SECURITY_GATE_SYSTEM_IDENTITY,
        operation: "security-gate.passed",
        outcome: "SUCCEEDED",
        target_id: RELEASE,
        reason_code: "SECURITY_GATE_PUBLIC_LAUNCH_PASSED",
      });
      // The entry carries identifiers, counts, and fingerprints, never a
      // credential, an address, or reviewer content.
      const evidence = audit[0]!.evidence as unknown as {
        scope: string;
        findings: string[];
        requiredCheckCount: number;
      };
      expect(evidence).toMatchObject({ scope: "PUBLIC_LAUNCH", findings: [] });
      expect(evidence.requiredCheckCount).toBe(SECURITY_VERIFICATION_CATALOG.length);
    });

    it("records the blocked families rather than leaving them unexercised", async () => {
      await recordRecoveryDrills();
      await recordEveryGateCheck();
      await recordSecurityCheckResult(db, result("configuration.costCeiling", { outcome: "FAILED" }));

      const record = await assembleRecord();
      await recordSecurityGateEvidence(db, record, {
        evidenceLink: EVIDENCE,
        correlationId: "security-gate-run-10",
        limitation: "the seven-day projection is not yet recorded",
        followUpOwner: "Project Owner",
        signedOffBy: "Project Owner",
        signedOffAt: GENERATED_AT,
      });

      const exercises = await readinessExercisesFor(db, RELEASE);
      const cost = exercises.find((exercise) => exercise.family === "deployment-cost-ceiling");
      // Failed, not absent. An unexercised family invites a rerun; a failed one
      // says what to fix.
      expect(cost).toMatchObject({ result: "FAILED", followUpOwner: "Project Owner" });
      const audit = await db
        .selectFrom("audit_entries")
        .select("operation")
        .where("correlation_id", "=", "security-gate-run-10")
        .execute();
      expect(audit).toEqual([{ operation: "security-gate.blocked" }]);
    });

    it("writes the Audit Entry and the readiness rows together or not at all", async () => {
      await recordRecoveryDrills();
      await recordEveryGateCheck();
      const record = await assembleRecord();

      await expect(
        recordSecurityGateEvidence(db, record, {
          evidenceLink: EVIDENCE,
          correlationId: "security-gate-run-11",
          // A limitation carrying an address is refused by the readiness
          // exercise, after the Audit Entry has been inserted in the same
          // transaction. Neither may survive.
          limitation: "an abusive source at 203.0.113.9 was blocked",
          followUpOwner: "Project Owner",
        }),
      ).rejects.toThrow(/no raw evidence/);

      expect(
        await db
          .selectFrom("audit_entries")
          .select("operation")
          .where("correlation_id", "=", "security-gate-run-11")
          .execute(),
      ).toEqual([]);
      expect(
        (await readinessExercisesFor(db, RELEASE)).filter(
          (exercise) => exercise.family !== "backups-and-recovery-verification",
        ),
      ).toEqual([]);
    });
  });

  describe("a candidate that may be published", () => {
    it("clears the Security Gate and the readiness record together", async () => {
      await recordRecoveryDrills();
      await recordEveryGateCheck();

      const record = await assembleRecord();
      expect(securityGateFindings(record)).toEqual([]);

      await recordSecurityGateEvidence(db, record, {
        evidenceLink: EVIDENCE,
        correlationId: "security-gate-run-12",
        signedOffBy: "Project Owner",
        signedOffAt: GENERATED_AT,
      });

      const readiness = buildReadinessEvidenceRecord({
        candidate: {
          release: RELEASE,
          schemaVersion: SCHEMA_VERSION,
          fixtureManifestVersion: canonicalFixtureManifest.version,
          persistedOperationManifestVersion: "persisted.v4",
          configurationFingerprints: { "Operator guide": "8f1c2d3e4a5b6c7d" },
          generatedAt: GENERATED_AT,
          projectOwnerSignOff: "Project Owner",
        },
        exercises: await readinessExercisesFor(db, RELEASE),
      });

      // Every one of the readiness record's ten incident families now carries
      // an exercise for this exact candidate: the two recovery drills wrote
      // their own row, and the gate wrote the other nine families' from what
      // its checks proved. This is the last thing standing between a passing
      // gate and a public deployment.
      expect(readiness.rows.filter((row) => row.exercises.length === 0)).toEqual([]);
      expect(readiness.rows).toHaveLength(Object.keys(INCIDENT_FAMILIES).length);
      expect(readinessEvidenceFindings(readiness)).toEqual([]);
    });

    it("blocks both records when one required check never ran", async () => {
      await recordRecoveryDrills();
      await recordEveryGateCheck();
      await db
        .deleteFrom("security_gate_results")
        .where("check_id", "=", "smoke.crossRoleDenial")
        .execute();

      const record = await assembleRecord();
      expect(securityGateFindings(record)).toEqual([
        {
          finding: "security.checkRequired",
          check: "smoke.crossRoleDenial",
          detail: "no result was recorded for this candidate",
        },
      ]);

      await recordSecurityGateEvidence(db, record, {
        evidenceLink: EVIDENCE,
        correlationId: "security-gate-run-13",
        signedOffBy: "Project Owner",
        signedOffAt: GENERATED_AT,
      });

      const readiness = buildReadinessEvidenceRecord({
        candidate: {
          release: RELEASE,
          schemaVersion: SCHEMA_VERSION,
          fixtureManifestVersion: canonicalFixtureManifest.version,
          persistedOperationManifestVersion: "persisted.v4",
          configurationFingerprints: {},
          generatedAt: GENERATED_AT,
          projectOwnerSignOff: "Project Owner",
        },
        exercises: await readinessExercisesFor(db, RELEASE),
      });
      expect(
        readinessEvidenceFindings(readiness).map((finding) => finding.family),
      ).toContain("deployment-and-deployed-smoke");
    });
  });
});
