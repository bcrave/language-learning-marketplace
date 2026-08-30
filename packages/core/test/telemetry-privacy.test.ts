import {
  sanitizeTelemetryContext,
  sanitizeTelemetryEvent,
  sanitizeTelemetryText,
  sanitizeTelemetryUrl,
  TELEMETRY_REDACTION,
  TELEMETRY_SAFE_CONTEXT_KEYS,
  type TelemetryEvent,
} from "@marketplace/core";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

/**
 * The sanitizer matches the *shape* of a credential, so proving it works means
 * handing it something shaped like one. These fixtures are assembled from parts
 * rather than written as literals: a scanner reading this repository —
 * GitGuardian reads every pull request — cannot tell a fixture from the real
 * thing and should not have to, and the tree carrying no literal secret shape is
 * the standard `apps/backend/test/public-artifact-evidence.test.ts` already
 * holds its own fixtures to.
 */
const BEARER_CREDENTIAL = [
  "Bearer",
  ["eyJhbGciOi", "eyJzdWIiOi", "signature"].join("."),
].join(" ");

const CREDENTIALLED_DATABASE_URL = [
  "postgres://marketplace",
  "hunter2@db.internal:5432/app",
].join(":");

const INLINE_SECRET_ASSIGNMENT = ["API_TRUSTED_PROXY_SECRET", "8d5f0c2b1a"].join("=");

// ADR 0022 sends unexpected browser and server failures to a hosted third
// party. These are the rules that decide what is allowed to travel with them.
describe("telemetry URL filtering", () => {
  it("keeps the journey and drops the query string and fragment", () => {
    expect(sanitizeTelemetryUrl("https://demo.example.test/student/discovery?language=es&cursor=abc"))
      .toBe("https://demo.example.test/student/discovery");
    expect(sanitizeTelemetryUrl("https://demo.example.test/graphql#token=secret"))
      .toBe("https://demo.example.test/graphql");
  });

  it("never keeps anything after the first query or fragment marker", () => {
    fc.assert(fc.property(fc.webUrl(), fc.string(), (url, tail) =>
      !sanitizeTelemetryUrl(`${url}?${tail}`).includes("?")));
  });
});

describe("telemetry prose filtering", () => {
  it("removes credentials an adapter interpolated into a failure message", () => {
    expect(sanitizeTelemetryText(`Auth0 refused ${BEARER_CREDENTIAL}`))
      .toBe(`Auth0 refused ${TELEMETRY_REDACTION}`);
    expect(sanitizeTelemetryText(`connect ${CREDENTIALLED_DATABASE_URL} failed`))
      .toBe(`connect ${TELEMETRY_REDACTION} failed`);
    expect(sanitizeTelemetryText(`${INLINE_SECRET_ASSIGNMENT} install`))
      .toContain(TELEMETRY_REDACTION);
  });

  it("removes a contact detail, which is never operational evidence", () => {
    expect(sanitizeTelemetryText("delivery to reviewer@example.test was refused"))
      .toBe(`delivery to ${TELEMETRY_REDACTION} was refused`);
  });

  it("keeps a safe failure code readable", () => {
    expect(sanitizeTelemetryText("NOTIFICATION_DELIVERY_EXHAUSTED"))
      .toBe("NOTIFICATION_DELIVERY_EXHAUSTED");
  });

  it("bounds prose so one event cannot carry a payload", () => {
    fc.assert(fc.property(fc.string({ minLength: 0, maxLength: 4000 }), (text) =>
      sanitizeTelemetryText(text).length <= 500));
  });
});

describe("telemetry context filtering", () => {
  it("keeps the operational evidence the operator guide asks an incident to retain", () => {
    expect(sanitizeTelemetryContext({
      incidentFamily: "worker-heartbeat",
      heartbeatAgeSeconds: 240,
      release: "abc1234",
      correlationId: "operational-watch-2026-08-29T12:00",
    })).toEqual({
      incidentFamily: "worker-heartbeat",
      heartbeatAgeSeconds: 240,
      release: "abc1234",
      correlationId: "operational-watch-2026-08-29T12:00",
    });
  });

  it("discards a name nobody added to the allowlist deliberately", () => {
    expect(sanitizeTelemetryContext({
      graphqlVariables: { studentUserId: "9f0d4d1e" },
      observations: "The student struggled with the past subjunctive.",
      authorization: "Bearer token",
    })).toBeUndefined();
  });

  it("discards a nested value even under an allowlisted name, because it cannot be inspected", () => {
    expect(sanitizeTelemetryContext({ operation: { name: "booking.created" } })).toBeUndefined();
  });

  it("keeps only allowlisted names, whatever is offered", () => {
    fc.assert(fc.property(
      fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.object())),
      (context) => Object.keys(sanitizeTelemetryContext(context) ?? {})
        .every((key) => (TELEMETRY_SAFE_CONTEXT_KEYS as readonly string[]).includes(key)),
    ));
  });
});

describe("telemetry event filtering", () => {
  const event: TelemetryEvent = {
    message: "GraphQL operation failed",
    server_name: "api-7c9f",
    request: {
      method: "POST",
      url: "https://demo.example.test/graphql?operationName=BookClassSession",
      headers: { authorization: "Bearer secret-access-token", cookie: "session=abc" },
      cookies: { session: "abc" },
      query_string: "operationName=BookClassSession",
      data: { variables: { classSessionId: "9f0d4d1e", idempotencyKey: "k" } },
    },
    user: {
      id: "9f0d4d1e-0f1a-4a5f-9a2e-6d6f6f0f5a11",
      email: "reviewer@example.test",
      username: "student-reviewer",
      ip_address: "203.0.113.7",
    },
    exception: { values: [{ type: "Error", value: "insert failed for reviewer@example.test" }] },
    breadcrumbs: [{
      category: "fetch",
      level: "error",
      message: "POST /graphql?operationName=BookClassSession",
      data: { operationName: "BookClassSession", variables: { classSessionId: "9f0d4d1e" } },
    }],
    extra: { correlationId: "req-7", observations: "private Learning Feedback" },
    tags: { release: "abc1234", displayName: "Ana Ruiz" },
    contexts: { marketplace: { safeFailureCode: "BOOKING_WINDOW_CLOSED", reason: "late" } },
  };

  it("keeps the release, the journey, and the correlation that make an event actionable", () => {
    const sanitized = sanitizeTelemetryEvent(event);
    expect(sanitized.request).toEqual({
      method: "POST",
      url: "https://demo.example.test/graphql",
    });
    expect(sanitized.extra).toEqual({ correlationId: "req-7" });
    expect(sanitized.tags).toEqual({ release: "abc1234" });
    expect(sanitized.contexts).toEqual({
      marketplace: { safeFailureCode: "BOOKING_WINDOW_CLOSED" },
    });
    expect(sanitized.user).toEqual({ id: "9f0d4d1e-0f1a-4a5f-9a2e-6d6f6f0f5a11" });
  });

  it("records no secret, contact detail, source address, or reviewer-entered content", () => {
    const serialized = JSON.stringify(sanitizeTelemetryEvent(event));
    for (const disclosure of [
      "secret-access-token",
      "session=abc",
      "reviewer@example.test",
      "student-reviewer",
      "203.0.113.7",
      "private Learning Feedback",
      "Ana Ruiz",
      "api-7c9f",
      "idempotencyKey",
    ]) {
      expect(serialized).not.toContain(disclosure);
    }
  });

  it("keeps no complete set of GraphQL variables, wherever the SDK attached them", () => {
    const serialized = JSON.stringify(sanitizeTelemetryEvent(event));
    expect(serialized).not.toContain("variables");
    expect(serialized).not.toContain("classSessionId");
  });

  it("leaves an event that carries nothing sensitive unchanged in substance", () => {
    expect(sanitizeTelemetryEvent({
      message: "readiness probe failed",
      extra: { incidentFamily: "api-database-readiness", observationCount: 3 },
    })).toEqual({
      message: "readiness probe failed",
      extra: { incidentFamily: "api-database-readiness", observationCount: 3 },
    });
  });

  it("never lets an arbitrary value reach the wire under an unexpected name", () => {
    const marker = "8f2c1d-private-content-marker";
    fc.assert(fc.property(
      fc.dictionary(fc.string({ minLength: 1 }), fc.constant(marker)),
      (attached) => !JSON.stringify(sanitizeTelemetryEvent({
        extra: attached,
        tags: attached,
        contexts: { custom: attached },
        request: { url: `https://demo.example.test/x?v=${marker}` },
        user: { id: "opaque", email: marker, username: marker, ip_address: marker },
      })).includes(marker),
    ));
  });
});
