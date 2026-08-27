import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApi } from "../src/api/app.js";
import { createMarketplaceServer } from "../src/api/server.js";
import { createDatabase, type Database } from "../src/database/database.js";
import { latestMigrationName, migrateDatabase } from "../src/database/migrate.js";
import {
  MARKETPLACE_WORKER_NAME,
  WORKER_HEARTBEAT_STALE_MILLISECONDS,
  readWorkerHeartbeat,
  startWorkerHeartbeat,
  writeWorkerHeartbeat,
} from "../src/worker/worker-heartbeat.js";

// ADR 0038 releases the database, then the API, then the worker, and only then
// the browser client. These are the probes each of those transitions waits on,
// exercised over HTTP exactly as the release gate reaches them.
describe("deployment readiness probes", () => {
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  let baseUrl: string;
  let currentSchemaMigration: string;
  let closeServer: () => void;
  let now = new Date("2026-08-27T12:00:00.000Z");

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `readiness_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    currentSchemaMigration = await latestMigrationName();

    const server = createMarketplaceServer({
      api: createApi({ db, authMode: "fake", nodeEnv: "test" }),
      currentSchemaMigration,
      db,
      logger: { warn: () => undefined } as never,
      now: () => now,
      sourceRequestLimit: 10_000,
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    closeServer = () => server.close();
  }, 180_000);

  afterAll(async () => {
    closeServer?.();
    await db?.destroy();
    await postgres?.stop();
  });

  beforeEach(async () => {
    now = new Date("2026-08-27T12:00:00.000Z");
    await db.deleteFrom("worker_heartbeats").execute();
  });

  async function probe(path: string) {
    const response = await fetch(`${baseUrl}${path}`);
    return { status: response.status, body: await response.json() };
  }

  it("reports liveness without reaching the database", async () => {
    expect(await probe("/health/live")).toEqual({
      status: 200,
      body: { status: "live" },
    });
  });

  it("reports readiness once the schema this build expects is applied", async () => {
    expect(await probe("/health/ready")).toEqual({
      status: 200,
      body: { status: "ready" },
    });
  });

  it("expects the newest migration the build ships rather than a pinned name", async () => {
    // A hand-written constant rots silently: readiness keeps passing against a
    // database missing every migration added since someone last edited it.
    const applied = await db
      .selectFrom("schema_migrations")
      .select("name")
      .orderBy("name", "desc")
      .executeTakeFirstOrThrow();

    expect(currentSchemaMigration).toBe(applied.name);
  });

  it("refuses readiness when the expected schema is not applied", async () => {
    await db
      .deleteFrom("schema_migrations")
      .where("name", "=", currentSchemaMigration)
      .execute();
    try {
      expect(await probe("/health/ready")).toEqual({
        status: 503,
        body: { status: "unavailable" },
      });
    } finally {
      await db
        .insertInto("schema_migrations")
        .values({ name: currentSchemaMigration })
        .execute();
    }
  });

  it("refuses worker readiness until a heartbeat exists", async () => {
    expect(await probe("/health/worker")).toEqual({
      status: 503,
      body: { status: "unavailable" },
    });
  });

  it("reports the release a fresh worker heartbeat names", async () => {
    await writeWorkerHeartbeat(db, { release: "release-a", observedAt: now });

    expect(await probe("/health/worker")).toEqual({
      status: 200,
      body: { status: "ready", release: "release-a" },
    });
  });

  it("refuses worker readiness once the heartbeat goes stale", async () => {
    await writeWorkerHeartbeat(db, { release: "release-a", observedAt: now });
    now = new Date(now.getTime() + WORKER_HEARTBEAT_STALE_MILLISECONDS);

    expect(await probe("/health/worker")).toEqual({
      status: 503,
      body: { status: "unavailable" },
    });
  });

  it("keeps one heartbeat row per worker so the newest release is what is read", async () => {
    await writeWorkerHeartbeat(db, { release: "release-a", observedAt: now });
    const later = new Date(now.getTime() + 60_000);
    await writeWorkerHeartbeat(db, { release: "release-b", observedAt: later });

    expect(await db.selectFrom("worker_heartbeats").selectAll().execute()).toHaveLength(1);
    expect(await readWorkerHeartbeat(db)).toEqual({
      workerName: MARKETPLACE_WORKER_NAME,
      release: "release-b",
      observedAt: later,
    });
  });

  it("writes a heartbeat as the worker starts rather than one interval later", async () => {
    const heartbeat = startWorkerHeartbeat({
      db,
      release: "release-c",
      now: () => now,
    });
    await heartbeat.written;
    heartbeat.stop();

    expect(await probe("/health/worker")).toEqual({
      status: 200,
      body: { status: "ready", release: "release-c" },
    });
  });

  it("keeps the worker running when its heartbeat write fails", async () => {
    const failures: unknown[] = [];
    const brokenDatabase = {
      insertInto: () => {
        throw new Error("connection terminated");
      },
    } as unknown as Database;
    const heartbeat = startWorkerHeartbeat({
      db: brokenDatabase,
      release: "release-d",
      now: () => now,
      onFailure: (error) => failures.push(error),
    });

    await expect(heartbeat.written).resolves.toBeUndefined();
    heartbeat.stop();
    expect(failures).toHaveLength(1);
  });
});
