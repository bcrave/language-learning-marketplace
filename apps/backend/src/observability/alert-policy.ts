import type { TelemetrySafeContextKey } from "@marketplace/core";

/**
 * The [operator guide](../../../../docs/operations/operator-guide.md) as data.
 *
 * The guide is the canonical mutable policy; this file is the executable
 * statement of it, so a threshold can be asserted rather than reread. Every
 * incident family it names appears here, and every condition carries the
 * guide's confirmation step, containment action, evidence expectation, and
 * clearing rule.
 *
 * `alert-policy.test.ts` holds the two together from both sides: it fails when
 * a family loses its row in the readiness-evidence record, and it fails when a
 * number here stops appearing in the guide's own prose. Drift in either
 * direction is a test failure rather than a discovery months later.
 *
 * `detection` says who evaluates each threshold, and it is deliberately honest
 * about the ones nothing here evaluates. Nothing promises a response time
 * either: "immediate" describes dispatch after confirmation, and the
 * demonstration is best effort by ADR 0018.
 */

/**
 * The ten families of [operational readiness
 * evidence](../../../../docs/operations/readiness-evidence.md). A family is the
 * unit an incident is grouped and cleared by, and the unit the release record
 * has one row for.
 */
export const INCIDENT_FAMILIES = {
  "api-database-readiness": "API and database readiness",
  "worker-heartbeat-backlog-exhaustion": "Worker heartbeat, backlog, exhausted jobs",
  "canonical-rebuild-fixture-reconciliation": "Canonical Data Rebuild and fixture reconciliation",
  "notification-reconciliation": "Notification reconciliation",
  "deployment-and-deployed-smoke": "Deployment and deployed smoke tests",
  "backups-and-recovery-verification": "Backups and recovery verification",
  "third-party-integrations": "Third-party integrations",
  "sentry-failure-patterns": "Sentry failure patterns",
  "abusive-traffic-and-credential-exposure": "Abusive traffic and credential exposure",
  "deployment-cost-ceiling": "Deployment-cost ceiling",
} as const;

export type IncidentFamily = keyof typeof INCIDENT_FAMILIES;

/**
 * `IMMEDIATE` is the guide's confirmed unsafe admission, possible durable-state
 * corruption, exposure, unrecoverable state, failed recovery, or imminent
 * cost-ceiling breach. `OWNER_ATTENTION` is a deployment that remains safe and
 * recoverable but needs a hand.
 */
export type AlertSeverity = "IMMEDIATE" | "OWNER_ATTENTION";

/** The three private routes that already exist. The guide adds no fourth. */
export type AlertRoute = "SENTRY_EMAIL" | "GITHUB_ACTIONS" | "RAILWAY_BILLING";

/**
 * Who evaluates the threshold.
 *
 * `OBSERVED` conditions are the ones the operational watch polls. `REPORTED`
 * conditions have no threshold to poll and are dispatched at the instant the
 * application detects the fact. `PROVIDER` conditions are evaluated by Sentry
 * alert rules, GitHub Actions notifications, or Railway billing, and carry the
 * guide's numbers so the provider configuration can be checked against the
 * policy it is supposed to implement rather than remembered.
 *
 * `OWNER_RAISED` is the honest fourth. Some conditions the guide accepts have
 * no automated detector anywhere in this deployment — a runtime secret leaving
 * its approved store, an authorization that failed open, an unauthorized
 * mutation that committed. They are found by the Security Release Gate's abuse
 * cases or by a person, and they are recorded here so the response is not
 * improvised when one is. Claiming the application dispatches them would be
 * worse than saying it does not.
 */
export type AlertDetection = "OBSERVED" | "REPORTED" | "PROVIDER" | "OWNER_RAISED";

export type AlertConfirmation =
  /** The condition must hold for this many consecutive watch observations. */
  | { kind: "CONSECUTIVE_OBSERVATIONS"; observations: number }
  /** The condition must hold continuously for this long. */
  | { kind: "SUSTAINED"; forMilliseconds: number }
  /** The threshold is itself the confirmation; one observation dispatches. */
  | { kind: "SINGLE_OBSERVATION" };

export type AlertClearing =
  | { kind: "HEALTHY_OBSERVATIONS"; observations: number }
  | { kind: "HEALTHY_FOR"; milliseconds: number }
  /** Every affected record must reach a terminal, safe disposition. */
  | { kind: "SAFE_DISPOSITION" }
  /** Only an owner-run verification can clear it; elapsed time never does. */
  | { kind: "OWNER_VERIFICATION" }
  /**
   * The guide's two-part clearing: a quiet window the application can watch,
   * and a smoke journey only the owner can run. The window is recorded so the
   * owner knows when it is worth running the smoke, and the incident stays open
   * until they have.
   */
  | { kind: "HEALTHY_FOR_THEN_OWNER_VERIFICATION"; milliseconds: number };

export interface AlertCondition {
  id: string;
  family: IncidentFamily;
  severity: AlertSeverity;
  route: AlertRoute;
  detection: AlertDetection;
  /**
   * The guide's numbers for this condition, named. An `OBSERVED` condition
   * evaluates them itself; a `PROVIDER` one carries them so Sentry alert rules
   * and Railway billing limits can be checked against the policy rather than
   * against somebody's memory of it. Empty only where the guide states no
   * number — the conditions a single occurrence confirms.
   */
  threshold: Readonly<Record<string, number>>;
  confirmation: AlertConfirmation;
  /** The first action that stops harm spreading, in the guide's own terms. */
  containment: string;
  /** The privacy-safe evidence the incident retains, as telemetry-safe names. */
  evidence: readonly TelemetrySafeContextKey[];
  clearing: AlertClearing;
}


/** The guide probes liveness and readiness internally every 30 seconds. */
export const READINESS_PROBE_INTERVAL_MILLISECONDS = 30_000;
export const READINESS_CONFIRMATION_OBSERVATIONS = 3;
export const LIVENESS_WITHOUT_HEALTH_MILLISECONDS = 300_000;
export const LIVENESS_FAILED_RESTARTS = 2;
export const WORKER_QUEUE_BACKLOG_SUSTAINED_MILLISECONDS = 300_000;
export const WORKER_OLDEST_RUNNABLE_AGE_MILLISECONDS = 600_000;
export const WORKER_RUNNABLE_DEPTH_LIMIT = 100;
export const REBUILD_WITHOUT_SUCCESS_MILLISECONDS = 26 * 60 * 60_000;
export const RECONCILIATION_WITHOUT_SUCCESS_MILLISECONDS = 150 * 60_000;
export const NOTIFICATION_ATTEMPTS_BEFORE_EXHAUSTION = 4;
export const DEPLOYMENT_SERVICE_HEALTH_MILLISECONDS = 600_000;
export const DEPLOYMENT_SMOKE_SUITE_MILLISECONDS = 600_000;
export const BACKUP_DAILY_MISSING_MILLISECONDS = 26 * 60 * 60_000;
export const BACKUP_WEEKLY_MISSING_MILLISECONDS = 8 * 24 * 60 * 60_000;
export const BACKUP_NONE_VALID_MILLISECONDS = 48 * 60 * 60_000;
export const RECOVERY_TIME_TARGET_MILLISECONDS = 60 * 60_000;
export const INTEGRATION_FAILURE_WINDOW_MILLISECONDS = 300_000;
export const INTEGRATION_FAILURE_COUNT = 5;
export const INTEGRATION_FAILURE_CORRELATION_COUNT = 2;
export const INTEGRATION_CLEARING_SUCCESS_COUNT = 3;
export const ABUSE_WINDOW_MILLISECONDS = 300_000;
export const ABUSE_SOURCE_AT_LIMIT_CONSECUTIVE_WINDOWS = 3;
export const ABUSE_AGGREGATE_REFUSAL_COUNT = 300;
export const ABUSE_DENIED_AUTHORIZATION_COUNT = 50;
/** Three healthy minutes clears the worker families; readiness counts probes. */
export const HEALTHY_CLEARING_MILLISECONDS = 180_000;
/** The guide's clearing window for abuse: 30 minutes below every threshold. */
export const ABUSE_CLEARING_MILLISECONDS = 30 * 60_000;

/**
 * The Sentry alert rules the provider evaluates. Sentry is where these are
 * configured; the numbers live here so the configuration can be checked against
 * the policy rather than against somebody's memory of it.
 */
export const SENTRY_NEW_SERVER_FINGERPRINT_EVENTS = 5;
export const SENTRY_NEW_SERVER_FINGERPRINT_WINDOW_MILLISECONDS = 300_000;
export const SENTRY_UNHANDLED_SERVER_EVENTS = 10;
export const SENTRY_UNHANDLED_SERVER_WINDOW_MILLISECONDS = 600_000;
export const SENTRY_BROWSER_FINGERPRINT_EVENTS = 10;
export const SENTRY_BROWSER_FINGERPRINT_CORRELATIONS = 3;
export const SENTRY_BROWSER_FINGERPRINT_WINDOW_MILLISECONDS = 600_000;
export const SENTRY_POST_DEPLOYMENT_EVENTS = 3;
export const SENTRY_POST_DEPLOYMENT_WINDOW_MILLISECONDS = 600_000;
export const SENTRY_POST_DEPLOYMENT_HORIZON_MILLISECONDS = 60 * 60_000;
export const SENTRY_PATTERN_CLEARING_MILLISECONDS = 30 * 60_000;

/**
 * Railway's own billing controls, and the projection bands the owner checks
 * daily. `deployment-cost-ceiling` is the one family where the ceiling
 * outranks availability, so the numbers are policy rather than tuning.
 */
export const COST_OWNER_ATTENTION_ACTUAL_USD = 8;
export const COST_OWNER_ATTENTION_PROJECTED_USD = 12;
export const COST_IMMEDIATE_ACTUAL_USD = 12;
export const COST_HARD_LIMIT_USD = 15;
export const COST_HARD_LIMIT_HORIZON_DAYS = 3;

export const ALERT_CONDITIONS = [
  {
    id: "readiness.database-unreachable",
    family: "api-database-readiness",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "OBSERVED",
    threshold: {
      failedProbes: READINESS_CONFIRMATION_OBSERVATIONS,
      probeIntervalMilliseconds: READINESS_PROBE_INTERVAL_MILLISECONDS,
    },
    confirmation: { kind: "CONSECUTIVE_OBSERVATIONS", observations: READINESS_CONFIRMATION_OBSERVATIONS },
    containment: "Keep readiness false and inspect PostgreSQL reachability; never reverse a migration automatically.",
    evidence: ["observationCount", "release", "schemaVersion", "correlationId"],
    clearing: { kind: "HEALTHY_OBSERVATIONS", observations: READINESS_CONFIRMATION_OBSERVATIONS },
  },
  {
    id: "readiness.schema-incompatible",
    family: "api-database-readiness",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "OBSERVED",
    threshold: { confirmedProbes: 1 },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Keep readiness false and deploy a schema-compatible application; never reverse a migration automatically.",
    evidence: ["schemaVersion", "release", "correlationId"],
    clearing: { kind: "HEALTHY_OBSERVATIONS", observations: READINESS_CONFIRMATION_OBSERVATIONS },
  },
  {
    id: "readiness.liveness-restart-loop",
    family: "api-database-readiness",
    severity: "OWNER_ATTENTION",
    route: "GITHUB_ACTIONS",
    detection: "PROVIDER",
    threshold: {
      failedRestarts: LIVENESS_FAILED_RESTARTS,
      withoutHealthMilliseconds: LIVENESS_WITHOUT_HEALTH_MILLISECONDS,
    },
    confirmation: { kind: "SUSTAINED", forMilliseconds: LIVENESS_WITHOUT_HEALTH_MILLISECONDS },
    containment: "Allow the platform restart, then restore the last compatible release after two failed restarts.",
    evidence: ["release", "outcome"],
    clearing: { kind: "HEALTHY_OBSERVATIONS", observations: READINESS_CONFIRMATION_OBSERVATIONS },
  },
  {
    id: "worker.heartbeat-stale",
    family: "worker-heartbeat-backlog-exhaustion",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "OBSERVED",
    threshold: { staleMilliseconds: HEALTHY_CLEARING_MILLISECONDS },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Restore the worker; queued work is durable and waits rather than being discarded.",
    evidence: ["workerName", "heartbeatAgeSeconds", "release", "correlationId"],
    clearing: { kind: "HEALTHY_FOR", milliseconds: HEALTHY_CLEARING_MILLISECONDS },
  },
  {
    id: "worker.queue-backlog",
    family: "worker-heartbeat-backlog-exhaustion",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "OBSERVED",
    threshold: {
      oldestRunnableAgeMilliseconds: WORKER_OLDEST_RUNNABLE_AGE_MILLISECONDS,
      runnableDepth: WORKER_RUNNABLE_DEPTH_LIMIT,
      sustainedMilliseconds: WORKER_QUEUE_BACKLOG_SUSTAINED_MILLISECONDS,
    },
    confirmation: { kind: "SUSTAINED", forMilliseconds: WORKER_QUEUE_BACKLOG_SUSTAINED_MILLISECONDS },
    containment: "Restore worker throughput; measure runnable jobs only, so a scheduled future job never counts as backlog.",
    evidence: ["runnableJobCount", "oldestRunnableAgeSeconds", "release", "correlationId"],
    clearing: { kind: "HEALTHY_FOR", milliseconds: HEALTHY_CLEARING_MILLISECONDS },
  },
  {
    id: "worker.jobs-exhausted",
    family: "worker-heartbeat-backlog-exhaustion",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "OBSERVED",
    threshold: { exhaustedJobs: 1 },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Safely retry idempotent work, or reconcile and discard the exhausted job with a reason.",
    evidence: ["exhaustedJobCount", "jobType", "safeFailureCode", "attemptCount", "correlationId"],
    clearing: { kind: "SAFE_DISPOSITION" },
  },
  {
    id: "fixtures.rebuild-rolled-back",
    family: "canonical-rebuild-fixture-reconciliation",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "OBSERVED",
    threshold: { rolledBackAttempts: 1 },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "The verified rollback already restored the prior state; reopen the demonstration and choose a fresh rebuild.",
    evidence: ["fixtureGeneration", "fixtureManifestVersion", "safeFailureCode", "correlationId"],
    clearing: { kind: "OWNER_VERIFICATION" },
  },
  {
    id: "fixtures.rebuild-indeterminate",
    family: "canonical-rebuild-fixture-reconciliation",
    severity: "IMMEDIATE",
    route: "SENTRY_EMAIL",
    detection: "OBSERVED",
    threshold: { indeterminateAttempts: 1 },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Keep readiness false and run assessment-first Canonical Data Recovery; never clear maintenance from elapsed time.",
    evidence: ["maintenanceState", "fixtureGeneration", "safeFailureCode", "correlationId"],
    clearing: { kind: "OWNER_VERIFICATION" },
  },
  {
    id: "fixtures.rebuild-overdue",
    family: "canonical-rebuild-fixture-reconciliation",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "OBSERVED",
    threshold: { withoutSuccessMilliseconds: REBUILD_WITHOUT_SUCCESS_MILLISECONDS },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Dispatch the Canonical Data Rebuild workflow; reviewer-mutated state has outlived its baseline.",
    evidence: ["sinceLastSuccessSeconds", "fixtureGeneration", "correlationId"],
    clearing: { kind: "SAFE_DISPOSITION" },
  },
  {
    id: "fixtures.reconciliation-overdue",
    family: "canonical-rebuild-fixture-reconciliation",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "OBSERVED",
    // The guide gives this condition two arms: two consecutive failed runs, or
    // 150 minutes without success. Only the second is evaluated here, because a
    // failed reconciliation writes no row and the application has nothing to
    // count. The elapsed-time arm is strictly the later of the two, so this
    // alerts no earlier than the guide permits and may alert later; the failed
    // run itself still reaches the owner as an unhandled worker error under the
    // Sentry-pattern family.
    threshold: { withoutSuccessMilliseconds: RECONCILIATION_WITHOUT_SUCCESS_MILLISECONDS },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Restore hourly rolling-fixture reconciliation; public synthetic journeys are drifting out of the actionable window.",
    evidence: ["sinceLastSuccessSeconds", "correlationId"],
    clearing: { kind: "SAFE_DISPOSITION" },
  },
  {
    id: "notifications.delivery-exhausted",
    family: "notification-reconciliation",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "OBSERVED",
    threshold: { attemptsBeforeExhaustion: NOTIFICATION_ATTEMPTS_BEFORE_EXHAUSTION, exhaustedIntents: 1 },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Reconcile through the administrator task; never blindly retry an ambiguous third-party timeout, and never notify about notification failure.",
    evidence: ["channel", "safeFailureCode", "attemptCount", "eventCount", "correlationId"],
    clearing: { kind: "SAFE_DISPOSITION" },
  },
  {
    id: "deployment.stage-failed",
    family: "deployment-and-deployed-smoke",
    severity: "OWNER_ATTENTION",
    route: "GITHUB_ACTIONS",
    detection: "PROVIDER",
    threshold: {
      serviceHealthMilliseconds: DEPLOYMENT_SERVICE_HEALTH_MILLISECONDS,
      readinessSuccesses: READINESS_CONFIRMATION_OBSERVATIONS,
      workerHeartbeatMilliseconds: HEALTHY_CLEARING_MILLISECONDS,
      smokeSuiteMilliseconds: DEPLOYMENT_SMOKE_SUITE_MILLISECONDS,
    },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "The failed stage stops every later stage; the previous release keeps serving.",
    evidence: ["release", "schemaVersion", "persistedOperationManifestVersion", "correlationId"],
    clearing: { kind: "OWNER_VERIFICATION" },
  },
  {
    id: "deployment.release-unhealthy",
    family: "deployment-and-deployed-smoke",
    severity: "IMMEDIATE",
    route: "GITHUB_ACTIONS",
    detection: "PROVIDER",
    threshold: { unhealthyReleases: 1 },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Restore the last compatible application release; never reverse a migration automatically.",
    evidence: ["release", "schemaVersion", "safeFailureCode", "correlationId"],
    clearing: { kind: "OWNER_VERIFICATION" },
  },
  {
    id: "backups.daily-missing",
    family: "backups-and-recovery-verification",
    severity: "OWNER_ATTENTION",
    route: "GITHUB_ACTIONS",
    detection: "PROVIDER",
    threshold: { withoutBackupMilliseconds: BACKUP_DAILY_MISSING_MILLISECONDS },
    confirmation: { kind: "SUSTAINED", forMilliseconds: BACKUP_DAILY_MISSING_MILLISECONDS },
    containment: "Restore provider backup scheduling before the next Canonical Data Rebuild discards mutable state.",
    evidence: ["sinceLastSuccessSeconds", "outcome"],
    clearing: { kind: "OWNER_VERIFICATION" },
  },
  {
    id: "backups.weekly-missing",
    family: "backups-and-recovery-verification",
    severity: "OWNER_ATTENTION",
    route: "GITHUB_ACTIONS",
    detection: "PROVIDER",
    threshold: { withoutBackupMilliseconds: BACKUP_WEEKLY_MISSING_MILLISECONDS },
    confirmation: { kind: "SUSTAINED", forMilliseconds: BACKUP_WEEKLY_MISSING_MILLISECONDS },
    containment: "Restore the weekly retention point; a daily backup alone shortens how far recovery can reach back.",
    evidence: ["sinceLastSuccessSeconds", "outcome"],
    clearing: { kind: "OWNER_VERIFICATION" },
  },
  {
    id: "backups.none-valid",
    family: "backups-and-recovery-verification",
    severity: "IMMEDIATE",
    route: "GITHUB_ACTIONS",
    detection: "PROVIDER",
    threshold: { withoutBackupMilliseconds: BACKUP_NONE_VALID_MILLISECONDS },
    confirmation: { kind: "SUSTAINED", forMilliseconds: BACKUP_NONE_VALID_MILLISECONDS },
    containment: "Treat the deployment as unrecoverable until a valid backup or a passing isolated restore exists.",
    evidence: ["sinceLastSuccessSeconds", "outcome"],
    clearing: { kind: "OWNER_VERIFICATION" },
  },
  {
    id: "backups.restore-drill-failed",
    family: "backups-and-recovery-verification",
    severity: "OWNER_ATTENTION",
    route: "GITHUB_ACTIONS",
    detection: "PROVIDER",
    threshold: { recoveryTimeTargetMilliseconds: RECOVERY_TIME_TARGET_MILLISECONDS },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "A failed verification or drill blocks release until an isolated restore passes within the recovery-time target.",
    evidence: ["durationMilliseconds", "schemaVersion", "outcome"],
    clearing: { kind: "OWNER_VERIFICATION" },
  },
  {
    id: "integrations.repeated-failures",
    family: "third-party-integrations",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "OBSERVED",
    threshold: {
      failures: INTEGRATION_FAILURE_COUNT,
      correlations: INTEGRATION_FAILURE_CORRELATION_COUNT,
      windowMilliseconds: INTEGRATION_FAILURE_WINDOW_MILLISECONDS,
      clearingSuccesses: INTEGRATION_CLEARING_SUCCESS_COUNT,
    },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Retry only established safe or idempotent operations; providers are never continuously polled.",
    evidence: ["integration", "eventCount", "correlationCount", "safeFailureCode", "correlationId"],
    // The guide clears this on "an explicit integration smoke and three
    // observed successes", and adds that low traffic requires manual
    // confirmation. Quiet counters are not three successes, so the owner's own
    // smoke is what closes it.
    clearing: { kind: "OWNER_VERIFICATION" },
  },
  {
    id: "integrations.credential-rejected",
    family: "third-party-integrations",
    severity: "IMMEDIATE",
    route: "SENTRY_EMAIL",
    // Owner-raised, because a rejection this deployment can see is
    // indistinguishable at the call site from an expired reviewer token or a
    // provider hiccup: those reach the owner through the repeated-failure
    // threshold or as an exhausted job. "Suggesting revocation or
    // misconfiguration" is a judgement a person makes with the provider's own
    // evidence in front of them, and this row is what they follow when they do.
    detection: "OWNER_RAISED",
    threshold: { rejections: 1 },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Treat the credential as revoked or misconfigured: rotate it, redeploy, and prove the old one fails.",
    evidence: ["integration", "safeFailureCode", "correlationId"],
    clearing: { kind: "OWNER_VERIFICATION" },
  },
  {
    id: "sentry.new-server-fingerprint",
    family: "sentry-failure-patterns",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "PROVIDER",
    threshold: {
      events: SENTRY_NEW_SERVER_FINGERPRINT_EVENTS,
      windowMilliseconds: SENTRY_NEW_SERVER_FINGERPRINT_WINDOW_MILLISECONDS,
    },
    confirmation: { kind: "SUSTAINED", forMilliseconds: SENTRY_NEW_SERVER_FINGERPRINT_WINDOW_MILLISECONDS },
    containment: "Group repeats, inspect release and safe breadcrumbs, and exercise the failing journey.",
    evidence: ["incidentFingerprint", "eventCount", "release", "operationName"],
    clearing: { kind: "HEALTHY_FOR", milliseconds: SENTRY_PATTERN_CLEARING_MILLISECONDS },
  },
  {
    id: "sentry.unhandled-server-rate",
    family: "sentry-failure-patterns",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "PROVIDER",
    threshold: {
      events: SENTRY_UNHANDLED_SERVER_EVENTS,
      windowMilliseconds: SENTRY_UNHANDLED_SERVER_WINDOW_MILLISECONDS,
    },
    confirmation: { kind: "SUSTAINED", forMilliseconds: SENTRY_UNHANDLED_SERVER_WINDOW_MILLISECONDS },
    containment: "Restore a compatible release for a regression; a single journey failure is not a release rollback.",
    evidence: ["eventCount", "release", "operationName"],
    clearing: { kind: "HEALTHY_FOR", milliseconds: SENTRY_PATTERN_CLEARING_MILLISECONDS },
  },
  {
    id: "sentry.browser-fingerprint",
    family: "sentry-failure-patterns",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "PROVIDER",
    threshold: {
      events: SENTRY_BROWSER_FINGERPRINT_EVENTS,
      correlations: SENTRY_BROWSER_FINGERPRINT_CORRELATIONS,
      windowMilliseconds: SENTRY_BROWSER_FINGERPRINT_WINDOW_MILLISECONDS,
    },
    confirmation: { kind: "SUSTAINED", forMilliseconds: SENTRY_BROWSER_FINGERPRINT_WINDOW_MILLISECONDS },
    containment: "Exercise the journey in a browser before concluding anything about one reviewer's session.",
    evidence: ["incidentFingerprint", "eventCount", "correlationCount", "release"],
    clearing: { kind: "HEALTHY_FOR", milliseconds: SENTRY_PATTERN_CLEARING_MILLISECONDS },
  },
  {
    id: "sentry.post-deployment-fingerprint",
    family: "sentry-failure-patterns",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "PROVIDER",
    threshold: {
      events: SENTRY_POST_DEPLOYMENT_EVENTS,
      windowMilliseconds: SENTRY_POST_DEPLOYMENT_WINDOW_MILLISECONDS,
      afterDeploymentMilliseconds: SENTRY_POST_DEPLOYMENT_HORIZON_MILLISECONDS,
    },
    confirmation: { kind: "SUSTAINED", forMilliseconds: SENTRY_POST_DEPLOYMENT_WINDOW_MILLISECONDS },
    containment: "The first hour after a deployment is the narrow window; restore the previous release for a regression.",
    evidence: ["incidentFingerprint", "eventCount", "release"],
    clearing: { kind: "HEALTHY_FOR", milliseconds: SENTRY_PATTERN_CLEARING_MILLISECONDS },
  },
  {
    id: "sentry.safety-violation",
    family: "sentry-failure-patterns",
    severity: "IMMEDIATE",
    route: "SENTRY_EMAIL",
    detection: "OWNER_RAISED",
    threshold: { occurrences: 1 },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Set readiness false: an authorization bypass, an exposure, corrupted durable state, or a violated Class Credit or Booking invariant outranks availability.",
    evidence: ["safeFailureCode", "operation", "release", "correlationId"],
    clearing: { kind: "OWNER_VERIFICATION" },
  },
  {
    id: "abuse.source-at-limit",
    family: "abusive-traffic-and-credential-exposure",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "OBSERVED",
    threshold: {
      consecutiveWindows: ABUSE_SOURCE_AT_LIMIT_CONSECUTIVE_WINDOWS,
      windowMilliseconds: 60_000,
    },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Retain the limits; availability may be sacrificed, and no source address is recorded to contain one.",
    evidence: ["observationCount", "refusedRequestCount", "correlationId"],
    clearing: { kind: "HEALTHY_FOR_THEN_OWNER_VERIFICATION", milliseconds: ABUSE_CLEARING_MILLISECONDS },
  },
  {
    id: "abuse.aggregate-refusals",
    family: "abusive-traffic-and-credential-exposure",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "OBSERVED",
    threshold: {
      refusals: ABUSE_AGGREGATE_REFUSAL_COUNT,
      windowMilliseconds: ABUSE_WINDOW_MILLISECONDS,
    },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Retain the limits and disable the affected shared identity or operation rather than widening the budget.",
    evidence: ["refusedRequestCount", "correlationId"],
    clearing: { kind: "HEALTHY_FOR_THEN_OWNER_VERIFICATION", milliseconds: ABUSE_CLEARING_MILLISECONDS },
  },
  {
    id: "abuse.denied-authorization",
    family: "abusive-traffic-and-credential-exposure",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "OBSERVED",
    threshold: {
      denials: ABUSE_DENIED_AUTHORIZATION_COUNT,
      windowMilliseconds: ABUSE_WINDOW_MILLISECONDS,
    },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Enumeration under a shared reviewer identity: disable that identity or operation, and keep the denied-authorization budget as it is.",
    evidence: ["deniedAuthorizationCount", "correlationId"],
    clearing: { kind: "HEALTHY_FOR_THEN_OWNER_VERIFICATION", milliseconds: ABUSE_CLEARING_MILLISECONDS },
  },
  {
    id: "abuse.unverified-source-refusals",
    family: "abusive-traffic-and-credential-exposure",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    detection: "OBSERVED",
    threshold: {
      refusals: ABUSE_AGGREGATE_REFUSAL_COUNT,
      windowMilliseconds: ABUSE_WINDOW_MILLISECONDS,
    },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Broad refusals carrying `source.unverified` are a Caddy trusted-proxy misconfiguration failing closed: restore the matching proxy-secret configuration on both services rather than relaxing the limit.",
    evidence: ["refusedRequestCount", "safeFailureCode", "correlationId"],
    clearing: { kind: "HEALTHY_FOR_THEN_OWNER_VERIFICATION", milliseconds: ABUSE_CLEARING_MILLISECONDS },
  },
  {
    id: "security.internal-endpoint-reached-publicly",
    family: "abusive-traffic-and-credential-exposure",
    severity: "IMMEDIATE",
    route: "SENTRY_EMAIL",
    detection: "REPORTED",
    threshold: { requests: 1 },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Close the public path to the internal surface before restoring availability.",
    evidence: ["operation", "release", "correlationId"],
    clearing: { kind: "OWNER_VERIFICATION" },
  },
  {
    id: "security.secret-outside-store",
    family: "abusive-traffic-and-credential-exposure",
    severity: "IMMEDIATE",
    route: "SENTRY_EMAIL",
    detection: "OWNER_RAISED",
    threshold: { occurrences: 1 },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Revoke and rotate the secret, redeploy, and set readiness false while safety is uncertain.",
    evidence: ["safeFailureCode", "release", "correlationId"],
    clearing: { kind: "OWNER_VERIFICATION" },
  },
  {
    id: "security.authorization-failed-open",
    family: "abusive-traffic-and-credential-exposure",
    severity: "IMMEDIATE",
    route: "SENTRY_EMAIL",
    detection: "OWNER_RAISED",
    threshold: { occurrences: 1 },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Set readiness false and close the path before restoring availability; an authorization that failed open has no safe degraded mode.",
    evidence: ["operation", "safeFailureCode", "release", "correlationId"],
    clearing: { kind: "OWNER_VERIFICATION" },
  },
  {
    id: "security.unauthorized-mutation-committed",
    family: "abusive-traffic-and-credential-exposure",
    severity: "IMMEDIATE",
    route: "SENTRY_EMAIL",
    detection: "OWNER_RAISED",
    threshold: { occurrences: 1 },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Treat durable state as suspect: set readiness false, establish what committed from the Audit Log, and recover before reopening.",
    evidence: ["operation", "safeFailureCode", "release", "correlationId"],
    clearing: { kind: "OWNER_VERIFICATION" },
  },
  {
    id: "cost.warning-threshold",
    family: "deployment-cost-ceiling",
    severity: "OWNER_ATTENTION",
    route: "RAILWAY_BILLING",
    detection: "PROVIDER",
    threshold: {
      actualUsd: COST_OWNER_ATTENTION_ACTUAL_USD,
      projectedUsd: COST_OWNER_ATTENTION_PROJECTED_USD,
    },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "Inspect per-service usage, replicas, volumes, and jobs, and stop unintended consumption.",
    evidence: ["usdActual", "projectedUsd"],
    clearing: { kind: "OWNER_VERIFICATION" },
  },
  {
    id: "cost.hard-limit-imminent",
    family: "deployment-cost-ceiling",
    severity: "IMMEDIATE",
    route: "RAILWAY_BILLING",
    detection: "PROVIDER",
    threshold: {
      actualUsd: COST_IMMEDIATE_ACTUAL_USD,
      hardLimitUsd: COST_HARD_LIMIT_USD,
      horizonDays: COST_HARD_LIMIT_HORIZON_DAYS,
    },
    confirmation: { kind: "SINGLE_OBSERVATION" },
    containment: "The ceiling outranks availability: stop unintended consumption even where that stops the demonstration.",
    evidence: ["usdActual", "projectedUsd"],
    clearing: { kind: "OWNER_VERIFICATION" },
  },
] as const satisfies readonly AlertCondition[];

/** Every condition the policy defines, as a type rather than a loose string. */
export type AlertConditionId = (typeof ALERT_CONDITIONS)[number]["id"];

const conditionsById = new Map<string, AlertCondition>(
  ALERT_CONDITIONS.map((condition) => [condition.id, condition]),
);

export function alertCondition(id: AlertConditionId): AlertCondition {
  // Unreachable for a well-typed caller; a value read back out of the incident
  // table has only been a string since it was written, so it is checked here.
  const condition = conditionsById.get(id);
  if (!condition) throw new Error(`No alert condition is named ${id}`);
  return condition;
}

/** Narrows an identifier read back out of storage, where the type is lost. */
export function isAlertConditionId(id: string): id is AlertConditionId {
  return conditionsById.has(id);
}
