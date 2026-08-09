import { randomUUID } from "node:crypto";

import { interfaceMessages } from "@marketplace/core";
import IntlMessageFormat from "intl-messageformat";
import { sql } from "kysely";

import { recordAdministrationAudit } from "../audit/administration-audit.js";
import type { Administrator } from "../authorization/administrator-policy.js";
import type { Database } from "../database/database.js";

type AdjustmentInput = {
  amount: number;
  reason: string;
  studentUserId: string;
};

export async function projectClassCreditAccount(
  db: Database,
  studentUserId: string,
  availableBalance?: number,
) {
  const account = availableBalance === undefined
    ? await db.selectFrom("class_credit_accounts")
      .select("available_balance")
      .where("student_user_id", "=", studentUserId)
      .executeTakeFirst()
    : { available_balance: availableBalance };
  const ledger = await db.selectFrom("class_credit_ledger_entries")
    .select(["id", "amount", "source", "source_reference", "reason", "created_at"])
    .where("student_user_id", "=", studentUserId)
    .orderBy("created_at", "desc")
    .orderBy("id", "desc")
    .execute();
  return {
    studentUserId,
    availableBalance: account?.available_balance ?? 0,
    ledger: ledger.map((entry) => ({
      id: entry.id,
      amount: entry.amount,
      source: entry.source,
      sourceReference: entry.source_reference,
      reason: entry.reason,
      createdAt: entry.created_at.toISOString(),
    })),
  };
}

export async function classCreditsForStudent(db: Database, studentUserId: string) {
  return projectClassCreditAccount(db, studentUserId);
}

export async function administrationClassCredits(db: Database, studentUserId: string) {
  const student = await db.selectFrom("users")
    .innerJoin("role_assignments", "role_assignments.user_id", "users.id")
    .select("users.id")
    .where("users.id", "=", studentUserId)
    .where("role_assignments.role", "=", "STUDENT")
    .executeTakeFirst();
  return student ? projectClassCreditAccount(db, studentUserId) : null;
}

export async function reconcileClassCreditAccounts(db: Database) {
  const accounts = await db.selectFrom("class_credit_accounts")
    .leftJoin("class_credit_ledger_entries", "class_credit_ledger_entries.student_user_id", "class_credit_accounts.student_user_id")
    .select([
      "class_credit_accounts.student_user_id",
      "class_credit_accounts.available_balance",
      sql<number>`coalesce(sum(class_credit_ledger_entries.amount), 0)::integer`.as("ledger_balance"),
    ])
    .groupBy(["class_credit_accounts.student_user_id", "class_credit_accounts.available_balance"])
    .execute();
  return accounts
    .filter((account) => account.available_balance !== account.ledger_balance)
    .map((account) => ({
      studentUserId: account.student_user_id,
      availableBalance: account.available_balance,
      ledgerBalance: account.ledger_balance,
    }));
}

async function denyAdjustment(
  db: Database,
  administrator: Administrator,
  input: AdjustmentInput,
  correlationId: string,
  code: "INVALID_ADJUSTMENT" | "INVALID_REASON" | "STUDENT_NOT_FOUND" | "INSUFFICIENT_CLASS_CREDITS",
  message: string,
) {
  await recordAdministrationAudit(db, {
    administratorId: administrator.id,
    correlationId,
    operation: "class-credit.adjusted",
    targetType: "ClassCreditAccount",
    targetId: input.studentUserId,
    outcome: "DENIED",
    reasonCode: code,
  });
  return { __typename: "ClassCreditAdjustmentError" as const, code, message };
}

export async function adjustClassCredits(
  transaction: Database,
  administrator: Administrator,
  input: AdjustmentInput,
  correlationId: string,
) {
  if (!Number.isInteger(input.amount) || input.amount === 0) {
    return denyAdjustment(transaction, administrator, input, correlationId, "INVALID_ADJUSTMENT", "Enter a non-zero whole number of Class Credits.");
  }
  const reason = input.reason.trim();
  if (reason.length < 3 || reason.length > 200 || reason !== input.reason) {
    return denyAdjustment(transaction, administrator, input, correlationId, "INVALID_REASON", "Enter a concise reason from 3 through 200 characters without surrounding spaces.");
  }
  const student = await transaction.selectFrom("users")
    .innerJoin("role_assignments", "role_assignments.user_id", "users.id")
    .select(["users.id", "users.interface_locale"])
    .where("users.id", "=", input.studentUserId)
    .where("role_assignments.role", "=", "STUDENT")
    .executeTakeFirst();
  if (!student) {
    return denyAdjustment(transaction, administrator, input, correlationId, "STUDENT_NOT_FOUND", "Choose a User with a Student Role Assignment.");
  }

  await transaction.insertInto("class_credit_accounts")
    .values({ student_user_id: input.studentUserId })
    .onConflict((conflict) => conflict.column("student_user_id").doNothing())
    .execute();
  const account = await transaction.selectFrom("class_credit_accounts")
    .select("available_balance")
    .where("student_user_id", "=", input.studentUserId)
    .forUpdate()
    .executeTakeFirstOrThrow();
  const availableBalance = account.available_balance + input.amount;
  if (availableBalance < 0) {
    return denyAdjustment(transaction, administrator, input, correlationId, "INSUFFICIENT_CLASS_CREDITS", "A decrease cannot exceed the available Class Credit balance.");
  }

  const adjustmentId = randomUUID();
  await transaction.insertInto("class_credit_ledger_entries").values({
    student_user_id: input.studentUserId,
    amount: input.amount,
    source: "CREDIT_ADJUSTMENT",
    source_reference: adjustmentId,
    reason,
  }).execute();
  await transaction.updateTable("class_credit_accounts")
    .set({ available_balance: availableBalance, updated_at: new Date() })
    .where("student_user_id", "=", input.studentUserId)
    .executeTakeFirstOrThrow();
  await recordAdministrationAudit(transaction, {
    administratorId: administrator.id,
    correlationId,
    operation: "class-credit.adjusted",
    targetType: "ClassCreditAccount",
    targetId: input.studentUserId,
    reasonCode: "CLASS_CREDIT_ADJUSTED",
  });

  const locale = student.interface_locale ?? "en";
  const messageId = "credit-adjustment.committed.student" as const;
  const variables = { amount: input.amount, availableBalance, reason };
  const renderedContent = String(new IntlMessageFormat(
    interfaceMessages[locale][messageId],
    locale,
  ).format(variables));
  await transaction.insertInto("in_app_notifications").values({
    recipient_user_id: input.studentUserId,
    message_id: messageId,
    variables: JSON.stringify(variables),
  }).execute();
  await transaction.insertInto("email_notification_intents").values({
    recipient_user_id: input.studentUserId,
    message_id: messageId,
    locale,
    variables: JSON.stringify(variables),
    rendered_content: renderedContent,
  }).execute();

  return {
    __typename: "AdjustClassCreditsSuccess" as const,
    account: await projectClassCreditAccount(transaction, input.studentUserId, availableBalance),
  };
}
