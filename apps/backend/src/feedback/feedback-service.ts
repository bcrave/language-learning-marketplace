import {
  FEEDBACK_SKILLS,
  SESSION_RATING_IMPROVEMENT_TAGS,
  SESSION_RATING_POSITIVE_TAGS,
  feedbackWindowIsOpen,
  feedbackDeadline,
  sessionRatingDeadline,
  sessionRatingWindowIsOpen,
  type FeedbackSkill,
  type SessionRatingImprovementTag,
  type SessionRatingPositiveTag,
} from "@marketplace/core";

import type { Database } from "../database/database.js";
import { notifyLearningFeedbackSubmitted } from "./feedback-notifications.js";
import { sql } from "kysely";

type LearningFeedbackInput = {
  bookingId: string;
  observedStrengths: FeedbackSkill[];
  suggestedFocuses: FeedbackSkill[];
  observations?: string | null;
  nextPractice?: string | null;
  submit: boolean;
};

type SessionRatingInput = {
  bookingId: string;
  overallRating: number;
  positiveTags: SessionRatingPositiveTag[];
  improvementTags: SessionRatingImprovementTag[];
  comment?: string | null;
};

const feedbackError = (code: string, message: string) => ({ __typename: "LearningFeedbackError" as const, code, message });
const ratingError = (code: string, message: string) => ({ __typename: "SessionRatingError" as const, code, message });

function hasUniqueAllowedValues<T extends string>(values: readonly T[], allowed: readonly T[], maximum?: number) {
  return (maximum === undefined || values.length <= maximum)
    && new Set(values).size === values.length
    && values.every((value) => allowed.includes(value));
}

function enumArray<T extends string>(value: T[] | string): T[] {
  if (Array.isArray(value)) return value;
  return value === "{}" ? [] : value.slice(1, -1).split(",") as T[];
}

async function bookingFeedbackContext(db: Database, bookingId: string) {
  const booking = await db.selectFrom("bookings")
    .innerJoin("class_sessions", "class_sessions.id", "bookings.class_session_id")
    .leftJoin("attendance_records", "attendance_records.booking_id", "bookings.id")
    .innerJoin("users as student", "student.id", "bookings.student_user_id")
    .innerJoin("users as teacher", "teacher.id", "class_sessions.teacher_user_id")
    .select([
      "bookings.id as booking_id", "bookings.student_user_id", "bookings.class_session_id",
      "class_sessions.teacher_user_id", "class_sessions.starts_at", "attendance_records.outcome",
      "student.display_name as student_display_name", "teacher.display_name as teacher_display_name",
    ])
    .where("bookings.id", "=", bookingId)
    .executeTakeFirst();
  if (!booking) return null;
  const latestCorrection = await db.selectFrom("attendance_record_corrections")
    .select(["corrected_outcome", "corrected_at"])
    .where("booking_id", "=", bookingId)
    .orderBy("corrected_at", "desc")
    .orderBy("id", "desc")
    .executeTakeFirst();
  const classSessionEndsAt = new Date(booking.starts_at.getTime() + 60 * 60_000);
  const eligibleFrom = latestCorrection?.corrected_outcome === "ATTENDED" ? latestCorrection.corrected_at : classSessionEndsAt;
  return { ...booking, classSessionEndsAt, eligibleFrom };
}

function learningFeedbackProjection(feedback: {
  booking_id: string; observed_strengths: FeedbackSkill[]; suggested_focuses: FeedbackSkill[];
  observations: string; next_practice: string; state: "DRAFT" | "SUBMITTED"; submitted_at: Date | null; updated_at: Date;
}) {
  return { bookingId: feedback.booking_id, observedStrengths: enumArray(feedback.observed_strengths), suggestedFocuses: enumArray(feedback.suggested_focuses), observations: feedback.observations, nextPractice: feedback.next_practice, state: feedback.state, submittedAt: feedback.submitted_at?.toISOString() ?? null, updatedAt: feedback.updated_at.toISOString() };
}

function sessionRatingProjection(rating: {
  booking_id: string; overall_rating: number; positive_tags: SessionRatingPositiveTag[];
  improvement_tags: SessionRatingImprovementTag[]; comment: string; created_at: Date; updated_at: Date;
}) {
  return { bookingId: rating.booking_id, overallRating: rating.overall_rating, positiveTags: enumArray(rating.positive_tags), improvementTags: enumArray(rating.improvement_tags), comment: rating.comment, createdAt: rating.created_at.toISOString(), updatedAt: rating.updated_at.toISOString() };
}

export async function saveLearningFeedback(db: Database, teacher: { id: string }, input: LearningFeedbackInput, correlationId: string, now: Date) {
  await sql`select pg_advisory_xact_lock(hashtextextended(${`learning-feedback:${input.bookingId}`}, 39))`.execute(db);
  const context = await bookingFeedbackContext(db, input.bookingId);
  const audit = async (outcome: "SUCCEEDED" | "DENIED", reasonCode: string) => db.insertInto("audit_entries").values({ actor_user_id: teacher.id, acting_role: "TEACHER", operation: "learning-feedback.saved", target_type: "LearningFeedback", target_id: context?.booking_id ?? teacher.id, outcome, reason_code: reasonCode, correlation_id: correlationId }).execute();
  if (!context || context.teacher_user_id !== teacher.id || context.outcome !== "ATTENDED") {
    await audit("DENIED", "LEARNING_FEEDBACK_NOT_FOUND");
    return feedbackError("BOOKING_NOT_FOUND", "Choose an Attended Booking assigned to you.");
  }
  if (!feedbackWindowIsOpen(now, context.eligibleFrom)) {
    await audit("DENIED", "LEARNING_FEEDBACK_WINDOW_CLOSED");
    return feedbackError("FEEDBACK_WINDOW_CLOSED", "The 48-hour Learning Feedback window has closed.");
  }
  const observations = input.observations?.trim() ?? "";
  const nextPractice = input.nextPractice?.trim() ?? "";
  const existing = await db.selectFrom("learning_feedback").selectAll().where("booking_id", "=", input.bookingId).forUpdate().executeTakeFirst();
  const state = input.submit || existing?.state === "SUBMITTED" ? "SUBMITTED" as const : "DRAFT" as const;
  const validSkills = hasUniqueAllowedValues(input.observedStrengths, FEEDBACK_SKILLS, 3) && hasUniqueAllowedValues(input.suggestedFocuses, FEEDBACK_SKILLS, 3);
  const hasContent = input.observedStrengths.length > 0 || input.suggestedFocuses.length > 0 || observations.length > 0 || nextPractice.length > 0;
  if (!validSkills || observations.length > 500 || nextPractice.length > 500 || (state === "SUBMITTED" && !hasContent)) {
    await audit("DENIED", "LEARNING_FEEDBACK_INVALID");
    return feedbackError("INVALID_FEEDBACK", "Use up to three allowed skills per group and plain text fields of at most 500 characters; submitted feedback needs content.");
  }
  const firstSubmission = state === "SUBMITTED" && existing?.state !== "SUBMITTED";
  const submittedAt = state === "SUBMITTED" ? existing?.submitted_at ?? now : null;
  const feedback = existing
    ? await db.updateTable("learning_feedback").set({ observed_strengths: input.observedStrengths, suggested_focuses: input.suggestedFocuses, observations, next_practice: nextPractice, state, submitted_at: submittedAt, updated_at: now }).where("id", "=", existing.id).returningAll().executeTakeFirstOrThrow()
    : await db.insertInto("learning_feedback").values({ booking_id: input.bookingId, teacher_user_id: teacher.id, observed_strengths: input.observedStrengths, suggested_focuses: input.suggestedFocuses, observations, next_practice: nextPractice, state, submitted_at: submittedAt, created_at: now, updated_at: now }).returningAll().executeTakeFirstOrThrow();
  if (firstSubmission) await notifyLearningFeedbackSubmitted(db, context.student_user_id, context.class_session_id, feedback.id);
  await audit("SUCCEEDED", firstSubmission ? "LEARNING_FEEDBACK_SUBMITTED" : state === "DRAFT" ? "LEARNING_FEEDBACK_DRAFT_SAVED" : "LEARNING_FEEDBACK_REVISED");
  return { __typename: "SaveLearningFeedbackSuccess" as const, feedback: learningFeedbackProjection(feedback) };
}

export async function saveSessionRating(db: Database, student: { id: string }, input: SessionRatingInput, correlationId: string, now: Date) {
  await sql`select pg_advisory_xact_lock(hashtextextended(${`session-rating:${input.bookingId}`}, 39))`.execute(db);
  const context = await bookingFeedbackContext(db, input.bookingId);
  const audit = async (outcome: "SUCCEEDED" | "DENIED", reasonCode: string) => db.insertInto("audit_entries").values({ actor_user_id: student.id, acting_role: "STUDENT", operation: "session-rating.saved", target_type: "SessionRating", target_id: context?.booking_id ?? student.id, outcome, reason_code: reasonCode, correlation_id: correlationId }).execute();
  if (!context || context.student_user_id !== student.id || context.outcome !== "ATTENDED") {
    await audit("DENIED", "SESSION_RATING_NOT_FOUND");
    return ratingError("BOOKING_NOT_FOUND", "Choose one of your Attended Bookings.");
  }
  if (!sessionRatingWindowIsOpen(now, context.eligibleFrom)) {
    await audit("DENIED", "SESSION_RATING_WINDOW_CLOSED");
    return ratingError("RATING_WINDOW_CLOSED", "The seven-day Session Rating window has closed.");
  }
  const comment = input.comment?.trim() ?? "";
  const valid = Number.isInteger(input.overallRating) && input.overallRating >= 1 && input.overallRating <= 5
    && hasUniqueAllowedValues(input.positiveTags, SESSION_RATING_POSITIVE_TAGS)
    && hasUniqueAllowedValues(input.improvementTags, SESSION_RATING_IMPROVEMENT_TAGS)
    && comment.length <= 500;
  if (!valid) {
    await audit("DENIED", "SESSION_RATING_INVALID");
    return ratingError("INVALID_RATING", "Choose an overall rating from one through five, predefined tags, and a comment of at most 500 characters.");
  }
  const existing = await db.selectFrom("session_ratings").selectAll().where("booking_id", "=", input.bookingId).forUpdate().executeTakeFirst();
  const rating = existing
    ? await db.updateTable("session_ratings").set({ overall_rating: input.overallRating, positive_tags: input.positiveTags, improvement_tags: input.improvementTags, comment, updated_at: now }).where("id", "=", existing.id).returningAll().executeTakeFirstOrThrow()
    : await db.insertInto("session_ratings").values({ booking_id: input.bookingId, student_user_id: student.id, overall_rating: input.overallRating, positive_tags: input.positiveTags, improvement_tags: input.improvementTags, comment, created_at: now, updated_at: now }).returningAll().executeTakeFirstOrThrow();
  await audit("SUCCEEDED", existing ? "SESSION_RATING_REVISED" : "SESSION_RATING_SUBMITTED");
  return { __typename: "SaveSessionRatingSuccess" as const, rating: sessionRatingProjection(rating) };
}

async function feedbackAndRatingForContexts(db: Database, contexts: Array<NonNullable<Awaited<ReturnType<typeof bookingFeedbackContext>>>>, includeDrafts: boolean) {
  if (contexts.length === 0) return [];
  const bookingIds = contexts.map(({ booking_id: bookingId }) => bookingId);
  const feedback = await db.selectFrom("learning_feedback").selectAll().where("booking_id", "in", bookingIds).execute();
  const ratings = await db.selectFrom("session_ratings").selectAll().where("booking_id", "in", bookingIds).execute();
  return contexts.map((context) => {
    const foundFeedback = feedback.find(({ booking_id: bookingId }) => bookingId === context.booking_id);
    const foundRating = ratings.find(({ booking_id: bookingId }) => bookingId === context.booking_id);
    return { bookingId: context.booking_id, classSessionId: context.class_session_id, classSessionEndsAt: context.classSessionEndsAt.toISOString(), feedbackDeadline: feedbackDeadline(context.eligibleFrom).toISOString(), ratingDeadline: sessionRatingDeadline(context.eligibleFrom).toISOString(), studentDisplayName: context.student_display_name, teacherDisplayName: context.teacher_display_name, learningFeedback: foundFeedback && (includeDrafts || foundFeedback.state === "SUBMITTED") ? learningFeedbackProjection(foundFeedback) : null, sessionRating: foundRating ? sessionRatingProjection(foundRating) : null };
  });
}

async function contextsForBookingRows(db: Database, bookingIds: string[]) {
  return (await Promise.all(bookingIds.map((bookingId) => bookingFeedbackContext(db, bookingId)))).filter((context): context is NonNullable<typeof context> => Boolean(context && context.outcome === "ATTENDED"));
}

export async function teacherFeedbackWork(db: Database, teacher: { id: string }, now: Date) {
  const rows = await db.selectFrom("bookings").innerJoin("class_sessions", "class_sessions.id", "bookings.class_session_id").innerJoin("attendance_records", "attendance_records.booking_id", "bookings.id").select("bookings.id").where("class_sessions.teacher_user_id", "=", teacher.id).where("attendance_records.outcome", "=", "ATTENDED").execute();
  const contexts = (await contextsForBookingRows(db, rows.map(({ id }) => id))).filter((context) => feedbackWindowIsOpen(now, context.eligibleFrom));
  return feedbackAndRatingForContexts(db, contexts, true).then((items) => items.map((item) => ({ ...item, sessionRating: null })));
}

export async function studentFeedbackAndRatings(db: Database, student: { id: string }) {
  const rows = await db.selectFrom("bookings").innerJoin("attendance_records", "attendance_records.booking_id", "bookings.id").select("bookings.id").where("bookings.student_user_id", "=", student.id).where("attendance_records.outcome", "=", "ATTENDED").execute();
  return feedbackAndRatingForContexts(db, await contextsForBookingRows(db, rows.map(({ id }) => id)), false);
}

export async function administratorFeedbackAndRatings(db: Database) {
  const rows = await db.selectFrom("bookings").innerJoin("attendance_records", "attendance_records.booking_id", "bookings.id").select("bookings.id").where("attendance_records.outcome", "=", "ATTENDED").execute();
  return feedbackAndRatingForContexts(db, await contextsForBookingRows(db, rows.map(({ id }) => id)), false);
}
