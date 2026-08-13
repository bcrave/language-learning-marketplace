import { describe, expect, it } from "vitest";

import { parseAppConfig } from "../src/config.js";

describe("authentication configuration", () => {
  it("refuses fake authentication in production", () => {
    expect(() =>
      parseAppConfig({
        NODE_ENV: "production",
        AUTH_MODE: "fake",
        DATABASE_URL: "postgres://example.invalid/marketplace",
      }),
    ).toThrowError("Fake authentication is unavailable in production");
  });
});

describe("resource consumption configuration", () => {
  it("keeps the documented per-source request limit by default", () => {
    expect(
      parseAppConfig({
        DATABASE_URL: "postgres://example.invalid/marketplace",
      }).API_SOURCE_REQUEST_LIMIT,
    ).toBe(120);
  });

  it("accepts a raised per-source request limit outside production", () => {
    expect(
      parseAppConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgres://example.invalid/marketplace",
        API_SOURCE_REQUEST_LIMIT: "5000",
      }).API_SOURCE_REQUEST_LIMIT,
    ).toBe(5000);
  });

  it("refuses a raised per-source request limit in production", () => {
    expect(() =>
      parseAppConfig({
        NODE_ENV: "production",
        AUTH_MODE: "auth0",
        AUTH0_ISSUER: "https://example.invalid/",
        AUTH0_AUDIENCE: "marketplace",
        DATABASE_URL: "postgres://example.invalid/marketplace",
        API_SOURCE_REQUEST_LIMIT: "5000",
      }),
    ).toThrowError(
      "The per-source request limit cannot be raised above 120 in production",
    );
  });
});
