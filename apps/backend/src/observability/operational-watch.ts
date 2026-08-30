import type { Logger } from "pino";

import type { Database } from "../database/database.js";
import {
  alertCondition,
  READINESS_PROBE_INTERVAL_MILLISECONDS,
  type AlertConditionId,
} from "./alert-policy.js";
import { evaluateOperationalAlerts, type FiringCondition } from "./alert-evaluation.js";
import { logOperationalEvent } from "./correlated-logger.js";
import type { OperationalCounters } from "./operational-counters.js";
import {
  clearingIsSatisfied,
  confirmationIsSatisfied,
  recordOperationalObservation,
  reportOperationalCondition,
  type AlertDispatch,
} from "./operational-incidents.js";
import { observeOperationalState } from "./operational-observations.js";
import type { TelemetryReporter } from "./telemetry.js";

/**
 * The loop that turns the operator guide's thresholds into private alerts.
 *
 * It runs in the API process. That is the only process the deployment can rely
 * on being up when something is wrong: the worker is itself one of the things
 * being watched, and a watcher that dies with the failure it watches for tells
 * nobody anything. The API's own liveness is the platform's restart policy, and
 * the deployment stages are GitHub Actions — the two conditions this loop
 * therefore cannot raise for itself, and which the policy marks accordingly.
 *
 * It writes no Audit Entry. CONTEXT.md scopes those to authenticated mutations,
 * denied sensitive-data reads, and background *actions*; observing state and
 * telling the owner about it changes no marketplace record, and the operator
 * guide says so outright: alerts do not create Audit Entries merely for
 * alerting. Every state-changing containment or recovery step that follows an
 * alert creates its own entries where it happens.
 */
export const OPERATIONAL_WATCH_INTERVAL_MILLISECONDS = READINESS_PROBE_INTERVAL_MILLISECONDS;

const DATABASE_UNREACHABLE = "readiness.database-unreachable";

export interface OperationalWatchOptions {
  db: Database;
  release: string;
  counters: OperationalCounters;
  reporter: TelemetryReporter;
}

export interface OperationalWatch {
  observe(now?: Date): Promise<readonly AlertDispatch[]>;
  /**
   * Raises one condition the application detected outright, with no threshold
   * to poll. It goes through the same durable lifecycle as an observed one, so
   * a fact detected on every request still produces one alert rather than one
   * per request.
   */
  report(
    conditionId: AlertConditionId,
    evidence: Record<string, string | number | boolean>,
    now?: Date,
  ): Promise<readonly AlertDispatch[]>;
}

export function createOperationalWatch(options: OperationalWatchOptions): OperationalWatch {
  // The one incident the durable store cannot hold, because it is the store.
  // When PostgreSQL is unreachable there is nowhere to record that PostgreSQL
  // is unreachable, so this incident alone keeps its lifecycle in memory — and
  // keeps it faithfully, so an outage still sends one alert and one recovery
  // rather than a reminder every thirty seconds.
  let outage: {
    firstObservedAt: Date;
    observationCount: number;
    healthySince: Date | null;
    healthyObservationCount: number;
    correlationId: string;
    confirmed: boolean;
  } | null = null;

  const dispatchOutage = (
    kind: AlertDispatch["kind"],
    firing: FiringCondition,
    correlationId: string,
  ): AlertDispatch => {
    const policy = alertCondition(DATABASE_UNREACHABLE);
    return {
      kind,
      conditionId: DATABASE_UNREACHABLE,
      family: policy.family,
      fingerprint: firing.fingerprint,
      severity: policy.severity,
      route: policy.route,
      incidentCorrelationId: correlationId,
      evidence: firing.evidence,
    };
  };

  return {
    async report(conditionId, evidence, now) {
      const at = now ?? new Date();
      const dispatches = await reportOperationalCondition(options.db, {
        firing: {
          conditionId,
          fingerprint: `${alertCondition(conditionId).family}:${conditionId}`,
          evidence: { ...evidence, release: options.release },
        },
        now: at,
      });
      for (const alert of dispatches) options.reporter.reportAlert(alert);
      return dispatches;
    },

    async observe(now) {
      const snapshot = await observeOperationalState(options.db, {
        release: options.release,
        counters: options.counters,
        ...(now ? { now } : {}),
      });
      const observedAt = snapshot.observedAt;
      const firing = evaluateOperationalAlerts(snapshot);
      const dispatches: AlertDispatch[] = [];

      const unreachable = firing.find((condition) => condition.conditionId === DATABASE_UNREACHABLE);
      if (unreachable) {
        // The same continuous window the durable lifecycle keeps: a healthy
        // reading before confirmation restarts it rather than letting a
        // flapping connection accumulate its way to an alert.
        const interrupted = outage !== null && outage.healthySince !== null && !outage.confirmed;
        outage = outage
          ? {
              ...outage,
              ...(interrupted
                ? { firstObservedAt: observedAt, observationCount: 1 }
                : { observationCount: outage.observationCount + 1 }),
              healthySince: null,
              healthyObservationCount: 0,
            }
          : {
              firstObservedAt: observedAt,
              observationCount: 1,
              healthySince: null,
              healthyObservationCount: 0,
              correlationId: `incident-outage-${observedAt.toISOString()}`,
              confirmed: false,
            };
        if (
          !outage.confirmed &&
          confirmationIsSatisfied(DATABASE_UNREACHABLE, {
            first_observed_at: outage.firstObservedAt,
            observation_count: outage.observationCount,
          }, observedAt)
        ) {
          outage.confirmed = true;
          dispatches.push(dispatchOutage("CONFIRMED", unreachable, outage.correlationId));
        }
        for (const alert of dispatches) options.reporter.reportAlert(alert);
        return dispatches;
      }

      if (outage) {
        outage = {
          ...outage,
          healthySince: outage.healthySince ?? observedAt,
          healthyObservationCount: outage.healthyObservationCount + 1,
        };
        if (
          clearingIsSatisfied(DATABASE_UNREACHABLE, {
            healthy_since: outage.healthySince,
            healthy_observation_count: outage.healthyObservationCount,
          }, observedAt)
        ) {
          if (outage.confirmed) {
            dispatches.push(
              dispatchOutage(
                "RECOVERED",
                {
                  conditionId: DATABASE_UNREACHABLE,
                  fingerprint: `${alertCondition(DATABASE_UNREACHABLE).family}:${DATABASE_UNREACHABLE}`,
                  evidence: { release: snapshot.release, schemaVersion: snapshot.expectedSchemaVersion },
                },
                outage.correlationId,
              ),
            );
          }
          outage = null;
        }
      }

      dispatches.push(
        ...(await recordOperationalObservation(options.db, { firing, now: observedAt })),
      );
      for (const alert of dispatches) options.reporter.reportAlert(alert);
      return dispatches;
    },
  };
}

/**
 * Observes immediately, then on the guide's 30-second probe interval. A failed
 * observation is reported and the loop continues: an unreachable database is
 * the condition being watched for, not a reason to stop watching.
 */
export function startOperationalWatch(
  options: OperationalWatchOptions & { logger: Logger; intervalMilliseconds?: number },
): { stop: () => void; observed: Promise<void> } {
  const watch = createOperationalWatch(options);
  let observing = false;
  const observe = async () => {
    // An observation that outlives its own interval must not start another:
    // each one holds a pooled connection, and a database slow enough to
    // overlap is one the readiness probe needs that connection for.
    if (observing) return;
    observing = true;
    try {
      await watch.observe();
    } catch (error) {
      logOperationalEvent(options.logger, "error", { event: "operational-watch.failed" });
      options.reporter.reportFailure(error, { event: "operational-watch.failed" });
    } finally {
      observing = false;
    }
  };
  const timer = setInterval(
    () => void observe(),
    options.intervalMilliseconds ?? OPERATIONAL_WATCH_INTERVAL_MILLISECONDS,
  );
  timer.unref();
  return { stop: () => clearInterval(timer), observed: observe() };
}
