# Public portfolio threat model and browser policy

This document is the canonical security boundary for the publicly reachable portfolio demonstration. It describes the deployment that follows the decisions in `docs/adr/`; it is not a claim of commercial-production security or universal compliance.

## Security posture

Assume a hostile internet user who knows the complete public source, GraphQL schema, and persisted-operation catalog; can obtain and automate every shared demo credential; can manipulate browser requests or send arbitrary HTTP traffic; and will probe authorization, injection, resource, concurrency, and configuration boundaries.

The design protects:

- deployment credentials, database credentials, signing material, and server-side provider tokens from disclosure;
- relationship-scoped authorization and the deliberately private portions of synthetic User, Teacher, Class Roster, Learning Feedback, Session Rating, Sponsorship, report, and Audit data;
- synthetic business records, domain invariants, the Audit Log, and deployed code/configuration from unauthorized change;
- reviewer browsers from executable content, unsafe embedding, navigation abuse, and unnecessary cross-origin exposure;
- availability and the documented $15 deployment ceiling from ordinary automated abuse.

Public source, schemas, persisted-operation manifests, public Vite configuration, the Sentry DSN, Auth0 client identifiers, and deliberately public Teacher Profiles are not confidential. Their deployed integrity still matters.

## Trust boundaries

- **Internet to Caddy:** Caddy is the only public application origin. It terminates HTTPS, establishes the verified source address, serves first-party SPA assets, proxies `/graphql`, and owns global browser-security headers.
- **Browser to Auth0:** Auth0 owns authentication redirects, its provider session, and token issuance. The browser receives only public provider configuration and short-lived tokens.
- **Browser to application:** Every request is attacker-controlled regardless of whether the UI generated it or its operation hash is known.
- **Caddy to API:** The API is reachable only through Railway private networking. It trusts forwarded source context only from Caddy.
- **API and worker to PostgreSQL:** Application authorization remains mandatory. Workers use explicit system authority; PostgreSQL constraints independently protect structural and concurrency invariants.
- **Application to providers:** Auth0 JWKS, Auth0 token responses, and Sentry boundaries are external. Provider responses remain validated and outbound telemetry is privacy-filtered.
- **GitHub Actions to Railway:** Deployment and Canonical Data Rebuild credentials are separate, least-privilege, and unavailable to browser identities.
- **Repository to deployment:** The public repository contains no secret or unpublished security assumption. Runtime values classified as secret never enter browser bundles or source control.

Trusted components are not mutually authorization-free: process inputs remain validated, policies remain explicit, and integrity constraints remain active across internal boundaries.

## Shared demo authority

Shared credentials are effectively public. Each shared User receives only the advertised Role Assignments and relationship scope. Shared identities cannot change credentials, authentication settings, profiles, Role Assignments, provider configuration, or deployment configuration. They cannot invoke User Suspension, User Anonymization, final-Platform-Administrator removal, maintenance, a Canonical Data Rebuild, secret-bearing diagnostics, or deployment operations.

The shared Platform Administrator can demonstrate representative marketplace operations only against disposable synthetic records and under stricter resource limits. Bounded authorized reports and Report Exports remain demonstrable. Every allowed operation uses the ordinary authorization, validation, idempotency, concurrency, and Audit paths; there is no browser-visible demo bypass. Fixture restoration limits the duration of vandalism but is not a preventive security control.

## Project Owner operational authority

The Project Owner is a human operational principal anchored to a personally controlled GitHub identity protected by multi-factor authentication. Project Owner is not an application User or Role Assignment: neither Auth0 login nor Platform Administrator authority can enter, assume, or elevate into it. The public SPA and GraphQL API expose no owner route, maintenance endpoint, diagnostics endpoint, owner token audience, or hidden authorization bypass.

GitHub Actions is the normal state-changing operations surface. Deployment, manual Canonical Data Rebuild, recovery-drill, and recovery jobs use the protected `production` environment; its same-owner approval is a deliberate recorded confirmation that releases least-privilege credentials for one run, not a claim of independent review. A manual Canonical Data Rebuild fixes the target to `production` and requires a non-secret reason plus explicit acknowledgement of maintenance and discarded mutable reviewer activity before environment approval. Routine rebuild and indeterminate-state recovery are separate workflows: unresolved indeterminate state blocks ordinary rebuild, recovery is assessment-first, and any repair requires a separate protected dispatch. Completion or cancellation ends elevation; termination after quiescence remains indeterminate unless cleanup verifies the prior state. A suspected GitHub compromise requires revoking active sessions, disabling operational workflows until control is re-established, and rotating affected Railway, Auth0, and Sentry credentials before operations resume.

The owner-only diagnostics view is a sanitized, read-only GitHub Actions summary. It presents readiness, worker-heartbeat, fixture-generation, maintenance-lease, notification, the active Canonical Data Rebuild lifecycle state, and the latest terminal recovery outcome; detailed run history remains in GitHub Actions with links to private Railway and Sentry evidence. It is not an alert channel. Sentry, GitHub Actions, and Railway send private alerts only to an owner-controlled email address, and follow-up remains in the originating provider's private history. Recovery actions correlate to that evidence without creating public issues. Reviewers see only localized maintenance and retry guidance, never workflow stages, safe failure codes, or operational links.

Project Owner workflows that change application state create redacted Audit Entries with an owner-operation or system identity, safe reason, workflow correlation, outcome, and validation summary. Deployment approvals, diagnostics reads, secret access, and provider-console actions remain in GitHub, Railway, Auth0, or Sentry histories and are not copied into application Audit Entries. Routine evidence is privacy-filtered. Raw configuration or evidence is inspected only in its originating private console when necessary; it is never copied into workflow logs or artifacts, issues, application Audit Entries, or runbooks, and any exposed runtime secret is rotated.

Direct Project Owner access to Railway, Auth0, and Sentry is the break-glass fallback when GitHub or the approved workflows cannot restore safety. Each provider identity uses its strongest available multi-factor authentication plus separately stored recovery methods and, where supported, avoids sole dependence on GitHub authentication. Break-glass actions are limited to containment, credential rotation, account recovery, and restoration of the normal workflow path; afterward the owner records a sanitized reason and outcome in the appropriate private provider history and any required application Audit Entry.

## Required abuse coverage

The implementation and release evidence must cover:

- copied credentials and automated use of every shared identity;
- token extraction through injection, persistent browser storage, URLs, logs, errors, telemetry, or unsafe third-party loading;
- forged, expired, wrong-issuer, and wrong-audience tokens;
- acting-role spoofing, identifier enumeration, nested-field leakage, and cross-User or cross-Organization access;
- arbitrary GraphQL documents, unknown persisted-operation hashes, oversized bodies or variables, pagination abuse, repeated expensive operations, and export flooding;
- stored and reflected injection through plain text, structured Lesson Materials, HTTPS links, localization, and errors;
- cross-site requests, clickjacking, hostile embedding, unsafe external navigation, MIME confusion, and unneeded browser capabilities;
- leakage through browser bundles, source maps, logs, Sentry, GraphQL errors, reports, exports, caching, and headers;
- replay and concurrency attempts against Booking, Class Credit, scheduling, notification, reporting, and Audit invariants;
- exhaustion of API, PostgreSQL, worker, storage, or spending capacity; and
- production exposure of fake authentication, GraphiQL, arbitrary GraphQL execution, internal services, diagnostics, or maintenance controls.

The required automated, manual, configuration, CSP, deployed-smoke, secret, source-map, evidence, and release-blocking checks are defined by the [security verification and release-gate policy](security-verification.md).

## Application and network controls

- Production accepts only build-produced persisted GraphQL operations. This never substitutes for token validation, authorization, input validation, pagination, timeouts, or rate limits.
- `/graphql` authenticates only through an in-memory `Authorization: Bearer` token. The application origin sets no authentication or refresh-token cookie. Authenticated operations use POST and never place credentials or private operation inputs in URLs.
- `/graphql` exposes no credentialed or cross-origin CORS policy. State-changing requests validate the `Origin` header against the sole public origin as defense in depth.
- Caddy discards attacker-supplied forwarding headers and passes a verified source address over the private boundary. Missing or malformed trusted-proxy context fails closed.
- Existing per-source and per-User-operation limits apply cumulatively. HTTP 429 responses disclose retry guidance but not internal counters or identity details. Source addresses are used transiently and are not retained solely for limiting.
- The Railway hard usage ceiling is the final cost boundary. Availability may be sacrificed when that boundary is reached.
- Reviewer-authored content remains length-bounded plain text or server-validated structured Lesson Material. Raw HTML, executable content, uploads, embedded media, and custom styling are rejected.

## Authentication and browser telemetry

Auth0 uses redirect-based Authorization Code Flow with PKCE, rotating and expiring refresh tokens, in-memory SDK caching, no custom cache, and no iframe fallback. The Auth0 worker is served from the application origin, avoiding `blob:` workers. Callback, logout, web-origin, and Auth0 CORS settings contain only exact production HTTPS values. The application API validates token signature, issuer, audience, and expiration and loads authorization from PostgreSQL.

Sentry code is bundled first-party and sends privacy-filtered failures and selected traces directly to the exact public DSN ingestion origin. Default PII, Session Replay, Feedback, Toolbar, screenshots, and attachments are disabled. Filtering removes tokens, GraphQL variables, URL query strings, and reviewer-entered content. Source maps are uploaded by CI with a secret token and are not served publicly. A same-origin Sentry tunnel is excluded because it would add an abusable public forwarding endpoint and application load.

Provider evidence and configuration-dependent alternatives are recorded in [Auth0 and Sentry browser-policy requirements](research/auth0-sentry-browser-policy.md).

## Browser policy

Caddy owns and overwrites the global browser policy. Provider origins come only from validated public deployment configuration, never request headers. Response-specific content type, content disposition, and caching remain application responsibilities.

The enforced CSP starts from this template, substituting exact origins rather than wildcards:

```text
default-src 'none';
base-uri 'none';
object-src 'none';
frame-ancestors 'none';
form-action 'self';
script-src 'self';
script-src-attr 'none';
style-src 'self';
style-src-attr 'none';
font-src 'self';
img-src 'self';
connect-src 'self' <AUTH0_TENANT_ORIGIN> <SENTRY_INGEST_ORIGIN>;
manifest-src 'self';
worker-src 'self';
frame-src 'none';
media-src 'none';
upgrade-insecure-requests
```

The deployment permits no `'unsafe-inline'`, `'unsafe-eval'`, broad scheme source, wildcard provider source, external font or media origin, `blob:` worker, or `data:` image without a separately demonstrated and reviewed need. A later popup login, hidden-iframe fallback, hosted SDK, external asset source, browser capability, or Sentry tunnel requires policy review.

Companion headers are:

```text
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Permissions-Policy: accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Strict-Transport-Security: max-age=31536000
```

`includeSubDomains` is added to HSTS only after every subdomain is verified permanently HTTPS; preload is not requested initially. Cross-Origin Embedder Policy is not enabled without a feature that requires cross-origin isolation. Authenticated GraphQL and authentication-related HTML use `Cache-Control: no-store`; content-hashed static assets may use immutable caching.

The complete CSP first runs in report-only mode against the production build and deployed private environment. Login, callback, token acquisition and rotation, logout, GraphQL, Sentry, reload, and external-link journeys must produce no unexplained violation before the identical policy is enforced for public release.

## Accepted residual risks

- Shared demo credentials cannot provide individual accountability and can be automated within enforced limits.
- In-memory tokens remain stealable after successful same-page script execution, malicious extension access, or browser/device compromise.
- Synthetic data reduces privacy impact but not authorization, integrity, reputation, or cost impact.
- Public implementation knowledge assists attackers; security never relies on obscurity.
- In-memory rate-limit counters reset and distributed source addresses can evade per-source limits. The deployment does not claim volumetric DDoS resistance.
- Browser headers cannot repair unsafe rendering, vulnerable dependencies, or compromised trusted origins.
- Auth0, Railway, GitHub, Sentry, package registries, dependencies, and browsers remain provider and supply-chain dependencies.
- Caddy is an accepted availability choke point for the portfolio's scale and budget.
- Compromised maintainers, provider infrastructure, or end-user devices are outside the application threat boundary.

New operations, content sources, external connections, provider flows, or browser capabilities can invalidate this model and require security review.
