import type { Authenticator } from "@marketplace/core";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

import { normalizedIssuer } from "./issuer.js";

const auth0IdentitySchema = z.object({
  iss: z.url(),
  sub: z.string().min(1).max(255),
});

/**
 * Failure codes jose raises about the presented token itself. A caller with an
 * expired, unsigned, or unknown-key token is an ordinary refusal, not evidence
 * that Auth0 is failing, and the operator guide's integration threshold must
 * not be reached by a reviewer whose session simply expired.
 *
 * Everything else — a JWKS timeout, a refused fetch, a malformed response — is
 * the boundary itself failing, and that is what is counted.
 */
const REJECTED_TOKEN_CODES = new Set([
  "ERR_JWT_EXPIRED",
  "ERR_JWT_CLAIM_VALIDATION_FAILED",
  "ERR_JWT_INVALID",
  "ERR_JWS_INVALID",
  "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
  "ERR_JWKS_NO_MATCHING_KEY",
  "ERR_JWKS_MULTIPLE_MATCHING_KEYS",
]);

export const AUTH0_INTEGRATION = "auth0";

export function auth0BoundaryFailureCode(error: unknown): string | null {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "UNKNOWN";
  if (REJECTED_TOKEN_CODES.has(code)) return null;
  // The code is jose's own constant or the literal `UNKNOWN`: a stable safe
  // failure code, never a provider message and never the token.
  return code;
}

export class Auth0Authenticator implements Authenticator {
  readonly #audience: string;
  readonly #issuer: string;
  readonly #jwks: ReturnType<typeof createRemoteJWKSet>;
  readonly #onBoundaryFailure?: (failure: { safeFailureCode: string }) => void;

  constructor(options: {
    audience: string;
    issuer: string;
    /** Called when Auth0 itself failed, rather than the presented token. */
    onBoundaryFailure?: (failure: { safeFailureCode: string }) => void;
  }) {
    this.#audience = options.audience;
    this.#issuer = normalizedIssuer(options.issuer);
    this.#jwks = createRemoteJWKSet(new URL(".well-known/jwks.json", this.#issuer));
    if (options.onBoundaryFailure) this.#onBoundaryFailure = options.onBoundaryFailure;
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
    } catch (error) {
      const safeFailureCode = auth0BoundaryFailureCode(error);
      if (safeFailureCode) this.#onBoundaryFailure?.({ safeFailureCode });
      return null;
    }
  }
}
