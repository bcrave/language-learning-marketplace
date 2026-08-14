import {
  attendanceRatePercentage,
  courseProgressGain,
  courseProgressPercentage,
  reportExceptionCount,
} from "@marketplace/core";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

const count = fc.integer({ min: 0, max: 500 });

describe("Organization attendance reporting policy", () => {
  it("divides Attended outcomes by every recorded outcome", () => {
    expect(attendanceRatePercentage({ attendedCount: 3, noShowCount: 1 })).toBe(75);
    expect(attendanceRatePercentage({ attendedCount: 1, noShowCount: 2 })).toBe(33);
  });

  it("has no Attendance Rate until an outcome is recorded, so Unrecorded attendance never counts as a No-show", () => {
    expect(attendanceRatePercentage({ attendedCount: 0, noShowCount: 0 })).toBeNull();
  });

  it("stays within 0 through 100 and rises only with Attended outcomes", () => {
    fc.assert(fc.property(count, count, (attendedCount, noShowCount) => {
      const rate = attendanceRatePercentage({ attendedCount, noShowCount });
      if (attendedCount + noShowCount === 0) return rate === null;
      const withOneMoreAttended = attendanceRatePercentage({ attendedCount: attendedCount + 1, noShowCount })!;
      const withOneMoreNoShow = attendanceRatePercentage({ attendedCount, noShowCount: noShowCount + 1 })!;
      return rate !== null
        && rate >= 0 && rate <= 100
        && withOneMoreAttended >= rate
        && withOneMoreNoShow <= rate;
    }));
  });

  it("counts every No-show, excluded Unrecorded outcome, and correction as a reportable exception", () => {
    fc.assert(fc.property(count, count, count, (noShowCount, excludedUnrecordedCount, correctedCount) => {
      expect(reportExceptionCount({ noShowCount, excludedUnrecordedCount, correctedCount }))
        .toBe(noShowCount + excludedUnrecordedCount + correctedCount);
    }));
  });
});

describe("Course Progress reporting policy", () => {
  it("reports no progress for a Course with no active Lesson Units rather than dividing by zero", () => {
    expect(courseProgressPercentage(0, 0)).toBe(0);
  });

  it("rounds the completed share of the active Lesson Unit denominator", () => {
    expect(courseProgressPercentage(1, 3)).toBe(33);
    expect(courseProgressPercentage(2, 3)).toBe(67);
    expect(courseProgressPercentage(4, 4)).toBe(100);
  });

  it("reports the gain between the baseline and the ending value of the same Sponsorship", () => {
    const gain = courseProgressGain(
      { completedActiveLessonUnitCount: 1, activeLessonUnitCount: 4 },
      { completedActiveLessonUnitCount: 3, activeLessonUnitCount: 4 },
    );
    expect(gain).toEqual({ completedLessonUnitGain: 2, percentagePointGain: 50 });
  });

  it("reports a negative gain when an accepted correction removed a completion attributed to the period", () => {
    const gain = courseProgressGain(
      { completedActiveLessonUnitCount: 2, activeLessonUnitCount: 4 },
      { completedActiveLessonUnitCount: 1, activeLessonUnitCount: 4 },
    );
    expect(gain).toEqual({ completedLessonUnitGain: -1, percentagePointGain: -25 });
  });

  it("keeps the gain consistent with the percentages it is derived from", () => {
    fc.assert(fc.property(count, count, count, (baselineCompleted, endingCompleted, activeLessonUnitCount) => {
      const baseline = { completedActiveLessonUnitCount: baselineCompleted, activeLessonUnitCount };
      const ending = { completedActiveLessonUnitCount: endingCompleted, activeLessonUnitCount };
      expect(courseProgressGain(baseline, ending)).toEqual({
        completedLessonUnitGain: endingCompleted - baselineCompleted,
        percentagePointGain: courseProgressPercentage(endingCompleted, activeLessonUnitCount)
          - courseProgressPercentage(baselineCompleted, activeLessonUnitCount),
      });
    }));
  });
});
