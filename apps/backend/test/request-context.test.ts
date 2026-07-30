import { describe, expect, it } from "vitest";

import { correlationIdForRequest } from "../src/api/request-context.js";

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
