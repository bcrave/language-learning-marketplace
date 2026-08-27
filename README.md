# Language Learning Marketplace

The first walking slice opens a localized Student workspace from a persisted User through PostgreSQL and a task-oriented GraphQL API. Local authentication uses an isolated fake identity adapter; production configuration rejects that adapter before startup.

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
corepack pnpm test:integration
TEST_DATABASE_URL=postgres://marketplace:marketplace@127.0.0.1:5433/marketplace corepack pnpm test:e2e
```

The integration project creates an unprivileged, disposable PostgreSQL container for each test file. Chromium uses a separate migrated Compose/CI database. Unit and component projects remain database-independent.

## Release

Railway service autodeploys stay disabled. The serialized `Release` workflow orchestrates a deployment from the protected `production` environment after `Quality` passes on `main`, in the order [ADR 0038](docs/adr/0038-deploy-api-first-and-frontend-last.md) requires:

1. **API, with the database ahead of it** — its Railway pre-deploy applies the expand-and-contract migrations this release ships and binds [ADR 0019](docs/adr/0019-use-resettable-role-specific-demo-accounts.md)'s shared reviewer identities to the Auth0 tenant. Railway then holds the deployment until `/health/ready` proves PostgreSQL access and that the newest migration this build ships is applied.
2. **Worker** — it writes a PostgreSQL heartbeat naming its release as it starts.
3. **Browser client** — the Caddy service, the deployment's only public origin. Its pre-deploy is the gate between the API and the client: three consecutive `/health/ready` successes, then a `/health/worker` heartbeat that is fresh, on this release, and observably still advancing — a heartbeat written once by a worker that then died is refused.
4. **Deployed smoke journey** — `pnpm --filter @marketplace/backend release:smoke` signs in as the shared identities and walks authentication, Interface Locale, Class Session Discovery, Booking, Student Cancellation, and the Audit Entries those mutations leave behind.

A failed stage stops every later one, and a failed job is the owner-attention route for deployment incidents.

The database work and both readiness gates run as Railway pre-deploy commands rather than workflow steps ([`deploy/railway/`](deploy/railway/)). That is deliberate: the API has no public address ([ADR 0028](docs/adr/0028-use-a-single-public-origin.md)), its health probes are internal, and GitHub holds no database credential ([ADR 0039](docs/adr/0039-separate-public-client-configuration-from-secrets.md)). The smoke journey's own Auth0 principal is the one documented exception, recorded in [ADR 0060](docs/adr/0060-automate-the-deployed-smoke-journey.md). `.env.example` lists the safe placeholders.
