import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

import type { DatabaseSchema } from "./types.js";

export function createDatabase(databaseUrl: string) {
  return new Kysely<DatabaseSchema>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({
        connectionString: databaseUrl,
        max: 10,
        query_timeout: 6_000,
        statement_timeout: 5_000,
      }),
    }),
  });
}

export type Database = ReturnType<typeof createDatabase>;
