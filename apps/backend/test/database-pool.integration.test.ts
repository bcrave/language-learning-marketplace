import {
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { sql } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase, type Database } from "../src/database/database.js";

/**
 * A pooled connection can be terminated while nobody is waiting on it — PostgreSQL
 * restarting, a maintenance shutdown, or the test container stopping. node-postgres
 * reports that on the pool, and an `error` event with no listener is an unhandled
 * exception: in production it ends the API instance, and in the test suite it fails
 * the whole run from a file whose assertions all passed.
 *
 * The assertion below only covers the recovery half. The regression this guards is
 * the unhandled exception itself, which no assertion can observe — remove the pool's
 * error listener and this file still "passes" while Vitest fails the run with
 * `57P01 terminating connection due to administrator command`.
 */
describe("Database connection pool", () => {
  let db: Database;
  let postgres: StartedPostgreSqlContainer;

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    db = createDatabase(postgres.getConnectionUri());
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("survives the server terminating an idle connection, and serves the next query", async () => {
    // Leave a client idle in the pool for the server to terminate.
    expect(await sql<{ ok: number }>`select 1 as ok`.execute(db)).toMatchObject({ rows: [{ ok: 1 }] });

    const terminator = createDatabase(postgres.getConnectionUri());
    try {
      await sql`
        select pg_terminate_backend(pid) from pg_stat_activity
        where datname = current_database() and pid <> pg_backend_pid()
      `.execute(terminator);
    } finally {
      await terminator.destroy();
    }
    // Let the FATAL reach the idle client. Without the pool's error listener this is
    // where the process would come down.
    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(await sql<{ ok: number }>`select 1 as ok`.execute(db)).toMatchObject({ rows: [{ ok: 1 }] });
  });
});
