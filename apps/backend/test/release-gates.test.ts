import { describe, expect, it } from "vitest";

import { awaitWorkerHeartbeat } from "../src/operations/release-gates.js";
import {
  MARKETPLACE_WORKER_NAME,
  WORKER_HEARTBEAT_STALE_MILLISECONDS,
  type WorkerHeartbeat,
} from "../src/worker/worker-heartbeat.js";

function heartbeat(release: string, observedAt: Date): WorkerHeartbeat {
  return { workerName: MARKETPLACE_WORKER_NAME, release, observedAt };
}

/** A clock the gate advances only by sleeping, so the policy is what is timed. */
function scriptedClock(startedAt: Date) {
  let current = startedAt.getTime();
  return {
    now: () => new Date(current),
    sleep: async (milliseconds: number) => {
      current += milliseconds;
    },
  };
}

describe("worker heartbeat release gate", () => {
  const startedAt = new Date("2026-08-27T12:00:00.000Z");

  it("releases once the new worker answers three consecutive times", async () => {
    const clock = scriptedClock(startedAt);

    const result = await awaitWorkerHeartbeat({
      release: "release-b",
      readHeartbeat: async () => heartbeat("release-b", clock.now()),
      ...clock,
    });

    expect(result.outcome).toBe("READY");
    expect(result.observations).toBe(3);
  });

  it("waits out a worker that is not up yet", async () => {
    const clock = scriptedClock(startedAt);
    let attempts = 0;

    const result = await awaitWorkerHeartbeat({
      release: "release-b",
      readHeartbeat: async () => {
        attempts += 1;
        return attempts > 4 ? heartbeat("release-b", clock.now()) : null;
      },
      ...clock,
    });

    expect(result.outcome).toBe("READY");
    expect(attempts).toBe(7);
  });

  it("refuses a heartbeat still written by the previous release", async () => {
    const clock = scriptedClock(startedAt);

    const result = await awaitWorkerHeartbeat({
      release: "release-b",
      readHeartbeat: async () => heartbeat("release-a", clock.now()),
      ...clock,
    });

    expect(result.outcome).toBe("TIMED_OUT");
    expect(result.detail).toContain("release-a");
  });

  it("refuses a heartbeat that has gone stale", async () => {
    const clock = scriptedClock(startedAt);
    const stale = new Date(startedAt.getTime() - WORKER_HEARTBEAT_STALE_MILLISECONDS);

    const result = await awaitWorkerHeartbeat({
      release: "release-b",
      readHeartbeat: async () => heartbeat("release-b", stale),
      ...clock,
    });

    expect(result.outcome).toBe("TIMED_OUT");
    expect(result.observations).toBe(0);
  });

  it("restarts the run when a worker answers and then drops out", async () => {
    const clock = scriptedClock(startedAt);
    // Two successes, a gap, then a full run: a worker that flapped mid-release
    // has not shown it stayed up, so only the unbroken run counts.
    const script: (WorkerHeartbeat | null)[] = [
      heartbeat("release-b", startedAt),
      heartbeat("release-b", startedAt),
      null,
    ];
    let attempts = 0;

    const result = await awaitWorkerHeartbeat({
      release: "release-b",
      readHeartbeat: async () => {
        const scripted = script[attempts++];
        return scripted === undefined ? heartbeat("release-b", clock.now()) : scripted;
      },
      ...clock,
    });

    expect(result.outcome).toBe("READY");
    expect(attempts).toBe(6);
  });

  it("treats an unreadable database as a worker that is not there", async () => {
    const clock = scriptedClock(startedAt);

    const result = await awaitWorkerHeartbeat({
      release: "release-b",
      readHeartbeat: async () => {
        throw new Error("connection refused");
      },
      ...clock,
      timeoutMilliseconds: 60_000,
    });

    expect(result.outcome).toBe("TIMED_OUT");
    expect(result.detail).toContain("no heartbeat");
  });

  it("gives up inside the deadline rather than sleeping past it", async () => {
    const clock = scriptedClock(startedAt);

    const result = await awaitWorkerHeartbeat({
      release: "release-b",
      readHeartbeat: async () => null,
      ...clock,
      timeoutMilliseconds: 180_000,
      pollMilliseconds: 30_000,
    });

    expect(result.outcome).toBe("TIMED_OUT");
    expect(result.waitedMilliseconds).toBeLessThanOrEqual(180_000);
  });

  it("keeps no source address or secret in its evidence", async () => {
    const clock = scriptedClock(startedAt);

    const result = await awaitWorkerHeartbeat({
      release: "release-b",
      readHeartbeat: async () => heartbeat("release-b", clock.now()),
      ...clock,
    });

    expect(JSON.stringify(result)).not.toMatch(/postgres:|password|token/i);
  });
});
