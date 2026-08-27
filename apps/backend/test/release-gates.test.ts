import { describe, expect, it } from "vitest";

import {
  awaitApiReadiness,
  awaitWorkerReadiness,
  type ReadinessObservation,
} from "../src/operations/release-gates.js";
import { WORKER_HEARTBEAT_STALE_MILLISECONDS } from "../src/worker/worker-heartbeat.js";

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

describe("release gates", () => {
  const startedAt = new Date("2026-08-27T12:00:00.000Z");

  describe("API readiness", () => {
    it("releases after three consecutive ready answers", async () => {
      const clock = scriptedClock(startedAt);
      let probes = 0;

      const result = await awaitApiReadiness({
        probe: async () => {
          probes += 1;
          return { ready: true };
        },
        ...clock,
      });

      expect(result.outcome).toBe("READY");
      expect(probes).toBe(3);
    });

    it("restarts the run when the API answers and then drops out", async () => {
      const clock = scriptedClock(startedAt);
      // Two successes, a gap, then a full run. A service that flapped mid
      // release has not shown it stayed up.
      const script = [true, true, false];
      let probes = 0;

      const result = await awaitApiReadiness({
        probe: async () => ({ ready: script[probes++] ?? true }),
        ...clock,
      });

      expect(result.outcome).toBe("READY");
      expect(probes).toBe(6);
    });

    it("gives up inside its deadline rather than sleeping past it", async () => {
      const clock = scriptedClock(startedAt);

      const result = await awaitApiReadiness({
        probe: async () => ({ ready: false }),
        ...clock,
        timeoutMilliseconds: 600_000,
      });

      expect(result.outcome).toBe("TIMED_OUT");
      expect(result.waitedMilliseconds).toBeLessThanOrEqual(600_000);
      expect(result.detail).toContain("0 of 3");
    });

    it("treats an unreachable API as one that is not ready", async () => {
      const clock = scriptedClock(startedAt);

      const result = await awaitApiReadiness({
        probe: async () => {
          throw new Error("connection refused");
        },
        ...clock,
        timeoutMilliseconds: 60_000,
      });

      expect(result.outcome).toBe("TIMED_OUT");
    });
  });

  describe("worker heartbeat", () => {
    function livingWorker(clock: { now: () => Date }, release = "release-b") {
      return async (): Promise<ReadinessObservation> => ({
        ready: true,
        release,
        observedAt: clock.now(),
      });
    }

    it("releases once the new worker answers and keeps writing", async () => {
      const clock = scriptedClock(startedAt);

      const result = await awaitWorkerReadiness({
        release: "release-b",
        probe: livingWorker(clock),
        ...clock,
      });

      expect(result.outcome).toBe("READY");
      expect(result.observations).toBeGreaterThanOrEqual(3);
    });

    it("refuses a worker that wrote once and died", async () => {
      const clock = scriptedClock(startedAt);
      // Still inside the three-minute staleness window, so every probe sees a
      // "fresh" heartbeat — but the instant never moves, which is the only
      // evidence that the process is still running.
      const frozen = new Date(startedAt.getTime() - 30_000);

      const result = await awaitWorkerReadiness({
        release: "release-b",
        probe: async () => ({ ready: true, release: "release-b", observedAt: frozen }),
        ...clock,
      });

      expect(result.outcome).toBe("TIMED_OUT");
      expect(result.detail).toContain("never wrote a newer heartbeat");
    });

    it("refuses a heartbeat still written by the previous release", async () => {
      const clock = scriptedClock(startedAt);

      const result = await awaitWorkerReadiness({
        release: "release-b",
        probe: livingWorker(clock, "release-a"),
        ...clock,
      });

      expect(result.outcome).toBe("TIMED_OUT");
      expect(result.detail).toContain("release-a");
    });

    it("refuses a heartbeat the API reports as stale", async () => {
      const clock = scriptedClock(startedAt);
      const stale = new Date(startedAt.getTime() - WORKER_HEARTBEAT_STALE_MILLISECONDS);

      const result = await awaitWorkerReadiness({
        release: "release-b",
        // `/health/worker` refuses a stale heartbeat itself, so the gate sees
        // an unready answer rather than an old instant.
        probe: async () => ({ ready: false, observedAt: stale }),
        ...clock,
      });

      expect(result.outcome).toBe("TIMED_OUT");
      expect(result.observations).toBe(0);
    });

    it("waits out a worker that is not up yet", async () => {
      const clock = scriptedClock(startedAt);
      let probes = 0;

      const result = await awaitWorkerReadiness({
        release: "release-b",
        probe: async () => {
          probes += 1;
          return probes > 2 ? { ready: true, release: "release-b", observedAt: clock.now() } : { ready: false };
        },
        ...clock,
      });

      expect(result.outcome).toBe("READY");
    });

    it("keeps no source address or secret in its evidence", async () => {
      const clock = scriptedClock(startedAt);

      const result = await awaitWorkerReadiness({
        release: "release-b",
        probe: livingWorker(clock),
        ...clock,
      });

      expect(JSON.stringify(result)).not.toMatch(/postgres:|password|token|railway\.internal/i);
    });
  });
});
