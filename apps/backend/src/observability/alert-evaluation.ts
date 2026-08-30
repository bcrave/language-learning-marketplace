import {
  alertCondition,
  ABUSE_AGGREGATE_REFUSAL_COUNT,
  ABUSE_DENIED_AUTHORIZATION_COUNT,
  ABUSE_SOURCE_AT_LIMIT_CONSECUTIVE_WINDOWS,
  COST_HARD_LIMIT_HORIZON_DAYS,
  COST_HARD_LIMIT_USD,
  COST_IMMEDIATE_ACTUAL_USD,
  COST_OWNER_ATTENTION_ACTUAL_USD,
  COST_OWNER_ATTENTION_PROJECTED_USD,
  INTEGRATION_FAILURE_CORRELATION_COUNT,
  INTEGRATION_FAILURE_COUNT,
  REBUILD_WITHOUT_SUCCESS_MILLISECONDS,
  RECONCILIATION_WITHOUT_SUCCESS_MILLISECONDS,
  WORKER_OLDEST_RUNNABLE_AGE_MILLISECONDS,
  WORKER_RUNNABLE_DEPTH_LIMIT,
  type AlertConditionId,
} from "./alert-policy.js";
import { WORKER_HEARTBEAT_STALE_MILLISECONDS } from "../worker/worker-heartbeat.js";

/**
 * One reading of everything the deployment can observe about itself. It is a
 * plain value so the thresholds can be exercised without a database, a worker,
 * or a clock: `operational-observations.ts` is the only place that builds one
 * from live state.
 *
 * Nothing here is a source address, a User, or authored content. An abuse
 * reading is an aggregate count, exactly as the operator guide's evidence
 * boundary requires.
 */
export interface OperationalSnapshot {
  observedAt: Date;
  release: string;
  databaseReachable: boolean;
  appliedSchemaVersion: string | null;
  expectedSchemaVersion: string;
  maintenanceState: "AVAILABLE" | "REBUILDING" | "INDETERMINATE";
  worker: {
    name: string;
    /** Null when no worker has ever written a heartbeat. */
    heartbeatAgeMilliseconds: number | null;
    runnableJobCount: number;
    oldestRunnableJobAgeMilliseconds: number | null;
    exhaustedJobs: readonly {
      jobType: string;
      safeFailureCode: string;
      jobCount: number;
      attemptCount: number;
    }[];
  };
  fixtures: {
    generation: number;
    manifestVersion: string | null;
    lastRebuildOutcome: "STARTED" | "COMPLETED" | "ROLLED_BACK" | "INDETERMINATE" | null;
    lastRebuildSafeFailureCode: string | null;
    lastRebuildCorrelationId: string | null;
    millisecondsSinceSuccessfulRebuild: number | null;
    millisecondsSinceReconciliation: number | null;
  };
  /** Exhausted Notification Intents still awaiting a safe disposition. */
  notifications: readonly {
    channel: "EMAIL" | "IN_APP";
    safeFailureCode: string;
    intentCount: number;
    attemptCount: number;
  }[];
  integrations: readonly {
    integration: string;
    safeFailureCode: string;
    failureCount: number;
    correlationCount: number;
  }[];
  abuse: {
    refusedRequestCount: number;
    unverifiedSourceRefusalCount: number;
    deniedAuthorizationCount: number;
    sourcesAtLimitConsecutiveWindows: number;
  };
}

/**
 * One condition seen holding right now. Confirmation, escalation, and clearing
 * are not decided here: `operational-incidents.ts` owns the lifecycle, because
 * a single reading cannot tell a sustained failure from a passing one.
 */
export interface FiringCondition {
  conditionId: AlertConditionId;
  /**
   * The incident-family and safe-failure fingerprint the guide groups by. Two
   * readings that share it join one incident; a different one opens its own,
   * so an exhausted email intent and an exhausted in-app intent are not
   * silently merged into a single line in the owner's inbox.
   */
  fingerprint: string;
  evidence: Record<string, string | number | boolean>;
}

const seconds = (milliseconds: number) => Math.floor(milliseconds / 1000);

/**
 * Applies every threshold the application evaluates for itself. Provider-
 * detected conditions — Sentry alert rules, GitHub Actions notifications, and
 * Railway billing — are absent by construction: this function reads only the
 * snapshot, and a condition it cannot see is one it must not claim to clear.
 */
export function evaluateOperationalAlerts(
  snapshot: OperationalSnapshot,
): readonly FiringCondition[] {
  const firing: FiringCondition[] = [];
  const fire = (
    conditionId: AlertConditionId,
    evidence: Record<string, string | number | boolean>,
    discriminator?: string,
  ) => {
    firing.push({
      conditionId,
      // Family first, because that is what the guide groups and clears by. Two
      // conditions that describe the same underlying failure share the
      // discriminator on purpose, so the second one escalates the incident the
      // first opened rather than starting a parallel one.
      fingerprint: `${alertCondition(conditionId).family}:${discriminator ?? conditionId}`,
      evidence: { ...evidence, release: snapshot.release },
    });
  };

  if (!snapshot.databaseReachable) {
    // Everything below is read from that database. A snapshot that could not
    // read it knows nothing about the worker, the fixtures, or the queue, and
    // reporting those as failing would bury the one condition that is true.
    fire("readiness.database-unreachable", {
      schemaVersion: snapshot.expectedSchemaVersion,
    });
    return firing;
  }
  if (snapshot.appliedSchemaVersion !== snapshot.expectedSchemaVersion) {
    // Deliberately exclusive. An unreachable database cannot report a schema,
    // and telling the owner the schema is wrong when nothing could be read
    // would send them to the wrong runbook.
    fire("readiness.schema-incompatible", {
      schemaVersion: snapshot.appliedSchemaVersion ?? "unapplied",
    });
  }

  const heartbeatAge = snapshot.worker.heartbeatAgeMilliseconds;
  if (heartbeatAge === null || heartbeatAge >= WORKER_HEARTBEAT_STALE_MILLISECONDS) {
    fire("worker.heartbeat-stale", {
      workerName: snapshot.worker.name,
      // A worker that has never run has no age to report, and reporting zero
      // would read as a fresh heartbeat.
      ...(heartbeatAge === null ? {} : { heartbeatAgeSeconds: seconds(heartbeatAge) }),
    });
  }

  const oldestRunnable = snapshot.worker.oldestRunnableJobAgeMilliseconds;
  if (
    snapshot.worker.runnableJobCount > WORKER_RUNNABLE_DEPTH_LIMIT ||
    (oldestRunnable !== null && oldestRunnable > WORKER_OLDEST_RUNNABLE_AGE_MILLISECONDS)
  ) {
    fire("worker.queue-backlog", {
      runnableJobCount: snapshot.worker.runnableJobCount,
      ...(oldestRunnable === null ? {} : { oldestRunnableAgeSeconds: seconds(oldestRunnable) }),
    });
  }

  for (const exhausted of snapshot.worker.exhaustedJobs) {
    fire(
      "worker.jobs-exhausted",
      {
        jobType: exhausted.jobType,
        safeFailureCode: exhausted.safeFailureCode,
        exhaustedJobCount: exhausted.jobCount,
        attemptCount: exhausted.attemptCount,
      },
      `${exhausted.jobType}:${exhausted.safeFailureCode}`,
    );
  }

  const fixtures = snapshot.fixtures;
  // Both rebuild conditions describe one attempt, so they share its correlation
  // identifier as their discriminator: a rollback that later cannot establish
  // safety escalates the open incident instead of opening a second one.
  const attempt = fixtures.lastRebuildCorrelationId ?? "unattributed-rebuild";
  const fixtureEvidence = {
    fixtureGeneration: fixtures.generation,
    ...(fixtures.manifestVersion ? { fixtureManifestVersion: fixtures.manifestVersion } : {}),
    ...(fixtures.lastRebuildCorrelationId
      ? { correlationId: fixtures.lastRebuildCorrelationId }
      : {}),
    ...(fixtures.lastRebuildSafeFailureCode
      ? { safeFailureCode: fixtures.lastRebuildSafeFailureCode }
      : {}),
  };
  if (snapshot.maintenanceState === "INDETERMINATE") {
    fire(
      "fixtures.rebuild-indeterminate",
      { ...fixtureEvidence, maintenanceState: snapshot.maintenanceState },
      attempt,
    );
  } else if (fixtures.lastRebuildOutcome === "ROLLED_BACK") {
    // A verified rollback restored the prior state, so the demonstration is
    // safe and this is owner attention rather than an immediate alert.
    fire("fixtures.rebuild-rolled-back", fixtureEvidence, attempt);
  }

  // A null elapsed time means the observation found no anchor at all — not
  // even the maintenance singleton every installed schema carries — so there
  // is no evidence a baseline was ever established.
  const sinceRebuild = fixtures.millisecondsSinceSuccessfulRebuild;
  if (sinceRebuild === null || sinceRebuild >= REBUILD_WITHOUT_SUCCESS_MILLISECONDS) {
    fire("fixtures.rebuild-overdue", {
      fixtureGeneration: fixtures.generation,
      ...(sinceRebuild === null ? {} : { sinceLastSuccessSeconds: seconds(sinceRebuild) }),
    });
  }

  const sinceReconciliation = fixtures.millisecondsSinceReconciliation;
  if (
    sinceReconciliation === null ||
    sinceReconciliation >= RECONCILIATION_WITHOUT_SUCCESS_MILLISECONDS
  ) {
    fire("fixtures.reconciliation-overdue", {
      ...(sinceReconciliation === null
        ? {}
        : { sinceLastSuccessSeconds: seconds(sinceReconciliation) }),
    });
  }

  for (const group of snapshot.notifications) {
    fire(
      "notifications.delivery-exhausted",
      {
        channel: group.channel,
        safeFailureCode: group.safeFailureCode,
        eventCount: group.intentCount,
        attemptCount: group.attemptCount,
      },
      `${group.channel}:${group.safeFailureCode}`,
    );
  }

  for (const integration of snapshot.integrations) {
    if (
      integration.failureCount >= INTEGRATION_FAILURE_COUNT &&
      integration.correlationCount >= INTEGRATION_FAILURE_CORRELATION_COUNT
    ) {
      fire(
        "integrations.repeated-failures",
        {
          integration: integration.integration,
          safeFailureCode: integration.safeFailureCode,
          eventCount: integration.failureCount,
          correlationCount: integration.correlationCount,
        },
        `${integration.integration}:${integration.safeFailureCode}`,
      );
    }
  }

  const abuse = snapshot.abuse;
  if (abuse.sourcesAtLimitConsecutiveWindows >= ABUSE_SOURCE_AT_LIMIT_CONSECUTIVE_WINDOWS) {
    fire("abuse.source-at-limit", {
      observationCount: abuse.sourcesAtLimitConsecutiveWindows,
      refusedRequestCount: abuse.refusedRequestCount,
    });
  }
  if (abuse.refusedRequestCount >= ABUSE_AGGREGATE_REFUSAL_COUNT) {
    fire("abuse.aggregate-refusals", { refusedRequestCount: abuse.refusedRequestCount });
  }
  if (abuse.deniedAuthorizationCount >= ABUSE_DENIED_AUTHORIZATION_COUNT) {
    fire("abuse.denied-authorization", {
      deniedAuthorizationCount: abuse.deniedAuthorizationCount,
    });
  }
  // A run of refusals that never presented verifiable source context is the
  // trusted-proxy misconfiguration failing closed, not a caller to contain, so
  // it carries its own condition and its own containment action.
  if (abuse.unverifiedSourceRefusalCount >= ABUSE_AGGREGATE_REFUSAL_COUNT) {
    fire("abuse.unverified-source-refusals", {
      refusedRequestCount: abuse.unverifiedSourceRefusalCount,
      safeFailureCode: "source.unverified",
    });
  }

  return firing;
}

/**
 * What the owner reads off Railway for the guide's daily cost check. It is a
 * value rather than four loose numbers because the two functions below always
 * want all four, and three of them are meaningless apart.
 */
export interface DeploymentCostReading {
  actualUsd: number;
  last24HourUsd: number;
  trailingSevenDayUsd: number;
  daysRemainingInCycle: number;
}

/**
 * The operator guide projects deployment cost with the greater of the last
 * 24-hour rate and the trailing seven-day daily average, because a demo that
 * has been quiet for six days and busy for one must not be projected as quiet.
 */
export function projectedCycleCostUsd(usage: DeploymentCostReading): number {
  const dailyRate = Math.max(usage.last24HourUsd, usage.trailingSevenDayUsd / 7);
  return usage.actualUsd + dailyRate * Math.max(usage.daysRemainingInCycle, 0);
}

/**
 * Which cost condition a reading satisfies, or null below every threshold. The
 * ceiling outranks availability, so the immediate band is checked first.
 */
export function costCeilingCondition(
  usage: DeploymentCostReading,
): "cost.hard-limit-imminent" | "cost.warning-threshold" | null {
  const projected = projectedCycleCostUsd(usage);
  const withinHorizon = projectedCycleCostUsd({
    ...usage,
    daysRemainingInCycle: Math.min(usage.daysRemainingInCycle, COST_HARD_LIMIT_HORIZON_DAYS),
  });
  if (usage.actualUsd >= COST_IMMEDIATE_ACTUAL_USD || withinHorizon >= COST_HARD_LIMIT_USD) {
    return "cost.hard-limit-imminent";
  }
  if (
    usage.actualUsd >= COST_OWNER_ATTENTION_ACTUAL_USD ||
    projected >= COST_OWNER_ATTENTION_PROJECTED_USD
  ) {
    return "cost.warning-threshold";
  }
  return null;
}
