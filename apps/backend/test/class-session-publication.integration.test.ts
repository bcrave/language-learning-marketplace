import { randomUUID } from "node:crypto";

import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApi } from "../src/api/app.js";
import { deliverDueClassSessionReminders } from "../src/class-session/class-session-reminder-worker.js";
import { createDatabase, type Database } from "../src/database/database.js";
import { migrateDatabase } from "../src/database/migrate.js";

describe("Class Session publication GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  const administratorId = randomUUID();
  const administratorSubject = randomUUID();
  const teacherId = randomUUID();
  const studentId = randomUUID();
  const studentSubject = randomUUID();
  const secondStudentId = randomUUID();
  let futureClassSessionId: string;

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `class_session_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test" });
    await db.insertInto("users").values([
      { id: administratorId, identity_issuer: "https://fake.local/", identity_subject: administratorSubject, display_name: "Alex Administrator", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: teacherId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Taylor Teacher", interface_locale: "es", display_time_zone: "America/Denver" },
      { id: studentId, identity_issuer: "https://fake.local/", identity_subject: studentSubject, display_name: "Sam Student", interface_locale: "en", display_time_zone: "America/Chicago" },
      { id: secondStudentId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Sofia Student", interface_locale: "es", display_time_zone: "America/Denver" },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: administratorId, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: teacherId, role: "TEACHER" },
      { user_id: studentId, role: "STUDENT" },
      { user_id: secondStudentId, role: "STUDENT" },
    ]).execute();
    await db.insertInto("teacher_profiles").values({ teacher_user_id: teacherId, pronouns: null, profile_image_url: null, professional_bio: "Teacher of practical conversation." }).execute();
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("publishes one 60-minute Class Session inside qualified Teacher Availability", async () => {
    const lessonUnitId = await insertLessonUnitAndQualification();
    await db.insertInto("teacher_availability_settings").values({ teacher_user_id: teacherId, time_zone: "America/Denver" }).execute();
    await db.insertInto("teacher_availability_ranges").values({ teacher_user_id: teacherId, weekday: 1, start_local_time: "09:00", end_local_time: "12:00", effective_from: "2026-08-10", effective_until: null, time_zone: "America/Denver" }).execute();
    const correlationId = `publish-session-${randomUUID()}`;

    const result = await graphql(`
      mutation Publish($input: PublishClassSessionInput!) {
        publishClassSession(input: $input) {
          ... on PublishClassSessionSuccess {
            classSession { id lessonUnitId teacherUserId startsAt endsAt schedulingTimeZone seatCapacity occupiedSeats }
          }
          ... on ClassSessionPublicationError { code message }
          ... on CurriculumConflict { conflictCode: code message }
        }
      }
    `, { input: {
      idempotencyKey: randomUUID(),
      lessonUnitId,
      teacherUserId: teacherId,
      startsAtLocal: "2026-08-10T10:00",
      schedulingTimeZone: "America/Denver",
      timeDisambiguation: "REJECT",
    } }, correlationId);

    expect(result).toMatchObject({ data: { publishClassSession: { classSession: {
      id: expect.any(String),
      lessonUnitId,
      teacherUserId: teacherId,
      startsAt: "2026-08-10T16:00:00Z",
      endsAt: "2026-08-10T17:00:00Z",
      schedulingTimeZone: "America/Denver",
      seatCapacity: 5,
      occupiedSeats: 0,
    } } } });
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({ outcome: "SUCCEEDED", reason_code: "CLASS_SESSION_PUBLISHED" });
    expect(await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", teacherId).execute()).toContainEqual({ message_id: "class-session.teacher-assigned.teacher" });
    expect(await db.selectFrom("email_notification_intents").select(["message_id", "locale", "rendered_content"]).where("recipient_user_id", "=", teacherId).executeTakeFirstOrThrow()).toMatchObject({ message_id: "class-session.teacher-assigned.teacher", locale: "es", rendered_content: expect.stringMatching(/10:00.*2026|2026.*10:00/) });
  });

  it("returns a typed qualification failure without creating partial inventory", async () => {
    const lessonUnitId = await insertLessonUnit("fr", "A1", false);
    const before = await classSessionCount();
    const correlationId = `qualification-required-${randomUUID()}`;
    const result = await publish({ lessonUnitId, startsAtLocal: "2026-08-10T11:00" }, correlationId);

    expect(result).toEqual({ data: { publishClassSession: {
      code: "TEACHER_QUALIFICATION_REQUIRED",
      message: "The Teacher needs a matching Teacher Qualification.",
    } } });
    expect(await classSessionCount()).toBe(before);
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({ outcome: "DENIED", reason_code: "TEACHER_QUALIFICATION_REQUIRED" });
  });

  it("replays the original publication outcome without duplicating inventory or notifications", async () => {
    const lessonUnitId = (await db.selectFrom("lesson_units").select("id").where("stable_key", "=", "en-a1-01").executeTakeFirstOrThrow()).id;
    const idempotencyKey = randomUUID();
    const first = await publish({ lessonUnitId, startsAtLocal: "2026-08-10T11:00" }, undefined, idempotencyKey);
    const replay = await publish({ lessonUnitId, startsAtLocal: "2026-08-10T11:00" }, "publication-replay", idempotencyKey);
    expect(replay).toEqual(first);
    expect(await db.selectFrom("class_sessions").select("id").where("starts_at", "=", new Date("2026-08-10T17:00:00Z")).execute()).toHaveLength(1);
    expect(await db.selectFrom("in_app_notifications").select("id").where("recipient_user_id", "=", teacherId).execute()).toHaveLength(2);
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", "publication-replay").executeTakeFirstOrThrow()).toEqual({ outcome: "SUCCEEDED", reason_code: "IDEMPOTENT_REPLAY_SUCCEEDED" });
  });

  it("schedules one durable Teacher reminder exactly 24 hours before a future Class Session", async () => {
    const lessonUnitId = await insertLessonUnit("it", "A1", true);
    await db.insertInto("teacher_availability_ranges").values({ teacher_user_id: teacherId, weekday: 1, start_local_time: "09:00", end_local_time: "12:00", effective_from: "2099-08-10", effective_until: "2099-08-10", time_zone: "America/Denver" }).execute();

    const publication = await publish({ lessonUnitId, startsAtLocal: "2099-08-10T10:00" });

    const classSessionId = (publication.data?.publishClassSession as { classSession: { id: string } }).classSession.id;
    futureClassSessionId = classSessionId;
    expect(await db.selectFrom("class_session_reminders").select(["class_session_id", "recipient_user_id", "commitment_role", "due_at", "terminal_outcome"]).where("class_session_id", "=", classSessionId).execute()).toEqual([{
      class_session_id: classSessionId,
      recipient_user_id: teacherId,
      commitment_role: "TEACHER",
      due_at: new Date("2099-08-09T16:00:00.000Z"),
      terminal_outcome: null,
    }]);
  });

  it("delivers a due Teacher reminder once and records a privacy-safe background Audit Entry", async () => {
    await deliverDueClassSessionReminders(db, new Date("2099-08-09T16:00:00.000Z"), "class-session-reminder-test");
    await deliverDueClassSessionReminders(db, new Date("2099-08-09T16:00:00.000Z"), "class-session-reminder-replay");

    const inAppReminders = await db.selectFrom("in_app_notifications").select("variables").where("recipient_user_id", "=", teacherId).where("message_id", "=", "class-session.reminder.teacher").execute();
    expect(inAppReminders.filter(({ variables }) => variables.classSessionId === futureClassSessionId)).toHaveLength(1);
    const emailReminders = await db.selectFrom("email_notification_intents").select(["locale", "variables", "rendered_content"]).where("recipient_user_id", "=", teacherId).where("message_id", "=", "class-session.reminder.teacher").execute();
    expect(emailReminders.filter(({ variables }) => variables.classSessionId === futureClassSessionId)).toEqual([{ locale: "es", variables: expect.any(Object), rendered_content: expect.stringMatching(/10:00.*2099|2099.*10:00/) }]);
    expect(await db.selectFrom("class_session_reminders").select(["terminal_outcome", "completed_at"]).where("class_session_id", "=", futureClassSessionId).executeTakeFirstOrThrow()).toEqual({ terminal_outcome: "DELIVERED", completed_at: new Date("2099-08-09T16:00:00.000Z") });
    expect(await db.selectFrom("audit_entries").select(["actor_user_id", "acting_role", "outcome", "reason_code"]).where("correlation_id", "=", "class-session-reminder-test").executeTakeFirstOrThrow()).toEqual({ actor_user_id: null, acting_role: null, outcome: "SUCCEEDED", reason_code: "CLASS_SESSION_REMINDER_DELIVERED" });
  });

  it("returns typed availability and schedule conflicts without creating a second Class Session", async () => {
    const unavailableUnitId = await insertLessonUnit("en", "A2", true);
    const unavailable = await publish({ lessonUnitId: unavailableUnitId, startsAtLocal: "2026-08-10T12:00" });
    expect(unavailable).toMatchObject({ data: { publishClassSession: { code: "TEACHER_AVAILABILITY_REQUIRED" } } });

    const existingUnit = await db.selectFrom("lesson_units").select("id").where("stable_key", "=", "en-a1-01").executeTakeFirstOrThrow();
    const before = await classSessionCount();
    const conflict = await publish({ lessonUnitId: existingUnit.id, startsAtLocal: "2026-08-10T10:30" });
    expect(conflict).toMatchObject({ data: { publishClassSession: { code: "TEACHER_SCHEDULE_CONFLICT" } } });
    expect(await classSessionCount()).toBe(before);
  });

  it("treats a Student commitment held by the Teacher User as a Schedule Conflict", async () => {
    const lessonUnitId = (await db.selectFrom("lesson_units").select("id").where("stable_key", "=", "en-a1-01").executeTakeFirstOrThrow()).id;
    const studentSession = await db.insertInto("class_sessions").values({ lesson_unit_id: lessonUnitId, teacher_user_id: teacherId, starts_at: new Date("2026-08-24T16:00:00Z"), scheduling_time_zone: "America/Denver", state: "CANCELLED" }).returning("id").executeTakeFirstOrThrow();
    await db.insertInto("schedule_commitments").values({ user_id: teacherId, class_session_id: studentSession.id, commitment_role: "STUDENT", starts_at: new Date("2026-08-24T16:00:00Z"), ends_at: new Date("2026-08-24T17:00:00Z"), active: true }).execute();
    await db.insertInto("schedule_commitments").values({ user_id: secondStudentId, class_session_id: studentSession.id, commitment_role: "STUDENT", starts_at: new Date("2026-08-24T16:00:00Z"), ends_at: new Date("2026-08-24T17:00:00Z"), active: true }).execute();
    expect(await db.selectFrom("schedule_commitments").select("id").where("class_session_id", "=", studentSession.id).where("commitment_role", "=", "STUDENT").execute()).toHaveLength(2);

    const result = await publish({ lessonUnitId, startsAtLocal: "2026-08-24T10:30" });
    expect(result).toMatchObject({ data: { publishClassSession: { code: "TEACHER_SCHEDULE_CONFLICT" } } });
  });

  it("does not describe a past Teacher assignment as imminent", async () => {
    const lessonUnitId = await insertLessonUnit("de", "A1", true);
    await db.insertInto("teacher_availability_ranges").values({ teacher_user_id: teacherId, weekday: 1, start_local_time: "09:00", end_local_time: "12:00", effective_from: "2026-08-03", effective_until: "2026-08-03", time_zone: "America/Denver" }).execute();

    const result = await publish({ lessonUnitId, startsAtLocal: "2026-08-03T10:00" });

    expect(result).toMatchObject({ data: { publishClassSession: { classSession: { id: expect.any(String) } } } });
    const notification = await db.selectFrom("email_notification_intents").select(["variables", "rendered_content"]).where("recipient_user_id", "=", teacherId).orderBy("created_at", "desc").executeTakeFirstOrThrow();
    expect(notification.variables).toMatchObject({ imminent: false });
    expect(notification.rendered_content).not.toContain("Asignación inminente");
  });

  it("rejects a fold occurrence that cannot fit within the declared wall-time availability", async () => {
    const lessonUnitId = await insertLessonUnit("es", "A2", true);
    await db.insertInto("teacher_availability_ranges").values({ teacher_user_id: teacherId, weekday: 7, start_local_time: "01:30", end_local_time: "01:31", effective_from: "2026-11-01", effective_until: "2026-11-01", time_zone: "America/New_York" }).execute();

    const result = await publish({ lessonUnitId, startsAtLocal: "2026-11-01T01:30", schedulingTimeZone: "America/New_York", timeDisambiguation: "EARLIER" });

    expect(result).toMatchObject({ data: { publishClassSession: { code: "TEACHER_AVAILABILITY_REQUIRED" } } });
  });

  it("publishes adjacent 60-minute occurrences from both sides of a daylight-saving fold", async () => {
    const lessonUnitId = (await db.selectFrom("lesson_units").select("id").where("stable_key", "=", "en-a1-01").executeTakeFirstOrThrow()).id;
    await db.insertInto("teacher_availability_ranges").values({ teacher_user_id: teacherId, weekday: 7, start_local_time: "01:00", end_local_time: "03:00", effective_from: "2026-11-01", effective_until: null, time_zone: "America/Denver" }).execute();
    const earlier = await publishWithSessionProjection({ lessonUnitId, startsAtLocal: "2026-11-01T01:30", timeDisambiguation: "EARLIER" });
    const later = await publishWithSessionProjection({ lessonUnitId, startsAtLocal: "2026-11-01T01:30", timeDisambiguation: "LATER" });
    expect(earlier).toMatchObject({ data: { publishClassSession: { classSession: { startsAt: "2026-11-01T07:30:00Z", endsAt: "2026-11-01T08:30:00Z" } } } });
    expect(later).toMatchObject({ data: { publishClassSession: { classSession: { startsAt: "2026-11-01T08:30:00Z", endsAt: "2026-11-01T09:30:00Z" } } } });
  });

  it("serializes publication with Teacher Qualification removal into typed outcomes", async () => {
    const lessonUnitId = await insertLessonUnit("en", "B2", true);
    const [publication, removal] = await Promise.all([
      publish({ lessonUnitId, startsAtLocal: "2026-08-31T10:00" }),
      graphql(`mutation Remove($input: ChangeTeacherQualificationInput!) { removeTeacherQualification(input: $input) { ... on ChangeTeacherQualificationSuccess { teacherProfile { id } } ... on TeacherQualificationRemovalBlocked { code classSessionIds } ... on CurriculumConflict { code } } }`, { input: { idempotencyKey: randomUUID(), teacherUserId: teacherId, targetLanguage: "en", curriculumLevel: "B2" } }),
    ]);
    const publicationSucceeded = JSON.stringify(publication).includes("classSession");
    if (publicationSucceeded) {
      expect(removal).toMatchObject({ data: { removeTeacherQualification: { code: "FUTURE_CLASS_SESSIONS_REQUIRE_QUALIFICATION" } } });
    } else {
      expect(publication).toMatchObject({ data: { publishClassSession: { code: "TEACHER_QUALIFICATION_REQUIRED" } } });
      expect(removal).toMatchObject({ data: { removeTeacherQualification: { teacherProfile: { id: teacherId } } } });
    }
  });

  it("rejects an Availability Exception, invalid Seat Capacity, and a daylight-saving gap as typed outcomes", async () => {
    const lessonUnitId = await insertLessonUnit("en", "B1", true);
    await db.insertInto("teacher_availability_ranges").values([
      { teacher_user_id: teacherId, weekday: 1, start_local_time: "09:00", end_local_time: "12:00", effective_from: "2026-08-17", effective_until: null, time_zone: "America/Denver" },
      { teacher_user_id: teacherId, weekday: 7, start_local_time: "01:00", end_local_time: "04:00", effective_from: "2026-03-08", effective_until: null, time_zone: "America/Denver" },
    ]).execute();
    await db.insertInto("availability_exceptions").values({ teacher_user_id: teacherId, starts_at_local: "2026-08-17T09:30", ends_at_local: "2026-08-17T11:30", starts_at: new Date("2026-08-17T15:30:00Z"), ends_at: new Date("2026-08-17T17:30:00Z"), time_zone: "America/Denver", removed_at: null }).execute();
    const before = await classSessionCount();

    expect(await publish({ lessonUnitId, startsAtLocal: "2026-08-17T10:00" })).toMatchObject({ data: { publishClassSession: { code: "AVAILABILITY_EXCEPTION_CONFLICT" } } });
    expect(await publish({ lessonUnitId, startsAtLocal: "2026-08-17T11:00", seatCapacity: 9 })).toMatchObject({ data: { publishClassSession: { code: "INVALID_SEAT_CAPACITY" } } });
    expect(await publish({ lessonUnitId, startsAtLocal: "2026-03-08T02:30" })).toMatchObject({ data: { publishClassSession: { code: "LOCAL_TIME_GAP" } } });
    expect(await classSessionCount()).toBe(before);
  });

  it("changes Seat Capacity within 2 through 8 but never below occupied seats, while preserving the start instant", async () => {
    const session = await db.selectFrom("class_sessions").selectAll().where("lesson_unit_id", "=", (await db.selectFrom("lesson_units").select("id").where("stable_key", "=", "en-a1-01").executeTakeFirstOrThrow()).id).executeTakeFirstOrThrow();
    const increased = await changeCapacity(session.id, 8);
    expect(increased).toMatchObject({ data: { changeClassSessionSeatCapacity: { classSession: { id: session.id, seatCapacity: 8, occupiedSeats: 0 } } } });

    await db.updateTable("class_sessions").set({ occupied_seats: 4 }).where("id", "=", session.id).execute();
    const before = await db.selectFrom("class_sessions").select(["seat_capacity", "starts_at"]).where("id", "=", session.id).executeTakeFirstOrThrow();
    const rejected = await changeCapacity(session.id, 3);
    expect(rejected).toMatchObject({ data: { changeClassSessionSeatCapacity: { code: "SEAT_CAPACITY_BELOW_OCCUPIED_SEATS" } } });
    expect(await db.selectFrom("class_sessions").select("seat_capacity").where("id", "=", session.id).executeTakeFirstOrThrow()).toEqual({ seat_capacity: before.seat_capacity });
    await expect(db.updateTable("class_sessions").set({ starts_at: new Date(before.starts_at.getTime() + 60_000) }).where("id", "=", session.id).execute()).rejects.toMatchObject({ code: "23514" });
  });

  it("denies Class Session administration without the Platform Administrator Role Assignment", async () => {
    const correlationId = `denied-class-session-${randomUUID()}`;
    const result = await graphql(`{ administrationClassSessions { id } }`, undefined, correlationId, studentSubject);
    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
    expect(await db.selectFrom("audit_entries").select(["actor_user_id", "outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({ actor_user_id: studentId, outcome: "DENIED", reason_code: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED" });

    const publishCorrelationId = `denied-publish-session-${randomUUID()}`;
    const deniedPublish = await graphql(`mutation Publish($input: PublishClassSessionInput!) { publishClassSession(input: $input) { ... on PublishClassSessionSuccess { classSession { id } } ... on ClassSessionPublicationError { code } ... on CurriculumConflict { conflictCode: code } } }`, { input: { idempotencyKey: randomUUID(), lessonUnitId: randomUUID(), teacherUserId: randomUUID(), startsAtLocal: "2026-08-10T10:00", schedulingTimeZone: "America/Denver", timeDisambiguation: "REJECT", seatCapacity: 5 } }, publishCorrelationId, studentSubject);
    expect(deniedPublish.errors?.[0]?.extensions.code).toBe("FORBIDDEN");

    const capacityCorrelationId = `denied-capacity-${randomUUID()}`;
    const deniedCapacity = await graphql(`mutation Capacity($input: ChangeClassSessionSeatCapacityInput!) { changeClassSessionSeatCapacity(input: $input) { ... on ChangeClassSessionSeatCapacitySuccess { classSession { id } } ... on ClassSessionSeatCapacityError { code } ... on CurriculumConflict { conflictCode: code } } }`, { input: { idempotencyKey: randomUUID(), classSessionId: randomUUID(), seatCapacity: 5 } }, capacityCorrelationId, studentSubject);
    expect(deniedCapacity.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
    expect(await db.selectFrom("audit_entries").select(["correlation_id", "outcome", "reason_code"]).where("correlation_id", "in", [publishCorrelationId, capacityCorrelationId]).orderBy("correlation_id").execute()).toEqual([
      { correlation_id: capacityCorrelationId, outcome: "DENIED", reason_code: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED" },
      { correlation_id: publishCorrelationId, outcome: "DENIED", reason_code: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED" },
    ].sort((left, right) => left.correlation_id.localeCompare(right.correlation_id)));
  });

  async function insertLessonUnitAndQualification() {
    return insertLessonUnit("en", "A1", true);
  }

  async function insertLessonUnit(targetLanguage: string, curriculumLevel: "A1" | "A2" | "B1" | "B2", qualified: boolean) {
    const stableKey = `${targetLanguage}-${curriculumLevel.toLowerCase()}`;
    const course = await db.insertInto("courses").values({ stable_key: stableKey, target_language: targetLanguage, curriculum_level: curriculumLevel, title: `${curriculumLevel} ${targetLanguage}`, summary: `${curriculumLevel} ${targetLanguage} summary` }).returning("id").executeTakeFirstOrThrow();
    const lessonUnit = await db.transaction().execute(async (transaction) => {
      const unit = await transaction.insertInto("lesson_units").values({ stable_key: `${stableKey}-01`, course_id: course.id, title: "Introductions", summary: "Practice introductions.", objectives: JSON.stringify(["Introduce yourself."]), sort_order: 1, state: "ACTIVE", replacement_lesson_unit_id: null, retired_at: null }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: unit.id, topic_key: "EC" }).execute();
      return unit;
    });
    if (qualified) await db.insertInto("teacher_qualifications").values({ teacher_user_id: teacherId, target_language: targetLanguage, curriculum_level: curriculumLevel, granted_by_user_id: administratorId }).execute();
    return lessonUnit.id;
  }

  async function publish(overrides: { lessonUnitId: string; startsAtLocal: string; schedulingTimeZone?: string; timeDisambiguation?: "REJECT" | "EARLIER" | "LATER"; seatCapacity?: number }, correlationId?: string, idempotencyKey = randomUUID()) {
    return graphql(`
      mutation Publish($input: PublishClassSessionInput!) {
        publishClassSession(input: $input) {
          ... on PublishClassSessionSuccess { classSession { id } }
          ... on ClassSessionPublicationError { code message }
          ... on CurriculumConflict { conflictCode: code message }
        }
      }
    `, { input: {
      idempotencyKey,
      teacherUserId: teacherId,
      schedulingTimeZone: "America/Denver",
      timeDisambiguation: "REJECT",
      ...overrides,
    } }, correlationId);
  }

  async function publishWithSessionProjection(overrides: { lessonUnitId: string; startsAtLocal: string; timeDisambiguation: "EARLIER" | "LATER" }) {
    return graphql(`
      mutation Publish($input: PublishClassSessionInput!) {
        publishClassSession(input: $input) {
          ... on PublishClassSessionSuccess { classSession { startsAt endsAt } }
          ... on ClassSessionPublicationError { code }
          ... on CurriculumConflict { conflictCode: code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), teacherUserId: teacherId, schedulingTimeZone: "America/Denver", seatCapacity: 5, ...overrides } });
  }

  async function classSessionCount() {
    const result = await db.selectFrom("class_sessions").select(({ fn }) => fn.countAll<number>().as("count")).executeTakeFirstOrThrow();
    return Number(result.count);
  }

  async function changeCapacity(classSessionId: string, seatCapacity: number) {
    return graphql(`
      mutation ChangeCapacity($input: ChangeClassSessionSeatCapacityInput!) {
        changeClassSessionSeatCapacity(input: $input) {
          ... on ChangeClassSessionSeatCapacitySuccess { classSession { id seatCapacity occupiedSeats } }
          ... on ClassSessionSeatCapacityError { code message }
          ... on CurriculumConflict { conflictCode: code message }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), classSessionId, seatCapacity } });
  }

  async function graphql(query: string, variables?: Record<string, unknown>, correlationId?: string, subject = administratorSubject) {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-demo-user-id": subject,
        ...(correlationId ? { "x-correlation-id": correlationId } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
    return await response.json() as { data: Record<string, unknown> | null; errors?: Array<{ extensions: { code: string } }> };
  }
});
