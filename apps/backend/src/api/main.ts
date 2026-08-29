import pino from "pino";

import { createApi } from "./app.js";
import { acceptedPersistedOperations } from "./persisted-operation-releases.js";
import { loadPersistedOperationDocuments } from "./persisted-operations.js";
import { createMarketplaceServer } from "./server.js";
import { parseAppConfig } from "../config.js";
import { createDatabase } from "../database/database.js";
import { latestMigrationName } from "../database/migrate.js";

const config = parseAppConfig(process.env);
const logger = pino({
  base: null,
  redact: {
    paths: ["authorization", "headers", "graphqlVariables"],
    censor: "[REDACTED]",
  },
});
const db = createDatabase(config.DATABASE_URL);
const verificationUrl = new URL(config.DATABASE_URL);
verificationUrl.searchParams.set("options", "-c marketplace.maintenance_verifier=on");
const verificationDb = createDatabase(verificationUrl.toString());
// ADR 0038's rollout window: the API answers before the browser client is
// transitioned, so it accepts the documents of this release and the one still
// being served. Recording fails the start-up rather than silently narrowing to
// this build's own manifest, which would refuse every reviewer mid-rollout.
const persistedOperations = await acceptedPersistedOperations(db, {
  release: config.APP_RELEASE,
  documents: loadPersistedOperationDocuments(),
});
logger.info({
  event: "api.persisted-operations",
  release: config.APP_RELEASE,
  version: persistedOperations.version,
});

const api = createApi({
  authMode: config.AUTH_MODE,
  db,
  nodeEnv: config.NODE_ENV,
  persistedOperations,
  ...(config.AUTH0_AUDIENCE ? { auth0Audience: config.AUTH0_AUDIENCE } : {}),
  ...(config.AUTH0_ISSUER ? { auth0Issuer: config.AUTH0_ISSUER } : {}),
});
const maintenanceApi = createApi({
  authMode: config.AUTH_MODE,
  db: verificationDb,
  nodeEnv: config.NODE_ENV,
  persistedOperations,
  ...(config.AUTH0_AUDIENCE ? { auth0Audience: config.AUTH0_AUDIENCE } : {}),
  ...(config.AUTH0_ISSUER ? { auth0Issuer: config.AUTH0_ISSUER } : {}),
});
const server = createMarketplaceServer({
  api,
  currentSchemaMigration: await latestMigrationName(),
  db,
  logger,
  maintenanceApi,
  sourceRequestLimit: config.API_SOURCE_REQUEST_LIMIT,
  ...(config.API_TRUSTED_PROXY_SECRET
    ? { trustedProxySecret: config.API_TRUSTED_PROXY_SECRET }
    : {}),
  ...(config.PUBLIC_ORIGIN ? { publicOrigin: config.PUBLIC_ORIGIN } : {}),
});

server.listen(config.API_PORT, "0.0.0.0", () => {
  logger.info({ event: "api.started", port: config.API_PORT });
});

async function shutdown() {
  server.close();
  await db.destroy();
  await verificationDb.destroy();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
