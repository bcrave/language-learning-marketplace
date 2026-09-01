import type { IncidentFamily } from "../observability/alert-policy.js";

/**
 * The [security verification and release-gate
 * policy](../../../../docs/security-verification.md) as data.
 *
 * The document states the rule; this file is the executable statement of it, so
 * the gate can assert traceability rather than a reader having to reread two
 * documents and hold them side by side. Every abuse family the [threat
 * model](../../../../docs/threat-model.md) requires coverage of appears here,
 * every check the policy names carries a stable identifier, and every check
 * names the trust boundaries whose change reruns it.
 *
 * `security-gate.test.ts` holds the two together from both sides: it fails when
 * an abuse family loses its checks, and it fails when a check names a boundary
 * or a residual risk the threat model does not define. Drift in either
 * direction is a test failure rather than a discovery at release time.
 *
 * The catalog is deliberately not the place where results live. Removing or
 * weakening a mapped check is itself a Security-Relevant Change, and a catalog
 * that could be edited to make a failing release pass would be the one document
 * in this repository whose own integrity nothing checks.
 */

/**
 * The threat model's required abuse coverage, as the units traceability groups
 * by. A family with no check is a prohibited outcome nothing disproves.
 */
export const SECURITY_ABUSE_FAMILIES = {
  "shared-credential-automation":
    "Copied credentials and automated use of every shared identity",
  "token-extraction":
    "Token extraction through injection, browser storage, URLs, logs, errors, or telemetry",
  "token-forgery": "Forged, expired, wrong-issuer, and wrong-audience tokens",
  "authorization-scope":
    "Acting-role spoofing, enumeration, nested-field leakage, and cross-User or cross-Organization access",
  "request-budget":
    "Arbitrary documents, unknown operation hashes, oversized input, pagination abuse, and export flooding",
  "content-injection":
    "Stored and reflected injection through text, Lesson Materials, links, localization, and errors",
  "browser-safety":
    "Cross-site requests, clickjacking, hostile embedding, unsafe navigation, and MIME confusion",
  "evidence-leakage":
    "Leakage through bundles, source maps, logs, Sentry, errors, reports, exports, caching, and headers",
  "replay-and-concurrency":
    "Replay and concurrency against Booking, Class Credit, scheduling, notification, reporting, and Audit invariants",
  "capacity-exhaustion":
    "Exhaustion of API, PostgreSQL, worker, storage, or spending capacity",
  "production-surface":
    "Production exposure of fake authentication, GraphiQL, arbitrary execution, internal services, diagnostics, or maintenance controls",
} as const;

export type SecurityAbuseFamily = keyof typeof SECURITY_ABUSE_FAMILIES;

/**
 * The threat model's trust boundaries, which are also the rerun scope: after
 * launch, a Security-Relevant Change reruns every check mapped to a boundary it
 * touched. Uncertain classification fails closed as security-relevant, so a
 * check with no boundary would never be rerun and does not exist here.
 */
export const SECURITY_TRUST_BOUNDARIES = {
  "internet-to-caddy": "Internet to Caddy",
  "browser-to-auth0": "Browser to Auth0",
  "browser-to-application": "Browser to application",
  "caddy-to-api": "Caddy to API",
  "api-to-postgresql": "API and worker to PostgreSQL",
  "application-to-providers": "Application to providers",
  "actions-to-railway": "GitHub Actions to Railway",
  "repository-to-deployment": "Repository to deployment",
} as const;

export type SecurityTrustBoundary = keyof typeof SECURITY_TRUST_BOUNDARIES;

/**
 * How a check's result reaches the gate.
 *
 * The distinction is not cosmetic: it decides who may record a result and what
 * the gate demands alongside it. A `SUITE` result comes from an automated suite
 * this repository runs, so it needs only the workflow run it came from. An
 * `OWNER` result is an abuse case or a live provider console someone looked at,
 * so it needs a dated Project Owner sign-off — the policy asks for the exercise
 * date and the person, and a manual case nobody signed is a claim rather than
 * evidence. A `DRILL` result is not recorded against the gate at all; it is
 * read out of the readiness exercises the drills already wrote, because a drill
 * retyped into a second place is a drill that can disagree with itself.
 */
export type SecurityEvidenceKind = "SUITE" | "DEPLOYED" | "OWNER" | "DRILL";

/**
 * The automated suites the gate runs, and the workflow step each one is.
 *
 * A suite records the same outcome for every check it proves. That is coarser
 * than one result per check and deliberately so: the alternative is a mapping
 * from check identifiers to individual test names, which drifts silently the
 * first time a test is renamed, and which would let a check report `PASSED`
 * from a suite that never ran it.
 */
export const SECURITY_GATE_SUITES = {
  "static-and-unit": "Typecheck, lint, build, public-artifact evidence, and the unit suite",
  "postgres-integration": "The PostgreSQL integration suite",
  "role-journeys": "The cross-browser accessible role journeys",
  "public-surface": "The deployed browser policy and source-map probe",
  "deployed-smoke": "The deployed role and cross-role smoke journey",
  "dependency-integrity": "The production dependency audit",
} as const;

export type SecurityGateSuite = keyof typeof SECURITY_GATE_SUITES;

export interface SecurityCheck {
  /** Stable identifier. The Security Gate Record carries it; renaming one is a Security-Relevant Change. */
  id: string;
  family: SecurityAbuseFamily;
  evidence: SecurityEvidenceKind;
  /** The suite that records this check, where one does. */
  suite?: SecurityGateSuite;
  /** Changing any of these reruns the check. */
  boundaries: readonly SecurityTrustBoundary[];
  /** The prohibited outcome this check disproves, in the policy's own terms. */
  statement: string;
}

/**
 * Every check the policy requires, in the order its sections state them:
 * automated identity and authorization, request and content handling,
 * integrity, leakage and build, then the manual abuse cases, the live
 * configuration assertions, the CSP rollout proof, the deployed smoke suite,
 * and the applicable drills.
 */
export const SECURITY_VERIFICATION_CATALOG: readonly SecurityCheck[] = [
  // Identity and authorization.
  {
    id: "identity.tokenValidation",
    family: "token-forgery",
    evidence: "SUITE",
    suite: "static-and-unit",
    boundaries: ["browser-to-auth0", "browser-to-application", "application-to-providers"],
    statement:
      "missing, malformed, forged, expired, wrong-issuer, and wrong-audience tokens are refused",
  },
  {
    id: "identity.tokensStayInMemory",
    family: "token-extraction",
    evidence: "SUITE",
    suite: "role-journeys",
    boundaries: ["browser-to-auth0", "browser-to-application"],
    statement:
      "no credential-shaped value reaches persistent browser storage or the address bar, and the client persists only preferences",
  },
  {
    id: "identity.actingRoleFromAuthority",
    family: "authorization-scope",
    evidence: "SUITE",
    suite: "postgres-integration",
    boundaries: ["browser-to-application", "api-to-postgresql"],
    statement:
      "acting-role spoofing is refused and Role Assignments and relationship scope load from application authority",
  },
  {
    id: "identity.roleOperationMatrix",
    family: "authorization-scope",
    evidence: "SUITE",
    suite: "postgres-integration",
    boundaries: ["browser-to-application", "api-to-postgresql"],
    statement:
      "every shared role meets its allowed and forbidden operations, identifiers, nested fields, reports, exports, rosters, feedback, ratings, Sponsorship data, and Audit data",
  },
  {
    id: "identity.crossScopeDenial",
    family: "authorization-scope",
    evidence: "SUITE",
    suite: "postgres-integration",
    boundaries: ["browser-to-application", "api-to-postgresql"],
    statement:
      "legitimate identifiers replayed under the wrong User, role, or Organization are denied without existence leakage",
  },
  {
    id: "identity.ownerAuthorityUnreachable",
    family: "production-surface",
    evidence: "SUITE",
    suite: "postgres-integration",
    boundaries: ["browser-to-application", "actions-to-railway"],
    statement: "no application identity can enter or assume Project Owner authority",
  },

  // Request and content handling.
  {
    id: "request.persistedOperationsOnly",
    family: "request-budget",
    evidence: "SUITE",
    suite: "static-and-unit",
    boundaries: ["browser-to-application"],
    statement:
      "arbitrary production GraphQL documents and unknown persisted-operation hashes are refused",
  },
  {
    id: "request.resourceBudgets",
    family: "request-budget",
    evidence: "SUITE",
    suite: "postgres-integration",
    boundaries: ["browser-to-application", "api-to-postgresql"],
    statement:
      "oversized bodies and variables, invalid pagination, excessive result sizes, and operations beyond cumulative budgets are refused",
  },
  {
    id: "request.compositeLimits",
    family: "capacity-exhaustion",
    evidence: "SUITE",
    suite: "static-and-unit",
    boundaries: ["internet-to-caddy", "caddy-to-api", "browser-to-application"],
    statement:
      "per-source and per-User-operation limits compose, return privacy-safe retry guidance, and do not trust attacker-supplied forwarding headers",
  },
  {
    id: "request.originAndCors",
    family: "browser-safety",
    evidence: "SUITE",
    suite: "postgres-integration",
    boundaries: ["internet-to-caddy", "browser-to-application"],
    statement:
      "mutations reject missing or foreign Origin values and `/graphql` exposes neither credentialed nor cross-origin CORS",
  },
  {
    id: "content.injectionSurfaces",
    family: "content-injection",
    evidence: "SUITE",
    suite: "postgres-integration",
    boundaries: ["browser-to-application", "api-to-postgresql"],
    statement:
      "stored and reflected injection is refused through plain text, structured Lesson Materials, HTTPS links, localized values, validation errors, reports, and exports",
  },
  {
    id: "content.browserCapabilitiesAbsent",
    family: "browser-safety",
    evidence: "SUITE",
    suite: "role-journeys",
    boundaries: ["internet-to-caddy", "browser-to-application"],
    statement:
      "every external link carries `noopener` and `noreferrer`, so an opened tab reaches neither back through `window.opener` nor the page it came from",
  },

  // Integrity, replay, and concurrency.
  {
    id: "integrity.replayAndConcurrency",
    family: "replay-and-concurrency",
    evidence: "SUITE",
    suite: "postgres-integration",
    boundaries: ["browser-to-application", "api-to-postgresql"],
    statement:
      "replay and concurrent attempts around Booking, Seat Capacity, Waitlist promotion, Class Credits, scheduling, notification delivery, reporting snapshots and exports, and the Audit Log preserve their invariants",
  },
  {
    id: "integrity.idempotency",
    family: "replay-and-concurrency",
    evidence: "SUITE",
    suite: "postgres-integration",
    boundaries: ["browser-to-application", "api-to-postgresql"],
    statement:
      "idempotency returns the original outcome for matching reuse, rejects changed input, and duplicates no permanent business effect after the transport window",
  },
  {
    id: "integrity.databaseInvariants",
    family: "replay-and-concurrency",
    evidence: "SUITE",
    suite: "postgres-integration",
    boundaries: ["api-to-postgresql"],
    statement:
      "database constraints and transactional behaviour preserve invariants independently of application prechecks",
  },
  {
    id: "integrity.auditEvidence",
    family: "evidence-leakage",
    evidence: "SUITE",
    suite: "postgres-integration",
    boundaries: ["browser-to-application", "api-to-postgresql"],
    statement:
      "denied sensitive reads and accepted or rejected mutations leave the required redacted Audit evidence, carrying no secret and no sensitive content",
  },

  // Leakage, build, and public surface.
  {
    id: "build.artifactSecretScan",
    family: "evidence-leakage",
    evidence: "SUITE",
    suite: "static-and-unit",
    boundaries: ["repository-to-deployment"],
    statement:
      "the built browser and server artifacts carry no credential shape, no inline or published source map, and no private surface marker",
  },
  {
    id: "build.gitHistoryScan",
    family: "evidence-leakage",
    evidence: "OWNER",
    boundaries: ["repository-to-deployment"],
    statement:
      "the complete reachable Git history carries no credential, scanned before public launch",
  },
  {
    id: "build.publicConfigurationAllowlist",
    family: "evidence-leakage",
    evidence: "SUITE",
    suite: "static-and-unit",
    boundaries: ["repository-to-deployment", "browser-to-application"],
    statement:
      "only the deliberately public Auth0 client identifiers, Sentry DSN, and approved origins reach the browser; unknown browser configuration fails the gate",
  },
  {
    id: "leakage.telemetryAndErrors",
    family: "evidence-leakage",
    evidence: "SUITE",
    suite: "static-and-unit",
    boundaries: ["application-to-providers", "browser-to-application"],
    statement:
      "logs, GraphQL errors, reports, exports, caching, headers, and privacy-filtered Sentry events disclose no token, private input, reviewer content, or raw provider response",
  },
  {
    id: "surface.productionOnlyAbsent",
    family: "production-surface",
    evidence: "SUITE",
    suite: "postgres-integration",
    boundaries: ["browser-to-application", "caddy-to-api"],
    statement:
      "fake authentication, GraphiQL, arbitrary GraphQL execution, debug routes, internal services, diagnostics, maintenance controls, owner routes, and owner token audiences are absent from production",
  },
  {
    id: "build.dependencyIntegrity",
    family: "evidence-leakage",
    evidence: "SUITE",
    // Its own suite rather than a line inside the static one. A dependency
    // advisory is the check most likely to start failing without anybody
    // touching this repository, and folding it into the suite that also
    // typechecks would report a lockfile advisory as a broken build.
    suite: "dependency-integrity",
    boundaries: ["repository-to-deployment"],
    statement:
      "the production dependency audit reports no unremediated advisory at or above the accepted severity",
  },
  {
    id: "surface.browserPolicyEnforced",
    family: "browser-safety",
    evidence: "DEPLOYED",
    suite: "public-surface",
    boundaries: ["internet-to-caddy", "browser-to-application"],
    statement:
      "the live public origin emits exactly the versioned browser policy, carries no report-only header, and names no software",
  },
  {
    id: "build.sourceMapsNotServed",
    family: "evidence-leakage",
    evidence: "DEPLOYED",
    suite: "public-surface",
    boundaries: ["internet-to-caddy", "repository-to-deployment"],
    statement:
      "no source map is published in the deployment artifacts or served at the paths a map would occupy",
  },

  // Manual abuse cases. The policy lists eight, performed before public launch
  // and after a mapped Security-Relevant Change.
  {
    id: "manual.copiedCredentials",
    family: "shared-credential-automation",
    evidence: "OWNER",
    boundaries: ["browser-to-auth0", "browser-to-application"],
    statement:
      "copied shared credentials used through a script or modified client outside the public SPA reach only the advertised authority",
  },
  {
    id: "manual.tamperedRequestContext",
    family: "authorization-scope",
    evidence: "OWNER",
    boundaries: ["browser-to-application", "caddy-to-api"],
    statement:
      "altered acting-role context, operation hashes, identifiers, pagination, variables, Origin, and forwarding headers are refused",
  },
  {
    id: "manual.replayAndRace",
    family: "replay-and-concurrency",
    evidence: "OWNER",
    boundaries: ["browser-to-application", "api-to-postgresql"],
    statement:
      "replayed and raced state-changing operations leave one outcome and no duplicated permanent effect",
  },
  {
    id: "manual.guessedPrivatePaths",
    family: "production-surface",
    evidence: "OWNER",
    boundaries: ["internet-to-caddy", "caddy-to-api"],
    statement:
      "guessed internal, API, debug, GraphiQL, diagnostics, maintenance, and Project Owner paths are unreachable from the public origin",
  },
  {
    id: "manual.browserLeakageInspection",
    family: "token-extraction",
    evidence: "OWNER",
    boundaries: ["browser-to-auth0", "browser-to-application", "application-to-providers"],
    statement:
      "browser storage, history, address bar, network traffic, console, errors, cache behaviour, and privacy-filtered Sentry evidence disclose nothing private",
  },
  {
    id: "manual.hostileBrowserBehaviour",
    family: "browser-safety",
    evidence: "OWNER",
    boundaries: ["internet-to-caddy", "browser-to-application"],
    statement:
      "hostile framing, opener control, unsafe external navigation, MIME confusion, malicious structured Lesson Materials, and attacker-controlled localized or report content fail",
  },
  {
    id: "manual.boundedFailureUnderLoad",
    family: "capacity-exhaustion",
    evidence: "OWNER",
    boundaries: ["internet-to-caddy", "browser-to-application"],
    statement:
      "oversized, rapid, and repeated operations end in bounded, privacy-safe failure",
  },
  {
    id: "manual.denialLeavesStateUnchanged",
    family: "authorization-scope",
    evidence: "OWNER",
    boundaries: ["browser-to-application", "api-to-postgresql"],
    statement:
      "every denial leaves private data, durable state, secrets, and unintended cost-producing work unchanged",
  },

  // Live configuration assertions, compared against versioned expectations.
  {
    id: "configuration.caddy",
    family: "browser-safety",
    evidence: "OWNER",
    boundaries: ["internet-to-caddy", "caddy-to-api"],
    statement:
      "the sole public origin, trusted-proxy behaviour, intended routes, exact browser headers, HTTPS behaviour, and absence of private-service exposure match the versioned expectation",
  },
  {
    id: "configuration.auth0",
    family: "token-forgery",
    evidence: "OWNER",
    boundaries: ["browser-to-auth0", "application-to-providers"],
    statement:
      "the exact callback, logout, web-origin, and CORS values, the redirect PKCE and rotating refresh-token settings, and the absence of an iframe fallback match the versioned expectation",
  },
  {
    id: "configuration.sentry",
    family: "evidence-leakage",
    evidence: "OWNER",
    boundaries: ["application-to-providers"],
    statement:
      "the exact ingestion origin, privacy filtering, disabled PII, Session Replay, Feedback, Toolbar, screenshots, and attachments, and source maps bound to this release match the versioned expectation",
  },
  {
    id: "configuration.railway",
    family: "production-surface",
    evidence: "OWNER",
    boundaries: ["actions-to-railway", "caddy-to-api", "api-to-postgresql"],
    statement:
      "only Caddy is public, the API and PostgreSQL stay private, and the intended services, replicas, volumes, and scheduled jobs are present",
  },
  {
    id: "configuration.costCeiling",
    family: "capacity-exhaustion",
    evidence: "OWNER",
    boundaries: ["actions-to-railway"],
    statement:
      "the native billing warning and the $15 hard usage limit remain configured, with seven measured days and the projection recorded",
  },
  {
    id: "configuration.github",
    family: "shared-credential-automation",
    evidence: "OWNER",
    boundaries: ["actions-to-railway", "repository-to-deployment"],
    statement:
      "the protected production environment still requires the recorded Project Owner confirmation, and deployment, rebuild, recovery, and provider credentials retain their separation and least privilege",
  },
  {
    id: "configuration.application",
    family: "production-surface",
    evidence: "OWNER",
    boundaries: ["browser-to-application", "repository-to-deployment"],
    statement:
      "only the expected persisted-operation manifest is active, and production mock authentication, debug tooling, owner authority, and unsafe public configuration are absent",
  },

  // CSP rollout proof: report-only first, then the identical policy enforced.
  {
    id: "csp.reportOnlyJourneys",
    family: "browser-safety",
    evidence: "OWNER",
    boundaries: ["internet-to-caddy", "browser-to-auth0", "browser-to-application"],
    statement:
      "every required journey completed against the report-only policy with no unexplained violation",
  },
  {
    id: "csp.enforcedJourneys",
    family: "browser-safety",
    evidence: "OWNER",
    boundaries: ["internet-to-caddy", "browser-to-auth0", "browser-to-application"],
    statement:
      "the identical policy was enforced and the critical journeys were rerun against it",
  },

  // The deployed smoke suite, against the running deployment.
  {
    id: "smoke.anonymous",
    family: "authorization-scope",
    evidence: "DEPLOYED",
    suite: "deployed-smoke",
    boundaries: ["internet-to-caddy", "browser-to-application"],
    statement:
      "an anonymous caller discovers public sessions and Teacher Profiles while private fields and internal surfaces stay inaccessible",
  },
  {
    id: "smoke.student",
    family: "authorization-scope",
    evidence: "DEPLOYED",
    suite: "deployed-smoke",
    boundaries: ["browser-to-application"],
    statement:
      "the shared Student authenticates, discovers a session, creates and ends a commitment, and retrieves only its own permitted records",
  },
  {
    id: "smoke.teacher",
    family: "authorization-scope",
    evidence: "DEPLOYED",
    suite: "deployed-smoke",
    boundaries: ["browser-to-application"],
    statement:
      "the shared Teacher reaches only an assigned Class Roster inside the permitted relationship window and performs one permitted teacher action",
  },
  {
    id: "smoke.organizationManager",
    family: "authorization-scope",
    evidence: "DEPLOYED",
    suite: "deployed-smoke",
    boundaries: ["browser-to-application"],
    statement:
      "the shared Organization Manager retrieves reporting for exactly the correct Organization and Sponsorship scope",
  },
  {
    id: "smoke.platformAdministrator",
    family: "production-surface",
    evidence: "DEPLOYED",
    suite: "deployed-smoke",
    boundaries: ["browser-to-application"],
    statement:
      "the shared Platform Administrator performs one representative operation against disposable synthetic data while Project Owner and deployment operations remain nonexistent in the application",
  },
  {
    id: "smoke.crossRoleDenial",
    family: "authorization-scope",
    evidence: "DEPLOYED",
    suite: "deployed-smoke",
    boundaries: ["browser-to-application"],
    statement:
      "identifiers and requests replayed from each journey under the wrong role are denied privacy-safely",
  },
  {
    id: "smoke.deploymentBoundary",
    family: "production-surface",
    evidence: "DEPLOYED",
    suite: "deployed-smoke",
    boundaries: ["internet-to-caddy", "caddy-to-api", "api-to-postgresql"],
    // Deliberately narrower than the policy's sentence. The rest of that
    // sentence — readiness, the worker heartbeat, private API and PostgreSQL
    // exposure — is proved where it can be: the readiness gates run inside
    // Railway's private network as pre-deploy steps (ADR 0028 gives the API no
    // public address), and `configuration.railway` asserts the private
    // networking. Browser headers belong to `surface.browserPolicyEnforced`. A
    // statement claiming all of it would be a check recording a pass for
    // things this suite never looks at.
    statement:
      "the public origin enforces persisted operations, refuses an anonymous caller, and answers every denial privacy-safely",
  },

  // The applicable drills, read from the readiness exercises they already wrote.
  {
    id: "drill.backupRestoration",
    family: "capacity-exhaustion",
    evidence: "DRILL",
    boundaries: ["api-to-postgresql", "actions-to-railway"],
    statement:
      "an isolated backup restoration proved schema compatibility, canonical aggregates, and sampled ledger invariants inside the recovery-time target",
  },
  {
    id: "drill.changeTriggeredRecovery",
    family: "capacity-exhaustion",
    evidence: "DRILL",
    boundaries: ["api-to-postgresql", "actions-to-railway"],
    statement:
      "a change-triggered recovery drill returned the deployment to service with fixture reconciliation, a fresh worker heartbeat, and the deployed role journeys",
  },
] as const;

/** Whether this build defines a check, for results read back from storage. */
export function isSecurityCheck(id: string): boolean {
  return SECURITY_VERIFICATION_CATALOG.some((check) => check.id === id);
}

export function securityCheck(id: string): SecurityCheck | undefined {
  return SECURITY_VERIFICATION_CATALOG.find((check) => check.id === id);
}

/**
 * The threat model's accepted residual risks, as the only exceptions the gate
 * recognises.
 *
 * A finding that maps wholly to one of these may proceed with dated Project
 * Owner sign-off. A genuinely new risk requires an amendment to the threat
 * model and a rerun of the affected gate — the gate cannot invent an exception,
 * which is why this list is here rather than typed into a workflow input.
 */
export const ACCEPTED_RESIDUAL_RISKS = {
  "residual.sharedCredentialAccountability":
    "Shared demo credentials cannot provide individual accountability and can be automated within enforced limits",
  "residual.inMemoryTokenTheft":
    "In-memory tokens remain stealable after successful same-page script execution, malicious extension access, or browser or device compromise",
  "residual.syntheticDataImpact":
    "Synthetic data reduces privacy impact but not authorization, integrity, reputation, or cost impact",
  "residual.publicImplementationKnowledge":
    "Public implementation knowledge assists attackers; security never relies on obscurity",
  "residual.rateLimitEvasion":
    "In-memory rate-limit counters reset and distributed source addresses can evade per-source limits; no volumetric DDoS resistance is claimed",
  "residual.headersCannotRepairRendering":
    "Browser headers cannot repair unsafe rendering, vulnerable dependencies, or compromised trusted origins",
  "residual.providerAndSupplyChain":
    "Auth0, Railway, GitHub, Sentry, package registries, dependencies, and browsers remain provider and supply-chain dependencies",
  "residual.caddyAvailabilityChoke":
    "Caddy is an accepted availability choke point for the portfolio's scale and budget",
  "residual.outsideThreatBoundary":
    "Compromised maintainers, provider infrastructure, or end-user devices are outside the application threat boundary",
} as const;

export type AcceptedResidualRisk = keyof typeof ACCEPTED_RESIDUAL_RISKS;

export function isAcceptedResidualRisk(id: string): id is AcceptedResidualRisk {
  return Object.hasOwn(ACCEPTED_RESIDUAL_RISKS, id);
}

/**
 * Which of this gate's checks evidence which incident family of the
 * [operational readiness record](../../../../docs/operations/readiness-evidence.md).
 *
 * The readiness record has one row per incident family and blocks on any family
 * nothing exercised. Most of those families are proved by exactly the checks
 * this gate runs, so the gate writes their readiness exercises rather than
 * asking someone to run a second thing that would prove the same facts.
 *
 * `backups-and-recovery-verification` is deliberately absent: the two recovery
 * drills own that row and write it themselves. The gate reads their exercises
 * to fill in its own `drill.*` results, which is the direction that keeps one
 * fact in one place.
 */
export const SECURITY_GATE_READINESS_EVIDENCE: Readonly<
  Partial<Record<IncidentFamily, { exercise: string; checks: readonly string[] }>>
> = {
  "api-database-readiness": {
    exercise: "security-gate-deployment-readiness",
    checks: [
      "smoke.deploymentBoundary",
      "surface.browserPolicyEnforced",
      "configuration.caddy",
      "configuration.railway",
    ],
  },
  "worker-heartbeat-backlog-exhaustion": {
    exercise: "security-gate-worker-liveness",
    checks: ["smoke.deploymentBoundary", "configuration.railway"],
  },
  "canonical-rebuild-fixture-reconciliation": {
    exercise: "security-gate-fixture-integrity",
    checks: ["integrity.databaseInvariants", "configuration.railway"],
  },
  "notification-reconciliation": {
    exercise: "security-gate-notification-integrity",
    checks: ["integrity.replayAndConcurrency", "integrity.idempotency"],
  },
  "deployment-and-deployed-smoke": {
    exercise: "security-gate-deployed-smoke",
    checks: [
      "smoke.anonymous",
      "smoke.student",
      "smoke.teacher",
      "smoke.organizationManager",
      "smoke.platformAdministrator",
      "smoke.crossRoleDenial",
      "smoke.deploymentBoundary",
      "surface.browserPolicyEnforced",
      "build.sourceMapsNotServed",
    ],
  },
  "third-party-integrations": {
    exercise: "security-gate-provider-configuration",
    checks: ["configuration.auth0", "configuration.sentry", "identity.tokenValidation"],
  },
  "sentry-failure-patterns": {
    exercise: "security-gate-telemetry-privacy",
    checks: ["configuration.sentry", "leakage.telemetryAndErrors"],
  },
  "abusive-traffic-and-credential-exposure": {
    exercise: "security-gate-abuse-and-secrets",
    checks: [
      "request.compositeLimits",
      "request.resourceBudgets",
      "build.artifactSecretScan",
      "build.gitHistoryScan",
      "manual.copiedCredentials",
      "manual.boundedFailureUnderLoad",
    ],
  },
  "deployment-cost-ceiling": {
    exercise: "security-gate-cost-ceiling",
    checks: ["configuration.costCeiling"],
  },
};
