import { createHash, randomBytes } from "node:crypto";
import { createServer, type ServerResponse } from "node:http";

import { sql } from "kysely";
import type { Logger } from "pino";

import type { Database } from "../database/database.js";
import type { createApi } from "./app.js";

const GRAPHQL_BODY_LIMIT_BYTES = 1_000_000;
const SOURCE_REQUEST_LIMIT = 120;
const RATE_LIMIT_WINDOW_MILLISECONDS = 60_000;
const CURRENT_SCHEMA_MIGRATION = "0005_curriculum_administration.sql";

class SourceRateLimiter {
  readonly #counters = new Map<string, { count: number; startedAt: number }>();
  readonly #salt = randomBytes(32);

  accepts(source: string, now = Date.now()) {
    const key = createHash("sha256").update(this.#salt).update(source).digest("base64url");
    const current = this.#counters.get(key);
    if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MILLISECONDS) {
      this.#counters.set(key, { count: 1, startedAt: now });
      return true;
    }
    current.count += 1;
    return current.count <= SOURCE_REQUEST_LIMIT;
  }
}

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
  db: Database;
  logger: Logger;
}) {
  const rateLimiter = new SourceRateLimiter();

  return createServer(async (request, response) => {
    const source = request.socket.remoteAddress ?? "unknown";
    if (!rateLimiter.accepts(source)) {
      response.setHeader("retry-after", "60");
      sendJson(response, 429, { error: "Request limit exceeded" });
      return;
    }

    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    if (request.method === "GET" && path === "/health/live") {
      sendJson(response, 200, { status: "live" });
      return;
    }
    if (request.method === "GET" && path === "/health/ready") {
      try {
        await sql`select 1`.execute(options.db);
        await options.db
          .selectFrom("schema_migrations")
          .select("name")
          .where("name", "=", CURRENT_SCHEMA_MIGRATION)
          .executeTakeFirstOrThrow();
        sendJson(response, 200, { status: "ready" });
      } catch {
        options.logger.warn({ event: "readiness.failed" });
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
    }

    await options.api(request, response);
  });
}
