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
