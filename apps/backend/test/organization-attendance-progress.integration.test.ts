import { randomUUID } from "node:crypto";

import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApi } from "../src/api/app.js";
import { createDatabase, type Database } from "../src/database/database.js";
import { migrateDatabase } from "../src/database/migrate.js";

const SPONSORSHIP_START = new Date("2026-03-01T00:00:00.000Z");
const PILOT_MEMBERSHIP_START = new Date("2026-04-01T00:00:00.000Z");
const SPONSORSHIP_END = new Date("2026-05-01T00:00:00.000Z");
const CORRECTION_INSTANT = new Date("2026-06-20T00:00:00.000Z");
const REPORT_INSTANT = new Date("2026-06-25T00:00:00.000Z");

const REPORT_FIELDS = `
  organization { id name }
  generatedAt
  attendance { attendedCount noShowCount recordedCount attendanceRatePercentage excludedUnrecordedCount correctedCount exceptionCount }
  students {
    sponsorshipId
    studentDisplayName
    state
    reportingFrom
    reportingUntil
    cohortNames
    attendance { attendedCount noShowCount recordedCount attendanceRatePercentage excludedUnrecordedCount correctedCount exceptionCount }
    courseProgress {
      courseTitle
      baseline { completedActiveLessonUnitCount activeLessonUnitCount percentage }
      endingSnapshot { completedActiveLessonUnitCount activeLessonUnitCount percentage }
      currentEffective { completedActiveLessonUnitCount activeLessonUnitCount percentage }
      completedLessonUnitGain
      percentagePointGain
      snapshotRevisionCount
      lastRevisedAt
    }
  }
  cohorts { cohortName sponsoredStudentCount attendance { attendedCount noShowCount excludedUnrecordedCount exceptionCount attendanceRatePercentage } }
`;

describe("Organization attendance and progress reporting GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  let now = new Date("2026-02-01T00:00:00.000Z");
  let courseId: string;

  const managerId = randomUUID();
  const managerSubject = randomUUID();
  const rivalManagerId = randomUUID();
  const rivalManagerSubject = randomUUID();
  const teacherId = randomUUID();
  const administratorId = randomUUID();
  const administratorSubject = randomUUID();
  const sofiaId = randomUUID();
  const sofiaSubject = randomUUID();
  const danaId = randomUUID();
  const danaSubject = randomUUID();
  const quinnId = randomUUID();
  const quinnSubject = randomUUID();
  const umaId = randomUUID();
  const organizationId = randomUUID();
  const rivalOrganizationId = randomUUID();

  const lessonUnitIds: string[] = [];
  let sofiaSponsorshipId: string;
  let danaSponsorshipId: string;
  let engineeringCohortId: string;
  let pilotCohortId: string;
  let rivalCohortId: string;
  let noShowSessionId: string;
  const noShowBookingIds = new Map<string, string>();

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(postgres, `org_reports_${randomUUID().replaceAll("-", "")}`);
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test", now: () => now });

    await db.insertInto("users").values([
      { id: managerId, identity_issuer: "https://fake.local/", identity_subject: managerSubject, display_name: "Morgan Manager", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: rivalManagerId, identity_issuer: "https://fake.local/", identity_subject: rivalManagerSubject, display_name: "Riley Rival", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: teacherId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Tomás Teacher", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: administratorId, identity_issuer: "https://fake.local/", identity_subject: administratorSubject, display_name: "Ada Administrator", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: sofiaId, identity_issuer: "https://fake.local/", identity_subject: sofiaSubject, display_name: "Sofía Rivera", interface_locale: "es", display_time_zone: "America/Denver" },
      { id: danaId, identity_issuer: "https://fake.local/", identity_subject: danaSubject, display_name: "Dana Ortiz", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: quinnId, identity_issuer: "https://fake.local/", identity_subject: quinnSubject, display_name: "Quinn Zhao", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: umaId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Uma Unsponsored", interface_locale: "en", display_time_zone: "America/Denver" },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: managerId, role: "ORGANIZATION_MANAGER" },
      { user_id: rivalManagerId, role: "ORGANIZATION_MANAGER" },
      { user_id: teacherId, role: "TEACHER" },
      { user_id: administratorId, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: sofiaId, role: "STUDENT" },
      { user_id: danaId, role: "STUDENT" },
      { user_id: quinnId, role: "STUDENT" },
      { user_id: umaId, role: "STUDENT" },
    ]).execute();
    await db.insertInto("organizations").values([
      { id: organizationId, name: "Nimbus Logistics" },
      { id: rivalOrganizationId, name: "Riverside Health" },
    ]).execute();
    await db.insertInto("organization_managers").values([
      { user_id: managerId, organization_id: organizationId },
      { user_id: rivalManagerId, organization_id: rivalOrganizationId },
    ]).execute();

    courseId = (await db.insertInto("courses").values({ stable_key: "es-b2", target_language: "es", curriculum_level: "B2", title: "Spanish B2", summary: "Upper-intermediate Spanish" }).returning("id").executeTakeFirstOrThrow()).id;
    await db.insertInto("teacher_qualifications").values({ teacher_user_id: teacherId, target_language: "es", curriculum_level: "B2", granted_by_user_id: administratorId }).execute();
    for (const index of [1, 2, 3, 4]) lessonUnitIds.push(await createLessonUnit(index, "ACTIVE"));
    // A retired unit stays in learning history but outside every denominator.
    await createLessonUnit(5, "RETIRED");
  }, 180_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("freezes a baseline that conceals what the Student completed before the Sponsorship", async () => {
    const beforeSponsorship = await deliver(lessonUnitIds[0]!, "2026-02-15T15:00:00.000Z", [sofiaId, danaId]);
    now = new Date("2026-02-15T16:05:00.000Z");
    await administerAttendance(beforeSponsorship, [[sofiaId, "ATTENDED"], [danaId, "ATTENDED"]]);

    now = SPONSORSHIP_START;
    sofiaSponsorshipId = await sponsor(sofiaId, sofiaSubject);
    danaSponsorshipId = await sponsor(danaId, danaSubject);
    await sponsor(quinnId, quinnSubject);

    const baselines = await db.selectFrom("course_progress_snapshots")
      .select(["completed_active_lesson_unit_count", "active_lesson_unit_count", "revision_count"])
      .where("sponsorship_id", "=", sofiaSponsorshipId)
      .where("boundary", "=", "SPONSORSHIP_START")
      .execute();
    expect(baselines).toEqual([{ completed_active_lesson_unit_count: 1, active_lesson_unit_count: 4, revision_count: 0 }]);

    // Quinn completed nothing, so no Course carries a reportable fact for them.
    const quinnBaselines = await db.selectFrom("course_progress_snapshots")
      .innerJoin("sponsorships", "sponsorships.id", "course_progress_snapshots.sponsorship_id")
      .select("course_progress_snapshots.id")
      .where("sponsorships.student_user_id", "=", quinnId)
      .execute();
    expect(quinnBaselines).toEqual([]);
  });

  it("reports only sponsored activity inside the Sponsorship and Cohort boundaries", async () => {
    engineeringCohortId = await createCohort("Engineering", managerSubject);
    rivalCohortId = await createCohort("Riverside Pilot", rivalManagerSubject);
    await addMembership(engineeringCohortId, sofiaSponsorshipId);
    await addMembership(engineeringCohortId, danaSponsorshipId);

    const attended = await deliver(lessonUnitIds[1]!, "2026-03-15T15:00:00.000Z", [sofiaId, danaId]);
    now = new Date("2026-03-15T16:05:00.000Z");
    await administerAttendance(attended, [[sofiaId, "ATTENDED"], [danaId, "ATTENDED"]]);

    noShowSessionId = await deliver(lessonUnitIds[2]!, "2026-03-20T15:00:00.000Z", [sofiaId, danaId]);
    now = new Date("2026-03-20T16:05:00.000Z");
    await administerAttendance(noShowSessionId, [[sofiaId, "NO_SHOW"], [danaId, "NO_SHOW"]]);

    now = PILOT_MEMBERSHIP_START;
    pilotCohortId = await createCohort("Spanish Pilot", managerSubject);
    await addMembership(pilotCohortId, sofiaSponsorshipId);

    // Left deliberately Unrecorded: the Class Session finished without an outcome.
    await deliver(lessonUnitIds[3]!, "2026-04-10T15:00:00.000Z", [sofiaId, danaId]);

    now = new Date("2026-04-20T00:00:00.000Z");
    const report = await organizationReport();
    const sofia = studentNamed(report, "Sofía Rivera");
    expect(sofia.attendance).toEqual({
      attendedCount: 1,
      noShowCount: 1,
      recordedCount: 2,
      attendanceRatePercentage: 50,
      excludedUnrecordedCount: 1,
      correctedCount: 0,
      exceptionCount: 2,
    });
    expect(sofia.cohortNames).toEqual(["Engineering", "Spanish Pilot"]);
    expect(sofia.reportingFrom).toBe(SPONSORSHIP_START.toISOString());

    // Only the Unrecorded Class Session of 2026-04-10 falls inside the Spanish Pilot
    // membership, so nothing earlier is attributed to it.
    expect(cohortNamed(report, "Spanish Pilot")).toEqual({
      cohortName: "Spanish Pilot",
      sponsoredStudentCount: 1,
      attendance: { attendedCount: 0, noShowCount: 0, excludedUnrecordedCount: 1, exceptionCount: 1, attendanceRatePercentage: null },
    });
    expect(cohortNamed(report, "Engineering")).toEqual({
      cohortName: "Engineering",
      sponsoredStudentCount: 2,
      attendance: { attendedCount: 2, noShowCount: 2, excludedUnrecordedCount: 2, exceptionCount: 4, attendanceRatePercentage: 50 },
    });

    const pilotOnly = await organizationReport(managerSubject, pilotCohortId);
    expect(pilotOnly.students.map((student) => student.studentDisplayName)).toEqual(["Sofía Rivera"]);
    expect(studentNamed(pilotOnly, "Sofía Rivera").attendance).toMatchObject({
      attendedCount: 0,
      noShowCount: 0,
      attendanceRatePercentage: null,
      excludedUnrecordedCount: 1,
    });
  });

  it("shows the current-effective aggregate while the Sponsorship is active", async () => {
    const report = await organizationReport();
    const [progress] = studentNamed(report, "Sofía Rivera").courseProgress;
    expect(progress).toEqual({
      courseTitle: "Spanish B2",
      baseline: { completedActiveLessonUnitCount: 1, activeLessonUnitCount: 4, percentage: 25 },
      endingSnapshot: null,
      currentEffective: { completedActiveLessonUnitCount: 2, activeLessonUnitCount: 4, percentage: 50 },
      completedLessonUnitGain: 1,
      percentagePointGain: 25,
      snapshotRevisionCount: 0,
      lastRevisedAt: null,
    });
  });

  it("freezes an ended Sponsorship rather than granting live access to later learning", async () => {
    now = SPONSORSHIP_END;
    await endSponsorship(danaSponsorshipId);

    const laterSession = await deliver(lessonUnitIds[3]!, "2026-06-15T15:00:00.000Z", [danaId]);
    now = new Date("2026-06-16T00:00:00.000Z");
    await administerAttendance(laterSession, [[danaId, "ATTENDED"]]);

    now = REPORT_INSTANT;
    const dana = studentNamed(await organizationReport(), "Dana Ortiz");
    expect(dana.state).toBe("ENDED");
    expect(dana.reportingUntil).toBe(SPONSORSHIP_END.toISOString());
    expect(dana.courseProgress[0]).toMatchObject({
      baseline: { completedActiveLessonUnitCount: 1, activeLessonUnitCount: 4, percentage: 25 },
      endingSnapshot: { completedActiveLessonUnitCount: 2, activeLessonUnitCount: 4, percentage: 50 },
      currentEffective: null,
      completedLessonUnitGain: 1,
      snapshotRevisionCount: 0,
    });
    // The Class Session of 2026-06-15 is later learning, outside the boundary.
    expect(dana.attendance).toMatchObject({ attendedCount: 1, noShowCount: 1, excludedUnrecordedCount: 1 });
  });

  it("revises the facts a frozen boundary attributes to its own period after an accepted correction", async () => {
    now = CORRECTION_INSTANT;
    await administerAttendance(noShowSessionId, [
      [sofiaId, "NO_SHOW"],
      [danaId, "ATTENDED", "The Student attended after a corrected roster entry."],
    ]);

    now = REPORT_INSTANT;
    const dana = studentNamed(await organizationReport(), "Dana Ortiz");
    expect(dana.courseProgress[0]).toMatchObject({
      // The frozen active-unit denominator never moves, and the baseline keeps its
      // own earlier time scope: only the ending snapshot gains the corrected fact.
      baseline: { completedActiveLessonUnitCount: 1, activeLessonUnitCount: 4 },
      endingSnapshot: { completedActiveLessonUnitCount: 3, activeLessonUnitCount: 4, percentage: 75 },
      currentEffective: null,
      completedLessonUnitGain: 2,
      percentagePointGain: 50,
      snapshotRevisionCount: 1,
      lastRevisedAt: CORRECTION_INSTANT.toISOString(),
    });
    expect(dana.attendance).toEqual({
      attendedCount: 2,
      noShowCount: 0,
      recordedCount: 2,
      attendanceRatePercentage: 100,
      excludedUnrecordedCount: 1,
      correctedCount: 1,
      exceptionCount: 2,
    });
  });

  it("leads with the sponsored Students that need attention", async () => {
    const report = await organizationReport();
    expect(report.students.map((student) => student.studentDisplayName))
      .toEqual(["Dana Ortiz", "Sofía Rivera", "Quinn Zhao"]);
    expect(studentNamed(report, "Quinn Zhao").attendance).toMatchObject({ exceptionCount: 0, attendanceRatePercentage: null });
    expect(report.attendance).toMatchObject({ attendedCount: 3, noShowCount: 1, excludedUnrecordedCount: 2, correctedCount: 1 });
  });

  it("never discloses Class Rosters, private feedback, ratings, unrelated Students, or a Class Credit balance", async () => {
    const bookingId = noShowBookingIds.get(sofiaId)!;
    await db.insertInto("learning_feedback").values({
      booking_id: bookingId,
      teacher_user_id: teacherId,
      observed_strengths: ["LISTENING"],
      suggested_focuses: ["GRAMMAR"],
      observations: "PRIVATE_FEEDBACK_MARKER",
      next_practice: "PRIVATE_PRACTICE_MARKER",
      state: "SUBMITTED",
      submitted_at: now,
      created_at: now,
      updated_at: now,
    }).execute();
    await db.insertInto("session_ratings").values({
      booking_id: bookingId,
      student_user_id: sofiaId,
      overall_rating: 2,
      positive_tags: [],
      improvement_tags: ["PACING"],
      comment: "PRIVATE_RATING_MARKER",
      created_at: now,
      updated_at: now,
    }).execute();

    const response = await graphql(`query Report { organizationAttendanceAndProgressReport { ${REPORT_FIELDS} } }`);
    const serialized = JSON.stringify(response);
    for (const marker of ["PRIVATE_FEEDBACK_MARKER", "PRIVATE_PRACTICE_MARKER", "PRIVATE_RATING_MARKER", "Uma Unsponsored", "Tomás Teacher"]) {
      expect(serialized).not.toContain(marker);
    }
    expect(serialized).not.toContain("availableBalance");

    // The rival Organization reaches only its own Cohort, which sponsors nobody.
    const rival = await organizationReport(rivalManagerSubject);
    expect(rival).toMatchObject({
      organization: { name: "Riverside Health" },
      students: [],
      cohorts: [{ cohortName: "Riverside Pilot", sponsoredStudentCount: 0 }],
    });
  });

  it("denies and audits a report read outside the caller's relationship scope", async () => {
    const crossOrganization = randomUUID();
    const denied = await graphql(
      `query Report($cohortId: ID) { organizationAttendanceAndProgressReport(cohortId: $cohortId) { generatedAt } }`,
      { cohortId: rivalCohortId },
      managerSubject,
      crossOrganization,
    );
    expect(denied.errors?.[0]?.extensions.code).toBe("NOT_FOUND");
    expect(await auditsFor(crossOrganization)).toEqual([
      { operation: "organization-report.read", target_type: "Cohort", outcome: "DENIED", reason_code: "COHORT_OUTSIDE_ORGANIZATION" },
    ]);

    const roleRequired = randomUUID();
    const student = await graphql(
      `query { organizationAttendanceAndProgressReport { generatedAt } }`,
      undefined,
      sofiaSubject,
      roleRequired,
    );
    expect(student.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
    expect(await auditsFor(roleRequired)).toEqual([
      { operation: "organization-report.read", target_type: "OrganizationReport", outcome: "DENIED", reason_code: "ORGANIZATION_MANAGER_ROLE_REQUIRED" },
    ]);
  });

  async function auditsFor(correlationId: string) {
    return db.selectFrom("audit_entries")
      .select(["operation", "target_type", "outcome", "reason_code"])
      .where("correlation_id", "=", correlationId)
      .execute();
  }

  async function createLessonUnit(index: number, state: "ACTIVE" | "RETIRED") {
    return db.transaction().execute(async (transaction) => {
      const unit = await transaction.insertInto("lesson_units").values({
        stable_key: `es-b2-0${index}`,
        course_id: courseId,
        title: `Unit ${index}`,
        summary: "Practice",
        objectives: JSON.stringify(["Practice"]),
        sort_order: index,
        state,
        replacement_lesson_unit_id: null,
        retired_at: state === "RETIRED" ? new Date("2026-01-01T00:00:00.000Z") : null,
      }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: unit.id, topic_key: "EC" }).execute();
      return unit.id;
    });
  }

  /**
   * Publishes one Class Session delivering a Lesson Unit and books the given Students.
   * Seat reconciliation is a deferred constraint trigger, so the session and its
   * Bookings have to reach the database in one transaction.
   */
  async function deliver(lessonUnitId: string, startsAt: string, studentIds: readonly string[]) {
    return db.transaction().execute(async (transaction) => {
      const classSessionId = (await transaction.insertInto("class_sessions").values({
        lesson_unit_id: lessonUnitId,
        teacher_user_id: teacherId,
        starts_at: new Date(startsAt),
        scheduling_time_zone: "America/Denver",
        seat_capacity: 5,
        occupied_seats: studentIds.length,
        state: "PUBLISHED",
      }).returning("id").executeTakeFirstOrThrow()).id;
      for (const studentUserId of studentIds) {
        const booking = await transaction.insertInto("bookings").values({
          student_user_id: studentUserId,
          class_session_id: classSessionId,
          teacher_user_id_at_booking: teacherId,
          state: "ACTIVE",
          terminal_reason: null,
          class_credit_refunded: false,
          late_cancellation_refund_until: null,
          booked_at: new Date(new Date(startsAt).getTime() - 24 * 60 * 60_000),
          ended_at: null,
        }).returning("id").executeTakeFirstOrThrow();
        if (startsAt.startsWith("2026-03-20")) noShowBookingIds.set(studentUserId, booking.id);
      }
      return classSessionId;
    });
  }

  async function administerAttendance(
    classSessionId: string,
    outcomes: ReadonlyArray<readonly [string, "ATTENDED" | "NO_SHOW", string?]>,
  ) {
    const bookings = await db.selectFrom("bookings")
      .select(["id", "student_user_id"])
      .where("class_session_id", "=", classSessionId)
      .execute();
    const records = outcomes.map(([studentUserId, outcome, correctionReason]) => ({
      bookingId: bookings.find((booking) => booking.student_user_id === studentUserId)!.id,
      outcome,
      ...(correctionReason ? { correctionReason } : {}),
    }));
    const response = await graphql(`
      mutation Administer($input: RecordAttendanceInput!) {
        administerAttendance(input: $input) {
          ... on RecordAttendanceSuccess { classRoster { classSession { id } } }
          ... on AttendanceError { code message }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), classSessionId, records } }, administratorSubject);
    expect(response.errors).toBeUndefined();
    expect(response.data!.administerAttendance).not.toHaveProperty("code");
  }

  async function sponsor(studentUserId: string, studentSubject: string) {
    const invited = await graphql(`
      mutation Invite($input: InviteToSponsorshipInput!) {
        inviteToSponsorship(input: $input) {
          ... on InviteToSponsorshipSuccess { invitation { id } }
          ... on SponsorshipInvitationError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), studentUserId } }, managerSubject);
    const invitationId = (invited.data!.inviteToSponsorship as { invitation: { id: string } }).invitation.id;
    const accepted = await graphql(`
      mutation Accept($input: SponsorshipInvitationResponseInput!) {
        acceptSponsorshipInvitation(input: $input) {
          ... on AcceptSponsorshipInvitationSuccess { sponsorship { id } }
          ... on SponsorshipInvitationResponseError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), invitationId } }, studentSubject);
    return (accepted.data!.acceptSponsorshipInvitation as { sponsorship: { id: string } }).sponsorship.id;
  }

  async function endSponsorship(sponsorshipId: string) {
    const ended = await graphql(`
      mutation End($input: EndSponsorshipAsOrganizationInput!) {
        endSponsorshipAsOrganization(input: $input) {
          ... on EndSponsorshipAsOrganizationSuccess { sponsorship { state } }
          ... on SponsorshipBoundaryError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), sponsorshipId } }, managerSubject);
    expect(ended.data!.endSponsorshipAsOrganization).toEqual({ sponsorship: { state: "ENDED" } });
  }

  async function createCohort(name: string, subject: string) {
    const created = await graphql(`
      mutation Create($input: CreateCohortInput!) {
        createCohort(input: $input) { ... on CohortSuccess { cohort { id } } ... on CohortError { code } }
      }
    `, { input: { idempotencyKey: randomUUID(), name } }, subject);
    return (created.data!.createCohort as { cohort: { id: string } }).cohort.id;
  }

  async function addMembership(cohortId: string, sponsorshipId: string) {
    const added = await graphql(`
      mutation Add($input: AddCohortMembershipInput!) {
        addCohortMembership(input: $input) {
          ... on CohortMembershipSuccess { membership { id } }
          ... on CohortError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), cohortId, sponsorshipId } }, managerSubject);
    expect(added.data!.addCohortMembership).not.toHaveProperty("code");
  }

  type StudentReport = {
    studentDisplayName: string;
    state: string;
    reportingFrom: string;
    reportingUntil: string | null;
    cohortNames: string[];
    attendance: Record<string, number | null>;
    courseProgress: Array<Record<string, unknown>>;
  };
  type CohortReport = { cohortName: string; sponsoredStudentCount: number; attendance: Record<string, number | null> };
  type Report = {
    organization: { id: string; name: string };
    attendance: Record<string, number | null>;
    students: StudentReport[];
    cohorts: CohortReport[];
  };

  async function organizationReport(subject = managerSubject, cohortId?: string) {
    const response = await graphql(
      `query Report($cohortId: ID) { organizationAttendanceAndProgressReport(cohortId: $cohortId) { ${REPORT_FIELDS} } }`,
      { cohortId: cohortId ?? null },
      subject,
    );
    expect(response.errors).toBeUndefined();
    return response.data!.organizationAttendanceAndProgressReport as Report;
  }

  function studentNamed(report: Report, studentDisplayName: string) {
    return report.students.find((student) => student.studentDisplayName === studentDisplayName)!;
  }

  function cohortNamed(report: Report, cohortName: string) {
    return report.cohorts.find((cohort) => cohort.cohortName === cohortName)!;
  }

  async function graphql(
    query: string,
    variables?: Record<string, unknown>,
    subject: string = managerSubject,
    correlationId: string = randomUUID(),
  ) {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
        "x-demo-user-id": subject,
      },
      body: JSON.stringify({ query, variables }),
    });
    return await response.json() as {
      data?: Record<string, unknown>;
      errors?: Array<{ extensions: { code: string } }>;
    };
  }
});
