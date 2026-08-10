import { feedbackWindowIsOpen, sessionRatingWindowIsOpen } from "@marketplace/core";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

describe("feedback authoring windows", () => {
  it("include their exact deadlines and reject every later instant", () => {
    fc.assert(fc.property(fc.date({ min: new Date("2020-01-01T00:00:00.000Z"), max: new Date("2030-01-01T00:00:00.000Z"), noInvalidDate: true }), (eligibleFrom) => {
      const feedbackDeadline = new Date(eligibleFrom.getTime() + 48 * 60 * 60_000);
      const ratingDeadline = new Date(eligibleFrom.getTime() + 7 * 24 * 60 * 60_000);
      expect(feedbackWindowIsOpen(feedbackDeadline, eligibleFrom)).toBe(true);
      expect(feedbackWindowIsOpen(new Date(feedbackDeadline.getTime() + 1), eligibleFrom)).toBe(false);
      expect(sessionRatingWindowIsOpen(ratingDeadline, eligibleFrom)).toBe(true);
      expect(sessionRatingWindowIsOpen(new Date(ratingDeadline.getTime() + 1), eligibleFrom)).toBe(false);
    }));
  });
});
