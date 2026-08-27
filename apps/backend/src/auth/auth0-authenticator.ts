import type { Authenticator } from "@marketplace/core";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

import { normalizedIssuer } from "./issuer.js";

const auth0IdentitySchema = z.object({
  iss: z.url(),
  sub: z.string().min(1).max(255),
});

export class Auth0Authenticator implements Authenticator {
  readonly #audience: string;
  readonly #issuer: string;
  readonly #jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(options: { audience: string; issuer: string }) {
    this.#audience = options.audience;
    this.#issuer = normalizedIssuer(options.issuer);
    this.#jwks = createRemoteJWKSet(new URL(".well-known/jwks.json", this.#issuer));
  }

  async authenticate(request: Request) {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return null;

    try {
      const { payload } = await jwtVerify(authorization.slice(7), this.#jwks, {
        audience: this.#audience,
        issuer: this.#issuer,
      });
      const identity = auth0IdentitySchema.safeParse(payload);
      return identity.success
        ? { issuer: identity.data.iss, subject: identity.data.sub }
        : null;
    } catch {
      return null;
    }
  }
}
