import { createHash, randomBytes } from "node:crypto";

import { ABUSE_WINDOW_MILLISECONDS, INTEGRATION_FAILURE_WINDOW_MILLISECONDS } from "./alert-policy.js";
import type { OperationalSnapshot } from "./alert-evaluation.js";

/**
 * The counters behind the abuse and third-party-integration thresholds.
 *
 * They are in-memory and per process, which the deployment can afford because
 * ADR 0025 permits exactly one API replica, and which the operator guide's
 * evidence boundary actively wants: an aggregate that lives for five minutes
 * in a process cannot become a retained log of who visited. A source address
 * decides one bucket under a per-process salt and is never stored readably,
 * the same way the request budget already treats it.
 */

const MINUTE = 60_000;
/** Above this many live source runs, expired ones are swept before a new one lands. */
const SOURCE_SWEEP_THRESHOLD = 10_000;
/** Correlations are counted, not collected; this bounds what one window holds. */
const MAXIMUM_TRACKED_CORRELATIONS = 64;

interface MinuteCounter {
  buckets: Map<number, number>;
}

function bump(counter: MinuteCounter, now: number, windowMilliseconds: number) {
  const minute = Math.floor(now / MINUTE);
  counter.buckets.set(minute, (counter.buckets.get(minute) ?? 0) + 1);
  const oldest = minute - Math.ceil(windowMilliseconds / MINUTE);
  for (const bucket of counter.buckets.keys()) {
    if (bucket <= oldest) counter.buckets.delete(bucket);
  }
}

function total(counter: MinuteCounter, now: number, windowMilliseconds: number) {
  const oldest = Math.floor(now / MINUTE) - Math.ceil(windowMilliseconds / MINUTE);
  let sum = 0;
  for (const [bucket, count] of counter.buckets) if (bucket > oldest) sum += count;
  return sum;
}

export interface OperationalCounters {
  /** One refused request, and the source it was refused for. */
  recordRefusedRequest(source: string, now: number): void;
  /** One refusal that could not be attributed to a Caddy-verified source. */
  recordUnverifiedSourceRefusal(now: number): void;
  /** One denied authorization attempt, wherever in the API it was decided. */
  recordDeniedAuthorization(now: number): void;
  /** One observed failure of a runtime boundary such as Auth0 or Sentry. */
  recordIntegrationFailure(
    failure: { integration: string; safeFailureCode: string; correlationId: string },
    now: number,
  ): void;
  read(now: number): Pick<OperationalSnapshot, "abuse" | "integrations">;
}

export function createOperationalCounters(): OperationalCounters {
  const salt = randomBytes(32);
  const refusals: MinuteCounter = { buckets: new Map() };
  const unverified: MinuteCounter = { buckets: new Map() };
  const denials: MinuteCounter = { buckets: new Map() };
  // One entry per source that has been refused recently: the minute it was last
  // refused in, and how many consecutive minutes that run covers.
  const sourceRuns = new Map<string, { minute: number; run: number }>();
  const integrations = new Map<
    string,
    { integration: string; safeFailureCode: string; counter: MinuteCounter; correlations: Map<string, number> }
  >();

  const keyFor = (source: string) =>
    createHash("sha256").update(salt).update(source).digest("base64url");

  return {
    recordRefusedRequest(source, now) {
      bump(refusals, now, ABUSE_WINDOW_MILLISECONDS);
      const minute = Math.floor(now / MINUTE);
      const hashed = keyFor(source);
      const previous = sourceRuns.get(hashed);
      if (previous?.minute === minute) return;
      if (sourceRuns.size >= SOURCE_SWEEP_THRESHOLD) {
        for (const [candidate, run] of sourceRuns) {
          if (run.minute < minute - 1) sourceRuns.delete(candidate);
        }
      }
      sourceRuns.set(hashed, {
        minute,
        run: previous?.minute === minute - 1 ? previous.run + 1 : 1,
      });
    },
    recordUnverifiedSourceRefusal(now) {
      bump(unverified, now, ABUSE_WINDOW_MILLISECONDS);
    },
    recordDeniedAuthorization(now) {
      bump(denials, now, ABUSE_WINDOW_MILLISECONDS);
    },
    recordIntegrationFailure(failure, now) {
      const key = `${failure.integration}:${failure.safeFailureCode}`;
      let observed = integrations.get(key);
      if (!observed) {
        observed = {
          integration: failure.integration,
          safeFailureCode: failure.safeFailureCode,
          counter: { buckets: new Map() },
          correlations: new Map(),
        };
        integrations.set(key, observed);
      }
      bump(observed.counter, now, INTEGRATION_FAILURE_WINDOW_MILLISECONDS);
      // The guide asks how many correlations a run of failures spans, which is
      // what separates one retried operation from a boundary that is down.
      for (const [correlation, seenAt] of observed.correlations) {
        if (now - seenAt >= INTEGRATION_FAILURE_WINDOW_MILLISECONDS) {
          observed.correlations.delete(correlation);
        }
      }
      if (
        observed.correlations.size < MAXIMUM_TRACKED_CORRELATIONS ||
        observed.correlations.has(failure.correlationId)
      ) {
        observed.correlations.set(failure.correlationId, now);
      }
    },
    read(now) {
      const minute = Math.floor(now / MINUTE);
      let longestRun = 0;
      for (const [hashed, run] of sourceRuns) {
        // A run that skipped a whole minute is over, whatever it reached.
        if (run.minute < minute - 1) {
          sourceRuns.delete(hashed);
          continue;
        }
        longestRun = Math.max(longestRun, run.run);
      }
      const observedIntegrations: OperationalSnapshot["integrations"] = [...integrations.values()]
        .map((observed) => ({
          integration: observed.integration,
          safeFailureCode: observed.safeFailureCode,
          failureCount: total(observed.counter, now, INTEGRATION_FAILURE_WINDOW_MILLISECONDS),
          correlationCount: observed.correlations.size,
        }))
        .filter((observed) => observed.failureCount > 0);
      for (const [key, observed] of integrations) {
        if (total(observed.counter, now, INTEGRATION_FAILURE_WINDOW_MILLISECONDS) === 0) {
          integrations.delete(key);
        }
      }
      return {
        abuse: {
          refusedRequestCount: total(refusals, now, ABUSE_WINDOW_MILLISECONDS),
          unverifiedSourceRefusalCount: total(unverified, now, ABUSE_WINDOW_MILLISECONDS),
          deniedAuthorizationCount: total(denials, now, ABUSE_WINDOW_MILLISECONDS),
          sourcesAtLimitConsecutiveWindows: longestRun,
        },
        integrations: observedIntegrations,
      };
    },
  };
}
