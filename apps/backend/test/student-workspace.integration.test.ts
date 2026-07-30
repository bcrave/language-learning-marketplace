import { randomUUID } from "node:crypto";

import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { sql } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApi } from "../src/api/app.js";
import { createDatabase, type Database } from "../src/database/database.js";
import { migrateDatabase } from "../src/database/migrate.js";

describe("Student workspace GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  const studentId = randomUUID();
  const teacherId = randomUUID();
  const firstUseStudentId = randomUUID();
  const studentSubject = randomUUID();
  const teacherSubject = randomUUID();
  const firstUseStudentSubject = randomUUID();
  const workspaceCorrelationId = `workspace-${studentId}`;
  const deniedCorrelationId = `denied-${teacherId}`;

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `workspace_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test" });
    await db
      .insertInto("users")
      .values([
        {
          id: studentId,
          identity_issuer: "https://fake.local/",
          identity_subject: studentSubject,
          display_name: "Sofía Rivera",
          interface_locale: "es",
          display_time_zone: "America/Denver",
        },
        {
          id: teacherId,
          identity_issuer: "https://fake.local/",
          identity_subject: teacherSubject,
          display_name: "Mateo Santos",
          interface_locale: "en",
          display_time_zone: "America/New_York",
        },
      ])
      .execute();
    await sql`
      insert into users (
        id,
        identity_issuer,
        identity_subject,
        display_name,
        interface_locale,
        display_time_zone
      ) values (
        ${firstUseStudentId},
        'https://fake.local/',
        ${firstUseStudentSubject},
        'Jordan Lee',
        null,
        null
      )
    `.execute(db);
    await db
      .insertInto("role_assignments")
      .values([
        { user_id: studentId, role: "STUDENT" },
        { user_id: firstUseStudentId, role: "STUDENT" },
        { user_id: teacherId, role: "TEACHER" },
      ])
      .execute();
  }, 120_000);

  afterAll(async () => {
    await db.destroy();
    await postgres.stop();
  });

  it("leaves first-use browser suggestions unsaved until the Student consents", async () => {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-demo-user-id": firstUseStudentSubject,
      },
      body: JSON.stringify({
        query: `{ studentWorkspace { user { interfaceLocale displayTimeZone } } }`,
      }),
    });

    expect(await response.json()).toEqual({
      data: {
        studentWorkspace: {
          user: {
            interfaceLocale: null,
            displayTimeZone: null,
          },
        },
      },
    });
  });

  it("persists User preferences only as an all-or-none pair", async () => {
    await expect(
      db
        .insertInto("users")
        .values({
          id: randomUUID(),
          identity_issuer: "https://fake.local/",
          identity_subject: randomUUID(),
          display_name: "Partial Preference",
          interface_locale: null,
          display_time_zone: "America/Denver",
        })
        .execute(),
    ).rejects.toThrow(/users_preferences_all_or_none/);
  });

  it("saves User-wide preferences and records a privacy-safe Audit Entry", async () => {
    const correlationId = `preferences-${firstUseStudentId}`;
    const mutation = `
      mutation SaveUserPreferences($input: SaveUserPreferencesInput!) {
        saveUserPreferences(input: $input) {
          user { id interfaceLocale displayTimeZone }
        }
      }
    `;
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
        "x-demo-user-id": firstUseStudentSubject,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            actingRole: "STUDENT",
            interfaceLocale: "ES",
            displayTimeZone: "America/Los_Angeles",
          },
        },
      }),
    });

    expect(await response.json()).toEqual({
      data: {
        saveUserPreferences: {
          user: {
            id: firstUseStudentId,
            interfaceLocale: "ES",
            displayTimeZone: "America/Los_Angeles",
          },
        },
      },
    });

    const signedInAgain = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-demo-user-id": firstUseStudentSubject,
      },
      body: JSON.stringify({
        query: `{ studentWorkspace { user { interfaceLocale displayTimeZone } } }`,
      }),
    });
    expect(await signedInAgain.json()).toEqual({
      data: {
        studentWorkspace: {
          user: {
            interfaceLocale: "ES",
            displayTimeZone: "America/Los_Angeles",
          },
        },
      },
    });

    const auditEntry = await db
      .selectFrom("audit_entries")
      .select([
        "actor_user_id",
        "acting_role",
        "operation",
        "target_type",
        "target_id",
        "outcome",
        "reason_code",
        "correlation_id",
      ])
      .where("correlation_id", "=", correlationId)
      .executeTakeFirstOrThrow();
    expect(auditEntry).toEqual({
      actor_user_id: firstUseStudentId,
      acting_role: "STUDENT",
      operation: "user-preferences.saved",
      target_type: "User",
      target_id: firstUseStudentId,
      outcome: "SUCCEEDED",
      reason_code: "USER_PREFERENCES_SAVED",
      correlation_id: correlationId,
    });
  });

  it("rejects a Display Time Zone that is not a named regional zone", async () => {
    const correlationId = `invalid-preferences-${studentId}`;
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
        "x-demo-user-id": studentSubject,
      },
      body: JSON.stringify({
        query: `
          mutation {
            saveUserPreferences(
              input: {
                actingRole: STUDENT,
                interfaceLocale: EN,
                displayTimeZone: "+02:00"
              }
            ) { user { id } }
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
      .select(["actor_user_id", "outcome", "reason_code"])
      .where("correlation_id", "=", correlationId)
      .executeTakeFirstOrThrow();
    expect(auditEntry).toEqual({
      actor_user_id: studentId,
      outcome: "DENIED",
      reason_code: "INVALID_DISPLAY_TIME_ZONE",
    });
  });

  it("denies an unassigned acting role without changing preferences", async () => {
    const correlationId = `unassigned-role-${studentId}`;
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
        "x-demo-user-id": studentSubject,
      },
      body: JSON.stringify({
        query: `
          mutation {
            saveUserPreferences(
              input: {
                actingRole: TEACHER,
                interfaceLocale: EN,
                displayTimeZone: "Europe/Madrid"
              }
            ) { user { id } }
          }
        `,
      }),
    });

    const result = (await response.json()) as {
      data: null;
      errors: Array<{ extensions: { code: string } }>;
    };
    expect(result.data).toBeNull();
    expect(result.errors[0]?.extensions.code).toBe("FORBIDDEN");

    const user = await db
      .selectFrom("users")
      .select(["interface_locale", "display_time_zone"])
      .where("id", "=", studentId)
      .executeTakeFirstOrThrow();
    expect(user).toEqual({
      interface_locale: "es",
      display_time_zone: "America/Denver",
    });

    const auditEntry = await db
      .selectFrom("audit_entries")
      .select(["actor_user_id", "acting_role", "outcome", "reason_code"])
      .where("correlation_id", "=", correlationId)
      .executeTakeFirstOrThrow();
    expect(auditEntry).toEqual({
      actor_user_id: studentId,
      acting_role: "TEACHER",
      outcome: "DENIED",
      reason_code: "ROLE_ASSIGNMENT_REQUIRED",
    });
  });

  it("records a failed preference mutation after its transaction rolls back", async () => {
    const correlationId = `failed-preferences-${studentId}`;
    await sql`
      create function fail_user_preference_update()
      returns trigger language plpgsql as $$
      begin
        raise exception 'simulated preference persistence failure';
      end;
      $$;
      create trigger fail_user_preference_update
      before update on users
      for each row execute function fail_user_preference_update()
    `.execute(db);

    try {
      const response = await api.fetch("http://localhost/graphql", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-correlation-id": correlationId,
          "x-demo-user-id": studentSubject,
        },
        body: JSON.stringify({
          query: `
            mutation {
              saveUserPreferences(
                input: {
                  actingRole: STUDENT,
                  interfaceLocale: EN,
                  displayTimeZone: "Europe/Madrid"
                }
              ) { user { id } }
            }
          `,
        }),
      });
      const result = (await response.json()) as {
        data: null;
        errors: Array<{ extensions: { code: string } }>;
      };
      expect(result.data).toBeNull();
      expect(result.errors[0]?.extensions.code).toBe("INTERNAL_SERVER_ERROR");
    } finally {
      await sql`
        drop trigger fail_user_preference_update on users;
        drop function fail_user_preference_update()
      `.execute(db);
    }

    const auditEntry = await db
      .selectFrom("audit_entries")
      .select(["actor_user_id", "acting_role", "outcome", "reason_code"])
      .where("correlation_id", "=", correlationId)
      .executeTakeFirstOrThrow();
    expect(auditEntry).toEqual({
      actor_user_id: studentId,
      acting_role: "STUDENT",
      outcome: "FAILED",
      reason_code: "USER_PREFERENCES_SAVE_FAILED",
    });
  });

  it("returns the persisted Student and records a privacy-safe Audit Entry", async () => {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": workspaceCorrelationId,
        "x-demo-user-id": studentSubject,
      },
      body: JSON.stringify({
        query: `query StudentWorkspace { studentWorkspace { user { id displayName interfaceLocale displayTimeZone } roles } }`,
      }),
    });

    expect(await response.json()).toEqual({
      data: {
        studentWorkspace: {
          user: {
            id: studentId,
            displayName: "Sofía Rivera",
            interfaceLocale: "ES",
            displayTimeZone: "America/Denver",
          },
          roles: ["STUDENT"],
        },
      },
    });

    const auditEntry = await db
      .selectFrom("audit_entries")
      .select([
        "actor_user_id",
        "acting_role",
        "operation",
        "target_type",
        "target_id",
        "outcome",
        "reason_code",
        "correlation_id",
      ])
      .where("correlation_id", "=", workspaceCorrelationId)
      .executeTakeFirstOrThrow();
    expect(auditEntry).toEqual({
      actor_user_id: studentId,
      acting_role: "STUDENT",
      operation: "student-workspace.opened",
      target_type: "User",
      target_id: studentId,
      outcome: "SUCCEEDED",
      reason_code: "WORKSPACE_OPENED",
      correlation_id: workspaceCorrelationId,
    });

    const columns = await sql<{ column_name: string }>`
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = 'audit_entries'
    `.execute(db);
    expect(columns.rows.map(({ column_name }) => column_name)).not.toContain(
      "display_name",
    );
    const partitionedAuditTable = await sql<{ partitioned: number }>`
      select 1 as partitioned
      from pg_partitioned_table
      where partrelid = 'audit_entries'::regclass
    `.execute(db);
    expect(partitionedAuditTable.rows).toEqual([{ partitioned: 1 }]);
  });

  it("denies a User without the Student Role Assignment and records the denial", async () => {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": deniedCorrelationId,
        "x-demo-user-id": teacherSubject,
      },
      body: JSON.stringify({ query: `{ studentWorkspace { user { id } } }` }),
    });

    const result = (await response.json()) as {
      data: null;
      errors: Array<{ extensions: { code: string } }>;
    };
    expect(result.data).toBeNull();
    expect(result.errors[0]?.extensions.code).toBe("FORBIDDEN");

    const auditEntry = await db
      .selectFrom("audit_entries")
      .select(["actor_user_id", "outcome", "reason_code"])
      .where("correlation_id", "=", deniedCorrelationId)
      .executeTakeFirstOrThrow();
    expect(auditEntry).toEqual({
      actor_user_id: teacherId,
      outcome: "DENIED",
      reason_code: "STUDENT_ROLE_REQUIRED",
    });
  });

  it("rejects an unmapped identity without turning it into an internal failure", async () => {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-demo-user-id": randomUUID(),
      },
      body: JSON.stringify({ query: `{ studentWorkspace { user { id } } }` }),
    });

    const result = (await response.json()) as {
      data: null;
      errors: Array<{ extensions: { code: string } }>;
    };
    expect(result.data).toBeNull();
    expect(result.errors[0]?.extensions.code).toBe("UNAUTHENTICATED");
  });
});
