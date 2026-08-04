import type { UserRole } from "@marketplace/core";

import type { WorkspacePlace } from "../database/types.js";

const workspaceRolesByPlace: Record<WorkspacePlace, UserRole> = {
  STUDENT_DISCOVERY: "STUDENT",
  STUDENT_LEARNING: "STUDENT",
  TEACHER_SCHEDULE: "TEACHER",
  TEACHER_AVAILABILITY: "TEACHER",
  ORGANIZATION_STUDENTS: "ORGANIZATION_MANAGER",
  ORGANIZATION_REPORTS: "ORGANIZATION_MANAGER",
  ADMINISTRATION_OPERATIONS: "PLATFORM_ADMINISTRATOR",
  ADMINISTRATION_PEOPLE: "PLATFORM_ADMINISTRATOR",
};

const verifiedActingRole = Symbol("verifiedActingRole");

export interface VerifiedActingRoleContext {
  actingRole: UserRole;
  userId: string;
  [verifiedActingRole]: true;
}

export function verifyActingRole(
  userId: string,
  assignedRoles: readonly UserRole[],
  actingRole: UserRole,
): VerifiedActingRoleContext | null {
  return assignedRoles.includes(actingRole)
    ? { actingRole, userId, [verifiedActingRole]: true }
    : null;
}

export function canRememberWorkspacePlace(
  context: VerifiedActingRoleContext,
  place: WorkspacePlace,
) {
  return workspaceRolesByPlace[place] === context.actingRole;
}
