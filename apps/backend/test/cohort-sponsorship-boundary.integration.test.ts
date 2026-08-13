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
import { grantDueSponsorshipCredits } from "../src/sponsorship/sponsorship-worker.js";

const SPONSORSHIP_START = new Date("2026-03-01T00:00:00.000Z");
const MEMBERSHIP_END = new Date("2026-04-01T00:00:00.000Z");
const SPONSORSHIP_END = new Date("2026-05-01T00:00:00.000Z");

describe("Cohorts and Sponsorship boundaries GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  let now = SPONSORSHIP_START;
  let courseId: string;
  let lessonUnitCounter = 0;

  const managerId = randomUUID();
  const managerSubject = randomUUID();
  const rivalManagerId = randomUUID();
  const rivalManagerSubject = randomUUID();
  const teacherId = randomUUID();
  const administratorId = randomUUID();
  const studentId = randomUUID();
  const studentSubject = randomUUID();
  const leavingStudentId = randomUUID();
  const leavingStudentSubject = randomUUID();
  const organizationId = randomUUID();
  const rivalOrganizationId = randomUUID();

  let sponsorshipId: string;
  let leavingSponsorshipId: string;
  let engineeringCohortId: string;
  let pilotCohortId: string;
  let engineeringMembershipId: string;
  let pilotMembershipId: string;

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(postgres, `cohorts_${randomUUID().replaceAll("-", "")}`);
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test", now: () => now });

    await db.insertInto("users").values([
      { id: managerId, identity_issuer: "https://fake.local/", identity_subject: managerSubject, display_name: "Morgan Manager", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: rivalManagerId, identity_issuer: "https://fake.local/", identity_subject: rivalManagerSubject, display_name: "Riley Rival", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: teacherId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Tomás Teacher", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: administratorId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Ada Administrator", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: studentId, identity_issuer: "https://fake.local/", identity_subject: studentSubject, display_name: "Sofía Rivera", interface_locale: "es", display_time_zone: "America/Denver" },
      { id: leavingStudentId, identity_issuer: "https://fake.local/", identity_subject: leavingStudentSubject, display_name: "Leaving Learner", interface_locale: "en", display_time_zone: "America/Denver" },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: managerId, role: "ORGANIZATION_MANAGER" },
      { user_id: rivalManagerId, role: "ORGANIZATION_MANAGER" },
      { user_id: teacherId, role: "TEACHER" },
      { user_id: administratorId, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: studentId, role: "STUDENT" },
      { user_id: leavingStudentId, role: "STUDENT" },
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

    sponsorshipId = await sponsor(studentId, studentSubject);
    leavingSponsorshipId = await sponsor(leavingStudentId, leavingStudentSubject);
  }, 180_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("keeps one sponsored Student in several time-bounded Cohorts of the same Organization", async () => {
    engineeringCohortId = await createCohort("Engineering");
    pilotCohortId = await createCohort("Spanish Pilot");

    expect(await createCohortResult("engineering")).toEqual({ code: "COHORT_NAME_TAKEN" });

    engineeringMembershipId = await addMembership(engineeringCohortId, sponsorshipId);
    pilotMembershipId = await addMembership(pilotCohortId, sponsorshipId);

    const cohorts = await organizationCohorts();
    expect(cohorts).toEqual([
      expect.objectContaining({
        id: engineeringCohortId,
        name: "Engineering",
        memberships: [expect.objectContaining({
          id: engineeringMembershipId,
          studentUserId: studentId,
          studentDisplayName: "Sofía Rivera",
          effectiveFrom: SPONSORSHIP_START.toISOString(),
          effectiveUntil: null,
        })],
      }),
      expect.objectContaining({
        id: pilotCohortId,
        name: "Spanish Pilot",
        memberships: [expect.objectContaining({ id: pilotMembershipId, studentUserId: studentId, effectiveUntil: null })],
      }),
    ]);

    expect(await addMembershipResult(engineeringCohortId, sponsorshipId)).toEqual({ code: "MEMBERSHIP_WINDOW_OVERLAPS" });
    expect(await addMembershipResult(engineeringCohortId, sponsorshipId, { effectiveFrom: new Date(now.getTime() - 60_000).toISOString() })).toEqual({ code: "MEMBERSHIP_NOT_PROSPECTIVE" });
    expect(await addMembershipResult(engineeringCohortId, sponsorshipId, {
      effectiveFrom: new Date(now.getTime() + 60_000).toISOString(),
      effectiveUntil: new Date(now.getTime() + 60_000).toISOString(),
    })).toEqual({ code: "MEMBERSHIP_WINDOW_INVALID" });
  });

  it("attributes activity to the Cohort membership effective when the Class Session occurred", async () => {
    now = new Date("2026-03-25T00:00:00.000Z");
    await recordAttendance(studentId, "2026-02-15T15:00:00.000Z", "ATTENDED");
    await recordAttendance(studentId, "2026-03-15T15:00:00.000Z", "ATTENDED");
    await recordAttendance(studentId, "2026-03-20T15:00:00.000Z", "NO_SHOW");

    now = MEMBERSHIP_END;
    expect(await endMembershipResult(pilotMembershipId)).toEqual({ id: pilotMembershipId, effectiveUntil: MEMBERSHIP_END.toISOString() });
    expect(await endMembershipResult(pilotMembershipId)).toEqual({ code: "MEMBERSHIP_ALREADY_ENDED" });

    now = new Date("2026-04-20T00:00:00.000Z");
    await recordAttendance(studentId, "2026-04-15T15:00:00.000Z", "ATTENDED");

    const cohorts = await organizationCohorts();
    expect(attributionFor(cohorts, engineeringCohortId)).toEqual({ attendedCount: 2, noShowCount: 1 });
    expect(attributionFor(cohorts, pilotCohortId)).toEqual({ attendedCount: 1, noShowCount: 1 });
  });

  it("grants no Class Credits, authority, or Booking restriction through Cohort membership", async () => {
    const credits = await graphql(`query { studentClassCredits { availableBalance ledger { amount source } } }`, undefined, studentSubject);
    expect(credits).toEqual({ data: { studentClassCredits: {
      availableBalance: 8,
      ledger: [{ amount: 8, source: "ORGANIZATION_CREDIT_GRANT" }],
    } } });

    const cohortNotifications = await db.selectFrom("in_app_notifications")
      .select("message_id")
      .where("message_id", "like", "cohort%")
      .execute();
    expect(cohortNotifications).toEqual([]);

    const rivalView = await graphql(`query { organizationCohorts { id name } }`, undefined, rivalManagerSubject);
    expect(rivalView).toEqual({ data: { organizationCohorts: [] } });
    expect(await addMembershipResult(engineeringCohortId, sponsorshipId, {}, rivalManagerSubject)).toEqual({ code: "COHORT_NOT_FOUND" });
    expect(await endSponsorshipAsOrganizationResult(sponsorshipId, rivalManagerSubject)).toEqual({ code: "SPONSORSHIP_NOT_FOUND" });
  });

  it("ends Sponsorship prospectively without taking the Student's Class Credits", async () => {
    now = SPONSORSHIP_END;
    // A membership scheduled to begin after the Sponsorship ends never takes
    // effect, so ending must discard it rather than close it before it starts.
    const scheduledMembership = await addMembershipResult(pilotCohortId, sponsorshipId, { effectiveFrom: "2026-06-01T00:00:00.000Z" }) as { id: string };

    const ended = await endSponsorshipAsOrganizationResult(sponsorshipId);
    expect(ended).toEqual({
      sponsorship: {
        id: sponsorshipId,
        state: "ENDED",
        endedAt: SPONSORSHIP_END.toISOString(),
        endedByParty: "ORGANIZATION",
        nextAnniversaryAt: null,
        reportingFrom: SPONSORSHIP_START.toISOString(),
        reportingUntil: SPONSORSHIP_END.toISOString(),
      },
    });
    expect(await endSponsorshipAsOrganizationResult(sponsorshipId)).toEqual({ code: "SPONSORSHIP_ALREADY_ENDED" });

    const membership = await db.selectFrom("cohort_memberships").select("effective_until").where("id", "=", engineeringMembershipId).executeTakeFirstOrThrow();
    expect(membership.effective_until?.toISOString()).toBe(SPONSORSHIP_END.toISOString());
    expect(await db.selectFrom("cohort_memberships").select("id").where("id", "=", scheduledMembership.id).executeTakeFirst()).toBeUndefined();
    expect(await addMembershipResult(engineeringCohortId, sponsorshipId)).toEqual({ code: "SPONSORSHIP_NOT_ACTIVE" });

    // Only the ended Sponsorship is due, so a due monthly grant must be skipped.
    await db.updateTable("sponsorships").set({ next_anniversary_at: new Date("2027-01-01T00:00:00.000Z") }).where("id", "=", leavingSponsorshipId).execute();
    await db.updateTable("sponsorships").set({ next_anniversary_at: now }).where("id", "=", sponsorshipId).execute();
    expect(await grantDueSponsorshipCredits(db, now, randomUUID())).toBe(0);

    const credits = await graphql(`query { studentClassCredits { availableBalance } }`, undefined, studentSubject);
    expect(credits).toEqual({ data: { studentClassCredits: { availableBalance: 8 } } });
    expect(await graphql(`query { studentSponsorship { id } }`, undefined, studentSubject)).toEqual({ data: { studentSponsorship: null } });

    const snapshots = await db.selectFrom("course_progress_snapshots")
      .select(["boundary", "completed_active_lesson_unit_count", "active_lesson_unit_count"])
      .where("sponsorship_id", "=", sponsorshipId)
      .orderBy("boundary")
      .execute();
    expect(snapshots).toEqual([{ boundary: "SPONSORSHIP_END", completed_active_lesson_unit_count: 3, active_lesson_unit_count: 4 }]);

    now = new Date("2026-05-20T00:00:00.000Z");
    await recordAttendance(studentId, "2026-05-15T15:00:00.000Z", "ATTENDED");
    const cohorts = await organizationCohorts();
    expect(attributionFor(cohorts, engineeringCohortId)).toEqual({ attendedCount: 2, noShowCount: 1 });

    const reinvited = await graphql(`
      mutation Invite($input: InviteToSponsorshipInput!) {
        inviteToSponsorship(input: $input) {
          ... on InviteToSponsorshipSuccess { invitation { state } }
          ... on SponsorshipInvitationError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), studentUserId: studentId } }, managerSubject);
    expect(reinvited).toEqual({ data: { inviteToSponsorship: { invitation: { state: "PENDING" } } } });
  });

  it("lets the Student end their own Sponsorship and keeps their owned Class Credits", async () => {
    const correlationId = randomUUID();
    const endInstant = now;
    const ended = await graphql(`
      mutation End($input: EndSponsorshipAsStudentInput!) {
        endSponsorshipAsStudent(input: $input) {
          ... on EndSponsorshipAsStudentSuccess {
            sponsorship { id state endedByParty endedAt nextAnniversaryAt }
            account { availableBalance }
          }
          ... on SponsorshipBoundaryError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID() } }, leavingStudentSubject, correlationId);
    expect(ended).toEqual({ data: { endSponsorshipAsStudent: {
      sponsorship: { id: leavingSponsorshipId, state: "ENDED", endedByParty: "STUDENT", endedAt: endInstant.toISOString(), nextAnniversaryAt: null },
      account: { availableBalance: 8 },
    } } });

    const studentNotifications = await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", leavingStudentId).execute();
    expect(studentNotifications.map((notification) => notification.message_id)).toEqual(expect.arrayContaining(["sponsorship.terminated.student"]));
    const managerNotifications = await db.selectFrom("in_app_notifications")
      .select(["message_id", "variables"])
      .where("recipient_user_id", "=", managerId)
      .where("source_reference", "=", `sponsorship.terminated:${leavingSponsorshipId}`)
      .executeTakeFirstOrThrow();
    expect(managerNotifications.variables).toMatchObject({ studentDisplayName: "Leaving Learner", endedByParty: "STUDENT" });
    const emailIntents = await db.selectFrom("email_notification_intents").select(["message_id", "locale"]).where("message_id", "like", "sponsorship.terminated%").execute();
    expect(emailIntents).toEqual(expect.arrayContaining([
      { message_id: "sponsorship.terminated.student", locale: "en" },
      { message_id: "sponsorship.terminated.manager", locale: "en" },
    ]));

    const audits = await db.selectFrom("audit_entries")
      .select(["operation", "target_type", "outcome", "reason_code"])
      .where("correlation_id", "=", correlationId)
      .execute();
    expect(audits).toEqual(expect.arrayContaining([
      { operation: "sponsorship.terminated", target_type: "Sponsorship", outcome: "SUCCEEDED", reason_code: "SPONSORSHIP_TERMINATED_BY_STUDENT" },
    ]));
    expect(audits.every((audit) => !JSON.stringify(audit).includes("Leaving Learner"))).toBe(true);
  });

  it("authorizes Cohort and Sponsorship boundary mutations and audits every denial", async () => {
    const deniedCohortCorrelation = randomUUID();
    const deniedCohort = await graphql(`
      mutation Create($input: CreateCohortInput!) {
        createCohort(input: $input) { ... on CohortSuccess { cohort { id } } ... on CohortError { code } }
      }
    `, { input: { idempotencyKey: randomUUID(), name: "Rogue" } }, studentSubject, deniedCohortCorrelation);
    expect(deniedCohort.errors?.[0]?.extensions.code).toBe("FORBIDDEN");

    const deniedEndCorrelation = randomUUID();
    const deniedEnd = await graphql(`
      mutation End($input: EndSponsorshipAsStudentInput!) {
        endSponsorshipAsStudent(input: $input) { ... on EndSponsorshipAsStudentSuccess { sponsorship { id } } ... on SponsorshipBoundaryError { code } }
      }
    `, { input: { idempotencyKey: randomUUID() } }, managerSubject, deniedEndCorrelation);
    expect(deniedEnd.errors?.[0]?.extensions.code).toBe("FORBIDDEN");

    // A Cohort roster names sponsored Students, so a denied read is itself an
    // audited event rather than a silently empty list.
    const deniedReadCorrelation = randomUUID();
    const deniedRead = await graphql(`query { organizationCohorts { id } }`, undefined, studentSubject, deniedReadCorrelation);
    expect(deniedRead.errors?.[0]?.extensions.code).toBe("FORBIDDEN");

    expect(await db.selectFrom("audit_entries")
      .select(["operation", "outcome", "reason_code"])
      .where("correlation_id", "in", [deniedCohortCorrelation, deniedEndCorrelation, deniedReadCorrelation])
      .execute()).toEqual(expect.arrayContaining([
        { operation: "cohort.created", outcome: "DENIED", reason_code: "ORGANIZATION_MANAGER_ROLE_REQUIRED" },
        { operation: "sponsorship.terminated", outcome: "DENIED", reason_code: "STUDENT_ROLE_REQUIRED" },
        { operation: "cohort.read", outcome: "DENIED", reason_code: "ORGANIZATION_MANAGER_ROLE_REQUIRED" },
      ]));

    const cohortAudits = await db.selectFrom("audit_entries")
      .select(["operation", "target_type", "outcome", "reason_code"])
      .where("operation", "in", ["cohort.created", "cohort-membership.created", "cohort-membership.ended"])
      .where("outcome", "=", "SUCCEEDED")
      .execute();
    expect(cohortAudits).toEqual(expect.arrayContaining([
      { operation: "cohort.created", target_type: "Cohort", outcome: "SUCCEEDED", reason_code: "COHORT_CREATED" },
      { operation: "cohort-membership.created", target_type: "CohortMembership", outcome: "SUCCEEDED", reason_code: "COHORT_MEMBERSHIP_CREATED" },
      { operation: "cohort-membership.ended", target_type: "CohortMembership", outcome: "SUCCEEDED", reason_code: "COHORT_MEMBERSHIP_ENDED" },
    ]));
  });

  it("replays an ended Sponsorship under the same Idempotency Key", async () => {
    const idempotencyKey = randomUUID();
    const first = await endSponsorshipAsOrganizationResult(leavingSponsorshipId, managerSubject, idempotencyKey);
    const replay = await endSponsorshipAsOrganizationResult(leavingSponsorshipId, managerSubject, idempotencyKey);
    expect(first).toEqual({ code: "SPONSORSHIP_ALREADY_ENDED" });
    expect(replay).toEqual(first);
  });

  async function sponsor(targetStudentId: string, subject: string) {
    const invited = await graphql(`
      mutation Invite($input: InviteToSponsorshipInput!) {
        inviteToSponsorship(input: $input) { ... on InviteToSponsorshipSuccess { invitation { id } } ... on SponsorshipInvitationError { code } }
      }
    `, { input: { idempotencyKey: randomUUID(), studentUserId: targetStudentId } }, managerSubject);
    const invitationId = (invited.data!.inviteToSponsorship as { invitation: { id: string } }).invitation.id;
    const accepted = await graphql(`
      mutation Accept($input: SponsorshipInvitationResponseInput!) {
        acceptSponsorshipInvitation(input: $input) { ... on AcceptSponsorshipInvitationSuccess { sponsorship { id } } ... on SponsorshipInvitationResponseError { code } }
      }
    `, { input: { idempotencyKey: randomUUID(), invitationId } }, subject);
    return (accepted.data!.acceptSponsorshipInvitation as { sponsorship: { id: string } }).sponsorship.id;
  }

  async function createCohortResult(name: string, subject = managerSubject) {
    const created = await graphql(`
      mutation Create($input: CreateCohortInput!) {
        createCohort(input: $input) { ... on CohortSuccess { cohort { id name } } ... on CohortError { code } }
      }
    `, { input: { idempotencyKey: randomUUID(), name } }, subject);
    return created.data!.createCohort as Record<string, unknown>;
  }

  async function createCohort(name: string) {
    const outcome = await createCohortResult(name);
    return (outcome as { cohort: { id: string } }).cohort.id;
  }

  async function addMembershipResult(
    cohortId: string,
    targetSponsorshipId: string,
    window: { effectiveFrom?: string; effectiveUntil?: string } = {},
    subject = managerSubject,
  ) {
    const added = await graphql(`
      mutation Add($input: AddCohortMembershipInput!) {
        addCohortMembership(input: $input) {
          ... on CohortMembershipSuccess { membership { id effectiveFrom effectiveUntil } }
          ... on CohortError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), cohortId, sponsorshipId: targetSponsorshipId, ...window } }, subject);
    const outcome = added.data!.addCohortMembership as Record<string, unknown>;
    return "membership" in outcome ? outcome.membership as Record<string, unknown> : outcome;
  }

  async function addMembership(cohortId: string, targetSponsorshipId: string) {
    return ((await addMembershipResult(cohortId, targetSponsorshipId)) as { id: string }).id;
  }

  async function endMembershipResult(cohortMembershipId: string, subject = managerSubject) {
    const ended = await graphql(`
      mutation EndMembership($input: EndCohortMembershipInput!) {
        endCohortMembership(input: $input) {
          ... on CohortMembershipSuccess { membership { id effectiveUntil } }
          ... on CohortError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), cohortMembershipId } }, subject);
    const outcome = ended.data!.endCohortMembership as Record<string, unknown>;
    return "membership" in outcome ? outcome.membership as Record<string, unknown> : outcome;
  }

  async function endSponsorshipAsOrganizationResult(
    targetSponsorshipId: string,
    subject = managerSubject,
    idempotencyKey = randomUUID(),
  ) {
    const ended = await graphql(`
      mutation End($input: EndSponsorshipAsOrganizationInput!) {
        endSponsorshipAsOrganization(input: $input) {
          ... on EndSponsorshipAsOrganizationSuccess {
            sponsorship { id state endedAt endedByParty nextAnniversaryAt reportingFrom reportingUntil }
          }
          ... on SponsorshipBoundaryError { code }
        }
      }
    `, { input: { idempotencyKey, sponsorshipId: targetSponsorshipId } }, subject);
    return ended.data!.endSponsorshipAsOrganization as Record<string, unknown>;
  }

  async function organizationCohorts(subject = managerSubject) {
    const response = await graphql(`
      query {
        organizationCohorts {
          id
          name
          attributedActivity { attendedCount noShowCount }
          memberships { id studentUserId studentDisplayName effectiveFrom effectiveUntil }
        }
      }
    `, undefined, subject);
    return response.data!.organizationCohorts as Array<Record<string, unknown>>;
  }

  function attributionFor(cohorts: Array<Record<string, unknown>>, cohortId: string) {
    return cohorts.find((cohort) => cohort.id === cohortId)?.attributedActivity;
  }

  async function recordAttendance(targetStudentId: string, startsAt: string, outcome: "ATTENDED" | "NO_SHOW") {
    lessonUnitCounter += 1;
    const lessonUnitId = await db.transaction().execute(async (transaction) => {
      const unit = await transaction.insertInto("lesson_units").values({
        stable_key: `es-b2-${String(lessonUnitCounter).padStart(2, "0")}`,
        course_id: courseId,
        title: `Unit ${lessonUnitCounter}`,
        summary: "Practice",
        objectives: JSON.stringify(["Practice"]),
        sort_order: lessonUnitCounter,
        state: "ACTIVE",
        replacement_lesson_unit_id: null,
        retired_at: null,
      }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: unit.id, topic_key: "EC" }).execute();
      return unit.id;
    });
    const classSessionId = (await db.insertInto("class_sessions").values({
      lesson_unit_id: lessonUnitId,
      teacher_user_id: teacherId,
      starts_at: new Date(startsAt),
      scheduling_time_zone: "America/Denver",
      seat_capacity: 5,
      occupied_seats: 1,
      state: "PUBLISHED",
    }).returning("id").executeTakeFirstOrThrow()).id;
    const bookingId = (await db.insertInto("bookings").values({
      student_user_id: targetStudentId,
      class_session_id: classSessionId,
      teacher_user_id_at_booking: teacherId,
      state: "ACTIVE",
      terminal_reason: null,
      class_credit_refunded: false,
      late_cancellation_refund_until: null,
      booked_at: new Date(new Date(startsAt).getTime() - 24 * 60 * 60_000),
      ended_at: null,
    }).returning("id").executeTakeFirstOrThrow()).id;
    const publishedAt = new Date(new Date(startsAt).getTime() + 65 * 60_000);
    await db.insertInto("attendance_records").values({ booking_id: bookingId, outcome, submitted_by_user_id: teacherId, submitted_at: publishedAt, updated_at: publishedAt }).execute();
    if (outcome === "ATTENDED") {
      await db.insertInto("lesson_unit_completions").values({ student_user_id: targetStudentId, lesson_unit_id: lessonUnitId, established_by_booking_id: bookingId, earned_at: publishedAt }).execute();
    }
    return { bookingId, classSessionId, lessonUnitId };
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
