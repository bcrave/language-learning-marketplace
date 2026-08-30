import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createOperationalCounters } from "../src/observability/operational-counters.js";

const MINUTE = 60_000;
const start = Date.UTC(2026, 7, 29, 12, 0, 0);

// The operator guide measures abuse in aggregates and explicitly excludes source
// addresses from incident evidence. These counters are where both hold.
describe("operational counters", () => {
  it("counts refusals across a five-minute window and forgets older ones", () => {
    const counters = createOperationalCounters();
    for (let minute = 0; minute < 8; minute += 1) {
      counters.recordRefusedRequest("203.0.113.7", start + minute * MINUTE);
    }
    expect(counters.read(start + 7 * MINUTE).abuse.refusedRequestCount).toBe(5);
  });

  it("counts a source's consecutive one-minute windows at the limit", () => {
    const counters = createOperationalCounters();
    counters.recordRefusedRequest("a", start);
    counters.recordRefusedRequest("a", start + 30_000);
    expect(counters.read(start + 30_000).abuse.sourcesAtLimitConsecutiveWindows).toBe(1);
    counters.recordRefusedRequest("a", start + MINUTE);
    counters.recordRefusedRequest("a", start + 2 * MINUTE);
    expect(counters.read(start + 2 * MINUTE).abuse.sourcesAtLimitConsecutiveWindows).toBe(3);
  });

  it("ends a run when a source skips a window rather than carrying it forward", () => {
    const counters = createOperationalCounters();
    counters.recordRefusedRequest("a", start);
    counters.recordRefusedRequest("a", start + MINUTE);
    counters.recordRefusedRequest("a", start + 3 * MINUTE);
    expect(counters.read(start + 3 * MINUTE).abuse.sourcesAtLimitConsecutiveWindows).toBe(1);
  });

  it("keeps unverified-source refusals apart from the abuse aggregate", () => {
    const counters = createOperationalCounters();
    counters.recordUnverifiedSourceRefusal(start);
    counters.recordRefusedRequest("a", start);
    const read = counters.read(start).abuse;
    expect(read).toMatchObject({ unverifiedSourceRefusalCount: 1, refusedRequestCount: 1 });
  });

  it("counts an integration's failures and the correlations they span", () => {
    const counters = createOperationalCounters();
    for (const correlationId of ["r1", "r1", "r2", "r3", "r3"]) {
      counters.recordIntegrationFailure(
        { integration: "auth0", safeFailureCode: "ERR_JWKS_TIMEOUT", correlationId },
        start,
      );
    }
    expect(counters.read(start).integrations).toEqual([
      { integration: "auth0", safeFailureCode: "ERR_JWKS_TIMEOUT", failureCount: 5, correlationCount: 3 },
    ]);
  });

  it("drops an integration once its window empties, so a recovered boundary clears", () => {
    const counters = createOperationalCounters();
    counters.recordIntegrationFailure(
      { integration: "auth0", safeFailureCode: "ERR_JWKS_TIMEOUT", correlationId: "r1" },
      start,
    );
    expect(counters.read(start).integrations).toHaveLength(1);
    expect(counters.read(start + 10 * MINUTE).integrations).toEqual([]);
  });

  it("retains no source address in anything it reports", () => {
    fc.assert(fc.property(fc.array(fc.ipV4(), { minLength: 1, maxLength: 40 }), (sources) => {
      const counters = createOperationalCounters();
      for (const source of sources) counters.recordRefusedRequest(source, start);
      const reported = JSON.stringify(counters.read(start));
      return sources.every((source) => !reported.includes(source));
    }));
  });
});
