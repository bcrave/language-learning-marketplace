import { createServer, type ServerResponse } from "node:http";

import { sql } from "kysely";
import type { Logger } from "pino";

import type { Database } from "../database/database.js";
import type { OperationalCounters } from "../observability/operational-counters.js";
import type { OperationalWatch } from "../observability/operational-watch.js";
import {
  readWorkerHeartbeat,
  workerHeartbeatIsFresh,
} from "../worker/worker-heartbeat.js";
import type { createApi } from "./app.js";
import { createWindowedBudget, RETRY_AFTER_SECONDS } from "./resource-budget.js";
import {
  connectionSourceFor,
  createVerifiedSourceReader,
  UNATTRIBUTED_SOURCE,
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
   * The sole public origin of ADR 0028, already normalized to a bare origin.
   * When it is configured, every request to `/graphql` must name it in
   * `Origin`: the threat model keeps that check as defence in depth behind the
   * absent CORS policy, so a cross-site page cannot spend a reviewer's session
   * even if a browser were to send the request.
   *
   * The threat model scopes the check to state-changing requests. This is
   * deliberately the stricter superset, because the transport has not resolved
   * a persisted identifier into a document yet and so cannot tell a read from
   * a write — and because every operation the browser client sends is a POST
   * from this one origin, so the wider rule costs a legitimate caller nothing.
   */
  publicOrigin?: string;
  /** Deployed loopback-only API backed by the verification database pool. */
  maintenanceApi?: ReturnType<typeof createApi>;
  /**
   * Where the operator guide's abuse thresholds are counted. The transport is
   * the only place that sees a refusal, and the counters keep only aggregates:
   * a source decides one bucket under a per-process salt and is not retained.
   */
  counters?: OperationalCounters;
  /**
   * Where a fact the transport detects outright is raised. The one it can see
   * that no threshold covers is an internal probe reached from the public
   * origin, which the threat model treats as an immediate incident.
   */
  incidents?: OperationalWatch;
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
    const proxyVerifiedSource = verifiedSourceFor(request);
    const source = probesHealth ? connectionSource : proxyVerifiedSource;
    const loopbackVerification = options.maintenanceApi !== undefined
      && (connectionSource === "127.0.0.1"
        || connectionSource === "::1"
        || connectionSource === "::ffff:127.0.0.1");

    // Refusals stay inside a budget too. A misconfigured origin would
    // otherwise buy an unbounded path through the API and an unbounded run of
    // log lines by simply presenting nothing.
    const budgetKey = source ?? connectionSource ?? UNATTRIBUTED_SOURCE;
    if (sourceRequests.consume(budgetKey, now().getTime()) !== "ACCEPTED") {
      // Counted apart from abuse whenever the source could not be verified. The
      // operator guide is explicit that a run of `source.unverified` refusals is
      // a Caddy trusted-proxy misconfiguration failing closed and "not abuse":
      // charging them to the abuse thresholds would point the owner at
      // containment the guide warns against, and would do it under one shared
      // bucket that names no caller anyway.
      if (source === null) options.counters?.recordUnverifiedSourceRefusal(now().getTime());
      else options.counters?.recordRefusedRequest(source, now().getTime());
      response.setHeader("retry-after", String(RETRY_AFTER_SECONDS));
      sendJson(response, 429, { error: "Request limit exceeded" });
      return;
    }
    if (source === null) {
      options.counters?.recordUnverifiedSourceRefusal(now().getTime());
      options.logger.warn({ event: "source.unverified" });
      sendJson(response, 403, { error: "Request source could not be verified" });
      return;
    }

    // ADR 0028 gives the API no public address, and the probes are reached over
    // private networking. Where a trusted-proxy secret is configured at all,
    // context Caddy verified can only mean the request came through the public
    // origin — which is the threat model's "internal endpoint reached
    // publicly", and an immediate incident rather than a refusal to rate-limit.
    if (
      probesHealth &&
      options.trustedProxySecret !== undefined &&
      proxyVerifiedSource !== null
    ) {
      options.logger.warn({ event: "health.reached-publicly" });
      void options.incidents
        ?.report("security.internal-endpoint-reached-publicly", { operation: path })
        .catch(() => undefined);
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
