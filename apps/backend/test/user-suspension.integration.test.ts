import { randomUUID } from "node:crypto";

import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";

import { createApi } from "../src/api/app.js";
import { createDatabase, type Database } from "../src/database/database.js";
import { migrateDatabase } from "../src/database/migrate.js";

describe("User Suspension GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  const administratorId = randomUUID();
  const administratorSubject = randomUUID();
  const userId = randomUUID();
  const userSubject = randomUUID();
  const teacherId = randomUUID();
  const organizationId = randomUUID();
  const studentClassSessionId = randomUUID();
  const waitlistClassSessionId = randomUUID();
  const teacherClassSessionId = randomUUID();
  const bookingId = randomUUID();
  const now = new Date("2026-08-19T18:00:00.000Z");

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `user_suspension_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test", now: () => now });

    const courseId = randomUUID();
    const lessonUnitId = randomUUID();
    await db.insertInto("users").values([
      { id: administratorId, identity_issuer: "https://fake.local/", identity_subject: administratorSubject, display_name: "Avery Administrator", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: userId, identity_issuer: "https://fake.local/", identity_subject: userSubject, display_name: "Lucía Multi-role", interface_locale: "es", display_time_zone: "America/Denver" },
      { id: teacherId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Taylor Teacher", interface_locale: "en", display_time_zone: "America/Denver" },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: administratorId, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: userId, role: "STUDENT" },
      { user_id: userId, role: "TEACHER" },
      { user_id: userId, role: "ORGANIZATION_MANAGER" },
      { user_id: teacherId, role: "TEACHER" },
    ]).execute();
    await db.insertInto("organizations").values({ id: organizationId, name: "Example Organization" }).execute();
    await db.insertInto("organization_managers").values({ user_id: userId, organization_id: organizationId }).execute();
    await db.transaction().execute(async (transaction) => {
      await transaction.insertInto("courses").values({ id: courseId, stable_key: "zz-a1", target_language: "es", curriculum_level: "A1", title: "Suspension behavior", summary: "Suspension behavior" }).execute();
      await transaction.insertInto("lesson_units").values({ id: lessonUnitId, stable_key: "zz-a1-01", course_id: courseId, title: "Suspension behavior", summary: "Suspension behavior", objectives: JSON.stringify(["Observe suspension"]), sort_order: 1, state: "ACTIVE", replacement_lesson_unit_id: null, retired_at: null }).execute();
      await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: lessonUnitId, topic_key: "EC" }).execute();
    });
    await db.insertInto("teacher_qualifications").values([
      { teacher_user_id: userId, target_language: "es", curriculum_level: "A1", granted_by_user_id: administratorId },
      { teacher_user_id: teacherId, target_language: "es", curriculum_level: "A1", granted_by_user_id: administratorId },
    ]).execute();
    await db.insertInto("class_sessions").values([
      { id: studentClassSessionId, lesson_unit_id: lessonUnitId, teacher_user_id: teacherId, starts_at: new Date("2026-08-21T18:00:00.000Z"), scheduling_time_zone: "America/Denver", seat_capacity: 5, occupied_seats: 1, state: "PUBLISHED", cancellation_reason: null, cancelled_at: null },
      { id: waitlistClassSessionId, lesson_unit_id: lessonUnitId, teacher_user_id: teacherId, starts_at: new Date("2026-08-22T18:00:00.000Z"), scheduling_time_zone: "America/Denver", seat_capacity: 5, occupied_seats: 0, state: "PUBLISHED", cancellation_reason: null, cancelled_at: null },
      { id: teacherClassSessionId, lesson_unit_id: lessonUnitId, teacher_user_id: userId, starts_at: new Date("2026-08-23T18:00:00.000Z"), scheduling_time_zone: "America/Denver", seat_capacity: 5, occupied_seats: 0, state: "PUBLISHED", cancellation_reason: null, cancelled_at: null },
    ]).execute();
    await db.insertInto("class_credit_accounts").values({ student_user_id: userId, available_balance: 0 }).execute();
    await db.insertInto("class_credit_ledger_entries").values([
      { student_user_id: userId, amount: 1, source: "CREDIT_ADJUSTMENT", source_reference: randomUUID(), reason: "Test setup" },
      { student_user_id: userId, amount: -1, source: "BOOKING_DEDUCTION", source_reference: bookingId, reason: null },
    ]).execute();
    await db.insertInto("bookings").values({ id: bookingId, student_user_id: userId, class_session_id: studentClassSessionId, teacher_user_id_at_booking: teacherId, state: "ACTIVE", terminal_reason: null, class_credit_refunded: false, late_cancellation_refund_until: null, rescheduled_from_booking_id: null, booked_at: new Date("2026-08-18T18:00:00.000Z"), ended_at: null }).execute();
    await db.insertInto("waitlist_entries").values({ student_user_id: userId, class_session_id: waitlistClassSessionId, state: "ACTIVE", terminal_reason: null, joined_at: new Date("2026-08-18T18:00:00.000Z"), expires_at: new Date("2026-08-22T16:00:00.000Z"), completed_at: null, promoted_booking_id: null }).execute();
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("denies suspension and reactivation to a User without the Platform Administrator role", async () => {
    for (const [field, inputType, input] of [
      ["suspendUser", "ChangeUserAccessInput", { idempotencyKey: randomUUID(), userId, reason: "Unauthorized access change" }],
      ["reactivateUser", "ReactivateUserInput", { idempotencyKey: randomUUID(), userId }],
    ] as const) {
      const correlationId = randomUUID();
      const denied = await graphql(`
        mutation ChangeAccess($input: ${inputType}!) {
          ${field}(input: $input) { __typename }
        }
      `, { input }, userSubject, correlationId);
      expect(denied.data).toBeNull();
      expect(denied.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
      expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({ outcome: "DENIED", reason_code: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED" });
    }
  });

  it("suspends every role immediately, refunds Student commitments, and creates Teacher resolution work", async () => {
    const suspensionCorrelationId = randomUUID();
    const suspended = await graphql(`
      mutation SuspendUser($input: ChangeUserAccessInput!) {
        suspendUser(input: $input) {
          ... on UserAccessChangeSuccess {
            user { id accessStatus suspensionReason roles }
            endedBookingCount
            removedWaitlistEntryCount
            refundedClassCreditCount
            teacherClassSessionIds
          }
          ... on UserAccessError { code message }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), userId, reason: "Security review in progress" } }, administratorSubject, suspensionCorrelationId);

    expect(suspended).toEqual({ data: { suspendUser: {
      user: { id: userId, accessStatus: "SUSPENDED", suspensionReason: "Security review in progress", roles: ["ORGANIZATION_MANAGER", "STUDENT", "TEACHER"] },
      endedBookingCount: 1,
      removedWaitlistEntryCount: 1,
      refundedClassCreditCount: 1,
      teacherClassSessionIds: [teacherClassSessionId],
    } } });

    const deniedCorrelationId = randomUUID();
    const denied = await graphql(`query { roleWorkspace(actingRole: ORGANIZATION_MANAGER) { actingRole } }`, undefined, userSubject, deniedCorrelationId);
    expect(denied.data).toBeNull();
    expect(denied.errors?.[0]?.extensions.code).toBe("USER_SUSPENDED");

    expect(await db.selectFrom("bookings").select(["state", "terminal_reason", "class_credit_refunded"]).where("id", "=", bookingId).executeTakeFirstOrThrow()).toEqual({ state: "ENDED", terminal_reason: "USER_SUSPENSION", class_credit_refunded: true });
    expect(await db.selectFrom("class_credit_accounts").select("available_balance").where("student_user_id", "=", userId).executeTakeFirstOrThrow()).toEqual({ available_balance: 1 });
    expect(await db.selectFrom("class_sessions").select("state").where("id", "=", teacherClassSessionId).executeTakeFirstOrThrow()).toEqual({ state: "PUBLISHED" });
    expect(await db.selectFrom("administrator_task_items").select(["kind", "safe_context"]).where("kind", "=", "USER_SUSPENSION_TEACHER_ASSIGNMENT").execute()).toEqual([{
      kind: "USER_SUSPENSION_TEACHER_ASSIGNMENT",
      safe_context: { classSessionId: teacherClassSessionId, suspendedUserId: userId },
    }]);
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", suspensionCorrelationId).executeTakeFirstOrThrow()).toEqual({ outcome: "SUCCEEDED", reason_code: "USER_SUSPENDED" });
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", deniedCorrelationId).executeTakeFirstOrThrow()).toEqual({ outcome: "DENIED", reason_code: "USER_SUSPENDED" });
    expect(await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", userId).execute()).toContainEqual({ message_id: "user.suspended.user" });
    expect(await db.selectFrom("email_notification_intents").select(["locale", "rendered_content"]).where("recipient_user_id", "=", userId).where("message_id", "=", "user.suspended.user").executeTakeFirstOrThrow()).toMatchObject({ locale: "es", rendered_content: expect.stringMatching(/suspendido.*Security review in progress/is) });
  });

  it("reactivates assigned roles without recreating removed commitments", async () => {
    const reactivated = await graphql(`
      mutation ReactivateUser($input: ReactivateUserInput!) {
        reactivateUser(input: $input) {
          ... on UserAccessChangeSuccess { user { id accessStatus suspensionReason roles } endedBookingCount removedWaitlistEntryCount refundedClassCreditCount teacherClassSessionIds }
          ... on UserAccessError { code message }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), userId } });

    expect(reactivated).toEqual({ data: { reactivateUser: {
      user: { id: userId, accessStatus: "ACTIVE", suspensionReason: null, roles: ["ORGANIZATION_MANAGER", "STUDENT", "TEACHER"] },
      endedBookingCount: 0,
      removedWaitlistEntryCount: 0,
      refundedClassCreditCount: 0,
      teacherClassSessionIds: [],
    } } });
    const workspace = await graphql(`query { roleWorkspace(actingRole: ORGANIZATION_MANAGER) { actingRole } }`, undefined, userSubject);
    expect(workspace).toEqual({ data: { roleWorkspace: { actingRole: "ORGANIZATION_MANAGER" } } });
    expect(await db.selectFrom("bookings").select("state").where("id", "=", bookingId).executeTakeFirstOrThrow()).toEqual({ state: "ENDED" });
    expect(await db.selectFrom("waitlist_entries").select("state").where("student_user_id", "=", userId).executeTakeFirstOrThrow()).toEqual({ state: "INELIGIBLE" });
    expect(await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", userId).execute()).toEqual(expect.arrayContaining([
      { message_id: "user.suspended.user" },
      { message_id: "user.reactivated.user" },
    ]));
    const history = await db.selectFrom("user_access_changes").select("id").where("user_id", "=", userId).orderBy("changed_at").execute();
    expect(history).toHaveLength(2);
    await expect(db.updateTable("user_access_changes").set({ reason: "Rewritten access history" }).where("id", "=", history[0]!.id).execute()).rejects.toThrow("append-only");
  });

  it("does not let a mutation authenticated before suspension commit afterward", async () => {
    await db.insertInto("subscriptions").values({ student_user_id: userId, state: "ACTIVE", activated_at: new Date("2026-08-01T18:00:00.000Z"), anchor_day: 1, accounting_time_utc: "18:00:00", renewal_count: 0, next_anniversary_at: new Date("2026-09-01T18:00:00.000Z"), cancellation_effective_at: null }).execute();
    let releaseLock!: () => void;
    let confirmLock!: () => void;
    const lockHeld = new Promise<void>((resolve) => { confirmLock = resolve; });
    const release = new Promise<void>((resolve) => { releaseLock = resolve; });
    const blocker = db.transaction().execute(async (transaction) => {
      await sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 28))`.execute(transaction);
      confirmLock();
      await release;
    });
    await lockHeld;

    const suspension = graphql(`
      mutation SuspendUser($input: ChangeUserAccessInput!) {
        suspendUser(input: $input) { ... on UserAccessChangeSuccess { user { accessStatus } } ... on UserAccessError { code } }
      }
    `, { input: { idempotencyKey: randomUUID(), userId, reason: "Concurrent security review" } });
    await expect.poll(async () => (await sql<{ waiting_count: number }>`select count(*)::int as waiting_count from pg_stat_activity where wait_event = 'advisory'`.execute(db)).rows[0]!.waiting_count).toBeGreaterThan(0);
    const cancellationCorrelationId = randomUUID();
    const cancellation = graphql(`
      mutation ScheduleCancellation($input: SubscriptionLifecycleInput!) {
        scheduleSubscriptionCancellation(input: $input) { __typename }
      }
    `, { input: { idempotencyKey: randomUUID() } }, userSubject, cancellationCorrelationId);
    releaseLock();
    await blocker;

    expect(await suspension).toMatchObject({ data: { suspendUser: { user: { accessStatus: "SUSPENDED" } } } });
    const deniedCancellation = await cancellation;
    expect(deniedCancellation.data).toBeNull();
    expect(deniedCancellation.errors?.[0]?.extensions.code).toBe("USER_SUSPENDED");
    expect(await db.selectFrom("subscriptions").select("state").where("student_user_id", "=", userId).executeTakeFirstOrThrow()).toEqual({ state: "ACTIVE" });
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", cancellationCorrelationId).executeTakeFirstOrThrow()).toEqual({ outcome: "DENIED", reason_code: "USER_SUSPENDED" });
  });

  it("treats a Fixture-Removed User as one that does not exist", async () => {
    // A Canonical Data Rebuild retains noncanonical synthetic Users only for
    // immutable history. Administration must not be able to reach back into one.
    const removedUserId = randomUUID();
    await db.insertInto("users").values({
      id: removedUserId,
      identity_issuer: "https://fake.local/",
      identity_subject: randomUUID(),
      display_name: "Former User",
      interface_locale: null,
      display_time_zone: null,
      access_status: "FIXTURE_REMOVED",
      fixture_removed_at: now,
    }).execute();

    for (const [field, inputType, input] of [
      ["suspendUser", "ChangeUserAccessInput", { idempotencyKey: randomUUID(), userId: removedUserId, reason: "Reach a Fixture-Removed User" }],
      ["reactivateUser", "ReactivateUserInput", { idempotencyKey: randomUUID(), userId: removedUserId }],
    ] as const) {
      const correlationId = randomUUID();
      const denied = await graphql(`
        mutation ChangeAccess($input: ${inputType}!) {
          ${field}(input: $input) { __typename ... on UserAccessError { code } }
        }
      `, { input }, administratorSubject, correlationId);

      expect(denied.data?.[field]).toMatchObject({ code: "USER_NOT_FOUND" });
      expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"])
        .where("correlation_id", "=", correlationId).executeTakeFirstOrThrow())
        .toEqual({ outcome: "DENIED", reason_code: "USER_NOT_FOUND" });
    }

    expect(await db.selectFrom("users").select("access_status")
      .where("id", "=", removedUserId).executeTakeFirstOrThrow())
      .toEqual({ access_status: "FIXTURE_REMOVED" });
  });

  async function graphql(
    query: string,
    variables: Record<string, unknown> | undefined,
    actingSubject = administratorSubject,
    correlationId = randomUUID(),
  ) {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", "x-correlation-id": correlationId, "x-demo-user-id": actingSubject },
      body: JSON.stringify({ query, variables }),
    });
    return response.json() as Promise<{ data?: null | Record<string, unknown>; errors?: Array<{ extensions: { code: string } }> }>;
  }
});
