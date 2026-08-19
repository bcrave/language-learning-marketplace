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

describe("Role Assignment administration GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  const administratorId = randomUUID();
  const administratorSubject = randomUUID();
  const userId = randomUUID();
  const userSubject = randomUUID();
  const teacherId = randomUUID();
  const grantRoleIdempotencyKey = randomUUID();
  const studentRemovalIdempotencyKey = randomUUID();
  let futureClassSessionId: string;

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `role_assignment_administration_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test" });
    await db.insertInto("users").values([
      { id: administratorId, identity_issuer: "https://fake.local/", identity_subject: administratorSubject, display_name: "Avery Admin", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: userId, identity_issuer: "https://fake.local/", identity_subject: userSubject, display_name: "Lucía User", interface_locale: "es", display_time_zone: "America/Denver" },
      { id: teacherId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Taylor Teacher", interface_locale: "en", display_time_zone: "America/Denver" },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: administratorId, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: userId, role: "STUDENT" },
      { user_id: teacherId, role: "TEACHER" },
    ]).execute();
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("grants a reasoned Role Assignment that the User can enter without changing their other role", async () => {
    const correlationId = randomUUID();
    const granted = await graphql(`
      mutation GrantRole($input: ChangeRoleAssignmentInput!) {
        grantRoleAssignment(input: $input) {
          ... on RoleAssignmentChangeSuccess {
            user {
              id
              roles
              roleAssignmentHistory { action role reason changedAt }
            }
          }
          ... on RoleAssignmentError { code message classSessionIds }
        }
      }
    `, {
      input: {
        idempotencyKey: grantRoleIdempotencyKey,
        userId,
        role: "TEACHER",
        reason: "Approved for the teaching workspace",
      },
    }, administratorSubject, correlationId);
    const teacherWorkspace = await graphql(`
      query { roleWorkspace(actingRole: TEACHER) { actingRole rolePlaces { role } } }
    `, undefined, userSubject);

    expect(granted).toMatchObject({
      data: {
        grantRoleAssignment: {
          user: {
            id: userId,
            roles: ["STUDENT", "TEACHER"],
            roleAssignmentHistory: [{
              action: "GRANTED",
              role: "TEACHER",
              reason: "Approved for the teaching workspace",
              changedAt: expect.any(String),
            }],
          },
        },
      },
    });
    expect(teacherWorkspace).toMatchObject({
      data: {
        roleWorkspace: {
          actingRole: "TEACHER",
          rolePlaces: [{ role: "STUDENT" }, { role: "TEACHER" }],
        },
      },
    });
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({
      outcome: "SUCCEEDED",
      reason_code: "ROLE_ASSIGNMENT_GRANTED",
    });
    const notification = await db.selectFrom("in_app_notifications").select(["message_id", "variables"]).where("recipient_user_id", "=", userId).where("message_id", "=", "role-assignment.granted.user").executeTakeFirstOrThrow();
    expect(notification.message_id).toBe("role-assignment.granted.user");
    expect(notification.variables).toMatchObject({ workspacePath: "/teacher/schedule" });
  });

  it("replays an identical Role Assignment grant without duplicating history or notifications", async () => {
    const mutation = `
      mutation GrantRole($input: ChangeRoleAssignmentInput!) {
        grantRoleAssignment(input: $input) {
          ... on RoleAssignmentChangeSuccess { user { id roles } }
          ... on RoleAssignmentError { code }
        }
      }
    `;
    const input = { idempotencyKey: grantRoleIdempotencyKey, userId, role: "TEACHER", reason: "Approved for the teaching workspace" };
    const replay = await graphql(mutation, { input });
    const changed = await graphql(mutation, { input: { ...input, reason: "A different reason" } });

    expect(replay).toMatchObject({ data: { grantRoleAssignment: { user: { id: userId, roles: ["STUDENT", "TEACHER"] } } } });
    expect(changed).toEqual({ data: { grantRoleAssignment: { code: "IDEMPOTENCY_KEY_REUSED" } } });
    expect(await db.selectFrom("role_assignment_changes").select("id").where("user_id", "=", userId).where("role", "=", "TEACHER").execute()).toHaveLength(1);
    expect(await db.selectFrom("in_app_notifications").select("id").where("recipient_user_id", "=", userId).where("message_id", "=", "role-assignment.granted.user").execute()).toHaveLength(1);
  });

  it("keeps Role Assignment history append-only", async () => {
    const change = await db.selectFrom("role_assignment_changes").select("id").where("user_id", "=", userId).executeTakeFirstOrThrow();
    await expect(db.updateTable("role_assignment_changes").set({ reason: "Rewritten history" }).where("id", "=", change.id).execute()).rejects.toThrow("append-only");
    await expect(db.deleteFrom("role_assignment_changes").where("id", "=", change.id).execute()).rejects.toThrow("append-only");
  });

  it("removes the Student Role Assignment with refunds and prospective grant cleanup while preserving the User and history", async () => {
    const courseId = randomUUID();
    const lessonUnitId = randomUUID();
    const classSessionId = randomUUID();
    futureClassSessionId = classSessionId;
    const bookingId = randomUUID();
    const waitlistSessionId = randomUUID();
    await db.transaction().execute(async (transaction) => {
      await transaction.insertInto("courses").values({ id: courseId, stable_key: "zz-a1", target_language: "es", curriculum_level: "A1", title: "Role cleanup", summary: "Role cleanup" }).execute();
      await transaction.insertInto("lesson_units").values({ id: lessonUnitId, stable_key: "zz-a1-01", course_id: courseId, title: "Role cleanup", summary: "Role cleanup", objectives: JSON.stringify(["Observe cleanup"]), sort_order: 1, state: "ACTIVE", replacement_lesson_unit_id: null, retired_at: null }).execute();
      await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: lessonUnitId, topic_key: "EC" }).execute();
    });
    await db.insertInto("teacher_qualifications").values({ teacher_user_id: teacherId, target_language: "es", curriculum_level: "A1", granted_by_user_id: administratorId }).execute();
    await db.insertInto("class_sessions").values([
      { id: classSessionId, lesson_unit_id: lessonUnitId, teacher_user_id: teacherId, starts_at: new Date("2026-08-20T18:00:00.000Z"), scheduling_time_zone: "America/Denver", seat_capacity: 5, occupied_seats: 1, state: "PUBLISHED", cancellation_reason: null, cancelled_at: null },
      { id: waitlistSessionId, lesson_unit_id: lessonUnitId, teacher_user_id: teacherId, starts_at: new Date("2026-08-21T18:00:00.000Z"), scheduling_time_zone: "America/Denver", seat_capacity: 5, occupied_seats: 0, state: "PUBLISHED", cancellation_reason: null, cancelled_at: null },
    ]).execute();
    await db.insertInto("class_credit_accounts").values({ student_user_id: userId, available_balance: 0 }).execute();
    await db.insertInto("class_credit_ledger_entries").values([
      { student_user_id: userId, amount: 1, source: "CREDIT_ADJUSTMENT", source_reference: randomUUID(), reason: "Test setup" },
      { student_user_id: userId, amount: -1, source: "BOOKING_DEDUCTION", source_reference: bookingId, reason: null },
    ]).execute();
    await db.insertInto("bookings").values({ id: bookingId, student_user_id: userId, class_session_id: classSessionId, teacher_user_id_at_booking: teacherId, state: "ACTIVE", terminal_reason: null, class_credit_refunded: false, late_cancellation_refund_until: null, rescheduled_from_booking_id: null, booked_at: new Date("2026-08-17T18:00:00.000Z"), ended_at: null }).execute();
    await db.insertInto("schedule_commitments").values({ user_id: userId, class_session_id: classSessionId, commitment_role: "STUDENT", starts_at: new Date("2026-08-20T18:00:00.000Z"), ends_at: new Date("2026-08-20T19:00:00.000Z"), active: true }).execute();
    await db.insertInto("waitlist_entries").values({ id: randomUUID(), student_user_id: userId, class_session_id: waitlistSessionId, state: "ACTIVE", terminal_reason: null, joined_at: new Date("2026-08-17T18:00:00.000Z"), expires_at: new Date("2026-08-21T16:00:00.000Z"), completed_at: null, promoted_booking_id: null }).execute();
    await db.insertInto("subscriptions").values({ student_user_id: userId, state: "ACTIVE", activated_at: new Date("2026-08-01T15:00:00.000Z"), anchor_day: 1, accounting_time_utc: "15:00:00", renewal_count: 0, next_anniversary_at: new Date("2026-09-01T15:00:00.000Z"), cancellation_effective_at: null }).execute();

    const correlationId = randomUUID();
    const removed = await graphql(`
      mutation RemoveRole($input: ChangeRoleAssignmentInput!) {
        removeRoleAssignment(input: $input) {
          ... on RoleAssignmentChangeSuccess {
            endedBookingCount
            removedWaitlistEntryCount
            refundedClassCreditCount
            subscriptionEnded
            user { id roles roleAssignmentHistory { action role reason } }
          }
          ... on RoleAssignmentError { code message classSessionIds }
        }
      }
    `, { input: { idempotencyKey: studentRemovalIdempotencyKey, userId, role: "STUDENT", reason: "Student access is no longer required" } }, administratorSubject, correlationId);
    const removedWorkspace = await graphql(`query { roleWorkspace(actingRole: STUDENT) { actingRole } }`, undefined, userSubject);

    expect(removed.errors).toBeUndefined();
    expect(removed).toMatchObject({ data: { removeRoleAssignment: {
      endedBookingCount: 1,
      removedWaitlistEntryCount: 1,
      refundedClassCreditCount: 1,
      subscriptionEnded: true,
      user: {
        id: userId,
        roles: ["TEACHER"],
        roleAssignmentHistory: [
          { action: "REMOVED", role: "STUDENT", reason: "Student access is no longer required" },
          { action: "GRANTED", role: "TEACHER" },
        ],
      },
    } } });
    expect(removedWorkspace.data).toBeNull();
    expect(removedWorkspace.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
    expect(await db.selectFrom("users").select("id").where("id", "=", userId).executeTakeFirst()).toEqual({ id: userId });
    expect(await db.selectFrom("class_credit_accounts").select("available_balance").where("student_user_id", "=", userId).executeTakeFirstOrThrow()).toEqual({ available_balance: 1 });
    expect(await db.selectFrom("subscriptions").select(["state", "next_anniversary_at"]).where("student_user_id", "=", userId).executeTakeFirstOrThrow()).toEqual({ state: "CANCELLED", next_anniversary_at: null });
    expect(await db.selectFrom("waitlist_promotion_requests").select("class_session_id").where("class_session_id", "=", classSessionId).executeTakeFirst()).toEqual({ class_session_id: classSessionId });
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({ outcome: "SUCCEEDED", reason_code: "ROLE_ASSIGNMENT_REMOVED" });
    expect(await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", userId).execute()).toContainEqual({ message_id: "role-assignment.removed.user" });
  });

  it("replays Student removal without repeating refunds or cleanup", async () => {
    const mutation = `
      mutation RemoveRole($input: ChangeRoleAssignmentInput!) {
        removeRoleAssignment(input: $input) {
          ... on RoleAssignmentChangeSuccess { endedBookingCount refundedClassCreditCount user { roles } }
          ... on RoleAssignmentError { code }
        }
      }
    `;
    const input = { idempotencyKey: studentRemovalIdempotencyKey, userId, role: "STUDENT", reason: "Student access is no longer required" };
    const replay = await graphql(mutation, { input });
    const changed = await graphql(mutation, { input: { ...input, reason: "Changed removal reason" } });

    expect(replay).toEqual({ data: { removeRoleAssignment: { endedBookingCount: 1, refundedClassCreditCount: 1, user: { roles: ["TEACHER"] } } } });
    expect(changed).toEqual({ data: { removeRoleAssignment: { code: "IDEMPOTENCY_KEY_REUSED" } } });
    expect(await db.selectFrom("class_credit_ledger_entries").select("id").where("student_user_id", "=", userId).where("source", "=", "BOOKING_REFUND").execute()).toHaveLength(1);
    expect(await db.selectFrom("role_assignment_changes").select("id").where("user_id", "=", userId).where("action", "=", "REMOVED").execute()).toHaveLength(1);
  });

  it("keeps Teacher removal unresolved while future Class Session assignments remain", async () => {
    const blocked = await graphql(`
      mutation RemoveRole($input: ChangeRoleAssignmentInput!) {
        removeRoleAssignment(input: $input) {
          ... on RoleAssignmentChangeSuccess { user { roles } }
          ... on RoleAssignmentError { code classSessionIds }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), userId: teacherId, role: "TEACHER", reason: "Teaching access is no longer required" } });

    expect(blocked).toMatchObject({ data: { removeRoleAssignment: {
      code: "TEACHER_ASSIGNMENTS_REQUIRE_RESOLUTION",
      classSessionIds: expect.arrayContaining([futureClassSessionId]),
    } } });
    expect(await db.selectFrom("role_assignments").select("role").where("user_id", "=", teacherId).execute()).toEqual([{ role: "TEACHER" }]);
  });

  it("removes a Teacher with no future assignments from public teaching authority while preserving profile history", async () => {
    const unassignedTeacherId = randomUUID();
    await db.insertInto("users").values({ id: unassignedTeacherId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Unassigned Teacher", interface_locale: "en", display_time_zone: "America/Denver" }).execute();
    await db.insertInto("role_assignments").values({ user_id: unassignedTeacherId, role: "TEACHER" }).execute();
    await db.insertInto("teacher_profiles").values({ teacher_user_id: unassignedTeacherId, pronouns: null, profile_image_url: null, professional_bio: "A preserved professional biography." }).execute();
    const before = await graphql(`query { publicTeacherProfile(teacherUserId: "${unassignedTeacherId}", locale: EN) { id displayName } }`, undefined);
    const removed = await graphql(`
      mutation RemoveRole($input: ChangeRoleAssignmentInput!) {
        removeRoleAssignment(input: $input) { ... on RoleAssignmentChangeSuccess { user { id roles } } ... on RoleAssignmentError { code } }
      }
    `, { input: { idempotencyKey: randomUUID(), userId: unassignedTeacherId, role: "TEACHER", reason: "Teaching relationship concluded" } });
    const after = await graphql(`query { publicTeacherProfile(teacherUserId: "${unassignedTeacherId}", locale: EN) { id } }`, undefined);

    expect(before).toEqual({ data: { publicTeacherProfile: { id: unassignedTeacherId, displayName: "Unassigned Teacher" } } });
    expect(removed).toEqual({ data: { removeRoleAssignment: { user: { id: unassignedTeacherId, roles: [] } } } });
    expect(after).toEqual({ data: { publicTeacherProfile: null } });
    expect(await db.selectFrom("teacher_profiles").select("teacher_user_id").where("teacher_user_id", "=", unassignedTeacherId).executeTakeFirst()).toEqual({ teacher_user_id: unassignedTeacherId });
  });

  it("does not remove the final active Platform Administrator or expose Project Owner as a role", async () => {
    const finalAdministrator = await graphql(`
      mutation RemoveRole($input: ChangeRoleAssignmentInput!) {
        removeRoleAssignment(input: $input) {
          ... on RoleAssignmentChangeSuccess { user { roles } }
          ... on RoleAssignmentError { code classSessionIds }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), userId: administratorId, role: "PLATFORM_ADMINISTRATOR", reason: "Administrator rotation requested" } });
    const projectOwner = await graphql(`
      mutation { grantRoleAssignment(input: { idempotencyKey: "project-owner", userId: "${userId}", role: PROJECT_OWNER, reason: "Owner access requested" }) { __typename } }
    `, undefined);

    expect(finalAdministrator).toEqual({ data: { removeRoleAssignment: { code: "FINAL_PLATFORM_ADMINISTRATOR", classSessionIds: [] } } });
    expect(projectOwner.data).toBeUndefined();
    expect(projectOwner.errors?.[0]?.extensions.code).toBe("GRAPHQL_VALIDATION_FAILED");
  });

  it("does not let an administrator remove their own Platform Administrator assignment", async () => {
    const secondAdministratorId = randomUUID();
    await db.insertInto("users").values({ id: secondAdministratorId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Backup Admin", interface_locale: "en", display_time_zone: "UTC" }).execute();
    await db.insertInto("role_assignments").values({ user_id: secondAdministratorId, role: "PLATFORM_ADMINISTRATOR" }).execute();

    const result = await graphql(`
      mutation RemoveRole($input: ChangeRoleAssignmentInput!) {
        removeRoleAssignment(input: $input) {
          ... on RoleAssignmentChangeSuccess { user { roles } }
          ... on RoleAssignmentError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), userId: administratorId, role: "PLATFORM_ADMINISTRATOR", reason: "Administrator rotation requested" } });

    expect(result).toEqual({ data: { removeRoleAssignment: { code: "SELF_PLATFORM_ADMINISTRATOR_REMOVAL" } } });
    expect(await db.selectFrom("role_assignments").select("role").where("user_id", "=", administratorId).where("role", "=", "PLATFORM_ADMINISTRATOR").executeTakeFirst()).toEqual({ role: "PLATFORM_ADMINISTRATOR" });
    await db.deleteFrom("role_assignments").where("user_id", "=", secondAdministratorId).execute();
  });

  it("revokes Organization Manager reporting immediately and rejects unauthorized Role Assignment changes", async () => {
    const managerId = randomUUID();
    const managerSubject = randomUUID();
    const organizationId = randomUUID();
    await db.insertInto("users").values({ id: managerId, identity_issuer: "https://fake.local/", identity_subject: managerSubject, display_name: "Morgan Manager", interface_locale: "en", display_time_zone: "America/Denver" }).execute();
    await db.insertInto("role_assignments").values({ user_id: managerId, role: "STUDENT" }).execute();
    await db.insertInto("organizations").values({ id: organizationId, name: "Example Organization" }).execute();
    await graphql(`
      mutation GrantRole($input: ChangeRoleAssignmentInput!) {
        grantRoleAssignment(input: $input) { ... on RoleAssignmentChangeSuccess { user { roles } } ... on RoleAssignmentError { code } }
      }
    `, { input: { idempotencyKey: randomUUID(), userId: managerId, role: "ORGANIZATION_MANAGER", organizationId, reason: "Assigned to organization reporting" } });
    const removed = await graphql(`
      mutation RemoveRole($input: ChangeRoleAssignmentInput!) {
        removeRoleAssignment(input: $input) { ... on RoleAssignmentChangeSuccess { user { roles } } ... on RoleAssignmentError { code } }
      }
    `, { input: { idempotencyKey: randomUUID(), userId: managerId, role: "ORGANIZATION_MANAGER", reason: "Organization reporting access ended" } });
    const reporting = await graphql(`query { organizationSponsoredStudents { id } }`, undefined, managerSubject);
    const deniedCorrelationId = randomUUID();
    const deniedChange = await graphql(`
      mutation GrantRole($input: ChangeRoleAssignmentInput!) {
        grantRoleAssignment(input: $input) { __typename }
      }
    `, { input: { idempotencyKey: randomUUID(), userId: managerId, role: "TEACHER", reason: "Unauthorized role change" } }, managerSubject, deniedCorrelationId);

    expect(removed).toEqual({ data: { removeRoleAssignment: { user: { roles: ["STUDENT"] } } } });
    expect(reporting.data).toBeNull();
    expect(reporting.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
    expect(deniedChange.data).toBeNull();
    expect(deniedChange.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", deniedCorrelationId).executeTakeFirstOrThrow()).toEqual({ outcome: "DENIED", reason_code: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED" });
  });

  it("preserves a separate active Sponsorship when removing Student and exposes Role Assignment history only to administrators", async () => {
    const sponsoredStudentId = randomUUID();
    const sponsoredStudentSubject = randomUUID();
    const organizationId = randomUUID();
    const invitationId = randomUUID();
    const sponsorshipId = randomUUID();
    await db.insertInto("users").values({ id: sponsoredStudentId, identity_issuer: "https://fake.local/", identity_subject: sponsoredStudentSubject, display_name: "Sam Sponsored", interface_locale: "en", display_time_zone: "America/Denver" }).execute();
    await db.insertInto("role_assignments").values({ user_id: sponsoredStudentId, role: "STUDENT" }).execute();
    await db.insertInto("organizations").values({ id: organizationId, name: "Sponsoring Organization" }).execute();
    await db.insertInto("sponsorship_invitations").values({ id: invitationId, organization_id: organizationId, student_user_id: sponsoredStudentId, invited_by_user_id: administratorId, state: "ACCEPTED", disclosure_text_version: "v1", expires_at: new Date("2026-08-31T00:00:00.000Z"), decided_at: new Date("2026-08-17T00:00:00.000Z"), created_at: new Date("2026-08-16T00:00:00.000Z") }).execute();
    await db.insertInto("sponsorships").values({ id: sponsorshipId, organization_id: organizationId, student_user_id: sponsoredStudentId, invitation_id: invitationId, accepted_at: new Date("2026-08-17T00:00:00.000Z"), grant_count: 1, next_anniversary_at: new Date("2026-09-17T00:00:00.000Z"), state: "ACTIVE", ended_at: null, ended_by_party: null, ended_by_user_id: null }).execute();

    const removed = await graphql(`
      mutation RemoveRole($input: ChangeRoleAssignmentInput!) {
        removeRoleAssignment(input: $input) {
          ... on RoleAssignmentChangeSuccess { sponsorshipEnded user { id roles roleAssignmentHistory { action role reason } } }
          ... on RoleAssignmentError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), userId: sponsoredStudentId, role: "STUDENT", reason: "Student sponsorship access ended" } });
    const administration = await graphql(`query { roleAssignmentAdministration { users { id roles roleAssignmentHistory { action role reason } } organizations { id name } } }`, undefined);
    const deniedCorrelationId = randomUUID();
    const deniedRead = await graphql(`query { roleAssignmentAdministration { users { id } } }`, undefined, userSubject, deniedCorrelationId);

    expect(removed).toMatchObject({ data: { removeRoleAssignment: { sponsorshipEnded: false, user: { id: sponsoredStudentId, roles: [], roleAssignmentHistory: [{ action: "REMOVED", role: "STUDENT", reason: "Student sponsorship access ended" }] } } } });
    expect(administration.data?.roleAssignmentAdministration?.users).toContainEqual(expect.objectContaining({ id: sponsoredStudentId, roles: [] }));
    expect(administration.data?.roleAssignmentAdministration?.organizations).toContainEqual({ id: organizationId, name: "Sponsoring Organization" });
    expect(await db.selectFrom("sponsorships").select(["state", "ended_at"]).where("id", "=", sponsorshipId).executeTakeFirstOrThrow()).toEqual({ state: "ACTIVE", ended_at: null });
    expect(deniedRead.data).toBeNull();
    expect(deniedRead.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", deniedCorrelationId).executeTakeFirstOrThrow()).toEqual({ outcome: "DENIED", reason_code: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED" });
  });

  async function graphql(
    query: string,
    variables: Record<string, unknown> | undefined,
    actingSubject = administratorSubject,
    correlationId = randomUUID(),
  ) {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
        "x-demo-user-id": actingSubject,
      },
      body: JSON.stringify({ query, variables }),
    });
    return response.json() as Promise<{
      data?: null | {
        roleAssignmentAdministration?: { organizations: unknown[]; users: unknown[] };
      };
      errors?: Array<{ extensions: { code: string } }>;
    }>;
  }
});
