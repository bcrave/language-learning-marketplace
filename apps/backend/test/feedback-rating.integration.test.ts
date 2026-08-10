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

describe("Learning Feedback and Session Rating GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  const administratorId = randomUUID();
  const administratorSubject = randomUUID();
  const teacherId = randomUUID();
  const teacherSubject = randomUUID();
  const studentId = randomUUID();
  const studentSubject = randomUUID();
  const now = new Date("2026-08-10T12:00:00.000Z");
  let currentNow = now;
  let classSessionId: string;
  let bookingId: string;

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `feedback_rating_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test", now: () => currentNow });

    await db.insertInto("users").values([
      { id: administratorId, identity_issuer: "https://fake.local/", identity_subject: administratorSubject, display_name: "Alex Administrator", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: teacherId, identity_issuer: "https://fake.local/", identity_subject: teacherSubject, display_name: "Taylor Teacher", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: studentId, identity_issuer: "https://fake.local/", identity_subject: studentSubject, display_name: "Sam Student", interface_locale: "en", display_time_zone: "America/Denver" },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: administratorId, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: teacherId, role: "TEACHER" },
      { user_id: studentId, role: "STUDENT" },
    ]).execute();
    const course = await db.insertInto("courses").values({ stable_key: "es-b2", target_language: "es", curriculum_level: "B2", title: "Spanish B2", summary: "Upper-intermediate Spanish" }).returning("id").executeTakeFirstOrThrow();
    const lessonUnit = await db.transaction().execute(async (transaction) => {
      const inserted = await transaction.insertInto("lesson_units").values({ stable_key: "es-b2-99", course_id: course.id, title: "Tell a story", summary: "Narrate a past experience", objectives: JSON.stringify(["Narrate clearly"]), sort_order: 1, state: "ACTIVE", replacement_lesson_unit_id: null, retired_at: null }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: inserted.id, topic_key: "EC" }).execute();
      return inserted;
    });
    await db.insertInto("student_placements").values({ student_user_id: studentId, target_language: "es", curriculum_level: "B2" }).execute();
    await db.insertInto("teacher_qualifications").values({ teacher_user_id: teacherId, target_language: "es", curriculum_level: "B2", granted_by_user_id: administratorId }).execute();
    classSessionId = (await db.insertInto("class_sessions").values({ lesson_unit_id: lessonUnit.id, teacher_user_id: teacherId, starts_at: new Date("2026-08-10T10:00:00.000Z"), scheduling_time_zone: "America/Denver", seat_capacity: 5, occupied_seats: 1, state: "PUBLISHED" }).returning("id").executeTakeFirstOrThrow()).id;
    bookingId = (await db.insertInto("bookings").values({ student_user_id: studentId, class_session_id: classSessionId, teacher_user_id_at_booking: teacherId, state: "ACTIVE", terminal_reason: null, class_credit_refunded: false, late_cancellation_refund_until: null, booked_at: new Date("2026-08-01T12:00:00.000Z"), ended_at: null }).returning("id").executeTakeFirstOrThrow()).id;
    await db.insertInto("attendance_records").values({ booking_id: bookingId, outcome: "ATTENDED", submitted_by_user_id: teacherId, submitted_at: new Date("2026-08-10T11:05:00.000Z"), updated_at: new Date("2026-08-10T11:05:00.000Z") }).execute();
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("keeps a Teacher Learning Feedback draft private until explicit submission", async () => {
    const draftCorrelationId = `feedback-draft-${randomUUID()}`;
    const draft = await graphql(`
      mutation SaveLearningFeedback($input: SaveLearningFeedbackInput!) {
        saveLearningFeedback(input: $input) {
          ... on SaveLearningFeedbackSuccess { feedback { bookingId state observedStrengths observations } }
          ... on LearningFeedbackError { code message }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), bookingId, observedStrengths: ["SPOKEN_PRODUCTION"], suggestedFocuses: [], observations: "You told the story in a clear sequence.", nextPractice: "", submit: false } }, draftCorrelationId, teacherSubject);
    expect(draft.errors).toBeUndefined();
    expect(draft).toMatchObject({ data: { saveLearningFeedback: { feedback: { bookingId, state: "DRAFT", observedStrengths: ["SPOKEN_PRODUCTION"], observations: "You told the story in a clear sequence." } } } });

    const beforeSubmission = await studentLearning();
    expect(beforeSubmission).toMatchObject({ data: { studentFeedbackAndRatings: [{ bookingId, learningFeedback: null }] } });
    const administratorBeforeSubmission = await graphql(`query Quality { administratorFeedbackAndRatings { bookingId learningFeedback { state observations } } }`, {}, randomUUID(), administratorSubject);
    expect(administratorBeforeSubmission).toMatchObject({ data: { administratorFeedbackAndRatings: [{ bookingId, learningFeedback: null }] } });

    currentNow = new Date("2026-08-10T12:30:00.000Z");
    const submitCorrelationId = `feedback-submit-${randomUUID()}`;
    const submitted = await graphql(`
      mutation SaveLearningFeedback($input: SaveLearningFeedbackInput!) {
        saveLearningFeedback(input: $input) {
          ... on SaveLearningFeedbackSuccess { feedback { bookingId state observedStrengths suggestedFocuses observations nextPractice } }
          ... on LearningFeedbackError { code message }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), bookingId, observedStrengths: ["SPOKEN_PRODUCTION"], suggestedFocuses: ["PRONUNCIATION"], observations: "You told the story in a clear sequence.", nextPractice: "Practice the two target vowel sounds.", submit: true } }, submitCorrelationId, teacherSubject);
    expect(submitted).toMatchObject({ data: { saveLearningFeedback: { feedback: { bookingId, state: "SUBMITTED", suggestedFocuses: ["PRONUNCIATION"], nextPractice: "Practice the two target vowel sounds." } } } });
    expect(await studentLearning()).toMatchObject({ data: { studentFeedbackAndRatings: [{ bookingId, learningFeedback: { state: "SUBMITTED", observations: "You told the story in a clear sequence." } }] } });
    currentNow = new Date("2026-08-10T13:00:00.000Z");
    const revised = await graphql(`mutation Revise($input: SaveLearningFeedbackInput!) { saveLearningFeedback(input: $input) { ... on SaveLearningFeedbackSuccess { feedback { state nextPractice } } ... on LearningFeedbackError { code } } }`, { input: { idempotencyKey: randomUUID(), bookingId, observedStrengths: ["SPOKEN_PRODUCTION"], suggestedFocuses: ["PRONUNCIATION"], observations: "You told the story in a clear sequence.", nextPractice: "Practice the target sounds in three new sentences.", submit: true } }, randomUUID(), teacherSubject);
    expect(revised).toMatchObject({ data: { saveLearningFeedback: { feedback: { state: "SUBMITTED", nextPractice: "Practice the target sounds in three new sentences." } } } });
    expect(await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", studentId).execute()).toContainEqual({ message_id: "learning-feedback.submitted.student" });
    expect(await db.selectFrom("in_app_notifications").select("id").where("recipient_user_id", "=", studentId).where("message_id", "=", "learning-feedback.submitted.student").execute()).toHaveLength(1);
    expect(await db.selectFrom("student_placements").select("curriculum_level").where("student_user_id", "=", studentId).executeTakeFirstOrThrow()).toEqual({ curriculum_level: "B2" });
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", draftCorrelationId).executeTakeFirstOrThrow()).toEqual({ outcome: "SUCCEEDED", reason_code: "LEARNING_FEEDBACK_DRAFT_SAVED" });
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", submitCorrelationId).executeTakeFirstOrThrow()).toEqual({ outcome: "SUCCEEDED", reason_code: "LEARNING_FEEDBACK_SUBMITTED" });
  });

  it("lets the Student submit and edit one private Session Rating while administrators can inspect it", async () => {
    currentNow = new Date("2026-08-10T13:00:00.000Z");
    const submittedCorrelationId = `rating-submit-${randomUUID()}`;
    const submitted = await graphql(`
      mutation SaveSessionRating($input: SaveSessionRatingInput!) {
        saveSessionRating(input: $input) {
          ... on SaveSessionRatingSuccess { rating { bookingId overallRating positiveTags improvementTags comment } }
          ... on SessionRatingError { code message }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), bookingId, overallRating: 4, positiveTags: ["SUPPORTIVE"], improvementTags: ["MORE_SPEAKING_TIME"], comment: "A useful session." } }, submittedCorrelationId, studentSubject);
    expect(submitted.errors).toBeUndefined();
    expect(submitted).toMatchObject({ data: { saveSessionRating: { rating: { bookingId, overallRating: 4, positiveTags: ["SUPPORTIVE"], improvementTags: ["MORE_SPEAKING_TIME"], comment: "A useful session." } } } });

    currentNow = new Date("2026-08-14T12:00:00.000Z");
    const revisedCorrelationId = `rating-revise-${randomUUID()}`;
    const revised = await graphql(`mutation Revise($input: SaveSessionRatingInput!) { saveSessionRating(input: $input) { ... on SaveSessionRatingSuccess { rating { bookingId overallRating comment } } ... on SessionRatingError { code } } }`, { input: { idempotencyKey: randomUUID(), bookingId, overallRating: 5, positiveTags: ["SUPPORTIVE", "ENGAGING"], improvementTags: [], comment: "The speaking practice was especially useful." } }, revisedCorrelationId, studentSubject);
    expect(revised).toMatchObject({ data: { saveSessionRating: { rating: { bookingId, overallRating: 5, comment: "The speaking practice was especially useful." } } } });
    expect(await db.selectFrom("session_ratings").select(["booking_id", "overall_rating"]).where("student_user_id", "=", studentId).execute()).toEqual([{ booking_id: bookingId, overall_rating: 5 }]);
    expect(await db.selectFrom("in_app_notifications").select("message_id").where("message_id", "like", "session-rating.%").execute()).toEqual([]);

    const administrator = await graphql(`query Quality { administratorFeedbackAndRatings { bookingId studentDisplayName teacherDisplayName sessionRating { overallRating comment } } }`, {}, randomUUID(), administratorSubject);
    expect(administrator).toMatchObject({ data: { administratorFeedbackAndRatings: [{ bookingId, studentDisplayName: "Sam Student", teacherDisplayName: "Taylor Teacher", sessionRating: { overallRating: 5 } }] } });
    const teacher = await graphql(`query Work { teacherFeedbackWork { bookingId sessionRating { overallRating } } }`, {}, randomUUID(), teacherSubject);
    expect(teacher).toMatchObject({ data: { teacherFeedbackWork: [] } });
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", revisedCorrelationId).executeTakeFirstOrThrow()).toEqual({ outcome: "SUCCEEDED", reason_code: "SESSION_RATING_REVISED" });
  });

  it("closes both authoring windows at their correction-aware deadlines", async () => {
    currentNow = new Date("2026-08-17T11:00:00.001Z");
    const rating = await graphql(`mutation Save($input: SaveSessionRatingInput!) { saveSessionRating(input: $input) { ... on SaveSessionRatingSuccess { rating { bookingId } } ... on SessionRatingError { code } } }`, { input: { idempotencyKey: randomUUID(), bookingId, overallRating: 5, positiveTags: [], improvementTags: [], comment: "" } }, randomUUID(), studentSubject);
    expect(rating).toMatchObject({ data: { saveSessionRating: { code: "RATING_WINDOW_CLOSED" } } });

    const feedback = await graphql(`mutation Save($input: SaveLearningFeedbackInput!) { saveLearningFeedback(input: $input) { ... on SaveLearningFeedbackSuccess { feedback { bookingId } } ... on LearningFeedbackError { code } } }`, { input: { idempotencyKey: randomUUID(), bookingId, observedStrengths: ["READING"], suggestedFocuses: [], observations: "", nextPractice: "", submit: true } }, randomUUID(), teacherSubject);
    expect(feedback).toMatchObject({ data: { saveLearningFeedback: { code: "FEEDBACK_WINDOW_CLOSED" } } });
  });

  it("denies and audits a Teacher attempting to read Student-private quality data", async () => {
    const correlationId = `private-quality-denied-${randomUUID()}`;
    const result = await graphql(`query PrivateStudentQuality { studentFeedbackAndRatings { bookingId sessionRating { overallRating } } }`, {}, correlationId, teacherSubject);
    expect(result.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    expect(await db.selectFrom("audit_entries").select(["acting_role", "operation", "target_type", "outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow()).toEqual({ acting_role: "STUDENT", operation: "learning-feedback-and-session-rating.read", target_type: "LearningFeedback", outcome: "DENIED", reason_code: "STUDENT_ROLE_REQUIRED" });
  });

  it("hides preserved records after an Attended-to-No-show correction and reactivates them after restoration", async () => {
    const voidedAt = new Date("2026-08-18T12:00:00.000Z");
    await db.transaction().execute(async (transaction) => {
      await transaction.updateTable("attendance_records").set({ outcome: "NO_SHOW", updated_at: voidedAt }).where("booking_id", "=", bookingId).execute();
      await transaction.insertInto("attendance_record_corrections").values({ booking_id: bookingId, prior_outcome: "ATTENDED", corrected_outcome: "NO_SHOW", corrected_by_user_id: administratorId, reason: "Administrator verified the corrected attendance record.", corrected_at: voidedAt }).execute();
    });
    expect(await studentLearning()).toMatchObject({ data: { studentFeedbackAndRatings: [] } });
    expect(await graphql(`query Quality { administratorFeedbackAndRatings { bookingId } }`, {}, randomUUID(), administratorSubject)).toMatchObject({ data: { administratorFeedbackAndRatings: [] } });

    const restoredAt = new Date("2026-08-20T12:00:00.000Z");
    await db.transaction().execute(async (transaction) => {
      await transaction.updateTable("attendance_records").set({ outcome: "ATTENDED", updated_at: restoredAt }).where("booking_id", "=", bookingId).execute();
      await transaction.insertInto("attendance_record_corrections").values({ booking_id: bookingId, prior_outcome: "NO_SHOW", corrected_outcome: "ATTENDED", corrected_by_user_id: administratorId, reason: "Administrator restored the verified attendance record.", corrected_at: restoredAt }).execute();
    });
    currentNow = new Date("2026-08-20T13:00:00.000Z");
    expect(await studentLearning()).toMatchObject({ data: { studentFeedbackAndRatings: [{ bookingId, learningFeedback: { state: "SUBMITTED" }, sessionRating: { overallRating: 5 } }] } });
    expect(await graphql(`query Work { teacherFeedbackWork { bookingId feedbackDeadline } }`, {}, randomUUID(), teacherSubject)).toMatchObject({ data: { teacherFeedbackWork: [{ bookingId, feedbackDeadline: "2026-08-22T12:00:00.000Z" }] } });
  });

  async function studentLearning() {
    return graphql(`query StudentFeedbackAndRatings { studentFeedbackAndRatings { bookingId learningFeedback { state observations } sessionRating { overallRating } } }`, {}, randomUUID(), studentSubject);
  }

  async function graphql(source: string, variables: Record<string, unknown>, correlationId: string, subject: string) {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", "x-correlation-id": correlationId, "x-demo-user-id": subject },
      body: JSON.stringify({ query: source, variables }),
    });
    return response.json() as Promise<{ data?: Record<string, unknown>; errors?: Array<{ message?: string; extensions?: { code?: string } }> }>;
  }
});
