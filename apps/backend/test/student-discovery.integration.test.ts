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

describe("Student Placement and Class Session Discovery GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  const studentId = randomUUID();
  const studentSubject = randomUUID();
  const teacherId = randomUUID();
  const secondTeacherId = randomUUID();
  const now = new Date("2026-08-05T12:00:00.000Z");
  let spanishUnitId: string;

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `student_discovery_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test", now: () => now });
    await db
      .insertInto("users")
      .values([
        {
          id: studentId,
          identity_issuer: "https://fake.local/",
          identity_subject: studentSubject,
          display_name: "Sam Student",
          interface_locale: "en",
          display_time_zone: "America/Denver",
        },
        {
          id: teacherId,
          identity_issuer: "https://fake.local/",
          identity_subject: randomUUID(),
          display_name: "Taylor Teacher",
          interface_locale: "en",
          display_time_zone: "America/Denver",
        },
        {
          id: secondTeacherId,
          identity_issuer: "https://fake.local/",
          identity_subject: randomUUID(),
          display_name: "Morgan Teacher",
          interface_locale: "es",
          display_time_zone: "Europe/Madrid",
        },
      ])
      .execute();
    await db
      .insertInto("role_assignments")
      .values([
        { user_id: studentId, role: "STUDENT" },
        { user_id: teacherId, role: "TEACHER" },
        { user_id: secondTeacherId, role: "TEACHER" },
      ])
      .execute();
    await seedDiscoveryCatalog();
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("sets the Student's current placement for one target language and audits the mutation", async () => {
    const correlationId = `student-placement-${randomUUID()}`;
    const result = await graphql(
      `
        mutation SetStudentPlacement($input: SetStudentPlacementInput!) {
          setStudentPlacement(input: $input) {
            targetLanguage
            curriculumLevel
          }
        }
      `,
      {
        input: { targetLanguage: "es", curriculumLevel: "B1" },
      },
      correlationId,
    );

    expect(result).toEqual({
      data: {
        setStudentPlacement: {
          targetLanguage: "es",
          curriculumLevel: "B1",
        },
      },
    });
    expect(
      await db
        .selectFrom("audit_entries")
        .select(["actor_user_id", "acting_role", "outcome", "reason_code"])
        .where("correlation_id", "=", correlationId)
        .executeTakeFirstOrThrow(),
    ).toEqual({
      actor_user_id: studentId,
      acting_role: "STUDENT",
      outcome: "SUCCEEDED",
      reason_code: "STUDENT_PLACEMENT_CHANGED",
    });

    expect(await graphql(`query { studentPlacements { targetLanguage curriculumLevel } }`)).toEqual({
      data: { studentPlacements: [{ targetLanguage: "es", curriculumLevel: "B1" }] },
    });
    expect(await graphql(`query { classSessionDiscoveryOptions { targetLanguages topics { key label } teachers { id displayName } } }`)).toMatchObject({
      data: {
        classSessionDiscoveryOptions: {
          targetLanguages: ["es"],
          topics: expect.arrayContaining([{ key: "EC", label: "Everyday Conversation" }]),
          teachers: expect.arrayContaining([{ id: teacherId, displayName: "Taylor Teacher" }]),
        },
      },
    });
  });

  it("rejects an invalid Student Placement and records a denied Audit Entry", async () => {
    const correlationId = `invalid-student-placement-${randomUUID()}`;
    const result = await graphql(`
      mutation {
        setStudentPlacement(input: { targetLanguage: "SPANISH", curriculumLevel: A1 }) {
          targetLanguage
        }
      }
    `, undefined, correlationId);

    expect(result).toMatchObject({
      data: null,
      errors: [{ extensions: { code: "BAD_USER_INPUT" } }],
    });
    expect(await db.selectFrom("audit_entries")
      .select(["outcome", "reason_code"])
      .where("correlation_id", "=", correlationId)
      .executeTakeFirstOrThrow()).toEqual({
      outcome: "DENIED",
      reason_code: "INVALID_STUDENT_PLACEMENT",
    });
  });

  it("denies a placement mutation to a User without the Student Role Assignment against the correct Audit target", async () => {
    const correlationId = `placement-role-denied-${randomUUID()}`;
    const result = await graphqlAs(secondTeacherId, `
      mutation {
        setStudentPlacement(input: { targetLanguage: "es", curriculumLevel: A1 }) {
          targetLanguage
        }
      }
    `, correlationId);

    expect(result).toMatchObject({ data: null, errors: [{ extensions: { code: "FORBIDDEN" } }] });
    expect(await db.selectFrom("audit_entries")
      .select(["operation", "target_type", "outcome", "reason_code"])
      .where("correlation_id", "=", correlationId)
      .executeTakeFirstOrThrow()).toEqual({
      operation: "student-placement.changed",
      target_type: "StudentPlacement",
      outcome: "DENIED",
      reason_code: "STUDENT_ROLE_REQUIRED",
    });
  });

  it("defaults to the relevant Student Placement and returns only actionable sessions across the next seven local dates", async () => {
    const sessions = [
      { startsAt: "2026-08-06T16:00:00.000Z", occupiedSeats: 2, teacherUserId: teacherId },
      { startsAt: "2026-08-06T17:00:00.000Z", occupiedSeats: 5, teacherUserId: teacherId },
      { startsAt: "2026-08-05T13:00:00.000Z", occupiedSeats: 5, teacherUserId: teacherId },
      { startsAt: "2026-08-05T12:20:00.000Z", occupiedSeats: 2, teacherUserId: secondTeacherId },
      { startsAt: "2026-08-12T16:00:00.000Z", occupiedSeats: 0, teacherUserId: teacherId },
    ];
    for (const session of sessions) {
      await insertClassSession({
        lessonUnitId: spanishUnitId,
        ...session,
      });
    }

    const result = await graphql(`
      query Discover($input: ClassSessionDiscoveryInput!) {
        discoverClassSessions(input: $input) {
          appliedFilter { targetLanguage curriculumLevel localDate }
          nodes {
            id startsAt endsAt seatCapacity occupiedSeats
            lessonUnit { id title summary objectives topics { key label } }
            teacherProfile {
              id displayName pronouns professionalBiography
              taughtLanguages qualifiedCurriculumLevels
              teachingTopics { key label }
            }
          }
          pageInfo { endCursor hasNextPage }
        }
      }
    `, { input: { targetLanguage: "es" } });

    expect(result).toEqual({ data: { discoverClassSessions: {
      appliedFilter: {
        targetLanguage: "es",
        curriculumLevel: "B1",
        localDate: null,
      },
      nodes: [
        expect.objectContaining({
          startsAt: "2026-08-06T16:00:00Z",
          endsAt: "2026-08-06T17:00:00Z",
          occupiedSeats: 2,
          seatCapacity: 5,
          lessonUnit: expect.objectContaining({
            id: spanishUnitId,
            title: "Conversación práctica",
            topics: [{ key: "EC", label: "Everyday Conversation" }],
          }),
          teacherProfile: expect.objectContaining({
            id: teacherId,
            displayName: "Taylor Teacher",
            taughtLanguages: ["es"],
            qualifiedCurriculumLevels: ["B1"],
          }),
        }),
        expect.objectContaining({
          startsAt: "2026-08-06T17:00:00Z",
          occupiedSeats: 5,
          seatCapacity: 5,
        }),
      ],
      pageInfo: { endCursor: null, hasNextPage: false },
    } } });
    expect(JSON.stringify(result)).not.toMatch(/student|waitlist/i);
  });

  it("applies exact and match-any filters with stable cursor pagination in groups of 20", async () => {
    const inserted: Array<{ id: string; startsAt: string }> = [];
    for (let index = 0; index < 21; index += 1) {
      const startsAt = new Date(Date.parse("2026-08-07T00:00:00.000Z") + index * 2 * 60 * 60_000).toISOString();
      const session = await insertClassSession({
        lessonUnitId: spanishUnitId,
        teacherUserId: secondTeacherId,
        startsAt,
        occupiedSeats: index % 5,
      });
      inserted.push({ id: session.id, startsAt: startsAt.replace(".000Z", "Z") });
    }

    const query = `
      query Discover($input: ClassSessionDiscoveryInput!) {
        discoverClassSessions(input: $input) {
          nodes { id startsAt teacherProfile { id } lessonUnit { topics { key } } }
          pageInfo { endCursor hasNextPage }
        }
      }
    `;
    const filter = {
      targetLanguage: "es",
      curriculumLevel: "B1",
      teacherUserId: secondTeacherId,
      topicKeys: ["EC", "RW"],
    };
    const first = await graphql(query, { input: filter }) as DiscoveryResponse;
    expect(first.data.discoverClassSessions.nodes).toHaveLength(20);
    expect(first.data.discoverClassSessions.nodes).toEqual(
      Array.from({ length: 20 }, () => expect.objectContaining({
        teacherProfile: { id: secondTeacherId },
        lessonUnit: { topics: [{ key: "EC" }] },
      })),
    );
    expect(first.data.discoverClassSessions.pageInfo).toEqual({
      endCursor: expect.any(String),
      hasNextPage: true,
    });

    const second = await graphql(query, {
      input: { ...filter, after: first.data.discoverClassSessions.pageInfo.endCursor },
    }) as DiscoveryResponse;
    expect(second.data.discoverClassSessions.nodes).toHaveLength(1);
    expect(second.data.discoverClassSessions.pageInfo).toEqual({
      endCursor: null,
      hasNextPage: false,
    });
    expect([
      ...first.data.discoverClassSessions.nodes,
      ...second.data.discoverClassSessions.nodes,
    ].map(({ id, startsAt }) => ({ id, startsAt }))).toEqual(inserted);

    const localDate = await graphql(query, {
      input: { ...filter, localDate: "2026-08-08" },
    }) as DiscoveryResponse;
    expect(localDate.data.discoverClassSessions.nodes.map(({ startsAt }) => startsAt)).toEqual(
      inserted
        .filter(({ startsAt }) => startsAt >= "2026-08-08T06:00:00Z" && startsAt < "2026-08-09T06:00:00Z")
        .map(({ startsAt }) => startsAt),
    );

    const invalidCursor = await graphql(query, { input: { ...filter, after: "not-a-cursor" } }) as {
      data: null;
      errors: Array<{ extensions: { code: string } }>;
    };
    expect(invalidCursor.data).toBeNull();
    expect(invalidCursor.errors[0]?.extensions.code).toBe("BAD_USER_INPUT");
  });

  it("orders equal-start sessions by stable identity and keeps a 25-hour daylight-saving date intact", async () => {
    const equalStart = "2026-08-11T00:00:00.000Z";
    const equalStartSessions = await Promise.all([
      insertClassSession({ lessonUnitId: spanishUnitId, teacherUserId: teacherId, startsAt: equalStart, occupiedSeats: 1 }),
      insertClassSession({ lessonUnitId: spanishUnitId, teacherUserId: secondTeacherId, startsAt: equalStart, occupiedSeats: 2 }),
    ]);
    const tieBreak = await graphql(`
      query {
        discoverClassSessions(input: { targetLanguage: "es", localDate: "2026-08-10" }) {
          nodes { id startsAt }
        }
      }
    `) as { data: { discoverClassSessions: { nodes: Array<{ id: string; startsAt: string }> } } };
    expect(tieBreak.data.discoverClassSessions.nodes).toEqual(
      equalStartSessions.map(({ id }) => ({ id, startsAt: equalStart.replace(".000Z", "Z") })).sort((left, right) => left.id.localeCompare(right.id)),
    );

    const dstSessions = await Promise.all([
      insertClassSession({ lessonUnitId: spanishUnitId, teacherUserId: teacherId, startsAt: "2026-11-01T06:30:00.000Z", occupiedSeats: 0 }),
      insertClassSession({ lessonUnitId: spanishUnitId, teacherUserId: teacherId, startsAt: "2026-11-02T06:30:00.000Z", occupiedSeats: 0 }),
    ]);
    const dstDate = await graphql(`
      query {
        discoverClassSessions(input: { targetLanguage: "es", localDate: "2026-11-01" }) {
          nodes { id startsAt }
        }
      }
    `) as { data: { discoverClassSessions: { nodes: Array<{ id: string; startsAt: string }> } } };
    expect(dstDate.data.discoverClassSessions.nodes.map(({ id }) => id)).toEqual(dstSessions.map(({ id }) => id));
  });

  it("denies Class Session Discovery to a User without the Student Role Assignment", async () => {
    const correlationId = `discovery-denied-${randomUUID()}`;
    const result = await graphqlAs(secondTeacherId, `
      query {
        discoverClassSessions(input: { targetLanguage: "es" }) {
          nodes { id }
        }
      }
    `, correlationId);

    expect(result).toMatchObject({
      data: null,
      errors: [{ extensions: { code: "FORBIDDEN" } }],
    });
    expect(await db.selectFrom("audit_entries")
      .select(["actor_user_id", "acting_role", "operation", "target_type", "outcome", "reason_code"])
      .where("correlation_id", "=", correlationId)
      .executeTakeFirstOrThrow()).toEqual({
      actor_user_id: secondTeacherId,
      acting_role: "STUDENT",
      operation: "class-session-discovery.read",
      target_type: "ClassSessionDiscovery",
      outcome: "DENIED",
      reason_code: "STUDENT_ROLE_REQUIRED",
    });
  });

  async function graphql(
    query: string,
    variables?: Record<string, unknown>,
    correlationId: string = randomUUID(),
  ) {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
        "x-demo-user-id": studentSubject,
      },
      body: JSON.stringify({ query, variables }),
    });
    return response.json() as Promise<Record<string, unknown>>;
  }

  async function graphqlAs(userId: string, query: string, correlationId: string) {
    const user = await db.selectFrom("users").select("identity_subject").where("id", "=", userId).executeTakeFirstOrThrow();
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
        "x-demo-user-id": user.identity_subject!,
      },
      body: JSON.stringify({ query }),
    });
    return response.json() as Promise<Record<string, unknown>>;
  }

  async function seedDiscoveryCatalog() {
    await db.insertInto("teacher_profiles").values([
      { teacher_user_id: teacherId, pronouns: "they/them", profile_image_url: null, professional_bio: "Conversation-focused teacher." },
      { teacher_user_id: secondTeacherId, pronouns: null, profile_image_url: null, professional_bio: "Grammar-focused teacher." },
    ]).execute();
    await db.insertInto("teacher_profile_topics").values([
      { teacher_user_id: teacherId, topic_key: "EC" },
      { teacher_user_id: secondTeacherId, topic_key: "GS" },
    ]).execute();
    spanishUnitId = await db.transaction().execute(async (transaction) => {
      const course = await transaction.insertInto("courses").values({
        stable_key: "es-b1",
        target_language: "es",
        curriculum_level: "B1",
        title: "Español B1",
        summary: "Curso de español.",
      }).returning("id").executeTakeFirstOrThrow();
      const unit = await transaction.insertInto("lesson_units").values({
        stable_key: "es-b1-01",
        course_id: course.id,
        title: "Conversación práctica",
        summary: "Practica conversaciones cotidianas.",
        objectives: JSON.stringify(["Mantener una conversación."]),
        sort_order: 1,
        state: "ACTIVE",
        replacement_lesson_unit_id: null,
        retired_at: null,
      }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: unit.id, topic_key: "EC" }).execute();
      return unit.id;
    });
    await db.insertInto("teacher_qualifications").values([
      { teacher_user_id: teacherId, target_language: "es", curriculum_level: "B1", granted_by_user_id: studentId },
      { teacher_user_id: secondTeacherId, target_language: "es", curriculum_level: "B1", granted_by_user_id: studentId },
    ]).execute();
  }

  async function insertClassSession(input: {
    lessonUnitId: string;
    teacherUserId: string;
    startsAt: string;
    occupiedSeats: number;
  }) {
    return db.insertInto("class_sessions").values({
      lesson_unit_id: input.lessonUnitId,
      teacher_user_id: input.teacherUserId,
      starts_at: new Date(input.startsAt),
      scheduling_time_zone: "America/Denver",
      seat_capacity: 5,
      occupied_seats: input.occupiedSeats,
      state: "PUBLISHED",
    }).returning("id").executeTakeFirstOrThrow();
  }
});

type DiscoveryResponse = {
  data: {
    discoverClassSessions: {
      nodes: Array<{
        id: string;
        startsAt: string;
        teacherProfile: { id: string };
        lessonUnit: { topics: Array<{ key: string }> };
      }>;
      pageInfo: { endCursor: string | null; hasNextPage: boolean };
    };
  };
};
