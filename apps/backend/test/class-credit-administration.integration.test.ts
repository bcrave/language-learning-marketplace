import { randomUUID } from "node:crypto";

import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fc from "fast-check";

import { createApi } from "../src/api/app.js";
import { reconcileClassCreditAccounts } from "../src/class-credit/class-credit-service.js";
import { createDatabase, type Database } from "../src/database/database.js";
import { migrateDatabase } from "../src/database/migrate.js";

describe("Class Credit administration GraphQL API", () => {
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
      `class_credits_${randomUUID().replaceAll("-", "")}`,
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

  it("makes a reasoned Credit Adjustment visible in the Student's Class Credit ledger", async () => {
    const correlationId = randomUUID();
    const adjustment = await graphql(`
      mutation Adjust($input: AdjustClassCreditsInput!) {
        adjustClassCredits(input: $input) {
          ... on AdjustClassCreditsSuccess {
            account { studentUserId availableBalance ledger { amount reason source sourceReference createdAt } }
          }
          ... on ClassCreditAdjustmentError { code message }
        }
      }
    `, {
      input: {
        idempotencyKey: randomUUID(),
        studentUserId: studentId,
        amount: 3,
        reason: "Welcome credit correction",
      },
    }, administratorSubject, correlationId);
    const studentLedger = await graphql(`
      query { studentClassCredits { studentUserId availableBalance ledger { amount reason source sourceReference createdAt } } }
    `, undefined, studentSubject);

    expect(adjustment).toMatchObject({
      data: {
        adjustClassCredits: {
          account: {
            studentUserId: studentId,
            availableBalance: 3,
            ledger: [{ amount: 3, reason: "Welcome credit correction", source: "CREDIT_ADJUSTMENT", sourceReference: expect.any(String), createdAt: expect.any(String) }],
          },
        },
      },
    });
    expect(studentLedger).toEqual(adjustment.data?.adjustClassCredits
      ? { data: { studentClassCredits: adjustment.data.adjustClassCredits.account } }
      : null);
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({
      outcome: "SUCCEEDED",
      reason_code: "CLASS_CREDIT_ADJUSTED",
    });
    expect(await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", studentId).execute()).toContainEqual({
      message_id: "credit-adjustment.committed.student",
    });
  });

  it("serializes concurrent decreases so the available balance cannot become negative", async () => {
    const concurrentStudent = await createStudent("Concurrent Student", "en");
    await adjust(concurrentStudent.id, 1, "Initial correction");

    const decreases = await Promise.all([
      adjust(concurrentStudent.id, -1, "First correction"),
      adjust(concurrentStudent.id, -1, "Second correction"),
    ]);
    const account = await graphql(`
      query Credits($studentUserId: ID!) {
        administrationClassCredits(studentUserId: $studentUserId) {
          availableBalance
          ledger { amount }
        }
      }
    `, { studentUserId: concurrentStudent.id });

    expect(decreases.filter((result) => JSON.stringify(result).includes("INSUFFICIENT_CLASS_CREDITS"))).toHaveLength(1);
    expect(decreases.filter((result) => JSON.stringify(result).includes('"availableBalance":0'))).toHaveLength(1);
    expect(account).toEqual({
      data: {
        administrationClassCredits: {
          availableBalance: 0,
          ledger: [{ amount: -1 }, { amount: 1 }],
        },
      },
    });
  });

  it("replays identical input without duplicating provenance or notifications and rejects changed input", async () => {
    const replayStudent = await createStudent("Replay Student", "es");
    const idempotencyKey = randomUUID();
    const first = await adjust(replayStudent.id, 2, "Saldo corregido", idempotencyKey);
    const replayCorrelationId = randomUUID();
    const replay = await adjust(replayStudent.id, 2, "Saldo corregido", idempotencyKey, replayCorrelationId);
    const changed = await adjust(replayStudent.id, 3, "Saldo corregido", idempotencyKey);

    expect(replay).toEqual(first);
    expect(changed).toEqual({ data: { adjustClassCredits: { conflictCode: "IDEMPOTENCY_KEY_REUSED" } } });
    expect(await db.selectFrom("class_credit_ledger_entries").select("id").where("student_user_id", "=", replayStudent.id).execute()).toHaveLength(1);
    expect(await db.selectFrom("in_app_notifications").select("id").where("recipient_user_id", "=", replayStudent.id).execute()).toHaveLength(1);
    expect(await db.selectFrom("email_notification_intents").select(["locale", "rendered_content"]).where("recipient_user_id", "=", replayStudent.id).executeTakeFirstOrThrow()).toMatchObject({
      locale: "es",
      rendered_content: expect.stringMatching(/\+2.*2.*Saldo corregido/),
    });
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", replayCorrelationId).executeTakeFirstOrThrow()).toEqual({
      outcome: "SUCCEEDED",
      reason_code: "IDEMPOTENT_REPLAY_SUCCEEDED",
    });
  });

  it("rejects invalid adjustments and audits denied administration access", async () => {
    const target = await createStudent("Protected Student", "en");
    const deniedReplayKey = randomUUID();
    const invalidReason = await adjust(target.id, 2, " no surrounding spaces ", deniedReplayKey);
    const deniedReplayCorrelationId = randomUUID();
    const invalidReasonReplay = await adjust(target.id, 2, " no surrounding spaces ", deniedReplayKey, deniedReplayCorrelationId);
    const tooLargeDecrease = await adjust(target.id, -1, "Balance correction");
    const deniedCorrelationId = randomUUID();
    const deniedRead = await graphql(`
      query Credits($studentUserId: ID!) {
        administrationClassCredits(studentUserId: $studentUserId) { availableBalance }
      }
    `, { studentUserId: target.id }, studentSubject, deniedCorrelationId);
    const deniedMutationCorrelationId = randomUUID();
    const deniedMutation = await graphql(`
      mutation Adjust($input: AdjustClassCreditsInput!) {
        adjustClassCredits(input: $input) {
          ... on AdjustClassCreditsSuccess { account { availableBalance } }
          ... on ClassCreditAdjustmentError { code }
          ... on CurriculumConflict { conflictCode: code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), studentUserId: target.id, amount: 1, reason: "Unauthorized correction" } }, studentSubject, deniedMutationCorrelationId);

    expect(invalidReason).toEqual({ data: { adjustClassCredits: { code: "INVALID_REASON" } } });
    expect(invalidReasonReplay).toEqual(invalidReason);
    expect(tooLargeDecrease).toEqual({ data: { adjustClassCredits: { code: "INSUFFICIENT_CLASS_CREDITS" } } });
    expect(deniedRead.data).toEqual({ administrationClassCredits: null });
    expect(deniedRead.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
    expect(deniedMutation.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
    expect(await db.selectFrom("audit_entries").select(["actor_user_id", "outcome", "reason_code"]).where("correlation_id", "=", deniedCorrelationId).executeTakeFirstOrThrow()).toEqual({
      actor_user_id: studentId,
      outcome: "DENIED",
      reason_code: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED",
    });
    expect(await db.selectFrom("audit_entries").select(["actor_user_id", "outcome", "reason_code"]).where("correlation_id", "=", deniedMutationCorrelationId).executeTakeFirstOrThrow()).toEqual({
      actor_user_id: studentId,
      outcome: "DENIED",
      reason_code: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED",
    });
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", deniedReplayCorrelationId).executeTakeFirstOrThrow()).toEqual({
      outcome: "DENIED",
      reason_code: "IDEMPOTENT_REPLAY_DENIED",
    });
  });

  it("keeps Class Credit provenance append-only", async () => {
    const appendOnlyStudent = await createStudent("Append Only Student", "en");
    await adjust(appendOnlyStudent.id, 1, "Ledger correction");
    const entry = await db.selectFrom("class_credit_ledger_entries").select("id").where("student_user_id", "=", appendOnlyStudent.id).executeTakeFirstOrThrow();

    await expect(db.updateTable("class_credit_ledger_entries").set({ amount: 99 }).where("id", "=", entry.id).execute()).rejects.toThrow("append-only");
    await expect(db.deleteFrom("class_credit_ledger_entries").where("id", "=", entry.id).execute()).rejects.toThrow("append-only");
  });

  it("detects a Class Credit account that no longer reconciles with its ledger", async () => {
    const driftedStudent = await createStudent("Drifted Student", "en");
    await adjust(driftedStudent.id, 4, "Ledger correction");
    await db.updateTable("class_credit_accounts").set({ available_balance: 5 }).where("student_user_id", "=", driftedStudent.id).execute();

    expect(await reconcileClassCreditAccounts(db)).toContainEqual({
      studentUserId: driftedStudent.id,
      availableBalance: 5,
      ledgerBalance: 4,
    });
  });

  it("preserves non-negative balances and idempotent outcomes for generated adjustment sequences", async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(fc.integer({ min: -5, max: 5 }).filter((amount) => amount !== 0), { minLength: 1, maxLength: 10 }),
      async (amounts) => {
        const generatedStudent = await createStudent("Generated Student", "en");
        let expectedBalance = 0;
        for (const [index, amount] of amounts.entries()) {
          const key = randomUUID();
          const first = await adjust(generatedStudent.id, amount, `Generated adjustment ${index}`, key);
          const replay = await adjust(generatedStudent.id, amount, `Generated adjustment ${index}`, key);
          expect(replay).toEqual(first);
          if (expectedBalance + amount >= 0) expectedBalance += amount;
        }
        const account = await db.selectFrom("class_credit_accounts").select("available_balance").where("student_user_id", "=", generatedStudent.id).executeTakeFirst();
        const ledger = await db.selectFrom("class_credit_ledger_entries").select("amount").where("student_user_id", "=", generatedStudent.id).execute();
        expect(account?.available_balance ?? 0).toBe(expectedBalance);
        expect(ledger.reduce((sum, entry) => sum + entry.amount, 0)).toBe(expectedBalance);
        expect(expectedBalance).toBeGreaterThanOrEqual(0);
      },
    ), { numRuns: 20 });
  });

  async function createStudent(displayName: string, locale: "en" | "es") {
    const id = randomUUID();
    const subject = randomUUID();
    await db.insertInto("users").values({
      id,
      identity_issuer: "https://fake.local/",
      identity_subject: subject,
      display_name: displayName,
      interface_locale: locale,
      display_time_zone: "America/Denver",
    }).execute();
    await db.insertInto("role_assignments").values({ user_id: id, role: "STUDENT" }).execute();
    return { id, subject };
  }

  async function adjust(
    studentUserId: string,
    amount: number,
    reason: string,
    idempotencyKey = randomUUID(),
    correlationId = randomUUID(),
  ) {
    return graphql(`
      mutation Adjust($input: AdjustClassCreditsInput!) {
        adjustClassCredits(input: $input) {
          ... on AdjustClassCreditsSuccess { account { availableBalance } }
          ... on ClassCreditAdjustmentError { code }
          ... on CurriculumConflict { conflictCode: code }
        }
      }
    `, { input: { idempotencyKey, studentUserId, amount, reason } }, administratorSubject, correlationId);
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
      data?: Record<string, unknown> & {
        adjustClassCredits?: {
          account?: unknown;
          code?: string;
          conflictCode?: string;
        };
      };
      errors?: Array<{ extensions: { code: string } }>;
    };
  }
});
