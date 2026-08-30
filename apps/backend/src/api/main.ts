import { createApi } from "./app.js";
import { acceptedPersistedOperations } from "./persisted-operation-releases.js";
import { loadPersistedOperationDocuments } from "./persisted-operations.js";
import { createMarketplaceServer } from "./server.js";
import { parseAppConfig } from "../config.js";
import { createDatabase } from "../database/database.js";
import { latestMigrationName } from "../database/migrate.js";
import { createMarketplaceLogger, logOperationalEvent } from "../observability/correlated-logger.js";
import { createOperationalCounters } from "../observability/operational-counters.js";
import { createOperationalWatch, startOperationalWatch } from "../observability/operational-watch.js";
import { createTelemetryReporter } from "../observability/telemetry.js";

const config = parseAppConfig(process.env);
const logger = createMarketplaceLogger({ release: config.APP_RELEASE });
const telemetry = createTelemetryReporter({
  logger,
  release: config.APP_RELEASE,
  environment: config.NODE_ENV,
  ...(config.SENTRY_DSN ? { dsn: config.SENTRY_DSN } : {}),
});
const counters = createOperationalCounters();
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
logOperationalEvent(logger, "info", {
  event: "api.persisted-operations",
  release: config.APP_RELEASE,
  persistedOperationManifestVersion: persistedOperations.version,
});

const api = createApi({
  authMode: config.AUTH_MODE,
  db,
  nodeEnv: config.NODE_ENV,
  operationalCounters: counters,
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
// The transport raises one condition outright rather than by polling, so it
// needs the same durable lifecycle the watch's own readings go through.
const incidents = createOperationalWatch({
  db,
  release: config.APP_RELEASE,
  counters,
  reporter: telemetry,
});
const server = createMarketplaceServer({
  api,
  counters,
  incidents,
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

// The operator guide's thresholds are evaluated here rather than in the worker:
// a stale worker heartbeat is one of the conditions, and a watch that stops
// when the worker stops would never raise it.
const watch = startOperationalWatch({
  db,
  release: config.APP_RELEASE,
  counters,
  logger,
  reporter: telemetry,
});

server.listen(config.API_PORT, "0.0.0.0", () => {
  logOperationalEvent(logger, "info", { event: "api.started", release: config.APP_RELEASE });
});

async function shutdown() {
  watch.stop();
  server.close();
  await telemetry.flush();
  await db.destroy();
  await verificationDb.destroy();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
