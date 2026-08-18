import { randomUUID } from "node:crypto";

import {
  CORRECTION_HISTORY_REPORT_EXPORT_COLUMNS,
  ORDINARY_REPORT_EXPORT_COLUMNS,
  REPORT_EXPORT_LIFETIME_MILLISECONDS,
} from "@marketplace/core";
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
import { expireDueReportExports, generateDueReportExports } from "../src/reporting/report-export-worker.js";

const SPONSORSHIP_START = new Date("2026-03-01T00:00:00.000Z");
const SPONSORSHIP_END = new Date("2026-05-01T00:00:00.000Z");
const CORRECTION_INSTANT = new Date("2026-06-20T00:00:00.000Z");
const EXPORT_INSTANT = new Date("2026-06-25T18:00:00.000Z");
const PERIOD = { fromLocalDate: "2026-02-01", toLocalDate: "2026-06-30" };

const EXPORT_FIELDS = `
  id kind schemaVersion actingRole state
  periodStartLocalDate periodEndExclusiveLocalDate timeZone
  requestedAt completedAt expiresAt dataAsOf rowCount contentDigest failureReasonCode downloadable
`;

type ReportExport = {
  id: string;
  kind: string;
  schemaVersion: string;
  actingRole: string;
  state: string;
  periodStartLocalDate: string;
  periodEndExclusiveLocalDate: string;
  timeZone: string;
  completedAt: string | null;
  expiresAt: string | null;
  dataAsOf: string | null;
  rowCount: number | null;
  contentDigest: string | null;
  failureReasonCode: string | null;
  downloadable: boolean;
};

/** A deliberately literal CSV reader, so the test reads the file rather than the code. */
function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += character;
  }
  return rows;
}

function tabulate(csv: string) {
  const [header, ...rows] = parseCsv(csv);
  return rows.map((row) => Object.fromEntries(row.map((value, index) => [header![index]!, value])));
}

describe("Report Export GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  let now = new Date("2026-02-01T00:00:00.000Z");

  const managerId = randomUUID();
  const managerSubject = randomUUID();
  const rivalManagerId = randomUUID();
  const rivalManagerSubject = randomUUID();
  const teacherId = randomUUID();
  const teacherSubject = randomUUID();
  const administratorId = randomUUID();
  const administratorSubject = randomUUID();
  const zonelessManagerId = randomUUID();
  const zonelessManagerSubject = randomUUID();
  const sofiaId = randomUUID();
  const sofiaSubject = randomUUID();
  const danaId = randomUUID();
  const danaSubject = randomUUID();
  const rivalStudentId = randomUUID();
  const rivalStudentSubject = randomUUID();
  const organizationId = randomUUID();
  const rivalOrganizationId = randomUUID();

  const lessonUnitIds: string[] = [];
  let courseId: string;
  let danaSponsorshipId: string;
  let noShowSessionId: string;
  let attended: string;

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(postgres, `report_exports_${randomUUID().replaceAll("-", "")}`);
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test", now: () => now });

    const user = (id: string, subject: string, displayName: string, timeZone: string | null) => ({
      id,
      identity_issuer: "https://fake.local/",
      identity_subject: subject,
      display_name: displayName,
      // Interface Locale and Display Time Zone are saved together or not at all.
      interface_locale: timeZone === null ? null : "en" as const,
      display_time_zone: timeZone,
    });
    await db.insertInto("users").values([
      user(managerId, managerSubject, "Morgan Manager", "America/Denver"),
      user(rivalManagerId, rivalManagerSubject, "Riley Rival", "America/Denver"),
      user(zonelessManagerId, zonelessManagerSubject, "Zev Zoneless", null),
      user(teacherId, teacherSubject, "Tomás Teacher", "America/Denver"),
      user(administratorId, administratorSubject, "Ada Administrator", "America/Denver"),
      // A display name a spreadsheet would execute if the schema wrote it plainly.
      user(sofiaId, sofiaSubject, "=Sofía Rivera", "America/Denver"),
      user(danaId, danaSubject, "Dana Ortiz", "America/Denver"),
      user(rivalStudentId, rivalStudentSubject, "Robin Riverside", "America/Denver"),
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: managerId, role: "ORGANIZATION_MANAGER" },
      { user_id: rivalManagerId, role: "ORGANIZATION_MANAGER" },
      { user_id: zonelessManagerId, role: "ORGANIZATION_MANAGER" },
      { user_id: teacherId, role: "TEACHER" },
      { user_id: administratorId, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: sofiaId, role: "STUDENT" },
      { user_id: danaId, role: "STUDENT" },
      { user_id: rivalStudentId, role: "STUDENT" },
    ]).execute();
    await db.insertInto("organizations").values([
      { id: organizationId, name: "Nimbus Logistics" },
      { id: rivalOrganizationId, name: "Riverside Health" },
    ]).execute();
    await db.insertInto("organization_managers").values([
      { user_id: managerId, organization_id: organizationId },
      { user_id: zonelessManagerId, organization_id: organizationId },
      { user_id: rivalManagerId, organization_id: rivalOrganizationId },
    ]).execute();

    courseId = (await db.insertInto("courses").values({
      stable_key: "es-b2",
      target_language: "es",
      curriculum_level: "B2",
      title: "Spanish B2",
      summary: "Upper-intermediate Spanish",
    }).returning("id").executeTakeFirstOrThrow()).id;
    await db.insertInto("teacher_qualifications").values({
      teacher_user_id: teacherId,
      target_language: "es",
      curriculum_level: "B2",
      granted_by_user_id: administratorId,
    }).execute();
    for (const index of [1, 2, 3, 4]) {
      // A Lesson Unit needs its Topics in the same transaction: the count is checked
      // by a deferred constraint trigger.
      lessonUnitIds.push(await db.transaction().execute(async (transaction) => {
        const unit = await transaction.insertInto("lesson_units").values({
          stable_key: `es-b2-0${index}`,
          course_id: courseId,
          title: `Unit ${index}`,
          summary: `Unit ${index} summary`,
          objectives: JSON.stringify([`Objective ${index}`]),
          sort_order: index,
          state: "ACTIVE",
        }).returning("id").executeTakeFirstOrThrow();
        await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: unit.id, topic_key: "EC" }).execute();
        return unit.id;
      }));
    }

    // A completion earned before the Sponsorship, so the frozen baseline conceals it.
    const beforeSponsorship = await deliver(lessonUnitIds[0]!, "2026-02-15T15:00:00.000Z", [sofiaId, danaId]);
    now = new Date("2026-02-15T16:05:00.000Z");
    await administerAttendance(beforeSponsorship, [[sofiaId, "ATTENDED"], [danaId, "ATTENDED"]]);

    now = SPONSORSHIP_START;
    await sponsor(sofiaId, sofiaSubject, managerSubject);
    danaSponsorshipId = await sponsor(danaId, danaSubject, managerSubject);
    await sponsor(rivalStudentId, rivalStudentSubject, rivalManagerSubject);

    attended = await deliver(lessonUnitIds[1]!, "2026-03-15T15:00:00.000Z", [sofiaId, danaId, rivalStudentId]);
    now = new Date("2026-03-15T16:05:00.000Z");
    await administerAttendance(attended, [[sofiaId, "ATTENDED"], [danaId, "ATTENDED"], [rivalStudentId, "ATTENDED"]]);

    // The other Organization's Student keeps a completion of their own, so the
    // correction seeded below removes a fact without emptying their reporting.
    const rivalAttended = await deliver(lessonUnitIds[3]!, "2026-03-25T15:00:00.000Z", [rivalStudentId]);
    now = new Date("2026-03-25T16:05:00.000Z");
    await administerAttendance(rivalAttended, [[rivalStudentId, "ATTENDED"]]);

    noShowSessionId = await deliver(lessonUnitIds[2]!, "2026-03-20T15:00:00.000Z", [sofiaId, danaId]);
    now = new Date("2026-03-20T16:05:00.000Z");
    await administerAttendance(noShowSessionId, [[sofiaId, "NO_SHOW"], [danaId, "NO_SHOW"]]);

    now = SPONSORSHIP_END;
    await endSponsorship(danaSponsorshipId);

    // An accepted correction: the frozen ending snapshot gains the completion, and
    // the revision behind it becomes correction-history material.
    now = CORRECTION_INSTANT;
    await administerAttendance(noShowSessionId, [
      [sofiaId, "NO_SHOW"],
      [danaId, "ATTENDED", "The Student attended after a corrected roster entry."],
    ]);
    // A revision in the other Organization. Nothing about it may reach the first
    // Organization's correction history.
    await administerAttendance(attended, [
      [sofiaId, "ATTENDED"],
      [danaId, "ATTENDED"],
      [rivalStudentId, "NO_SHOW", "The Student did not join the Class Session."],
    ]);

    now = EXPORT_INSTANT;
  }, 180_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("writes the accepted ordinary schema from one consistent snapshot, scoped to the requester's Organization", async () => {
    const requested = await requestExport("ORDINARY", PERIOD, managerSubject);
    expect(requested).toMatchObject({
      kind: "ORDINARY",
      schemaVersion: "org_progress.v1",
      actingRole: "ORGANIZATION_MANAGER",
      state: "QUEUED",
      periodStartLocalDate: "2026-02-01",
      // The schema states the first excluded date, never the last included one.
      periodEndExclusiveLocalDate: "2026-07-01",
      timeZone: "America/Denver",
      downloadable: false,
      rowCount: null,
    });

    expect(await generateDueReportExports(db, now, randomUUID())).toBe(1);
    const completed = (await listExports(managerSubject)).find((reportExport) => reportExport.id === requested.id)!;
    expect(completed).toMatchObject({
      state: "COMPLETED",
      dataAsOf: EXPORT_INSTANT.toISOString(),
      completedAt: EXPORT_INSTANT.toISOString(),
      expiresAt: new Date(EXPORT_INSTANT.getTime() + REPORT_EXPORT_LIFETIME_MILLISECONDS).toISOString(),
      downloadable: true,
      failureReasonCode: null,
    });
    expect(completed.contentDigest).toMatch(/^[0-9a-f]{64}$/);

    const artifact = await downloadExport(completed.id, managerSubject);
    expect(artifact.fileName).toBe("org_progress.v1_2026-02-01_2026-07-01.csv");
    expect(artifact.contentType).toBe("text/csv; charset=utf-8");

    const [header] = parseCsv(artifact.csv);
    expect(header).toEqual([...ORDINARY_REPORT_EXPORT_COLUMNS]);
    const rows = tabulate(artifact.csv);
    expect(rows).toHaveLength(completed.rowCount!);
    // Another Organization's sponsored Student is outside this Manager's scope.
    expect(rows.map((row) => row["organization_name"])).toEqual(rows.map(() => "Nimbus Logistics"));
    expect(artifact.csv).not.toContain("Robin Riverside");

    // Every row describes the one instant the extract was captured at.
    expect([...new Set(rows.map((row) => row["data_as_of"]))]).toEqual(["2026-06-25T12:00:00-06:00"]);
    expect([...new Set(rows.map((row) => row["requester_time_zone"]))]).toEqual(["America/Denver"]);
    expect([...new Set(rows.map((row) => row["schema_version"]))]).toEqual(["org_progress.v1"]);
  });

  it("reports the current effective value beside the frozen boundary it is compared with", async () => {
    const rows = tabulate((await downloadExport(await ordinaryExportId(managerSubject), managerSubject)).csv);
    const sofia = rows.filter((row) => row["student_display_name"] === "'=Sofía Rivera");
    expect(sofia.map((row) => row["snapshot_kind"])).toEqual(["start", "current"]);
    expect(sofia[0]).toMatchObject({
      completed_unit_count: "1",
      active_unit_count: "4",
      progress_percentage: "25.0",
      is_corrected: "false",
      correction_count: "0",
      latest_correction_at: "",
    });
    expect(sofia[1]).toMatchObject({
      snapshot_kind: "current",
      completed_unit_count: "2",
      active_unit_count: "4",
      progress_percentage: "50.0",
      // One Lesson Unit was completed inside both the period and the Sponsorship.
      completed_during_sponsorship: "1",
      target_language_code: "es",
      curriculum_level_code: "B2",
    });

    // An ended Sponsorship freezes at its ending snapshot: no live row is written.
    const dana = rows.filter((row) => row["student_display_name"] === "Dana Ortiz");
    expect(dana.map((row) => row["snapshot_kind"])).toEqual(["start", "end"]);
    expect(dana[1]).toMatchObject({
      completed_unit_count: "3",
      active_unit_count: "4",
      progress_percentage: "75.0",
      // The frozen boundary carries the revision an accepted correction made to it.
      is_corrected: "true",
      correction_count: "1",
      latest_correction_at: "2026-06-19T18:00:00-06:00",
    });
  });

  it("neutralizes a display name a spreadsheet would otherwise execute", async () => {
    const artifact = await downloadExport(await ordinaryExportId(managerSubject), managerSubject);
    expect(artifact.csv).toContain('"\'=Sofía Rivera"');
    expect(artifact.csv).not.toContain(",=Sofía Rivera");
  });

  it("keeps the ordinary extract free of prior values, actors, and reasons", async () => {
    const artifact = await downloadExport(await ordinaryExportId(managerSubject), managerSubject);
    expect(artifact.csv).not.toContain("no_show");
    expect(artifact.csv).not.toContain("corrected roster entry");
    expect(artifact.csv).not.toContain("Ada Administrator");
  });

  it("narrows an Organization Manager's correction history to its own Sponsorships", async () => {
    const requested = await requestExport("CORRECTION_HISTORY", PERIOD, managerSubject);
    expect(requested).toMatchObject({
      kind: "CORRECTION_HISTORY",
      schemaVersion: "correction_history.v1",
      actingRole: "ORGANIZATION_MANAGER",
    });
    await generateDueReportExports(db, now, randomUUID());

    const artifact = await downloadExport(requested.id, managerSubject);
    const rows = tabulate(artifact.csv);
    expect(rows.length).toBeGreaterThan(0);

    // Every surviving row belongs to this Organization's own Sponsorships. The other
    // Organization's revision is absent rather than merely unlabelled.
    expect([...new Set(rows.map((row) => row["organization_ref"]))]).toEqual([organizationId]);
    expect(rows.some((row) => row["student_ref"] === danaId)).toBe(true);
    expect(artifact.csv).not.toContain(rivalStudentId);

    // Prior values arrive, and the investigative half still does not.
    expect(rows.some((row) => row["prior_value"] === "no_show" && row["current_value"] === "attended")).toBe(true);
    expect(artifact.csv).not.toContain("corrected roster entry");
    expect(artifact.csv).not.toContain(administratorId);
  });

  it("exposes prior and current values in the separately authorized correction-history extract", async () => {
    const requested = await requestExport("CORRECTION_HISTORY", PERIOD, administratorSubject);
    expect(requested).toMatchObject({
      kind: "CORRECTION_HISTORY",
      schemaVersion: "correction_history.v1",
      actingRole: "PLATFORM_ADMINISTRATOR",
    });
    await generateDueReportExports(db, now, randomUUID());

    const artifact = await downloadExport(requested.id, administratorSubject);
    const [header] = parseCsv(artifact.csv);
    expect(header).toEqual([...CORRECTION_HISTORY_REPORT_EXPORT_COLUMNS]);

    const rows = tabulate(artifact.csv);
    const outcome = rows.find((row) =>
      row["subject_type"] === "attendance" && row["student_ref"] === danaId)!;
    expect(outcome).toMatchObject({
      field_code: "outcome",
      revision_sequence: "1",
      prior_value: "no_show",
      current_value: "attended",
      changed_at: "2026-06-19T18:00:00-06:00",
      organization_ref: organizationId,
      student_ref: danaId,
    });

    const snapshotRevision = rows.find((row) => row["subject_type"] === "course_progress_snapshot")!;
    expect(snapshotRevision).toMatchObject({
      field_code: "completed_unit_count",
      revision_sequence: "1",
      prior_value: "2",
      current_value: "3",
    });

    // Marketplace-wide authority carries no narrowing: the other Organization's
    // revision is present here and absent from that Organization Manager's copy.
    expect(rows.some((row) => row["student_ref"] === rivalStudentId)).toBe(true);
    expect([...new Set(rows.map((row) => row["organization_ref"]))].sort())
      .toEqual([organizationId, rivalOrganizationId].sort());

    // The investigative half stays in the Audit Log.
    expect(artifact.csv).not.toContain("corrected roster entry");
    expect(artifact.csv).not.toContain("did not join the Class Session");
    expect(artifact.csv).not.toContain(administratorId);
  });

  it("explains every correction marker the ordinary extract shows for the same range", async () => {
    const ordinary = tabulate((await downloadExport(await ordinaryExportId(managerSubject), managerSubject)).csv);
    const history = tabulate((await downloadExport(
      (await listExports(administratorSubject)).find((reportExport) => reportExport.kind === "CORRECTION_HISTORY")!.id,
      administratorSubject,
    )).csv);

    const markedStudents = new Set(ordinary
      .filter((row) => row["is_corrected"] === "true")
      .map((row) => row["student_ref"]));
    expect(markedStudents.size).toBeGreaterThan(0);
    for (const studentRef of markedStudents) {
      expect(history.some((row) => row["student_ref"] === studentRef)).toBe(true);
    }
  });

  it("bounds the requested range and audits every refusal", async () => {
    const tooLong = await requestExportResult("ORDINARY", { fromLocalDate: "2025-01-01", toLocalDate: "2026-06-30" }, administratorSubject);
    expect(tooLong).toMatchObject({ code: "INVALID_REPORT_RANGE" });

    const backwards = await requestExportResult("ORDINARY", { fromLocalDate: "2026-06-30", toLocalDate: "2026-02-01" }, administratorSubject);
    expect(backwards).toMatchObject({ code: "INVALID_REPORT_RANGE" });

    expect(await auditReasons(administratorId, "report-export.requested", "DENIED"))
      .toEqual(["INVALID_REPORT_RANGE", "INVALID_REPORT_RANGE"]);
  });

  it("requires a saved Display Time Zone before an export can interpret a date", async () => {
    const refused = await requestExportResult("ORDINARY", PERIOD, zonelessManagerSubject);
    expect(refused).toMatchObject({ code: "DISPLAY_TIME_ZONE_REQUIRED" });
    expect(await auditReasons(zonelessManagerId, "report-export.requested", "DENIED"))
      .toEqual(["DISPLAY_TIME_ZONE_REQUIRED"]);
  });

  it("allows one export at a time per requester", async () => {
    const first = await requestExport("ORDINARY", PERIOD, administratorSubject);
    expect(first.state).toBe("QUEUED");
    const second = await requestExportResult("ORDINARY", PERIOD, administratorSubject);
    expect(second).toMatchObject({ code: "EXPORT_ALREADY_IN_PROGRESS" });

    await generateDueReportExports(db, now, randomUUID());
    // Once the queue drains the requester may ask again.
    const third = await requestExport("ORDINARY", PERIOD, administratorSubject);
    expect(third.state).toBe("QUEUED");
    await generateDueReportExports(db, now, randomUUID());
  });

  it("reports marketplace-wide Sponsorships to marketplace-wide authority", async () => {
    const artifact = await downloadExport((await listExports(administratorSubject))
      .find((reportExport) => reportExport.kind === "ORDINARY")!.id, administratorSubject);
    const organizations = new Set(tabulate(artifact.csv).map((row) => row["organization_name"]));
    expect([...organizations].sort()).toEqual(["Nimbus Logistics", "Riverside Health"]);
  });

  it("refuses to release another requester's export without confirming that it exists", async () => {
    const [managerExport] = await listExports(managerSubject);
    const response = await graphql(
      `query Artifact($id: ID!) { reportExportArtifact(id: $id) { fileName } }`,
      { id: managerExport!.id },
      rivalManagerSubject,
    );
    expect(response.errors?.[0]?.extensions.code).toBe("NOT_FOUND");
    expect(await auditReasons(rivalManagerId, "report-export.downloaded", "DENIED"))
      .toEqual(["REPORT_EXPORT_NOT_FOUND"]);
  });

  it("refuses both request and download to a role that holds no reporting authority", async () => {
    const requested = await graphql(
      `mutation Request($input: RequestReportExportInput!) {
        requestReportExport(input: $input) { __typename }
      }`,
      { input: { idempotencyKey: randomUUID(), kind: "ORDINARY", ...PERIOD } },
      teacherSubject,
    );
    expect(requested.errors?.[0]?.extensions.code).toBe("FORBIDDEN");

    const listed = await graphql(`query { reportExports { id } }`, {}, teacherSubject);
    expect(listed.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
    expect(await auditReasons(teacherId, "report-export.read", "DENIED")).toEqual(["REPORT_EXPORT_ROLE_REQUIRED"]);
  });

  it("notifies the requester in-app only, without reproducing reported data", async () => {
    const ordinaryId = await ordinaryExportId(managerSubject);
    const notifications = await db.selectFrom("in_app_notifications")
      .select(["message_id", "variables"])
      .where("recipient_user_id", "=", managerId)
      .where("source_reference", "=", `report-export.completed:${ordinaryId}`)
      .execute();
    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.message_id).toBe("report-export.completed.requester");
    expect(notifications[0]!.variables).toMatchObject({
      kind: "ORDINARY",
      periodStart: "2026-02-01",
      periodEndExclusive: "2026-07-01",
    });

    // The policy is in-app only: an export outcome never becomes an email.
    const emails = await db.selectFrom("email_notification_intents")
      .select("id")
      .where("recipient_user_id", "=", managerId)
      .where("message_id", "like", "report-export%")
      .execute();
    expect(emails).toEqual([]);
  });

  it("refuses rather than truncates an extract above the accepted row count", async () => {
    // Enough sponsored Students to pass the bound: each frozen boundary writes one
    // row and each active Sponsorship writes its current row beside it. They belong
    // to the other Organization, so no other expectation in this file moves.
    await sql`
      with seeded_users as (
        insert into users (id, identity_issuer, identity_subject, display_name, interface_locale, display_time_zone)
        select gen_random_uuid(), 'https://fake.local/', gen_random_uuid()::text, 'Bulk Student ' || generated, 'en', 'America/Denver'
        from generate_series(1, 12501) as generated
        returning id
      ), seeded_invitations as (
        insert into sponsorship_invitations (organization_id, student_user_id, invited_by_user_id, state, disclosure_text_version, expires_at, decided_at)
        select ${rivalOrganizationId}, seeded_users.id, ${rivalManagerId}, 'ACCEPTED', 'v1', ${SPONSORSHIP_START}, ${SPONSORSHIP_START}
        from seeded_users
        returning id, student_user_id
      ), seeded_sponsorships as (
        insert into sponsorships (organization_id, student_user_id, invitation_id, accepted_at, next_anniversary_at)
        select ${rivalOrganizationId}, student_user_id, id, ${SPONSORSHIP_START}, ${SPONSORSHIP_END}
        from seeded_invitations
        returning id
      )
      insert into course_progress_snapshots (sponsorship_id, boundary, course_id, completed_active_lesson_unit_count, active_lesson_unit_count, captured_at)
      select id, 'SPONSORSHIP_START', ${courseId}, 0, 4, ${SPONSORSHIP_START} from seeded_sponsorships
    `.execute(db);

    try {
      const requested = await requestExport("ORDINARY", PERIOD, rivalManagerSubject);
      await generateDueReportExports(db, now, randomUUID());

      const refused = (await listExports(rivalManagerSubject)).find((reportExport) => reportExport.id === requested.id)!;
      expect(refused).toMatchObject({
        state: "FAILED",
        failureReasonCode: "ROW_LIMIT_EXCEEDED",
        downloadable: false,
        // Nothing was written, so there is no shortened file to mistake for a whole one.
        rowCount: null,
        contentDigest: null,
      });
      const notification = await db.selectFrom("in_app_notifications")
        .select("variables")
        .where("source_reference", "=", `report-export.failed:${requested.id}`)
        .executeTakeFirstOrThrow();
      expect(notification.variables).toMatchObject({ guidance: "ROW_LIMIT_EXCEEDED" });
    } finally {
      await sql`
        delete from course_progress_snapshots
        where sponsorship_id in (
          select sponsorships.id from sponsorships
          join users on users.id = sponsorships.student_user_id
          where users.display_name like 'Bulk Student %'
        )
      `.execute(db);
      await sql`delete from sponsorships where student_user_id in (select id from users where display_name like 'Bulk Student %')`.execute(db);
      await sql`delete from sponsorship_invitations where student_user_id in (select id from users where display_name like 'Bulk Student %')`.execute(db);
      // The seeded Users stay: an export starts from Sponsorships, so they change
      // nothing, and removing them would re-check every table that references a User.
    }
  }, 120_000);

  it("fails terminally when the authority behind a queued export is removed", async () => {
    const requested = await requestExport("ORDINARY", PERIOD, managerSubject);
    await db.deleteFrom("organization_managers").where("user_id", "=", managerId).execute();
    await generateDueReportExports(db, now, randomUUID());
    await db.insertInto("organization_managers").values({ user_id: managerId, organization_id: organizationId }).execute();

    const failed = (await listExports(managerSubject)).find((reportExport) => reportExport.id === requested.id)!;
    expect(failed).toMatchObject({ state: "FAILED", failureReasonCode: "AUTHORIZATION_REVOKED", downloadable: false });

    const notification = await db.selectFrom("in_app_notifications")
      .select(["message_id", "variables"])
      .where("source_reference", "=", `report-export.failed:${requested.id}`)
      .executeTakeFirstOrThrow();
    expect(notification.message_id).toBe("report-export.failed.requester");
    expect(notification.variables).toMatchObject({ guidance: "AUTHORIZATION_REVOKED" });

    const response = await graphql(
      `query Artifact($id: ID!) { reportExportArtifact(id: $id) { fileName } }`,
      { id: requested.id },
      managerSubject,
    );
    expect(response.errors?.[0]?.extensions.code).toBe("BAD_USER_INPUT");
  });

  it("keeps a completed artifact immutable while it lives", async () => {
    const completed = (await listExports(managerSubject)).find((reportExport) => reportExport.state === "COMPLETED")!;
    await expect(db.updateTable("report_exports")
      .set({ content: "schema_version\nrewritten\n" })
      .where("id", "=", completed.id)
      .execute()).rejects.toThrow(/cannot be rewritten/);
    await expect(db.updateTable("report_exports")
      .set({ row_count: 0 })
      .where("id", "=", completed.id)
      .execute()).rejects.toThrow(/cannot be rewritten/);
    // The lifetime is part of being short-lived: extending it would put an artifact
    // that should have expired back within reach.
    await expect(db.updateTable("report_exports")
      .set({ expires_at: new Date(new Date(completed.expiresAt!).getTime() + 86_400_000) })
      .where("id", "=", completed.id)
      .execute()).rejects.toThrow(/cannot be rewritten/);
  });

  it("reads an artifact past its lifetime as Expired before the sweep reaches it", async () => {
    const completed = (await listExports(managerSubject)).find((reportExport) => reportExport.state === "COMPLETED")!;
    const previous = now;
    now = new Date(new Date(completed.expiresAt!).getTime() + 1);
    try {
      const lapsed = (await listExports(managerSubject)).find((reportExport) => reportExport.id === completed.id)!;
      expect(lapsed).toMatchObject({ state: "EXPIRED", downloadable: false });
      // The record still holds the content until the sweep drops it, and the
      // download path refuses it in the meantime.
      const response = await graphql(
        `query Artifact($id: ID!) { reportExportArtifact(id: $id) { csv } }`,
        { id: completed.id },
        managerSubject,
      );
      expect(response.errors?.[0]?.extensions.code).toBe("BAD_USER_INPUT");
    } finally {
      now = previous;
    }
  });

  it("expires the artifact after 24 hours without turning the record into a backup", async () => {
    const completed = (await listExports(managerSubject)).find((reportExport) => reportExport.state === "COMPLETED")!;
    now = new Date(new Date(completed.expiresAt!).getTime());
    expect(await expireDueReportExports(db, now, randomUUID())).toBeGreaterThanOrEqual(1);

    const expired = (await listExports(managerSubject)).find((reportExport) => reportExport.id === completed.id)!;
    expect(expired).toMatchObject({ state: "EXPIRED", downloadable: false });
    // The record that outlives the file still states what was released.
    expect(expired.rowCount).toBe(completed.rowCount);
    expect(expired.contentDigest).toBe(completed.contentDigest);
    expect(await db.selectFrom("report_exports").select("content").where("id", "=", completed.id).executeTakeFirstOrThrow())
      .toEqual({ content: null });

    const response = await graphql(
      `query Artifact($id: ID!) { reportExportArtifact(id: $id) { csv } }`,
      { id: completed.id },
      managerSubject,
    );
    expect(response.errors?.[0]?.extensions.code).toBe("BAD_USER_INPUT");
    expect(await auditReasons(managerId, "report-export.downloaded", "DENIED"))
      .toContain("REPORT_EXPORT_NOT_DOWNLOADABLE");

    const expiryAudit = await db.selectFrom("audit_entries")
      .select(["system_identity", "reason_code", "outcome"])
      .where("operation", "=", "report-export.expired")
      .where("target_id", "=", completed.id)
      .executeTakeFirstOrThrow();
    expect(expiryAudit).toEqual({
      system_identity: "REPORT_EXPORT_WORKER",
      reason_code: "REPORT_EXPORT_EXPIRED",
      outcome: "SUCCEEDED",
    });
  });

  it("replays one Idempotency Key rather than queueing a second export", async () => {
    const idempotencyKey = randomUUID();
    const input = { idempotencyKey, kind: "ORDINARY", ...PERIOD };
    const first = await requestExportResult("ORDINARY", PERIOD, administratorSubject, input);
    const replay = await requestExportResult("ORDINARY", PERIOD, administratorSubject, input);
    expect(replay).toEqual(first);

    const reused = await requestExportResult("ORDINARY", PERIOD, administratorSubject, {
      ...input,
      fromLocalDate: "2026-03-01",
    });
    expect(reused).toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
  });

  async function deliver(lessonUnitId: string, startsAt: string, studentIds: readonly string[]) {
    return db.transaction().execute(async (transaction) => {
      const classSessionId = (await transaction.insertInto("class_sessions").values({
        lesson_unit_id: lessonUnitId,
        teacher_user_id: teacherId,
        starts_at: new Date(startsAt),
        scheduling_time_zone: "America/Denver",
        seat_capacity: 8,
        occupied_seats: studentIds.length,
        state: "PUBLISHED",
      }).returning("id").executeTakeFirstOrThrow()).id;
      for (const studentUserId of studentIds) {
        await transaction.insertInto("bookings").values({
          student_user_id: studentUserId,
          class_session_id: classSessionId,
          teacher_user_id_at_booking: teacherId,
          state: "ACTIVE",
          terminal_reason: null,
          class_credit_refunded: false,
          late_cancellation_refund_until: null,
          booked_at: new Date(new Date(startsAt).getTime() - 24 * 60 * 60_000),
          ended_at: null,
        }).execute();
      }
      return classSessionId;
    });
  }

  async function administerAttendance(
    classSessionId: string,
    outcomes: ReadonlyArray<readonly [string, "ATTENDED" | "NO_SHOW", string?]>,
  ) {
    const bookings = await db.selectFrom("bookings")
      .select(["id", "student_user_id"])
      .where("class_session_id", "=", classSessionId)
      .execute();
    const records = outcomes.map(([studentUserId, outcome, correctionReason]) => ({
      bookingId: bookings.find((booking) => booking.student_user_id === studentUserId)!.id,
      outcome,
      ...(correctionReason ? { correctionReason } : {}),
    }));
    const response = await graphql(`
      mutation Administer($input: RecordAttendanceInput!) {
        administerAttendance(input: $input) {
          ... on RecordAttendanceSuccess { classRoster { classSession { id } } }
          ... on AttendanceError { code message }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), classSessionId, records } }, administratorSubject);
    expect(response.data!.administerAttendance).not.toHaveProperty("code");
  }

  async function sponsor(studentUserId: string, studentSubject: string, managerSubjectForOrganization: string) {
    const invited = await graphql(`
      mutation Invite($input: InviteToSponsorshipInput!) {
        inviteToSponsorship(input: $input) {
          ... on InviteToSponsorshipSuccess { invitation { id } }
          ... on SponsorshipInvitationError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), studentUserId } }, managerSubjectForOrganization);
    const invitationId = (invited.data!.inviteToSponsorship as { invitation: { id: string } }).invitation.id;
    const accepted = await graphql(`
      mutation Accept($input: SponsorshipInvitationResponseInput!) {
        acceptSponsorshipInvitation(input: $input) {
          ... on AcceptSponsorshipInvitationSuccess { sponsorship { id } }
          ... on SponsorshipInvitationResponseError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), invitationId } }, studentSubject);
    return (accepted.data!.acceptSponsorshipInvitation as { sponsorship: { id: string } }).sponsorship.id;
  }

  async function endSponsorship(sponsorshipId: string) {
    const ended = await graphql(`
      mutation End($input: EndSponsorshipAsOrganizationInput!) {
        endSponsorshipAsOrganization(input: $input) {
          ... on EndSponsorshipAsOrganizationSuccess { sponsorship { state } }
          ... on SponsorshipBoundaryError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), sponsorshipId } }, managerSubject);
    expect(ended.data!.endSponsorshipAsOrganization).toEqual({ sponsorship: { state: "ENDED" } });
  }

  /** One requester's export of a given kind, found by kind rather than by position. */
  async function ordinaryExportId(subject: string) {
    const ordinary = (await listExports(subject)).find((reportExport) => reportExport.kind === "ORDINARY");
    return ordinary!.id;
  }

  async function requestExportResult(
    kind: string,
    period: { fromLocalDate: string; toLocalDate: string },
    subject: string,
    input?: Record<string, unknown>,
  ) {
    const response = await graphql(`
      mutation Request($input: RequestReportExportInput!) {
        requestReportExport(input: $input) {
          __typename
          ... on RequestReportExportSuccess { reportExport { ${EXPORT_FIELDS} } }
          ... on ReportExportError { code message }
        }
      }
    `, { input: input ?? { idempotencyKey: randomUUID(), kind, ...period } }, subject);
    expect(response.errors).toBeUndefined();
    return response.data!.requestReportExport as Record<string, unknown>;
  }

  async function requestExport(
    kind: string,
    period: { fromLocalDate: string; toLocalDate: string },
    subject: string,
  ) {
    const outcome = await requestExportResult(kind, period, subject);
    expect(outcome).not.toHaveProperty("code");
    return (outcome as { reportExport: ReportExport }).reportExport;
  }

  async function listExports(subject: string) {
    const response = await graphql(`query { reportExports { ${EXPORT_FIELDS} } }`, {}, subject);
    expect(response.errors).toBeUndefined();
    return response.data!.reportExports as ReportExport[];
  }

  async function downloadExport(id: string, subject: string) {
    const response = await graphql(
      `query Artifact($id: ID!) { reportExportArtifact(id: $id) { fileName contentType csv } }`,
      { id },
      subject,
    );
    expect(response.errors).toBeUndefined();
    return response.data!.reportExportArtifact as { fileName: string; contentType: string; csv: string };
  }

  async function auditReasons(actorUserId: string, operation: string, outcome: string) {
    const entries = await db.selectFrom("audit_entries")
      .select("reason_code")
      .where("actor_user_id", "=", actorUserId)
      .where("operation", "=", operation)
      .where("outcome", "=", outcome as "SUCCEEDED" | "DENIED" | "FAILED")
      .orderBy("occurred_at")
      .orderBy("id")
      .execute();
    return entries.map((entry) => entry.reason_code);
  }

  async function graphql(
    query: string,
    variables?: Record<string, unknown>,
    subject: string = managerSubject,
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
      errors?: Array<{ extensions: { code: string } }>;
    };
  }
});
