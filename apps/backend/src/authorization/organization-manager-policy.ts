import type { UserIdentity } from "@marketplace/core";

import type { Database } from "../database/database.js";

export async function organizationManagerFor(
  db: Database,
  identity: UserIdentity,
  correlationId: string,
  operation: string,
  targetType = "SponsorshipInvitation",
) {
  const user = await db.selectFrom("users")
    .select(["id", "interface_locale"])
    .where("identity_issuer", "=", identity.issuer)
    .where("identity_subject", "=", identity.subject)
    .executeTakeFirst();
  if (!user) return { status: "UNKNOWN_USER" as const };
  const membership = await db.selectFrom("organization_managers")
    .select("organization_id")
    .where("user_id", "=", user.id)
    .executeTakeFirst();
  if (!membership) {
    await db.insertInto("audit_entries").values({
      actor_user_id: user.id,
      acting_role: "ORGANIZATION_MANAGER",
      operation,
      target_type: targetType,
      target_id: user.id,
      outcome: "DENIED",
      reason_code: "ORGANIZATION_MANAGER_ROLE_REQUIRED",
      correlation_id: correlationId,
    }).execute();
    return { status: "ROLE_REQUIRED" as const };
  }
  return {
    status: "SUCCEEDED" as const,
    organizationManager: {
      id: user.id,
      organizationId: membership.organization_id,
      locale: user.interface_locale ?? "en" as const,
    },
  };
}
