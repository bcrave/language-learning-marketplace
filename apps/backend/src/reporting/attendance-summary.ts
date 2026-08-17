import { attendanceRatePercentage, reportExceptionCount } from "@marketplace/core";

/**
 * The Attendance tallies every report projects the same way, whatever it is scoped
 * to. An Organization counts them inside one Sponsorship and the marketplace report
 * counts them across a date range, but the rate, the disclosed exclusion, and the
 * exception total are one definition and belong in one place.
 */
export type AttendanceCounts = {
  attendedCount: number;
  noShowCount: number;
  excludedUnrecordedCount: number;
  correctedCount: number;
};

export function emptyAttendanceCounts(): AttendanceCounts {
  return { attendedCount: 0, noShowCount: 0, excludedUnrecordedCount: 0, correctedCount: 0 };
}

export function projectAttendanceSummary(counts: AttendanceCounts) {
  return {
    attendedCount: counts.attendedCount,
    noShowCount: counts.noShowCount,
    recordedCount: counts.attendedCount + counts.noShowCount,
    attendanceRatePercentage: attendanceRatePercentage(counts),
    excludedUnrecordedCount: counts.excludedUnrecordedCount,
    correctedCount: counts.correctedCount,
    exceptionCount: reportExceptionCount(counts),
  };
}
