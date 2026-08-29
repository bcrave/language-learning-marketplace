import type { Database } from "../database/database.js";

/**
 * The operator guide writes the heartbeat every 60 seconds and calls it stale
 * after three minutes, so two writes may be lost before anyone is told. A
 * release gate that used the same three minutes would accept a worker whose
 * last write came from the release before it, so callers awaiting a new
 * release pass the release they expect rather than shortening the window.
 */
export const WORKER_HEARTBEAT_INTERVAL_MILLISECONDS = 60_000;
export const WORKER_HEARTBEAT_STALE_MILLISECONDS = 180_000;

/** The single background process of ADR 0007's modular monolith. */
export const MARKETPLACE_WORKER_NAME = "marketplace-worker";

/**
 * The heartbeat writes no Audit Entry. CONTEXT.md scopes those to background
 * *actions* — work that changes the marketplace and needs immutable history —
 * while this changes nothing a reviewer, an administrator, or an investigation
 * would ever ask about. Auditing a 60-second liveness write would add roughly
 * forty thousand entries a month to the rolling 90-day partitions and bury the
 * actions that do matter. It is operational evidence, and it lives with the
 * other operational evidence: telemetry and the readiness probes.
 */

export interface WorkerHeartbeat {
  workerName: string;
  release: string;
  observedAt: Date;
}

export async function writeWorkerHeartbeat(
  db: Database,
  heartbeat: { release: string; observedAt: Date },
): Promise<void> {
  const row = {
    worker_name: MARKETPLACE_WORKER_NAME,
    release: heartbeat.release,
    observed_at: heartbeat.observedAt,
  };
  await db
    .insertInto("worker_heartbeats")
    .values(row)
    .onConflict((conflict) =>
      conflict.column("worker_name").doUpdateSet({
        release: row.release,
        observed_at: row.observed_at,
      }),
    )
    .execute();
}

export async function readWorkerHeartbeat(db: Database): Promise<WorkerHeartbeat | null> {
  const row = await db
    .selectFrom("worker_heartbeats")
    .select(["worker_name", "release", "observed_at"])
    .where("worker_name", "=", MARKETPLACE_WORKER_NAME)
    .executeTakeFirst();
  return row
    ? { workerName: row.worker_name, release: row.release, observedAt: row.observed_at }
    : null;
}

export function workerHeartbeatIsFresh(
  heartbeat: WorkerHeartbeat | null,
  now: Date,
): heartbeat is WorkerHeartbeat {
  if (!heartbeat) return false;
  const age = now.getTime() - heartbeat.observedAt.getTime();
  // A heartbeat from the future means the two clocks disagree, which is not
  // evidence the worker is running. Only an age inside the window counts.
  return age >= 0 && age < WORKER_HEARTBEAT_STALE_MILLISECONDS;
}

/**
 * Writes immediately so a freshly started worker is observable without waiting
 * a full interval, then keeps writing until the returned handle is stopped.
 * A failed write is not fatal to the worker: the missing heartbeat is itself
 * the signal, and killing the process over it would lose the queued work.
 */
export function startWorkerHeartbeat(options: {
  db: Database;
  release: string;
  intervalMilliseconds?: number;
  now?: () => Date;
  onFailure?: (error: unknown) => void;
}): { stop: () => void; written: Promise<void> } {
  const now = options.now ?? (() => new Date());
  // A write that outlives its own interval must not start another. Every pending
  // write holds a pooled connection, so stacking them starves the pool the rest of
  // the process needs — including the readiness verification that reads this very
  // heartbeat — and a queued write carries nothing newer than the one in flight.
  let writing = false;
  const write = async () => {
    if (writing) return;
    writing = true;
    try {
      await writeWorkerHeartbeat(options.db, {
        release: options.release,
        observedAt: now(),
      });
    } catch (error) {
      options.onFailure?.(error);
    } finally {
      writing = false;
    }
  };
  const timer = setInterval(
    () => void write(),
    options.intervalMilliseconds ?? WORKER_HEARTBEAT_INTERVAL_MILLISECONDS,
  );
  timer.unref();
  return { stop: () => clearInterval(timer), written: write() };
}
