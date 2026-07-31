import type { Generated } from "kysely";

import type { UserRole } from "@marketplace/core";

export interface UsersTable {
  id: string;
  identity_issuer: string;
  identity_subject: string;
  display_name: string;
  interface_locale: "en" | "es" | null;
  display_time_zone: string | null;
  created_at: Generated<Date>;
}

export interface RoleAssignmentsTable {
  user_id: string;
  role: UserRole;
  created_at: Generated<Date>;
}

export type WorkspacePlace =
  | "STUDENT_DISCOVERY"
  | "STUDENT_LEARNING"
  | "TEACHER_SCHEDULE"
  | "TEACHER_AVAILABILITY"
  | "ORGANIZATION_STUDENTS"
  | "ORGANIZATION_REPORTS"
  | "ADMINISTRATION_OPERATIONS"
  | "ADMINISTRATION_PEOPLE";

export interface RoleWorkspacePlacesTable {
  user_id: string;
  role: UserRole;
  place: WorkspacePlace;
  updated_at: Generated<Date>;
}

export interface AuditEntriesTable {
  id: Generated<string>;
  actor_user_id: string;
  acting_role: UserRole | null;
  operation: string;
  target_type: string;
  target_id: string;
  outcome: "SUCCEEDED" | "DENIED" | "FAILED";
  reason_code: string;
  correlation_id: string;
  occurred_at: Generated<Date>;
}

export interface SchemaMigrationsTable {
  name: string;
  applied_at: Generated<Date>;
}

export interface DatabaseSchema {
  users: UsersTable;
  role_assignments: RoleAssignmentsTable;
  role_workspace_places: RoleWorkspacePlacesTable;
  audit_entries: AuditEntriesTable;
  schema_migrations: SchemaMigrationsTable;
}
