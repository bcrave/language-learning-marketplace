import { describe, expect, it } from "vitest";

import {
  AUTHENTICATED_LANDING_PATH,
  productionAuth0Options,
} from "../src/production-auth.js";

const config = {
  authMode: "auth0",
  auth0Audience: "https://api.demonstration.test",
  auth0ClientId: "public-client-id",
  auth0Domain: "demonstration.us.auth0.com",
  graphqlUrl: "/graphql",
} as const;

function options(overrides: { workerUrl?: string; onAuthenticated?: (path: string) => void } = {}) {
  return productionAuth0Options({
    config,
    origin: "https://demonstration.test",
    workerUrl: overrides.workerUrl ?? "/assets/auth0-spa-js.worker.production-Bo18V0lE.js",
    onAuthenticated: overrides.onAuthenticated ?? (() => undefined),
  });
}

// ADR 0027 is a browser policy, and every part of it is a provider option that
// a refactor could drop without anything failing until a reviewer's token
// outlived their tab. These assertions are what makes dropping one visible.
describe("production browser authentication", () => {
  it("authenticates by redirect against the configured tenant and audience", () => {
    const provider = options();

    expect(provider.domain).toBe(config.auth0Domain);
    expect(provider.clientId).toBe(config.auth0ClientId);
    expect(provider.authorizationParams).toMatchObject({
      audience: config.auth0Audience,
      // One public origin, one callback (ADR 0028).
      redirect_uri: `https://demonstration.test${AUTHENTICATED_LANDING_PATH}`,
    });
  });

  it("holds tokens only in memory", () => {
    expect(options().cacheLocation).toBe("memory");
  });

  it("rotates refresh tokens without the hidden-iframe fallback", () => {
    const provider = options();

    expect(provider.useRefreshTokens).toBe(true);
    expect(provider.useRefreshTokensFallback).toBe(false);
  });

  it("serves the token worker from the application origin", () => {
    expect(options().workerUrl).toBe(
      "/assets/auth0-spa-js.worker.production-Bo18V0lE.js",
    );
    expect(() => options({ workerUrl: "blob:https://demonstration.test/abc" })).toThrow(
      /application origin/,
    );
  });

  it("clears the authorization code and state from the address bar", () => {
    const visited: string[] = [];

    options({ onAuthenticated: (path) => visited.push(path) }).onRedirectCallback?.(
      undefined,
    );
    options({ onAuthenticated: (path) => visited.push(path) }).onRedirectCallback?.({
      returnTo: "/student/discovery",
    });

    expect(visited).toEqual([AUTHENTICATED_LANDING_PATH, "/student/discovery"]);
  });
});
