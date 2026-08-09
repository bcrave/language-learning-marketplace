import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  bookingWindowIsOpen,
  studentCancellationCreditOutcome,
} from "../src/index.js";

describe("Booking timing policy", () => {
  const startsAt = new Date("2026-08-10T12:00:00.000Z");

  it("keeps the exact Booking and Student Cancellation boundaries explicit", () => {
    expect(bookingWindowIsOpen(new Date("2026-08-10T11:30:00.000Z"), startsAt)).toBe(true);
    expect(bookingWindowIsOpen(new Date("2026-08-10T11:30:00.001Z"), startsAt)).toBe(false);
    expect(studentCancellationCreditOutcome(new Date("2026-08-09T12:00:00.000Z"), startsAt)).toBe("REFUND");
    expect(studentCancellationCreditOutcome(new Date("2026-08-09T12:00:00.001Z"), startsAt)).toBe("FORFEIT");
    expect(studentCancellationCreditOutcome(startsAt, startsAt)).toBe("CLOSED");
  });

  it("classifies generated instants without gaps around the accepted thresholds", () => {
    fc.assert(fc.property(
      fc.integer({ min: -48 * 60 * 60_000, max: 48 * 60 * 60_000 }),
      (offsetFromStart) => {
        const now = new Date(startsAt.getTime() + offsetFromStart);
        expect(bookingWindowIsOpen(now, startsAt)).toBe(offsetFromStart <= -30 * 60_000);
        expect(studentCancellationCreditOutcome(now, startsAt)).toBe(
          offsetFromStart >= 0
            ? "CLOSED"
            : offsetFromStart <= -24 * 60 * 60_000
              ? "REFUND"
              : "FORFEIT",
        );
      },
    ));
  });
});
