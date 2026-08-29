import { createServer, type ServerResponse } from "node:http";

import { sql } from "kysely";
import type { Logger } from "pino";

import type { Database } from "../database/database.js";
import {
  readWorkerHeartbeat,
  workerHeartbeatIsFresh,
} from "../worker/worker-heartbeat.js";
import type { createApi } from "./app.js";
import { createWindowedBudget, RETRY_AFTER_SECONDS } from "./resource-budget.js";
import {
  connectionSourceFor,
  createVerifiedSourceReader,
  VERIFIED_SOURCE_CONTEXT_HEADER,
} from "./verified-source.js";

const GRAPHQL_BODY_LIMIT_BYTES = 1_000_000;
const LIVENESS_PATH = "/health/live";
const READINESS_PATH = "/health/ready";
const WORKER_READINESS_PATH = "/health/worker";

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: Record<string, string>,
) {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

export function createMarketplaceServer(options: {
  api: ReturnType<typeof createApi>;
  /** The schema this build expects, from `latestMigrationName()`. */
  currentSchemaMigration: string;
  db: Database;
  logger: Logger;
  now?: () => Date;
  sourceRequestLimit: number;
  trustedProxySecret?: string;
  /**
   * The sole public origin of ADR 0028. When it is configured, a state-changing
   * request must name it in `Origin`: the threat model keeps that check as
   * defence in depth behind the absent CORS policy, so a cross-site page cannot
   * spend a reviewer's session even if a browser were to send the request.
   */
  publicOrigin?: string;
  /** Deployed loopback-only API backed by the verification database pool. */
  maintenanceApi?: ReturnType<typeof createApi>;
}) {
  const now = options.now ?? (() => new Date());
  // ADR 0025's per-source request budget, keyed by a salted hash so a source
  // address decides one request and is never retained in a readable form.
  const sourceRequests = createWindowedBudget(options.sourceRequestLimit);
  const verifiedSourceFor = createVerifiedSourceReader(options.trustedProxySecret);

  return createServer(async (request, response) => {
    const path = new URL(request.url ?? "/", "http://localhost").pathname;

    // The platform probes liveness and readiness over private networking
    // rather than through Caddy, and ADR-0038 verifies the API before the
    // public origin is deployed at all, so probes key on the connection they
    // arrive on. Everything else must carry context Caddy verified.
    const probesHealth =
      request.method === "GET" &&
      (path === LIVENESS_PATH ||
        path === READINESS_PATH ||
        path === WORKER_READINESS_PATH);
    const connectionSource = connectionSourceFor(request);
    const source = probesHealth ? connectionSource : verifiedSourceFor(request);
    const loopbackVerification = options.maintenanceApi !== undefined
      && (connectionSource === "127.0.0.1"
        || connectionSource === "::1"
        || connectionSource === "::ffff:127.0.0.1");

    // Refusals stay inside a budget too. A misconfigured origin would
    // otherwise buy an unbounded path through the API and an unbounded run of
    // log lines by simply presenting nothing.
    if (
      sourceRequests.consume(
        source ?? connectionSource ?? "unattributable",
        now().getTime(),
      ) !== "ACCEPTED"
    ) {
      response.setHeader("retry-after", String(RETRY_AFTER_SECONDS));
      sendJson(response, 429, { error: "Request limit exceeded" });
      return;
    }
    if (source === null) {
      options.logger.warn({ event: "source.unverified" });
      sendJson(response, 403, { error: "Request source could not be verified" });
      return;
    }

    if (request.method === "GET" && path === LIVENESS_PATH) {
      sendJson(response, 200, { status: "live" });
      return;
    }

    // A Canonical Data Rebuild is controlled outside the public application.
    // Reviewers see only a stable maintenance response; holder, correlation,
    // reason, and recovery evidence remain in the protected owner workflow.
    if (
      (request.method === "GET" &&
        (path === READINESS_PATH || path === WORKER_READINESS_PATH)) ||
      (request.method === "POST" && path === "/graphql")
    ) {
      try {
        const maintenance = await options.db.selectFrom("maintenance_state")
          .select("state")
          .where("singleton", "=", true)
          .executeTakeFirstOrThrow();
        if (maintenance.state !== "AVAILABLE" && !loopbackVerification) {
          response.setHeader("retry-after", "60");
          sendJson(response, 503, { status: "maintenance" });
          return;
        }
      } catch {
        options.logger.warn({ event: "maintenance.state.unreadable" });
        sendJson(response, 503, { status: "unavailable" });
        return;
      }
    }
    if (request.method === "GET" && path === READINESS_PATH) {
      try {
        await sql`select 1`.execute(options.db);
        await options.db
          .selectFrom("schema_migrations")
          .select("name")
          .where("name", "=", options.currentSchemaMigration)
          .executeTakeFirstOrThrow();
        sendJson(response, 200, { status: "ready" });
      } catch {
        options.logger.warn({ event: "readiness.failed" });
        sendJson(response, 503, { status: "unavailable" });
      }
      return;
    }

    // ADR 0038 requires the worker live before the browser client moves to the
    // new release, and the worker speaks no HTTP. It writes a heartbeat to
    // PostgreSQL instead, and this probe is where a release gate reads it.
    if (request.method === "GET" && path === WORKER_READINESS_PATH) {
      try {
        const heartbeat = await readWorkerHeartbeat(options.db);
        if (!workerHeartbeatIsFresh(heartbeat, now())) {
          options.logger.warn({ event: "worker.heartbeat.stale" });
          sendJson(response, 503, { status: "unavailable" });
          return;
        }
        // The heartbeat's own instant travels with it: a release gate needs to
        // watch it advance, because a single write from a minute ago satisfies
        // any number of probes inside the three-minute staleness window.
        sendJson(response, 200, {
          status: "ready",
          release: heartbeat.release,
          observedAt: heartbeat.observedAt.toISOString(),
        });
      } catch {
        options.logger.warn({ event: "worker.heartbeat.unreadable" });
        sendJson(response, 503, { status: "unavailable" });
      }
      return;
    }

    if (request.method === "POST" && path === "/graphql") {
      const contentLength = Number(request.headers["content-length"]);
      if (
        !Number.isSafeInteger(contentLength) ||
        contentLength < 0 ||
        contentLength > GRAPHQL_BODY_LIMIT_BYTES
      ) {
        sendJson(response, 413, { error: "GraphQL request body is invalid or too large" });
        return;
      }

      // The loopback verification API is not reached through the public origin
      // and names no origin of its own, so the check that guards the public one
      // would only ever refuse it.
      if (
        options.publicOrigin !== undefined &&
        !loopbackVerification &&
        request.headers.origin !== options.publicOrigin
      ) {
        options.logger.warn({ event: "origin.refused" });
        sendJson(response, 403, { error: "Request origin is not permitted" });
        return;
      }
    }

    // The GraphQL layer keys ADR 0025's denied-authorization budget on the
    // source this transport verified, so it travels as a header the transport
    // owns: assigning it discards anything a caller sent under the same name.
    request.headers[VERIFIED_SOURCE_CONTEXT_HEADER] = source;

    await (loopbackVerification && path === "/graphql" ? options.maintenanceApi! : options.api)(request, response);
  });
}
