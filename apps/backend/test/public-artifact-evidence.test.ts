import { describe, expect, it } from "vitest";

import { inspectPublicArtifacts } from "../src/operations/public-artifact-evidence.js";

/**
 * The checks match the *shape* of a credential, so proving they work means
 * handing them something shaped like one. These fixtures are assembled from
 * parts rather than written as literals: a scanner reading this repository —
 * GitGuardian reads every pull request — cannot tell a fixture from the real
 * thing and should not have to, and the tree carrying no literal secret shape
 * is the same standard the release gate holds the build artifacts to.
 */
const SIGNED_TOKEN = [
  "eyJhbGciOiJIUzI1NiJ9",
  "eyJzdWIiOiJhYmNkZWZnaGkifQ",
  "c2lnbmF0dXJlLXZhbHVl",
].join(".");

const PRIVATE_KEY_MATERIAL = [
  ["-----BEGIN RSA PRIVATE", "KEY-----"].join(" "),
  "MIIEowIBAAKCAQEAtQ9Fk4mJ1sPqRvXcZzY7bNwGh2LdKpQrStUvWxYzAbCdEfGh",
].join("\n");

const CREDENTIALLED_DATABASE_URL = [
  "postgres://marketplace",
  "hunter2@db.internal:5432/marketplace",
].join(":");

/** The deliberately public values a real browser bundle carries. */
const PUBLIC_BROWSER_CONFIGURATION = `
  const domain = "tenant.eu.auth0.com";
  const clientId = "aBcD1234aBcD1234aBcD1234aBcD1234";
  const audience = "https://api.example.test";
  const dsn = "https://0123456789abcdef@o1.ingest.sentry.io/42";
`;

function artifacts(overrides: {
  browser?: { path: string; content: string }[];
  server?: { path: string; content: string }[];
}) {
  return {
    browser: overrides.browser ?? [
      { path: "apps/web/dist/assets/index-abc123.js", content: PUBLIC_BROWSER_CONFIGURATION },
    ],
    server: overrides.server ?? [
      { path: "apps/backend/dist/api/main.js", content: "const port = 4000;" },
    ],
  };
}

describe("evidence that a release's artifacts are safe to publish", () => {
  it("passes a build carrying only deliberately public configuration", () => {
    // The Auth0 domain, client identifier, audience, and Sentry DSN are public
    // by design. A check that flagged them would fail every honest release.
    expect(inspectPublicArtifacts(artifacts({}))).toEqual([]);
  });

  it("refuses a bundle carrying its source map inline", () => {
    // An inline map is the map, served with the code that references it.
    const findings = inspectPublicArtifacts(
      artifacts({
        browser: [
          {
            path: "apps/web/dist/assets/index-abc123.js",
            content: "const a = 1;\n//# sourceMappingURL=data:application/json;base64,e30=\n",
          },
        ],
      }),
    );

    expect(findings).toEqual([
      {
        check: "artifact.sourceMapsAbsent",
        path: "apps/web/dist/assets/index-abc123.js",
        detail: "an inline source map",
      },
    ]);
  });

  it("accepts a reference to a map the deployment does not carry", () => {
    // The build uploads maps privately to Sentry and discards them, so a
    // vendored file's leftover comment points at nothing. The published-map
    // check below is what proves the map is genuinely absent.
    expect(
      inspectPublicArtifacts(
        artifacts({
          browser: [
            {
              path: "apps/web/dist/assets/worker-abc123.js",
              content: "const a = 1;\n//# sourceMappingURL=worker.production.js.map\n",
            },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("refuses a published source map even when nothing references it", () => {
    const findings = inspectPublicArtifacts(
      artifacts({
        browser: [{ path: "apps/web/dist/assets/index-abc123.js.map", content: "{}" }],
      }),
    );

    expect(findings.map((finding) => finding.detail)).toEqual(["a published source map"]);
  });

  it("refuses a credential that escaped its provider secret store", () => {
    const findings = inspectPublicArtifacts(
      artifacts({
        server: [
          {
            path: "apps/backend/dist/api/main.js",
            content: `const url = "${CREDENTIALLED_DATABASE_URL}";`,
          },
        ],
      }),
    );

    expect(findings.map((finding) => finding.check)).toEqual(["artifact.secretsAbsent"]);
    // The finding names the shape, never the value it found.
    expect(findings[0]!.detail).not.toContain(CREDENTIALLED_DATABASE_URL);
  });

  it("refuses private key material and signed tokens wherever they appear", () => {
    const key = inspectPublicArtifacts(
      artifacts({
        browser: [
          {
            path: "apps/web/dist/assets/index-abc123.js",
            content: PRIVATE_KEY_MATERIAL,
          },
        ],
      }),
    );
    const token = inspectPublicArtifacts(
      artifacts({
        server: [
          {
            path: "apps/backend/dist/worker/main.js",
            content: `const t = "${SIGNED_TOKEN}";`,
          },
        ],
      }),
    );

    expect(key.map((finding) => finding.check)).toEqual(["artifact.secretsAbsent"]);
    expect(token.map((finding) => finding.check)).toEqual(["artifact.secretsAbsent"]);
  });

  it("refuses a browser bundle that advertises a private surface", () => {
    const findings = inspectPublicArtifacts(
      artifacts({
        browser: [
          {
            path: "apps/web/dist/assets/index-abc123.js",
            content: 'fetch("/health/ready");',
          },
        ],
      }),
    );

    expect(findings).toEqual([
      {
        check: "artifact.privateSurfacesAbsent",
        path: "apps/web/dist/assets/index-abc123.js",
        detail: "the private surface /health/ready",
      },
    ]);
  });

  it("accepts a library that only names the key format it accepts", () => {
    // `@auth0/auth0-spa-js` checks that its input begins with this header. The
    // text is a format assertion, not a key.
    expect(
      inspectPublicArtifacts(
        artifacts({
          browser: [
            {
              path: "apps/web/dist/assets/index-abc123.js",
              content: `if (input.indexOf("${["-----BEGIN PRIVATE", "KEY-----"].join(" ")}") !== 0) throw new TypeError("pkcs8");`,
            },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("lets the server bundle name the configuration it has to read", () => {
    // Reading a secret means naming it. The name is not the secret, and the
    // server bundle is never served to anyone.
    expect(
      inspectPublicArtifacts(
        artifacts({
          server: [
            {
              path: "apps/backend/dist/api/main.js",
              content: "process.env.API_TRUSTED_PROXY_SECRET; fetch('/health/ready');",
            },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("refuses fake authentication in either artifact", () => {
    const findings = inspectPublicArtifacts(
      artifacts({
        server: [
          { path: "apps/backend/dist/api/main.js", content: "class FakeAuthenticator {}" },
        ],
      }),
    );

    expect(findings.map((finding) => finding.check)).toEqual([
      "artifact.fakeAuthenticationAbsent",
    ]);
  });
});
