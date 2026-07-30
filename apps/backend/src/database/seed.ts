import { pathToFileURL } from "node:url";

import { parseAppConfig } from "../config.js";
import { createDatabase, type Database } from "./database.js";
import { migrateDatabase } from "./migrate.js";

export const DEMO_STUDENT_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_ENGLISH_STUDENT_ID = "00000000-0000-4000-8000-000000000002";

export async function seedDemoStudents(db: Database) {
  const demoStudents = [
    {
      id: DEMO_STUDENT_ID,
      identity_issuer: "https://fake.local/",
      identity_subject: DEMO_STUDENT_ID,
      display_name: "Sofía Rivera",
      interface_locale: "es" as const,
      display_time_zone: "America/Denver",
    },
    {
      id: DEMO_ENGLISH_STUDENT_ID,
      identity_issuer: "https://fake.local/",
      identity_subject: DEMO_ENGLISH_STUDENT_ID,
      display_name: "Alex Morgan",
      interface_locale: "en" as const,
      display_time_zone: "America/New_York",
    },
  ];
  for (const student of demoStudents) {
    await db
      .insertInto("users")
      .values(student)
      .onConflict((conflict) => conflict.column("id").doUpdateSet(student))
      .execute();
  }
  await db
    .insertInto("role_assignments")
    .values([
      { user_id: DEMO_STUDENT_ID, role: "STUDENT" },
      { user_id: DEMO_ENGLISH_STUDENT_ID, role: "STUDENT" },
    ])
    .onConflict((conflict) => conflict.columns(["user_id", "role"]).doNothing())
    .execute();
}

async function main() {
  const config = parseAppConfig(process.env);
  const db = createDatabase(config.DATABASE_URL);
  try {
    await migrateDatabase(db);
    await seedDemoStudents(db);
  } finally {
    await db.destroy();
  }
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  await main();
}
