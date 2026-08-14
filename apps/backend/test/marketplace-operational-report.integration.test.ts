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

const REPORT_INSTANT = new Date("2026-06-25T18:00:00.000Z");
const REPORTED_RANGE = { fromLocalDate: "2026-06-01", toLocalDate: "2026-06-30" };

const REPORT_FIELDS = `
  generatedAt
  range { fromLocalDate toLocalDate timeZone }
  attendance { attendedCount noShowCount recordedCount attendanceRatePercentage excludedUnrecordedCount correctedCount exceptionCount }
  cancellations {
    studentCancellationCount
    timelyCount
    lateCount
    studentCancellationRatePercentage
    excludedClassSessionCancellationCount
    excludedRescheduleCount
    dailyRates { localDate studentCancellationCount timelyCount lateCount recordedOutcomeCount studentCancellationRatePercentage }
  }
  corrections { correctedAttendanceCount lastCorrectedAt pendingAttendanceReviewCount }
  credits { creditAdjustmentCount grantedCount refundedCount deductedCount netCreditChange bySource { source entryCount netAmount } }
  courseProgress { courseTitle targetLanguage curriculumLevel activeLessonUnitCount completedActiveLessonUnitCount studentsWithProgressCount averageProgressPercentage }
  exceptions { totalCount items { kind classSessionId occurredAt courseTitle lessonUnitTitle teacherDisplayName affectedBookingCount } }
`;

/**
 * The marketplace is arranged around one Platform Administrator reading it in
 * America/Denver. Two Class Sessions deliberately fall on the same Denver date from
 * different UTC dates, so a report that grouped by UTC could not pass.
 */
describe("Marketplace operational reporting GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  let now = new Date("2026-06-01T00:00:00.000Z");
  let courseId: string;

  const administratorId = randomUUID();
  const administratorSubject = randomUUID();
  const teacherId = randomUUID();
  const teacherSubject = randomUUID();
  const managerId = randomUUID();
  const managerSubject = randomUUID();
  const organizationId = randomUUID();
  const sofiaId = randomUUID();
  const sofiaSubject = randomUUID();
  const danaId = randomUUID();
  const quinnId = randomUUID();

  const lessonUnitIds: string[] = [];
  let recordedSessionId: string;
  let correctedSessionId: string;
  let unrecordedSessionId: string;
  let eveningSessionId: string;
  let correctedBookingId: string;

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(postgres, `marketplace_reports_${randomUUID().replaceAll("-", "")}`);
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test", now: () => now });

    await db.insertInto("users").values([
      { id: administratorId, identity_issuer: "https://fake.local/", identity_subject: administratorSubject, display_name: "Ada Administrator", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: teacherId, identity_issuer: "https://fake.local/", identity_subject: teacherSubject, display_name: "Tomás Teacher", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: managerId, identity_issuer: "https://fake.local/", identity_subject: managerSubject, display_name: "Morgan Manager", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: sofiaId, identity_issuer: "https://fake.local/", identity_subject: sofiaSubject, display_name: "Sofía Rivera", interface_locale: "es", display_time_zone: "America/Denver" },
      { id: danaId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Dana Ortiz", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: quinnId, identity_issuer: "https://fake.local/", identity_subject: randomUUID(), display_name: "Quinn Zhao", interface_locale: "en", display_time_zone: "America/Denver" },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: administratorId, role: "PLATFORM_ADMINISTRATOR" },
      { user_id: teacherId, role: "TEACHER" },
      { user_id: managerId, role: "ORGANIZATION_MANAGER" },
      { user_id: sofiaId, role: "STUDENT" },
      { user_id: danaId, role: "STUDENT" },
      { user_id: quinnId, role: "STUDENT" },
    ]).execute();
    await db.insertInto("organizations").values({ id: organizationId, name: "Nimbus Logistics" }).execute();
    await db.insertInto("organization_managers").values({ user_id: managerId, organization_id: organizationId }).execute();

    courseId = (await db.insertInto("courses").values({ stable_key: "es-b2", target_language: "es", curriculum_level: "B2", title: "Spanish B2", summary: "Upper-intermediate Spanish" }).returning("id").executeTakeFirstOrThrow()).id;
    await db.insertInto("teacher_qualifications").values({ teacher_user_id: teacherId, target_language: "es", curriculum_level: "B2", granted_by_user_id: administratorId }).execute();
    for (const index of [1, 2, 3, 4]) lessonUnitIds.push(await createLessonUnit(index, "ACTIVE"));
    // A retired unit stays in learning history but outside every denominator.
    await createLessonUnit(5, "RETIRED");

    // 09:00 in Denver on 2026-06-10.
    recordedSessionId = await deliver(lessonUnitIds[0]!, "2026-06-10T15:00:00.000Z", [
      { studentUserId: sofiaId },
      { studentUserId: danaId },
      // Cancelled two days out: timely, and still counted against the date whose
      // seat it gave up rather than the date it was made on.
      { studentUserId: quinnId, cancelledAt: "2026-06-08T15:00:00.000Z" },
    ]);
    // 21:00 in Denver on 2026-06-10, from a UTC date of 2026-06-11.
    eveningSessionId = await deliver(lessonUnitIds[1]!, "2026-06-11T03:00:00.000Z", [
      { studentUserId: quinnId, cancelledAt: "2026-06-10T20:00:00.000Z" },
    ]);
    correctedSessionId = await deliver(lessonUnitIds[2]!, "2026-06-12T15:00:00.000Z", [
      { studentUserId: sofiaId },
      { studentUserId: danaId },
    ]);
    unrecordedSessionId = await deliver(lessonUnitIds[3]!, "2026-06-15T15:00:00.000Z", [
      { studentUserId: sofiaId },
      { studentUserId: danaId },
    ]);
    await deliver(lessonUnitIds[0]!, "2026-06-18T15:00:00.000Z", [
      { studentUserId: sofiaId, terminalReason: "CLASS_SESSION_CANCELLATION" },
      { studentUserId: danaId, terminalReason: "CLASS_SESSION_CANCELLATION" },
    ], "CANCELLED");
    await deliver(lessonUnitIds[1]!, "2026-06-20T15:00:00.000Z", [
      { studentUserId: sofiaId, terminalReason: "RESCHEDULED" },
    ]);
    // Still ahead of the report instant: neither an outcome nor an exception.
    await deliver(lessonUnitIds[2]!, "2026-06-28T15:00:00.000Z", [{ studentUserId: sofiaId }]);

    now = new Date("2026-06-10T16:05:00.000Z");
    await administerAttendance(recordedSessionId, [[sofiaId, "ATTENDED"], [danaId, "NO_SHOW"]]);
    now = new Date("2026-06-12T16:05:00.000Z");
    await administerAttendance(correctedSessionId, [[sofiaId, "ATTENDED"], [danaId, "ATTENDED"]]);

    correctedBookingId = (await db.selectFrom("bookings").select("id")
      .where("class_session_id", "=", correctedSessionId)
      .where("student_user_id", "=", sofiaId)
      .executeTakeFirstOrThrow()).id;

    // A Student asks for the outcome to be reviewed and no decision has been made,
    // so the report must still show the original outcome as effective.
    now = new Date("2026-06-14T12:00:00.000Z");
    await requestAttendanceReview(correctedBookingId);

    // Attendance is submitted for the whole Class Roster at once, so a correction
    // resubmits the outcome that stands beside the one it changes.
    now = new Date("2026-06-20T17:00:00.000Z");
    await administerAttendance(correctedSessionId, [
      [sofiaId, "ATTENDED"],
      [danaId, "NO_SHOW", "Roll call named the wrong Student."],
    ]);

    await db.insertInto("class_credit_accounts").values([
      { student_user_id: sofiaId, available_balance: 4 },
      { student_user_id: danaId, available_balance: 2 },
      { student_user_id: quinnId, available_balance: 1 },
    ]).execute();
    await db.insertInto("class_credit_ledger_entries").values([
      { student_user_id: sofiaId, amount: 8, source: "SUBSCRIPTION_GRANT", source_reference: randomUUID(), reason: null, created_at: new Date("2026-06-05T00:00:00.000Z") },
      { student_user_id: danaId, amount: 8, source: "ORGANIZATION_CREDIT_GRANT", source_reference: randomUUID(), reason: null, created_at: new Date("2026-06-06T00:00:00.000Z") },
      { student_user_id: sofiaId, amount: -1, source: "BOOKING_DEDUCTION", source_reference: randomUUID(), reason: null, created_at: new Date("2026-06-08T00:00:00.000Z") },
      { student_user_id: quinnId, amount: 1, source: "BOOKING_REFUND", source_reference: randomUUID(), reason: null, created_at: new Date("2026-06-08T15:00:00.000Z") },
      { student_user_id: sofiaId, amount: 2, source: "CREDIT_ADJUSTMENT", source_reference: randomUUID(), reason: "A platform failure lost a booked seat.", created_at: new Date("2026-06-22T00:00:00.000Z") },
      // Outside the reported range: the credit sections are scoped like every other
      // count in the report.
      { student_user_id: sofiaId, amount: 8, source: "SUBSCRIPTION_GRANT", source_reference: randomUUID(), reason: null, created_at: new Date("2026-05-05T00:00:00.000Z") },
    ]).execute();

    now = REPORT_INSTANT;
  }, 180_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("uses the canonical Attendance Rate denominator and discloses what it excludes", async () => {
    const report = await marketplaceReport();

    expect(report.attendance).toEqual({
      attendedCount: 2,
      noShowCount: 2,
      recordedCount: 4,
      attendanceRatePercentage: 50,
      excludedUnrecordedCount: 2,
      correctedCount: 1,
      exceptionCount: 5,
    });
  });

  it("uses the canonical Student Cancellation Rate denominator and distinguishes timely from late", async () => {
    const report = await marketplaceReport();

    expect(report.cancellations).toMatchObject({
      studentCancellationCount: 2,
      timelyCount: 1,
      lateCount: 1,
      // Two cancellations against two cancellations plus four recorded outcomes.
      studentCancellationRatePercentage: 33,
      excludedClassSessionCancellationCount: 2,
      excludedRescheduleCount: 1,
    });
  });

  it("groups both rates by the Class Session's scheduled date in the reader's Display Time Zone", async () => {
    const report = await marketplaceReport();

    // The 21:00 Denver session has a UTC date of 2026-06-11 and still belongs to
    // 2026-06-10, the date its reader saw it on.
    expect(report.cancellations.dailyRates).toEqual([
      { localDate: "2026-06-10", studentCancellationCount: 2, timelyCount: 1, lateCount: 1, recordedOutcomeCount: 2, studentCancellationRatePercentage: 50 },
      { localDate: "2026-06-12", studentCancellationCount: 0, timelyCount: 0, lateCount: 0, recordedOutcomeCount: 2, studentCancellationRatePercentage: 0 },
      // Unrecorded attendance is out of both ratios, so a date carrying only
      // Unrecorded attendance has no rate rather than a rate of zero.
      { localDate: "2026-06-15", studentCancellationCount: 0, timelyCount: 0, lateCount: 0, recordedOutcomeCount: 0, studentCancellationRatePercentage: null },
    ]);
  });

  it("leads with the Unrecorded attendance and other actionable exceptions, without raw diagnostics", async () => {
    const report = await marketplaceReport();

    expect(report.exceptions.totalCount).toBe(2);
    expect(report.exceptions.items).toEqual([
      {
        kind: "PENDING_ATTENDANCE_REVIEW",
        classSessionId: correctedSessionId,
        occurredAt: "2026-06-12T15:00:00.000Z",
        courseTitle: "Spanish B2",
        lessonUnitTitle: "Unit 3",
        teacherDisplayName: "Tomás Teacher",
        affectedBookingCount: 1,
      },
      {
        kind: "UNRECORDED_ATTENDANCE",
        classSessionId: unrecordedSessionId,
        occurredAt: "2026-06-15T15:00:00.000Z",
        courseTitle: "Spanish B2",
        lessonUnitTitle: "Unit 4",
        teacherDisplayName: "Tomás Teacher",
        affectedBookingCount: 2,
      },
    ]);
    // A Class Session whose outcomes are all recorded, one already cancelled, and one
    // still ahead of the report are not exceptions.
    expect(report.exceptions.items.map((item) => item.classSessionId))
      .not.toContain(recordedSessionId);
    expect(report.exceptions.items.map((item) => item.classSessionId))
      .not.toContain(eveningSessionId);
  });

  it("shows correction metadata as a marker without the prior value, actor, or reason", async () => {
    const report = await marketplaceReport();

    expect(report.corrections).toEqual({
      correctedAttendanceCount: 1,
      lastCorrectedAt: "2026-06-20T17:00:00.000Z",
      pendingAttendanceReviewCount: 1,
    });
    // ADR 0056 keeps prior values in the correction-history extract and the acting
    // identity and reason in the Audit Log; a report that carried them here would
    // widen both without a second authorization.
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("Roll call named the wrong Student.");
    expect(serialized).not.toContain("Ada Administrator");
    expect(serialized).not.toContain("priorOutcome");
  });

  it("reports Course Progress across the marketplace against the active Lesson Unit denominator", async () => {
    const report = await marketplaceReport();

    expect(report.courseProgress).toEqual([{
      courseTitle: "Spanish B2",
      targetLanguage: "es",
      curriculumLevel: "B2",
      // The retired fifth unit stays in learning history and out of the denominator.
      activeLessonUnitCount: 4,
      // Only Attended establishes Lesson Unit Completion, so the corrected No-show
      // leaves its Student out of the Course entirely.
      completedActiveLessonUnitCount: 2,
      studentsWithProgressCount: 1,
      averageProgressPercentage: 50,
    }]);
  });

  it("reports current effective values rather than the report as it stood on a past date", async () => {
    const before = await marketplaceReport();
    expect(before.attendance.attendedCount).toBe(2);

    now = new Date("2026-06-26T12:00:00.000Z");
    await administerAttendance(unrecordedSessionId, [[sofiaId, "ATTENDED"], [danaId, "ATTENDED"]]);
    const after = await marketplaceReport();
    now = REPORT_INSTANT;

    // The same range, read later, tells the truth about outcomes recorded since
    // rather than reproducing the earlier reading.
    expect(after.attendance).toMatchObject({ attendedCount: 4, recordedCount: 6, excludedUnrecordedCount: 0 });
    expect(after.generatedAt).toBe("2026-06-26T12:00:00.000Z");
    expect(after.exceptions.items.map((item) => item.kind)).toEqual(["PENDING_ATTENDANCE_REVIEW"]);
  });

  it("reports Class Credit movement by ledger provenance inside the reported range", async () => {
    const report = await marketplaceReport();

    expect(report.credits).toMatchObject({
      creditAdjustmentCount: 1,
      grantedCount: 2,
      refundedCount: 1,
      deductedCount: 1,
      netCreditChange: 18,
    });
    expect(report.credits.bySource).toEqual([
      { source: "CREDIT_ADJUSTMENT", entryCount: 1, netAmount: 2 },
      // The May grant belongs to an earlier range and stays out of this one.
      { source: "SUBSCRIPTION_GRANT", entryCount: 1, netAmount: 8 },
      { source: "ORGANIZATION_CREDIT_GRANT", entryCount: 1, netAmount: 8 },
      { source: "BOOKING_DEDUCTION", entryCount: 1, netAmount: -1 },
      { source: "BOOKING_REFUND", entryCount: 1, netAmount: 1 },
    ]);
  });

  it("refuses a range wider than the accepted bound and audits the refusal", async () => {
    const overlongRange = randomUUID();
    const overlong = await graphql(
      `query Report($input: MarketplaceOperationalReportInput) { marketplaceOperationalReport(input: $input) { generatedAt } }`,
      { input: { fromLocalDate: "2025-06-01", toLocalDate: "2026-06-30" } },
      administratorSubject,
      overlongRange,
    );
    expect(overlong.errors?.[0]?.extensions.code).toBe("BAD_USER_INPUT");
    expect(await auditsFor(overlongRange)).toEqual([
      { operation: "marketplace-report.read", target_type: "MarketplaceReport", outcome: "DENIED", reason_code: "INVALID_REPORT_RANGE" },
    ]);

    const reversed = await graphql(
      `query Report($input: MarketplaceOperationalReportInput) { marketplaceOperationalReport(input: $input) { generatedAt } }`,
      { input: { fromLocalDate: "2026-06-30", toLocalDate: "2026-06-01" } },
      administratorSubject,
    );
    expect(reversed.errors?.[0]?.extensions.code).toBe("BAD_USER_INPUT");
  });

  it("defaults to a recent bounded range rather than the whole marketplace history", async () => {
    const report = await marketplaceReport(administratorSubject, null);

    // Thirty days ending on the administrator's own local date, not every Class
    // Session the marketplace has ever held.
    expect(report.range).toEqual({ fromLocalDate: "2026-05-27", toLocalDate: "2026-06-25", timeZone: "America/Denver" });
  });

  it("keeps the report inside Platform Administrator scope and audits every denied read", async () => {
    for (const [subject, correlationId] of [
      [teacherSubject, randomUUID()],
      [sofiaSubject, randomUUID()],
      [managerSubject, randomUUID()],
    ] as const) {
      const denied = await graphql(
        `query Report { marketplaceOperationalReport { generatedAt } }`,
        undefined,
        subject,
        correlationId,
      );
      expect(denied.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
      expect(await auditsFor(correlationId)).toEqual([
        { operation: "marketplace-report.read", target_type: "MarketplaceReport", outcome: "DENIED", reason_code: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED" },
      ]);
    }

    // An Organization Manager reaches only the Sponsorship-scoped report, and it
    // reports nobody: this Organization sponsors no one.
    const organizationReport = await graphql(
      `query { organizationAttendanceAndProgressReport { students { studentDisplayName } } }`,
      undefined,
      managerSubject,
    );
    expect(organizationReport.errors).toBeUndefined();
    expect(organizationReport.data!.organizationAttendanceAndProgressReport)
      .toEqual({ students: [] });
  });

  it("remembers the marketplace report as its own Platform Administrator workspace place", async () => {
    const rememberPlace = `
      mutation Remember($input: RememberRoleWorkspacePlaceInput!) {
        rememberRoleWorkspacePlace(input: $input) { role place }
      }
    `;
    const remembered = await graphql(
      rememberPlace,
      { input: { actingRole: "PLATFORM_ADMINISTRATOR", place: "ADMINISTRATION_REPORTS" } },
      administratorSubject,
    );
    expect(remembered.data!.rememberRoleWorkspacePlace)
      .toEqual({ role: "PLATFORM_ADMINISTRATOR", place: "ADMINISTRATION_REPORTS" });

    // The place belongs to the Platform Administrator and to no other role.
    const refused = await graphql(
      rememberPlace,
      { input: { actingRole: "TEACHER", place: "ADMINISTRATION_REPORTS" } },
      teacherSubject,
    );
    expect(refused.errors?.[0]?.extensions.code).toBe("BAD_USER_INPUT");
  });

  async function auditsFor(correlationId: string) {
    return db.selectFrom("audit_entries")
      .select(["operation", "target_type", "outcome", "reason_code"])
      .where("correlation_id", "=", correlationId)
      .execute();
  }

  async function createLessonUnit(index: number, state: "ACTIVE" | "RETIRED") {
    return db.transaction().execute(async (transaction) => {
      const unit = await transaction.insertInto("lesson_units").values({
        stable_key: `es-b2-0${index}`,
        course_id: courseId,
        title: `Unit ${index}`,
        summary: "Practice",
        objectives: JSON.stringify(["Practice"]),
        sort_order: index,
        state,
        replacement_lesson_unit_id: null,
        retired_at: state === "RETIRED" ? new Date("2026-01-01T00:00:00.000Z") : null,
      }).returning("id").executeTakeFirstOrThrow();
      await transaction.insertInto("lesson_unit_topics").values({ lesson_unit_id: unit.id, topic_key: "EC" }).execute();
      return unit.id;
    });
  }

  type DeliveredBooking = {
    studentUserId: string;
    cancelledAt?: string;
    terminalReason?: "RESCHEDULED" | "CLASS_SESSION_CANCELLATION";
  };

  /**
   * Publishes one Class Session delivering a Lesson Unit and books the given
   * Students. Seat reconciliation is a deferred constraint trigger, so the session
   * and its Bookings have to reach the database in one transaction. Ended Bookings
   * are arranged here rather than driven through their own mutations: what this
   * report has to get right is how it classifies an ended Booking, not how the
   * Booking ended.
   */
  async function deliver(
    lessonUnitId: string,
    startsAt: string,
    bookings: readonly DeliveredBooking[],
    classSessionState: "PUBLISHED" | "CANCELLED" = "PUBLISHED",
  ) {
    return db.transaction().execute(async (transaction) => {
      const activeBookings = bookings.filter((booking) => !booking.cancelledAt && !booking.terminalReason);
      const classSessionId = (await transaction.insertInto("class_sessions").values({
        lesson_unit_id: lessonUnitId,
        teacher_user_id: teacherId,
        starts_at: new Date(startsAt),
        scheduling_time_zone: "America/Denver",
        seat_capacity: 5,
        occupied_seats: activeBookings.length,
        state: classSessionState,
        ...(classSessionState === "CANCELLED"
          ? { cancellation_reason: "The Teacher Absence could not be covered.", cancelled_at: new Date(startsAt) }
          : {}),
      }).returning("id").executeTakeFirstOrThrow()).id;

      for (const booking of bookings) {
        const terminalReason = booking.cancelledAt ? "STUDENT_CANCELLATION" as const : booking.terminalReason ?? null;
        await transaction.insertInto("bookings").values({
          student_user_id: booking.studentUserId,
          class_session_id: classSessionId,
          teacher_user_id_at_booking: teacherId,
          state: terminalReason ? "ENDED" : "ACTIVE",
          terminal_reason: terminalReason,
          class_credit_refunded: false,
          late_cancellation_refund_until: null,
          booked_at: new Date(new Date(startsAt).getTime() - 14 * 24 * 60 * 60_000),
          ended_at: booking.cancelledAt ? new Date(booking.cancelledAt) : terminalReason ? new Date(startsAt) : null,
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
    expect(response.errors).toBeUndefined();
    expect(response.data!.administerAttendance).not.toHaveProperty("code");
  }

  async function requestAttendanceReview(bookingId: string) {
    const response = await graphql(`
      mutation Review($input: RequestAttendanceReviewInput!) {
        requestAttendanceReview(input: $input) {
          ... on RequestAttendanceReviewSuccess { attendanceReviewRequest { id } }
          ... on AttendanceReviewError { code message }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), bookingId, explanation: "I was present for the whole Class Session." } }, sofiaSubject);
    expect(response.errors).toBeUndefined();
    expect(response.data!.requestAttendanceReview).not.toHaveProperty("code");
  }

  type Report = {
    generatedAt: string;
    range: { fromLocalDate: string; toLocalDate: string; timeZone: string };
    attendance: Record<string, number | null>;
    cancellations: Record<string, number | null> & { dailyRates: Array<Record<string, number | string | null>> };
    corrections: Record<string, number | string | null>;
    credits: Record<string, number> & { bySource: Array<Record<string, number | string>> };
    courseProgress: Array<Record<string, number | string>>;
    exceptions: { totalCount: number; items: Array<Record<string, string | number>> };
  };

  async function marketplaceReport(
    subject = administratorSubject,
    input: { fromLocalDate: string; toLocalDate: string } | null = REPORTED_RANGE,
  ) {
    const response = await graphql(
      `query Report($input: MarketplaceOperationalReportInput) { marketplaceOperationalReport(input: $input) { ${REPORT_FIELDS} } }`,
      { input },
      subject,
    );
    expect(response.errors).toBeUndefined();
    return response.data!.marketplaceOperationalReport as Report;
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
      errors?: Array<{ extensions: { code: string } }>;
    };
  }
});
