import { randomUUID } from "node:crypto";

import type { TaskList } from "graphile-worker";

import type { IdentityAdministration } from "../auth/identity-administration.js";
import type { Database } from "../database/database.js";

async function recordWorkerAudit(db: Database, values: { targetId: string; targetType?: "User" | "AdministratorTaskItem"; outcome: "SUCCEEDED" | "FAILED"; reasonCode: string; correlationId: string }) {
  await db.insertInto("audit_entries").values({
    actor_user_id: null,
    system_identity: "USER_ANONYMIZATION_WORKER",
    acting_role: null,
    operation: "user.identity-deletion-processed",
    target_type: values.targetType ?? "User",
    target_id: values.targetId,
    outcome: values.outcome,
    reason_code: values.reasonCode,
    correlation_id: values.correlationId,
  }).execute();
}

export async function processPendingUserAnonymizations(db: Database, identityAdministration: IdentityAdministration, now: Date, correlationId: string) {
  const pending = await db.selectFrom("user_anonymization_requests")
    .select(["user_id", "identity_issuer", "identity_subject", "requested_by_user_id"])
    .where("state", "=", "PENDING")
    .orderBy("requested_at")
    .execute();
  let completedCount = 0;
  for (const request of pending) {
    try {
      await identityAdministration.deleteIdentity({ issuer: request.identity_issuer!, subject: request.identity_subject! });
    } catch {
      await recordWorkerFailure(db, request.user_id, request.requested_by_user_id, "IDENTITY_DELETION_FAILED", correlationId);
      continue;
    }

    try {
      const completed = await db.transaction().execute(async (transaction) => {
        const claimed = await transaction.selectFrom("user_anonymization_requests").select("state").where("user_id", "=", request.user_id).where("state", "=", "PENDING").forUpdate().skipLocked().executeTakeFirst();
        if (!claimed) return false;
        await transaction.updateTable("user_anonymization_requests").set(({ eb }) => ({ state: "COMPLETED", identity_issuer: null, identity_subject: null, attempt_count: eb("attempt_count", "+", 1), completed_at: now })).where("user_id", "=", request.user_id).execute();
        await transaction.updateTable("users").set({ access_status: "ANONYMIZED", identity_issuer: null, identity_subject: null }).where("id", "=", request.user_id).where("access_status", "=", "ANONYMIZATION_PENDING").executeTakeFirstOrThrow();
        await recordWorkerAudit(transaction as Database, { targetId: request.user_id, outcome: "SUCCEEDED", reasonCode: "USER_ANONYMIZED", correlationId });
        const recoveredTask = await transaction.updateTable("administrator_task_items").set({ state: "RESOLVED", resolved_at: now, resolution_reason: "Automatically recovered by the User Anonymization worker." }).where("source_reference", "=", `user-anonymization.reconciliation:${request.user_id}`).where("recipient_reference", "=", request.requested_by_user_id).where("state", "=", "OPEN").returning("id").executeTakeFirst();
        if (recoveredTask) await recordWorkerAudit(transaction as Database, { targetId: recoveredTask.id, targetType: "AdministratorTaskItem", outcome: "SUCCEEDED", reasonCode: "ANONYMIZATION_RECONCILIATION_RECOVERED", correlationId });
        await transaction.insertInto("in_app_notifications").values({ recipient_user_id: request.requested_by_user_id, message_id: "user-anonymization.completed.administrator", variables: JSON.stringify({ userId: request.user_id }), source_reference: `user-anonymization.completed:${request.user_id}` }).execute();
        return true;
      });
      if (completed) completedCount += 1;
    } catch {
      await recordWorkerFailure(db, request.user_id, request.requested_by_user_id, "ANONYMIZATION_FINALIZATION_FAILED", correlationId);
    }
  }
  return completedCount;
}

async function recordWorkerFailure(db: Database, targetId: string, requestedByUserId: string, reasonCode: string, correlationId: string) {
  await db.transaction().execute(async (transaction) => {
    const request = await transaction.updateTable("user_anonymization_requests").set(({ eb }) => ({ attempt_count: eb("attempt_count", "+", 1) })).where("user_id", "=", targetId).where("state", "=", "PENDING").returning("attempt_count").executeTakeFirst();
    if (!request) return;
    await recordWorkerAudit(transaction as Database, { targetId, outcome: "FAILED", reasonCode, correlationId });
    if (request.attempt_count < 4) return;
    await transaction.insertInto("administrator_task_items").values({ kind: "USER_ANONYMIZATION_RECONCILIATION", correlation_reference: correlationId, safe_context: JSON.stringify({ anonymizedUserId: targetId, failureCode: reasonCode }), source_reference: `user-anonymization.reconciliation:${targetId}`, recipient_reference: requestedByUserId }).onConflict((conflict) => conflict.columns(["source_reference", "recipient_reference"]).doNothing()).execute();
  });
}

export function userAnonymizationTasks(db: Database, identityAdministration: IdentityAdministration, options: { now?: () => Date; correlationId?: () => string } = {}): TaskList {
  return {
    anonymize_users: async () => {
      await processPendingUserAnonymizations(db, identityAdministration, options.now?.() ?? new Date(), options.correlationId?.() ?? `user-anonymization-${randomUUID()}`);
    },
  };
}
