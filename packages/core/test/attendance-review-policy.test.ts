import {
  attendanceReviewDeadline,
  attendanceReviewWindowIsOpen,
  decidedAttendanceOutcome,
  type AttendanceOutcome,
  type AttendanceReviewDecision,
} from "@marketplace/core";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

const SEVEN_DAYS_IN_MILLISECONDS = 7 * 24 * 60 * 60_000;

describe("Attendance Review Request policy", () => {
  it("opens the review window for exactly seven days after Attendance publication", () => {
    fc.assert(fc.property(
      fc.date({ min: new Date("2020-01-01T00:00:00.000Z"), max: new Date("2040-01-01T00:00:00.000Z"), noInvalidDate: true }),
      fc.integer({ min: -SEVEN_DAYS_IN_MILLISECONDS, max: 2 * SEVEN_DAYS_IN_MILLISECONDS }),
      (publishedAt, offset) => {
        const now = new Date(publishedAt.getTime() + offset);
        expect(attendanceReviewDeadline(publishedAt).getTime()).toBe(publishedAt.getTime() + SEVEN_DAYS_IN_MILLISECONDS);
        expect(attendanceReviewWindowIsOpen(now, publishedAt)).toBe(offset <= SEVEN_DAYS_IN_MILLISECONDS);
      },
    ));
  });

  it("keeps an upheld decision effective and makes every correction a reversible flip", () => {
    fc.assert(fc.property(
      fc.constantFrom<AttendanceOutcome>("ATTENDED", "NO_SHOW"),
      fc.array(fc.constantFrom<AttendanceReviewDecision>("UPHOLD", "CORRECT"), { maxLength: 20 }),
      (publishedOutcome, decisions) => {
        let effective = publishedOutcome;
        let corrections = 0;
        for (const decision of decisions) {
          const decided = decidedAttendanceOutcome(decision, effective);
          if (decision === "UPHOLD") expect(decided).toBe(effective);
          else expect(decided).not.toBe(effective);
          if (decision === "CORRECT") corrections += 1;
          effective = decided;
        }
        expect(effective).toBe(corrections % 2 === 0 ? publishedOutcome : publishedOutcome === "ATTENDED" ? "NO_SHOW" : "ATTENDED");
      },
    ));
  });
});
