# Language Learning Marketplace

The first walking slice opens a localized Student workspace from a persisted User through PostgreSQL and a task-oriented GraphQL API. Local authentication uses an isolated fake identity adapter; production configuration rejects that adapter before startup.

The deployed API executes only the GraphQL documents the build produced ([ADR 0024](docs/adr/0024-restrict-production-to-persisted-graphql-operations.md)): `pnpm codegen` writes every client operation into `apps/web/src/generated/persisted-documents.json`, the browser sends the identifier instead of a document, and arbitrary documents, GraphiQL, and a cross-origin CORS policy are absent from production. Local development keeps all three.

## Requirements

- Node.js 24.15.0
- pnpm 11.0.0 through Corepack
- Docker Desktop

## Run locally

```sh
corepack enable
corepack pnpm install
docker compose up -d postgres
DATABASE_URL=postgres://marketplace:marketplace@127.0.0.1:5433/marketplace AUTH_MODE=fake corepack pnpm db:seed
DATABASE_URL=postgres://marketplace:marketplace@127.0.0.1:5433/marketplace AUTH_MODE=fake VITE_DEMO_USER_ID=00000000-0000-4000-8000-000000000001 corepack pnpm dev
```

Open [http://127.0.0.1:5173/student](http://127.0.0.1:5173/student). The fake adapter establishes only the User identity; the API still loads the Student Role Assignment from PostgreSQL.

The Compose service is an ordinary, unprivileged PostgreSQL container. It exposes container port 5432 on host port 5433 and mounts neither host directories nor the Docker socket.

## Verify

```sh
corepack pnpm codegen
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm test:component
corepack pnpm build && corepack pnpm verify:public-artifacts
corepack pnpm test:integration
corepack pnpm test:e2e
```

The integration project creates an unprivileged, disposable PostgreSQL container for each test file. Unit and component projects remain database-independent.

`test:e2e` runs the role journeys once per [supported browser](docs/accessibility-statement.md#tested-combinations) — Chromium, Gecko, and WebKit — as three separate Playwright invocations, which is also how CI runs them. Each invocation starts its own API server and its own disposable database, and that isolation is required rather than incidental: the journeys consent to preferences for the first time, hold the one Report Export allowed in flight, and leave Audit Entries behind, so engines sharing a database would fail describing a product that works. Add `--project=chromium` to run a single engine while reproducing a failure.

Passing `TEST_DATABASE_URL` points every invocation at one long-lived database instead. Loading the canonical fixtures restores the identities but not the mutable state a previous run created, so use it for a single engine at a time rather than for a full matrix run.

## Release

Railway service autodeploys stay disabled. The serialized `Release` workflow orchestrates a deployment from the protected `production` environment after `Quality` passes on `main`, in the order [ADR 0038](docs/adr/0038-deploy-api-first-and-frontend-last.md) requires:

1. **API, with the database ahead of it** — its Railway pre-deploy applies the expand-and-contract migrations this release ships and binds [ADR 0019](docs/adr/0019-use-resettable-role-specific-demo-accounts.md)'s shared reviewer identities to the Auth0 tenant. Railway then holds the deployment until `/health/ready` proves PostgreSQL access and that the newest migration this build ships is applied.
2. **Worker** — it writes a PostgreSQL heartbeat naming its release as it starts.
3. **Browser client** — the Caddy service, the deployment's only public origin. Its pre-deploy is the gate between the API and the client: three consecutive `/health/ready` successes, then a `/health/worker` heartbeat that is fresh, on this release, and observably still advancing — a heartbeat written once by a worker that then died is refused.
4. **Public surface** — `pnpm --filter @marketplace/backend release:public-surface` reads the deployed public origin as a browser does: it compares every header with the versioned policy of [ADR 0028](docs/adr/0028-use-a-single-public-origin.md), and requests the path each first-party asset's source map would occupy. Drift or a served map blocks the release.
5. **Deployed smoke journey** — `pnpm --filter @marketplace/backend release:smoke` signs in as each of the four shared identities and walks their journeys: authentication and Interface Locale, Class Session Discovery, Booking and Student Cancellation, the assigned Class Roster and one permitted Teacher action, the Organization Manager's scoped reporting, one representative Platform Administrator operation, the cross-role replays those journeys must be refused, and the Audit Entries every mutation leaves behind. It speaks the public boundary's own dialect: a persisted operation identifier and the single public origin, exactly as the browser client does. Every state-changing step is a matched pair that asserts the reading it started from, so the journey leaves reviewer state where it found it.

A failed stage stops every later one, and a failed job is the owner-attention route for deployment incidents.

## Release gate

Publishing is gated on the fail-closed [Security Release Gate](docs/security-verification.md), run by the protected `Security Gate` workflow before a public launch and again after any Security-Relevant Change. It runs the automated suites, records what each proved as the verification catalog's stable check identifiers, reads back the manual abuse cases, live configuration assertions and CSP journeys the Project Owner recorded through the `Security Evidence` workflow, reads the two recovery drills from the readiness exercises they wrote themselves, and assembles one dated Security Gate Record for the exact candidate.

A required check with no result blocks the release exactly as a failed one does, a failed required check cannot be waived, and only a finding that maps wholly to a residual risk the [threat model](docs/threat-model.md) already accepts may proceed — with dated Project Owner sign-off. The gate also writes the operational readiness exercises its checks evidence, so [readiness evidence](docs/operations/readiness-evidence.md) and the gate agree about the same candidate rather than being assembled separately.

The worker advances only manifest-designated rolling Class Sessions on the hour.
The protected `Canonical Data Rebuild` workflow also runs nightly and can be
dispatched manually with a non-secret reason and explicit maintenance
acknowledgement. It shares the release queue, returns GraphQL and readiness probes
as reviewer-safe maintenance while PostgreSQL drains admitted writes, replaces
mutable business data transactionally, validates and reconciles the new fixture
generation, and retains privacy-safe start and terminal Audit Entries. A failed
attempt rolls back and retries once inside that dispatch; a later attempt must be a
fresh protected dispatch, not a workflow rerun.

An indeterminate attempt is handled only through the separate protected
`Canonical Data Recovery` workflow: assess first, then use a new approved dispatch
for verify-and-reopen or a clean canonical rebuild. Failed post-rebuild role smokes
immediately restore fail-closed maintenance and require the same recovery path.

The database work and both readiness gates run as Railway pre-deploy commands rather than workflow steps ([`deploy/railway/`](deploy/railway/)). That is deliberate: the API has no public address ([ADR 0028](docs/adr/0028-use-a-single-public-origin.md)), its health probes are internal, and GitHub holds no database credential ([ADR 0039](docs/adr/0039-separate-public-client-configuration-from-secrets.md)). The smoke journey's own Auth0 principal is the one documented exception, recorded in [ADR 0060](docs/adr/0060-automate-the-deployed-smoke-journey.md). `.env.example` lists the safe placeholders.

## Observe

The API answers three internal probes over Railway private networking: `/health/live`
is process health, `/health/ready` proves PostgreSQL access and that the newest
migration this build ships is applied, and `/health/worker` reads the heartbeat the
non-HTTP worker writes to PostgreSQL. None of them is publicly addressable.

A watch inside the API evaluates the [operator guide](docs/operations/operator-guide.md)'s
application-detected thresholds every 30 seconds and sends private alerts through
Sentry email ([ADR 0061](docs/adr/0061-evaluate-private-alerts-inside-the-api.md)).
An incident sends one confirmation alert, one more if its severity rises, and one
recovery notification — never a reminder — and that lifecycle is durable, so a
restart during an incident does not re-announce it. Both the browser and the API
run every event through one shared allowlist filter: authorization data, GraphQL
variables, URL query strings, contact details, and reviewer-entered content do not
travel, and Session Replay, user Feedback, screenshots, and attachments are never
added to the browser SDK at all.

The `Owner Diagnostics` workflow prints the sanitized current-state summary —
readiness, worker heartbeat and queue, fixture generation and maintenance lease,
notification reconciliation, and open incidents. Reading changes nothing and is
safe to dispatch during maintenance. It is also where the owner records a
verification only a person can perform — an authorization smoke after abusive
traffic, an integration smoke, a rotated credential — against the incident's
correlation identifier, and where the guide's daily cost projection is made from
the figures Railway shows. The public application exposes no diagnostics surface
and no owner route.

The policy states who evaluates every threshold, including the conditions nothing
in the deployment detects: a secret leaving its approved store, an authorization
that failed open, an unauthorized mutation that committed. Those are found by the
Security Release Gate or by a person, and the policy records the response so it is
not improvised. Source maps are still not uploaded to Sentry — that needs an
owner-provisioned Sentry auth token, so ADR 0022's stack-frame mapping remains
outstanding.

## Accessibility

The role journeys run in Chromium, Gecko, and WebKit, in English and Spanish, and
scan every workspace with axe-core as they go; keyboard-only reachability, focus
visibility, focus not obscured by the sticky bars, 320-pixel reflow, 200% text
resize, reduced motion, and error recovery are asserted alongside them. Serious
and critical findings fail the build.

The [accessibility statement](docs/accessibility-statement.md) records what was
tested and what is known not to work, and the [manual review
record](docs/accessibility-review.md) holds the cases only a person can perform —
VoiceOver with Safari above all. Neither claims certification or conformance: the
demonstration has had no independent audit and no assistive-technology user
testing, and the statement says so first.
