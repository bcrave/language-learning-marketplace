import type { UserIdentity } from "@marketplace/core";

import type { Database } from "../database/database.js";

export type Administrator = { id: string; locale: "en" | "es" };

export async function administratorFor(
  db: Database,
  identity: UserIdentity,
): Promise<{ status: "OK"; administrator: Administrator } | { status: "UNKNOWN_USER" } | { status: "ROLE_REQUIRED"; userId: string }> {
  const user = await db.selectFrom("users")
    .select(["id", "interface_locale"])
    .where("identity_issuer", "=", identity.issuer)
    .where("identity_subject", "=", identity.subject)
    .executeTakeFirst();
  if (!user) return { status: "UNKNOWN_USER" };
  const role = await db.selectFrom("role_assignments").select("role")
    .where("user_id", "=", user.id)
    .where("role", "=", "PLATFORM_ADMINISTRATOR")
    .executeTakeFirst();
  if (!role) return { status: "ROLE_REQUIRED", userId: user.id };
  return { status: "OK", administrator: { id: user.id, locale: user.interface_locale ?? "en" } };
}
