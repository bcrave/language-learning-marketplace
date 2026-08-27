import { z } from "zod";

import { canonicalCurriculumFixtures } from "../database/canonical-curriculum-fixtures.js";

/**
 * The canonical synthetic fixture manifest is the versioned specification of the
 * public demonstration's mutable business state. It is fixture *input*: stable keys,
 * offsets, and expectations describe what the demonstration must show, and the loader
 * decides how to persist them. Nothing here dictates the persistence schema, and
 * nothing here is real personal, employer, or proprietary curriculum data.
 *
 * The version changes whenever the accepted showcase changes, so a Canonical Data
 * Rebuild can record which baseline it published.
 */
export const CANONICAL_FIXTURE_MANIFEST_VERSION = "2026-08-26.1";

/** Demonstration identities. Every one is synthetic and shared with reviewers. */
export const CANONICAL_STUDENT_ID = "00000000-0000-4000-8000-000000000001";
export const CANONICAL_ENGLISH_STUDENT_ID = "00000000-0000-4000-8000-000000000002";
export const CANONICAL_FIRST_USE_STUDENT_ID = "00000000-0000-4000-8000-000000000003";
export const CANONICAL_LIMITED_STUDENT_ID = "00000000-0000-4000-8000-000000000004";
export const CANONICAL_CORRECTED_STUDENT_ID = "00000000-0000-4000-8000-000000000005";
export const CANONICAL_SUSPENDED_STUDENT_ID = "00000000-0000-4000-8000-000000000006";

export const CANONICAL_SUBSCRIPTION_ID = "00000000-0000-4000-8000-000000000031";
export const CANONICAL_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000041";
export const CANONICAL_SECONDARY_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000042";
export const CANONICAL_PENDING_INVITATION_ID = "00000000-0000-4000-8000-000000000043";
export const CANONICAL_COHORT_ID = "00000000-0000-4000-8000-000000000044";
export const CANONICAL_ACCEPTED_INVITATION_ID = "00000000-0000-4000-8000-000000000045";
export const CANONICAL_SPONSORSHIP_ID = "00000000-0000-4000-8000-000000000046";
export const CANONICAL_COHORT_MEMBERSHIP_ID = "00000000-0000-4000-8000-000000000047";

/** Synthetic issuer: no demonstration identity maps to a real external account. */
export const CANONICAL_IDENTITY_ISSUER = "https://fake.local/";

/**
 * A Lesson Unit's original guide is titled in the unit's own target language, which
 * is how the fixture keeps authored content out of Interface Locale's reach. The
 * loader writes this title and the invariants read it back, so both ask one function.
 */
export function lessonGuideTitle(unitStableKey: string, unitTitle: string) {
  return unitStableKey.startsWith("es-") ? `Guía de la unidad: ${unitTitle}` : `Lesson guide: ${unitTitle}`;
}

const curriculumLevel = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
const userRole = z.enum(["STUDENT", "TEACHER", "ORGANIZATION_MANAGER", "PLATFORM_ADMINISTRATOR"]);
const uuid = z.uuid();
const courseKey = z.string().regex(/^[a-z]{2}-(a1|a2|b1|b2|c1|c2)$/);
const unitKey = z.string().regex(/^[a-z]{2}-(a1|a2|b1|b2|c1|c2)-[0-9]{2}$/);
const timeZone = z.string().regex(/^[A-Za-z_]+\/[A-Za-z0-9_+/-]+$/);
const topicKey = z.string().regex(/^[A-Z]{2,8}$/);

const identitySchema = z.object({
  id: uuid,
  displayName: z.string().min(1).max(100),
  /** Null on both preference fields models a User who has never chosen. */
  interfaceLocale: z.enum(["en", "es"]).nullable(),
  displayTimeZone: timeZone.nullable(),
  roles: z.array(userRole).min(1),
  accessStatus: z.enum(["ACTIVE", "SUSPENDED"]),
  suspension: z.object({ reason: z.string().min(3).max(500), byUserId: uuid, offsetDays: z.number().int() }).optional(),
  placements: z.array(z.object({ targetLanguage: z.string().length(2), curriculumLevel })).default([]),
}).refine(
  (identity) => (identity.interfaceLocale === null) === (identity.displayTimeZone === null),
  "Interface Locale and Display Time Zone are chosen together or not at all",
).refine(
  (identity) => (identity.accessStatus === "SUSPENDED") === (identity.suspension !== undefined),
  "A suspended identity carries its User-visible reason",
);

const teacherSchema = z.object({
  teacherUserId: uuid,
  pronouns: z.string().min(1).max(40).nullable(),
  professionalBiography: z.string().min(1).max(1000),
  topicKeys: z.array(topicKey).min(1),
  qualifications: z.array(z.object({ targetLanguage: z.string().length(2), curriculumLevel })).min(1),
});

const classSessionSchema = z.object({
  id: uuid,
  unitKey,
  teacherUserId: uuid,
  /** Whole days from the load instant; the start is then snapped to the hour. */
  offsetDays: z.number().int(),
  schedulingTimeZone: timeZone,
  seatCapacity: z.number().int().min(2).max(8),
});

const bookingSchema = z.object({
  id: uuid,
  classSessionId: uuid,
  studentUserId: uuid,
  state: z.enum(["ACTIVE", "ENDED"]),
  terminalReason: z.literal("STUDENT_CANCELLATION").optional(),
  classCreditRefunded: z.boolean().default(false),
  /** The effective Attendance Record outcome, after any correction below. */
  attendance: z.enum(["ATTENDED", "NO_SHOW"]).optional(),
  correctedFrom: z.object({
    outcome: z.enum(["ATTENDED", "NO_SHOW"]),
    reason: z.string().min(10).max(500),
    byUserId: uuid,
  }).optional(),
}).refine(
  (booking) => (booking.state === "ENDED") === (booking.terminalReason !== undefined),
  "An ended Booking carries an explicit terminal reason",
).refine(
  (booking) => booking.correctedFrom === undefined || booking.attendance !== undefined,
  "A correction needs an Attendance Record to correct",
);

const creditEntrySchema = z.object({
  studentUserId: uuid,
  amount: z.number().int().refine((amount) => amount !== 0, "A ledger entry moves the balance"),
  source: z.enum(["CREDIT_ADJUSTMENT", "ORGANIZATION_CREDIT_GRANT"]),
  sourceReference: z.string().min(1),
  reason: z.string().min(3).max(200).nullable(),
}).refine(
  (entry) => entry.source !== "CREDIT_ADJUSTMENT" || entry.reason !== null,
  "A Credit Adjustment carries a concise Student-visible reason",
);

const sponsorshipSchema = z.object({
  id: uuid,
  invitationId: uuid,
  organizationId: uuid,
  studentUserId: uuid,
  invitedByUserId: uuid,
  acceptedOffsetDays: z.number().int(),
  endedOffsetDays: z.number().int(),
  endedByParty: z.enum(["STUDENT", "ORGANIZATION"]),
  endedByUserId: uuid,
  cohortId: uuid,
  cohortMembershipId: uuid,
  snapshots: z.array(z.object({
    boundary: z.enum(["SPONSORSHIP_START", "SPONSORSHIP_END"]),
    courseKey,
    completedActiveLessonUnitCount: z.number().int().min(0),
    activeLessonUnitCount: z.number().int().positive(),
  })).min(2),
}).refine(
  (sponsorship) => sponsorship.acceptedOffsetDays < sponsorship.endedOffsetDays,
  "A Sponsorship ends after it is accepted",
);

const manifestSchema = z.object({
  version: z.string().min(1),
  identities: z.array(identitySchema).min(1),
  teachers: z.array(teacherSchema).min(1),
  organizations: z.array(z.object({ id: uuid, name: z.string().min(1), managerUserIds: z.array(uuid).min(1) })).min(1),
  cohorts: z.array(z.object({ id: uuid, organizationId: uuid, name: z.string().min(1), createdByUserId: uuid })).min(1),
  pendingInvitation: z.object({ id: uuid, organizationId: uuid, studentUserId: uuid, invitedByUserId: uuid }),
  subscription: z.object({ id: uuid, studentUserId: uuid }),
  courses: z.array(z.object({
    stableKey: courseKey,
    title: z.string().min(1).max(120),
    summary: z.string().min(1).max(500),
    units: z.array(z.object({
      stableKey: unitKey,
      title: z.string().min(1).max(160),
      state: z.enum(["ACTIVE", "RETIRED"]),
      order: z.number().int().positive(),
      summary: z.string().min(1).max(500),
      objectives: z.array(z.string().min(1)).min(1),
      topicKeys: z.array(topicKey).min(1).max(2),
    })).min(1),
  })).min(1),
  /**
   * Supplemental HTTPS materials. Each stays independently licensed by its publisher:
   * the fixture records where it points and who publishes it, and copies nothing.
   */
  references: z.array(z.object({ unitKey, title: z.string().min(1).max(160), url: z.url().startsWith("https://") })).min(1),
  retirement: z.object({ retiredUnitKey: unitKey, replacementUnitKey: unitKey }),
  showcase: z.object({
    classSessions: z.array(classSessionSchema).min(1),
    bookings: z.array(bookingSchema).min(1),
    creditEntries: z.array(creditEntrySchema),
    sponsorship: sponsorshipSchema,
  }),
  expectations: z.object({
    inventory: z.object({
      courses: z.number().int().positive(),
      lessonUnits: z.number().int().positive(),
      activeLessonUnits: z.number().int().positive(),
      lessonMaterials: z.number().int().positive(),
      httpsReferences: z.number().int().positive(),
      topics: z.number().int().positive(),
    }),
    courseProgress: z.array(z.object({
      studentUserId: uuid,
      courseKey,
      completedActiveLessonUnitCount: z.number().int().min(0),
      activeLessonUnitCount: z.number().int().positive(),
    })).min(1),
    creditBalances: z.array(z.object({ studentUserId: uuid, availableBalance: z.number().int().min(0) })).min(1),
    completions: z.array(z.object({ studentUserId: uuid, unitKeys: z.array(unitKey) })).min(1),
    materialAccess: z.array(z.object({
      userId: uuid,
      actingRole: userRole,
      unitKey,
      granted: z.boolean(),
    })).min(1),
  }),
});

export type CanonicalFixtureManifest = z.infer<typeof manifestSchema>;
export type CanonicalIdentity = CanonicalFixtureManifest["identities"][number];
export type CanonicalClassSession = CanonicalFixtureManifest["showcase"]["classSessions"][number];
export type CanonicalBooking = CanonicalFixtureManifest["showcase"]["bookings"][number];

const SOFIA = CANONICAL_STUDENT_ID;
const ALEX = CANONICAL_ENGLISH_STUDENT_ID;
const JORDAN = CANONICAL_FIRST_USE_STUDENT_ID;
const CASEY = CANONICAL_LIMITED_STUDENT_ID;
const PRIYA = CANONICAL_CORRECTED_STUDENT_ID;
const DANA = CANONICAL_SUSPENDED_STUDENT_ID;

const showcaseId = (suffix: string) => `00000000-0000-4000-8000-0000000000${suffix}`;

const session = (suffix: string, unit: string, offsetDays: number, seatCapacity = 5) => ({
  id: showcaseId(suffix),
  unitKey: unit,
  teacherUserId: SOFIA,
  offsetDays,
  schedulingTimeZone: "America/Denver",
  seatCapacity,
});

const attendedBooking = (suffix: string, sessionSuffix: string, studentUserId: string) => ({
  id: showcaseId(suffix),
  classSessionId: showcaseId(sessionSuffix),
  studentUserId,
  state: "ACTIVE",
  attendance: "ATTENDED",
});

/**
 * Identities, curriculum, and showcase states accepted for the public demonstration.
 * The curriculum catalog is the published fixture manifest document; the showcase
 * states below are the lifecycle, relationship, privacy, correction, and reporting
 * demonstrations that same document specifies.
 */
export const canonicalFixtureManifest: CanonicalFixtureManifest = manifestSchema.parse({
  version: CANONICAL_FIXTURE_MANIFEST_VERSION,
  identities: [
    // The shared multi-role reviewer identity, and the Teacher of every showcase
    // Class Session. Acting as Teacher she reaches only her own assignments.
    {
      id: SOFIA, displayName: "Sofía Rivera", interfaceLocale: "es", displayTimeZone: "America/Denver",
      accessStatus: "ACTIVE", roles: ["STUDENT", "TEACHER", "ORGANIZATION_MANAGER", "PLATFORM_ADMINISTRATOR"],
      placements: [{ targetLanguage: "en", curriculumLevel: "A1" }],
    },
    // The shared Student carrying the accepted learning history, the ended
    // Sponsorship, and a future Booking. Also a qualified Teacher with no assignment,
    // which is how the demonstration shows that Teacher Qualification alone never
    // opens Lesson Materials.
    {
      id: ALEX, displayName: "Alex Morgan", interfaceLocale: "en", displayTimeZone: "America/New_York",
      accessStatus: "ACTIVE", roles: ["STUDENT", "TEACHER", "ORGANIZATION_MANAGER", "PLATFORM_ADMINISTRATOR"],
      placements: [{ targetLanguage: "en", curriculumLevel: "A2" }, { targetLanguage: "es", curriculumLevel: "B1" }],
    },
    { id: JORDAN, displayName: "Jordan Lee", interfaceLocale: null, displayTimeZone: null, accessStatus: "ACTIVE", roles: ["STUDENT"] },
    {
      id: CASEY, displayName: "Casey Nguyen", interfaceLocale: "en", displayTimeZone: "America/Chicago",
      accessStatus: "ACTIVE", roles: ["STUDENT"], placements: [{ targetLanguage: "es", curriculumLevel: "A1" }],
    },
    {
      id: PRIYA, displayName: "Priya Raman", interfaceLocale: "en", displayTimeZone: "Europe/London",
      accessStatus: "ACTIVE", roles: ["STUDENT"], placements: [{ targetLanguage: "en", curriculumLevel: "A1" }],
    },
    {
      id: DANA, displayName: "Dana Whitfield", interfaceLocale: "en", displayTimeZone: "America/Los_Angeles",
      accessStatus: "SUSPENDED", roles: ["STUDENT"],
      suspension: { reason: "Suspended in the sample marketplace to show blocked access.", byUserId: SOFIA, offsetDays: -5 },
    },
  ],
  teachers: [
    {
      teacherUserId: SOFIA, pronouns: "ella/she",
      professionalBiography: "Bilingual teacher focused on practical conversation.",
      topicKeys: ["EC", "PL"],
      qualifications: [
        { targetLanguage: "en", curriculumLevel: "A1" },
        { targetLanguage: "en", curriculumLevel: "A2" },
        { targetLanguage: "es", curriculumLevel: "A1" },
        { targetLanguage: "es", curriculumLevel: "B1" },
      ],
    },
    {
      teacherUserId: ALEX, pronouns: null,
      professionalBiography: "Qualified for English A1 and currently leads no Class Sessions.",
      topicKeys: ["RW"],
      qualifications: [{ targetLanguage: "en", curriculumLevel: "A1" }],
    },
  ],
  organizations: [
    { id: CANONICAL_ORGANIZATION_ID, name: "Nimbus Logistics", managerUserIds: [SOFIA] },
    { id: CANONICAL_SECONDARY_ORGANIZATION_ID, name: "Riverside Health", managerUserIds: [ALEX] },
  ],
  cohorts: [{ id: CANONICAL_COHORT_ID, organizationId: CANONICAL_ORGANIZATION_ID, name: "Warehouse Operations", createdByUserId: SOFIA }],
  pendingInvitation: { id: CANONICAL_PENDING_INVITATION_ID, organizationId: CANONICAL_ORGANIZATION_ID, studentUserId: CASEY, invitedByUserId: SOFIA },
  subscription: { id: CANONICAL_SUBSCRIPTION_ID, studentUserId: SOFIA },
  courses: canonicalCurriculumFixtures,
  references: [
    { unitKey: "en-a1-02", title: "Transport for London maps", url: "https://tfl.gov.uk/maps_/maps" },
    { unitKey: "en-a1-05", title: "Met Office UK forecast guide", url: "https://weather.metoffice.gov.uk/guides/uk-forecast" },
    { unitKey: "es-a1-03", title: "Gastronomía y enoturismo — Spain.info", url: "https://www.spain.info/es/gastronomia-enoturismo/" },
    { unitKey: "es-a1-04", title: "Actividades del AVE: pedir y dar la hora", url: "https://cvc.cervantes.es/ensenanza/actividades_ave/niveli/ficha_02.htm" },
  ],
  retirement: { retiredUnitKey: "en-a1-00", replacementUnitKey: "en-a1-01" },
  showcase: {
    classSessions: [
      session("51", "en-a1-00", -200),
      session("52", "en-a1-02", -150),
      session("53", "en-a1-03", -100),
      session("54", "en-a1-06", -80),
      session("55", "en-a2-01", -70),
      session("56", "en-a2-02", -60),
      session("57", "es-a1-01", -50),
      session("58", "es-a1-04", -40),
      // The smallest accepted Seat Capacity, so the range's lower bound is exercised.
      session("59", "es-a1-03", -20, 2),
      session("5a", "en-a1-05", -10),
      // The one still-actionable Class Session: the future Booking and the Teacher's
      // relationship-scoped Lesson Material access both hang off it.
      session("5b", "en-a1-05", 3),
    ],
    bookings: [
      attendedBooking("61", "51", ALEX),
      attendedBooking("62", "52", ALEX),
      attendedBooking("63", "53", ALEX),
      attendedBooking("64", "54", ALEX),
      attendedBooking("65", "55", ALEX),
      attendedBooking("66", "56", ALEX),
      attendedBooking("67", "57", ALEX),
      attendedBooking("68", "58", ALEX),
      // A timely Student Cancellation: the credit returns and no Completion is earned,
      // so this Student never reaches the Lesson Materials of `es-a1-03`.
      {
        id: showcaseId("69"), classSessionId: showcaseId("59"), studentUserId: CASEY,
        state: "ENDED", terminalReason: "STUDENT_CANCELLATION", classCreditRefunded: true,
      },
      // A sole Attended outcome corrected to No-show, which withdraws the Lesson Unit
      // Completion and the Lesson Material access that rested on it.
      {
        id: showcaseId("6a"), classSessionId: showcaseId("5a"), studentUserId: PRIYA,
        state: "ACTIVE", attendance: "NO_SHOW",
        correctedFrom: {
          outcome: "ATTENDED", byUserId: SOFIA,
          reason: "Attendance Review upheld the Student's absence from this Class Session.",
        },
      },
      { id: showcaseId("6b"), classSessionId: showcaseId("5b"), studentUserId: ALEX, state: "ACTIVE" },
    ],
    creditEntries: [
      { studentUserId: ALEX, amount: 8, source: "ORGANIZATION_CREDIT_GRANT", sourceReference: `${CANONICAL_SPONSORSHIP_ID}:1`, reason: null },
      { studentUserId: ALEX, amount: 4, source: "CREDIT_ADJUSTMENT", sourceReference: "canonical-fixtures:alex-welcome", reason: "Welcome credits for the sample marketplace." },
      { studentUserId: CASEY, amount: 3, source: "CREDIT_ADJUSTMENT", sourceReference: "canonical-fixtures:casey-welcome", reason: "Welcome credits for the sample marketplace." },
      { studentUserId: PRIYA, amount: 2, source: "CREDIT_ADJUSTMENT", sourceReference: "canonical-fixtures:priya-welcome", reason: "Welcome credits for the sample marketplace." },
    ],
    sponsorship: {
      id: CANONICAL_SPONSORSHIP_ID,
      invitationId: CANONICAL_ACCEPTED_INVITATION_ID,
      organizationId: CANONICAL_ORGANIZATION_ID,
      studentUserId: ALEX,
      invitedByUserId: SOFIA,
      acceptedOffsetDays: -120,
      endedOffsetDays: -30,
      endedByParty: "ORGANIZATION",
      endedByUserId: SOFIA,
      cohortId: CANONICAL_COHORT_ID,
      cohortMembershipId: CANONICAL_COHORT_MEMBERSHIP_ID,
      snapshots: [
        // Acceptance freezes the baseline: only `en-a1-02` counted then, and the
        // retired `en-a1-00` Completion contributes nothing to either boundary.
        { boundary: "SPONSORSHIP_START", courseKey: "en-a1", completedActiveLessonUnitCount: 1, activeLessonUnitCount: 6 },
        { boundary: "SPONSORSHIP_END", courseKey: "en-a1", completedActiveLessonUnitCount: 3, activeLessonUnitCount: 6 },
        { boundary: "SPONSORSHIP_END", courseKey: "en-a2", completedActiveLessonUnitCount: 2, activeLessonUnitCount: 2 },
        { boundary: "SPONSORSHIP_END", courseKey: "es-a1", completedActiveLessonUnitCount: 2, activeLessonUnitCount: 6 },
      ],
    },
  },
  expectations: {
    inventory: { courses: 12, lessonUnits: 33, activeLessonUnits: 32, lessonMaterials: 37, httpsReferences: 4, topics: 8 },
    courseProgress: [
      { studentUserId: ALEX, courseKey: "en-a1", completedActiveLessonUnitCount: 3, activeLessonUnitCount: 6 },
      { studentUserId: ALEX, courseKey: "en-a2", completedActiveLessonUnitCount: 2, activeLessonUnitCount: 2 },
      { studentUserId: ALEX, courseKey: "es-a1", completedActiveLessonUnitCount: 2, activeLessonUnitCount: 6 },
      { studentUserId: ALEX, courseKey: "es-b1", completedActiveLessonUnitCount: 0, activeLessonUnitCount: 2 },
    ],
    // Eight subscription credits for Sofía; eight sponsored plus four adjusted less
    // nine Bookings for Alex; three adjusted less one refunded Booking for Casey;
    // two adjusted less one forfeited Booking for Priya.
    creditBalances: [
      { studentUserId: SOFIA, availableBalance: 8 },
      { studentUserId: ALEX, availableBalance: 3 },
      { studentUserId: CASEY, availableBalance: 3 },
      { studentUserId: PRIYA, availableBalance: 1 },
    ],
    completions: [
      { studentUserId: ALEX, unitKeys: ["en-a1-00", "en-a1-02", "en-a1-03", "en-a1-06", "en-a2-01", "en-a2-02", "es-a1-01", "es-a1-04"] },
      { studentUserId: CASEY, unitKeys: [] },
      { studentUserId: PRIYA, unitKeys: [] },
    ],
    materialAccess: [
      // A Completion keeps the retired unit's guide reachable, while its replacement
      // stays closed: replacement never transfers Completion.
      { userId: ALEX, actingRole: "STUDENT", unitKey: "en-a1-00", granted: true },
      { userId: ALEX, actingRole: "STUDENT", unitKey: "en-a1-01", granted: false },
      // An active future Booking opens both of `en-a1-05`'s materials.
      { userId: ALEX, actingRole: "STUDENT", unitKey: "en-a1-05", granted: true },
      // The same person, acting as a qualified but unassigned Teacher, gets nothing.
      { userId: ALEX, actingRole: "TEACHER", unitKey: "en-a1-05", granted: false },
      { userId: SOFIA, actingRole: "TEACHER", unitKey: "en-a1-05", granted: true },
      // The Teacher's window closes behind her: a long-finished assignment is gone.
      { userId: SOFIA, actingRole: "TEACHER", unitKey: "en-a1-02", granted: false },
      // Reporting relationships never open curriculum content.
      { userId: SOFIA, actingRole: "ORGANIZATION_MANAGER", unitKey: "en-a1-05", granted: false },
      // A Student Cancellation without a Completion closes the unit outright.
      { userId: CASEY, actingRole: "STUDENT", unitKey: "es-a1-03", granted: false },
      // The corrected Student keeps this unit open through her still-active Booking,
      // not through the Completion the correction withdrew: Lesson Material access
      // rests on an active Booking *or* a Completion, and she still holds the first.
      // Her withdrawn Completion is pinned by `expectations.completions` instead.
      { userId: PRIYA, actingRole: "STUDENT", unitKey: "en-a1-05", granted: true },
    ],
  },
});
