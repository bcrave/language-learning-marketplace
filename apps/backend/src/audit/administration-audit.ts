import type { Database } from "../database/database.js";

export async function recordAdministrationAudit(db: Database, values: {
  administratorId: string;
  correlationId: string;
  operation: string;
  targetType: string;
  targetId: string;
  outcome?: "SUCCEEDED" | "DENIED" | "FAILED";
  reasonCode: string;
}) {
  const targetId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(values.targetId)
    ? values.targetId
    : values.administratorId;
  await db.insertInto("audit_entries").values({
    actor_user_id: values.administratorId,
    acting_role: "PLATFORM_ADMINISTRATOR",
    operation: values.operation,
    target_type: values.targetType,
    target_id: targetId,
    outcome: values.outcome ?? "SUCCEEDED",
    reason_code: values.reasonCode,
    correlation_id: values.correlationId,
  }).execute();
}
