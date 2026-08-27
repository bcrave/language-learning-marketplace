import { z } from "zod";

import type { UserIdentity } from "@marketplace/core";

import type { IdentityAdministration } from "./identity-administration.js";
import { normalizedIssuer } from "./issuer.js";

const tokenResponseSchema = z.object({ access_token: z.string().min(1), expires_in: z.number().positive() });

export class Auth0IdentityAdministration implements IdentityAdministration {
  readonly #issuer: string;
  readonly #clientId: string;
  readonly #clientSecret: string;
  readonly #fetch: typeof fetch;
  #token: { value: string; expiresAt: number } | null = null;

  constructor(options: { issuer: string; clientId: string; clientSecret: string; fetch?: typeof fetch }) {
    this.#issuer = normalizedIssuer(options.issuer);
    this.#clientId = options.clientId;
    this.#clientSecret = options.clientSecret;
    this.#fetch = options.fetch ?? globalThis.fetch;
  }

  async deleteIdentity(identity: UserIdentity): Promise<void> {
    if (identity.issuer !== this.#issuer) throw new Error("The identity issuer does not match the configured Auth0 tenant");
    const response = await this.#fetch(`${this.#issuer}api/v2/users/${encodeURIComponent(identity.subject)}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${await this.#accessToken()}` },
    });
    if (response.ok || response.status === 404) return;
    throw new Error(`Auth0 identity deletion failed with status ${response.status}`);
  }

  async #accessToken() {
    if (this.#token && this.#token.expiresAt > Date.now()) return this.#token.value;
    const response = await this.#fetch(`${this.#issuer}oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", client_id: this.#clientId, client_secret: this.#clientSecret, audience: `${this.#issuer}api/v2/` }),
    });
    if (!response.ok) throw new Error(`Auth0 management authentication failed with status ${response.status}`);
    const token = tokenResponseSchema.parse(await response.json());
    this.#token = { value: token.access_token, expiresAt: Date.now() + Math.max(0, token.expires_in - 60) * 1_000 };
    return this.#token.value;
  }
}
