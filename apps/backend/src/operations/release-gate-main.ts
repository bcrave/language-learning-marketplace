import { z } from "zod";

import { createDatabase } from "../database/database.js";
import { readWorkerHeartbeat } from "../worker/worker-heartbeat.js";
import { awaitWorkerHeartbeat } from "./release-gates.js";

/**
 * The release job's worker gate (ADR 0038). The worker answers no HTTP probe
 * and has no public address, so the release job observes it where the worker
 * writes it: the same PostgreSQL it already reached to run migrations.
 *
 * A failed gate stops the release before the browser client is transitioned.
 */
const environmentSchema = z.object({
  DATABASE_URL: z.url(),
  APP_RELEASE: z.string().min(1),
  WORKER_HEARTBEAT_TIMEOUT_MILLISECONDS: z.coerce.number().int().positive().optional(),
});

const environment = environmentSchema.parse(process.env);
const db = createDatabase(environment.DATABASE_URL);

try {
  const result = await awaitWorkerHeartbeat({
    release: environment.APP_RELEASE,
    readHeartbeat: () => readWorkerHeartbeat(db),
    now: () => new Date(),
    sleep: (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)),
    ...(environment.WORKER_HEARTBEAT_TIMEOUT_MILLISECONDS
      ? { timeoutMilliseconds: environment.WORKER_HEARTBEAT_TIMEOUT_MILLISECONDS }
      : {}),
  });
  process.stdout.write(`${JSON.stringify({ event: "release.worker-gate", ...result })}\n`);
  if (result.outcome !== "READY") process.exitCode = 1;
} finally {
  await db.destroy();
}
