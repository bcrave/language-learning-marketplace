import { describe, expect, it } from "vitest";
import { Temporal } from "@js-temporal/polyfill";
import fc from "fast-check";

import {
  localDateDurationHours,
  resolveFixedDurationLocalInterval,
  resolveLocalDateTime,
  resolveWeeklyRangeOccurrence,
} from "../src/teacher-availability/teacher-availability-time.js";

describe("Teacher Availability local time", () => {
  it("rejects a wall-clock time in a daylight-saving gap", () => {
    expect(() =>
      resolveLocalDateTime(
        "2026-03-08T02:30",
        "America/New_York",
        "REJECT",
      ),
    ).toThrowError("LOCAL_TIME_GAP");
  });

  it("requires an explicit occurrence for a wall-clock time in a fold", () => {
    expect(() =>
      resolveLocalDateTime(
        "2026-11-01T01:30",
        "America/New_York",
        "REJECT",
      ),
    ).toThrowError("LOCAL_TIME_FOLD");

    const earlier = resolveLocalDateTime(
      "2026-11-01T01:30",
      "America/New_York",
      "EARLIER",
    );
    const later = resolveLocalDateTime(
      "2026-11-01T01:30",
      "America/New_York",
      "LATER",
    );

    expect(later.epochMilliseconds - earlier.epochMilliseconds).toBe(3_600_000);
  });

  it("keeps a fixed-duration Class Session at 60 elapsed minutes across daylight-saving transitions", () => {
    const spring = resolveFixedDurationLocalInterval("2026-03-08T01:30", "America/Denver", "EARLIER", 60);
    expect(spring.endsAt.since(spring.startsAt).total({ unit: "minutes" })).toBe(60);
    expect(spring.endsAtLocal.toString()).toBe("2026-03-08T03:30:00");

    const earlierFold = resolveFixedDurationLocalInterval("2026-11-01T01:30", "America/Denver", "EARLIER", 60);
    const laterFold = resolveFixedDurationLocalInterval("2026-11-01T01:30", "America/Denver", "LATER", 60);
    expect(earlierFold.endsAtLocal.toString()).toBe("2026-11-01T01:30:00");
    expect(laterFold.endsAtLocal.toString()).toBe("2026-11-01T02:30:00");
  });

  it.each([
    ["2026-03-08", 23],
    ["2026-03-09", 24],
    ["2026-11-01", 25],
  ])("measures %s as a %i-hour local date", (date, hours) => {
    expect(localDateDurationHours(date, "America/New_York")).toBe(hours);
  });

  it("property: generated local dates preserve weekly wall time and have 23, 24, or 25 hours", () => {
    fc.assert(fc.property(
      fc.constantFrom("America/Denver", "America/New_York", "Europe/Madrid", "Asia/Tokyo"),
      fc.integer({ min: 0, max: 5_843 }),
      (timeZone, daysAfter2020) => {
        const date = Temporal.PlainDate.from("2020-01-01").add({ days: daysAfter2020 });
        expect([23, 24, 25]).toContain(localDateDurationHours(date.toString(), timeZone));
      const occurrence = resolveWeeklyRangeOccurrence(
        date.toString(),
        "09:00",
        "12:00",
          timeZone,
      );
        expect(occurrence.startsAt.toZonedDateTimeISO(timeZone).toPlainTime().toString()).toBe("09:00:00");
        expect(occurrence.endsAt.toZonedDateTimeISO(timeZone).toPlainTime().toString()).toBe("12:00:00");
      },
    ), { numRuns: 500 });

    expect(resolveWeeklyRangeOccurrence("2026-03-01", "09:00", "12:00", "America/Denver").startsAt.toString()).toBe("2026-03-01T16:00:00Z");
    expect(resolveWeeklyRangeOccurrence("2026-03-15", "09:00", "12:00", "America/Denver").startsAt.toString()).toBe("2026-03-15T15:00:00Z");
  });

  it("property: every resolvable fixed-duration interval lasts exactly 60 elapsed minutes", () => {
    fc.assert(fc.property(
      fc.constantFrom("America/Denver", "America/New_York", "Europe/Madrid", "Asia/Tokyo"),
      fc.integer({ min: 0, max: 365 }),
      fc.integer({ min: 0, max: 23 }),
      (timeZone, dayOffset, hour) => {
        const date = Temporal.PlainDate.from("2026-01-01").add({ days: dayOffset });
        const localDateTime = `${date.toString()}T${String(hour).padStart(2, "0")}:30`;
        try {
          const interval = resolveFixedDurationLocalInterval(localDateTime, timeZone, "EARLIER", 60);
          expect(interval.endsAt.epochMilliseconds - interval.startsAt.epochMilliseconds).toBe(3_600_000);
          expect(interval.endsAt.toZonedDateTimeISO(timeZone).toPlainDateTime().equals(interval.endsAtLocal)).toBe(true);
        } catch (error) {
          expect(error).toMatchObject({ message: "LOCAL_TIME_GAP" });
        }
      },
    ), { numRuns: 500 });
  });
});
