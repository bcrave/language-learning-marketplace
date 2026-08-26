import { randomUUID } from "node:crypto";

import {
  AUDIT_LOG_EXPORT_COLUMNS,
  AUDIT_LOG_EXPORT_MAXIMUM_ROW_COUNT,
  AUDIT_LOG_PAGE_SIZE,
} from "@marketplace/core";
import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { sql } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApi } from "../src/api/app.js";
import { maintainAuditPartitions } from "../src/audit/audit-retention-worker.js";
import { createDatabase, type Database } from "../src/database/database.js";
import { migrateDatabase } from "../src/database/migrate.js";

const READ_INSTANT = new Date("2026-08-26T18:00:00.000Z");
const BUSY_LOCAL_DATE = "2026-08-22";
const FLOOD_LOCAL_DATE = "2026-08-24";

// A Student-visible Credit Adjustment reason. It belongs to the Class Credit ledger,
// never to an Audit Entry, so every Audit Log surface is checked against this text.
const ADJUSTMENT_REASON = "Goodwill credit after a support conversation.";

const AUDIT_ENTRY_FIELDS = `
  id occurredAt actorUserId systemIdentity actingRole
  operation targetType targetId outcome reasonCode correlationId
`;

const AUDIT_LOG_QUERY = `
  query AuditLog($filter: AuditLogFilterInput) {
    auditLog(filter: $filter) {
      __typename
      ... on AuditLog {
        scope
        appliedFilter { fromLocalDate toLocalDate timeZone outcome actingRole operation actorUserId correlationId }
        entries { ${AUDIT_ENTRY_FIELDS} }
        pageInfo { endCursor hasNextPage }
      }
      ... on AuditLogError { code message }
    }
  }
`;

const AUDIT_LOG_EXPORT_QUERY = `
  query AuditLogExport($filter: AuditLogFilterInput) {
    auditLogExport(filter: $filter) {
      __typename
      ... on AuditLogExport {
        scope
        schemaVersion
        exportedAt
        rowCount
        fileName
        contentType
        csv
        appliedFilter { fromLocalDate toLocalDate timeZone }
      }
      ... on AuditLogError { code message }
    }
  }
`;

type AuditEntry = {
  id: string;
  occurredAt: string;
  actorUserId: string | null;
  systemIdentity: string | null;
  actingRole: string | null;
  operation: string;
  targetType: string;
  targetId: string;
  outcome: string;
  reasonCode: string;
  correlationId: string;
};

function parseCsv(csv: string) {
  return csv.trimEnd().split("\n").map((line) => line.split(","));
}

describe("Audit Log GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  let now = READ_INSTANT;

  const administratorId = randomUUID();
  const administratorSubject = randomUUID();
  const managerId = randomUUID();
  const managerSubject = randomUUID();
  const colleagueId = randomUUID();
  const colleagueSubject = randomUUID();
  const rivalManagerId = randomUUID();
  const rivalManagerSubject = randomUUID();
  const zonelessManagerId = randomUUID();
  const zonelessManagerSubject = randomUUID();
  const studentId = randomUUID();
  const studentSubject = randomUUID();
  const teacherId = randomUUID();
  const teacherSubject = randomUUID();
  const organizationId = randomUUID();
  const rivalOrganizationId = randomUUID();

  const adjustmentCorrelationId = randomUUID();

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(postgres, `audit_log_${randomUUID().replaceAll("-", "")}`);
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test", now: () => now });

    const user = (id: string, subject: string, displayName: string, timeZone: string | null) => ({
      id,
      identity_issuer: "https://fake.local/",
      identity_subject: subject,
      display_name: displayName,
      interface_locale: timeZone === null ? null : "en" as const,
      display_time_zone: timeZone,
    });
    await db.insertInto("users").values([
      user(administratorId, administratorSubject, "Ada Administrator", "America/Denver"),
      user(managerId, managerSubject, "Morgan Manager", "America/Denver"),
      user(colleagueId, colleagueSubject, "Casey Colleague", "America/Denver"),
      user(rivalManagerId, rivalManagerSubject, "Riley Rival", "America/Denver"),
      user(zonelessManagerId, zonelessManagerSubject, "Zev Zoneless", null),
      user(studentId, studentSubject, "Sam Student", "America/Denver"),
      user(teacherId, teacherSubject, "Tomás Teacher", "America/Denver"),
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: administratorId, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: managerId, role: "ORGANIZATION_MANAGER" },
      { user_id: colleagueId, role: "ORGANIZATION_MANAGER" },
      { user_id: rivalManagerId, role: "ORGANIZATION_MANAGER" },
      { user_id: zonelessManagerId, role: "ORGANIZATION_MANAGER" },
      { user_id: studentId, role: "STUDENT" },
      { user_id: teacherId, role: "TEACHER" },
    ]).execute();
    await db.insertInto("organizations").values([
      { id: organizationId, name: "Nimbus Logistics" },
      { id: rivalOrganizationId, name: "Riverside Health" },
    ]).execute();
    await db.insertInto("organization_managers").values([
      { user_id: managerId, organization_id: organizationId },
      { user_id: colleagueId, organization_id: organizationId },
      { user_id: zonelessManagerId, organization_id: organizationId },
      { user_id: rivalManagerId, organization_id: rivalOrganizationId },
    ]).execute();

    // Real authenticated mutations, so the entries under inspection are the ones the
    // application actually writes rather than fixtures shaped to suit the reader.
    now = new Date("2026-08-20T15:00:00.000Z");
    await createCohort("Onboarding", managerSubject);
    await createCohort("Field Operations", colleagueSubject);
    await createCohort("Wards", rivalManagerSubject);

    now = new Date("2026-08-21T16:30:00.000Z");
    await graphql(
      `mutation Adjust($input: AdjustClassCreditsInput!) {
        adjustClassCredits(input: $input) { __typename }
      }`,
      { input: { idempotencyKey: randomUUID(), studentUserId: studentId, amount: 2, reason: ADJUSTMENT_REASON } },
      administratorSubject,
      adjustmentCorrelationId,
    );

    // A busy day for one Organization Manager, so paging has something to page.
    await sql`
      insert into audit_entries (actor_user_id, acting_role, operation, target_type, target_id, outcome, reason_code, correlation_id, occurred_at)
      select
        ${managerId}::uuid,
        'ORGANIZATION_MANAGER',
        'cohort.renamed',
        'Cohort',
        gen_random_uuid()::text,
        'SUCCEEDED',
        'COHORT_RENAMED',
        'busy-day-' || minute,
        timestamptz '2026-08-22T12:00:00Z' + make_interval(mins => minute)
      from generate_series(1, ${AUDIT_LOG_PAGE_SIZE + 5}) as minute
    `.execute(db);

    now = READ_INSTANT;
  }, 180_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("shows marketplace-wide authority every actor's record with opaque identities alone", async () => {
    const auditLog = await readAuditLog(administratorSubject);

    expect(auditLog.scope).toBe("MARKETPLACE_WIDE");
    expect(auditLog.appliedFilter).toMatchObject({
      // Thirty days back from the reader's own local today, in their Display Time Zone.
      fromLocalDate: "2026-07-28",
      toLocalDate: "2026-08-26",
      timeZone: "America/Denver",
    });

    const adjustment = auditLog.entries.find((entry) => entry.operation === "class-credit.adjusted")!;
    expect(adjustment).toMatchObject({
      actorUserId: administratorId,
      systemIdentity: null,
      actingRole: "PLATFORM_ADMINISTRATOR",
      targetType: "ClassCreditAccount",
      targetId: studentId,
      outcome: "SUCCEEDED",
      reasonCode: "CLASS_CREDIT_ADJUSTED",
      correlationId: adjustmentCorrelationId,
    });

    // Another Organization's manager is inside marketplace-wide scope.
    expect(auditLog.entries.some((entry) => entry.actorUserId === rivalManagerId)).toBe(true);
  });

  it("keeps display names and the reasons Users read out of the Audit Log", async () => {
    const auditLog = await readAuditLog(administratorSubject);
    expect(auditLog.entries).not.toEqual([]);
    const serialized = JSON.stringify(auditLog);

    expect(serialized).not.toContain(ADJUSTMENT_REASON);
    for (const displayName of ["Ada Administrator", "Morgan Manager", "Sam Student", "Riley Rival"]) {
      expect(serialized).not.toContain(displayName);
    }
    // The identities it does carry are the opaque ones.
    expect(serialized).toContain(administratorId);
  });

  it("narrows an Organization Manager to the acting record of its own Organization's managers", async () => {
    const auditLog = await readAuditLog(managerSubject, { operation: "cohort.created" });

    expect(auditLog.scope).toBe("ASSIGNED_ORGANIZATION");
    expect([...new Set(auditLog.entries.map((entry) => entry.actorUserId))].sort())
      .toEqual([managerId, colleagueId].sort());

    // Another Organization's manager, the administrator's own actions, and every
    // Student's activity stay outside the scope entirely.
    const everything = await readAuditLog(managerSubject);
    expect(everything.entries).not.toEqual([]);
    expect(everything.entries.some((entry) => entry.actorUserId === rivalManagerId)).toBe(false);
    expect(everything.entries.some((entry) => entry.actorUserId === administratorId)).toBe(false);
    expect(everything.entries.some((entry) => entry.actorUserId === studentId)).toBe(false);
    expect(everything.entries.some((entry) => entry.systemIdentity !== null)).toBe(false);
  });

  it("keeps the correcting actor and its reason in the Audit Log rather than in an Organization's reporting", async () => {
    const administratorView = await readAuditLog(administratorSubject, { operation: "class-credit.adjusted" });
    expect(administratorView.entries).toHaveLength(1);
    expect(administratorView.entries[0]).toMatchObject({
      actorUserId: administratorId,
      reasonCode: "CLASS_CREDIT_ADJUSTED",
    });

    const managerView = await readAuditLog(managerSubject, { operation: "class-credit.adjusted" });
    expect(managerView.entries).toEqual([]);
  });

  it("refuses every other role and records the denied sensitive read", async () => {
    for (const [subject, actorId] of [[studentSubject, studentId], [teacherSubject, teacherId]] as const) {
      const correlationId = randomUUID();
      const response = await graphql(AUDIT_LOG_QUERY, { filter: null }, subject, correlationId);
      expect(response.errors?.[0]?.extensions.code).toBe("FORBIDDEN");

      const denial = await db.selectFrom("audit_entries")
        .selectAll()
        .where("correlation_id", "=", correlationId)
        .executeTakeFirstOrThrow();
      expect(denial).toMatchObject({
        actor_user_id: actorId,
        acting_role: null,
        operation: "audit-log.read",
        target_type: "AuditLog",
        outcome: "DENIED",
        reason_code: "AUDIT_LOG_ROLE_REQUIRED",
      });
    }
  });

  it("records no Audit Entry for an authorized read of the Audit Log itself", async () => {
    const correlationId = randomUUID();
    await graphql(AUDIT_LOG_QUERY, { filter: null }, administratorSubject, correlationId);

    expect(await db.selectFrom("audit_entries")
      .select("id")
      .where("correlation_id", "=", correlationId)
      .execute()).toEqual([]);
  });

  it("filters by outcome, acting role, operation, actor, and correlation identifier", async () => {
    const denied = await readAuditLog(administratorSubject, { outcome: "DENIED" });
    expect(denied.appliedFilter.outcome).toBe("DENIED");
    expect(denied.entries.every((entry) => entry.outcome === "DENIED")).toBe(true);
    expect(denied.entries.some((entry) => entry.actorUserId === studentId)).toBe(true);

    const byRole = await readAuditLog(administratorSubject, { actingRole: "ORGANIZATION_MANAGER" });
    expect(byRole.entries.every((entry) => entry.actingRole === "ORGANIZATION_MANAGER")).toBe(true);

    const byActor = await readAuditLog(administratorSubject, { actorUserId: colleagueId });
    expect(byActor.entries.every((entry) => entry.actorUserId === colleagueId)).toBe(true);
    expect(byActor.entries).not.toEqual([]);

    const byCorrelation = await readAuditLog(administratorSubject, { correlationId: adjustmentCorrelationId });
    expect(byCorrelation.entries.map((entry) => entry.operation)).toEqual(["class-credit.adjusted"]);
  });

  it("pages newest first without repeating or skipping an entry", async () => {
    const filter = { fromLocalDate: BUSY_LOCAL_DATE, toLocalDate: BUSY_LOCAL_DATE, operation: "cohort.renamed" };
    const first = await readAuditLog(managerSubject, filter);

    expect(first.entries).toHaveLength(AUDIT_LOG_PAGE_SIZE);
    expect(first.pageInfo.hasNextPage).toBe(true);
    const occurredAt = first.entries.map((entry) => entry.occurredAt);
    expect([...occurredAt].sort().reverse()).toEqual(occurredAt);

    const second = await readAuditLog(managerSubject, { ...filter, after: first.pageInfo.endCursor });
    expect(second.entries).toHaveLength(5);
    expect(second.pageInfo.hasNextPage).toBe(false);

    const ids = [...first.entries, ...second.entries].map((entry) => entry.id);
    expect(new Set(ids).size).toBe(AUDIT_LOG_PAGE_SIZE + 5);
  });

  it("refuses a range it cannot interpret and a viewer with no saved Display Time Zone", async () => {
    const reversed = await auditLogResult(administratorSubject, { fromLocalDate: "2026-08-26", toLocalDate: "2026-08-01" });
    expect(reversed).toMatchObject({ __typename: "AuditLogError", code: "INVALID_AUDIT_LOG_RANGE" });

    const tooWide = await auditLogResult(administratorSubject, { fromLocalDate: "2025-01-01", toLocalDate: "2026-08-26" });
    expect(tooWide).toMatchObject({ __typename: "AuditLogError", code: "INVALID_AUDIT_LOG_RANGE" });

    const zoneless = await auditLogResult(zonelessManagerSubject, null);
    expect(zoneless).toMatchObject({ __typename: "AuditLogError", code: "DISPLAY_TIME_ZONE_REQUIRED" });

    const badCursor = await auditLogResult(administratorSubject, { after: "not-a-cursor" });
    expect(badCursor).toMatchObject({ __typename: "AuditLogError", code: "INVALID_AUDIT_LOG_CURSOR" });

    const badActor = await auditLogResult(administratorSubject, { actorUserId: "not-an-identifier" });
    expect(badActor).toMatchObject({ __typename: "AuditLogError", code: "INVALID_AUDIT_LOG_FILTER" });
  });

  it("exports the viewer's own scope as a bounded file and audits the export", async () => {
    const correlationId = randomUUID();
    const response = await graphql(
      AUDIT_LOG_EXPORT_QUERY,
      { filter: { fromLocalDate: BUSY_LOCAL_DATE, toLocalDate: BUSY_LOCAL_DATE } },
      managerSubject,
      correlationId,
    );
    const exported = response.data!["auditLogExport"] as {
      __typename: string;
      scope: string;
      schemaVersion: string;
      rowCount: number;
      fileName: string;
      contentType: string;
      csv: string;
    };

    expect(exported).toMatchObject({
      __typename: "AuditLogExport",
      scope: "ASSIGNED_ORGANIZATION",
      schemaVersion: "audit_log.v1",
      rowCount: AUDIT_LOG_PAGE_SIZE + 5,
      fileName: "audit_log.v1_2026-08-22_2026-08-23.csv",
      contentType: "text/csv; charset=utf-8",
    });

    const [header, ...rows] = parseCsv(exported.csv);
    expect(header).toEqual([...AUDIT_LOG_EXPORT_COLUMNS]);
    expect(rows).toHaveLength(exported.rowCount);
    // Chronological in the file, with every instant written in the viewer's zone.
    expect(rows.every((row) => row[4]!.endsWith("-06:00"))).toBe(true);
    expect(rows.map((row) => row[4])).toEqual([...rows.map((row) => row[4])].sort());
    expect(exported.csv).not.toContain("Morgan Manager");

    const audited = await db.selectFrom("audit_entries")
      .selectAll()
      .where("correlation_id", "=", correlationId)
      .executeTakeFirstOrThrow();
    expect(audited).toMatchObject({
      actor_user_id: managerId,
      acting_role: "ORGANIZATION_MANAGER",
      operation: "audit-log.exported",
      target_type: "AuditLog",
      outcome: "SUCCEEDED",
      reason_code: "AUDIT_LOG_EXPORTED",
    });
  });

  it("names the background actor of a system Audit Entry opaquely in an export", async () => {
    await db.insertInto("audit_entries").values({
      actor_user_id: null,
      system_identity: "AUDIT_RETENTION_WORKER",
      acting_role: null,
      operation: "audit-log.partition-prepared",
      target_type: "AuditLogPartition",
      target_id: "audit_entries_2026_09",
      outcome: "SUCCEEDED",
      reason_code: "AUDIT_PARTITION_PREPARED",
      correlation_id: "audit-retention-fixture",
      occurred_at: new Date("2026-08-23T09:00:00.000Z"),
    }).execute();

    const exported = await exportAuditLog(administratorSubject, { fromLocalDate: "2026-08-23", toLocalDate: "2026-08-23" });
    expect(exported.csv).toContain("system:AUDIT_RETENTION_WORKER");
  });

  it("refuses an export past the accepted row count rather than shortening it", async () => {
    await sql`
      insert into audit_entries (actor_user_id, acting_role, operation, target_type, target_id, outcome, reason_code, correlation_id, occurred_at)
      select
        ${administratorId}::uuid,
        'PLATFORM_ADMINISTRATOR',
        'class-session.published',
        'ClassSession',
        gen_random_uuid()::text,
        'SUCCEEDED',
        'CLASS_SESSION_PUBLISHED',
        'flood-' || entry,
        timestamptz '2026-08-24T12:00:00Z' + make_interval(secs => entry)
      from generate_series(1, ${AUDIT_LOG_EXPORT_MAXIMUM_ROW_COUNT + 1}) as entry
    `.execute(db);

    const correlationId = randomUUID();
    const response = await graphql(
      AUDIT_LOG_EXPORT_QUERY,
      { filter: { fromLocalDate: FLOOD_LOCAL_DATE, toLocalDate: FLOOD_LOCAL_DATE } },
      administratorSubject,
      correlationId,
    );
    expect(response.data!["auditLogExport"]).toMatchObject({
      __typename: "AuditLogError",
      code: "AUDIT_LOG_ROW_LIMIT_EXCEEDED",
    });

    const refusal = await db.selectFrom("audit_entries")
      .selectAll()
      .where("correlation_id", "=", correlationId)
      .executeTakeFirstOrThrow();
    expect(refusal).toMatchObject({
      operation: "audit-log.exported",
      outcome: "DENIED",
      reason_code: "AUDIT_LOG_ROW_LIMIT_EXCEEDED",
    });

    // The Audit Log itself still reads, one bounded page at a time.
    const readable = await readAuditLog(administratorSubject, { fromLocalDate: FLOOD_LOCAL_DATE, toLocalDate: FLOOD_LOCAL_DATE });
    expect(readable.entries).toHaveLength(AUDIT_LOG_PAGE_SIZE);
    expect(readable.pageInfo.hasNextPage).toBe(true);
  });

  it("refuses to edit or selectively remove an Audit Entry", async () => {
    const entry = await db.selectFrom("audit_entries").select("id").executeTakeFirstOrThrow();

    await expect(sql`update audit_entries set reason_code = 'REWRITTEN' where id = ${entry.id}`.execute(db))
      .rejects.toThrow(/append-only/);
    await expect(sql`delete from audit_entries where id = ${entry.id}`.execute(db))
      .rejects.toThrow(/append-only/);
  });

  it("expires complete monthly partitions after 90 days and leaves retained history whole", async () => {
    // A month that is still inside the retention window at the swept instant.
    await db.insertInto("audit_entries").values({
      actor_user_id: administratorId,
      acting_role: "PLATFORM_ADMINISTRATOR",
      operation: "class-session.published",
      target_type: "ClassSession",
      target_id: randomUUID(),
      outcome: "SUCCEEDED",
      reason_code: "CLASS_SESSION_PUBLISHED",
      correlation_id: "retained-entry",
      occurred_at: new Date("2027-08-15T12:00:00.000Z"),
    }).execute();

    const sweptAt = new Date("2027-10-01T04:00:00.000Z");
    const { preparedPartitions, expiredPartitions } = await maintainAuditPartitions(db, sweptAt, "audit-retention-test");

    // Retention prepares the months ahead before it drops the months behind.
    expect(preparedPartitions).toContain("audit_entries_2027_10");
    expect(expiredPartitions).toContain("audit_entries_2026_08");
    // Ninety days back from 1 October 2027 lands in July, so July onwards is whole.
    expect(expiredPartitions).not.toContain("audit_entries_2027_07");
    expect(expiredPartitions).not.toContain("audit_entries_2027_08");

    expect(await db.selectFrom("audit_entries").select("id")
      .where("correlation_id", "=", "retained-entry").execute()).toHaveLength(1);
    expect(await db.selectFrom("audit_entries").select("id")
      .where("correlation_id", "=", adjustmentCorrelationId).execute()).toEqual([]);

    const retentionAudit = await db.selectFrom("audit_entries")
      .selectAll()
      .where("correlation_id", "=", "audit-retention-test")
      .where("operation", "=", "audit-log.partition-expired")
      .where("target_id", "=", "audit_entries_2026_08")
      .executeTakeFirstOrThrow();
    expect(retentionAudit).toMatchObject({
      actor_user_id: null,
      system_identity: "AUDIT_RETENTION_WORKER",
      outcome: "SUCCEEDED",
      reason_code: "AUDIT_PARTITION_EXPIRED",
    });
  });

  async function createCohort(name: string, subject: string) {
    const response = await graphql(
      `mutation CreateCohort($input: CreateCohortInput!) {
        createCohort(input: $input) { __typename }
      }`,
      { input: { idempotencyKey: randomUUID(), name } },
      subject,
    );
    expect(response.errors).toBeUndefined();
  }

  async function auditLogResult(subject: string, filter: Record<string, unknown> | null) {
    const response = await graphql(AUDIT_LOG_QUERY, { filter }, subject);
    expect(response.errors).toBeUndefined();
    return response.data!["auditLog"] as Record<string, unknown>;
  }

  async function readAuditLog(subject: string, filter: Record<string, unknown> | null = null) {
    const auditLog = await auditLogResult(subject, filter);
    expect(auditLog["__typename"]).toBe("AuditLog");
    return auditLog as unknown as {
      scope: string;
      appliedFilter: Record<string, string | null>;
      entries: AuditEntry[];
      pageInfo: { endCursor: string | null; hasNextPage: boolean };
    };
  }

  async function exportAuditLog(subject: string, filter: Record<string, unknown> | null) {
    const response = await graphql(AUDIT_LOG_EXPORT_QUERY, { filter }, subject);
    expect(response.errors).toBeUndefined();
    const exported = response.data!["auditLogExport"] as { __typename: string; csv: string; rowCount: number };
    expect(exported.__typename).toBe("AuditLogExport");
    return exported;
  }

  async function graphql(
    query: string,
    variables?: Record<string, unknown>,
    subject: string = administratorSubject,
    correlationId: string = randomUUID(),
  ) {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
        "x-demo-user-id": subject,
      },
      body: JSON.stringify({ query, variables }),
    });
    return await response.json() as {
      data?: Record<string, unknown>;
      errors?: Array<{ message: string; extensions: { code: string } }>;
    };
  }
});
