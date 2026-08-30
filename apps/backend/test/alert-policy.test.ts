import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { TELEMETRY_SAFE_CONTEXT_KEYS } from "@marketplace/core";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  ALERT_CONDITIONS,
  COST_HARD_LIMIT_USD,
  INCIDENT_FAMILIES,
  alertCondition,
  isAlertConditionId,
  type AlertCondition,
} from "../src/observability/alert-policy.js";
import {
  costCeilingCondition,
  evaluateOperationalAlerts,
  projectedCycleCostUsd,
  type OperationalSnapshot,
} from "../src/observability/alert-evaluation.js";
import { WORKER_HEARTBEAT_STALE_MILLISECONDS } from "../src/worker/worker-heartbeat.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function healthySnapshot(): OperationalSnapshot {
  return {
    observedAt: new Date("2026-08-29T12:00:00.000Z"),
    release: "abc1234",
    databaseReachable: true,
    appliedSchemaVersion: "0034_operational_alerting.sql",
    expectedSchemaVersion: "0034_operational_alerting.sql",
    maintenanceState: "AVAILABLE",
    worker: {
      name: "marketplace-worker",
      heartbeatAgeMilliseconds: 30_000,
      runnableJobCount: 3,
      oldestRunnableJobAgeMilliseconds: 20_000,
      exhaustedJobs: [],
    },
    fixtures: {
      generation: 7,
      manifestVersion: "synthetic-curriculum.v1",
      lastRebuildOutcome: "COMPLETED",
      lastRebuildSafeFailureCode: null,
      lastRebuildCorrelationId: "canonical-rebuild-7",
      millisecondsSinceSuccessfulRebuild: 60 * 60_000,
      millisecondsSinceReconciliation: 10 * 60_000,
    },
    notifications: [],
    integrations: [],
    abuse: {
      refusedRequestCount: 0,
      unverifiedSourceRefusalCount: 0,
      deniedAuthorizationCount: 0,
      sourcesAtLimitConsecutiveWindows: 0,
    },
  };
}

const firingIds = (snapshot: OperationalSnapshot) =>
  evaluateOperationalAlerts(snapshot).map((condition) => condition.conditionId);

// The operator guide is the canonical mutable policy; the policy table is its
// executable statement. These are the assertions that keep the two honest.
describe("alert policy coverage", () => {
  const readinessEvidence = readFileSync(
    resolve(repositoryRoot, "docs/operations/readiness-evidence.md"),
    "utf8",
  );

  it("names every incident family the operational readiness record has a row for", () => {
    const documented = readinessEvidence
      .split("\n")
      .filter((line) => /^\| .+ \| \| \| \| \| \| \|$/.test(line))
      .map((line) => line.split("|")[1]!.trim());
    expect(documented.length).toBeGreaterThan(0);
    expect(new Set(Object.values(INCIDENT_FAMILIES))).toEqual(new Set(documented));
  });

  it("holds every threshold it encodes to the number the operator guide states", () => {
    // The guide is the canonical policy and this file is its executable
    // statement, so editing one of these numbers in prose has to fail here.
    const guide = readFileSync(
      resolve(repositoryRoot, "docs/operations/operator-guide.md"),
      "utf8",
    );
    for (const stated of [
      "internally every 30 seconds",
      "three failed readiness probes (90 seconds)",
      "every 60 seconds; owner attention when it is over three minutes stale",
      "oldest runnable age exceeds 10 minutes or runnable depth exceeds 100 continuously for five minutes",
      "26 hours without a successful rebuild",
      "two consecutive failed runs or 150 minutes without success",
      "retries after 1, 5, and 30 minutes",
      "26 hours without a daily backup or eight days without a weekly backup",
      "48 hours without a valid backup",
      "60-minute recovery-time target",
      "five failures for one integration across at least two correlations in five minutes",
      "five events in five minutes, any 10 unhandled server errors in 10 minutes",
      "10 events across at least three correlations in 10 minutes",
      "three occurrences of a new server or browser fingerprint in 10 minutes",
      "three consecutive one-minute windows",
      "300 aggregate HTTP 429 responses in five minutes",
      "50 denied authorization attempts across sources in five minutes",
      "30 minutes below every abuse threshold",
      "$8 billing-cycle warning and $15 hard usage limit",
      "$8 actual or $12 projected",
      "$12 actual or a projection reaching $15 within 72 hours",
    ]) {
      expect(guide).toContain(stated);
    }
  });

  it("gives every family at least one condition", () => {
    for (const family of Object.keys(INCIDENT_FAMILIES)) {
      expect(ALERT_CONDITIONS.some((condition) => condition.family === family)).toBe(true);
    }
  });

  it("gives every condition a threshold, a confirmation, a containment, evidence, and a clearing rule", () => {
    for (const condition of ALERT_CONDITIONS) {
      expect(condition.confirmation.kind).toBeTruthy();
      expect(condition.containment.length).toBeGreaterThan(20);
      expect(condition.evidence.length).toBeGreaterThan(0);
      expect(condition.clearing.kind).toBeTruthy();
    }
  });

  it("expects only evidence the telemetry filter is allowed to carry", () => {
    const safe = new Set<string>(TELEMETRY_SAFE_CONTEXT_KEYS);
    for (const condition of ALERT_CONDITIONS) {
      for (const key of condition.evidence) expect(safe.has(key)).toBe(true);
    }
  });

  it("names each condition once, so an incident cannot resolve to two policies", () => {
    const ids = ALERT_CONDITIONS.map((condition) => condition.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("refuses a condition the policy does not define", () => {
    // The type keeps a well-typed caller honest; this is the identifier read
    // back out of the incident table, where it has only ever been a string.
    expect(isAlertConditionId("readiness.invented")).toBe(false);
    expect(() => alertCondition("readiness.invented" as never)).toThrow(/readiness.invented/);
  });

  it("carries the guide's numbers for every condition it does not evaluate itself", () => {
    // A provider condition is only as good as the configuration someone made
    // in Sentry or Railway. The policy has to state the number that
    // configuration is supposed to implement, or nothing can check it.
    for (const condition of ALERT_CONDITIONS) {
      if (condition.detection !== "PROVIDER") continue;
      expect(Object.keys(condition.threshold).length).toBeGreaterThan(0);
    }
    expect(alertCondition("cost.warning-threshold").threshold)
      .toEqual({ actualUsd: 8, projectedUsd: 12 });
    expect(alertCondition("cost.hard-limit-imminent").threshold)
      .toEqual({ actualUsd: 12, hardLimitUsd: 15, horizonDays: 3 });
    expect(alertCondition("sentry.browser-fingerprint").threshold)
      .toEqual({ events: 10, correlations: 3, windowMilliseconds: 600_000 });
    expect(alertCondition("sentry.new-server-fingerprint").threshold)
      .toEqual({ events: 5, windowMilliseconds: 300_000 });
    expect(alertCondition("backups.weekly-missing").threshold)
      .toEqual({ withoutBackupMilliseconds: 8 * 24 * 60 * 60_000 });
  });

  it("says plainly which conditions nothing in the deployment detects", () => {
    // The guide accepts these; no automated detector exists for any of them.
    // Marking them owner-raised is the difference between a policy that
    // documents a response and one that claims a capability.
    expect(
      ALERT_CONDITIONS.filter((condition) => condition.detection === "OWNER_RAISED")
        .map((condition) => condition.id),
    ).toEqual([
      "integrations.credential-rejected",
      "sentry.safety-violation",
      "security.secret-outside-store",
      "security.authorization-failed-open",
      "security.unauthorized-mutation-committed",
    ]);
  });

  it("never clears on elapsed time alone where the guide asks for a smoke journey", () => {
    // "Clear after an explicit integration smoke and three observed successes";
    // "30 minutes below every abuse threshold plus an authorization smoke".
    expect(alertCondition("integrations.repeated-failures").clearing)
      .toEqual({ kind: "OWNER_VERIFICATION" });
    for (const id of [
      "abuse.source-at-limit",
      "abuse.aggregate-refusals",
      "abuse.denied-authorization",
      "abuse.unverified-source-refusals",
    ] as const) {
      expect(alertCondition(id).clearing).toEqual({
        kind: "HEALTHY_FOR_THEN_OWNER_VERIFICATION",
        milliseconds: 30 * 60_000,
      });
    }
  });

  it("routes every application-evaluated condition to Sentry email", () => {
    // The guide gives GitHub Actions the deployment, rebuild, backup, and drill
    // failures and Railway the billing limits — routes the application is not
    // part of. Anything it evaluates itself has to leave through Sentry.
    for (const condition of ALERT_CONDITIONS) {
      if (condition.detection === "PROVIDER") continue;
      expect(condition.route).toBe("SENTRY_EMAIL");
    }
  });

  it("evaluates exactly the conditions it marks as observed", () => {
    const observed = new Set(
      ALERT_CONDITIONS.filter((condition: AlertCondition) => condition.detection === "OBSERVED")
        .map((condition) => condition.id),
    );
    const reachable = new Set([
      ...firingIds({ ...healthySnapshot(), databaseReachable: false }),
      ...firingIds({ ...healthySnapshot(), appliedSchemaVersion: "0001_initial.sql" }),
      ...firingIds({
        ...healthySnapshot(),
        worker: { ...healthySnapshot().worker, heartbeatAgeMilliseconds: 240_000 },
      }),
      ...firingIds({
        ...healthySnapshot(),
        worker: { ...healthySnapshot().worker, runnableJobCount: 101 },
      }),
      ...firingIds({
        ...healthySnapshot(),
        worker: {
          ...healthySnapshot().worker,
          exhaustedJobs: [
            { jobType: "deliver_notification_intents", safeFailureCode: "X", jobCount: 1, attemptCount: 4 },
          ],
        },
      }),
      ...firingIds({ ...healthySnapshot(), maintenanceState: "INDETERMINATE" }),
      ...firingIds({
        ...healthySnapshot(),
        fixtures: { ...healthySnapshot().fixtures, lastRebuildOutcome: "ROLLED_BACK" },
      }),
      ...firingIds({
        ...healthySnapshot(),
        fixtures: { ...healthySnapshot().fixtures, millisecondsSinceSuccessfulRebuild: null },
      }),
      ...firingIds({
        ...healthySnapshot(),
        fixtures: { ...healthySnapshot().fixtures, millisecondsSinceReconciliation: null },
      }),
      ...firingIds({
        ...healthySnapshot(),
        notifications: [
          { channel: "EMAIL", safeFailureCode: "EMAIL_ADAPTER_FAILURE", intentCount: 2, attemptCount: 4 },
        ],
      }),
      ...firingIds({
        ...healthySnapshot(),
        integrations: [
          { integration: "auth0", safeFailureCode: "ERR_JWKS_TIMEOUT", failureCount: 5, correlationCount: 2 },
        ],
      }),
      ...firingIds({
        ...healthySnapshot(),
        abuse: {
          refusedRequestCount: 300,
          unverifiedSourceRefusalCount: 300,
          deniedAuthorizationCount: 50,
          sourcesAtLimitConsecutiveWindows: 3,
        },
      }),
    ]);
    expect(reachable).toEqual(observed);
  });
});

describe("readiness and worker thresholds", () => {
  it("raises nothing while the deployment is healthy", () => {
    expect(evaluateOperationalAlerts(healthySnapshot())).toEqual([]);
  });

  it("reports an unreachable database without also claiming the schema is wrong", () => {
    expect(firingIds({ ...healthySnapshot(), databaseReachable: false, appliedSchemaVersion: null }))
      .toEqual(["readiness.database-unreachable"]);
  });

  it("reports an incompatible schema once the database answers", () => {
    expect(firingIds({ ...healthySnapshot(), appliedSchemaVersion: "0033_persisted.sql" }))
      .toEqual(["readiness.schema-incompatible"]);
  });

  it("confirms an unreachable database over three probes and a schema mismatch on one", () => {
    expect(alertCondition("readiness.database-unreachable").confirmation)
      .toEqual({ kind: "CONSECUTIVE_OBSERVATIONS", observations: 3 });
    expect(alertCondition("readiness.schema-incompatible").confirmation)
      .toEqual({ kind: "SINGLE_OBSERVATION" });
  });

  it("holds the heartbeat threshold to the staleness window the probe already uses", () => {
    const stale = (age: number | null) =>
      firingIds({
        ...healthySnapshot(),
        worker: { ...healthySnapshot().worker, heartbeatAgeMilliseconds: age },
      }).includes("worker.heartbeat-stale");
    expect(stale(WORKER_HEARTBEAT_STALE_MILLISECONDS - 1)).toBe(false);
    expect(stale(WORKER_HEARTBEAT_STALE_MILLISECONDS)).toBe(true);
    expect(stale(null)).toBe(true);
  });

  it("measures backlog on depth or age, and on runnable work only", () => {
    const backlogged = (worker: Partial<OperationalSnapshot["worker"]>) =>
      firingIds({ ...healthySnapshot(), worker: { ...healthySnapshot().worker, ...worker } })
        .includes("worker.queue-backlog");
    expect(backlogged({ runnableJobCount: 100 })).toBe(false);
    expect(backlogged({ runnableJobCount: 101 })).toBe(true);
    expect(backlogged({ oldestRunnableJobAgeMilliseconds: 600_000 })).toBe(false);
    expect(backlogged({ oldestRunnableJobAgeMilliseconds: 600_001 })).toBe(true);
    // Nothing runnable at all is an idle queue, not a ten-minute-old one.
    expect(backlogged({ runnableJobCount: 0, oldestRunnableJobAgeMilliseconds: null })).toBe(false);
  });

  it("opens one exhausted-job incident per job type and safe failure code", () => {
    const firing = evaluateOperationalAlerts({
      ...healthySnapshot(),
      worker: {
        ...healthySnapshot().worker,
        exhaustedJobs: [
          { jobType: "deliver_notification_intents", safeFailureCode: "A", jobCount: 2, attemptCount: 4 },
          { jobType: "process_waitlist_entries", safeFailureCode: "A", jobCount: 1, attemptCount: 4 },
        ],
      },
    });
    expect(new Set(firing.map((condition) => condition.fingerprint)).size).toBe(2);
    expect(firing[0]!.evidence).toMatchObject({ exhaustedJobCount: 2, attemptCount: 4 });
  });
});

describe("Canonical Data Rebuild thresholds", () => {
  it("treats a verified rollback as owner attention and an indeterminate state as immediate", () => {
    expect(alertCondition("fixtures.rebuild-rolled-back").severity).toBe("OWNER_ATTENTION");
    expect(alertCondition("fixtures.rebuild-indeterminate").severity).toBe("IMMEDIATE");
  });

  it("escalates rather than duplicating when the same attempt becomes indeterminate", () => {
    const rolledBack = evaluateOperationalAlerts({
      ...healthySnapshot(),
      fixtures: { ...healthySnapshot().fixtures, lastRebuildOutcome: "ROLLED_BACK" },
    });
    const indeterminate = evaluateOperationalAlerts({
      ...healthySnapshot(),
      maintenanceState: "INDETERMINATE",
      fixtures: { ...healthySnapshot().fixtures, lastRebuildOutcome: "INDETERMINATE" },
    });
    expect(rolledBack[0]!.fingerprint).toBe(indeterminate[0]!.fingerprint);
  });

  it("asks for a rebuild after 26 hours and reconciliation after 150 minutes", () => {
    const overdue = (fixtures: Partial<OperationalSnapshot["fixtures"]>) =>
      firingIds({ ...healthySnapshot(), fixtures: { ...healthySnapshot().fixtures, ...fixtures } });
    expect(overdue({ millisecondsSinceSuccessfulRebuild: 26 * 60 * 60_000 - 1 }))
      .not.toContain("fixtures.rebuild-overdue");
    expect(overdue({ millisecondsSinceSuccessfulRebuild: 26 * 60 * 60_000 }))
      .toContain("fixtures.rebuild-overdue");
    expect(overdue({ millisecondsSinceReconciliation: 150 * 60_000 - 1 }))
      .not.toContain("fixtures.reconciliation-overdue");
    expect(overdue({ millisecondsSinceReconciliation: 150 * 60_000 }))
      .toContain("fixtures.reconciliation-overdue");
  });

  it("clears a rebuild incident only on the owner's verification, never on elapsed time", () => {
    expect(alertCondition("fixtures.rebuild-indeterminate").clearing)
      .toEqual({ kind: "OWNER_VERIFICATION" });
  });
});

describe("notification, integration, and abuse thresholds", () => {
  it("groups exhausted Notification Intents by channel and safe failure fingerprint", () => {
    const firing = evaluateOperationalAlerts({
      ...healthySnapshot(),
      notifications: [
        { channel: "EMAIL", safeFailureCode: "EMAIL_ADAPTER_FAILURE", intentCount: 3, attemptCount: 4 },
        { channel: "EMAIL", safeFailureCode: "EMAIL_ADDRESS_REJECTED", intentCount: 1, attemptCount: 4 },
      ],
    });
    expect(firing.map((condition) => condition.fingerprint)).toEqual([
      "notification-reconciliation:EMAIL:EMAIL_ADAPTER_FAILURE",
      "notification-reconciliation:EMAIL:EMAIL_ADDRESS_REJECTED",
    ]);
  });

  it("requires an integration to fail five times across two correlations", () => {
    const integration = (failureCount: number, correlationCount: number) =>
      firingIds({
        ...healthySnapshot(),
        integrations: [{ integration: "auth0", safeFailureCode: "ERR_JWKS_TIMEOUT", failureCount, correlationCount }],
      });
    expect(integration(4, 4)).toEqual([]);
    expect(integration(5, 1)).toEqual([]);
    expect(integration(5, 2)).toEqual(["integrations.repeated-failures"]);
  });

  it("holds each abuse threshold to the count the guide names", () => {
    const abuse = (overrides: Partial<OperationalSnapshot["abuse"]>) =>
      firingIds({ ...healthySnapshot(), abuse: { ...healthySnapshot().abuse, ...overrides } });
    expect(abuse({ sourcesAtLimitConsecutiveWindows: 2 })).toEqual([]);
    expect(abuse({ sourcesAtLimitConsecutiveWindows: 3 })).toEqual(["abuse.source-at-limit"]);
    expect(abuse({ refusedRequestCount: 299 })).toEqual([]);
    expect(abuse({ refusedRequestCount: 300 })).toEqual(["abuse.aggregate-refusals"]);
    expect(abuse({ deniedAuthorizationCount: 49 })).toEqual([]);
    expect(abuse({ deniedAuthorizationCount: 50 })).toEqual(["abuse.denied-authorization"]);
  });

  it("separates a trusted-proxy misconfiguration from a caller to contain", () => {
    const firing = evaluateOperationalAlerts({
      ...healthySnapshot(),
      abuse: { ...healthySnapshot().abuse, unverifiedSourceRefusalCount: 300 },
    });
    expect(firing.map((condition) => condition.conditionId))
      .toEqual(["abuse.unverified-source-refusals"]);
    expect(alertCondition("abuse.unverified-source-refusals").containment)
      .toMatch(/trusted-proxy/);
  });

  it("records no source address, User, or authored content in any evidence it produces", () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 2000 }), fc.integer({ min: 0, max: 50 }), (refusals, denials) => {
      const firing = evaluateOperationalAlerts({
        ...healthySnapshot(),
        abuse: {
          refusedRequestCount: refusals,
          unverifiedSourceRefusalCount: refusals,
          deniedAuthorizationCount: denials,
          sourcesAtLimitConsecutiveWindows: 5,
        },
      });
      const safe = new Set<string>(TELEMETRY_SAFE_CONTEXT_KEYS);
      return firing.every((condition) => Object.keys(condition.evidence).every((key) => safe.has(key)));
    }));
  });
});

describe("deployment-cost projection", () => {
  it("projects with the greater of the last day and the trailing seven-day average", () => {
    expect(projectedCycleCostUsd({
      actualUsd: 4,
      last24HourUsd: 1,
      trailingSevenDayUsd: 3.5,
      daysRemainingInCycle: 10,
    })).toBe(14);
    expect(projectedCycleCostUsd({
      actualUsd: 4,
      last24HourUsd: 0.2,
      trailingSevenDayUsd: 1.4,
      daysRemainingInCycle: 10,
    })).toBeCloseTo(6);
  });

  it("stays below every threshold for a quiet cycle", () => {
    expect(costCeilingCondition({
      actualUsd: 2,
      last24HourUsd: 0.1,
      trailingSevenDayUsd: 0.7,
      daysRemainingInCycle: 20,
    })).toBeNull();
  });

  it("asks for owner attention at $8 actual or $12 projected", () => {
    expect(costCeilingCondition({
      actualUsd: 8,
      last24HourUsd: 0,
      trailingSevenDayUsd: 0,
      daysRemainingInCycle: 0,
    })).toBe("cost.warning-threshold");
    expect(costCeilingCondition({
      actualUsd: 4,
      last24HourUsd: 0.5,
      trailingSevenDayUsd: 3.5,
      daysRemainingInCycle: 16,
    })).toBe("cost.warning-threshold");
  });

  it("alerts immediately at $12 actual or a $15 projection within three days", () => {
    expect(costCeilingCondition({
      actualUsd: 12,
      last24HourUsd: 0,
      trailingSevenDayUsd: 0,
      daysRemainingInCycle: 0,
    })).toBe("cost.hard-limit-imminent");
    expect(costCeilingCondition({
      actualUsd: 9,
      last24HourUsd: 2,
      trailingSevenDayUsd: 7,
      daysRemainingInCycle: 20,
    })).toBe("cost.hard-limit-imminent");
  });

  it("never projects below what has already been spent", () => {
    fc.assert(fc.property(
      fc.double({ min: 0, max: 15, noNaN: true }),
      fc.double({ min: 0, max: 5, noNaN: true }),
      fc.double({ min: 0, max: 35, noNaN: true }),
      fc.integer({ min: 0, max: 31 }),
      (actualUsd, last24HourUsd, trailingSevenDayUsd, daysRemainingInCycle) =>
        projectedCycleCostUsd({ actualUsd, last24HourUsd, trailingSevenDayUsd, daysRemainingInCycle })
          >= actualUsd,
    ));
  });

  it("never leaves a reading at or past the hard limit unalerted", () => {
    fc.assert(fc.property(
      fc.double({ min: 0, max: 20, noNaN: true }),
      fc.double({ min: 0, max: 5, noNaN: true }),
      fc.double({ min: 0, max: 35, noNaN: true }),
      fc.integer({ min: 0, max: 31 }),
      (actualUsd, last24HourUsd, trailingSevenDayUsd, daysRemainingInCycle) => {
        const usage = { actualUsd, last24HourUsd, trailingSevenDayUsd, daysRemainingInCycle };
        return projectedCycleCostUsd(usage) < COST_HARD_LIMIT_USD
          || costCeilingCondition(usage) !== null;
      },
    ));
  });
});
