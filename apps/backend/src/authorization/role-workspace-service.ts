import type { UserIdentity, UserRole } from "@marketplace/core";

import type { Database } from "../database/database.js";
import type { WorkspacePlace } from "../database/types.js";
import {
  canRememberWorkspacePlace,
  verifyActingRole,
} from "./acting-role-policy.js";

export type RoleWorkspaceAccess =
  | { status: "UNKNOWN_USER" }
  | { status: "ROLE_ASSIGNMENT_REQUIRED" }
  | {
      status: "AUTHORIZED";
      rememberedPlaces: Array<{ place: WorkspacePlace; role: UserRole }>;
      roles: UserRole[];
      user: {
        displayName: string;
        displayTimeZone: string | null;
        id: string;
        interfaceLocale: "en" | "es" | null;
      };
    };

export async function loadRoleWorkspace(
  db: Database,
  identity: UserIdentity,
  actingRole: UserRole,
  correlationId: string,
): Promise<RoleWorkspaceAccess> {
  return db.transaction().execute(async (transaction) => {
    const user = await transaction
      .selectFrom("users")
      .select(["id", "display_name", "display_time_zone", "interface_locale"])
      .where("identity_issuer", "=", identity.issuer)
      .where("identity_subject", "=", identity.subject)
      .executeTakeFirst();
    if (!user) return { status: "UNKNOWN_USER" };

    const roleRows = await transaction
      .selectFrom("role_assignments")
      .select("role")
      .where("user_id", "=", user.id)
      .orderBy("role")
      .execute();
    const roles = roleRows.map(({ role }) => role);
    const verifiedContext = verifyActingRole(user.id, roles, actingRole);
    if (!verifiedContext) {
      await transaction
        .insertInto("audit_entries")
        .values({
          actor_user_id: user.id,
          acting_role: actingRole,
          operation: "role-workspace.opened",
          target_type: "User",
          target_id: user.id,
          outcome: "DENIED",
          reason_code: "ROLE_ASSIGNMENT_REQUIRED",
          correlation_id: correlationId,
        })
        .execute();
      return { status: "ROLE_ASSIGNMENT_REQUIRED" };
    }

    const rememberedPlaces = await transaction
      .selectFrom("role_workspace_places")
      .select(["role", "place"])
      .where("user_id", "=", verifiedContext.userId)
      .execute();
    return {
      status: "AUTHORIZED",
      rememberedPlaces,
      roles,
      user: {
        displayName: user.display_name,
        displayTimeZone: user.display_time_zone,
        id: user.id,
        interfaceLocale: user.interface_locale,
      },
    };
  });
}

export type RememberWorkspacePlaceResult =
  | "SUCCEEDED"
  | "UNKNOWN_USER"
  | "ROLE_ASSIGNMENT_REQUIRED"
  | "INCOMPATIBLE_WORKSPACE_PLACE";

export async function rememberRoleWorkspacePlace(
  db: Database,
  identity: UserIdentity,
  actingRole: UserRole,
  place: WorkspacePlace,
  correlationId: string,
): Promise<RememberWorkspacePlaceResult> {
  const user = await db
    .selectFrom("users")
    .select("id")
    .where("identity_issuer", "=", identity.issuer)
    .where("identity_subject", "=", identity.subject)
    .executeTakeFirst();
  if (!user) return "UNKNOWN_USER";
  const userId = user.id;

  const roleRows = await db
    .selectFrom("role_assignments")
    .select("role")
    .where("user_id", "=", userId)
    .execute();
  const verifiedContext = verifyActingRole(
    userId,
    roleRows.map(({ role }) => role),
    actingRole,
  );
  async function deny(
    reason: "ROLE_ASSIGNMENT_REQUIRED" | "INCOMPATIBLE_WORKSPACE_PLACE",
  ) {
    await db
      .insertInto("audit_entries")
      .values({
        actor_user_id: userId,
        acting_role: actingRole,
        operation: "role-workspace-place.remembered",
        target_type: "User",
        target_id: userId,
        outcome: "DENIED",
        reason_code: reason,
        correlation_id: correlationId,
      })
      .execute();
    return reason;
  }
  if (!verifiedContext) return deny("ROLE_ASSIGNMENT_REQUIRED");
  if (!canRememberWorkspacePlace(verifiedContext, place)) {
    return deny("INCOMPATIBLE_WORKSPACE_PLACE");
  }

  try {
    await db.transaction().execute(async (transaction) => {
      await transaction
        .insertInto("role_workspace_places")
        .values({ user_id: verifiedContext.userId, role: actingRole, place })
        .onConflict((conflict) =>
          conflict.columns(["user_id", "role"]).doUpdateSet({
            place,
            updated_at: new Date(),
          }),
        )
        .execute();
      await transaction
        .insertInto("audit_entries")
        .values({
          actor_user_id: verifiedContext.userId,
          acting_role: verifiedContext.actingRole,
          operation: "role-workspace-place.remembered",
          target_type: "User",
          target_id: verifiedContext.userId,
          outcome: "SUCCEEDED",
          reason_code: "WORKSPACE_PLACE_REMEMBERED",
          correlation_id: correlationId,
        })
        .execute();
    });
  } catch (error) {
    await db
      .insertInto("audit_entries")
      .values({
        actor_user_id: verifiedContext.userId,
        acting_role: verifiedContext.actingRole,
        operation: "role-workspace-place.remembered",
        target_type: "User",
        target_id: verifiedContext.userId,
        outcome: "FAILED",
        reason_code: "WORKSPACE_PLACE_REMEMBER_FAILED",
        correlation_id: correlationId,
      })
      .execute();
    throw error;
  }
  return "SUCCEEDED";
}
