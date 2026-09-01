import { defineConfig, devices } from "@playwright/test";

import { SUPPORTED_BROWSERS } from "./apps/web/test/e2e/support/browser-matrix.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const databaseEnvironment = databaseUrl
  ? `DATABASE_URL=${databaseUrl}`
  : "DATABASE_URL=postgres://marketplace:marketplace@127.0.0.1:5433/marketplace E2E_USE_TESTCONTAINERS=true";
// Every browser context reaches the API through loopback, so the whole suite
// shares one source address and one ADR-0025 per-source budget. Raise it here
// so the suite is not throttled as though it were a single person.
const apiEnvironment = `${databaseEnvironment} AUTH_MODE=fake NODE_ENV=test API_PORT=4000 API_SOURCE_REQUEST_LIMIT=10000`;

export default defineConfig({
  testDir: "./apps/web/test/e2e",
  fullyParallel: false,
  // The role journeys book, correct, export, and revoke against one seeded
  // database, so two of them running at once would race over the same
  // Sponsorship and the same Class Session. Playwright would still parallelize
  // across spec files without this, and the resulting failure would look like a
  // product defect rather than the test-isolation problem it is. CI gets its
  // parallelism from running one browser per job instead.
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  projects: SUPPORTED_BROWSERS.map(({ device, project }) => ({
    name: project,
    use: { ...devices[device] },
  })),
  // Never reuse a server this config did not start. The API server owns the
  // ephemeral database and the raised request limit above, so an unrelated
  // process already holding a port would silently supply neither: the suite
  // would run against seeded-over data under the production budget and fail
  // as though the application were broken. Refusing the port says so plainly.
  webServer: [
    {
      command: `pnpm --filter @marketplace/backend build:test && ${apiEnvironment} pnpm --filter @marketplace/backend start:test-api`,
      port: 4000,
      reuseExistingServer: false,
      // Starting this server means building the backend, starting a PostgreSQL
      // container, migrating it, and loading the whole canonical fixture set
      // before the first request. Playwright's default minute is enough only
      // when nothing else is competing for the machine, and the matrix runner
      // does this three times in a row.
      timeout: 180_000,
    },
    {
      command:
        "VITE_GRAPHQL_URL=http://127.0.0.1:4000/graphql VITE_DEMO_USER_ID=00000000-0000-4000-8000-000000000001 pnpm --filter @marketplace/web build:test && pnpm --filter @marketplace/web preview",
      port: 5173,
      reuseExistingServer: false,
      // This command builds the client before it serves it, and Playwright's
      // default minute covers that only on an idle machine. The matrix runner
      // rebuilds once per engine, so a busy machine times the third one out and
      // reports it as the engine failing rather than the build being slow.
      timeout: 180_000,
    },
  ],
});
