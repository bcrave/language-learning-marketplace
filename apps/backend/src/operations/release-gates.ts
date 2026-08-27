/**
 * The release gates ADR 0038 puts between deployment stages: the API has to be
 * ready, and the worker has to be live on this release, before the browser
 * client is transitioned.
 *
 * Both gates run inside Railway's private network, where the API's health
 * probes actually live — ADR 0028 gives the API no public address, and the
 * operator guide treats an internal endpoint reached publicly as an incident.
 *
 * The operator guide sets the numbers: each service has 10 minutes to become
 * healthy and must produce three consecutive 30-second readiness successes,
 * and the worker heartbeat must follow API health within three minutes.
 */
export const SERVICE_READINESS_TIMEOUT_MILLISECONDS = 600_000;
export const WORKER_HEARTBEAT_GATE_TIMEOUT_MILLISECONDS = 180_000;
export const READINESS_POLL_MILLISECONDS = 30_000;
export const REQUIRED_CONSECUTIVE_OBSERVATIONS = 3;

/** What one probe of a service's health endpoint saw. */
export interface ReadinessObservation {
  ready: boolean;
  /** The release the service reports, where it reports one. */
  release?: string;
  /** When the worker last wrote its heartbeat, where the probe carries it. */
  observedAt?: Date;
}

export type ReadinessProbe = () => Promise<ReadinessObservation>;

export interface ReleaseGateResult {
  gate: string;
  outcome: "READY" | "TIMED_OUT";
  observations: number;
  waitedMilliseconds: number;
  /** Privacy-safe: names the gate and what was seen, never a source or secret. */
  detail: string;
}

interface GateOptions {
  gate: string;
  probe: ReadinessProbe;
  now: () => Date;
  sleep: (milliseconds: number) => Promise<void>;
  timeoutMilliseconds: number;
  pollMilliseconds?: number;
  /** The release the service must report, where it reports one. */
  release?: string;
  /**
   * Whether the probe's `observedAt` must be seen to advance during the run.
   * Three consecutive successes prove a service answered; for a heartbeat with
   * a three-minute staleness window and a thirty-second poll, one write from
   * a minute ago satisfies all three. Only a timestamp that moves proves the
   * worker is writing now rather than having written once and died.
   */
  requiresAdvancingHeartbeat?: boolean;
}

async function awaitReleaseGate(options: GateOptions): Promise<ReleaseGateResult> {
  const poll = options.pollMilliseconds ?? READINESS_POLL_MILLISECONDS;
  const startedAt = options.now().getTime();
  let consecutive = 0;
  let advanced = !options.requiresAdvancingHeartbeat;
  let previousObservedAt: Date | undefined;
  let lastSeen = "no answer";

  for (;;) {
    const at = options.now();
    let observation: ReadinessObservation = { ready: false };
    try {
      observation = await options.probe();
    } catch {
      // A probe that cannot connect is indistinguishable from a service that
      // is not up yet, and the deadline is what decides either way.
    }

    const onExpectedRelease =
      !options.release || observation.release === options.release;
    if (observation.ready && onExpectedRelease) {
      consecutive += 1;
      if (
        options.requiresAdvancingHeartbeat &&
        observation.observedAt &&
        previousObservedAt &&
        observation.observedAt.getTime() > previousObservedAt.getTime()
      ) {
        advanced = true;
      }
      previousObservedAt = observation.observedAt ?? previousObservedAt;
      lastSeen = observation.release ? `release ${observation.release}` : "ready";
      if (consecutive >= REQUIRED_CONSECUTIVE_OBSERVATIONS && advanced) {
        return {
          gate: options.gate,
          outcome: "READY",
          observations: consecutive,
          waitedMilliseconds: at.getTime() - startedAt,
          detail: `${options.gate} answered ${consecutive} consecutive times (${lastSeen})`,
        };
      }
    } else {
      // A single unready answer, or one from the previous release, breaks the
      // run: two of three probes passing is not a service that stayed up.
      consecutive = 0;
      advanced = !options.requiresAdvancingHeartbeat;
      previousObservedAt = undefined;
      lastSeen = observation.ready
        ? `release ${observation.release ?? "unnamed"}`
        : "not ready";
    }

    const elapsed = at.getTime() - startedAt;
    if (elapsed + poll > options.timeoutMilliseconds) {
      const shortfall =
        consecutive < REQUIRED_CONSECUTIVE_OBSERVATIONS
          ? `reached ${consecutive} of ${REQUIRED_CONSECUTIVE_OBSERVATIONS} consecutive answers`
          : "never wrote a newer heartbeat";
      return {
        gate: options.gate,
        outcome: "TIMED_OUT",
        observations: consecutive,
        waitedMilliseconds: elapsed,
        detail: `${options.gate} ${shortfall} (${lastSeen})`,
      };
    }
    await options.sleep(poll);
  }
}

export async function awaitApiReadiness(options: {
  probe: ReadinessProbe;
  now: () => Date;
  sleep: (milliseconds: number) => Promise<void>;
  timeoutMilliseconds?: number;
  pollMilliseconds?: number;
}): Promise<ReleaseGateResult> {
  return awaitReleaseGate({
    gate: "api-readiness",
    timeoutMilliseconds:
      options.timeoutMilliseconds ?? SERVICE_READINESS_TIMEOUT_MILLISECONDS,
    ...options,
  });
}

export async function awaitWorkerReadiness(options: {
  /** The release the new worker must be running, not merely any live worker. */
  release: string;
  probe: ReadinessProbe;
  now: () => Date;
  sleep: (milliseconds: number) => Promise<void>;
  timeoutMilliseconds?: number;
  pollMilliseconds?: number;
}): Promise<ReleaseGateResult> {
  return awaitReleaseGate({
    gate: "worker-heartbeat",
    requiresAdvancingHeartbeat: true,
    timeoutMilliseconds:
      options.timeoutMilliseconds ?? WORKER_HEARTBEAT_GATE_TIMEOUT_MILLISECONDS,
    ...options,
  });
}
