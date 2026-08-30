import { sql } from "kysely";

import type { Database } from "../database/database.js";
import { latestMigrationName } from "../database/migrate.js";
import { readWorkerHeartbeat, MARKETPLACE_WORKER_NAME } from "../worker/worker-heartbeat.js";
import type { OperationalSnapshot } from "./alert-evaluation.js";
import type { OperationalCounters } from "./operational-counters.js";

/**
 * Reads one snapshot of everything the deployment can observe about itself.
 *
 * Every value here already exists for another reason — the readiness probe, the
 * release gate, the Canonical Data Rebuild lease, the notification worker's own
 * reconciliation state. Nothing is written to make observation possible, which
 * is what keeps this cheap enough for a deployment operating under a $15
 * monthly ceiling.
 */

/**
 * The one thing a job's own record cannot supply safely. Graphile's `last_error`
 * is raw error text from whatever threw: it can carry a database value, a
 * provider response, or an interpolated identifier. It is never read here, and
 * exhaustion is reported under this stable code instead.
 */
export const WORKER_JOB_EXHAUSTION_CODE = "WORKER_JOB_ATTEMPTS_EXHAUSTED";

function elapsedSince(now: Date, at: Date | undefined) {
  return at ? now.getTime() - at.getTime() : null;
}

async function databaseIsReachable(db: Database) {
  try {
    await sql`select 1`.execute(db);
    return true;
  } catch {
    return false;
  }
}

interface WorkerJobObservation {
  runnableJobCount: number;
  oldestRunnableJobAgeMilliseconds: number | null;
  exhaustedJobs: OperationalSnapshot["worker"]["exhaustedJobs"];
}

/**
 * The queue as the operator guide measures it: runnable jobs only. A job
 * scheduled for tomorrow is not backlog, and a job another process holds is
 * being worked rather than waiting.
 *
 * The worker installs its own schema on first run, so before that — and in any
 * test database that has never started a worker — there is nothing to read and
 * an empty queue is the honest answer.
 */
async function observeWorkerJobs(db: Database, now: Date): Promise<WorkerJobObservation> {
  const installed = await sql<{ present: string | null }>`
    select to_regclass('graphile_worker.jobs')::text as present
  `.execute(db);
  if (!installed.rows[0]?.present) {
    return { runnableJobCount: 0, oldestRunnableJobAgeMilliseconds: null, exhaustedJobs: [] };
  }

  const runnable = await sql<{ runnable_count: string; oldest_run_at: Date | null }>`
    select count(*)::text as runnable_count, min(run_at) as oldest_run_at
    from graphile_worker.jobs
    where run_at <= ${now} and locked_at is null and attempts < max_attempts
  `.execute(db);
  const exhausted = await sql<{ task_identifier: string; job_count: string; attempt_count: number }>`
    select task_identifier, count(*)::text as job_count, max(attempts) as attempt_count
    from graphile_worker.jobs
    where attempts >= max_attempts
    group by task_identifier
    order by task_identifier
  `.execute(db);

  const oldest = runnable.rows[0]?.oldest_run_at ?? null;
  return {
    runnableJobCount: Number(runnable.rows[0]?.runnable_count ?? 0),
    oldestRunnableJobAgeMilliseconds: oldest ? now.getTime() - oldest.getTime() : null,
    exhaustedJobs: exhausted.rows.map((row) => ({
      jobType: row.task_identifier,
      safeFailureCode: WORKER_JOB_EXHAUSTION_CODE,
      jobCount: Number(row.job_count),
      attemptCount: row.attempt_count,
    })),
  };
}

export async function observeOperationalState(
  db: Database,
  options: { release: string; counters: OperationalCounters; now?: Date },
): Promise<OperationalSnapshot> {
  const now = options.now ?? new Date();
  const expectedSchemaVersion = await latestMigrationName();
  const reachable = await databaseIsReachable(db);
  const counted = options.counters.read(now.getTime());

  // An unreachable database answers nothing else. Reporting zero jobs and a
  // fresh heartbeat because the queries failed would clear real incidents.
  if (!reachable) {
    return {
      observedAt: now,
      release: options.release,
      databaseReachable: false,
      appliedSchemaVersion: null,
      expectedSchemaVersion,
      maintenanceState: "AVAILABLE",
      worker: {
        name: MARKETPLACE_WORKER_NAME,
        heartbeatAgeMilliseconds: null,
        runnableJobCount: 0,
        oldestRunnableJobAgeMilliseconds: null,
        exhaustedJobs: [],
      },
      fixtures: {
        generation: 0,
        manifestVersion: null,
        lastRebuildOutcome: null,
        lastRebuildSafeFailureCode: null,
        lastRebuildCorrelationId: null,
        millisecondsSinceSuccessfulRebuild: null,
        millisecondsSinceReconciliation: null,
      },
      notifications: [],
      ...counted,
    };
  }

  const [
    appliedSchema,
    maintenance,
    heartbeat,
    jobs,
    lastRebuild,
    lastSuccessfulRebuild,
    lastReconciliation,
    exhaustedIntents,
  ] = await Promise.all([
    db.selectFrom("schema_migrations").select("name").orderBy("name", "desc").executeTakeFirst(),
    db
      .selectFrom("maintenance_state")
      .select(["state", "fixture_generation", "fixture_manifest_version", "changed_at"])
      .where("singleton", "=", true)
      .executeTakeFirst(),
    readWorkerHeartbeat(db),
    observeWorkerJobs(db, now),
    db
      .selectFrom("canonical_data_rebuilds")
      .select(["state", "safe_failure_code", "correlation_id", "fixture_manifest_version"])
      .orderBy("started_at", "desc")
      .executeTakeFirst(),
    db
      .selectFrom("canonical_data_rebuilds")
      .select("completed_at")
      .where("state", "=", "COMPLETED")
      .orderBy("completed_at", "desc")
      .executeTakeFirst(),
    db
      .selectFrom("rolling_fixture_reconciliations")
      .select("completed_at")
      .orderBy("completed_at", "desc")
      .executeTakeFirst(),
    // An exhausted Notification Intent leaves EXHAUSTED only when its
    // administrator task is resolved, which also writes the Delivery Receipt.
    // Its presence is therefore exactly "has not reached a safe disposition".
    db
      .selectFrom("email_notification_intents as intents")
      .leftJoin(
        (join) =>
          join
            .selectFrom("notification_delivery_attempts")
            .select(({ fn }) => [
              "notification_intent_id",
              fn.max("attempt_number").as("attempt_number"),
            ])
            .groupBy("notification_intent_id")
            .as("latest"),
        (join) => join.onRef("latest.notification_intent_id", "=", "intents.id"),
      )
      .leftJoin("notification_delivery_attempts as attempts", (join) =>
        join
          .onRef("attempts.notification_intent_id", "=", "intents.id")
          .onRef("attempts.attempt_number", "=", "latest.attempt_number"),
      )
      .select(({ fn }) => [
        "attempts.safe_failure_code as safe_failure_code",
        fn.count<string>("intents.id").as("intent_count"),
        fn.max("intents.attempt_count").as("attempt_count"),
      ])
      .where("intents.state", "=", "EXHAUSTED")
      .groupBy("attempts.safe_failure_code")
      .execute(),
  ]);

  const heartbeatAge = heartbeat ? now.getTime() - heartbeat.observedAt.getTime() : null;

  return {
    observedAt: now,
    release: options.release,
    databaseReachable: true,
    appliedSchemaVersion: appliedSchema?.name ?? null,
    expectedSchemaVersion,
    maintenanceState: maintenance?.state ?? "AVAILABLE",
    worker: {
      name: heartbeat?.workerName ?? MARKETPLACE_WORKER_NAME,
      heartbeatAgeMilliseconds: heartbeatAge,
      ...jobs,
    },
    fixtures: {
      generation: maintenance?.fixture_generation ?? 0,
      manifestVersion:
        maintenance?.fixture_manifest_version ?? lastRebuild?.fixture_manifest_version ?? null,
      lastRebuildOutcome: lastRebuild?.state ?? null,
      lastRebuildSafeFailureCode: lastRebuild?.safe_failure_code ?? null,
      lastRebuildCorrelationId: lastRebuild?.correlation_id ?? null,
      // Before the first rebuild or reconciliation there is nothing to measure
      // from, and calling that overdue would greet every fresh deployment with
      // two alerts. The maintenance singleton is written when the schema is
      // installed and rewritten by each rebuild, so it is the oldest honest
      // anchor: "26 hours since this demonstration last had a baseline" is the
      // question the guide is actually asking.
      millisecondsSinceSuccessfulRebuild: elapsedSince(
        now,
        lastSuccessfulRebuild?.completed_at ?? maintenance?.changed_at,
      ),
      millisecondsSinceReconciliation: elapsedSince(
        now,
        lastReconciliation?.completed_at ?? maintenance?.changed_at,
      ),
    },
    notifications: exhaustedIntents.map((group) => ({
      channel: "EMAIL" as const,
      safeFailureCode: group.safe_failure_code ?? "NOTIFICATION_DELIVERY_EXHAUSTED",
      intentCount: Number(group.intent_count),
      attemptCount: group.attempt_count ?? 0,
    })),
    ...counted,
  };
}
