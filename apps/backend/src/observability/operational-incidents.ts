import { randomUUID } from "node:crypto";

import type { Database } from "../database/database.js";
import {
  alertCondition,
  isAlertConditionId,
  isIncidentFamily,
  type AlertConditionId,
  type AlertRoute,
  type AlertSeverity,
  type IncidentFamily,
} from "./alert-policy.js";
import type { FiringCondition } from "./alert-evaluation.js";

/**
 * The operator guide's alert model, made durable.
 *
 * "An incident sends one confirmation alert, one additional alert if severity
 * rises, and one recovery notification—never periodic reminders. The same
 * incident-family and safe-failure fingerprint joins an open incident;
 * recurrence after clearing opens a new correlated incident."
 *
 * Every clause of that is a state transition on one row, which is why this is
 * a table rather than a counter in a process that restarts during exactly the
 * incidents it is meant to remember.
 */

export type AlertDispatchKind = "CONFIRMED" | "ESCALATED" | "RECOVERED";

export interface AlertDispatch {
  kind: AlertDispatchKind;
  conditionId: AlertConditionId;
  family: IncidentFamily;
  fingerprint: string;
  severity: AlertSeverity;
  route: AlertRoute;
  /** This incident's own identifier, joining every message about it. */
  incidentCorrelationId: string;
  evidence: Record<string, string | number | boolean>;
}

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  OWNER_ATTENTION: 1,
  IMMEDIATE: 2,
};

/**
 * Whether a condition that has stopped holding has been quiet long enough for
 * its family's clearing rule. `OWNER_VERIFICATION` never answers yes: the
 * guide is explicit that maintenance is never cleared from elapsed time, and
 * an incident that ended in an indeterminate state or an exposure is closed by
 * the owner's own verification through `clearOperationalIncident`.
 */
export function clearingIsSatisfied(
  conditionId: AlertConditionId,
  incident: { healthy_since: Date | null; healthy_observation_count: number },
  now: Date,
): boolean {
  const rule = alertCondition(conditionId).clearing;
  switch (rule.kind) {
    case "HEALTHY_OBSERVATIONS":
      return incident.healthy_observation_count >= rule.observations;
    case "HEALTHY_FOR":
      return (
        incident.healthy_since !== null &&
        now.getTime() - incident.healthy_since.getTime() >= rule.milliseconds
      );
    case "SAFE_DISPOSITION":
      // These conditions fire from the presence of unreconciled records — an
      // exhausted job, an exhausted Notification Intent, a rebuild that has
      // not succeeded. Their absence is the safe disposition, so one healthy
      // reading is proof rather than the passage of time.
      return true;
    case "OWNER_VERIFICATION":
    case "HEALTHY_FOR_THEN_OWNER_VERIFICATION":
      // The quiet window is recorded so the owner knows when the smoke journey
      // is worth running; running it is what closes the incident.
      return false;
  }
}

/** Whether a firing condition has been confirmed long enough to dispatch. */
export function confirmationIsSatisfied(
  conditionId: AlertConditionId,
  incident: { first_observed_at: Date; observation_count: number },
  now: Date,
): boolean {
  const rule = alertCondition(conditionId).confirmation;
  switch (rule.kind) {
    case "SINGLE_OBSERVATION":
      return true;
    case "CONSECUTIVE_OBSERVATIONS":
      return incident.observation_count >= rule.observations;
    case "SUSTAINED":
      return now.getTime() - incident.first_observed_at.getTime() >= rule.forMilliseconds;
  }
}

/**
 * One row as one alert. Every message about an incident is built here, so a
 * confirmation, an escalation, and a recovery cannot disagree about which
 * incident they belong to.
 */
function dispatchFor(
  incident: {
    condition_id: string;
    incident_family: string;
    fingerprint: string;
    severity: AlertSeverity;
    route: AlertRoute;
    correlation_id: string;
  },
  kind: AlertDispatchKind,
  evidence: Record<string, string | number | boolean>,
): AlertDispatch | null {
  // A condition the running build no longer defines cannot be described, and
  // guessing at it would send the owner to a runbook that is not there. The
  // family is checked for the same reason: an alert naming one this build
  // cannot resolve would reach the owner with no runbook behind it either.
  if (!isAlertConditionId(incident.condition_id)) return null;
  if (!isIncidentFamily(incident.incident_family)) return null;
  return {
    kind,
    conditionId: incident.condition_id,
    family: incident.incident_family,
    fingerprint: incident.fingerprint,
    severity: incident.severity,
    route: incident.route,
    incidentCorrelationId: incident.correlation_id,
    evidence,
  };
}

function evidenceOf(row: { evidence: Record<string, unknown> }) {
  const evidence: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(row.evidence)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      evidence[key] = value;
    }
  }
  return evidence;
}

/**
 * Folds one reading of the deployment into the open incidents and answers with
 * the alerts that must actually be sent. Calling it repeatedly with the same
 * conditions sends nothing further, which is the whole point: a reminder every
 * thirty seconds would train the owner to ignore the route.
 */
export async function recordOperationalObservation(
  db: Database,
  reading: { firing: readonly FiringCondition[]; now: Date },
): Promise<readonly AlertDispatch[]> {
  const open = await openIncidentRows(db);
  return [
    ...(await foldFiringConditions(db, open, reading.firing, reading.now)),
    ...(await sweepRecoveredIncidents(db, open, reading.firing, reading.now)),
  ];
}

/**
 * Raises one condition the application detected outright rather than by
 * polling — an internal endpoint reached publicly, say. It joins or opens an
 * incident exactly as an observed condition does, so a fact detected on every
 * request still produces one alert. It sweeps nothing: a reading of one
 * condition is no evidence about the others, and clearing an incident nothing
 * re-checked would be a recovery notification nobody earned.
 */
export async function reportOperationalCondition(
  db: Database,
  reported: { firing: FiringCondition; now: Date },
): Promise<readonly AlertDispatch[]> {
  return foldFiringConditions(db, await openIncidentRows(db), [reported.firing], reported.now);
}

function openIncidentRows(db: Database) {
  return db
    .selectFrom("operational_incidents")
    .selectAll()
    .where("cleared_at", "is", null)
    .execute();
}

type OpenIncidentRow = Awaited<ReturnType<typeof openIncidentRows>>[number];

async function foldFiringConditions(
  db: Database,
  open: readonly OpenIncidentRow[],
  firing: readonly FiringCondition[],
  now: Date,
): Promise<readonly AlertDispatch[]> {
  const dispatches: AlertDispatch[] = [];
  const push = (dispatch: AlertDispatch | null) => {
    if (dispatch) dispatches.push(dispatch);
  };
  const openByFingerprint = new Map(open.map((incident) => [incident.fingerprint, incident]));

  for (const condition of firing) {
    const policy = alertCondition(condition.conditionId);
    const incident = openByFingerprint.get(condition.fingerprint);

    if (!incident) {
      const opened = await db
        .insertInto("operational_incidents")
        .values({
          condition_id: condition.conditionId,
          incident_family: policy.family,
          fingerprint: condition.fingerprint,
          severity: policy.severity,
          route: policy.route,
          correlation_id: `incident-${randomUUID()}`,
          evidence: JSON.stringify(condition.evidence),
          first_observed_at: now,
          last_observed_at: now,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      if (confirmationIsSatisfied(condition.conditionId, opened, now)) {
        await db
          .updateTable("operational_incidents")
          .set({ confirmed_at: now })
          .where("id", "=", opened.id)
          .execute();
        push(dispatchFor(opened, "CONFIRMED", condition.evidence));
      }
      continue;
    }

    // A severity that rises inside an open incident is the guide's one
    // additional alert. It is recorded on the same row so it can only happen
    // once, however many readings follow.
    const rising =
      SEVERITY_RANK[policy.severity] > SEVERITY_RANK[incident.severity] &&
      incident.confirmed_at !== null &&
      incident.escalated_at === null;

    // Every confirmation window in the guide is continuous: three *consecutive*
    // failed readiness probes, a backlog held *continuously* for five minutes.
    // A healthy reading before confirmation therefore restarts the window
    // rather than leaving a flapping condition to accumulate its way to an
    // alert. The incident itself stays open, because its own clearing rule —
    // not a single healthy reading — decides when it is over.
    const interrupted = incident.healthy_since !== null && incident.confirmed_at === null;

    const observed = await db
      .updateTable("operational_incidents")
      .set({
        condition_id: condition.conditionId,
        evidence: JSON.stringify(condition.evidence),
        last_observed_at: now,
        ...(interrupted
          ? { first_observed_at: now, observation_count: 1 }
          : { observation_count: incident.observation_count + 1 }),
        healthy_since: null,
        healthy_observation_count: 0,
        ...(SEVERITY_RANK[policy.severity] > SEVERITY_RANK[incident.severity]
          ? { severity: policy.severity }
          : {}),
        ...(rising ? { escalated_at: now } : {}),
      })
      .where("id", "=", incident.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    if (rising) {
      push(dispatchFor(observed, "ESCALATED", condition.evidence));
      continue;
    }

    if (
      incident.confirmed_at === null &&
      confirmationIsSatisfied(condition.conditionId, observed, now)
    ) {
      await db
        .updateTable("operational_incidents")
        .set({ confirmed_at: now })
        .where("id", "=", incident.id)
        .execute();
      push(dispatchFor(observed, "CONFIRMED", condition.evidence));
    }
  }

  return dispatches;
}

async function sweepRecoveredIncidents(
  db: Database,
  open: readonly OpenIncidentRow[],
  firing: readonly FiringCondition[],
  now: Date,
): Promise<readonly AlertDispatch[]> {
  const dispatches: AlertDispatch[] = [];
  const push = (dispatch: AlertDispatch | null) => {
    if (dispatch) dispatches.push(dispatch);
  };
  const firingFingerprints = new Set(firing.map((condition) => condition.fingerprint));

  for (const incident of open) {
    if (firingFingerprints.has(incident.fingerprint)) continue;

    const healthy = await db
      .updateTable("operational_incidents")
      .set({
        healthy_since: incident.healthy_since ?? now,
        healthy_observation_count: incident.healthy_observation_count + 1,
      })
      .where("id", "=", incident.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    if (
      !isAlertConditionId(incident.condition_id) ||
      !clearingIsSatisfied(incident.condition_id, healthy, now)
    ) {
      continue;
    }

    // An incident that was never confirmed was never announced, and the guide
    // puts automatically recovered transients "only in privacy-filtered
    // telemetry and owner diagnostics" — not in the incident record. It is
    // forgotten rather than cleared, which is also what the table's own
    // `cleared_at implies confirmed_at` check requires.
    if (incident.confirmed_at === null) {
      await db.deleteFrom("operational_incidents").where("id", "=", incident.id).execute();
      continue;
    }

    await db
      .updateTable("operational_incidents")
      .set({ cleared_at: now })
      .where("id", "=", incident.id)
      .execute();
    push(dispatchFor(incident, "RECOVERED", evidenceOf(healthy)));
  }

  return dispatches;
}

/**
 * Closes incidents whose clearing rule is the owner's own verification: a
 * completed recovery, a rotated credential, a passing restore drill, an
 * authorization smoke after abusive traffic. The caller has already done the
 * verifying; these record that it happened and answer with the single recovery
 * notification each announced incident is owed.
 *
 * An incident that was never confirmed was never announced, so it is forgotten
 * rather than cleared — the same rule the automatic path follows, and the same
 * rule the table's `cleared_at implies confirmed_at` check enforces.
 *
 * Closes one incident by the correlation identifier the owner has in front of
 * them — it is in the alert they received and in the diagnostics summary.
 */
export async function clearOperationalIncident(
  db: Database,
  options: { correlationId: string; now?: Date },
): Promise<AlertDispatch | null> {
  const now = options.now ?? new Date();
  const incident = await db
    .selectFrom("operational_incidents")
    .selectAll()
    .where("correlation_id", "=", options.correlationId)
    .where("cleared_at", "is", null)
    .executeTakeFirst();
  if (!incident) return null;
  if (incident.confirmed_at === null) {
    await db.deleteFrom("operational_incidents").where("id", "=", incident.id).execute();
    return null;
  }
  await db
    .updateTable("operational_incidents")
    .set({ cleared_at: now, healthy_since: incident.healthy_since ?? now })
    .where("id", "=", incident.id)
    .execute();
  return dispatchFor(incident, "RECOVERED", evidenceOf(incident));
}

/**
 * Closes every open incident in one family after the owner has verified the
 * family's own recovery evidence. A completed Canonical Data Recovery is the
 * case this exists for: the workflow has just proven schema compatibility,
 * lease ownership, aggregate invariants, and a passing deployed smoke, which is
 * exactly what the indeterminate-rebuild incident was waiting for.
 */
export async function clearOperationalIncidentsForFamily(
  db: Database,
  options: { family: IncidentFamily; now?: Date },
): Promise<readonly AlertDispatch[]> {
  const now = options.now ?? new Date();
  const open = await db
    .selectFrom("operational_incidents")
    .selectAll()
    .where("incident_family", "=", options.family)
    .where("cleared_at", "is", null)
    .execute();

  const dispatches: AlertDispatch[] = [];
  for (const incident of open) {
    if (incident.confirmed_at === null) {
      await db.deleteFrom("operational_incidents").where("id", "=", incident.id).execute();
      continue;
    }
    await db
      .updateTable("operational_incidents")
      .set({ cleared_at: now, healthy_since: incident.healthy_since ?? now })
      .where("id", "=", incident.id)
      .execute();
    const dispatch = dispatchFor(incident, "RECOVERED", evidenceOf(incident));
    if (dispatch) dispatches.push(dispatch);
  }
  return dispatches;
}

/** Every incident still open, newest first, for the owner diagnostics summary. */
export async function openOperationalIncidents(db: Database) {
  return db
    .selectFrom("operational_incidents")
    .select([
      "condition_id",
      "incident_family",
      "fingerprint",
      "severity",
      "route",
      "correlation_id",
      "evidence",
      "first_observed_at",
      "last_observed_at",
      "observation_count",
      "confirmed_at",
      "escalated_at",
    ])
    .where("cleared_at", "is", null)
    .orderBy("first_observed_at", "desc")
    .execute();
}
