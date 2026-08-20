import { afterEach, describe, expect, it, vi } from "vitest";

import { Auth0IdentityAdministration } from "../src/auth/auth0-identity-administration.js";

describe("Auth0 identity administration", () => {
  afterEach(() => vi.restoreAllMocks());

  it("gets a management token and deletes the exact encoded Auth0 subject", async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "management-token", expires_in: 3600 }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const administration = new Auth0IdentityAdministration({ issuer: "https://tenant.example/", clientId: "client-id", clientSecret: "client-secret", fetch: request });

    await administration.deleteIdentity({ issuer: "https://tenant.example/", subject: "auth0|person/48" });

    expect(request).toHaveBeenNthCalledWith(1, "https://tenant.example/oauth/token", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(String(request.mock.calls[0]![1]!.body))).toEqual({ grant_type: "client_credentials", client_id: "client-id", client_secret: "client-secret", audience: "https://tenant.example/api/v2/" });
    expect(request).toHaveBeenNthCalledWith(2, "https://tenant.example/api/v2/users/auth0%7Cperson%2F48", { method: "DELETE", headers: { authorization: "Bearer management-token" } });
  });

  it("treats an already-missing identity as deleted and rejects an issuer mismatch", async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "management-token", expires_in: 3600 }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    const administration = new Auth0IdentityAdministration({ issuer: "https://tenant.example", clientId: "client-id", clientSecret: "client-secret", fetch: request });
    await expect(administration.deleteIdentity({ issuer: "https://tenant.example/", subject: "auth0|gone" })).resolves.toBeUndefined();
    await expect(administration.deleteIdentity({ issuer: "https://other.example/", subject: "auth0|person" })).rejects.toThrow("issuer");
  });
});
