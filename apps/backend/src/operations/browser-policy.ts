/**
 * The deterministic global browser policy of ADR 0028 and the public portfolio
 * threat model, expressed once so the deployment and the evidence that checks it
 * cannot drift apart.
 *
 * Caddy owns and overwrites these headers for every response from the single
 * public origin. This module is not what sets them — a Node process behind Caddy
 * cannot — it is the one statement of what they must be: `deploy/caddy/Caddyfile`
 * is asserted against it, and the release verifies the live response against it.
 *
 * Provider origins are substituted exactly. A missing one narrows the policy
 * rather than widening it, because an empty substitution removes a source
 * instead of adding a wildcard: the deployment fails closed, visibly, in the
 * journeys that need the provider.
 */

/** The Caddy environment names carrying each provider origin into the policy. */
const AUTH0_ORIGIN_PLACEHOLDER = "{$AUTH0_TENANT_ORIGIN}";
const SENTRY_ORIGIN_PLACEHOLDER = "{$SENTRY_INGEST_ORIGIN}";

/**
 * The threat model runs the complete policy in report-only mode against the
 * private deployment first, then enforces the identical policy for the public
 * release. One environment name selects the header, so the two modes cannot
 * drift into two different policies, and it defaults to enforcement: a
 * deployment that says nothing enforces.
 */
export const ENFORCED_POLICY_HEADER = "Content-Security-Policy";
export const REPORT_ONLY_POLICY_HEADER = "Content-Security-Policy-Report-Only";
const POLICY_HEADER_PLACEHOLDER = `{$CSP_HEADER_NAME:${ENFORCED_POLICY_HEADER}}`;

export interface BrowserPolicyOrigins {
  /** The Auth0 tenant the SPA redirects to and exchanges tokens with. */
  auth0Origin: string;
  /** The exact Sentry ingestion origin, with no tunnel through this origin. */
  sentryOrigin: string;
}

/**
 * The Content Security Policy, as one header value. Everything is denied by
 * default and re-allowed only where a demonstrated need exists: first-party
 * script, style, font and image; connections to this origin and the two
 * provider origins; and a same-origin worker, because ADR 0027 serves the Auth0
 * token worker from this origin rather than a `blob:` URL.
 */
export function contentSecurityPolicy(origins: BrowserPolicyOrigins) {
  return [
    "default-src 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self'",
    "script-src-attr 'none'",
    "style-src 'self'",
    "style-src-attr 'none'",
    "font-src 'self'",
    "img-src 'self'",
    `connect-src 'self' ${origins.auth0Origin} ${origins.sentryOrigin}`,
    "manifest-src 'self'",
    "worker-src 'self'",
    "frame-src 'none'",
    "media-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/**
 * The companion headers, in the order the threat model lists them.
 *
 * `Strict-Transport-Security` carries no `includeSubDomains` and requests no
 * preload: the threat model adds those only once every subdomain is verified
 * permanently HTTPS. `X-XSS-Protection: 0` disables the legacy auditor rather
 * than enabling it, because its heuristics introduce their own vulnerabilities.
 */
const COMPANION_BROWSER_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ["Referrer-Policy", "no-referrer"],
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "DENY"],
  ["X-XSS-Protection", "0"],
  [
    "Permissions-Policy",
    "accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  ],
  ["Cross-Origin-Opener-Policy", "same-origin"],
  ["Cross-Origin-Resource-Policy", "same-origin"],
  ["Strict-Transport-Security", "max-age=31536000"],
];

/**
 * The global browser policy the single public origin must emit, as name/value
 * pairs. Response-specific concerns the threat model leaves to the application
 * — content type, content disposition, and caching — are deliberately not here;
 * the Caddyfile's own caching rules are asserted separately.
 */
export function browserSecurityHeaders(
  origins: BrowserPolicyOrigins,
): ReadonlyArray<readonly [string, string]> {
  return [
    [ENFORCED_POLICY_HEADER, contentSecurityPolicy(origins)],
    ...COMPANION_BROWSER_HEADERS,
  ];
}

/**
 * Headers a public release must not carry: the two that name the software
 * answering, and the report-only policy, whose presence means the deployment is
 * still in the rollout phase rather than enforcing.
 */
export const FORBIDDEN_RESPONSE_HEADERS: readonly string[] = [
  "Server",
  "X-Powered-By",
  REPORT_ONLY_POLICY_HEADER,
];

/**
 * The policy as Caddy writes it: the body of one `header` block, with the
 * provider origins left as environment placeholders. The deployment substitutes
 * them at start-up from validated public configuration, never from a request
 * header.
 */
export function caddyBrowserPolicyDirectives() {
  const placeholders = {
    auth0Origin: AUTH0_ORIGIN_PLACEHOLDER,
    sentryOrigin: SENTRY_ORIGIN_PLACEHOLDER,
  };
  return [
    `${POLICY_HEADER_PLACEHOLDER} "${contentSecurityPolicy(placeholders)}"`,
    ...COMPANION_BROWSER_HEADERS.map(([name, value]) => `${name} "${value}"`),
  ];
}

export interface BrowserPolicyFinding {
  header: string;
  outcome: "PASSED" | "FAILED";
  /** Privacy-safe: names the header and what differed, never a person or token. */
  detail: string;
}

/**
 * Compares a live response's headers with the policy this build expects. A
 * missing or altered header is a finding: the gate treats browser-policy drift
 * as release-blocking rather than as an observation.
 */
export function evaluateBrowserPolicy(
  headers: Headers,
  origins: BrowserPolicyOrigins,
): BrowserPolicyFinding[] {
  const required = browserSecurityHeaders(origins).map(([header, expected]) => {
    const observed = headers.get(header);
    if (observed === null) {
      return { header, outcome: "FAILED" as const, detail: `${header} was absent` };
    }
    if (observed.trim() !== expected) {
      return { header, outcome: "FAILED" as const, detail: `${header} does not match the policy` };
    }
    return { header, outcome: "PASSED" as const, detail: `${header} matches the policy` };
  });

  const forbidden = FORBIDDEN_RESPONSE_HEADERS.map((header) =>
    headers.has(header)
      ? { header, outcome: "FAILED" as const, detail: `${header} is present` }
      : { header, outcome: "PASSED" as const, detail: `${header} is absent` },
  );

  return [...required, ...forbidden];
}

/**
 * Reads the live policy from the single public origin. The request is an
 * ordinary anonymous GET of the SPA entry document, because that is what a
 * reviewer's browser fetches first and therefore what the policy has to be
 * correct on.
 */
export async function verifyDeployedBrowserPolicy(options: {
  origin: string;
  origins: BrowserPolicyOrigins;
  fetch?: typeof fetch;
}): Promise<BrowserPolicyFinding[]> {
  const call = options.fetch ?? fetch;
  let response: Response;
  try {
    response = await call(new URL("/", options.origin), { redirect: "manual" });
  } catch {
    return [
      {
        header: "*",
        outcome: "FAILED",
        detail: "the public origin did not answer a browser-policy probe",
      },
    ];
  }
  return evaluateBrowserPolicy(response.headers, options.origins);
}
