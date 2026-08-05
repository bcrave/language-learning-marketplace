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

describe("Teacher Availability GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  const teacherId = randomUUID();
  const teacherSubject = randomUUID();
  const studentId = randomUUID();
  const studentSubject = randomUUID();

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `availability_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test" });
    await db.insertInto("users").values([
      { id: teacherId, identity_issuer: "https://fake.local/", identity_subject: teacherSubject, display_name: "Taylor Teacher", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: studentId, identity_issuer: "https://fake.local/", identity_subject: studentSubject, display_name: "Sam Student", interface_locale: "en", display_time_zone: "America/Chicago" },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: teacherId, role: "TEACHER" },
      { user_id: studentId, role: "STUDENT" },
    ]).execute();
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("keeps effective-dated weekly wall-clock ranges in the Teacher time zone", async () => {
    const rangeKey = randomUUID();
    const first = await graphql(`
      mutation Save($input: SaveTeacherAvailabilityRangeInput!) {
        saveTeacherAvailabilityRange(input: $input) {
          ... on SaveTeacherAvailabilityRangeSuccess { range { id weekday startLocalTime endLocalTime effectiveFrom effectiveUntil timeZone } }
          ... on TeacherAvailabilityValidationError { code message }
        }
      }
    `, { input: { idempotencyKey: rangeKey, weekday: "MONDAY", startLocalTime: "09:00", endLocalTime: "12:00", effectiveFrom: "2026-03-02", timeZone: "America/Denver" } });
    await graphql(`mutation Save($input: SaveTeacherAvailabilityRangeInput!) { saveTeacherAvailabilityRange(input: $input) { ... on SaveTeacherAvailabilityRangeSuccess { range { id } } ... on TeacherAvailabilityValidationError { code } } }`, { input: { idempotencyKey: rangeKey, weekday: "MONDAY", startLocalTime: "09:00", endLocalTime: "12:00", effectiveFrom: "2026-03-02", timeZone: "America/Denver" } }, "availability-replay");
    const mismatchedReplay = await graphql(`mutation Save($input: SaveTeacherAvailabilityRangeInput!) { saveTeacherAvailabilityRange(input: $input) { ... on SaveTeacherAvailabilityRangeSuccess { range { id } } ... on TeacherAvailabilityValidationError { code } } }`, { input: { idempotencyKey: rangeKey, weekday: "MONDAY", startLocalTime: "08:00", endLocalTime: "12:00", effectiveFrom: "2026-03-02", timeZone: "America/Denver" } }, "availability-replay-mismatch");
    const future = await graphql(`
      mutation Save($input: SaveTeacherAvailabilityRangeInput!) {
        saveTeacherAvailabilityRange(input: $input) {
          ... on SaveTeacherAvailabilityRangeSuccess { range { id effectiveFrom startLocalTime timeZone } }
          ... on TeacherAvailabilityValidationError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), weekday: "MONDAY", startLocalTime: "10:00", endLocalTime: "13:00", effectiveFrom: "2026-11-02", timeZone: "America/Denver" } });
    await graphql(`
      mutation Save($input: SaveTeacherAvailabilityRangeInput!) {
        saveTeacherAvailabilityRange(input: $input) {
          ... on SaveTeacherAvailabilityRangeSuccess { range { id } }
          ... on TeacherAvailabilityValidationError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), weekday: "MONDAY", startLocalTime: "08:00", endLocalTime: "11:00", effectiveFrom: "2026-10-05", timeZone: "America/Denver" } });
    const workspace = await graphql(`{
      teacherAvailability {
        timeZone
        weeklyRanges { weekday startLocalTime endLocalTime effectiveFrom effectiveUntil timeZone }
        exceptions { id }
      }
    }`);
    const preview = await graphql(`{
      teacherAvailabilityPreview(localDates: ["2026-03-02", "2026-03-09"]) {
        localDate startLocalTime endLocalTime startsAt endsAt
      }
    }`);

    expect(first).toMatchObject({ data: { saveTeacherAvailabilityRange: { range: {
      weekday: "MONDAY", startLocalTime: "09:00", endLocalTime: "12:00",
      effectiveFrom: "2026-03-02", effectiveUntil: null, timeZone: "America/Denver",
    } } } });
    expect(future).toMatchObject({ data: { saveTeacherAvailabilityRange: { range: {
      effectiveFrom: "2026-11-02", startLocalTime: "10:00", timeZone: "America/Denver",
    } } } });
    expect(workspace).toMatchObject({ data: { teacherAvailability: {
      timeZone: "America/Denver",
      weeklyRanges: [
        { effectiveFrom: "2026-03-02", effectiveUntil: "2026-10-04", startLocalTime: "09:00" },
        { effectiveFrom: "2026-10-05", effectiveUntil: "2026-11-01", startLocalTime: "08:00" },
        { effectiveFrom: "2026-11-02", effectiveUntil: null, startLocalTime: "10:00" },
      ],
      exceptions: [],
    } } });
    expect(preview).toEqual({ data: { teacherAvailabilityPreview: [
      { localDate: "2026-03-02", startLocalTime: "09:00", endLocalTime: "12:00", startsAt: "2026-03-02T16:00:00Z", endsAt: "2026-03-02T19:00:00Z" },
      { localDate: "2026-03-09", startLocalTime: "09:00", endLocalTime: "12:00", startsAt: "2026-03-09T15:00:00Z", endsAt: "2026-03-09T18:00:00Z" },
    ] } });
    expect(mismatchedReplay).toEqual({ data: { saveTeacherAvailabilityRange: { code: "IDEMPOTENCY_KEY_REUSED" } } });
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", "availability-replay").executeTakeFirstOrThrow()).toEqual({ outcome: "SUCCEEDED", reason_code: "IDEMPOTENT_REPLAY_SUCCEEDED" });
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", "availability-replay-mismatch").executeTakeFirstOrThrow()).toEqual({ outcome: "DENIED", reason_code: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT" });
    expect(await db.selectFrom("in_app_notifications").select("id").where("recipient_user_id", "=", teacherId).execute()).toEqual([]);
  });

  it("rejects an Availability Exception over a published Class Session and directs the Teacher to an Absence Request", async () => {
    const course = await db.insertInto("courses").values({ stable_key: "fr-a1", target_language: "fr", curriculum_level: "A1", title: "A1", summary: "A1" }).returning("id").executeTakeFirstOrThrow();
    const unit = await db.transaction().execute(async (transaction) => {
      const created = await transaction.insertInto("lesson_units").values({ stable_key: "fr-a1-01", course_id: course.id, title: "Unit", summary: "Unit", objectives: JSON.stringify(["Practice"]), sort_order: 1, state: "ACTIVE", replacement_lesson_unit_id: null, retired_at: null }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: created.id, topic_key: "EC" }).execute();
      return created;
    });
    await db.insertInto("teacher_qualifications").values({ teacher_user_id: teacherId, target_language: "fr", curriculum_level: "A1", granted_by_user_id: teacherId }).execute();
    const sessionId = randomUUID();
    await db.insertInto("class_sessions").values({ id: sessionId, lesson_unit_id: unit.id, teacher_user_id: teacherId, starts_at: new Date("2026-08-18T15:30:00Z"), scheduling_time_zone: "America/Denver", state: "PUBLISHED" }).execute();
    const correlationId = `exception-conflict-${randomUUID()}`;
    const result = await graphql(`
      mutation Add($input: AddAvailabilityExceptionInput!) {
        addAvailabilityException(input: $input) {
          ... on AddAvailabilityExceptionSuccess { exception { id } }
          ... on AvailabilityExceptionSessionConflict { code classSessionIds absenceRequestPath message }
          ... on TeacherAvailabilityValidationError { code message }
        }
      }
    `, { input: {
      idempotencyKey: randomUUID(),
      startsAtLocal: "2026-08-18T09:00", endsAtLocal: "2026-08-18T11:00",
      startDisambiguation: "REJECT", endDisambiguation: "REJECT",
    } }, correlationId);

    expect(result).toEqual({ data: { addAvailabilityException: {
      code: "PUBLISHED_CLASS_SESSION_OVERLAP",
      classSessionIds: [sessionId],
      absenceRequestPath: "/teacher/schedule",
      message: "A published Class Session occupies this time. Create an Absence Request instead.",
    } } });
    expect(await db.selectFrom("availability_exceptions").select("id").execute()).toEqual([]);
    expect(await db.selectFrom("audit_entries").select(["acting_role", "outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({ acting_role: "TEACHER", outcome: "DENIED", reason_code: "PUBLISHED_CLASS_SESSION_OVERLAP" });

    const accepted = await graphql(`
      mutation Add($input: AddAvailabilityExceptionInput!) {
        addAvailabilityException(input: $input) {
          ... on AddAvailabilityExceptionSuccess { exception { id } }
          ... on AvailabilityExceptionSessionConflict { code }
          ... on TeacherAvailabilityValidationError { code }
        }
      }
    `, { input: {
      idempotencyKey: randomUUID(),
      startsAtLocal: "2026-08-19T09:00", endsAtLocal: "2026-08-19T11:00",
      startDisambiguation: "REJECT", endDisambiguation: "REJECT",
    } });
    expect(accepted).toMatchObject({ data: { addAvailabilityException: { exception: { id: expect.any(String) } } } });
    await expect(db.insertInto("class_sessions").values({ id: randomUUID(), lesson_unit_id: unit.id, teacher_user_id: teacherId, starts_at: new Date("2026-08-19T15:30:00Z"), scheduling_time_zone: "America/Denver", state: "PUBLISHED" }).execute()).rejects.toMatchObject({ code: "23P01" });

    const racedSessionId = randomUUID();
    const [exceptionRace, sessionRace] = await Promise.allSettled([
      graphql(`mutation Add($input: AddAvailabilityExceptionInput!) { addAvailabilityException(input: $input) { ... on AddAvailabilityExceptionSuccess { exception { id } } ... on AvailabilityExceptionSessionConflict { code } ... on TeacherAvailabilityValidationError { code } } }`, { input: {
        idempotencyKey: randomUUID(), startsAtLocal: "2026-08-20T09:00", endsAtLocal: "2026-08-20T11:00", startDisambiguation: "REJECT", endDisambiguation: "REJECT",
      } }),
      db.insertInto("class_sessions").values({ id: racedSessionId, lesson_unit_id: unit.id, teacher_user_id: teacherId, starts_at: new Date("2026-08-20T15:30:00Z"), scheduling_time_zone: "America/Denver", state: "PUBLISHED" }).execute(),
    ]);
    const exceptionWon = exceptionRace.status === "fulfilled" && JSON.stringify(exceptionRace.value).includes('"exception"');
    const sessionWon = sessionRace.status === "fulfilled";
    expect(Number(exceptionWon) + Number(sessionWon)).toBe(1);
    if (!exceptionWon) expect(JSON.stringify(exceptionRace.status === "fulfilled" ? exceptionRace.value : exceptionRace.reason)).toContain("PUBLISHED_CLASS_SESSION_OVERLAP");
    if (!sessionWon) expect(sessionRace.reason).toMatchObject({ code: "23P01" });
  });

  it("audits and hides Teacher Availability from a Student", async () => {
    const correlationId = `availability-denied-${randomUUID()}`;
    const result = await graphql("{ teacherAvailability { timeZone } }", undefined, correlationId, studentSubject);
    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
    expect(await db.selectFrom("audit_entries").select(["actor_user_id", "acting_role", "outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({ actor_user_id: studentId, acting_role: "TEACHER", outcome: "DENIED", reason_code: "TEACHER_ROLE_REQUIRED" });
  });

  async function graphql(query: string, variables?: Record<string, unknown>, correlationId?: string, subject = teacherSubject) {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", "x-demo-user-id": subject, ...(correlationId ? { "x-correlation-id": correlationId } : {}) },
      body: JSON.stringify({ query, variables }),
    });
    return await response.json() as { data: null | Record<string, unknown>; errors?: Array<{ extensions: { code: string } }> };
  }
});
