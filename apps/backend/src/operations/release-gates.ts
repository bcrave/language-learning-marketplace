import {
  WORKER_HEARTBEAT_INTERVAL_MILLISECONDS,
  workerHeartbeatIsFresh,
  type WorkerHeartbeat,
} from "../worker/worker-heartbeat.js";

/**
 * The release gate ADR 0038 puts between the API and the browser client: the
 * worker has to be live, on this release, before the client is transitioned.
 *
 * The operator guide gives each service 10 minutes to become healthy and three
 * consecutive successful observations to be believed, and requires the worker
 * heartbeat within three minutes of API health. Those numbers are the defaults
 * here; a caller supplies its own clock and sleep so the policy is testable
 * without waiting out a real deployment.
 */
export const WORKER_HEARTBEAT_GATE_TIMEOUT_MILLISECONDS = 180_000;
export const REQUIRED_CONSECUTIVE_OBSERVATIONS = 3;

export interface WorkerHeartbeatGateResult {
  outcome: "READY" | "TIMED_OUT";
  release: string;
  observations: number;
  waitedMilliseconds: number;
  /** Privacy-safe: names the release and what was seen, never a source or secret. */
  detail: string;
}

export async function awaitWorkerHeartbeat(options: {
  /** The release the new worker must be running, not merely any live worker. */
  release: string;
  readHeartbeat: () => Promise<WorkerHeartbeat | null>;
  now: () => Date;
  sleep: (milliseconds: number) => Promise<void>;
  timeoutMilliseconds?: number;
  pollMilliseconds?: number;
  requiredConsecutiveObservations?: number;
}): Promise<WorkerHeartbeatGateResult> {
  const timeout = options.timeoutMilliseconds ?? WORKER_HEARTBEAT_GATE_TIMEOUT_MILLISECONDS;
  const poll = options.pollMilliseconds ?? WORKER_HEARTBEAT_INTERVAL_MILLISECONDS / 2;
  const required =
    options.requiredConsecutiveObservations ?? REQUIRED_CONSECUTIVE_OBSERVATIONS;
  const startedAt = options.now().getTime();
  let observations = 0;
  let lastSeen = "no heartbeat";

  for (;;) {
    const at = options.now();
    let heartbeat: WorkerHeartbeat | null = null;
    try {
      heartbeat = await options.readHeartbeat();
    } catch {
      // A read failure is indistinguishable from a worker that is not there
      // yet, and the deadline is what decides either way.
      heartbeat = null;
    }

    if (workerHeartbeatIsFresh(heartbeat, at) && heartbeat.release === options.release) {
      observations += 1;
      lastSeen = `release ${heartbeat.release}`;
      if (observations >= required) {
        return {
          outcome: "READY",
          release: options.release,
          observations,
          waitedMilliseconds: at.getTime() - startedAt,
          detail: `the worker answered ${observations} consecutive times on ${options.release}`,
        };
      }
    } else {
      // A stale heartbeat, or one from the previous release, breaks the run.
      // Two of three probes passing is not a worker that stayed up.
      observations = 0;
      lastSeen = heartbeat
        ? `release ${heartbeat.release}, last seen ${Math.round((at.getTime() - heartbeat.observedAt.getTime()) / 1000)}s ago`
        : "no heartbeat";
    }

    const elapsed = at.getTime() - startedAt;
    if (elapsed + poll > timeout) {
      return {
        outcome: "TIMED_OUT",
        release: options.release,
        observations,
        waitedMilliseconds: elapsed,
        detail: `the worker never reached ${required} consecutive observations on ${options.release} (${lastSeen})`,
      };
    }
    await options.sleep(poll);
  }
}
