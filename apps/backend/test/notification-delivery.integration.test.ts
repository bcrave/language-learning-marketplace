import { randomUUID } from "node:crypto";

import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeWorkerUtils, runOnce } from "graphile-worker";

import { createDatabase, type Database } from "../src/database/database.js";
import { migrateDatabase } from "../src/database/migrate.js";
import { createApi } from "../src/api/app.js";
import {
  EmailDeliveryFailure,
  compactTerminalNotifications,
  localRecordingEmailAdapter,
  notificationDeliveryTasks,
  processNotificationDeliveries,
} from "../src/notification/notification-delivery-worker.js";

describe("Notification delivery worker", () => {
  let db: Database;
  let databaseUrl: string;
  let api: ReturnType<typeof createApi>;
  let postgres: StartedPostgreSqlContainer;
  const studentId = randomUUID();
  const studentSubject = randomUUID();
  const administratorId = randomUUID();
  const administratorSubject = randomUUID();

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `notification_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test" });
    await db.insertInto("users").values([
      { id: studentId, identity_issuer: "https://fake.local/", identity_subject: studentSubject, display_name: "Sofía Student", interface_locale: "es", display_time_zone: "America/Denver" },
      { id: administratorId, identity_issuer: "https://fake.local/", identity_subject: administratorSubject, display_name: "Alex Administrator", interface_locale: "en", display_time_zone: "America/Denver" },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: studentId, role: "STUDENT" },
      { user_id: administratorId, role: "PLATFORM_ADMINISTRATOR" },
    ]).execute();
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("delivers a localized email intent once and keeps permanent redelivery proof", async () => {
    const sourceReference = `subscription.renewed.student:${randomUUID()}`;
    await db.insertInto("email_notification_intents").values({
      recipient_user_id: studentId,
      message_id: "subscription.renewed.student",
      locale: "es",
      variables: JSON.stringify({ creditsGranted: 8 }),
      rendered_content: "Se añadieron 8 créditos.",
      source_reference: sourceReference,
      next_attempt_at: new Date("2026-08-09T12:00:00Z"),
    }).execute();

    const adapter = localRecordingEmailAdapter(db);
    await runNotificationWorker(adapter, new Date("2026-08-09T12:00:00Z"), "delivery-first");
    expect(await processNotificationDeliveries(db, adapter, new Date("2026-08-09T12:01:00Z"), "delivery-replay")).toBe(0);

    expect(await db.selectFrom("recorded_email_deliveries")
      .select(["recipient_user_id", "locale", "rendered_content"])
      .execute()).toEqual([{
      recipient_user_id: studentId,
      locale: "es",
      rendered_content: "Se añadieron 8 créditos.",
    }]);
    expect(await db.selectFrom("delivery_receipts")
      .select(["source_reference", "recipient_user_id", "channel", "outcome"])
      .execute()).toEqual([{
      source_reference: sourceReference,
      recipient_user_id: studentId,
      channel: "EMAIL",
      outcome: "DELIVERED",
    }]);
  });

  it("exhausts safe retries into one role-scoped administrator task", async () => {
    const sourceReference = `booking.created.student:${randomUUID()}`;
    const studentIntent = await db.insertInto("email_notification_intents").values({
      recipient_user_id: studentId,
      message_id: "booking.created.student",
      locale: "en",
      variables: JSON.stringify({ classSessionId: randomUUID() }),
      rendered_content: "Your Booking is confirmed.",
      source_reference: sourceReference,
      next_attempt_at: new Date("2026-08-09T13:00:00Z"),
    }).returning("id").executeTakeFirstOrThrow();
    await db.insertInto("email_notification_intents").values({
      recipient_user_id: administratorId,
      message_id: "booking.created.student",
      locale: "en",
      variables: JSON.stringify({ classSessionId: randomUUID() }),
      rendered_content: "Your Booking is confirmed.",
      source_reference: sourceReference,
      next_attempt_at: new Date("2026-08-09T13:00:00Z"),
    }).execute();
    const failingAdapter = {
      deliver: async () => {
        throw new EmailDeliveryFailure("ADAPTER_UNAVAILABLE", true);
      },
    };

    for (const now of [
      "2026-08-09T13:00:00Z",
      "2026-08-09T13:01:00Z",
      "2026-08-09T13:06:00Z",
      "2026-08-09T13:36:00Z",
    ]) {
      await processNotificationDeliveries(db, failingAdapter, new Date(now), "safe-correlation-36");
    }

    expect(await db.selectFrom("notification_delivery_attempts")
      .select(["attempt_number", "outcome", "safe_failure_code"])
      .where("notification_intent_id", "=", studentIntent.id)
      .orderBy("attempt_number")
      .execute()).toEqual([
      { attempt_number: 1, outcome: "RETRYABLE_FAILURE", safe_failure_code: "ADAPTER_UNAVAILABLE" },
      { attempt_number: 2, outcome: "RETRYABLE_FAILURE", safe_failure_code: "ADAPTER_UNAVAILABLE" },
      { attempt_number: 3, outcome: "RETRYABLE_FAILURE", safe_failure_code: "ADAPTER_UNAVAILABLE" },
      { attempt_number: 4, outcome: "PERMANENT_FAILURE", safe_failure_code: "ADAPTER_UNAVAILABLE" },
    ]);
    expect(await db.selectFrom("administrator_task_items")
      .select(["required_role", "kind", "correlation_reference", "safe_context"])
      .where("source_reference", "=", sourceReference)
      .orderBy("recipient_reference")
      .execute()).toEqual([
      { required_role: "PLATFORM_ADMINISTRATOR", kind: "NOTIFICATION_DELIVERY_RECONCILIATION", correlation_reference: "safe-correlation-36", safe_context: { channel: "EMAIL", messageId: "booking.created.student", recipientReference: expect.any(String) } },
      { required_role: "PLATFORM_ADMINISTRATOR", kind: "NOTIFICATION_DELIVERY_RECONCILIATION", correlation_reference: "safe-correlation-36", safe_context: { channel: "EMAIL", messageId: "booking.created.student", recipientReference: expect.any(String) } },
    ]);
  });

  it("exposes a localized User inbox with audited read state", async () => {
    const notification = await db.insertInto("in_app_notifications").values({
      recipient_user_id: studentId,
      message_id: "subscription.renewed.student",
      variables: JSON.stringify({ amount: 8, availableBalance: 13, nextAnniversaryAt: "2026-09-09T12:00:00Z" }),
      source_reference: `inbox:${randomUUID()}`,
    }).returning("id").executeTakeFirstOrThrow();

    const inbox = await graphql(`query { notifications { id messageId renderedContent readAt archivedAt } }`, undefined, studentSubject);
    expect(inbox).toMatchObject({ data: { notifications: expect.arrayContaining([{
      id: notification.id,
      messageId: "subscription.renewed.student",
      renderedContent: expect.stringMatching(/8.*13/),
      readAt: null,
      archivedAt: null,
    }]) } });

    const mutationCorrelation = "notification-read-correlation";
    expect(await graphql(`mutation Read($id: ID!) { markNotificationRead(id: $id) { id readAt } }`, { id: notification.id }, studentSubject, mutationCorrelation)).toMatchObject({
      data: { markNotificationRead: { id: notification.id, readAt: expect.any(String) } },
    });
    expect(await db.selectFrom("audit_entries").select(["operation", "outcome", "reason_code"])
      .where("correlation_id", "=", mutationCorrelation).executeTakeFirstOrThrow()).toEqual({
      operation: "notification.mark-read",
      outcome: "SUCCEEDED",
      reason_code: "NOTIFICATION_MARKED_READ",
    });
  });

  it("keeps in-app redelivery blocked after the visible message expires", async () => {
    const sourceReference = `booking.cancelled.student:${randomUUID()}`;
    const values = {
      recipient_user_id: studentId,
      message_id: "booking.cancelled.student",
      variables: JSON.stringify({ classSessionId: randomUUID(), classCreditOutcome: "REFUNDED" }),
      source_reference: sourceReference,
    };
    await db.insertInto("in_app_notifications").values(values).execute();
    await db.deleteFrom("in_app_notifications").where("source_reference", "=", sourceReference).execute();
    expect(await db.insertInto("in_app_notifications").values(values).returning("id").execute()).toEqual([]);
    expect(await db.selectFrom("delivery_receipts").select("outcome")
      .where("source_reference", "=", sourceReference).where("channel", "=", "IN_APP").execute()).toEqual([{ outcome: "DELIVERED" }]);
  });

  it("expires visible and detailed records without removing permanent receipts", async () => {
    const sourceReference = `subscription.cancellation-scheduled.student:${randomUUID()}`;
    const visible = await db.insertInto("in_app_notifications").values({
      recipient_user_id: studentId,
      message_id: "subscription.cancellation-scheduled.student",
      variables: JSON.stringify({ effectiveAt: "2026-08-09T12:00:00Z" }),
      source_reference: sourceReference,
      created_at: new Date("2026-08-01T00:00:00Z"),
    }).returning("id").executeTakeFirstOrThrow();
    const intent = await db.insertInto("email_notification_intents").values({
      recipient_user_id: studentId,
      message_id: "subscription.cancellation-scheduled.student",
      locale: "en",
      variables: JSON.stringify({ effectiveAt: "2026-08-09T12:00:00Z" }),
      rendered_content: "Cancellation scheduled.",
      source_reference: `${sourceReference}:email`,
      state: "DELIVERED",
      completed_at: new Date("2026-08-01T00:00:00Z"),
      created_at: new Date("2026-08-01T00:00:00Z"),
    }).returning("id").executeTakeFirstOrThrow();
    await db.insertInto("delivery_receipts").values({ source_reference: `${sourceReference}:email`, recipient_user_id: studentId, channel: "EMAIL", outcome: "DELIVERED", completed_at: new Date("2026-08-01T00:00:00Z"), provider_message_id: null }).execute();
    await db.insertInto("notification_delivery_attempts").values({ notification_intent_id: intent.id, attempt_number: 1, outcome: "DELIVERED", safe_failure_code: null, attempted_at: new Date("2026-08-01T00:00:00Z") }).execute();

    const compacted = await compactTerminalNotifications(db, new Date("2026-11-10T00:00:00Z"), "retention-correlation-36");
    expect(compacted.inAppDeleted).toBeGreaterThanOrEqual(1);
    expect(compacted.emailIntentsDeleted).toBeGreaterThanOrEqual(1);
    expect(await db.selectFrom("in_app_notifications").select("id").where("id", "=", visible.id).execute()).toEqual([]);
    expect(await db.selectFrom("delivery_receipts").select("channel").where("source_reference", "in", [sourceReference, `${sourceReference}:email`]).orderBy("channel").execute()).toEqual([{ channel: "EMAIL" }, { channel: "IN_APP" }]);
    expect(await db.selectFrom("audit_entries").select(["system_identity", "reason_code"]).where("correlation_id", "=", "retention-correlation-36").executeTakeFirstOrThrow()).toEqual({ system_identity: "NOTIFICATION_MAINTENANCE_WORKER", reason_code: "TERMINAL_NOTIFICATION_RECORDS_COMPACTED" });
    expect(await db.selectFrom("email_notification_intents").select("id").where("state", "=", "EXHAUSTED").execute()).toHaveLength(2);
  });

  it("restricts actionable task work to Platform Administrators", async () => {
    const denied = await graphql(`query { administratorTasks { id } }`, undefined, studentSubject, "task-denied");
    expect(denied).toMatchObject({ errors: [{ extensions: { code: "FORBIDDEN" } }] });

    const allowed = await graphql(`query { administratorTasks { requiredRole kind correlationReference safeContext { channel messageId } } }`, undefined, administratorSubject);
    expect(allowed).toMatchObject({ data: { administratorTasks: expect.arrayContaining([{
      requiredRole: "PLATFORM_ADMINISTRATOR",
      kind: "NOTIFICATION_DELIVERY_RECONCILIATION",
      correlationReference: "safe-correlation-36",
      safeContext: { channel: "EMAIL", messageId: "booking.created.student" },
    }]) } });

    const task = await db.selectFrom("administrator_task_items").select("id").where("state", "=", "OPEN").orderBy("created_at").executeTakeFirstOrThrow();
    const input = { idempotencyKey: randomUUID(), taskId: task.id, reason: "Delivery reconciled safely." };
    const resolveMutation = `mutation Resolve($input: ResolveAdministratorTaskInput!) { resolveAdministratorTask(input: $input) { ... on ResolveAdministratorTaskSuccess { task { id state } } ... on AdministratorTaskError { code message } } }`;
    const resolved = await graphql(resolveMutation, { input }, administratorSubject, "task-resolved");
    expect(resolved).toEqual({ data: { resolveAdministratorTask: { task: { id: task.id, state: "RESOLVED" } } } });
    expect(await graphql(resolveMutation, { input }, administratorSubject, "task-resolved-replay")).toEqual(resolved);
    const resolvedTask = await db.selectFrom("administrator_task_items").select(["source_reference", "recipient_reference"]).where("id", "=", task.id).executeTakeFirstOrThrow();
    expect(await db.selectFrom("delivery_receipts").select("outcome").where("source_reference", "=", resolvedTask.source_reference).where("recipient_user_id", "=", resolvedTask.recipient_reference).where("channel", "=", "EMAIL").executeTakeFirstOrThrow()).toEqual({ outcome: "SUPPRESSED" });
  });

  async function graphql(query: string, variables: Record<string, unknown> | undefined, subject: string, correlationId: string = randomUUID()) {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", "x-demo-user-id": subject, "x-correlation-id": correlationId },
      body: JSON.stringify({ query, variables }),
    });
    return response.json() as Promise<{ data?: Record<string, unknown>; errors?: Array<{ extensions?: { code?: string } }> }>;
  }

  async function runNotificationWorker(adapter: ReturnType<typeof localRecordingEmailAdapter>, now: Date, correlationId: string) {
    const workerUtils = await makeWorkerUtils({ connectionString: databaseUrl });
    try {
      await workerUtils.migrate();
      await workerUtils.addJob("deliver_notification_intents", {});
      await runOnce({ connectionString: databaseUrl, concurrency: 1, taskList: notificationDeliveryTasks(db, adapter, { now: () => now, correlationId: () => correlationId }) });
    } finally {
      await workerUtils.release();
    }
  }
});
