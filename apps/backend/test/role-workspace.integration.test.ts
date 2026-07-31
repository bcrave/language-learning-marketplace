import { randomUUID } from "node:crypto";

import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApi } from "../src/api/app.js";
import { createDatabase, type Database } from "../src/database/database.js";
import { migrateDatabase } from "../src/database/migrate.js";

describe("Role workspace GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  const userId = randomUUID();
  const subject = randomUUID();
  const limitedUserId = randomUUID();
  const limitedSubject = randomUUID();

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `role_workspace_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test" });
    await db
      .insertInto("users")
      .values([
        {
          id: userId,
          identity_issuer: "https://fake.local/",
          identity_subject: subject,
          display_name: "María Torres",
          interface_locale: "en",
          display_time_zone: "America/Denver",
        },
        {
          id: limitedUserId,
          identity_issuer: "https://fake.local/",
          identity_subject: limitedSubject,
          display_name: "Alex Morgan",
          interface_locale: "en",
          display_time_zone: "America/New_York",
        },
      ])
      .execute();
    await db
      .insertInto("role_assignments")
      .values([
        { user_id: userId, role: "STUDENT" },
        { user_id: userId, role: "TEACHER" },
        { user_id: userId, role: "ORGANIZATION_MANAGER" },
        { user_id: userId, role: "PLATFORM_ADMINISTRATOR" },
        { user_id: limitedUserId, role: "STUDENT" },
      ])
      .execute();
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("opens an explicitly selected assigned role with safe per-role landing places", async () => {
    const correlationId = `open-teacher-${userId}`;
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
        "x-demo-user-id": subject,
      },
      body: JSON.stringify({
        query: `
          query RoleWorkspace($actingRole: UserRole!) {
            roleWorkspace(actingRole: $actingRole) {
              actingRole
              relationshipScope
              user { id displayName interfaceLocale displayTimeZone }
              rolePlaces { role place }
            }
          }
        `,
        variables: { actingRole: "TEACHER" },
      }),
    });

    expect(await response.json()).toEqual({
      data: {
        roleWorkspace: {
          actingRole: "TEACHER",
          relationshipScope: "ASSIGNED_CLASS_SESSIONS",
          user: {
            id: userId,
            displayName: "María Torres",
            interfaceLocale: "EN",
            displayTimeZone: "America/Denver",
          },
          rolePlaces: [
            { role: "ORGANIZATION_MANAGER", place: "ORGANIZATION_STUDENTS" },
            {
              role: "PLATFORM_ADMINISTRATOR",
              place: "ADMINISTRATION_OPERATIONS",
            },
            { role: "STUDENT", place: "STUDENT_DISCOVERY" },
            { role: "TEACHER", place: "TEACHER_SCHEDULE" },
          ],
        },
      },
    });

    const auditEntry = await db
      .selectFrom("audit_entries")
      .select("id")
      .where("correlation_id", "=", correlationId)
      .executeTakeFirst();
    expect(auditEntry).toBeUndefined();
  });

  it("remembers the last compatible place for one role without changing another", async () => {
    const correlationId = `remember-teacher-${userId}`;
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
        "x-demo-user-id": subject,
      },
      body: JSON.stringify({
        query: `
          mutation RememberRoleWorkspacePlace($input: RememberRoleWorkspacePlaceInput!) {
            rememberRoleWorkspacePlace(input: $input) { role place }
          }
        `,
        variables: {
          input: {
            actingRole: "TEACHER",
            place: "TEACHER_AVAILABILITY",
          },
        },
      }),
    });

    expect(await response.json()).toEqual({
      data: {
        rememberRoleWorkspacePlace: {
          role: "TEACHER",
          place: "TEACHER_AVAILABILITY",
        },
      },
    });

    const reopened = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-demo-user-id": subject,
      },
      body: JSON.stringify({
        query: `{
          roleWorkspace(actingRole: STUDENT) {
            rolePlaces { role place }
          }
        }`,
      }),
    });
    expect(await reopened.json()).toEqual({
      data: {
        roleWorkspace: {
          rolePlaces: [
            { role: "ORGANIZATION_MANAGER", place: "ORGANIZATION_STUDENTS" },
            {
              role: "PLATFORM_ADMINISTRATOR",
              place: "ADMINISTRATION_OPERATIONS",
            },
            { role: "STUDENT", place: "STUDENT_DISCOVERY" },
            { role: "TEACHER", place: "TEACHER_AVAILABILITY" },
          ],
        },
      },
    });

    const auditEntry = await db
      .selectFrom("audit_entries")
      .select(["acting_role", "operation", "outcome", "reason_code"])
      .where("correlation_id", "=", correlationId)
      .executeTakeFirstOrThrow();
    expect(auditEntry).toEqual({
      acting_role: "TEACHER",
      operation: "role-workspace-place.remembered",
      outcome: "SUCCEEDED",
      reason_code: "WORKSPACE_PLACE_REMEMBERED",
    });
  });

  it("rejects an incompatible place without changing remembered navigation", async () => {
    const correlationId = `incompatible-place-${userId}`;
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
        "x-demo-user-id": subject,
      },
      body: JSON.stringify({
        query: `
          mutation {
            rememberRoleWorkspacePlace(
              input: { actingRole: STUDENT, place: TEACHER_AVAILABILITY }
            ) { role place }
          }
        `,
      }),
    });

    const result = (await response.json()) as {
      data: null;
      errors: Array<{ extensions: { code: string } }>;
    };
    expect(result.data).toBeNull();
    expect(result.errors[0]?.extensions.code).toBe("BAD_USER_INPUT");

    const auditEntry = await db
      .selectFrom("audit_entries")
      .select(["acting_role", "operation", "outcome", "reason_code"])
      .where("correlation_id", "=", correlationId)
      .executeTakeFirstOrThrow();
    expect(auditEntry).toEqual({
      acting_role: "STUDENT",
      operation: "role-workspace-place.remembered",
      outcome: "DENIED",
      reason_code: "INCOMPATIBLE_WORKSPACE_PLACE",
    });
  });

  it("denies an unassigned deep-link role and records the sensitive read", async () => {
    const correlationId = `unassigned-workspace-${limitedUserId}`;
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
        "x-demo-user-id": limitedSubject,
      },
      body: JSON.stringify({
        query: `{ roleWorkspace(actingRole: TEACHER) { actingRole } }`,
      }),
    });

    const result = (await response.json()) as {
      data: null;
      errors: Array<{ extensions: { code: string } }>;
    };
    expect(result.data).toBeNull();
    expect(result.errors[0]?.extensions.code).toBe("FORBIDDEN");

    const auditEntry = await db
      .selectFrom("audit_entries")
      .select(["acting_role", "operation", "outcome", "reason_code"])
      .where("correlation_id", "=", correlationId)
      .executeTakeFirstOrThrow();
    expect(auditEntry).toEqual({
      acting_role: "TEACHER",
      operation: "role-workspace.opened",
      outcome: "DENIED",
      reason_code: "ROLE_ASSIGNMENT_REQUIRED",
    });
  });
});
