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

1. **Database** — `pnpm db:migrate` applies the expand-and-contract migrations this release ships.
2. **API** — Railway holds the deployment until `/health/ready` proves PostgreSQL access and that the newest migration this build ships is applied.
3. **Worker** — `pnpm --filter @marketplace/backend release:worker-gate` waits for a fresh PostgreSQL heartbeat carrying this release. The worker speaks no HTTP; `/health/worker` on the API serves the same fact to internal probing.
4. **Browser client** — the Caddy service, the deployment's only public origin.
5. **Deployed smoke journey** — `pnpm --filter @marketplace/backend release:smoke` signs in as [ADR 0019](docs/adr/0019-use-resettable-role-specific-demo-accounts.md)'s shared identities and walks authentication, Interface Locale, Class Session Discovery, Booking, Student Cancellation, and the Audit Entries those mutations leave behind.

A failed stage stops every later one. Service variables, deployment tokens, and the smoke journey's credentials live in their least-privilege stores and never reach the browser build or a workflow log; `.env.example` lists the safe placeholders.
