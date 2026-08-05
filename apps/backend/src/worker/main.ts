import { run } from "graphile-worker";

import { classSessionReminderTasks } from "../class-session/class-session-reminder-worker.js";
import { parseAppConfig } from "../config.js";
import { createDatabase } from "../database/database.js";
import { migrateDatabase } from "../database/migrate.js";

const config = parseAppConfig(process.env);
const db = createDatabase(config.DATABASE_URL);
await migrateDatabase(db);

const runner = await run({
  connectionString: config.DATABASE_URL,
  concurrency: 1,
  noHandleSignals: true,
  pollInterval: 10_000,
  crontab: "* * * * * deliver_class_session_reminders",
  taskList: classSessionReminderTasks(db),
});

console.log(JSON.stringify({ event: "worker.started" }));

async function shutdown() {
  await runner.stop();
  await db.destroy();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
