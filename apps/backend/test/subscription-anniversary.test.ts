import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { monthlySubscriptionAnniversary } from "../src/subscription/subscription-time.js";

describe("monthlySubscriptionAnniversary", () => {
  it("returns to the original day after a short month instead of drifting", () => {
    const activation = new Date("2027-01-31T16:30:45.123Z");

    expect(monthlySubscriptionAnniversary(activation, 1).toISOString()).toBe("2027-02-28T16:30:45.123Z");
    expect(monthlySubscriptionAnniversary(activation, 2).toISOString()).toBe("2027-03-31T16:30:45.123Z");
  });

  it("preserves the UTC accounting time and original day whenever the month contains it", () => {
    fc.assert(fc.property(
      fc.date({ min: new Date("2020-01-01T00:00:00.000Z"), max: new Date("2035-12-31T23:59:59.999Z"), noInvalidDate: true }),
      fc.integer({ min: 1, max: 60 }),
      (activation, monthOffset) => {
        const anniversary = monthlySubscriptionAnniversary(activation, monthOffset);
        const expectedDay = Math.min(activation.getUTCDate(), daysInUtcMonth(anniversary));

        expect(anniversary.getUTCDate()).toBe(expectedDay);
        expect(anniversary.getUTCHours()).toBe(activation.getUTCHours());
        expect(anniversary.getUTCMinutes()).toBe(activation.getUTCMinutes());
        expect(anniversary.getUTCSeconds()).toBe(activation.getUTCSeconds());
        expect(anniversary.getUTCMilliseconds()).toBe(activation.getUTCMilliseconds());
      },
    ));
  });
});

function daysInUtcMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
}
