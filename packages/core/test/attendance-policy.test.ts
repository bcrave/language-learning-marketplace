import { establishesLessonUnitCompletion, type AttendanceOutcome } from "@marketplace/core";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

describe("Lesson Unit Completion policy", () => {
  it("tracks whether arbitrary Attendance command sequences retain any Attended support", () => {
    fc.assert(fc.property(
      fc.array(fc.record({ bookingIndex: fc.integer({ min: 0, max: 7 }), outcome: fc.constantFrom<AttendanceOutcome>("ATTENDED", "NO_SHOW") }), { maxLength: 100 }),
      (commands) => {
        const outcomesByBooking = new Map<number, AttendanceOutcome>();
        const attendedBookings = new Set<number>();
        for (const command of commands) {
          outcomesByBooking.set(command.bookingIndex, command.outcome);
          if (command.outcome === "ATTENDED") attendedBookings.add(command.bookingIndex);
          else attendedBookings.delete(command.bookingIndex);
          expect(establishesLessonUnitCompletion([...outcomesByBooking.values()])).toBe(attendedBookings.size > 0);
        }
      },
    ));
  });
});
