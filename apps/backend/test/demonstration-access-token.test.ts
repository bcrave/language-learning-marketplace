import { describe, expect, it } from "vitest";

import {
  bearerHeaders,
  requestDemonstrationAccessToken,
} from "../src/operations/demonstration-access-token.js";

const credential = { username: "student@demonstration.test", password: "shared-secret" };

function respondWith(status: number, body: unknown) {
  const calls: { url: string; body: unknown }[] = [];
  const call = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  }) as unknown as typeof fetch;
  return { call, calls };
}

describe("shared demonstration access tokens", () => {
  const options = {
    issuer: "https://demonstration.us.auth0.com",
    audience: "https://api.demonstration.test",
    clientId: "release-job-client",
    clientSecret: "release-job-secret",
    credential,
  };

  it("exchanges a shared credential for an access token at the tenant", async () => {
    const { call, calls } = respondWith(200, { access_token: "an-access-token" });

    const token = await requestDemonstrationAccessToken({ ...options, fetch: call });

    expect(token).toBe("an-access-token");
    expect(calls[0]!.url).toBe("https://demonstration.us.auth0.com/oauth/token");
    expect(calls[0]!.body).toMatchObject({
      grant_type: "password",
      audience: options.audience,
    });
  });

  it("reports only the provider status when authentication is refused", async () => {
    const { call } = respondWith(403, { error: "invalid_grant", error_description: credential.password });

    // ADR 0039 keeps raw provider evidence in the provider console. A release
    // log that echoed the response body would carry the shared credential out.
    await expect(
      requestDemonstrationAccessToken({ ...options, fetch: call }),
    ).rejects.toThrow(/status 403$/);
  });

  it("refuses a response carrying no access token", async () => {
    const { call } = respondWith(200, { token_type: "Bearer" });

    await expect(
      requestDemonstrationAccessToken({ ...options, fetch: call }),
    ).rejects.toThrow(/no access token/);
  });

  it("presents the token as a bearer credential", () => {
    expect(bearerHeaders("an-access-token")).toEqual({
      authorization: "Bearer an-access-token",
    });
  });
});
