import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

import type { DatabaseSchema } from "./types.js";

export function createDatabase(databaseUrl: string) {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 10,
    query_timeout: 6_000,
    statement_timeout: 5_000,
  });
  // The server can terminate a pooled connection while nobody is waiting on it: a
  // PostgreSQL restart, a maintenance shutdown, or a dropped database all arrive as
  // a FATAL on an idle client. node-postgres re-emits that on the pool, and an
  // `error` event with no listener is an unhandled exception that takes the process
  // down — losing an API instance to a routine database restart.
  //
  // Observing it is the whole remedy: the pool discards the dead client and opens a
  // fresh one on the next checkout. Nothing is swallowed that a caller needed, since
  // a database that is genuinely unreachable fails the next query at its call site,
  // where the caller can report it with context.
  pool.on("error", () => {});
  return new Kysely<DatabaseSchema>({ dialect: new PostgresDialect({ pool }) });
}

export type Database = ReturnType<typeof createDatabase>;
