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
import { processPendingUserAnonymizations } from "../src/authorization/user-anonymization-worker.js";

describe("User Anonymization GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  const deletedIdentities: Array<{ issuer: string; subject: string }> = [];
  const administratorId = randomUUID();
  const administratorSubject = randomUUID();
  const userId = randomUUID();
  const userSubject = randomUUID();
  const teacherId = randomUUID();
  const classSessionId = randomUUID();
  const bookingId = randomUUID();
  const lessonUnitId = randomUUID();
  const now = new Date("2026-08-20T18:00:00.000Z");

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    db = createDatabase(await clonePostgreSqlTemplate(postgres, `user_anonymization_${randomUUID().replaceAll("-", "")}`));
    api = createApi({
      db,
      authMode: "fake",
      nodeEnv: "test",
      now: () => now,
    });

    const courseId = randomUUID();
    await db.insertInto("users").values([
      { id: administratorId, identity_issuer: "https://fake.local/", identity_subject: administratorSubject, display_name: "Avery Administrator", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: userId, identity_issuer: "https://fake.local/", identity_subject: userSubject, display_name: "Sam Student", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: teacherId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Taylor Teacher", interface_locale: "en", display_time_zone: "America/Denver" },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: administratorId, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: userId, role: "STUDENT" },
      { user_id: userId, role: "TEACHER" },
      { user_id: teacherId, role: "TEACHER" },
    ]).execute();
    await db.transaction().execute(async (transaction) => {
      await transaction.insertInto("courses").values({ id: courseId, stable_key: "xy-a1", target_language: "es", curriculum_level: "A1", title: "Anonymization", summary: "Anonymization" }).execute();
      await transaction.insertInto("lesson_units").values({ id: lessonUnitId, stable_key: "xy-a1-01", course_id: courseId, title: "Anonymization", summary: "Anonymization", objectives: JSON.stringify(["Preserve history"]), sort_order: 1, state: "ACTIVE", replacement_lesson_unit_id: null, retired_at: null }).execute();
      await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: lessonUnitId, topic_key: "EC" }).execute();
    });
    await db.insertInto("teacher_profiles").values({ teacher_user_id: userId, pronouns: "they/them", profile_image_url: "https://example.test/sam.jpg", professional_bio: "Identifying public biography", updated_at: now }).execute();
    await db.insertInto("teacher_profile_topics").values({ teacher_user_id: userId, topic_key: "EC" }).execute();
    await db.insertInto("teacher_qualifications").values({ teacher_user_id: teacherId, target_language: "es", curriculum_level: "A1", granted_by_user_id: administratorId }).execute();
    await db.insertInto("class_sessions").values({ id: classSessionId, lesson_unit_id: lessonUnitId, teacher_user_id: teacherId, starts_at: new Date("2026-08-18T18:00:00.000Z"), scheduling_time_zone: "America/Denver", seat_capacity: 5, occupied_seats: 0, state: "PUBLISHED", cancellation_reason: null, cancelled_at: null }).execute();
    await db.insertInto("bookings").values({ id: bookingId, student_user_id: userId, class_session_id: classSessionId, teacher_user_id_at_booking: teacherId, state: "ENDED", terminal_reason: "STUDENT_CANCELLATION", class_credit_refunded: false, late_cancellation_refund_until: null, rescheduled_from_booking_id: null, booked_at: new Date("2026-08-17T18:00:00.000Z"), ended_at: new Date("2026-08-18T20:00:00.000Z") }).execute();
    await db.insertInto("attendance_records").values({ booking_id: bookingId, outcome: "ATTENDED", submitted_by_user_id: teacherId, submitted_at: new Date("2026-08-18T19:00:00.000Z"), updated_at: new Date("2026-08-18T19:00:00.000Z") }).execute();
    await db.insertInto("lesson_unit_completions").values({ student_user_id: userId, lesson_unit_id: lessonUnitId, established_by_booking_id: bookingId, earned_at: new Date("2026-08-18T19:00:00.000Z") }).execute();
    await db.insertInto("class_credit_accounts").values({ student_user_id: userId, available_balance: 3 }).execute();
    await db.insertInto("student_placements").values({ student_user_id: userId, target_language: "es", curriculum_level: "A1" }).execute();
    await db.insertInto("class_credit_ledger_entries").values({ student_user_id: userId, amount: 3, source: "CREDIT_ADJUSTMENT", source_reference: randomUUID(), reason: "Historical credit grant" }).execute();
    await db.insertInto("learning_feedback").values({ booking_id: bookingId, teacher_user_id: teacherId, observed_strengths: ["LISTENING"], suggested_focuses: ["GRAMMAR"], observations: "Identifying teacher observations", next_practice: "Identifying practice", state: "SUBMITTED", submitted_at: new Date("2026-08-18T19:00:00.000Z"), created_at: new Date("2026-08-18T19:00:00.000Z"), updated_at: new Date("2026-08-18T19:00:00.000Z") }).execute();
    await db.insertInto("session_ratings").values({ booking_id: bookingId, student_user_id: userId, overall_rating: 5, positive_tags: ["SUPPORTIVE"], improvement_tags: ["PACING"], comment: "Identifying private comment", created_at: new Date("2026-08-18T19:00:00.000Z"), updated_at: new Date("2026-08-18T19:00:00.000Z") }).execute();
    await db.insertInto("in_app_notifications").values({ recipient_user_id: userId, message_id: "feedback.submitted.student", variables: JSON.stringify({ teacherName: "Taylor Teacher" }), source_reference: `before-anonymization:${userId}` }).execute();
    await db.insertInto("email_notification_intents").values({ recipient_user_id: userId, message_id: "feedback.submitted.student", locale: "en", variables: JSON.stringify({ teacherName: "Taylor Teacher" }), rendered_content: "Private notification content", source_reference: `before-anonymization:${userId}` }).execute();
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("requires deliberate confirmation and resolved future commitments before anonymizing", async () => {
    const organizationId = randomUUID();
    await db.insertInto("organizations").values({ id: organizationId, name: "Privacy Review Organization" }).execute();
    await db.insertInto("role_assignments").values({ user_id: userId, role: "ORGANIZATION_MANAGER" }).execute();
    await db.insertInto("organization_managers").values({ user_id: userId, organization_id: organizationId }).execute();
    expect(await anonymize("ANONYMIZE USER")).toMatchObject({ data: { anonymizeUser: { code: "PRIVILEGED_ACCESS_REQUIRES_RESOLUTION" } } });
    await db.deleteFrom("role_assignments").where("user_id", "=", userId).where("role", "=", "ORGANIZATION_MANAGER").execute();

    const futureSessionId = randomUUID();
    await db.insertInto("class_sessions").values({ id: futureSessionId, lesson_unit_id: lessonUnitId, teacher_user_id: teacherId, starts_at: new Date("2026-08-22T18:00:00.000Z"), scheduling_time_zone: "America/Denver", seat_capacity: 5, occupied_seats: 1, state: "PUBLISHED", cancellation_reason: null, cancelled_at: null }).execute();
    const futureBookingId = randomUUID();
    await db.insertInto("bookings").values({ id: futureBookingId, student_user_id: userId, class_session_id: futureSessionId, teacher_user_id_at_booking: teacherId, state: "ACTIVE", terminal_reason: null, class_credit_refunded: false, late_cancellation_refund_until: null, rescheduled_from_booking_id: null, booked_at: now, ended_at: null }).execute();

    expect(await anonymize("ANONYMIZE USER")).toMatchObject({ data: { anonymizeUser: { code: "FUTURE_COMMITMENTS_REQUIRE_RESOLUTION", classSessionIds: [futureSessionId] } } });
    await db.transaction().execute(async (transaction) => {
      await transaction.updateTable("bookings").set({ state: "ENDED", terminal_reason: "STUDENT_CANCELLATION", ended_at: now }).where("id", "=", futureBookingId).execute();
      await transaction.updateTable("class_sessions").set({ occupied_seats: 0 }).where("id", "=", futureSessionId).execute();
    });
    expect(await anonymize("anonymize user")).toMatchObject({ data: { anonymizeUser: { code: "CONFIRMATION_REQUIRED" } } });
    expect(deletedIdentities).toEqual([]);
  });

  it("destroys identity and private data while preserving opaque marketplace history", async () => {
    const correlationId = randomUUID();
    const result = await anonymize("ANONYMIZE USER", correlationId);
    expect(result).toEqual({ data: { anonymizeUser: { __typename: "AnonymizeUserSuccess", state: "PENDING", user: { id: userId, displayName: "Former User", accessStatus: "ANONYMIZATION_PENDING", suspensionReason: null, roles: [] }, redactedLearningFeedbackCount: 1, redactedSessionRatingCount: 1 } } });
    expect(deletedIdentities).toEqual([]);

    const oldIdentity = await graphql("query { roleWorkspace(actingRole: STUDENT) { actingRole } }", undefined, userSubject);
    expect(oldIdentity.errors?.[0]?.extensions.code).toBe("USER_ANONYMIZATION_PENDING");
    await db.insertInto("in_app_notifications").values({ recipient_user_id: userId, message_id: "late.notification", variables: JSON.stringify({ private: "content" }), source_reference: `after-anonymization:${userId}` }).execute();
    expect(await db.selectFrom("in_app_notifications").select("id").where("recipient_user_id", "=", userId).execute()).toEqual([]);
    await expect(db.updateTable("learning_feedback").set({ observations: "Restored private feedback" }).where("booking_id", "=", bookingId).execute()).rejects.toThrow("cannot be written for an anonymized User");
    await expect(processPendingUserAnonymizations(db, { deleteIdentity: async () => { throw new Error("provider unavailable"); } }, now, "worker-failure-48")).resolves.toBe(0);
    expect(await db.selectFrom("user_anonymization_requests").select(["state", "attempt_count"]).where("user_id", "=", userId).executeTakeFirstOrThrow()).toEqual({ state: "PENDING", attempt_count: 1 });
    expect(await db.selectFrom("audit_entries").select(["system_identity", "outcome", "reason_code"]).where("correlation_id", "=", "worker-failure-48").executeTakeFirstOrThrow()).toEqual({ system_identity: "USER_ANONYMIZATION_WORKER", outcome: "FAILED", reason_code: "IDENTITY_DELETION_FAILED" });
    await sql`create function reject_anonymization_finalization() returns trigger language plpgsql as $$ begin if new.access_status = 'ANONYMIZED' then raise exception 'finalization unavailable'; end if; return new; end $$`.execute(db);
    await sql`create trigger reject_anonymization_finalization before update on users for each row execute function reject_anonymization_finalization()`.execute(db);
    await expect(processPendingUserAnonymizations(db, { deleteIdentity: async () => undefined }, now, "worker-finalization-failure-48")).resolves.toBe(0);
    expect(await db.selectFrom("user_anonymization_requests").select(["state", "attempt_count"]).where("user_id", "=", userId).executeTakeFirstOrThrow()).toEqual({ state: "PENDING", attempt_count: 2 });
    expect(await db.selectFrom("audit_entries").select(["system_identity", "outcome", "reason_code"]).where("correlation_id", "=", "worker-finalization-failure-48").executeTakeFirstOrThrow()).toEqual({ system_identity: "USER_ANONYMIZATION_WORKER", outcome: "FAILED", reason_code: "ANONYMIZATION_FINALIZATION_FAILED" });
    await sql`drop trigger reject_anonymization_finalization on users`.execute(db);
    await sql`drop function reject_anonymization_finalization()`.execute(db);
    await processPendingUserAnonymizations(db, { deleteIdentity: async (identity) => { deletedIdentities.push(identity); } }, now, "worker-success-48");
    expect(deletedIdentities).toEqual([{ issuer: "https://fake.local/", subject: userSubject }]);
    expect((await graphql("query { roleWorkspace(actingRole: STUDENT) { actingRole } }", undefined, userSubject)).errors?.[0]?.extensions.code).toBe("UNAUTHENTICATED");

    expect(await db.selectFrom("users").select(["identity_issuer", "identity_subject", "display_name", "interface_locale", "display_time_zone", "access_status"]).where("id", "=", userId).executeTakeFirstOrThrow()).toEqual({ identity_issuer: null, identity_subject: null, display_name: "Former User", interface_locale: null, display_time_zone: null, access_status: "ANONYMIZED" });
    expect(await db.selectFrom("bookings").select(["student_user_id", "state"]).where("id", "=", bookingId).executeTakeFirstOrThrow()).toEqual({ student_user_id: userId, state: "ENDED" });
    expect(await db.selectFrom("lesson_unit_completions").select("student_user_id").where("established_by_booking_id", "=", bookingId).executeTakeFirstOrThrow()).toEqual({ student_user_id: userId });
    expect(await db.selectFrom("class_credit_accounts").select("available_balance").where("student_user_id", "=", userId).executeTakeFirstOrThrow()).toEqual({ available_balance: 3 });
    expect(await db.selectFrom("student_placements").select(["target_language", "curriculum_level"]).where("student_user_id", "=", userId).executeTakeFirstOrThrow()).toEqual({ target_language: "es", curriculum_level: "A1" });
    expect(await db.selectFrom("learning_feedback").select(["observed_strengths", "suggested_focuses", "observations", "next_practice", "redacted_at"]).where("booking_id", "=", bookingId).executeTakeFirstOrThrow()).toMatchObject({ observed_strengths: "{}", suggested_focuses: "{}", observations: "", next_practice: "", redacted_at: now });
    expect(await db.selectFrom("session_ratings").select(["overall_rating", "positive_tags", "improvement_tags", "comment", "redacted_at"]).where("booking_id", "=", bookingId).executeTakeFirstOrThrow()).toMatchObject({ overall_rating: 5, positive_tags: "{}", improvement_tags: "{}", comment: "", redacted_at: now });
    expect(await db.selectFrom("in_app_notifications").select("id").where("recipient_user_id", "=", userId).execute()).toEqual([]);
    expect(await db.selectFrom("email_notification_intents").select("id").where("recipient_user_id", "=", userId).execute()).toEqual([]);
    expect(await db.selectFrom("teacher_profiles").select("teacher_user_id").where("teacher_user_id", "=", userId).execute()).toEqual([]);
    expect(await db.selectFrom("audit_entries").select(["actor_user_id", "target_id", "outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({ actor_user_id: administratorId, target_id: userId, outcome: "SUCCEEDED", reason_code: "USER_ANONYMIZATION_REQUESTED" });
    expect(await db.selectFrom("audit_entries").select(["system_identity", "target_id", "outcome", "reason_code"]).where("correlation_id", "=", "worker-success-48").executeTakeFirstOrThrow()).toEqual({ system_identity: "USER_ANONYMIZATION_WORKER", target_id: userId, outcome: "SUCCEEDED", reason_code: "USER_ANONYMIZED" });
    expect(await db.selectFrom("in_app_notifications").select(["recipient_user_id", "message_id", "variables"]).where("source_reference", "=", `user-anonymization.completed:${userId}`).executeTakeFirstOrThrow()).toEqual({ recipient_user_id: administratorId, message_id: "user-anonymization.completed.administrator", variables: { userId } });
    expect(await db.selectFrom("user_anonymization_requests").select(["state", "identity_issuer", "identity_subject", "reason"]).where("user_id", "=", userId).executeTakeFirstOrThrow()).toEqual({ state: "COMPLETED", identity_issuer: null, identity_subject: null, reason: "User requested irreversible privacy action" });

    const returningUserId = randomUUID();
    await db.insertInto("users").values({ id: returningUserId, identity_issuer: "https://fake.local/", identity_subject: userSubject, display_name: "Returning Person", interface_locale: "en", display_time_zone: "UTC" }).execute();
    await db.insertInto("role_assignments").values({ user_id: returningUserId, role: "STUDENT" }).execute();
    expect(await graphql("query { roleWorkspace(actingRole: STUDENT) { user { id displayName } } }", undefined, userSubject)).toEqual({ data: { roleWorkspace: { user: { id: returningUserId, displayName: "Returning Person" } } } });
    expect(await graphql(`mutation Grant($input: ChangeRoleAssignmentInput!) { grantRoleAssignment(input: $input) { ... on RoleAssignmentError { code } } }`, { input: { idempotencyKey: randomUUID(), userId, role: "STUDENT", reason: "Attempt to reclaim history" } })).toEqual({ data: { grantRoleAssignment: { code: "USER_ANONYMIZED" } } });
  });

  it("continues past poison requests and creates work after retries are exhausted", async () => {
    const poisonUserId = randomUUID();
    const laterUserId = randomUUID();
    await db.insertInto("users").values([
      { id: poisonUserId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Poison Request", interface_locale: "en", display_time_zone: "UTC" },
      { id: laterUserId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Later Request", interface_locale: "en", display_time_zone: "UTC" },
    ]).execute();
    await anonymizeUserId(poisonUserId, "poison-request");
    await anonymizeUserId(laterUserId, "later-request");
    await db.updateTable("user_anonymization_requests").set({ requested_at: new Date(now.getTime() + 1) }).where("user_id", "=", laterUserId).execute();

    expect(await processPendingUserAnonymizations(db, { deleteIdentity: async ({ subject }) => { if ((await db.selectFrom("user_anonymization_requests").select("identity_subject").where("user_id", "=", poisonUserId).executeTakeFirstOrThrow()).identity_subject === subject) throw new Error("poison identity"); } }, now, "worker-continues-48")).toBe(1);
    expect(await db.selectFrom("users").select("access_status").where("id", "=", laterUserId).executeTakeFirstOrThrow()).toEqual({ access_status: "ANONYMIZED" });

    for (let attempt = 2; attempt <= 4; attempt += 1) {
      await processPendingUserAnonymizations(db, { deleteIdentity: async () => { throw new Error("poison identity"); } }, now, `worker-poison-${attempt}-48`);
    }
    expect(await db.selectFrom("administrator_task_items").select(["kind", "recipient_reference", "safe_context"]).where("source_reference", "=", `user-anonymization.reconciliation:${poisonUserId}`).executeTakeFirstOrThrow()).toEqual({ kind: "USER_ANONYMIZATION_RECONCILIATION", recipient_reference: administratorId, safe_context: { anonymizedUserId: poisonUserId, failureCode: "IDENTITY_DELETION_FAILED" } });
    expect(await processPendingUserAnonymizations(db, { deleteIdentity: async () => undefined }, now, "worker-poison-recovered-48")).toBe(1);
    expect(await db.selectFrom("administrator_task_items").select(["state", "resolution_reason"]).where("source_reference", "=", `user-anonymization.reconciliation:${poisonUserId}`).executeTakeFirstOrThrow()).toEqual({ state: "RESOLVED", resolution_reason: "Automatically recovered by the User Anonymization worker." });
    expect(await db.selectFrom("audit_entries").select(["system_identity", "outcome", "reason_code"]).where("correlation_id", "=", "worker-poison-recovered-48").where("target_type", "=", "AdministratorTaskItem").where("reason_code", "=", "ANONYMIZATION_RECONCILIATION_RECOVERED").executeTakeFirstOrThrow()).toEqual({ system_identity: "USER_ANONYMIZATION_WORKER", outcome: "SUCCEEDED", reason_code: "ANONYMIZATION_RECONCILIATION_RECOVERED" });
  });

  function anonymize(confirmation: string, correlationId: string = randomUUID()) {
    return anonymizeUserId(userId, correlationId, confirmation);
  }

  function anonymizeUserId(targetUserId: string, correlationId: string = randomUUID(), confirmation = "ANONYMIZE USER") {
    return graphql(`mutation AnonymizeUser($input: AnonymizeUserInput!) { anonymizeUser(input: $input) { __typename ... on AnonymizeUserSuccess { state user { id displayName accessStatus suspensionReason roles } redactedLearningFeedbackCount redactedSessionRatingCount } ... on AnonymizeUserError { code message classSessionIds } } }`, { input: { idempotencyKey: randomUUID(), userId: targetUserId, reason: "User requested irreversible privacy action", confirmation } }, administratorSubject, correlationId);
  }

  async function graphql(query: string, variables?: Record<string, unknown>, subject = administratorSubject, correlationId: string = randomUUID()) {
    const response = await api.fetch("http://localhost/graphql", { method: "POST", headers: { "content-type": "application/json", "x-correlation-id": correlationId, "x-demo-user-id": subject }, body: JSON.stringify({ query, variables }) });
    return response.json() as Promise<{ data?: unknown; errors?: Array<{ extensions: { code: string } }> }>;
  }
});
