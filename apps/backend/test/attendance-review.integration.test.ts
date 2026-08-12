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

describe("Attendance Review Request GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  const administratorId = randomUUID();
  const administratorSubject = randomUUID();
  const teacherId = randomUUID();
  const teacherSubject = randomUUID();
  const studentId = randomUUID();
  const studentSubject = randomUUID();
  const otherStudentId = randomUUID();
  const otherStudentSubject = randomUUID();
  let currentNow = new Date("2026-08-12T12:00:00.000Z");
  let courseId: string;
  let storyLessonUnitId: string;
  let opinionLessonUnitId: string;
  let opinionClassSessionId: string;
  let storyBookingId: string;
  let secondStoryBookingId: string;
  let opinionBookingId: string;
  let staleBookingId: string;
  let pendingReviewRequestId: string;

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    db = createDatabase(await clonePostgreSqlTemplate(postgres, `attendance_review_${randomUUID().replaceAll("-", "")}`));
    api = createApi({ db, authMode: "fake", nodeEnv: "test", now: () => currentNow });

    await db.insertInto("users").values([
      { id: administratorId, identity_issuer: "https://fake.local/", identity_subject: administratorSubject, display_name: "Alex Administrator", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: teacherId, identity_issuer: "https://fake.local/", identity_subject: teacherSubject, display_name: "Taylor Teacher", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: studentId, identity_issuer: "https://fake.local/", identity_subject: studentSubject, display_name: "Sam Student", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: otherStudentId, identity_issuer: "https://fake.local/", identity_subject: otherStudentSubject, display_name: "Robin Student", interface_locale: "en", display_time_zone: "America/Denver" },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: administratorId, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: teacherId, role: "TEACHER" },
      { user_id: studentId, role: "STUDENT" },
      { user_id: otherStudentId, role: "STUDENT" },
    ]).execute();

    courseId = (await db.insertInto("courses").values({ stable_key: "es-b2", target_language: "es", curriculum_level: "B2", title: "Spanish B2", summary: "Upper-intermediate Spanish" }).returning("id").executeTakeFirstOrThrow()).id;
    storyLessonUnitId = await createLessonUnit("es-b2-01", "Tell a story", 1);
    opinionLessonUnitId = await createLessonUnit("es-b2-02", "Explain an opinion", 2);
    await db.insertInto("lesson_materials").values({ lesson_unit_id: opinionLessonUnitId, kind: "HTTPS_REFERENCE", title: "Opinion connectors", structured_content: null, https_url: "https://example.org/opinion-connectors", publisher: "Example" }).execute();
    await db.insertInto("student_placements").values({ student_user_id: studentId, target_language: "es", curriculum_level: "B2" }).execute();
    await db.insertInto("teacher_qualifications").values({ teacher_user_id: teacherId, target_language: "es", curriculum_level: "B2", granted_by_user_id: administratorId }).execute();
    await db.insertInto("class_credit_accounts").values({ student_user_id: studentId, available_balance: 5 }).execute();
    await db.insertInto("class_credit_ledger_entries").values({ student_user_id: studentId, amount: 5, source: "CREDIT_ADJUSTMENT", source_reference: `credit-adjustment:${randomUUID()}`, reason: "Opening demonstration balance." }).execute();

    storyBookingId = (await createBooking(storyLessonUnitId, "2026-08-08T10:00:00.000Z", "ATTENDED")).bookingId;
    secondStoryBookingId = (await createBooking(storyLessonUnitId, "2026-08-09T10:00:00.000Z", "ATTENDED")).bookingId;
    const opinion = await createBooking(opinionLessonUnitId, "2026-08-11T10:00:00.000Z", "NO_SHOW");
    opinionBookingId = opinion.bookingId;
    opinionClassSessionId = opinion.classSessionId;
    staleBookingId = (await createBooking(storyLessonUnitId, "2026-06-01T10:00:00.000Z", "NO_SHOW")).bookingId;
    await db.insertInto("lesson_unit_completions").values({ student_user_id: studentId, lesson_unit_id: storyLessonUnitId, established_by_booking_id: storyBookingId, earned_at: new Date("2026-08-08T11:00:00.000Z") }).execute();
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("records one Attendance Review Request while the published outcome stays in force", async () => {
    const correlationId = `attendance-review-created-${randomUUID()}`;
    const result = await graphql(requestMutation, { input: { idempotencyKey: randomUUID(), bookingId: opinionBookingId, explanation: "I joined from the shared classroom link and stayed for the whole hour." } }, correlationId, studentSubject);

    expect(result.errors).toBeUndefined();
    expect(result).toMatchObject({ data: { requestAttendanceReview: { attendanceReviewRequest: {
      bookingId: opinionBookingId,
      classSessionId: opinionClassSessionId,
      outcomeAtRequest: "NO_SHOW",
      effectiveOutcome: "NO_SHOW",
      state: "PENDING",
      explanation: "I joined from the shared classroom link and stayed for the whole hour.",
      decidedAt: null,
      studentVisibleRationale: null,
    } } } });
    pendingReviewRequestId = (result.data as { requestAttendanceReview: { attendanceReviewRequest: { id: string } } }).requestAttendanceReview.attendanceReviewRequest.id;

    expect(await db.selectFrom("attendance_records").select(["outcome", "submitted_by_user_id"]).where("booking_id", "=", opinionBookingId).executeTakeFirstOrThrow()).toEqual({ outcome: "NO_SHOW", submitted_by_user_id: teacherId });
    expect(await inAppMessages(studentId, "attendance-review.created.student")).toHaveLength(1);
    expect(await inAppMessages(administratorId, "attendance-review.created.administrator")).toHaveLength(1);
    expect(await db.selectFrom("email_notification_intents").select("id").where("message_id", "like", "attendance-review.created.%").execute()).toEqual([]);
    expect(await auditFor(correlationId)).toEqual({ acting_role: "STUDENT", target_type: "AttendanceReviewRequest", outcome: "SUCCEEDED", reason_code: "ATTENDANCE_REVIEW_REQUESTED" });

    const studentView = await graphql(studentAttendanceQuery, {}, randomUUID(), studentSubject);
    expect(studentView).toMatchObject({ data: { studentAttendanceRecords: expect.arrayContaining([
      expect.objectContaining({ bookingId: opinionBookingId, outcome: "NO_SHOW", reviewDeadline: "2026-08-18T11:05:00.000Z", reviewRequestOpen: false, reviewRequest: expect.objectContaining({ state: "PENDING" }) }),
      expect.objectContaining({ bookingId: storyBookingId, outcome: "ATTENDED", reviewRequestOpen: true, reviewRequest: null }),
    ]) } });
  });

  it("accepts one request per Booking and closes the window seven days after publication", async () => {
    const duplicate = await graphql(requestMutation, { input: { idempotencyKey: randomUUID(), bookingId: opinionBookingId, explanation: "" } }, randomUUID(), studentSubject);
    expect(duplicate).toMatchObject({ data: { requestAttendanceReview: { code: "REVIEW_ALREADY_REQUESTED" } } });

    const closedCorrelationId = `attendance-review-closed-${randomUUID()}`;
    const closed = await graphql(requestMutation, { input: { idempotencyKey: randomUUID(), bookingId: staleBookingId, explanation: "" } }, closedCorrelationId, studentSubject);
    expect(closed).toMatchObject({ data: { requestAttendanceReview: { code: "REVIEW_WINDOW_CLOSED" } } });
    expect(await auditFor(closedCorrelationId)).toMatchObject({ outcome: "DENIED", reason_code: "REVIEW_WINDOW_CLOSED" });
  });

  it("denies unrelated Students, other roles, and unauthorized queue reads with privacy-safe Audit Entries", async () => {
    const otherStudentCorrelationId = `attendance-review-other-student-${randomUUID()}`;
    const otherStudent = await graphql(requestMutation, { input: { idempotencyKey: randomUUID(), bookingId: storyBookingId, explanation: "" } }, otherStudentCorrelationId, otherStudentSubject);
    expect(otherStudent).toMatchObject({ data: { requestAttendanceReview: { code: "BOOKING_NOT_FOUND" } } });
    expect(await auditFor(otherStudentCorrelationId)).toMatchObject({ outcome: "DENIED", reason_code: "BOOKING_NOT_FOUND" });

    const teacherCorrelationId = `attendance-review-teacher-${randomUUID()}`;
    const teacherRequest = await graphql(requestMutation, { input: { idempotencyKey: randomUUID(), bookingId: opinionBookingId, explanation: "" } }, teacherCorrelationId, teacherSubject);
    expect(teacherRequest.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    expect(await auditFor(teacherCorrelationId)).toMatchObject({ acting_role: "STUDENT", target_type: "AttendanceReviewRequest", outcome: "DENIED", reason_code: "STUDENT_ROLE_REQUIRED" });

    const queueCorrelationId = `attendance-review-queue-denied-${randomUUID()}`;
    const queue = await graphql(`query Queue { administrationAttendanceReviewRequests { id explanation privateAdministratorNote } }`, {}, queueCorrelationId, studentSubject);
    expect(queue.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    expect(await auditFor(queueCorrelationId)).toMatchObject({ acting_role: "PLATFORM_ADMINISTRATOR", target_type: "AttendanceReviewRequest", outcome: "DENIED", reason_code: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED" });

    const decideDenied = await graphql(decideMutation, { input: { idempotencyKey: randomUUID(), attendanceReviewRequestId: pendingReviewRequestId, decision: "CORRECT", studentVisibleRationale: "A Student must never be able to decide their own review." } }, randomUUID(), studentSubject);
    expect(decideDenied.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    expect(await db.selectFrom("attendance_review_requests").select("state").where("id", "=", pendingReviewRequestId).executeTakeFirstOrThrow()).toEqual({ state: "PENDING" });
  });

  it("corrects No-show to Attended atomically and reconciles dependent learning state without refunding a Class Credit", async () => {
    currentNow = new Date("2026-08-12T13:00:00.000Z");
    const correlationId = `attendance-review-corrected-${randomUUID()}`;
    const decided = await graphql(decideMutation, { input: {
      idempotencyKey: randomUUID(),
      attendanceReviewRequestId: pendingReviewRequestId,
      decision: "CORRECT",
      studentVisibleRationale: "The classroom entry log confirms attendance for the whole Class Session.",
      privateAdministratorNote: "Teacher confirmed the roster was submitted from an outdated draft.",
    } }, correlationId, administratorSubject);

    expect(decided.errors).toBeUndefined();
    expect(decided).toMatchObject({ data: { decideAttendanceReview: { attendanceReviewRequest: {
      id: pendingReviewRequestId,
      state: "CORRECTED",
      outcomeAtRequest: "NO_SHOW",
      effectiveOutcome: "ATTENDED",
      studentVisibleRationale: "The classroom entry log confirms attendance for the whole Class Session.",
      privateAdministratorNote: "Teacher confirmed the roster was submitted from an outdated draft.",
      decidedAt: "2026-08-12T13:00:00.000Z",
    } } } });

    expect(await db.selectFrom("attendance_records").select(["outcome", "submitted_by_user_id", "submitted_at"]).where("booking_id", "=", opinionBookingId).executeTakeFirstOrThrow())
      .toEqual({ outcome: "ATTENDED", submitted_by_user_id: teacherId, submitted_at: new Date("2026-08-11T11:05:00.000Z") });
    expect(await db.selectFrom("attendance_record_corrections").select(["prior_outcome", "corrected_outcome", "corrected_by_user_id", "reason"]).where("booking_id", "=", opinionBookingId).executeTakeFirstOrThrow())
      .toEqual({ prior_outcome: "NO_SHOW", corrected_outcome: "ATTENDED", corrected_by_user_id: administratorId, reason: "The classroom entry log confirms attendance for the whole Class Session." });
    expect(await db.selectFrom("lesson_unit_completions").select("earned_at").where("student_user_id", "=", studentId).where("lesson_unit_id", "=", opinionLessonUnitId).executeTakeFirstOrThrow())
      .toEqual({ earned_at: new Date("2026-08-11T11:00:00.000Z") });

    expect(await graphql(`query Progress { studentCourseProgress { courseId completedActiveLessonUnitCount activeLessonUnitCount percentage } }`, {}, randomUUID(), studentSubject))
      .toMatchObject({ data: { studentCourseProgress: [{ courseId, completedActiveLessonUnitCount: 2, activeLessonUnitCount: 2, percentage: 100 }] } });
    expect(await graphql(`query Units { learningAccessLessonUnits(actingRole: STUDENT) { id } }`, {}, randomUUID(), studentSubject))
      .toMatchObject({ data: { learningAccessLessonUnits: expect.arrayContaining([{ id: opinionLessonUnitId }]) } });
    expect(await graphql(`query Materials($id: ID!) { lessonMaterials(lessonUnitId: $id, actingRole: STUDENT) { title } }`, { id: opinionLessonUnitId }, randomUUID(), studentSubject))
      .toMatchObject({ data: { lessonMaterials: [{ title: "Opinion connectors" }] } });
    expect(await graphql(`query Quality { studentFeedbackAndRatings { bookingId feedbackDeadline ratingDeadline } }`, {}, randomUUID(), studentSubject))
      .toMatchObject({ data: { studentFeedbackAndRatings: expect.arrayContaining([
        expect.objectContaining({ bookingId: opinionBookingId, feedbackDeadline: "2026-08-14T13:00:00.000Z", ratingDeadline: "2026-08-19T13:00:00.000Z" }),
      ]) } });

    expect(await db.selectFrom("class_credit_ledger_entries").select(["amount", "source"]).where("student_user_id", "=", studentId).execute()).toEqual([{ amount: 5, source: "CREDIT_ADJUSTMENT" }]);
    expect(await db.selectFrom("class_credit_accounts").select("available_balance").where("student_user_id", "=", studentId).executeTakeFirstOrThrow()).toEqual({ available_balance: 5 });

    expect(await graphql(studentAttendanceQuery, {}, randomUUID(), studentSubject)).toMatchObject({ data: { studentAttendanceRecords: expect.arrayContaining([
      expect.objectContaining({ bookingId: opinionBookingId, outcome: "ATTENDED", correctedAt: "2026-08-12T13:00:00.000Z", correctionCount: 1, reviewRequest: expect.objectContaining({ state: "CORRECTED", privateAdministratorNote: null }) }),
    ]) } });
    expect(await graphql(`query Roster($id: ID!) { classRoster(classSessionId: $id, actingRole: TEACHER) { students { bookingId attendance { outcome correctedAt correctionCount } } } }`, { id: opinionClassSessionId }, randomUUID(), teacherSubject))
      .toMatchObject({ data: { classRoster: { students: [{ bookingId: opinionBookingId, attendance: { outcome: "ATTENDED", correctedAt: "2026-08-12T13:00:00.000Z", correctionCount: 1 } }] } } });

    expect(await inAppMessages(studentId, "attendance-review.resolved.student")).toHaveLength(1);
    expect(await emailMessages(studentId, "attendance-review.resolved.student")).toHaveLength(1);
    expect(await inAppMessages(teacherId, "attendance-review.corrected.teacher")).toHaveLength(1);
    expect(await emailMessages(teacherId, "attendance-review.corrected.teacher")).toHaveLength(1);
    expect(await db.selectFrom("in_app_notifications").select("id").where("message_id", "like", "attendance.corrected.%").execute()).toEqual([]);
    const resolvedEmail = await db.selectFrom("email_notification_intents").select("rendered_content").where("recipient_user_id", "=", studentId).where("message_id", "=", "attendance-review.resolved.student").executeTakeFirstOrThrow();
    expect(resolvedEmail.rendered_content).toContain("corrected");
    expect(resolvedEmail.rendered_content).toContain("Lesson Unit Completion and Lesson Material access were established.");
    expect(resolvedEmail.rendered_content).toContain("The Learning Feedback and Session Rating windows reopen from this decision.");
    expect(resolvedEmail.rendered_content).toContain("No Class Credit was refunded automatically.");
    expect(resolvedEmail.rendered_content).not.toContain("outdated draft");
    const teacherEmail = await db.selectFrom("email_notification_intents").select("rendered_content").where("recipient_user_id", "=", teacherId).where("message_id", "=", "attendance-review.corrected.teacher").executeTakeFirstOrThrow();
    expect(teacherEmail.rendered_content).not.toContain("shared classroom link");
    expect(teacherEmail.rendered_content).not.toContain("outdated draft");
    expect(await auditFor(correlationId)).toEqual({ acting_role: "PLATFORM_ADMINISTRATOR", target_type: "AttendanceReviewRequest", outcome: "SUCCEEDED", reason_code: "ATTENDANCE_REVIEW_CORRECTED" });
  });

  it("upholds a decision without changing the outcome, emailing the Teacher, or allowing a second decision", async () => {
    currentNow = new Date("2026-08-12T14:00:00.000Z");
    const requested = await graphql(requestMutation, { input: { idempotencyKey: randomUUID(), bookingId: storyBookingId, explanation: "I left early but was marked present." } }, randomUUID(), studentSubject);
    const upheldRequestId = (requested.data as { requestAttendanceReview: { attendanceReviewRequest: { id: string } } }).requestAttendanceReview.attendanceReviewRequest.id;

    const correlationId = `attendance-review-upheld-${randomUUID()}`;
    const decided = await graphql(decideMutation, { input: { idempotencyKey: randomUUID(), attendanceReviewRequestId: upheldRequestId, decision: "UPHOLD", studentVisibleRationale: "Participation for the recorded hour meets the Attended standard." } }, correlationId, administratorSubject);
    expect(decided).toMatchObject({ data: { decideAttendanceReview: { attendanceReviewRequest: { state: "UPHELD", effectiveOutcome: "ATTENDED", privateAdministratorNote: null } } } });

    expect(await db.selectFrom("attendance_records").select("outcome").where("booking_id", "=", storyBookingId).executeTakeFirstOrThrow()).toEqual({ outcome: "ATTENDED" });
    expect(await db.selectFrom("attendance_record_corrections").select("id").where("booking_id", "=", storyBookingId).execute()).toEqual([]);
    expect(await inAppMessages(teacherId, "attendance-review.upheld.teacher")).toHaveLength(1);
    expect(await emailMessages(teacherId, "attendance-review.upheld.teacher")).toEqual([]);
    expect(await emailMessages(studentId, "attendance-review.resolved.student")).toHaveLength(2);
    expect(await auditFor(correlationId)).toMatchObject({ outcome: "SUCCEEDED", reason_code: "ATTENDANCE_REVIEW_UPHELD" });

    const second = await graphql(decideMutation, { input: { idempotencyKey: randomUUID(), attendanceReviewRequestId: upheldRequestId, decision: "CORRECT", studentVisibleRationale: "A decided Attendance Review Request cannot be decided twice." } }, randomUUID(), administratorSubject);
    expect(second).toMatchObject({ data: { decideAttendanceReview: { code: "REVIEW_ALREADY_DECIDED" } } });

    const missingRequest = await graphql(decideMutation, { input: { idempotencyKey: randomUUID(), attendanceReviewRequestId: randomUUID(), decision: "UPHOLD", studentVisibleRationale: "There is no such Attendance Review Request." } }, randomUUID(), administratorSubject);
    expect(missingRequest).toMatchObject({ data: { decideAttendanceReview: { code: "REVIEW_REQUEST_NOT_FOUND" } } });
  });

  it("keeps Lesson Unit Completion while another Attended Booking still supports it, preserving hidden feedback and ratings", async () => {
    currentNow = new Date("2026-08-13T09:00:00.000Z");
    const rated = await graphql(`mutation Rate($input: SaveSessionRatingInput!) { saveSessionRating(input: $input) { ... on SaveSessionRatingSuccess { rating { bookingId overallRating } } ... on SessionRatingError { code } } }`, {
      input: { idempotencyKey: randomUUID(), bookingId: secondStoryBookingId, overallRating: 4, positiveTags: ["SUPPORTIVE"], improvementTags: [], comment: "A steady second session." },
    }, randomUUID(), studentSubject);
    expect(rated).toMatchObject({ data: { saveSessionRating: { rating: { bookingId: secondStoryBookingId, overallRating: 4 } } } });

    const requested = await graphql(requestMutation, { input: { idempotencyKey: randomUUID(), bookingId: secondStoryBookingId, explanation: "I could not join this second session." } }, randomUUID(), studentSubject);
    const requestId = (requested.data as { requestAttendanceReview: { attendanceReviewRequest: { id: string } } }).requestAttendanceReview.attendanceReviewRequest.id;

    const shortRationaleCorrelationId = `attendance-review-invalid-reason-${randomUUID()}`;
    const shortRationale = await graphql(decideMutation, { input: { idempotencyKey: randomUUID(), attendanceReviewRequestId: requestId, decision: "CORRECT", studentVisibleRationale: "too short" } }, shortRationaleCorrelationId, administratorSubject);
    expect(shortRationale).toMatchObject({ data: { decideAttendanceReview: { code: "INVALID_REASON" } } });
    expect(await auditFor(shortRationaleCorrelationId)).toMatchObject({ outcome: "DENIED", reason_code: "INVALID_REASON" });
    expect(await db.selectFrom("attendance_review_requests").select("state").where("id", "=", requestId).executeTakeFirstOrThrow()).toEqual({ state: "PENDING" });

    const corrected = await graphql(decideMutation, { input: { idempotencyKey: randomUUID(), attendanceReviewRequestId: requestId, decision: "CORRECT", studentVisibleRationale: "The classroom entry log shows no attendance for this Class Session." } }, randomUUID(), administratorSubject);
    expect(corrected).toMatchObject({ data: { decideAttendanceReview: { attendanceReviewRequest: { state: "CORRECTED", effectiveOutcome: "NO_SHOW" } } } });

    expect(await db.selectFrom("lesson_unit_completions").select("established_by_booking_id").where("student_user_id", "=", studentId).where("lesson_unit_id", "=", storyLessonUnitId).executeTakeFirstOrThrow())
      .toEqual({ established_by_booking_id: storyBookingId });
    expect(await graphql(`query Quality { studentFeedbackAndRatings { bookingId } }`, {}, randomUUID(), studentSubject))
      .toMatchObject({ data: { studentFeedbackAndRatings: expect.not.arrayContaining([expect.objectContaining({ bookingId: secondStoryBookingId })]) } });
    expect(await db.selectFrom("session_ratings").select(["overall_rating", "comment"]).where("booking_id", "=", secondStoryBookingId).executeTakeFirstOrThrow())
      .toEqual({ overall_rating: 4, comment: "A steady second session." });
    const hiddenNotice = await db.selectFrom("email_notification_intents").select("rendered_content").where("source_reference", "=", `attendance-review.resolved.student:${requestId}`).executeTakeFirstOrThrow();
    expect(hiddenNotice.rendered_content).toContain("Lesson Unit Completion and Lesson Material access are unchanged.");
    expect(hiddenNotice.rendered_content).toContain("Related Learning Feedback and Session Rating records are preserved but hidden.");

    const administered = await graphql(`mutation Administer($input: RecordAttendanceInput!) { administerAttendance(input: $input) { ... on RecordAttendanceSuccess { classRoster { classSession { id } } } ... on AttendanceError { code } } }`, {
      input: { idempotencyKey: randomUUID(), classSessionId: await classSessionForBooking(storyBookingId), records: [{ bookingId: storyBookingId, outcome: "NO_SHOW", correctionReason: "The administrator reconciled both story Class Sessions after the review." }] },
    }, randomUUID(), administratorSubject);
    expect(administered.errors).toBeUndefined();
    expect(await db.selectFrom("lesson_unit_completions").select("id").where("student_user_id", "=", studentId).where("lesson_unit_id", "=", storyLessonUnitId).executeTakeFirst()).toBeUndefined();
    expect(await graphql(`query Progress { studentCourseProgress { completedActiveLessonUnitCount percentage } }`, {}, randomUUID(), studentSubject))
      .toMatchObject({ data: { studentCourseProgress: [{ completedActiveLessonUnitCount: 1, percentage: 50 }] } });

    expect(await graphql(`query Queue { administrationAttendanceReviewRequests { bookingId state studentDisplayName privateAdministratorNote } }`, {}, randomUUID(), administratorSubject))
      .toMatchObject({ data: { administrationAttendanceReviewRequests: [
        { bookingId: opinionBookingId, state: "CORRECTED", studentDisplayName: "Sam Student", privateAdministratorNote: "Teacher confirmed the roster was submitted from an outdated draft." },
        { bookingId: storyBookingId, state: "UPHELD", studentDisplayName: "Sam Student", privateAdministratorNote: null },
        { bookingId: secondStoryBookingId, state: "CORRECTED", studentDisplayName: "Sam Student", privateAdministratorNote: null },
      ] } });
  });

  const requestMutation = `mutation RequestAttendanceReview($input: RequestAttendanceReviewInput!) {
    requestAttendanceReview(input: $input) {
      ... on RequestAttendanceReviewSuccess { attendanceReviewRequest { id bookingId classSessionId outcomeAtRequest effectiveOutcome explanation state requestedAt decidedAt studentVisibleRationale privateAdministratorNote } }
      ... on AttendanceReviewError { code message }
    }
  }`;
  const decideMutation = `mutation DecideAttendanceReview($input: DecideAttendanceReviewInput!) {
    decideAttendanceReview(input: $input) {
      ... on DecideAttendanceReviewSuccess { attendanceReviewRequest { id bookingId state outcomeAtRequest effectiveOutcome decidedAt studentVisibleRationale privateAdministratorNote } }
      ... on AttendanceReviewError { code message }
    }
  }`;
  const studentAttendanceQuery = `query StudentAttendanceRecords {
    studentAttendanceRecords { bookingId classSessionId outcome publishedAt correctedAt correctionCount reviewDeadline reviewRequestOpen reviewRequest { id state studentVisibleRationale privateAdministratorNote } }
  }`;

  async function createLessonUnit(stableKey: string, title: string, sortOrder: number) {
    return db.transaction().execute(async (transaction) => {
      const unit = await transaction.insertInto("lesson_units").values({ stable_key: stableKey, course_id: courseId, title, summary: `${title} practice`, objectives: JSON.stringify([title]), sort_order: sortOrder, state: "ACTIVE", replacement_lesson_unit_id: null, retired_at: null }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: unit.id, topic_key: "EC" }).execute();
      return unit.id;
    });
  }

  async function createBooking(lessonUnitId: string, startsAt: string, outcome: "ATTENDED" | "NO_SHOW") {
    const classSessionId = (await db.insertInto("class_sessions").values({ lesson_unit_id: lessonUnitId, teacher_user_id: teacherId, starts_at: new Date(startsAt), scheduling_time_zone: "America/Denver", seat_capacity: 5, occupied_seats: 1, state: "PUBLISHED" }).returning("id").executeTakeFirstOrThrow()).id;
    const bookingId = (await db.insertInto("bookings").values({ student_user_id: studentId, class_session_id: classSessionId, teacher_user_id_at_booking: teacherId, state: "ACTIVE", terminal_reason: null, class_credit_refunded: false, late_cancellation_refund_until: null, booked_at: new Date("2026-07-25T12:00:00.000Z"), ended_at: null }).returning("id").executeTakeFirstOrThrow()).id;
    const publishedAt = new Date(new Date(startsAt).getTime() + 65 * 60_000);
    await db.insertInto("attendance_records").values({ booking_id: bookingId, outcome, submitted_by_user_id: teacherId, submitted_at: publishedAt, updated_at: publishedAt }).execute();
    return { bookingId, classSessionId };
  }

  async function classSessionForBooking(bookingId: string) {
    return (await db.selectFrom("bookings").select("class_session_id").where("id", "=", bookingId).executeTakeFirstOrThrow()).class_session_id;
  }

  async function inAppMessages(recipientUserId: string, messageId: string) {
    return db.selectFrom("in_app_notifications").select("id").where("recipient_user_id", "=", recipientUserId).where("message_id", "=", messageId).execute();
  }

  async function emailMessages(recipientUserId: string, messageId: string) {
    return db.selectFrom("email_notification_intents").select("id").where("recipient_user_id", "=", recipientUserId).where("message_id", "=", messageId).execute();
  }

  async function auditFor(correlationId: string) {
    return db.selectFrom("audit_entries").select(["acting_role", "target_type", "outcome", "reason_code"]).where("correlation_id", "=", correlationId).executeTakeFirstOrThrow();
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
