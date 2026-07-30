import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { sql } from "kysely";

import { parseAppConfig } from "../config.js";
import { createDatabase, type Database } from "./database.js";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const bundledMigrationsDirectory = resolve(moduleDirectory, "../migrations");
const migrationsDirectory = existsSync(bundledMigrationsDirectory)
  ? bundledMigrationsDirectory
  : resolve(moduleDirectory, "../../migrations");

export async function migrateDatabase(db: Database) {
  await sql`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `.execute(db);

  const migrationNames = (await readdir(migrationsDirectory))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const name of migrationNames) {
    const applied = await db
      .selectFrom("schema_migrations")
      .select(sql<number>`1`.as("present"))
      .where("name", "=", name)
      .executeTakeFirst();
    if (applied) continue;

    const migration = await readFile(resolve(migrationsDirectory, name), "utf8");
    await db.transaction().execute(async (transaction) => {
      await sql.raw(migration).execute(transaction);
      await sql`insert into schema_migrations (name) values (${name})`.execute(
        transaction,
      );
    });
  }
}

async function main() {
  const config = parseAppConfig(process.env);
  const db = createDatabase(config.DATABASE_URL);
  try {
    await migrateDatabase(db);
  } finally {
    await db.destroy();
  }
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  await main();
}
