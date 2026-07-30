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
  const studentSubject = randomUUID();
  const teacherSubject = randomUUID();
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
    await db
      .insertInto("role_assignments")
      .values([
        { user_id: studentId, role: "STUDENT" },
        { user_id: teacherId, role: "TEACHER" },
      ])
      .execute();
  }, 120_000);

  afterAll(async () => {
    await db.destroy();
    await postgres.stop();
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
