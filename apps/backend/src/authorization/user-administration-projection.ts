import type { Database } from "../database/database.js";

export async function projectAdministrationUser(db: Database, userId: string) {
  const user = await db.selectFrom("users")
    .select(["id", "display_name", "access_status", "suspension_reason"])
    .where("id", "=", userId)
    .executeTakeFirstOrThrow();
  const [roles, history] = await Promise.all([
    db.selectFrom("role_assignments").select("role").where("user_id", "=", userId).orderBy("role").execute(),
    db.selectFrom("role_assignment_changes").select(["id", "role", "action", "reason", "changed_at"]).where("user_id", "=", userId).orderBy("changed_at", "desc").orderBy("id", "desc").execute(),
  ]);
  return {
    id: user.id,
    displayName: user.display_name,
    accessStatus: user.access_status,
    suspensionReason: user.suspension_reason,
    roles: roles.map(({ role }) => role),
    roleAssignmentHistory: history.map((change) => ({
      id: change.id,
      role: change.role,
      action: change.action,
      reason: change.reason,
      changedAt: change.changed_at.toISOString(),
    })),
  };
}
