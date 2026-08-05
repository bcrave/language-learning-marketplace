import type { UserIdentity } from "@marketplace/core";

import type { Database } from "../database/database.js";

export async function studentFor(
  db: Database,
  identity: UserIdentity,
  correlationId: string,
  operation: string,
  targetType = "ClassCreditAccount",
) {
  const user = await db.selectFrom("users")
    .select("id")
    .where("identity_issuer", "=", identity.issuer)
    .where("identity_subject", "=", identity.subject)
    .executeTakeFirst();
  if (!user) return { status: "UNKNOWN_USER" as const };
  const role = await db.selectFrom("role_assignments")
    .select("role")
    .where("user_id", "=", user.id)
    .where("role", "=", "STUDENT")
    .executeTakeFirst();
  if (!role) {
    await db.insertInto("audit_entries").values({
      actor_user_id: user.id,
      acting_role: "STUDENT",
      operation,
      target_type: targetType,
      target_id: user.id,
      outcome: "DENIED",
      reason_code: "STUDENT_ROLE_REQUIRED",
      correlation_id: correlationId,
    }).execute();
    return { status: "ROLE_REQUIRED" as const };
  }
  return { status: "SUCCEEDED" as const, student: { id: user.id } };
}
