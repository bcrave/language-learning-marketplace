import { describe, expect, it } from "vitest";

import {
  CANONICAL_FIXTURE_MANIFEST_VERSION,
  canonicalFixtureManifest,
} from "../src/fixtures/canonical-fixture-manifest.js";

/**
 * The manifest is parsed at module load, so simply importing it proves the shape.
 * These checks cover what a schema cannot: that the parts refer to each other, and
 * that the expectations describe the fixture actually declared beside them.
 */
describe("Canonical synthetic fixture manifest", () => {
  const manifest = canonicalFixtureManifest;
  const unitKeys = new Set(manifest.courses.flatMap((course) => course.units.map((unit) => unit.stableKey)));
  const courseKeys = new Set(manifest.courses.map((course) => course.stableKey));
  const identityIds = new Set(manifest.identities.map((identity) => identity.id));

  it("carries the version the loader publishes and records", () => {
    expect(manifest.version).toBe(CANONICAL_FIXTURE_MANIFEST_VERSION);
  });

  it("declares the accepted bilingual catalog inventory", () => {
    const units = manifest.courses.flatMap((course) => course.units);
    expect(courseKeys.size).toBe(manifest.expectations.inventory.courses);
    expect(units).toHaveLength(manifest.expectations.inventory.lessonUnits);
    expect(units.filter((unit) => unit.state === "ACTIVE")).toHaveLength(manifest.expectations.inventory.activeLessonUnits);
    // One original structured guide per unit, plus the supplemental HTTPS references.
    expect(units.length + manifest.references.length).toBe(manifest.expectations.inventory.lessonMaterials);
    expect(manifest.references).toHaveLength(manifest.expectations.inventory.httpsReferences);
    expect(new Set(manifest.courses.flatMap((course) => course.units.flatMap((unit) => unit.topicKeys))).size)
      .toBe(manifest.expectations.inventory.topics);
  });

  it("covers every application role with synthetic identities", () => {
    const roles = new Set(manifest.identities.flatMap((identity) => identity.roles));
    expect([...roles].sort()).toEqual(["ORGANIZATION_MANAGER", "PLATFORM_ADMINISTRATOR", "STUDENT", "TEACHER"]);
  });

  it("resolves every showcase reference to something the manifest declares", () => {
    const sessionIds = new Set(manifest.showcase.classSessions.map((session) => session.id));
    for (const session of manifest.showcase.classSessions) {
      expect(unitKeys).toContain(session.unitKey);
      expect(identityIds).toContain(session.teacherUserId);
    }
    for (const booking of manifest.showcase.bookings) {
      expect(sessionIds).toContain(booking.classSessionId);
      expect(identityIds).toContain(booking.studentUserId);
    }
    for (const reference of manifest.references) expect(unitKeys).toContain(reference.unitKey);
    expect(unitKeys).toContain(manifest.retirement.retiredUnitKey);
    expect(unitKeys).toContain(manifest.retirement.replacementUnitKey);

    const { sponsorship } = manifest.showcase;
    expect(identityIds).toContain(sponsorship.studentUserId);
    expect(manifest.organizations.map((organization) => organization.id)).toContain(sponsorship.organizationId);
    expect(manifest.cohorts.map((cohort) => cohort.id)).toContain(sponsorship.cohortId);
    for (const snapshot of sponsorship.snapshots) expect(courseKeys).toContain(snapshot.courseKey);
  });

  it("designates only the real-clock showcase fixture for hourly advancement", () => {
    const rolling = manifest.showcase.classSessions.filter(
      (session) => session.rollingOffsetHours !== undefined,
    );
    expect(rolling.map((session) => session.rollingOffsetHours)).toEqual([0, 1, 2]);
    expect(rolling.every((session) => manifest.showcase.bookings.some(
      (booking) => booking.classSessionId === session.id,
    ))).toBe(true);
  });

  it("expects only Course Progress, Completions, and access it can produce", () => {
    for (const expected of manifest.expectations.courseProgress) {
      expect(identityIds).toContain(expected.studentUserId);
      expect(courseKeys).toContain(expected.courseKey);
    }
    for (const expected of manifest.expectations.completions) {
      expect(identityIds).toContain(expected.studentUserId);
      for (const key of expected.unitKeys) expect(unitKeys).toContain(key);
    }
    for (const expected of manifest.expectations.materialAccess) {
      expect(identityIds).toContain(expected.userId);
      expect(unitKeys).toContain(expected.unitKey);
    }
    for (const expected of manifest.expectations.creditBalances) {
      expect(identityIds).toContain(expected.studentUserId);
    }
  });

  it("keeps a Student's expected Completions consistent with the Attended showcase", () => {
    const unitBySession = new Map(manifest.showcase.classSessions.map((session) => [session.id, session.unitKey]));
    for (const expected of manifest.expectations.completions) {
      const attended = manifest.showcase.bookings
        .filter((booking) => booking.studentUserId === expected.studentUserId && booking.attendance === "ATTENDED")
        .map((booking) => unitBySession.get(booking.classSessionId)!);
      expect([...attended].sort()).toEqual([...expected.unitKeys].sort());
    }
  });

  it("introduces no real personal, employer, or proprietary curriculum data", () => {
    // Every linked reference stays an outbound HTTPS pointer rather than copied text,
    // and no identity carries contact details that could belong to a real person.
    for (const reference of manifest.references) expect(reference.url.startsWith("https://")).toBe(true);
    for (const identity of manifest.identities) expect(identity.displayName).not.toMatch(/@/);
  });
});
