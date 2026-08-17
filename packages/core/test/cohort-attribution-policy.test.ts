import {
  attributedCohortIds,
  cohortMembershipIsEffectiveAt,
  cohortMembershipWindowsOverlap,
  sponsorshipReportingIncludes,
  type CohortMembershipWindow,
} from "@marketplace/core";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

const anyInstant = fc.date({
  min: new Date("2020-01-01T00:00:00.000Z"),
  max: new Date("2040-01-01T00:00:00.000Z"),
  noInvalidDate: true,
});

function membership(cohortId: string, effectiveFrom: Date, effectiveUntil: Date | null): CohortMembershipWindow {
  return { cohortId, effectiveFrom, effectiveUntil };
}

describe("Cohort membership attribution policy", () => {
  it("treats a membership window as effective from its start instant until, but excluding, its end", () => {
    fc.assert(fc.property(anyInstant, fc.integer({ min: 1, max: 365 * 24 * 60 * 60_000 }), fc.integer({ min: -1, max: 1 }), (effectiveFrom, duration, nudge) => {
      const effectiveUntil = new Date(effectiveFrom.getTime() + duration);
      const open = membership("open", effectiveFrom, null);
      const bounded = membership("bounded", effectiveFrom, effectiveUntil);

      // The window is half-open, so a nudge past the start is only still inside it
      // while it has not also reached the end: for a one-millisecond membership the
      // two boundary probes are the same instant, and that instant is excluded.
      expect(cohortMembershipIsEffectiveAt(bounded, new Date(effectiveFrom.getTime() + nudge))).toBe(nudge >= 0 && nudge < duration);
      expect(cohortMembershipIsEffectiveAt(bounded, new Date(effectiveUntil.getTime() + nudge))).toBe(nudge < 0);
      expect(cohortMembershipIsEffectiveAt(open, effectiveUntil)).toBe(true);
      expect(cohortMembershipIsEffectiveAt(open, new Date(effectiveFrom.getTime() - 1))).toBe(false);
    }));
  });

  it("attributes an instant to every Cohort whose membership was effective when the activity occurred", () => {
    fc.assert(fc.property(
      anyInstant,
      fc.array(fc.tuple(fc.integer({ min: -10, max: 10 }), fc.integer({ min: 1, max: 20 }), fc.boolean()), { maxLength: 6 }),
      (occurredAt, specifications) => {
        const memberships = specifications.map(([startOffset, duration, open], index) => membership(
          `cohort-${index}`,
          new Date(occurredAt.getTime() + startOffset),
          open ? null : new Date(occurredAt.getTime() + startOffset + duration),
        ));
        const expected = memberships
          .filter((candidate) => cohortMembershipIsEffectiveAt(candidate, occurredAt))
          .map((candidate) => candidate.cohortId);

        expect(attributedCohortIds(memberships, occurredAt)).toEqual([...new Set(expected)].sort());
      },
    ));
  });

  it("attributes one sponsored Student to several Cohorts at the same instant", () => {
    const occurredAt = new Date("2026-05-01T00:00:00.000Z");
    const memberships = [
      membership("engineering", new Date("2026-01-01T00:00:00.000Z"), null),
      membership("spanish-pilot", new Date("2026-04-01T00:00:00.000Z"), new Date("2026-07-01T00:00:00.000Z")),
      membership("onboarding-2025", new Date("2025-01-01T00:00:00.000Z"), new Date("2026-01-01T00:00:00.000Z")),
    ];

    expect(attributedCohortIds(memberships, occurredAt)).toEqual(["engineering", "spanish-pilot"]);
  });

  it("never changes attribution for activity that occurred before a membership is ended", () => {
    fc.assert(fc.property(anyInstant, fc.integer({ min: 1, max: 90 * 24 * 60 * 60_000 }), fc.integer({ min: 1, max: 90 * 24 * 60 * 60_000 }), (effectiveFrom, beforeEnd, afterEnd) => {
      const endedAt = new Date(effectiveFrom.getTime() + beforeEnd + afterEnd);
      const occurredAt = new Date(effectiveFrom.getTime() + beforeEnd);
      const open = [membership("cohort", effectiveFrom, null)];
      const ended = [membership("cohort", effectiveFrom, endedAt)];

      expect(attributedCohortIds(ended, occurredAt)).toEqual(attributedCohortIds(open, occurredAt));
      expect(attributedCohortIds(ended, new Date(endedAt.getTime() + afterEnd))).toEqual([]);
    }));
  });

  it("detects overlapping windows symmetrically and only when some instant is effective in both", () => {
    fc.assert(fc.property(
      anyInstant,
      fc.integer({ min: -1_000, max: 1_000 }),
      fc.integer({ min: 1, max: 1_000 }),
      fc.integer({ min: 1, max: 1_000 }),
      fc.boolean(),
      (start, secondOffset, firstDuration, secondDuration, secondIsOpen) => {
        const first = membership("first", start, new Date(start.getTime() + firstDuration));
        const secondFrom = new Date(start.getTime() + secondOffset);
        const second = membership("second", secondFrom, secondIsOpen ? null : new Date(secondFrom.getTime() + secondDuration));

        const overlaps = cohortMembershipWindowsOverlap(first, second);
        expect(cohortMembershipWindowsOverlap(second, first)).toBe(overlaps);

        const sharedInstant = [start, secondFrom, new Date(start.getTime() + firstDuration - 1)]
          .some((instant) => cohortMembershipIsEffectiveAt(first, instant) && cohortMembershipIsEffectiveAt(second, instant));
        if (sharedInstant) expect(overlaps).toBe(true);
      },
    ));
  });
});

describe("Sponsorship reporting window policy", () => {
  it("reports activity from acceptance until, but excluding, the end instant", () => {
    fc.assert(fc.property(anyInstant, fc.integer({ min: 1, max: 365 * 24 * 60 * 60_000 }), fc.integer({ min: -1, max: 1 }), (acceptedAt, duration, nudge) => {
      const endedAt = new Date(acceptedAt.getTime() + duration);
      const active = { acceptedAt, endedAt: null };
      const ended = { acceptedAt, endedAt };

      expect(sponsorshipReportingIncludes(active, new Date(acceptedAt.getTime() + nudge))).toBe(nudge >= 0);
      expect(sponsorshipReportingIncludes(active, endedAt)).toBe(true);
      expect(sponsorshipReportingIncludes(ended, new Date(endedAt.getTime() + nudge))).toBe(nudge < 0);
      expect(sponsorshipReportingIncludes(ended, new Date(acceptedAt.getTime() - 1))).toBe(false);
    }));
  });

  it("freezes reporting at the end instant without changing earlier attributed activity", () => {
    fc.assert(fc.property(anyInstant, fc.integer({ min: 1, max: 1_000 }), fc.integer({ min: 1, max: 1_000 }), (acceptedAt, beforeEnd, afterEnd) => {
      const endedAt = new Date(acceptedAt.getTime() + beforeEnd + afterEnd);
      const occurredAt = new Date(acceptedAt.getTime() + beforeEnd);

      expect(sponsorshipReportingIncludes({ acceptedAt, endedAt }, occurredAt)).toBe(true);
      expect(sponsorshipReportingIncludes({ acceptedAt, endedAt }, new Date(endedAt.getTime() + afterEnd))).toBe(false);
    }));
  });
});
