# Security verification and release-gate policy

This document defines the evidence required to prove the controls in the [public portfolio threat model and browser policy](threat-model.md). It applies to the public portfolio deployment and does not claim commercial-production assurance or universal compliance.

## Release rule

The **Security Release Gate** fails closed. A failed, missing, flaky, stale, or unexplained required result blocks public launch or release. Schedule pressure, low traffic, and the demonstration's portfolio status are not exceptions.

Every production candidate runs the automated baseline and deployed smoke suite. Public launch runs the complete gate. After launch, a **Security-Relevant Change** reruns the baseline plus every automated, manual, report-only, configuration, and drill check mapped to an affected trust boundary. The Security Gate Record must state why any full-gate check was not repeated.

A Security-Relevant Change includes a change to:

- identity, token handling, authorization, acting-role, or relationship scope;
- GraphQL exposure, persisted operations, attacker-controlled rendering, browser behavior, or external navigation;
- Caddy, CSP, provider integration, public or private networking, or runtime configuration;
- secret handling, build artifacts, dependencies, source maps, logging, errors, telemetry, caching, or redaction;
- resource limiting, concurrency, idempotency, Audit integrity, deployment, recovery, or owner-only operations.

Ordinary copy or synthetic curriculum changes are not security-relevant unless they alter one of those boundaries. Uncertain classification fails closed as security-relevant.

## How the record is produced

The record is generated, not filled in. The repository's **Security Gate**
workflow reads three things and combines them:

- the maintained verification catalog, for which checks are required, what each
  one disproves, which trust boundaries rerun it, and which residual risks the
  threat model already accepts — so a record can never claim coverage the
  deployment does not have, or waive a finding under a risk nobody accepted;
- every result recorded against this exact candidate, each written when the
  check ran: an automated suite the moment it finished, and a manual abuse case,
  live configuration assertion, or CSP journey the moment the Project Owner
  recorded it through the **Security Evidence** workflow; and
- the two recovery drills, read from the readiness exercises they wrote
  themselves rather than retyped, so one fact stays in one place.

Only the rerun scope, the boundaries a change touched, the reason a full-gate
check was not repeated, the residual risk a finding maps to, and the sign-off
are supplied by a person, because only a person has them.

The generator is fail-closed and its job fails when any check blocks the
release. A required check with no result blocks exactly as a failed one does — a
check nobody ran and a check that failed are equally unproven — and a result
recorded against a different release does not carry forward.

The gate also writes the operational readiness exercises its own checks
evidence, for every [incident family](operations/readiness-evidence.md) except
backups and recovery verification, which the drills own.

## Traceability

Every prohibited outcome in the threat model receives a stable check identifier whenever automation is practical. The maintained verification catalog maps each threat-model abuse family to its automated checks, manual cases, configuration assertions, deployed journeys, and applicable rerun triggers. Removing or weakening a mapped check is itself a Security-Relevant Change.

The catalog must cover the following automated families.

### Identity and authorization

- Reject missing, malformed, forged, expired, wrong-issuer, and wrong-audience tokens.
- Prove tokens remain in memory and do not enter persistent browser storage, URLs, caches, logs, errors, telemetry, or retained artifacts.
- Reject acting-role spoofing and load current Role Assignments and relationship scope from application authority.
- Exercise every shared role against allowed and forbidden top-level operations, identifiers, nested fields, reports, exports, rosters, feedback, ratings, Sponsorship data, and Audit data.
- Reuse legitimate identifiers and requests under the wrong User, role, and Organization and prove denial without existence leakage.
- Prove no application identity can enter or assume Project Owner authority.

### Request and content handling

- Reject arbitrary production GraphQL documents, unknown persisted-operation hashes, oversized bodies and variables, invalid pagination, excessive result sizes, and operations beyond cumulative resource budgets.
- Prove per-source and per-User-operation limits compose, return privacy-safe retry guidance, and do not trust attacker-supplied forwarding headers.
- Prove mutations reject missing or foreign Origin values while `/graphql` exposes neither credentialed nor cross-origin CORS.
- Exercise stored and reflected injection through every plain-text field, structured Lesson Material element, HTTPS link, localized value, validation error, report, and export.
- Prove external links cannot gain opener control and unsupported HTML, scripts, styling, uploads, embeds, media, schemes, and browser capabilities remain unavailable.

### Integrity, replay, and concurrency

- Exercise replay and concurrent attempts around Booking, Seat Capacity, Waitlist promotion, Class Credits, scheduling, notification delivery, reporting snapshots and exports, and the Audit Log.
- Prove idempotency returns the original outcome for matching reuse, rejects changed input, and cannot duplicate permanent business effects after the transport window.
- Prove database constraints and transactional behavior preserve invariants independently of application prechecks.
- Prove denied sensitive reads and accepted or rejected mutations produce the required redacted Audit evidence without recording secrets or sensitive content.

### Leakage, build, and public surface

- Scan the source tree, changed commits, generated artifacts, production browser bundle, CI output, and retained artifacts for credentials and private configuration.
- Before public launch, also scan the complete reachable Git history.
- Allowlist deliberately public Auth0 client identifiers, the Sentry DSN, and approved public origins; unknown browser configuration fails the gate.
- Inspect logs, GraphQL errors, reports, exports, caching, headers, and privacy-filtered Sentry events for token, private-input, reviewer-content, and raw-provider-response leakage.
- Prove fake authentication, GraphiQL, arbitrary GraphQL execution, debug routes, internal services, diagnostics, maintenance controls, owner routes, and owner token audiences are absent from production.
- Run the production dependency and build-integrity checks selected by the implementation. A finding closes only with reproducible evidence that the prohibited outcome is absent or after the dependency is remediated.

## Manual abuse cases

The Project Owner performs the following cases before public launch and after a mapped Security-Relevant Change when automation cannot fully prove the outcome:

- use copied shared credentials through a script or modified client outside the public SPA;
- alter acting-role context, operation hashes, identifiers, pagination, variables, Origin, and forwarding headers;
- replay and race representative state-changing operations;
- request guessed internal, API, debug, GraphiQL, diagnostics, maintenance, and Project Owner paths directly;
- inspect browser storage, history, address bar, network traffic, console, errors, cache behavior, and privacy-filtered Sentry evidence for leakage;
- attempt hostile framing, opener control, unsafe external navigation, MIME confusion, malicious structured Lesson Materials, and attacker-controlled localized or report content;
- submit oversized, rapid, and repeated operations and confirm bounded, privacy-safe failure; and
- confirm every denial leaves private data, durable state, secrets, and unintended cost-producing work unchanged.

Manual evidence records the stable case identifier, date, candidate, result, and privacy-safe observation. It never copies credentials, tokens, private configuration, raw source addresses, personal data, attack payloads, complete GraphQL variables, or raw provider responses.

## Live configuration assertions

The gate compares live state with versioned expectations before launch and after a related change. Drift blocks release. Evidence records safe setting names, hashes or fingerprints, and results rather than secret values.

- **Caddy:** the sole public origin, trusted-proxy behavior, intended routes, exact browser headers, HTTPS behavior, and no exposure of private services.
- **Auth0:** exact production callback, logout, web-origin, and CORS values; the accepted redirect PKCE, rotating refresh-token, and browser-cache settings; no iframe fallback or unexpected origin.
- **Sentry:** exact ingestion origin, privacy filtering, disabled PII, Session Replay, Feedback, Toolbar, screenshots, and attachments, and source maps associated with the exact deployed release.
- **Railway:** only Caddy is public; API and PostgreSQL remain private; intended services, replicas, volumes, and scheduled jobs are present; the native billing warning and $15 hard usage limit remain configured.
- **GitHub:** the protected production environment still provides the recorded Project Owner confirmation, and deployment, Canonical Data Rebuild, recovery, and provider credentials retain their intended separation and least privilege.
- **Application:** only the expected persisted-operation manifest is active; production mock authentication, debug tooling, owner authority, and unsafe public configuration remain absent.

## CSP rollout proof

The production build is first deployed privately with the intended policy in `Content-Security-Policy-Report-Only`. The following journeys must complete with no unexplained violation:

- anonymous discovery and public Teacher Profile access;
- login redirect, callback, token acquisition and rotation, logout, and reload;
- representative navigation and GraphQL activity for every shared role;
- privacy-filtered Sentry error delivery;
- direct navigation, rejected content, and approved external-link behavior; and
- production worker loading and all first-party asset types.

Completion of the journeys, rather than an arbitrary waiting period, is the acceptance criterion. Every violation is explained and resolved. The identical policy is then enforced, the critical journeys are rerun, and the Security Gate Record captures the candidate and policy fingerprint. Adding a source, scheme, wildcard, inline or evaluated script, frame, worker form, media source, browser capability, provider flow, or Sentry tunnel requires a new policy decision and affected-gate rerun.

## Deployed smoke suite

After readiness passes, the deployment produces a fresh worker heartbeat and completes the suite within the accepted ten-minute limit. It uses dedicated disposable fixtures and does not depend on mutable reviewer state.

- **Anonymous:** discover public sessions and Teacher Profiles while private fields and internal surfaces remain inaccessible.
- **Student:** authenticate, discover a session, create a Booking or Waitlist Entry, and retrieve only that Student's permitted records.
- **Teacher:** authenticate, access only an assigned Class Roster during the permitted relationship window, and perform one permitted teacher action.
- **Organization Manager:** authenticate and retrieve reporting only for the correct Organization and Sponsorship scope.
- **Platform Administrator:** perform one representative operation against disposable synthetic data while Project Owner and deployment operations remain nonexistent in the application.
- **Cross-role denial:** replay identifiers and requests from each journey under the wrong role and confirm privacy-safe denial.
- **Deployment boundary:** verify readiness, worker heartbeat, browser headers, private API and PostgreSQL exposure, persisted-operation enforcement, disabled production-only surfaces, and privacy-safe errors.

Any failure stops later deployment stages. If a candidate already receiving traffic violates a security or data invariant, containment follows the operator guide and the last compatible release may be restored; migrations are never reversed automatically.

## Secrets and source maps

Runtime secrets exist only in their approved provider stores. A suspected runtime secret elsewhere is treated as exposed: release stops, the credential is revoked or rotated, any required deployment is repeated, and the old credential is proved unusable. Removing exposed text alone is not remediation.

Source maps may be generated only inside the controlled build, uploaded privately with a secret token to the matching Sentry release, and discarded from public deployment artifacts. The gate inspects the static manifest and deployed files and requests expected map paths to prove that source maps are not publicly served. CI logs and artifacts must not disclose the upload token or raw map contents.

## Security Gate Record

GitHub Actions produces one dated, privacy-safe Security Gate Record for the exact production candidate. It contains:

- commit and release identifiers plus schema, fixture, persisted-operation, CSP, and relevant configuration fingerprints;
- the applicable rerun scope, changed trust boundaries, and reasons any full-gate check was not repeated;
- every required stable check identifier and result;
- manual exercise and drill dates, where applicable;
- links to the workflow and originating private provider histories;
- any finding that maps wholly to an already documented residual risk; and
- final Project Owner sign-off.

Deployment consumes the exact commit that passed. Any content change creates a new candidate. Sensitive evidence remains in its originating private provider console and is never copied into the record, workflow logs, artifacts, issues, Audit Entries, or runbooks.

## Findings, emergencies, and release blocking

A failed required check cannot be waived. A false positive closes only with reproducible evidence that the prohibited outcome is absent. An existing documented residual risk may be referenced with dated Project Owner sign-off. A genuinely new risk requires an explicit amendment to the threat model followed by rerunning the affected gate; the gate cannot invent a new exception.

Emergency containment may immediately take readiness false, disable an affected shared identity or operation, revoke or rotate credentials, restore the last compatible release, or use the accepted provider break-glass path. A new application or configuration candidate still passes the automated baseline, its mapped security checks, and deployed smoke tests before receiving traffic. Urgency may remove unrelated repetition but never converts missing evidence into a pass.

Public release remains blocked by any unexplained or unresolved result that threatens authorization, private data, secrets, durable-state integrity, browser safety, recoverability, the intended public surface, or the $15 cost ceiling.
