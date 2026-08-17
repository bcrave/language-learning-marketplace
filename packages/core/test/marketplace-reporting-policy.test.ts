import {
  attendanceRatePercentage,
  studentCancellationRatePercentage,
  studentCancellationTiming,
} from "@marketplace/core";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

const count = fc.integer({ min: 0, max: 500 });
const SESSION_START = new Date("2026-06-10T15:00:00.000Z");

describe("Student Cancellation Rate policy", () => {
  it("divides Student Cancellations by those cancellations plus every recorded Attendance outcome", () => {
    expect(studentCancellationRatePercentage({ studentCancellationCount: 1, attendedCount: 2, noShowCount: 1 })).toBe(25);
    expect(studentCancellationRatePercentage({ studentCancellationCount: 3, attendedCount: 1, noShowCount: 2 })).toBe(50);
  });

  it("has no rate until the Class Session date carries a cancellation or a recorded outcome", () => {
    expect(studentCancellationRatePercentage({ studentCancellationCount: 0, attendedCount: 0, noShowCount: 0 })).toBeNull();
  });

  it("leaves Unrecorded attendance out of the denominator exactly as the Attendance Rate does", () => {
    // Unrecorded attendance is absent from both inputs, so no argument can carry it
    // into either ratio.
    const cancellationRate = studentCancellationRatePercentage({ studentCancellationCount: 1, attendedCount: 1, noShowCount: 0 });
    expect(cancellationRate).toBe(50);
    expect(attendanceRatePercentage({ attendedCount: 1, noShowCount: 0 })).toBe(100);
  });

  it("stays within 0 through 100 and rises only with Student Cancellations", () => {
    fc.assert(fc.property(count, count, count, (studentCancellationCount, attendedCount, noShowCount) => {
      const counts = { studentCancellationCount, attendedCount, noShowCount };
      const rate = studentCancellationRatePercentage(counts);
      if (studentCancellationCount + attendedCount + noShowCount === 0) return rate === null;
      const withOneMoreCancellation = studentCancellationRatePercentage({ ...counts, studentCancellationCount: studentCancellationCount + 1 })!;
      const withOneMoreAttended = studentCancellationRatePercentage({ ...counts, attendedCount: attendedCount + 1 })!;
      return rate !== null
        && rate >= 0 && rate <= 100
        && withOneMoreCancellation >= rate
        && withOneMoreAttended <= rate;
    }));
  });
});

describe("Student Cancellation timing policy", () => {
  it("counts a cancellation made at least 24 hours before the Class Session as timely", () => {
    expect(studentCancellationTiming(new Date("2026-06-09T15:00:00.000Z"), SESSION_START)).toBe("TIMELY");
    expect(studentCancellationTiming(new Date("2026-06-08T09:00:00.000Z"), SESSION_START)).toBe("TIMELY");
  });

  it("counts a cancellation made inside the last 24 hours as late", () => {
    expect(studentCancellationTiming(new Date("2026-06-09T15:00:00.001Z"), SESSION_START)).toBe("LATE");
    expect(studentCancellationTiming(new Date("2026-06-10T14:59:00.000Z"), SESSION_START)).toBe("LATE");
  });

  it("splits every cancellation into exactly one of timely or late", () => {
    fc.assert(fc.property(fc.integer({ min: -30 * 24 * 60, max: 30 * 24 * 60 }), (minutesBeforeStart) => {
      const cancelledAt = new Date(SESSION_START.getTime() - minutesBeforeStart * 60_000);
      const timing = studentCancellationTiming(cancelledAt, SESSION_START);
      return timing === (minutesBeforeStart >= 24 * 60 ? "TIMELY" : "LATE");
    }));
  });
});
