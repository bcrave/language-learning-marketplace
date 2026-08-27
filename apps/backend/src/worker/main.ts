import { run } from "graphile-worker";

import { auditRetentionTasks } from "../audit/audit-retention-worker.js";
import { classSessionReminderTasks } from "../class-session/class-session-reminder-worker.js";
import { parseAppConfig } from "../config.js";
import { createDatabase } from "../database/database.js";
import { migrateDatabase } from "../database/migrate.js";
import { notificationDeliveryTasks } from "../notification/notification-delivery-worker.js";
import { reportExportTasks } from "../reporting/report-export-worker.js";
import { sponsorshipTasks } from "../sponsorship/sponsorship-worker.js";
import { waitlistTasks } from "../waitlist/waitlist-worker.js";
import { userAnonymizationTasks } from "../authorization/user-anonymization-worker.js";
import { startWorkerHeartbeat } from "./worker-heartbeat.js";
import { Auth0IdentityAdministration } from "../auth/auth0-identity-administration.js";
import { createSimulatedIdentityAdministration, createUnavailableIdentityAdministration } from "../auth/identity-administration.js";

const config = parseAppConfig(process.env);
const db = createDatabase(config.DATABASE_URL);
await migrateDatabase(db);
const identityAdministration = config.AUTH_MODE === "fake"
  ? createSimulatedIdentityAdministration()
  : config.AUTH0_ISSUER && config.AUTH0_MANAGEMENT_CLIENT_ID && config.AUTH0_MANAGEMENT_CLIENT_SECRET
    ? new Auth0IdentityAdministration({ issuer: config.AUTH0_ISSUER, clientId: config.AUTH0_MANAGEMENT_CLIENT_ID, clientSecret: config.AUTH0_MANAGEMENT_CLIENT_SECRET })
    : createUnavailableIdentityAdministration();

const runner = await run({
  connectionString: config.DATABASE_URL,
  concurrency: 1,
  noHandleSignals: true,
  pollInterval: 10_000,
  crontab: "* * * * * deliver_class_session_reminders\n* * * * * process_waitlist_entries\n* * * * * deliver_notification_intents\n0 3 * * * compact_terminal_notifications\n* * * * * expire_sponsorship_invitations\n* * * * * grant_sponsorship_credits\n* * * * * generate_report_exports\n*/5 * * * * expire_report_exports\n* * * * * anonymize_users\n0 4 * * * maintain_audit_partitions",
  taskList: {
    ...classSessionReminderTasks(db),
    ...waitlistTasks(db),
    ...notificationDeliveryTasks(db),
    ...sponsorshipTasks(db),
    ...reportExportTasks(db),
    ...userAnonymizationTasks(db, identityAdministration),
    ...auditRetentionTasks(db),
  },
});

// ADR 0038 holds the browser client back until the worker is observably live,
// and the worker answers no HTTP probe. The heartbeat starts before the
// release is announced so the gate reads a value written by this release.
const heartbeat = startWorkerHeartbeat({
  db,
  release: config.APP_RELEASE,
  onFailure: () =>
    console.log(JSON.stringify({ event: "worker.heartbeat.failed" })),
});
await heartbeat.written;

console.log(JSON.stringify({ event: "worker.started", release: config.APP_RELEASE }));

async function shutdown() {
  heartbeat.stop();
  await runner.stop();
  await db.destroy();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
