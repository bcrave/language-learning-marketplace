import type { Database } from "../database/database.js";

/** The two acting roles that reach a marketplace reporting or inspection surface. */
export type ReportingActingRole = "ORGANIZATION_MANAGER" | "PLATFORM_ADMINISTRATOR";

export type ReportingAuthority = {
  id: string;
  actingRole: ReportingActingRole;
  organizationId: string | null;
  locale: "en" | "es";
};

/**
 * The reporting authority one User holds now, read from their current Role
 * Assignments rather than from anything the request carried. Every surface both
 * reporting roles share — Report Exports and the Audit Log — resolves it here, so a
 * removed Role Assignment or a moved Organization Manager stops all of them at once
 * rather than one of them.
 *
 * Marketplace-wide authority is decided first: a User who is both an administrator
 * and an Organization Manager acts as an administrator, and never silently narrows
 * to one Organization's scope.
 */
export async function reportingAuthorityFor(db: Database, userId: string): Promise<ReportingAuthority | null> {
  const user = await db.selectFrom("users")
    .select(["id", "interface_locale"])
    .where("id", "=", userId)
    .executeTakeFirst();
  if (!user) return null;
  const locale = user.interface_locale ?? "en";

  const administrator = await db.selectFrom("role_assignments")
    .select("role")
    .where("user_id", "=", userId)
    .where("role", "=", "PLATFORM_ADMINISTRATOR")
    .executeTakeFirst();
  if (administrator) {
    return { id: userId, actingRole: "PLATFORM_ADMINISTRATOR", organizationId: null, locale };
  }

  // An Organization Manager belongs to exactly one Organization, which the
  // `organization_managers` primary key enforces.
  const membership = await db.selectFrom("organization_managers")
    .innerJoin("role_assignments", (join) => join
      .onRef("role_assignments.user_id", "=", "organization_managers.user_id")
      .on("role_assignments.role", "=", "ORGANIZATION_MANAGER"))
    .select("organization_managers.organization_id")
    .where("organization_managers.user_id", "=", userId)
    .executeTakeFirst();
  if (!membership) return null;
  return {
    id: userId,
    actingRole: "ORGANIZATION_MANAGER",
    organizationId: membership.organization_id,
    locale,
  };
}
