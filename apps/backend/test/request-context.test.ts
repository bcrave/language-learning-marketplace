import { describe, expect, it } from "vitest";

import {
  correlationIdForRequest,
  currentCorrelationId,
  withCorrelationId,
} from "../src/api/request-context.js";

describe("GraphQL correlation identifiers", () => {
  it("accepts a bounded opaque client identifier", () => {
    expect(
      correlationIdForRequest(new Headers({ "x-correlation-id": "browser_123-abc" })),
    ).toBe("browser_123-abc");
  });

  it("replaces malformed client identifiers", () => {
    expect(
      correlationIdForRequest(
        new Headers({ "x-correlation-id": "private value copied from a form" }),
      ),
    ).toMatch(/^[0-9a-f-]{36}$/);
  });
});

// ADR 0022 follows one identifier through an operation. A boundary the API
// shares across requests is called with no request of its own, so what it
// observes is attributed through the ambient correlation rather than a fresh
// identifier — which is what lets the operator guide's integration threshold
// tell one retried operation from a boundary that is down.
describe("the ambient correlation of the operation in flight", () => {
  it("has none outside an operation", () => {
    expect(currentCorrelationId()).toBeNull();
  });

  it("reads the same identifier everywhere inside one operation", async () => {
    const observed = await withCorrelationId("operation-1", async () => {
      const before = currentCorrelationId();
      await Promise.resolve();
      return [before, currentCorrelationId()];
    });
    expect(observed).toEqual(["operation-1", "operation-1"]);
  });

  it("keeps concurrent operations apart", async () => {
    const seen = await Promise.all([
      withCorrelationId("operation-1", async () => {
        await Promise.resolve();
        return currentCorrelationId();
      }),
      withCorrelationId("operation-2", async () => currentCorrelationId()),
    ]);
    expect(seen).toEqual(["operation-1", "operation-2"]);
  });

  it("does not leak out of the operation that established it", async () => {
    await withCorrelationId("operation-1", async () => Promise.resolve());
    expect(currentCorrelationId()).toBeNull();
  });
});
