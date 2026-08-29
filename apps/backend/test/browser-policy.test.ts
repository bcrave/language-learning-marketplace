import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  browserSecurityHeaders,
  caddyBrowserPolicyDirectives,
  contentSecurityPolicy,
  ENFORCED_POLICY_HEADER,
  evaluateBrowserPolicy,
  FORBIDDEN_RESPONSE_HEADERS,
  REPORT_ONLY_POLICY_HEADER,
  verifyDeployedBrowserPolicy,
} from "../src/operations/browser-policy.js";

const CADDYFILE = readFileSync(
  resolve(import.meta.dirname, "../../../deploy/caddy/Caddyfile"),
  "utf8",
);

const ORIGINS = {
  auth0Origin: "https://tenant.eu.auth0.com",
  sentryOrigin: "https://o1.ingest.sentry.io",
};

function policyResponse(overrides: Record<string, string> = {}) {
  const headers = new Headers();
  for (const [name, value] of browserSecurityHeaders(ORIGINS)) headers.set(name, value);
  for (const [name, value] of Object.entries(overrides)) {
    if (value === "") headers.delete(name);
    else headers.set(name, value);
  }
  return headers;
}

describe("the single public origin's browser policy", () => {
  it("is the policy the deployed Caddyfile emits", () => {
    // The Caddyfile is the deployment and this module is the statement of what
    // the deployment must be. Drift between them is exactly what the Security
    // Release Gate calls a configuration finding, so it fails here first.
    for (const directive of caddyBrowserPolicyDirectives()) {
      expect(CADDYFILE).toContain(directive);
    }
  });

  it("denies everything the threat model has not separately reviewed", () => {
    const policy = contentSecurityPolicy(ORIGINS);

    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    // Adding any of these is a policy decision, never an implementation detail.
    expect(policy).not.toContain("unsafe-inline");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).not.toContain("*");
    expect(policy).not.toContain("blob:");
    expect(policy).not.toContain("data:");
  });

  it("connects only to this origin and the two named provider origins", () => {
    expect(contentSecurityPolicy(ORIGINS)).toContain(
      `connect-src 'self' ${ORIGINS.auth0Origin} ${ORIGINS.sentryOrigin}`,
    );
  });

  it("serves the Auth0 token worker from this origin rather than a blob URL", () => {
    expect(contentSecurityPolicy(ORIGINS)).toContain("worker-src 'self'");
  });

  it("runs the identical policy in report-only mode before enforcing it", () => {
    // The threat model rolls the complete policy out report-only first. Only
    // the header's name is switchable, so the two modes cannot become two
    // different policies, and an unset switch enforces.
    expect(caddyBrowserPolicyDirectives()[0]).toContain(
      `{$CSP_HEADER_NAME:${ENFORCED_POLICY_HEADER}}`,
    );
    expect(CADDYFILE).toContain(`{$CSP_HEADER_NAME:${ENFORCED_POLICY_HEADER}}`);
  });

  it("refuses a deployment serving no policy at all", () => {
    // Caddy accepts an empty `CSP_HEADER_NAME`, which names no header and
    // removes the policy while leaving every companion header in place. Only
    // reading the deployed response catches that.
    const unprotected = policyResponse({ [ENFORCED_POLICY_HEADER]: "" });

    expect(
      evaluateBrowserPolicy(unprotected, ORIGINS).find(
        (finding) => finding.header === ENFORCED_POLICY_HEADER,
      ),
    ).toEqual({
      header: ENFORCED_POLICY_HEADER,
      outcome: "FAILED",
      detail: `${ENFORCED_POLICY_HEADER} was absent`,
    });
  });

  it("refuses a public candidate still in report-only mode", () => {
    const stillRollingOut = policyResponse({
      [REPORT_ONLY_POLICY_HEADER]: contentSecurityPolicy(ORIGINS),
    });

    expect(
      evaluateBrowserPolicy(stillRollingOut, ORIGINS).find(
        (finding) => finding.header === REPORT_ONLY_POLICY_HEADER,
      ),
    ).toEqual({
      header: REPORT_ONLY_POLICY_HEADER,
      outcome: "FAILED",
      detail: `${REPORT_ONLY_POLICY_HEADER} is present`,
    });
  });

  it("refuses a response that names the software answering it", () => {
    for (const header of ["Server", "X-Powered-By"]) {
      const disclosing = policyResponse({ [header]: "caddy" });

      expect(
        evaluateBrowserPolicy(disclosing, ORIGINS).find(
          (finding) => finding.header === header,
        )?.outcome,
      ).toBe("FAILED");
    }
    expect(FORBIDDEN_RESPONSE_HEADERS).toContain("Server");
  });

  it("accepts a deployment that emits exactly the policy", () => {
    const findings = evaluateBrowserPolicy(policyResponse(), ORIGINS);

    expect(findings.every((finding) => finding.outcome === "PASSED")).toBe(true);
  });

  it("reports a missing header rather than assuming the default", () => {
    const findings = evaluateBrowserPolicy(
      policyResponse({ "X-Frame-Options": "" }),
      ORIGINS,
    );

    expect(findings.filter((finding) => finding.outcome === "FAILED")).toEqual([
      { header: "X-Frame-Options", outcome: "FAILED", detail: "X-Frame-Options was absent" },
    ]);
  });

  it("reports a policy that has quietly widened", () => {
    const widened = policyResponse({
      "Content-Security-Policy": contentSecurityPolicy({
        ...ORIGINS,
        sentryOrigin: "https:",
      }),
    });

    expect(
      evaluateBrowserPolicy(widened, ORIGINS).find(
        (finding) => finding.header === "Content-Security-Policy",
      )?.outcome,
    ).toBe("FAILED");
  });
});

describe("verifying the policy against a deployment", () => {
  it("reads the policy from the SPA entry document a reviewer loads first", async () => {
    const requested: string[] = [];
    const findings = await verifyDeployedBrowserPolicy({
      origin: "https://example.test",
      origins: ORIGINS,
      fetch: async (input) => {
        requested.push(String(input));
        return new Response("", { headers: policyResponse() });
      },
    });

    expect(requested).toEqual(["https://example.test/"]);
    expect(findings.every((finding) => finding.outcome === "PASSED")).toBe(true);
  });

  it("fails closed when the public origin does not answer", async () => {
    const findings = await verifyDeployedBrowserPolicy({
      origin: "https://example.test",
      origins: ORIGINS,
      fetch: () => Promise.reject(new Error("connection refused")),
    });

    expect(findings).toEqual([
      {
        header: "*",
        outcome: "FAILED",
        detail: "the public origin did not answer a browser-policy probe",
      },
    ]);
  });
});

describe("the Caddyfile's remaining browser obligations", () => {
  it("never stores an authenticated response, and only caches hashed assets", () => {
    expect(CADDYFILE).toContain('Cache-Control "no-store"');
    expect(CADDYFILE).toContain(
      'header @hashedAssets Cache-Control "public, max-age=31536000, immutable"',
    );
  });

  it("keeps requesting HSTS subdomains and preload out of the initial policy", () => {
    expect(CADDYFILE).not.toContain("includeSubDomains");
    expect(CADDYFILE).not.toContain("preload");
  });
});
