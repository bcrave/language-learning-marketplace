import { sql } from "kysely";

import { validateDemonstrationIdentityBinding, type DemonstrationIdentityBinding } from "../auth/demonstration-identities.js";
import type { Database } from "../database/database.js";
import { latestMigrationName } from "../database/migrate.js";
import { canonicalFixtureManifest } from "../fixtures/canonical-fixture-manifest.js";
import { validateCanonicalFixtures } from "../fixtures/canonical-fixture-invariants.js";
import { assessCanonicalDataRecovery } from "../fixtures/fixture-maintenance.js";
import { RECOVERY_TIME_TARGET_MILLISECONDS } from "../observability/alert-policy.js";
import { readWorkerHeartbeat, workerHeartbeatIsFresh } from "../worker/worker-heartbeat.js";
import { recordReadinessExercise } from "./readiness-evidence.js";

/**
 * The two drills ADR 0023 requires before public launch and after a material
 * database change, run as evidence rather than as prose.
 *
 * The operator guide asks an isolated restore to prove "schema compatibility,
 * canonical aggregates, and sampled ledger invariants within the accepted
 * 60-minute recovery-time target", and asks a return to service to prove
 * fixture reconciliation, a fresh worker heartbeat, and the deployed role
 * smokes. This module is the one place that runs those and says, in a
 * privacy-safe report, which of them held.
 *
 * The two kinds differ in what they can honestly prove, and the report says so
 * rather than papering over it. A backup restored into an isolated database
 * serves no public origin, so there is no role journey to drive against it and
 * no live worker writing into it; a change-triggered drill runs against the
 * deployment itself, where both exist and both are required. A check that
 * quietly passed because it had nothing to look at would be the one failure
 * mode a readiness record cannot survive.
 *
 * Nothing here changes state. A drill that repaired what it found would destroy
 * the evidence it exists to produce, and the operator guide's recovery is
 * diagnosis-first: assessment and repair are separate protected dispatches.
 */

export type RecoveryDrillKind = "BACKUP_RESTORATION" | "CHANGE_TRIGGERED_RECOVERY";

/** Stable identifiers the readiness record carries and a reader can rerun. */
export const RECOVERY_DRILL_CHECKS = [
  "drill.schemaCompatible",
  "drill.fixtureInvariants",
  "drill.canonicalAggregates",
  "drill.ledgerInvariantSample",
  "drill.workerRecovery",
  "drill.authentication",
  "drill.criticalRoleJourneys",
  "drill.safeReturnToService",
] as const;

export type RecoveryDrillCheckId = (typeof RECOVERY_DRILL_CHECKS)[number];

export type RecoveryDrillOutcome = "PASSED" | "FAILED" | "NOT_APPLICABLE";

export interface RecoveryDrillCheck {
  check: RecoveryDrillCheckId;
  outcome: RecoveryDrillOutcome;
  /** Privacy-safe: says what was proved or what failed, never a value. */
  detail: string;
}

export interface RecoveryDrillReport {
  kind: RecoveryDrillKind;
  correlationId: string;
  release: string;
  /**
   * When recovery began — the moment the restore or the repair started, not
   * when validation did. The recovery-time target measures the whole outage,
   * and a drill that started its clock after the slow part would always meet it.
   */
  startedAt: Date;
  completedAt: Date;
  durationMilliseconds: number;
  recoveryTimeTargetMilliseconds: number;
  withinRecoveryTimeTarget: boolean;
  appliedSchemaVersion: string | null;
  expectedSchemaVersion: string;
  fixtureManifestVersion: string;
  fixtureGeneration: number;
  checks: readonly RecoveryDrillCheck[];
  outcome: "PASSED" | "FAILED";
}

/** What driving the deployed role journeys saw, where a drill can drive them. */
export interface RoleJourneyResult {
  passed: boolean;
  /** Privacy-safe: names the journeys, never a credential or a response body. */
  detail: string;
}

export interface RecoveryDrillOptions {
  kind: RecoveryDrillKind;
  correlationId: string;
  release: string;
  startedAt: Date;
  now?: () => Date;
  /**
   * Drives the deployed anonymous and shared-role smoke journeys. A
   * change-triggered drill must supply one: the guide's return to service ends
   * in "complete deployed role smokes", and a drill that skipped them would
   * clear an incident on database state alone.
   */
  roleJourneys?: () => Promise<RoleJourneyResult>;
  /**
   * The shared Auth0 binding this deployment signs reviewers in with. Supplying
   * it proves the restored identities are still the ones the manifest describes
   * and still reach every application role.
   *
   * An `Error` is an accepted value, and means the caller could not read a
   * binding at all. Reading one is itself a validation that throws on drift, so
   * a caller that let it throw would lose the drill; handing the failure here
   * turns it into the reported check it should have been.
   */
  identityBinding?: DemonstrationIdentityBinding | Error | null;
}

/**
 * Every Booking's Class Credit movement, checked against the Booking itself.
 *
 * The aggregate check the rebuild already runs proves each account balance
 * equals the sum of its ledger, which a restore that lost both halves of a pair
 * would also satisfy. This is the other direction: a Booking whose deduction is
 * missing was taken for free, and a refund without the Booking having been
 * refunded is a credit created out of nothing. Both survive a balance-versus-sum
 * comparison, and neither survives a reviewer noticing.
 *
 * A rescheduled Booking is charged exactly once, at the start of its chain.
 * `rescheduleBooking` ends the original without a refund and activates the
 * replacement without a deduction, carrying the same credit forward, so the
 * replacement legitimately has none of its own. Expecting one there would fail
 * this check against perfectly healthy data the moment a reviewer reschedules —
 * and a drill that cries wolf on the live demonstration is worse than no drill,
 * because the release it blocks is the one nobody then believes.
 */
async function ledgerInvariantSample(db: Database) {
  const result = await sql<{ booking_count: number; violation_count: number }>`
    select
      count(*)::integer as booking_count,
      count(*) filter (
        where booking.deductions <> booking.expected_deductions
           or booking.refunds <> (case when booking.class_credit_refunded then 1 else 0 end)
      )::integer as violation_count
    from (
      select
        booking.id,
        booking.class_credit_refunded,
        case when booking.rescheduled_from_booking_id is null then 1 else 0 end
          as expected_deductions,
        count(entry.id) filter (where entry.source = 'BOOKING_DEDUCTION')::integer as deductions,
        count(entry.id) filter (where entry.source = 'BOOKING_REFUND')::integer as refunds
      from bookings booking
      left join class_credit_ledger_entries entry
        on entry.source_reference = booking.id::text
       and entry.source in ('BOOKING_DEDUCTION', 'BOOKING_REFUND')
      group by booking.id, booking.class_credit_refunded, booking.rescheduled_from_booking_id
    ) booking
  `.execute(db);
  const row = result.rows[0];
  return {
    bookingCount: row?.booking_count ?? 0,
    violationCount: row?.violation_count ?? 0,
  };
}

/**
 * What a restored copy can say about the worker without one running against it.
 *
 * The durable queue and the heartbeat row are what a restarted worker resumes
 * from, so their presence is the recoverable-state claim. Jobs that had already
 * exhausted their retries when the backup was taken come back exhausted, and
 * the guide clears that family only when every affected job reaches a safe
 * disposition — so they are reported as a limitation to carry forward, not
 * silently dropped and not treated as a failed restore.
 */
async function workerDurableState(db: Database) {
  const heartbeat = await readWorkerHeartbeat(db);
  // Graphile Worker installs its own schema on first run, so asking whether the
  // relation exists is the same question as whether this copy ever carried a
  // queue — and it is a question `select ... from` can only answer by throwing.
  const installed = await sql<{ present: string | null }>`
    select to_regclass('graphile_worker.jobs')::text as present
  `.execute(db);
  if (!installed.rows[0]?.present) {
    return { heartbeat, queueReadable: false, runnableCount: 0, exhaustedCount: 0 };
  }
  const jobs = await sql<{ runnable_count: number; exhausted_count: number }>`
    select
      count(*) filter (where attempts < max_attempts)::integer as runnable_count,
      count(*) filter (where attempts >= max_attempts)::integer as exhausted_count
    from graphile_worker.jobs
  `.execute(db);
  const row = jobs.rows[0];
  return {
    heartbeat,
    queueReadable: true,
    runnableCount: row?.runnable_count ?? 0,
    exhaustedCount: row?.exhausted_count ?? 0,
  };
}

function checked(
  check: RecoveryDrillCheckId,
  outcome: RecoveryDrillOutcome,
  detail: string,
): RecoveryDrillCheck {
  return { check, outcome, detail };
}

/**
 * Runs one drill against `db` and reports what held.
 *
 * `db` is the restored isolated copy for a backup drill and the deployment's
 * own database for a change-triggered one. The report is the evidence; a
 * failing drill returns a `FAILED` report rather than throwing, because the
 * failed checks are exactly what the readiness record and the
 * `backups.restore-drill-failed` alert need to carry.
 */
export async function runRecoveryDrill(
  db: Database,
  options: RecoveryDrillOptions,
): Promise<RecoveryDrillReport> {
  const now = options.now ?? (() => new Date());
  const observedAt = now();
  const expectedSchemaVersion = await latestMigrationName();

  // The assessment reads the maintenance lease, the schema, and the fixtures,
  // and every one of those reads can throw on exactly the copy this drill
  // exists to judge: a backup predating a migration, or one whose restore left
  // a relation missing. Letting it escape would abandon the drill before its
  // first check, leaving the readiness record saying "not exercised" where the
  // truth is "the restore is unusable" — the one substitution a fail-closed
  // record must never make, because unexercised invites a rerun and unusable
  // does not.
  let assessment: Awaited<ReturnType<typeof assessCanonicalDataRecovery>>;
  try {
    assessment = await assessCanonicalDataRecovery(db, observedAt);
  } catch (error) {
    return unreadableCopyReport(options, {
      observedAt: now(),
      expectedSchemaVersion,
      detail: error instanceof Error ? error.message : "the restored copy could not be assessed",
    });
  }
  const checks: RecoveryDrillCheck[] = [];

  checks.push(
    assessment.schemaVersion === expectedSchemaVersion
      ? checked("drill.schemaCompatible", "PASSED", `restored schema is ${expectedSchemaVersion}`)
      : checked(
        "drill.schemaCompatible",
        "FAILED",
        `restored schema is ${assessment.schemaVersion ?? "absent"}, this build expects ${expectedSchemaVersion}`,
      ),
  );

  // Validated at the drill's own instant rather than the backup's: a rolling
  // fixture that has drifted out of its window is what reconciliation exists to
  // fix, and a drill that judged the fixtures against the moment they were
  // written would never see it.
  const violations = await validateCanonicalFixtures(db, canonicalFixtureManifest, observedAt);
  checks.push(
    violations.length === 0
      ? checked(
        "drill.fixtureInvariants",
        "PASSED",
        `manifest ${canonicalFixtureManifest.version} validated with no violation`,
      )
      : checked(
        "drill.fixtureInvariants",
        "FAILED",
        `${violations.length} fixture invariant violation(s) against manifest ${canonicalFixtureManifest.version}`,
      ),
  );

  checks.push(
    assessment.aggregatesSafe
      ? checked("drill.canonicalAggregates", "PASSED", "credit balances and occupied seats agree with their sources")
      : checked("drill.canonicalAggregates", "FAILED", "a credit balance or occupied-seat count disagrees with its source"),
  );

  const ledger = await ledgerInvariantSample(db);
  checks.push(
    ledger.violationCount === 0
      ? checked(
        "drill.ledgerInvariantSample",
        "PASSED",
        `${ledger.bookingCount} Booking(s) each carry exactly their own deduction and refund`,
      )
      : checked(
        "drill.ledgerInvariantSample",
        "FAILED",
        `${ledger.violationCount} of ${ledger.bookingCount} Booking(s) disagree with their Class Credit ledger entries`,
      ),
  );

  checks.push(await workerRecoveryCheck(db, options.kind, observedAt));
  checks.push(authenticationCheck(options.identityBinding));
  checks.push(await roleJourneyCheck(options));

  checks.push(
    assessment.state === "AVAILABLE"
      ? checked("drill.safeReturnToService", "PASSED", "no maintenance lease is held; the marketplace is reopenable")
      : checked(
        "drill.safeReturnToService",
        "FAILED",
        `maintenance state is ${assessment.state}; returning to service needs the assessed repair first`,
      ),
  );

  const completedAt = now();
  const durationMilliseconds = Math.max(0, completedAt.getTime() - options.startedAt.getTime());
  const withinRecoveryTimeTarget = durationMilliseconds <= RECOVERY_TIME_TARGET_MILLISECONDS;

  return {
    kind: options.kind,
    correlationId: options.correlationId,
    release: options.release,
    startedAt: options.startedAt,
    completedAt,
    durationMilliseconds,
    recoveryTimeTargetMilliseconds: RECOVERY_TIME_TARGET_MILLISECONDS,
    withinRecoveryTimeTarget,
    appliedSchemaVersion: assessment.schemaVersion,
    expectedSchemaVersion,
    fixtureManifestVersion: canonicalFixtureManifest.version,
    fixtureGeneration: assessment.fixtureGeneration,
    checks,
    // Missing the recovery-time target fails the drill on its own. ADR 0023
    // states one hour as the target recovery time, and a restore that proved
    // every invariant six hours later has not proved the demonstration is
    // recoverable in the sense the target means.
    outcome:
      checks.every((check) => check.outcome !== "FAILED") && withinRecoveryTimeTarget
        ? "PASSED"
        : "FAILED",
  };
}

/**
 * The report for a copy that could not be read at all.
 *
 * Every check is `FAILED` rather than absent, because a check the drill could
 * not run against an unreadable database is a check that did not pass, and the
 * readiness record's test identifiers would otherwise quietly shrink to the
 * ones that happened to be reachable.
 */
function unreadableCopyReport(
  options: RecoveryDrillOptions,
  context: { observedAt: Date; expectedSchemaVersion: string; detail: string },
): RecoveryDrillReport {
  const durationMilliseconds = Math.max(
    0,
    context.observedAt.getTime() - options.startedAt.getTime(),
  );
  return {
    kind: options.kind,
    correlationId: options.correlationId,
    release: options.release,
    startedAt: options.startedAt,
    completedAt: context.observedAt,
    durationMilliseconds,
    recoveryTimeTargetMilliseconds: RECOVERY_TIME_TARGET_MILLISECONDS,
    withinRecoveryTimeTarget: durationMilliseconds <= RECOVERY_TIME_TARGET_MILLISECONDS,
    appliedSchemaVersion: null,
    expectedSchemaVersion: context.expectedSchemaVersion,
    fixtureManifestVersion: canonicalFixtureManifest.version,
    fixtureGeneration: 0,
    checks: RECOVERY_DRILL_CHECKS.map((check) =>
      checked(check, "FAILED", `the restored copy could not be read: ${context.detail}`),
    ),
    outcome: "FAILED",
  };
}

async function workerRecoveryCheck(
  db: Database,
  kind: RecoveryDrillKind,
  observedAt: Date,
): Promise<RecoveryDrillCheck> {
  const worker = await workerDurableState(db);
  if (kind === "CHANGE_TRIGGERED_RECOVERY") {
    return workerHeartbeatIsFresh(worker.heartbeat, observedAt)
      ? checked(
        "drill.workerRecovery",
        "PASSED",
        `worker heartbeat is fresh on release ${worker.heartbeat.release}`,
      )
      : checked(
        "drill.workerRecovery",
        "FAILED",
        "no fresh worker heartbeat after recovery",
      );
  }
  if (!worker.heartbeat || !worker.queueReadable) {
    return checked(
      "drill.workerRecovery",
      "FAILED",
      worker.heartbeat
        ? "the restored copy carries no readable worker queue"
        : "the restored copy carries no worker heartbeat to resume from",
    );
  }
  return checked(
    "drill.workerRecovery",
    "PASSED",
    `restored worker state is resumable: ${worker.runnableCount} runnable and ${worker.exhaustedCount} exhausted job(s)`,
  );
}

/**
 * Proves the restored identities still are what ADR 0019 promises: the shared
 * demonstration people the manifest describes, covering every application role,
 * with no subject signing in as two of them.
 *
 * A deployment with no binding configured is not a failure — a drill against a
 * locally restored copy legitimately has none — but it is not authentication
 * evidence either, and the record says which of the two it was.
 */
function authenticationCheck(
  binding: DemonstrationIdentityBinding | Error | null | undefined,
): RecoveryDrillCheck {
  if (binding instanceof Error) {
    return checked("drill.authentication", "FAILED", binding.message);
  }
  if (!binding) {
    return checked(
      "drill.authentication",
      "NOT_APPLICABLE",
      "no shared demonstration identity binding was supplied to this drill",
    );
  }
  try {
    validateDemonstrationIdentityBinding(binding);
    return checked(
      "drill.authentication",
      "PASSED",
      `${Object.keys(binding.subjects).length} shared identities cover every application role`,
    );
  } catch (error) {
    return checked(
      "drill.authentication",
      "FAILED",
      error instanceof Error ? error.message : "the shared identity binding is not valid",
    );
  }
}

async function roleJourneyCheck(options: RecoveryDrillOptions): Promise<RecoveryDrillCheck> {
  if (!options.roleJourneys) {
    return options.kind === "CHANGE_TRIGGERED_RECOVERY"
      ? checked(
        "drill.criticalRoleJourneys",
        "FAILED",
        "a change-triggered recovery drill must drive the deployed role journeys",
      )
      : checked(
        "drill.criticalRoleJourneys",
        "NOT_APPLICABLE",
        "an isolated restored copy serves no public origin to drive journeys against",
      );
  }
  try {
    const journeys = await options.roleJourneys();
    return checked(
      "drill.criticalRoleJourneys",
      journeys.passed ? "PASSED" : "FAILED",
      journeys.detail,
    );
  } catch (error) {
    return checked(
      "drill.criticalRoleJourneys",
      "FAILED",
      error instanceof Error ? error.message : "the deployed role journeys could not be driven",
    );
  }
}

/**
 * Renders the summary the workflow shows the Project Owner.
 *
 * Markdown rather than JSON for the same reason the diagnostics summary is: it
 * is read while deciding whether the candidate may be released. Every value
 * here is a check identifier, a count, a duration, or a version — the raw
 * evidence stays in the workflow run and the provider it came from.
 */
export function renderRecoveryDrillSummary(report: RecoveryDrillReport): string {
  const minutes = (milliseconds: number) => (milliseconds / 60_000).toFixed(1);
  return [
    `# Recovery drill: ${report.kind === "BACKUP_RESTORATION" ? "backup restoration" : "change-triggered recovery"}`,
    "",
    `Drill \`${report.correlationId}\` for release \`${report.release}\` finished ${report.outcome}.`,
    "",
    "| Reading | Value |",
    "| --- | --- |",
    `| Recovery began | ${report.startedAt.toISOString()} |`,
    `| Recovery proved | ${report.completedAt.toISOString()} |`,
    `| Measured recovery | ${minutes(report.durationMilliseconds)} min |`,
    `| Recovery-time target | ${minutes(report.recoveryTimeTargetMilliseconds)} min |`,
    `| Within target | ${report.withinRecoveryTimeTarget} |`,
    `| Applied schema | ${report.appliedSchemaVersion ?? "—"} |`,
    `| Expected schema | ${report.expectedSchemaVersion} |`,
    `| Fixture manifest | ${report.fixtureManifestVersion} |`,
    `| Fixture generation | ${report.fixtureGeneration} |`,
    "",
    "## Checks",
    "",
    "| Check | Outcome | Detail |",
    "| --- | --- | --- |",
    ...report.checks.map((check) => `| ${check.check} | ${check.outcome} | ${check.detail} |`),
    "",
  ].join("\n").concat("\n");
}

export const RECOVERY_DRILL_SYSTEM_IDENTITY = "RECOVERY_DRILL";

/**
 * The exercise name each drill kind records under. Both drills prove the same
 * incident family, so they need distinct names: recording them under the family
 * would let the second replace the first, and the readiness record would show
 * one drill where two ran.
 */
export const RECOVERY_DRILL_EXERCISES = {
  BACKUP_RESTORATION: "backup-restoration-drill",
  CHANGE_TRIGGERED_RECOVERY: "change-triggered-recovery-drill",
} as const satisfies Record<RecoveryDrillKind, string>;

/**
 * Writes what the drill proved into the deployment's durable evidence: an Audit
 * Entry for the background action, and the readiness exercise the release
 * record is assembled from.
 *
 * `db` is the deployment, which for a backup drill is *not* the database the
 * drill ran against — evidence written into an isolated copy is discarded along
 * with it, and the point of the drill is that the record outlives the copy.
 *
 * Both writes happen in one transaction. A drill whose Audit Entry committed
 * without its readiness row would be a background action with no evidence
 * behind it; one whose readiness row committed without the Audit Entry would be
 * a release claim with no immutable history.
 */
export async function recordRecoveryDrillEvidence(
  db: Database,
  report: RecoveryDrillReport,
  evidence: {
    /** Link to the private workflow run holding the raw drill output. */
    evidenceLink: string;
    /**
     * The schema version is deliberately absent: the report already carries the
     * one the drill validated against. Taking it from the caller as well would
     * put two sources behind one fact, and the readiness record's whole claim is
     * that its rows describe the candidate the exercise actually ran on.
     */
    persistedOperationManifestVersion: string | null;
    limitation?: string | null;
    followUpOwner?: string | null;
    signedOffBy?: string | null;
    signedOffAt?: Date | null;
  },
): Promise<void> {
  const failed = report.checks.filter((check) => check.outcome === "FAILED");
  await db.transaction().execute(async (transaction) => {
    await transaction.insertInto("audit_entries").values({
      actor_user_id: null,
      system_identity: RECOVERY_DRILL_SYSTEM_IDENTITY,
      acting_role: null,
      operation: `recovery-drill.${report.outcome === "PASSED" ? "passed" : "failed"}`,
      target_type: "RecoveryDrill",
      target_id: report.correlationId,
      outcome: report.outcome === "PASSED" ? "SUCCEEDED" : "FAILED",
      reason_code: `RECOVERY_DRILL_${report.kind}_${report.outcome}`,
      correlation_id: report.correlationId,
      occurred_at: report.completedAt,
      // Check identifiers, counts, versions and a duration. No source address,
      // no credential, no reviewer content — the same boundary the operator
      // guide draws around every operational record.
      evidence: JSON.stringify({
        drillKind: report.kind,
        release: report.release,
        schemaVersion: report.expectedSchemaVersion,
        fixtureManifestVersion: report.fixtureManifestVersion,
        fixtureGeneration: report.fixtureGeneration,
        durationMilliseconds: report.durationMilliseconds,
        withinRecoveryTimeTarget: report.withinRecoveryTimeTarget,
        failedChecks: failed.map((check) => check.check),
      }),
    }).execute();

    await recordReadinessExercise(transaction as Database, {
      exercise: RECOVERY_DRILL_EXERCISES[report.kind],
      family: "backups-and-recovery-verification",
      release: report.release,
      schemaVersion: report.expectedSchemaVersion,
      fixtureManifestVersion: report.fixtureManifestVersion,
      persistedOperationManifestVersion: evidence.persistedOperationManifestVersion,
      // Only the checks that actually ran. A drill that could not drive the
      // role journeys must not list them among the tests it passed.
      testIdentifiers: report.checks
        .filter((check) => check.outcome !== "NOT_APPLICABLE")
        .map((check) => check.check),
      exercisedAt: report.completedAt,
      measuredRecoveryMilliseconds: report.durationMilliseconds,
      result: report.outcome,
      evidenceLink: evidence.evidenceLink,
      limitation: evidence.limitation ?? null,
      followUpOwner: evidence.followUpOwner ?? null,
      correlationId: report.correlationId,
      signedOffBy: evidence.signedOffBy ?? null,
      signedOffAt: evidence.signedOffAt ?? null,
    });
  });
}
