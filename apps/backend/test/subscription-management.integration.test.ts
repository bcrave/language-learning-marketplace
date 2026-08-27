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
import { applyCanonicalIdentities, applyCanonicalSubscription } from "../src/fixtures/canonical-fixture-loader.js";
import { CANONICAL_STUDENT_ID } from "../src/fixtures/canonical-fixture-manifest.js";

describe("Subscription management GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  const administratorId = randomUUID();
  const administratorSubject = randomUUID();
  const studentId = randomUUID();
  const studentSubject = randomUUID();

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `subscriptions_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test" });
    await db.insertInto("users").values([
      { id: administratorId, identity_issuer: "https://fake.local/", identity_subject: administratorSubject, display_name: "Avery Admin", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: studentId, identity_issuer: "https://fake.local/", identity_subject: studentSubject, display_name: "Sofía Rivera", interface_locale: "es", display_time_zone: "America/Denver" },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: administratorId, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: studentId, role: "STUDENT" },
    ]).execute();
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("activates and renews on the original-day short-month anniversary without duplicate grants", async () => {
    const activation = await providerEvent({
      effectiveAt: "2027-01-31T16:30:00.000Z",
      eventType: "ACTIVATED",
      providerEventId: "provider-activation-31",
    });
    const activationReplay = await providerEvent({
      effectiveAt: "2027-01-31T16:30:00.000Z",
      eventType: "ACTIVATED",
      providerEventId: "provider-activation-31",
    });
    const februaryRenewal = await providerEvent({
      effectiveAt: "2027-02-28T16:30:00.000Z",
      eventType: "RENEWED",
      providerEventId: "provider-renewal-february",
    });
    const duplicatePeriod = await providerEvent({
      effectiveAt: "2027-02-28T16:30:00.000Z",
      eventType: "RENEWED",
      providerEventId: "provider-renewal-february-duplicate",
    });
    const subscription = await graphql(`
      query {
        studentSubscription { state anchorDay accountingTimeUtc activatedAt nextAnniversaryAt cancellationEffectiveAt }
        studentClassCredits { availableBalance ledger { amount source sourceReference } }
      }
    `, undefined, studentSubject);

    expect(activation).toMatchObject({ data: { processSubscriptionProviderEvent: {
      subscription: { state: "ACTIVE", anchorDay: 31, accountingTimeUtc: "16:30:00", nextAnniversaryAt: "2027-02-28T16:30:00.000Z" },
      account: { availableBalance: 8 },
    } } });
    expect(activationReplay).toEqual(activation);
    expect(februaryRenewal).toMatchObject({ data: { processSubscriptionProviderEvent: {
      subscription: { state: "ACTIVE", nextAnniversaryAt: "2027-03-31T16:30:00.000Z" },
      account: { availableBalance: 16 },
    } } });
    expect(duplicatePeriod).toEqual({ data: { processSubscriptionProviderEvent: { conflictCode: "SUBSCRIPTION_PERIOD_ALREADY_GRANTED" } } });
    expect(subscription).toEqual({ data: {
      studentSubscription: {
        state: "ACTIVE",
        anchorDay: 31,
        accountingTimeUtc: "16:30:00",
        activatedAt: "2027-01-31T16:30:00.000Z",
        nextAnniversaryAt: "2027-03-31T16:30:00.000Z",
        cancellationEffectiveAt: null,
      },
      studentClassCredits: {
        availableBalance: 16,
        ledger: [
          { amount: 8, source: "SUBSCRIPTION_GRANT", sourceReference: expect.stringContaining("2027-02-28") },
          { amount: 8, source: "SUBSCRIPTION_GRANT", sourceReference: expect.stringContaining("2027-01-31") },
        ],
      },
    } });
    expect(await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", studentId).execute()).toEqual([
      { message_id: "subscription.activated.student" },
      { message_id: "subscription.renewed.student" },
    ]);
  });

  it("skips a suspended Student's Subscription renewal grant without backfill", async () => {
    const suspendedStudentId = randomUUID();
    await db.insertInto("users").values({ id: suspendedStudentId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Suspended Subscriber", interface_locale: "en", display_time_zone: "UTC" }).execute();
    await db.insertInto("role_assignments").values({ user_id: suspendedStudentId, role: "STUDENT" }).execute();
    await providerEvent({ effectiveAt: "2027-01-15T12:00:00.000Z", eventType: "ACTIVATED", providerEventId: "suspended-subscription-activation", studentUserId: suspendedStudentId });
    await db.updateTable("users").set({ access_status: "SUSPENDED", suspension_reason: "Security review", suspended_at: new Date("2027-02-14T12:00:00.000Z"), suspended_by_user_id: administratorId }).where("id", "=", suspendedStudentId).execute();

    const skippedCorrelationId = randomUUID();
    const skipped = await providerEvent({ effectiveAt: "2027-02-15T12:00:00.000Z", eventType: "RENEWED", providerEventId: "suspended-subscription-renewal", studentUserId: suspendedStudentId }, administratorSubject, skippedCorrelationId);
    expect(skipped).toMatchObject({ data: { processSubscriptionProviderEvent: {
      subscription: { nextAnniversaryAt: "2027-03-15T12:00:00.000Z" },
      account: { availableBalance: 8 },
    } } });
    expect(await db.selectFrom("class_credit_ledger_entries").select("id").where("student_user_id", "=", suspendedStudentId).execute()).toHaveLength(1);
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", skippedCorrelationId).execute()).toContainEqual({ outcome: "SUCCEEDED", reason_code: "SUBSCRIPTION_GRANT_SKIPPED_USER_SUSPENDED" });

    await db.updateTable("users").set({ access_status: "ACTIVE", suspension_reason: null, suspended_at: null, suspended_by_user_id: null }).where("id", "=", suspendedStudentId).execute();
    await providerEvent({ effectiveAt: "2027-03-15T12:00:00.000Z", eventType: "RENEWED", providerEventId: "reactivated-subscription-renewal", studentUserId: suspendedStudentId });
    expect(await db.selectFrom("class_credit_accounts").select("available_balance").where("student_user_id", "=", suspendedStudentId).executeTakeFirstOrThrow()).toEqual({ available_balance: 16 });
  });

  it("activates a suspended Student's Subscription without issuing the skipped initial grant", async () => {
    const suspendedStudentId = randomUUID();
    await db.insertInto("users").values({ id: suspendedStudentId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Suspended New Subscriber", interface_locale: "en", display_time_zone: "UTC", access_status: "SUSPENDED", suspension_reason: "Security review", suspended_at: new Date("2027-01-14T12:00:00.000Z"), suspended_by_user_id: administratorId }).execute();
    await db.insertInto("role_assignments").values({ user_id: suspendedStudentId, role: "STUDENT" }).execute();

    const activation = await providerEvent({ effectiveAt: "2027-01-15T12:00:00.000Z", eventType: "ACTIVATED", providerEventId: "suspended-initial-activation", studentUserId: suspendedStudentId });
    expect(activation).toMatchObject({ data: { processSubscriptionProviderEvent: {
      subscription: { state: "ACTIVE", nextAnniversaryAt: "2027-02-15T12:00:00.000Z" },
      account: { availableBalance: 0 },
    } } });
    expect(await db.selectFrom("class_credit_ledger_entries").select("id").where("student_user_id", "=", suspendedStudentId).execute()).toHaveLength(0);
  });

  it("schedules and undoes cancellation without a grant, then cancels with owned credits intact", async () => {
    const scheduleKey = randomUUID();
    const scheduled = await studentMutation("scheduleSubscriptionCancellation", "ScheduleSubscriptionCancellationSuccess", studentSubject, randomUUID(), scheduleKey);
    const scheduledReplay = await studentMutation("scheduleSubscriptionCancellation", "ScheduleSubscriptionCancellationSuccess", studentSubject, randomUUID(), scheduleKey);
    const undone = await studentMutation("undoSubscriptionCancellation", "UndoSubscriptionCancellationSuccess");
    const scheduledAgain = await studentMutation("scheduleSubscriptionCancellation", "ScheduleSubscriptionCancellationSuccess");
    const providerReactivation = await providerEvent({
      effectiveAt: "2027-03-01T16:30:00.000Z",
      eventType: "REACTIVATED",
      providerEventId: "provider-reactivation-march",
    });
    const scheduledForCancellation = await studentMutation("scheduleSubscriptionCancellation", "ScheduleSubscriptionCancellationSuccess");
    const lateProviderReactivation = await providerEvent({
      effectiveAt: "2027-03-31T16:30:00.000Z",
      eventType: "REACTIVATED",
      providerEventId: "provider-reactivation-too-late",
    });
    const cancellation = await providerEvent({
      effectiveAt: "2027-03-31T16:30:00.000Z",
      eventType: "CANCELLED",
      providerEventId: "provider-cancellation-march",
    });
    const inspected = await graphql(`query { studentSubscription { state nextAnniversaryAt cancellationEffectiveAt } studentClassCredits { availableBalance } }`, undefined, studentSubject);

    expect(scheduled).toMatchObject({ data: { scheduleSubscriptionCancellation: { subscription: { state: "CANCELLATION_SCHEDULED", cancellationEffectiveAt: "2027-03-31T16:30:00.000Z" } } } });
    expect(scheduledReplay).toEqual(scheduled);
    expect(undone).toMatchObject({ data: { undoSubscriptionCancellation: { subscription: { state: "ACTIVE", cancellationEffectiveAt: null, nextAnniversaryAt: "2027-03-31T16:30:00.000Z" } } } });
    expect(scheduledAgain).toMatchObject({ data: { scheduleSubscriptionCancellation: { subscription: { state: "CANCELLATION_SCHEDULED" } } } });
    expect(providerReactivation).toMatchObject({ data: { processSubscriptionProviderEvent: { subscription: { state: "ACTIVE", nextAnniversaryAt: "2027-03-31T16:30:00.000Z" }, account: { availableBalance: 16 } } } });
    expect(scheduledForCancellation).toMatchObject({ data: { scheduleSubscriptionCancellation: { subscription: { state: "CANCELLATION_SCHEDULED" } } } });
    expect(lateProviderReactivation).toEqual({ data: { processSubscriptionProviderEvent: { conflictCode: "SUBSCRIPTION_CANCELLATION_EFFECTIVE" } } });
    expect(cancellation).toMatchObject({ data: { processSubscriptionProviderEvent: { subscription: { state: "CANCELLED", nextAnniversaryAt: null, cancellationEffectiveAt: "2027-03-31T16:30:00.000Z" }, account: { availableBalance: 16 } } } });
    expect(inspected).toEqual({ data: { studentSubscription: { state: "CANCELLED", nextAnniversaryAt: null, cancellationEffectiveAt: "2027-03-31T16:30:00.000Z" }, studentClassCredits: { availableBalance: 16 } } });
    expect(await db.selectFrom("class_credit_ledger_entries").select("id").where("student_user_id", "=", studentId).execute()).toHaveLength(2);
    expect(await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", studentId).execute()).toEqual([
      { message_id: "subscription.activated.student" },
      { message_id: "subscription.renewed.student" },
      { message_id: "subscription.cancellation-scheduled.student" },
      { message_id: "subscription.cancellation-undone.student" },
      { message_id: "subscription.cancellation-scheduled.student" },
      { message_id: "subscription.cancellation-undone.student" },
      { message_id: "subscription.cancellation-scheduled.student" },
    ]);
    expect(await db.selectFrom("email_notification_intents").select(["locale", "rendered_content"]).where("recipient_user_id", "=", studentId).where("message_id", "=", "subscription.cancellation-scheduled.student").executeTakeFirstOrThrow()).toMatchObject({
      locale: "es",
      rendered_content: expect.stringMatching(/cancelaci[oó]n.*cr[eé]ditos/i),
    });
    expect(await db.selectFrom("audit_entries").select(["operation", "outcome"]).where("operation", "in", ["subscription.provider-event.processed", "subscription.cancellation-scheduled", "subscription.cancellation-undone"]).execute()).toEqual(expect.arrayContaining([
      { operation: "subscription.provider-event.processed", outcome: "SUCCEEDED" },
      { operation: "subscription.cancellation-scheduled", outcome: "SUCCEEDED" },
      { operation: "subscription.cancellation-undone", outcome: "SUCCEEDED" },
    ]));
  });

  it("authorizes provider and Student operations and records privacy-safe Audit Entries", async () => {
    const deniedProviderCorrelation = randomUUID();
    const deniedProvider = await providerEvent({
      effectiveAt: "2027-04-30T16:30:00.000Z",
      eventType: "RENEWED",
      providerEventId: "unauthorized-provider-event",
    }, studentSubject, deniedProviderCorrelation);
    const deniedStudentCorrelation = randomUUID();
    const deniedStudent = await studentMutation("scheduleSubscriptionCancellation", "ScheduleSubscriptionCancellationSuccess", administratorSubject, deniedStudentCorrelation);

    expect(deniedProvider.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
    expect(deniedStudent.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
    expect(await db.selectFrom("audit_entries").select(["operation", "outcome", "reason_code"]).where("correlation_id", "in", [deniedProviderCorrelation, deniedStudentCorrelation]).orderBy("correlation_id").execute()).toEqual(expect.arrayContaining([
      { operation: "subscription.provider-event.processed", outcome: "DENIED", reason_code: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED" },
      { operation: "subscription.cancellation-scheduled", outcome: "DENIED", reason_code: "STUDENT_ROLE_REQUIRED" },
    ]));
  });

  it("seeds the shared Student with an active canonical Subscription and eight owned Class Credits", async () => {
    const now = new Date("2026-08-05T18:00:00.000Z");
    await applyCanonicalIdentities(db);
    await applyCanonicalSubscription(db, { now });
    await applyCanonicalSubscription(db, { now });

    expect(await db.selectFrom("subscriptions").select(["state", "next_anniversary_at"]).where("student_user_id", "=", CANONICAL_STUDENT_ID).executeTakeFirstOrThrow()).toEqual({
      state: "ACTIVE",
      next_anniversary_at: new Date("2026-09-04T18:00:00.000Z"),
    });
    expect(await db.selectFrom("class_credit_accounts").select("available_balance").where("student_user_id", "=", CANONICAL_STUDENT_ID).executeTakeFirstOrThrow()).toEqual({ available_balance: 8 });
    const elapsedAnniversary = new Date("2026-08-05T00:00:00.000Z");
    await db.updateTable("subscriptions").set({ state: "CANCELLATION_SCHEDULED", next_anniversary_at: elapsedAnniversary, cancellation_effective_at: elapsedAnniversary }).where("student_user_id", "=", CANONICAL_STUDENT_ID).executeTakeFirstOrThrow();
    expect(await studentMutation("undoSubscriptionCancellation", "UndoSubscriptionCancellationSuccess", CANONICAL_STUDENT_ID)).toEqual({
      data: { undoSubscriptionCancellation: { conflictCode: "SUBSCRIPTION_CANCELLATION_EFFECTIVE" } },
    });
  });

  async function providerEvent(
    input: { effectiveAt: string; eventType: string; providerEventId: string; studentUserId?: string },
    subject = administratorSubject,
    correlationId = randomUUID(),
  ) {
    return graphql(`
      mutation ProviderEvent($input: ProcessSubscriptionProviderEventInput!) {
        processSubscriptionProviderEvent(input: $input) {
          ... on ProcessSubscriptionProviderEventSuccess {
            subscription { state anchorDay accountingTimeUtc activatedAt nextAnniversaryAt cancellationEffectiveAt }
            account { availableBalance }
          }
          ... on SubscriptionConflict { conflictCode: code }
        }
      }
    `, { input: { ...input, idempotencyKey: randomUUID(), studentUserId: input.studentUserId ?? studentId, reason: "Simulated provider event" } }, subject, correlationId);
  }

  async function studentMutation(
    operation: string,
    successType: string,
    subject = studentSubject,
    correlationId = randomUUID(),
    idempotencyKey = randomUUID(),
  ) {
    return graphql(`
      mutation ChangeSubscription($input: SubscriptionLifecycleInput!) {
        ${operation}(input: $input) {
          ... on ${successType} { subscription { state nextAnniversaryAt cancellationEffectiveAt } }
          ... on SubscriptionConflict { conflictCode: code }
        }
      }
    `, { input: { idempotencyKey } }, subject, correlationId);
  }

  async function graphql(
    query: string,
    variables?: Record<string, unknown>,
    subject = administratorSubject,
    correlationId = randomUUID(),
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
