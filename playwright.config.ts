import { defineConfig, devices } from "@playwright/test";

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
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `pnpm --filter @marketplace/backend build:test && ${apiEnvironment} pnpm --filter @marketplace/backend start:test-api`,
      port: 4000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        "VITE_GRAPHQL_URL=http://127.0.0.1:4000/graphql VITE_DEMO_USER_ID=00000000-0000-4000-8000-000000000001 pnpm --filter @marketplace/web build:test && pnpm --filter @marketplace/web preview",
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
