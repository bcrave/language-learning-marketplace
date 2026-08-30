import { createServer, type Server } from "node:http";

import {
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Auth0Authenticator } from "../src/auth/auth0-authenticator.js";

describe("Auth0 JWT contract", () => {
  const audience = "https://api.example.test";
  let issuer: string;
  let privateKey: CryptoKey;
  let server: Server;

  beforeAll(async () => {
    const keyPair = await generateKeyPair("RS256");
    privateKey = keyPair.privateKey;
    const publicJwk = await exportJWK(keyPair.publicKey);
    server = createServer((request, response) => {
      if (request.url !== "/.well-known/jwks.json") {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          keys: [{ ...publicJwk, alg: "RS256", kid: "contract-key", use: "sig" }],
        }),
      );
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("JWKS server unavailable");
    issuer = `http://127.0.0.1:${address.port}/`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  async function token(options?: {
    audience?: string;
    expiration?: number | string;
    issuer?: string;
    signingKey?: CryptoKey;
  }) {
    return new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "contract-key" })
      .setIssuer(options?.issuer ?? issuer)
      .setAudience(options?.audience ?? audience)
      .setSubject("auth0|student-123")
      .setIssuedAt()
      .setExpirationTime(options?.expiration ?? "5m")
      .sign(options?.signingKey ?? privateKey);
  }

  async function authenticate(
    accessToken: string,
    onBoundaryFailure?: (failure: { safeFailureCode: string }) => void,
  ) {
    const authenticator = new Auth0Authenticator({
      audience,
      issuer,
      ...(onBoundaryFailure ? { onBoundaryFailure } : {}),
    });
    return authenticator.authenticate(
      new Request("http://localhost/graphql", {
        headers: { authorization: `Bearer ${accessToken}` },
      }),
    );
  }

  it("extracts the verified issuer and subject", async () => {
    await expect(authenticate(await token())).resolves.toEqual({
      issuer,
      subject: "auth0|student-123",
    });
  });

  it("rejects an invalid signature", async () => {
    const otherKeyPair = await generateKeyPair("RS256");
    await expect(
      authenticate(await token({ signingKey: otherKeyPair.privateKey })),
    ).resolves.toBeNull();
  });

  it("rejects the wrong audience or issuer and expired tokens", async () => {
    await expect(authenticate(await token({ audience: "wrong-audience" }))).resolves.toBeNull();
    await expect(
      authenticate(await token({ issuer: "https://wrong-issuer.example/" })),
    ).resolves.toBeNull();
    await expect(authenticate(await token({ expiration: 0 }))).resolves.toBeNull();
  });

  // The operator guide's third-party-integration threshold is measured on
  // actual calls. A reviewer whose token expired must not push Auth0 towards
  // an incident, and a JWKS endpoint that has stopped answering must.
  it("reports nothing to the integration threshold when the token itself is refused", async () => {
    const failures: string[] = [];
    const record = ({ safeFailureCode }: { safeFailureCode: string }) => {
      failures.push(safeFailureCode);
    };
    const otherKeyPair = await generateKeyPair("RS256");
    await authenticate(await token({ expiration: 0 }), record);
    await authenticate(await token({ audience: "wrong-audience" }), record);
    await authenticate(await token({ signingKey: otherKeyPair.privateKey }), record);
    expect(failures).toEqual([]);
  });

  it("reports a safe failure code when Auth0 itself cannot be reached", async () => {
    const failures: string[] = [];
    const unreachable = new Auth0Authenticator({
      audience,
      // A port nothing listens on: the JWKS fetch fails rather than the token.
      issuer: "http://127.0.0.1:1/",
      onBoundaryFailure: ({ safeFailureCode }) => {
        failures.push(safeFailureCode);
      },
    });
    await expect(
      unreachable.authenticate(
        new Request("http://localhost/graphql", {
          headers: { authorization: `Bearer ${await token({ issuer: "http://127.0.0.1:1/" })}` },
        }),
      ),
    ).resolves.toBeNull();
    expect(failures).toHaveLength(1);
    // A stable code, never a provider message and never the token.
    expect(failures[0]).toMatch(/^[A-Z0-9_]+$/);
  });
});
