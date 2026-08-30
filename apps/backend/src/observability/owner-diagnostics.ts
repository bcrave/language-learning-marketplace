import type { Database } from "../database/database.js";
import { alertCondition, INCIDENT_FAMILIES, isIncidentFamily } from "./alert-policy.js";
import {
  costCeilingCondition,
  projectedCycleCostUsd,
  type DeploymentCostReading,
  type OperationalSnapshot,
} from "./alert-evaluation.js";
import { createOperationalCounters } from "./operational-counters.js";
import { openOperationalIncidents } from "./operational-incidents.js";
import { observeOperationalState } from "./operational-observations.js";

/**
 * ADR 0022's sanitized, read-only diagnostics summary.
 *
 * It is current-state evidence and not an alert route. It runs as a protected
 * GitHub Actions job so it is reachable only by the Project Owner: the public
 * application exposes no diagnostics surface and no owner route, and adding one
 * would put an operational-authority boundary inside the thing being operated.
 *
 * It changes nothing. Every value is read, and the counters handed to the
 * observation are empty because a workflow runner sees none of the API's own
 * traffic — an aggregate of zero refusals is honest here, where a fabricated
 * one would not be.
 */

export interface OwnerDiagnostics {
  observedAt: Date;
  release: string;
  readiness: {
    databaseReachable: boolean;
    appliedSchemaVersion: string | null;
    expectedSchemaVersion: string;
    schemaCompatible: boolean;
  };
  worker: {
    name: string;
    heartbeatAgeSeconds: number | null;
    runnableJobCount: number;
    oldestRunnableAgeSeconds: number | null;
    exhaustedJobCount: number;
  };
  fixtures: Omit<
    OperationalSnapshot["fixtures"],
    "millisecondsSinceSuccessfulRebuild" | "millisecondsSinceReconciliation"
  > & {
    maintenanceState: string;
    sinceSuccessfulRebuildSeconds: number | null;
    sinceReconciliationSeconds: number | null;
  };
  notifications: { unreconciledIntentCount: number; groups: OperationalSnapshot["notifications"] };
  /**
   * The guide's daily cost check, when the owner passes what Railway shows.
   * Railway's own billing email is the alert route; this is the projection the
   * guide asks them to make with the greater of two rates, done for them.
   */
  cost: {
    reading: DeploymentCostReading;
    projectedUsd: number;
    condition: string | null;
    severity: string | null;
    containment: string | null;
  } | null;
  openIncidents: readonly {
    /**
     * The stored family, which a build that named them differently may have
     * written. It is carried as read so an incident this build cannot name is
     * still shown to the owner rather than dropped from their table.
     */
    family: string;
    conditionId: string;
    severity: string;
    route: string;
    incidentCorrelationId: string;
    firstObservedAt: Date;
    lastObservedAt: Date;
    confirmed: boolean;
    escalated: boolean;
  }[];
}

export async function readOwnerDiagnostics(
  db: Database,
  options: { release: string; now?: Date; cost?: DeploymentCostReading },
): Promise<OwnerDiagnostics> {
  const snapshot = await observeOperationalState(db, {
    release: options.release,
    counters: createOperationalCounters(),
    ...(options.now ? { now: options.now } : {}),
  });
  const incidents = await openOperationalIncidents(db);
  const seconds = (milliseconds: number | null) =>
    milliseconds === null ? null : Math.floor(milliseconds / 1000);

  return {
    observedAt: snapshot.observedAt,
    release: snapshot.release,
    readiness: {
      databaseReachable: snapshot.databaseReachable,
      appliedSchemaVersion: snapshot.appliedSchemaVersion,
      expectedSchemaVersion: snapshot.expectedSchemaVersion,
      schemaCompatible: snapshot.appliedSchemaVersion === snapshot.expectedSchemaVersion,
    },
    worker: {
      name: snapshot.worker.name,
      heartbeatAgeSeconds: seconds(snapshot.worker.heartbeatAgeMilliseconds),
      runnableJobCount: snapshot.worker.runnableJobCount,
      oldestRunnableAgeSeconds: seconds(snapshot.worker.oldestRunnableJobAgeMilliseconds),
      exhaustedJobCount: snapshot.worker.exhaustedJobs.reduce(
        (total, group) => total + group.jobCount,
        0,
      ),
    },
    fixtures: {
      generation: snapshot.fixtures.generation,
      manifestVersion: snapshot.fixtures.manifestVersion,
      lastRebuildOutcome: snapshot.fixtures.lastRebuildOutcome,
      lastRebuildSafeFailureCode: snapshot.fixtures.lastRebuildSafeFailureCode,
      lastRebuildCorrelationId: snapshot.fixtures.lastRebuildCorrelationId,
      maintenanceState: snapshot.maintenanceState,
      sinceSuccessfulRebuildSeconds: seconds(
        snapshot.fixtures.millisecondsSinceSuccessfulRebuild,
      ),
      sinceReconciliationSeconds: seconds(snapshot.fixtures.millisecondsSinceReconciliation),
    },
    cost: costOf(options.cost),
    notifications: {
      unreconciledIntentCount: snapshot.notifications.reduce(
        (total, group) => total + group.intentCount,
        0,
      ),
      groups: snapshot.notifications,
    },
    openIncidents: incidents.map((incident) => ({
      family: incident.incident_family,
      conditionId: incident.condition_id,
      severity: incident.severity,
      route: incident.route,
      incidentCorrelationId: incident.correlation_id,
      firstObservedAt: incident.first_observed_at,
      lastObservedAt: incident.last_observed_at,
      confirmed: incident.confirmed_at !== null,
      escalated: incident.escalated_at !== null,
    })),
  };
}

/** The one place a reading is turned into what the summary prints. */
function costOf(reading: DeploymentCostReading | undefined): OwnerDiagnostics["cost"] {
  if (!reading) return null;
  const condition = costCeilingCondition(reading);
  return {
    reading,
    projectedUsd: Math.round(projectedCycleCostUsd(reading) * 100) / 100,
    condition,
    severity: condition ? alertCondition(condition).severity : null,
    containment: condition ? alertCondition(condition).containment : null,
  };
}

/**
 * What the owner reads for a family. An unrecognised value is shown as stored
 * rather than as `undefined`, because the row is still an open incident the
 * owner has to act on and the stored name is the only honest thing to print.
 */
function incidentFamilyLabel(family: string) {
  return isIncidentFamily(family) ? INCIDENT_FAMILIES[family] : family;
}

function row(name: string, value: string | number | boolean | null) {
  return `| ${name} | ${value === null ? "—" : String(value)} |`;
}

/**
 * Renders the summary GitHub Actions shows the owner. It is Markdown rather
 * than JSON because the owner reads it while deciding whether to dispatch a
 * recovery, and it links to the private Railway and Sentry evidence rather than
 * copying any of it: the detailed operational history stays with its provider.
 */
export function renderOwnerDiagnosticsSummary(diagnostics: OwnerDiagnostics): string {
  const lines = [
    "# Public demonstration diagnostics",
    "",
    `Observed at ${diagnostics.observedAt.toISOString()} for release \`${diagnostics.release}\`.`,
    "",
    "This is current-state evidence, not an alert route. Detailed operational",
    "history stays in Railway logs, Sentry, and the workflow runs themselves.",
    "",
    "## Readiness",
    "",
    "| Reading | Value |",
    "| --- | --- |",
    row("Database reachable", diagnostics.readiness.databaseReachable),
    row("Applied schema", diagnostics.readiness.appliedSchemaVersion),
    row("Expected schema", diagnostics.readiness.expectedSchemaVersion),
    row("Schema compatible", diagnostics.readiness.schemaCompatible),
    "",
    "## Worker",
    "",
    "| Reading | Value |",
    "| --- | --- |",
    row("Worker", diagnostics.worker.name),
    row("Heartbeat age (s)", diagnostics.worker.heartbeatAgeSeconds),
    row("Runnable jobs", diagnostics.worker.runnableJobCount),
    row("Oldest runnable age (s)", diagnostics.worker.oldestRunnableAgeSeconds),
    row("Exhausted jobs", diagnostics.worker.exhaustedJobCount),
    "",
    "## Canonical fixtures",
    "",
    "| Reading | Value |",
    "| --- | --- |",
    row("Maintenance state", diagnostics.fixtures.maintenanceState),
    row("Fixture generation", diagnostics.fixtures.generation),
    row("Fixture manifest", diagnostics.fixtures.manifestVersion),
    row("Latest rebuild outcome", diagnostics.fixtures.lastRebuildOutcome),
    row("Latest rebuild safe failure code", diagnostics.fixtures.lastRebuildSafeFailureCode),
    row("Since successful rebuild (s)", diagnostics.fixtures.sinceSuccessfulRebuildSeconds),
    row("Since rolling reconciliation (s)", diagnostics.fixtures.sinceReconciliationSeconds),
    "",
    "## Notifications",
    "",
    row("Unreconciled exhausted intents", diagnostics.notifications.unreconciledIntentCount),
    "",
  ];

  if (diagnostics.cost) {
    lines.push(
      "## Deployment cost",
      "",
      "| Reading | Value |",
      "| --- | --- |",
      row("Actual this cycle (USD)", diagnostics.cost.reading.actualUsd),
      row("Projected this cycle (USD)", diagnostics.cost.projectedUsd),
      row("Condition", diagnostics.cost.condition ?? "below every threshold"),
      row("Severity", diagnostics.cost.severity),
      row("Containment", diagnostics.cost.containment),
      "",
    );
  }

  lines.push("## Open incidents", "");

  if (diagnostics.openIncidents.length === 0) {
    lines.push("No open incident.");
  } else {
    lines.push(
      "| Family | Condition | Severity | Route | Correlation | Opened | Confirmed | Escalated |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
      ...diagnostics.openIncidents.map(
        (incident) =>
          `| ${incidentFamilyLabel(incident.family)} | ${incident.conditionId} | ${incident.severity} | ${incident.route} | ${incident.incidentCorrelationId} | ${incident.firstObservedAt.toISOString()} | ${incident.confirmed} | ${incident.escalated} |`,
      ),
    );
  }

  return `${lines.join("\n")}\n`;
}
