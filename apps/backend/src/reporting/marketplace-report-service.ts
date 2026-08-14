import { Temporal } from "@js-temporal/polyfill";
import {
  attendanceRatePercentage,
  classSessionEndsAt,
  courseProgressPercentage,
  reportExceptionCount,
  studentCancellationRatePercentage,
  studentCancellationTiming,
} from "@marketplace/core";
import { sql } from "kysely";
import { z } from "zod";

import type { Database } from "../database/database.js";

type AdministratorActor = { id: string };

/**
 * The report reads a bounded range of activity, and it reads it in the Platform
 * Administrator's own Display Time Zone: a Class Session's scheduled date is the
 * date the reader saw it on, not a UTC accident. The 12-month bound is the same one
 * the Report Export carries (ADR 0056), so the ordinary report and its export cannot
 * disagree about how much activity one request may ask for.
 */
const MAXIMUM_RANGE_MONTHS = 12;
const DEFAULT_RANGE_DAYS = 30;
const EXCEPTION_LIST_LIMIT = 50;

const rangeInputSchema = z.object({
  fromLocalDate: z.iso.date().nullish(),
  toLocalDate: z.iso.date().nullish(),
}).strict();

export type MarketplaceReportInput = z.input<typeof rangeInputSchema>;

export class InvalidReportRange extends Error {}

type ResolvedRange = {
  fromLocalDate: string;
  toLocalDate: string;
  timeZone: string;
  startInstant: Date;
  endInstantExclusive: Date;
};

function resolveRange(input: MarketplaceReportInput, timeZone: string, now: Date): ResolvedRange {
  const parsed = rangeInputSchema.safeParse(input);
  if (!parsed.success) throw new InvalidReportRange("Choose a valid local date range.");

  let toDate: Temporal.PlainDate;
  let fromDate: Temporal.PlainDate;
  try {
    const today = Temporal.Instant.from(now.toISOString()).toZonedDateTimeISO(timeZone).toPlainDate();
    toDate = parsed.data.toLocalDate ? Temporal.PlainDate.from(parsed.data.toLocalDate) : today;
    fromDate = parsed.data.fromLocalDate
      ? Temporal.PlainDate.from(parsed.data.fromLocalDate)
      : toDate.subtract({ days: DEFAULT_RANGE_DAYS - 1 });
  } catch {
    throw new InvalidReportRange("Choose a valid local date range.");
  }
  if (Temporal.PlainDate.compare(fromDate, toDate) > 0) {
    throw new InvalidReportRange("Choose a range that starts on or before it ends.");
  }
  const lastAllowedDate = fromDate.add({ months: MAXIMUM_RANGE_MONTHS }).subtract({ days: 1 });
  if (Temporal.PlainDate.compare(toDate, lastAllowedDate) > 0) {
    throw new InvalidReportRange(`Choose a range of at most ${MAXIMUM_RANGE_MONTHS} months.`);
  }

  try {
    return {
      fromLocalDate: fromDate.toString(),
      toLocalDate: toDate.toString(),
      timeZone,
      startInstant: new Date(fromDate.toPlainDateTime("00:00").toZonedDateTime(timeZone, { disambiguation: "compatible" }).epochMilliseconds),
      endInstantExclusive: new Date(toDate.add({ days: 1 }).toPlainDateTime("00:00").toZonedDateTime(timeZone, { disambiguation: "compatible" }).epochMilliseconds),
    };
  } catch {
    throw new InvalidReportRange("Choose a local date range with valid boundaries in the saved Display Time Zone.");
  }
}

function localDateOf(instant: Date, timeZone: string) {
  return Temporal.Instant.from(instant.toISOString()).toZonedDateTimeISO(timeZone).toPlainDate().toString();
}

type AttendanceCounts = { attendedCount: number; noShowCount: number; excludedUnrecordedCount: number; correctedCount: number };
type CancellationCounts = { studentCancellationCount: number; timelyCount: number; lateCount: number };

function emptyAttendance(): AttendanceCounts {
  return { attendedCount: 0, noShowCount: 0, excludedUnrecordedCount: 0, correctedCount: 0 };
}

function emptyCancellations(): CancellationCounts {
  return { studentCancellationCount: 0, timelyCount: 0, lateCount: 0 };
}

function projectAttendance(counts: AttendanceCounts) {
  return {
    attendedCount: counts.attendedCount,
    noShowCount: counts.noShowCount,
    recordedCount: counts.attendedCount + counts.noShowCount,
    attendanceRatePercentage: attendanceRatePercentage(counts),
    excludedUnrecordedCount: counts.excludedUnrecordedCount,
    correctedCount: counts.correctedCount,
    exceptionCount: reportExceptionCount(counts),
  };
}

/**
 * Every Booking whose Class Session was scheduled inside the reported range, with
 * only the facts the marketplace rates are defined over. A Booking ended by a Class
 * Session Cancellation or a Reschedule reaches this query too, because both are
 * excluded from the rates by name and the report discloses the exclusion rather than
 * quietly dropping the row.
 */
async function reportedBookings(db: Database, range: ResolvedRange) {
  return db.selectFrom("bookings")
    .innerJoin("class_sessions", "class_sessions.id", "bookings.class_session_id")
    .leftJoin("attendance_records", "attendance_records.booking_id", "bookings.id")
    .select([
      "bookings.id",
      "bookings.state",
      "bookings.terminal_reason",
      "bookings.ended_at",
      "class_sessions.id as class_session_id",
      "class_sessions.starts_at",
      "class_sessions.state as class_session_state",
      "attendance_records.outcome",
      sql<number>`(select count(*) from attendance_record_corrections where attendance_record_corrections.booking_id = bookings.id)::integer`.as("correction_count"),
    ])
    .where("class_sessions.starts_at", ">=", range.startInstant)
    .where("class_sessions.starts_at", "<", range.endInstantExclusive)
    .execute();
}

type ReportedBooking = Awaited<ReturnType<typeof reportedBookings>>[number];

/**
 * What one Booking contributes to the marketplace rates. Anything a rate excludes by
 * name keeps its own classification so the exclusion can be counted and shown, and a
 * Class Session that has not finished yet contributes nothing at all: it is neither
 * an outcome nor an exception.
 */
function classify(booking: ReportedBooking, now: Date) {
  if (booking.terminal_reason === "STUDENT_CANCELLATION") return "STUDENT_CANCELLATION" as const;
  if (booking.terminal_reason === "RESCHEDULED") return "RESCHEDULED" as const;
  if (booking.terminal_reason === "CLASS_SESSION_CANCELLATION" || booking.class_session_state === "CANCELLED") {
    return "CLASS_SESSION_CANCELLATION" as const;
  }
  if (booking.outcome) return booking.outcome;
  return classSessionEndsAt(booking.starts_at).getTime() <= now.getTime()
    ? "UNRECORDED" as const
    : "NOT_YET_REPORTABLE" as const;
}

/**
 * Course Progress is a current-effective aggregate, so it is measured now rather than
 * inside the reported range: the range scopes which activity is counted, never which
 * moment the values are read at. Only Students who have completed at least one active
 * Lesson Unit of a Course enter its average, so a Course is not reported as failing
 * because most of the marketplace has never studied it.
 */
async function courseProgressReport(db: Database) {
  const rows = await db.selectFrom("courses")
    .leftJoin("lesson_units", (join) => join
      .onRef("lesson_units.course_id", "=", "courses.id")
      .on("lesson_units.state", "=", "ACTIVE"))
    .leftJoin("lesson_unit_completions", "lesson_unit_completions.lesson_unit_id", "lesson_units.id")
    .select([
      "courses.id",
      "courses.title",
      "courses.target_language",
      "courses.curriculum_level",
      sql<number>`count(distinct lesson_units.id)::integer`.as("active_lesson_unit_count"),
      sql<number>`count(lesson_unit_completions.id)::integer`.as("completed_active_lesson_unit_count"),
      sql<number>`count(distinct lesson_unit_completions.student_user_id)::integer`.as("students_with_progress_count"),
    ])
    .groupBy(["courses.id", "courses.title", "courses.target_language", "courses.curriculum_level"])
    .execute();

  return rows
    .map((row) => ({
      courseId: row.id,
      courseTitle: row.title,
      targetLanguage: row.target_language,
      curriculumLevel: row.curriculum_level,
      activeLessonUnitCount: row.active_lesson_unit_count,
      completedActiveLessonUnitCount: row.completed_active_lesson_unit_count,
      studentsWithProgressCount: row.students_with_progress_count,
      averageProgressPercentage: courseProgressPercentage(
        row.completed_active_lesson_unit_count,
        row.active_lesson_unit_count * row.students_with_progress_count,
      ),
    }))
    .sort((first, second) => first.averageProgressPercentage - second.averageProgressPercentage
      || first.courseTitle.localeCompare(second.courseTitle));
}

const CREDIT_SOURCES = ["CREDIT_ADJUSTMENT", "SUBSCRIPTION_GRANT", "ORGANIZATION_CREDIT_GRANT", "BOOKING_DEDUCTION", "BOOKING_REFUND"] as const;

/**
 * Class Credit movement across the marketplace, by ledger provenance and never by
 * Student: an operational report answers how credits entered and left the platform,
 * while one Student's balance stays behind the administration surface that already
 * requires naming them.
 */
async function creditReport(db: Database, range: ResolvedRange) {
  const rows = await db.selectFrom("class_credit_ledger_entries")
    .select([
      "source",
      sql<number>`count(*)::integer`.as("entry_count"),
      sql<number>`coalesce(sum(amount), 0)::integer`.as("net_amount"),
    ])
    .where("created_at", ">=", range.startInstant)
    .where("created_at", "<", range.endInstantExclusive)
    .groupBy("source")
    .execute();

  const bySource = CREDIT_SOURCES.map((source) => {
    const row = rows.find((candidate) => candidate.source === source);
    return { source, entryCount: row?.entry_count ?? 0, netAmount: row?.net_amount ?? 0 };
  });
  const totalFor = (source: (typeof CREDIT_SOURCES)[number]) => bySource.find((entry) => entry.source === source)!;

  return {
    // A Credit Adjustment is the exception among credit movements: it is the one an
    // administrator issued by hand, with a Student-visible reason behind it.
    creditAdjustmentCount: totalFor("CREDIT_ADJUSTMENT").entryCount,
    grantedCount: totalFor("SUBSCRIPTION_GRANT").entryCount + totalFor("ORGANIZATION_CREDIT_GRANT").entryCount,
    refundedCount: totalFor("BOOKING_REFUND").entryCount,
    deductedCount: totalFor("BOOKING_DEDUCTION").entryCount,
    netCreditChange: bySource.reduce((total, entry) => total + entry.netAmount, 0),
    bySource,
  };
}

/**
 * The Attendance corrections the reported range carries, as a marker and nothing
 * more. ADR 0056 keeps the prior values in a separately authorized correction-history
 * extract and the correcting actor and reason in the filtered Audit Log, so a report
 * that showed them here would quietly widen both.
 */
async function correctionReport(db: Database, range: ResolvedRange) {
  const corrections = await db.selectFrom("attendance_record_corrections")
    .innerJoin("bookings", "bookings.id", "attendance_record_corrections.booking_id")
    .innerJoin("class_sessions", "class_sessions.id", "bookings.class_session_id")
    .select([
      sql<number>`count(*)::integer`.as("corrected_count"),
      sql<Date | null>`max(attendance_record_corrections.corrected_at)`.as("last_corrected_at"),
    ])
    .where("class_sessions.starts_at", ">=", range.startInstant)
    .where("class_sessions.starts_at", "<", range.endInstantExclusive)
    .executeTakeFirstOrThrow();

  const pending = await db.selectFrom("attendance_review_requests")
    .innerJoin("bookings", "bookings.id", "attendance_review_requests.booking_id")
    .innerJoin("class_sessions", "class_sessions.id", "bookings.class_session_id")
    .select(sql<number>`count(*)::integer`.as("pending_count"))
    .where("attendance_review_requests.state", "=", "PENDING")
    .where("class_sessions.starts_at", ">=", range.startInstant)
    .where("class_sessions.starts_at", "<", range.endInstantExclusive)
    .executeTakeFirstOrThrow();

  return {
    correctedAttendanceCount: corrections.corrected_count,
    lastCorrectedAt: corrections.last_corrected_at?.toISOString() ?? null,
    pendingAttendanceReviewCount: pending.pending_count,
  };
}

type ExceptionItem = {
  kind: "UNRECORDED_ATTENDANCE" | "PENDING_ATTENDANCE_REVIEW";
  classSessionId: string;
  occurredAt: string;
  courseTitle: string;
  lessonUnitTitle: string;
  teacherDisplayName: string;
  affectedBookingCount: number;
};

/**
 * The actionable exceptions behind the counts, as domain facts a Platform
 * Administrator can act on: which Class Session still has no outcome, and who leads
 * it. Nothing here is a diagnostic — no correlation identifier, no log line, no
 * provider failure code — so finding the work never means reading the operational
 * telemetry that reporting deliberately does not expose.
 */
async function exceptionItems(db: Database, range: ResolvedRange, now: Date): Promise<ExceptionItem[]> {
  const unrecorded = await db.selectFrom("class_sessions")
    .innerJoin("lesson_units", "lesson_units.id", "class_sessions.lesson_unit_id")
    .innerJoin("courses", "courses.id", "lesson_units.course_id")
    .innerJoin("users", "users.id", "class_sessions.teacher_user_id")
    .innerJoin("bookings", "bookings.class_session_id", "class_sessions.id")
    .leftJoin("attendance_records", "attendance_records.booking_id", "bookings.id")
    .select([
      "class_sessions.id",
      "class_sessions.starts_at",
      "courses.title as course_title",
      "lesson_units.title as lesson_unit_title",
      "users.display_name as teacher_display_name",
      sql<number>`count(*)::integer`.as("affected_booking_count"),
    ])
    .where("class_sessions.state", "=", "PUBLISHED")
    .where("class_sessions.starts_at", ">=", range.startInstant)
    .where("class_sessions.starts_at", "<", range.endInstantExclusive)
    .where("bookings.state", "=", "ACTIVE")
    .where("attendance_records.id", "is", null)
    .groupBy(["class_sessions.id", "class_sessions.starts_at", "courses.title", "lesson_units.title", "users.display_name"])
    .execute();

  const pendingReviews = await db.selectFrom("attendance_review_requests")
    .innerJoin("bookings", "bookings.id", "attendance_review_requests.booking_id")
    .innerJoin("class_sessions", "class_sessions.id", "bookings.class_session_id")
    .innerJoin("lesson_units", "lesson_units.id", "class_sessions.lesson_unit_id")
    .innerJoin("courses", "courses.id", "lesson_units.course_id")
    .innerJoin("users", "users.id", "class_sessions.teacher_user_id")
    .select([
      "class_sessions.id",
      "class_sessions.starts_at",
      "courses.title as course_title",
      "lesson_units.title as lesson_unit_title",
      "users.display_name as teacher_display_name",
      sql<number>`count(*)::integer`.as("affected_booking_count"),
    ])
    .where("attendance_review_requests.state", "=", "PENDING")
    .where("class_sessions.starts_at", ">=", range.startInstant)
    .where("class_sessions.starts_at", "<", range.endInstantExclusive)
    .groupBy(["class_sessions.id", "class_sessions.starts_at", "courses.title", "lesson_units.title", "users.display_name"])
    .execute();

  const item = (kind: ExceptionItem["kind"]) => (row: (typeof unrecorded)[number]): ExceptionItem => ({
    kind,
    classSessionId: row.id,
    occurredAt: row.starts_at.toISOString(),
    courseTitle: row.course_title,
    lessonUnitTitle: row.lesson_unit_title,
    teacherDisplayName: row.teacher_display_name,
    affectedBookingCount: row.affected_booking_count,
  });

  return [
    // Attendance is Unrecorded only once the Class Session is treated as completed;
    // before its scheduled end there is nothing for anyone to record.
    ...unrecorded
      .filter((row) => classSessionEndsAt(row.starts_at).getTime() <= now.getTime())
      .map(item("UNRECORDED_ATTENDANCE")),
    ...pendingReviews.map(item("PENDING_ATTENDANCE_REVIEW")),
  ].sort((first, second) => first.occurredAt.localeCompare(second.occurredAt)
    || first.kind.localeCompare(second.kind)
    || first.classSessionId.localeCompare(second.classSessionId));
}

/**
 * The Platform Administrator's exception-first marketplace report: attendance,
 * cancellations, Course Progress, Class Credits, and Attendance corrections across
 * the whole marketplace, for a bounded range of activity read in the administrator's
 * own Display Time Zone.
 *
 * Every value it returns is current-effective as of `generatedAt`. The range selects
 * which activity is counted, never which moment the facts are read at, so a later
 * request for the same range truthfully reflects corrections accepted in between.
 * Historical as-of regeneration is deliberately absent (ADR 0056).
 */
export async function marketplaceOperationalReport(
  db: Database,
  administrator: AdministratorActor,
  input: MarketplaceReportInput,
  now: Date,
) {
  const user = await db.selectFrom("users")
    .select("display_time_zone")
    .where("id", "=", administrator.id)
    .executeTakeFirstOrThrow();
  if (!user.display_time_zone) {
    throw new InvalidReportRange("A saved Display Time Zone is required to read the marketplace report.");
  }
  const range = resolveRange(input, user.display_time_zone, now);

  const bookings = await reportedBookings(db, range);
  const attendance = emptyAttendance();
  const cancellations = emptyCancellations();
  let excludedClassSessionCancellationCount = 0;
  let excludedRescheduleCount = 0;
  const daily = new Map<string, { attendance: AttendanceCounts; cancellations: CancellationCounts }>();

  for (const booking of bookings) {
    const classification = classify(booking, now);
    if (classification === "NOT_YET_REPORTABLE") continue;
    if (classification === "RESCHEDULED") {
      excludedRescheduleCount += 1;
      continue;
    }
    if (classification === "CLASS_SESSION_CANCELLATION") {
      excludedClassSessionCancellationCount += 1;
      continue;
    }

    // Both rates group by the Class Session's scheduled date, so a cancellation made
    // weeks earlier still lands on the date whose seat it gave up.
    const localDate = localDateOf(booking.starts_at, range.timeZone);
    const forDate = daily.get(localDate) ?? { attendance: emptyAttendance(), cancellations: emptyCancellations() };
    daily.set(localDate, forDate);

    if (classification === "STUDENT_CANCELLATION") {
      const timing = studentCancellationTiming(booking.ended_at ?? booking.starts_at, booking.starts_at);
      for (const counts of [cancellations, forDate.cancellations]) {
        counts.studentCancellationCount += 1;
        if (timing === "TIMELY") counts.timelyCount += 1;
        else counts.lateCount += 1;
      }
      continue;
    }

    for (const counts of [attendance, forDate.attendance]) {
      if (classification === "ATTENDED") counts.attendedCount += 1;
      else if (classification === "NO_SHOW") counts.noShowCount += 1;
      else counts.excludedUnrecordedCount += 1;
      if (booking.correction_count > 0) counts.correctedCount += 1;
    }
  }

  const exceptions = await exceptionItems(db, range, now);
  const [courseProgress, credits, corrections] = await Promise.all([
    courseProgressReport(db),
    creditReport(db, range),
    correctionReport(db, range),
  ]);

  return {
    generatedAt: now.toISOString(),
    range: { fromLocalDate: range.fromLocalDate, toLocalDate: range.toLocalDate, timeZone: range.timeZone },
    attendance: projectAttendance(attendance),
    cancellations: {
      ...cancellations,
      studentCancellationRatePercentage: studentCancellationRatePercentage({ ...cancellations, ...attendance }),
      excludedClassSessionCancellationCount,
      excludedRescheduleCount,
      dailyRates: [...daily]
        .map(([localDate, counts]) => ({
          localDate,
          ...counts.cancellations,
          recordedOutcomeCount: counts.attendance.attendedCount + counts.attendance.noShowCount,
          studentCancellationRatePercentage: studentCancellationRatePercentage({
            ...counts.cancellations,
            ...counts.attendance,
          }),
        }))
        .sort((first, second) => first.localDate.localeCompare(second.localDate)),
    },
    corrections,
    credits,
    courseProgress,
    // Exception-first: the work needing attention leads, oldest first, and the total
    // is disclosed even where the list itself is bounded.
    exceptions: { totalCount: exceptions.length, items: exceptions.slice(0, EXCEPTION_LIST_LIMIT) },
  };
}
