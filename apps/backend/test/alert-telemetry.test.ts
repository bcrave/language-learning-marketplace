import { TELEMETRY_SAFE_CONTEXT_KEYS } from "@marketplace/core";
import type { Logger } from "pino";
import { describe, expect, it, vi } from "vitest";

import { logOperationalEvent } from "../src/observability/correlated-logger.js";
import { alertTelemetryEvent, createTelemetryReporter } from "../src/observability/telemetry.js";
import type { AlertDispatch } from "../src/observability/operational-incidents.js";

function dispatch(overrides: Partial<AlertDispatch> = {}): AlertDispatch {
  return {
    kind: "CONFIRMED",
    conditionId: "worker.heartbeat-stale",
    family: "worker-heartbeat-backlog-exhaustion",
    fingerprint: "worker-heartbeat-backlog-exhaustion:worker.heartbeat-stale",
    severity: "OWNER_ATTENTION",
    route: "SENTRY_EMAIL",
    incidentCorrelationId: "incident-7c9f",
    evidence: { workerName: "marketplace-worker", heartbeatAgeSeconds: 240, release: "abc1234" },
    ...overrides,
  };
}

// ADR 0022 routes private alerts through Sentry email. This is the event that
// carries one, and what it is allowed to say.
describe("alert telemetry events", () => {
  it("names the family, condition, and incident so the owner can reach the runbook", () => {
    const event = alertTelemetryEvent(dispatch());
    expect(event.message).toBe(
      "worker-heartbeat-backlog-exhaustion: worker.heartbeat-stale confirmed",
    );
    expect(event.tags).toMatchObject({
      incidentFamily: "worker-heartbeat-backlog-exhaustion",
      alertCondition: "worker.heartbeat-stale",
      severity: "OWNER_ATTENTION",
      route: "SENTRY_EMAIL",
      incidentCorrelationId: "incident-7c9f",
    });
    expect(event.extra).toEqual({
      workerName: "marketplace-worker",
      heartbeatAgeSeconds: 240,
      release: "abc1234",
    });
  });

  it("groups every message about one incident under its fingerprint", () => {
    expect(alertTelemetryEvent(dispatch()).fingerprint)
      .toEqual(["worker-heartbeat-backlog-exhaustion:worker.heartbeat-stale", "CONFIRMED"]);
  });

  it("raises an immediate incident above owner attention, and a recovery below both", () => {
    expect(alertTelemetryEvent(dispatch({ severity: "IMMEDIATE" })).level).toBe("fatal");
    expect(alertTelemetryEvent(dispatch()).level).toBe("warning");
    expect(alertTelemetryEvent(dispatch({ kind: "RECOVERED" })).level).toBe("info");
  });

  it("carries no evidence outside the telemetry-safe allowlist, however an incident was built", () => {
    const event = alertTelemetryEvent(dispatch({
      evidence: {
        release: "abc1234",
        // Nothing constructs these, and if something ever did they must not travel.
        displayName: "Ana Ruiz",
        observations: "private Learning Feedback",
      } as AlertDispatch["evidence"],
    }));
    const safe = new Set<string>(TELEMETRY_SAFE_CONTEXT_KEYS);
    expect(Object.keys(event.extra ?? {}).every((key) => safe.has(key))).toBe(true);
    expect(JSON.stringify(event)).not.toContain("Ana Ruiz");
  });
});

describe("the reporter without a configured destination", () => {
  it("still writes the alert to the correlated log, so a threshold is never silently disabled", () => {
    const warn = vi.fn();
    const reporter = createTelemetryReporter({
      logger: { warn, error: vi.fn(), info: vi.fn() } as unknown as Logger,
      release: "abc1234",
      environment: "test",
    });
    reporter.reportAlert(dispatch());
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({
      event: "alert.confirmed",
      incidentFamily: "worker-heartbeat-backlog-exhaustion",
      incidentCorrelationId: "incident-7c9f",
      heartbeatAgeSeconds: 240,
    }));
  });

  it("logs an immediate incident at error rather than warning", () => {
    const error = vi.fn();
    const reporter = createTelemetryReporter({
      logger: { warn: vi.fn(), error, info: vi.fn() } as unknown as Logger,
      release: "abc1234",
      environment: "test",
    });
    reporter.reportAlert(dispatch({ severity: "IMMEDIATE" }));
    expect(error).toHaveBeenCalledOnce();
  });
});

describe("correlated operational logging", () => {
  it("keeps the correlated evidence and drops everything the allowlist does not know", () => {
    const warn = vi.fn();
    logOperationalEvent({ info: vi.fn(), warn, error: vi.fn() }, "warn", {
      event: "readiness.failed",
      correlationId: "req-7",
      graphqlVariables: { classSessionId: "9f0d4d1e" },
      authorization: "Bearer secret-access-token",
    });
    expect(warn).toHaveBeenCalledWith({ event: "readiness.failed", correlationId: "req-7" });
  });

  it("still names the event when every other field is filtered away", () => {
    const info = vi.fn();
    logOperationalEvent({ info, warn: vi.fn(), error: vi.fn() }, "info", {
      event: "api.started",
      contactEmail: "reviewer@example.test",
    });
    expect(info).toHaveBeenCalledWith({ event: "api.started" });
  });
});
