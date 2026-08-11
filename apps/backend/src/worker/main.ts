import { run } from "graphile-worker";

import { classSessionReminderTasks } from "../class-session/class-session-reminder-worker.js";
import { parseAppConfig } from "../config.js";
import { createDatabase } from "../database/database.js";
import { migrateDatabase } from "../database/migrate.js";
import { notificationDeliveryTasks } from "../notification/notification-delivery-worker.js";
import { sponsorshipTasks } from "../sponsorship/sponsorship-worker.js";
import { waitlistTasks } from "../waitlist/waitlist-worker.js";

const config = parseAppConfig(process.env);
const db = createDatabase(config.DATABASE_URL);
await migrateDatabase(db);

const runner = await run({
  connectionString: config.DATABASE_URL,
  concurrency: 1,
  noHandleSignals: true,
  pollInterval: 10_000,
  crontab: "* * * * * deliver_class_session_reminders\n* * * * * process_waitlist_entries\n* * * * * deliver_notification_intents\n0 3 * * * compact_terminal_notifications\n* * * * * expire_sponsorship_invitations\n* * * * * grant_sponsorship_credits",
  taskList: {
    ...classSessionReminderTasks(db),
    ...waitlistTasks(db),
    ...notificationDeliveryTasks(db),
    ...sponsorshipTasks(db),
  },
});

console.log(JSON.stringify({ event: "worker.started" }));

async function shutdown() {
  await runner.stop();
  await db.destroy();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
