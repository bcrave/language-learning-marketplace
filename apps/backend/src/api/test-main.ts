import { startPostgreSqlTemplate } from "@marketplace/test-support";

import { parseAppConfig } from "../config.js";
import { createDatabase } from "../database/database.js";
import { migrateDatabase } from "../database/migrate.js";
import { seedDemoCurriculum, seedDemoStudents } from "../database/seed.js";

const postgres = process.env.E2E_USE_TESTCONTAINERS === "true"
  ? await startPostgreSqlTemplate()
  : null;
if (postgres) process.env.DATABASE_URL = postgres.getConnectionUri();

const config = parseAppConfig(process.env);
const db = createDatabase(config.DATABASE_URL);
try {
  await migrateDatabase(db);
  await seedDemoStudents(db);
  await seedDemoCurriculum(db);
} finally {
  await db.destroy();
}

await import("./main.js");

if (postgres) {
  const stopPostgres = () => void postgres.stop();
  process.once("SIGINT", stopPostgres);
  process.once("SIGTERM", stopPostgres);
}
