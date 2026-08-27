import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { createMarketplaceServer } from "../src/api/server.js";
import { latestMigrationName } from "../src/database/migrate.js";

const TRUSTED_PROXY_SECRET = "caddy-shared-secret-for-verified-source-context";

const runningServers: { close: () => void }[] = [];

type ServerOptions = Parameters<typeof createMarketplaceServer>[0];

const answeringApi = ((
  _request: unknown,
  response: { writeHead: (status: number) => void; end: () => void },
) => {
  response.writeHead(200);
  response.end();
}) as unknown as ServerOptions["api"];

// These limit checks answer before routing reaches GraphQL or PostgreSQL.
const unusedDatabase = {} as unknown as ServerOptions["db"];
const silentLogger = { warn: () => undefined } as unknown as ServerOptions["logger"];

afterEach(() => {
  for (const server of runningServers.splice(0)) server.close();
});

async function startServer(options: {
  sourceRequestLimit: number;
  trustedProxySecret?: string;
}) {
  const server = createMarketplaceServer({
    api: answeringApi,
    currentSchemaMigration: await latestMigrationName(),
    db: unusedDatabase,
    logger: silentLogger,
    sourceRequestLimit: options.sourceRequestLimit,
    ...(options.trustedProxySecret
      ? { trustedProxySecret: options.trustedProxySecret }
      : {}),
  });
  runningServers.push(server);

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return async (headers: Record<string, string> = {}, path = "/graphql") => {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { headers });
    await response.arrayBuffer();
    return response.status;
  };
}

function caddyContext(source: string) {
  return {
    "x-proxy-authorization": TRUSTED_PROXY_SECRET,
    "x-verified-source": source,
  };
}

describe("per-source request limits behind the single public origin", () => {
  it("gives each verified source its own budget", async () => {
    const request = await startServer({
      sourceRequestLimit: 2,
      trustedProxySecret: TRUSTED_PROXY_SECRET,
    });

    expect(await request(caddyContext("203.0.113.4"))).toBe(200);
    expect(await request(caddyContext("203.0.113.4"))).toBe(200);
    expect(await request(caddyContext("203.0.113.4"))).toBe(429);

    expect(await request(caddyContext("198.51.100.7"))).toBe(200);
  });

  it("refuses forwarded source context from a caller that is not the public origin", async () => {
    const request = await startServer({
      sourceRequestLimit: 100,
      trustedProxySecret: TRUSTED_PROXY_SECRET,
    });

    expect(await request({ "x-verified-source": "203.0.113.4" })).toBe(403);
    expect(await request({ "x-forwarded-for": "203.0.113.4" })).toBe(403);
    expect(
      await request({
        "x-proxy-authorization": "not-the-shared-secret",
        "x-verified-source": "203.0.113.4",
      }),
    ).toBe(403);
  });

  it("refuses trusted-proxy context that is missing or is not a single address", async () => {
    const request = await startServer({
      sourceRequestLimit: 100,
      trustedProxySecret: TRUSTED_PROXY_SECRET,
    });

    expect(await request({ "x-proxy-authorization": TRUSTED_PROXY_SECRET })).toBe(403);
    expect(await request(caddyContext("203.0.113.4, 198.51.100.7"))).toBe(403);
    expect(await request(caddyContext("client.example.test"))).toBe(403);
    expect(await request(caddyContext(""))).toBe(403);

    expect(await request(caddyContext("2001:db8::1"))).toBe(200);
  });

  it("keeps refused requests inside the budget of the connection they arrived on", async () => {
    const request = await startServer({
      sourceRequestLimit: 2,
      trustedProxySecret: TRUSTED_PROXY_SECRET,
    });

    expect(await request({ "x-forwarded-for": "203.0.113.4" })).toBe(403);
    expect(await request({ "x-forwarded-for": "198.51.100.7" })).toBe(403);
    expect(await request({ "x-forwarded-for": "192.0.2.9" })).toBe(429);
  });

  it("answers internal health probes that never pass through the public origin", async () => {
    const request = await startServer({
      sourceRequestLimit: 100,
      trustedProxySecret: TRUSTED_PROXY_SECRET,
    });

    expect(await request({}, "/health/live")).toBe(200);
  });

  it("keys on the connection itself when no trusted proxy is configured", async () => {
    const request = await startServer({ sourceRequestLimit: 2 });

    expect(await request({ "x-forwarded-for": "203.0.113.1" })).toBe(200);
    expect(await request(caddyContext("203.0.113.2"))).toBe(200);
    expect(await request(caddyContext("203.0.113.3"))).toBe(429);
  });
});
