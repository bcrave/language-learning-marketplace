import { describe, expect, it } from "vitest";

import {
  parseAppConfig,
  PRODUCTION_SOURCE_REQUEST_LIMIT,
} from "../src/config.js";

const TRUSTED_PROXY_SECRET = "caddy-shared-secret-for-verified-source-context";
const PUBLIC_ORIGIN = "https://marketplace.example.test";

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

  it("requires both Auth0 management credentials when either is configured", () => {
    expect(() => parseAppConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgres://example.invalid/marketplace",
      AUTH0_MANAGEMENT_CLIENT_ID: "management-client",
    })).toThrowError("Auth0 identity administration requires both");
  });
});

describe("verified source configuration", () => {
  it("requires a trusted proxy secret in production", () => {
    expect(() =>
      parseAppConfig({
        NODE_ENV: "production",
        AUTH_MODE: "auth0",
        AUTH0_ISSUER: "https://example.invalid/",
        AUTH0_AUDIENCE: "marketplace",
        DATABASE_URL: "postgres://example.invalid/marketplace",
      }),
    ).toThrowError(
      "Verified source context requires API_TRUSTED_PROXY_SECRET in production",
    );
  });

  it("leaves the trusted proxy secret optional outside production", () => {
    expect(
      parseAppConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgres://example.invalid/marketplace",
      }).API_TRUSTED_PROXY_SECRET,
    ).toBeUndefined();
  });

  it("refuses a guessable trusted proxy secret", () => {
    expect(() =>
      parseAppConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgres://example.invalid/marketplace",
        API_TRUSTED_PROXY_SECRET: "short",
      }),
    ).toThrowError();
  });
});

describe("single public origin configuration", () => {
  it("requires the public origin in production", () => {
    // The origin a state-changing request must name cannot be inferred from a
    // request the deployment does not control, so production has to be told.
    expect(() =>
      parseAppConfig({
        NODE_ENV: "production",
        AUTH_MODE: "auth0",
        AUTH0_ISSUER: "https://example.invalid/",
        AUTH0_AUDIENCE: "marketplace",
        DATABASE_URL: "postgres://example.invalid/marketplace",
        API_TRUSTED_PROXY_SECRET: TRUSTED_PROXY_SECRET,
      }),
    ).toThrowError("The single public origin requires PUBLIC_ORIGIN in production");
  });

  it("leaves the public origin optional outside production", () => {
    expect(
      parseAppConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgres://example.invalid/marketplace",
      }).PUBLIC_ORIGIN,
    ).toBeUndefined();
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
    const raised = PRODUCTION_SOURCE_REQUEST_LIMIT * 10;
    expect(
      parseAppConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgres://example.invalid/marketplace",
        API_SOURCE_REQUEST_LIMIT: String(raised),
      }).API_SOURCE_REQUEST_LIMIT,
    ).toBe(raised);
  });

  it("refuses a raised per-source request limit in production", () => {
    expect(() =>
      parseAppConfig({
        NODE_ENV: "production",
        AUTH_MODE: "auth0",
        AUTH0_ISSUER: "https://example.invalid/",
        AUTH0_AUDIENCE: "marketplace",
        DATABASE_URL: "postgres://example.invalid/marketplace",
        API_TRUSTED_PROXY_SECRET: TRUSTED_PROXY_SECRET,
        PUBLIC_ORIGIN,
        API_SOURCE_REQUEST_LIMIT: String(PRODUCTION_SOURCE_REQUEST_LIMIT + 1),
      }),
    ).toThrowError(
      `The per-source request limit cannot be raised above ${PRODUCTION_SOURCE_REQUEST_LIMIT} in production`,
    );
  });

  it("keeps the documented limit available to production", () => {
    expect(
      parseAppConfig({
        NODE_ENV: "production",
        AUTH_MODE: "auth0",
        AUTH0_ISSUER: "https://example.invalid/",
        AUTH0_AUDIENCE: "marketplace",
        DATABASE_URL: "postgres://example.invalid/marketplace",
        API_TRUSTED_PROXY_SECRET: TRUSTED_PROXY_SECRET,
        PUBLIC_ORIGIN,
        API_SOURCE_REQUEST_LIMIT: String(PRODUCTION_SOURCE_REQUEST_LIMIT),
      }).API_SOURCE_REQUEST_LIMIT,
    ).toBe(PRODUCTION_SOURCE_REQUEST_LIMIT);
  });
});
