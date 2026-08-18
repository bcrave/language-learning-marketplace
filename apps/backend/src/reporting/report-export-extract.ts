import {
  csvDocument,
  exportProgressPercentage,
  reportExportRowLimitRefusal,
  REPORT_EXPORT_COLUMNS,
  REPORT_EXPORT_SCHEMA_VERSIONS,
  type ReportExportKind,
} from "@marketplace/core";
import { sql, type SqlBool } from "kysely";

import type { Database } from "../database/database.js";
import { exportInstant, type ResolvedReportRange } from "./report-range.js";

/** The requested range plus the instant the whole extract describes. */
export type ExtractRange = ResolvedReportRange & { dataAsOf: Date };

export type ReportExportScope = {
  kind: ReportExportKind;
  /** The Organization one Organization Manager may extract, or null for marketplace-wide. */
  organizationId: string | null;
  range: ExtractRange;
};

type CsvRow = readonly (string | number | boolean | null)[];

/**
 * A Sponsorship overlaps the requested period. The reporting window is the
 * Sponsorship's own: activity before acceptance or after ending was never
 * Organization-visible, so the period can narrow that window but never widen it.
 */
function overlapsRange(range: ResolvedReportRange) {
  return sql<SqlBool>`sponsorships.accepted_at < ${range.endInstantExclusive}
    and (sponsorships.ended_at is null or sponsorships.ended_at >= ${range.startInstant})`;
}

/** The reported window of one Sponsorship, clipped to the requested period. */
function reportedWindow(range: ResolvedReportRange, column: string) {
  return sql<SqlBool>`${sql.raw(column)} >= greatest(sponsorships.accepted_at, ${range.startInstant})
    and ${sql.raw(column)} < least(coalesce(sponsorships.ended_at, 'infinity'::timestamptz), ${range.endInstantExclusive})`;
}

type OrdinaryRowSource = {
  sponsorshipId: string;
  organizationId: string;
  organizationName: string;
  studentUserId: string;
  studentDisplayName: string;
  courseId: string;
  targetLanguage: string;
  curriculumLevel: string;
  courseTitle: string;
  snapshotKind: "start" | "current" | "end";
  snapshotAt: Date;
  completedUnitCount: number;
  activeUnitCount: number;
  completedDuringSponsorship: number;
  correctionCount: number;
  latestCorrectionAt: Date | null;
};

const SNAPSHOT_KIND_ORDER = { start: 0, current: 1, end: 2 } as const;

/**
 * The ordinary extract: current effective Sponsorship reporting facts plus the
 * markers that say a fact was revised, at the grain of one Sponsorship, Course, and
 * snapshot boundary.
 *
 * Every query runs inside the caller's snapshot transaction, so the frozen
 * boundaries, the live progress beside them, and the correction markers all describe
 * the same instant. Nothing here reads a Class Roster, private Learning Feedback, a
 * Session Rating, or a Class Credit balance.
 */
async function ordinaryRows(transaction: Database, scope: ReportExportScope): Promise<OrdinaryRowSource[]> {
  const { range } = scope;
  const sponsorships = await transaction.selectFrom("sponsorships")
    .innerJoin("organizations", "organizations.id", "sponsorships.organization_id")
    .innerJoin("users", "users.id", "sponsorships.student_user_id")
    .select([
      "sponsorships.id as sponsorship_id",
      "sponsorships.organization_id",
      "organizations.name as organization_name",
      "sponsorships.student_user_id",
      "users.display_name as student_display_name",
      "sponsorships.state",
    ])
    .where(overlapsRange(range))
    .$if(scope.organizationId !== null, (query) =>
      query.where("sponsorships.organization_id", "=", scope.organizationId!))
    .execute();
  if (sponsorships.length === 0) return [];

  const sponsorshipIds = sponsorships.map((sponsorship) => sponsorship.sponsorship_id);
  const studentUserIds = [...new Set(sponsorships.map((sponsorship) => sponsorship.student_user_id))];

  const snapshots = await transaction.selectFrom("course_progress_snapshots")
    .innerJoin("courses", "courses.id", "course_progress_snapshots.course_id")
    .select([
      "course_progress_snapshots.sponsorship_id",
      "course_progress_snapshots.boundary",
      "course_progress_snapshots.course_id",
      "courses.title as course_title",
      "courses.target_language",
      "courses.curriculum_level",
      "course_progress_snapshots.completed_active_lesson_unit_count",
      "course_progress_snapshots.active_lesson_unit_count",
      "course_progress_snapshots.captured_at",
      "course_progress_snapshots.revision_count",
      "course_progress_snapshots.revised_at",
    ])
    .where("course_progress_snapshots.sponsorship_id", "in", sponsorshipIds)
    .execute();

  // Only the Courses that already carry a reportable fact are measured: a frozen
  // boundary of this Sponsorship, or a completion the Student holds now.
  const completedCourses = await transaction.selectFrom("lesson_unit_completions")
    .innerJoin("lesson_units", "lesson_units.id", "lesson_unit_completions.lesson_unit_id")
    .select("lesson_units.course_id")
    .distinct()
    .where("lesson_unit_completions.student_user_id", "in", studentUserIds)
    .execute();
  const reportableCourseIds = [...new Set([
    ...snapshots.map((snapshot) => snapshot.course_id),
    ...completedCourses.map((course) => course.course_id),
  ])];

  // The live aggregate behind a `current` row, measured against the Lesson Units
  // active now rather than against any frozen denominator. The denominator is a
  // property of the Course and the numerator of the Student, so they are counted
  // separately instead of through a Student-by-Course grid.
  const courses = reportableCourseIds.length === 0 ? [] : await transaction.selectFrom("courses")
    .leftJoin("lesson_units", (join) => join
      .onRef("lesson_units.course_id", "=", "courses.id")
      .on("lesson_units.state", "=", "ACTIVE"))
    .select([
      "courses.id",
      "courses.title",
      "courses.target_language",
      "courses.curriculum_level",
      sql<number>`count(lesson_units.id)::integer`.as("active_count"),
    ])
    .where("courses.id", "in", reportableCourseIds)
    .groupBy(["courses.id", "courses.title", "courses.target_language", "courses.curriculum_level"])
    .execute();

  const completionCounts = reportableCourseIds.length === 0 ? [] : await transaction.selectFrom("lesson_unit_completions")
    .innerJoin("lesson_units", (join) => join
      .onRef("lesson_units.id", "=", "lesson_unit_completions.lesson_unit_id")
      .on("lesson_units.state", "=", "ACTIVE"))
    .select([
      "lesson_unit_completions.student_user_id",
      "lesson_units.course_id",
      sql<number>`count(*)::integer`.as("completed_count"),
    ])
    .where("lesson_unit_completions.student_user_id", "in", studentUserIds)
    .where("lesson_units.course_id", "in", reportableCourseIds)
    .groupBy(["lesson_unit_completions.student_user_id", "lesson_units.course_id"])
    .execute();

  // The period-attributed gain: Lesson Unit Completions earned inside both the
  // requested period and the Sponsorship's own reporting window.
  const periodGains = await transaction.selectFrom("lesson_unit_completions")
    .innerJoin("lesson_units", "lesson_units.id", "lesson_unit_completions.lesson_unit_id")
    .innerJoin("sponsorships", "sponsorships.student_user_id", "lesson_unit_completions.student_user_id")
    .select([
      "sponsorships.id as sponsorship_id",
      "lesson_units.course_id",
      sql<number>`count(*)::integer`.as("completed_during_sponsorship"),
    ])
    .where("sponsorships.id", "in", sponsorshipIds)
    .where(reportedWindow(range, "lesson_unit_completions.earned_at"))
    .groupBy(["sponsorships.id", "lesson_units.course_id"])
    .execute();

  // The correction markers a `current` row carries: Attendance Record Corrections
  // touching this Course inside the reported window. The prior outcomes behind them
  // stay in the separately authorized correction-history extract.
  const corrections = await transaction.selectFrom("attendance_record_corrections")
    .innerJoin("bookings", "bookings.id", "attendance_record_corrections.booking_id")
    .innerJoin("class_sessions", "class_sessions.id", "bookings.class_session_id")
    .innerJoin("lesson_units", "lesson_units.id", "class_sessions.lesson_unit_id")
    .innerJoin("sponsorships", "sponsorships.student_user_id", "bookings.student_user_id")
    .select([
      "sponsorships.id as sponsorship_id",
      "lesson_units.course_id",
      sql<number>`count(*)::integer`.as("correction_count"),
      sql<Date | null>`max(attendance_record_corrections.corrected_at)`.as("latest_correction_at"),
    ])
    .where("sponsorships.id", "in", sponsorshipIds)
    .where(reportedWindow(range, "class_sessions.starts_at"))
    .groupBy(["sponsorships.id", "lesson_units.course_id"])
    .execute();

  const rows: OrdinaryRowSource[] = [];
  for (const sponsorship of sponsorships) {
    const own = snapshots.filter((snapshot) => snapshot.sponsorship_id === sponsorship.sponsorship_id);
    const gainFor = (courseId: string) => periodGains.find((gain) =>
      gain.sponsorship_id === sponsorship.sponsorship_id && gain.course_id === courseId)?.completed_during_sponsorship ?? 0;
    const identity = {
      sponsorshipId: sponsorship.sponsorship_id,
      organizationId: sponsorship.organization_id,
      organizationName: sponsorship.organization_name,
      studentUserId: sponsorship.student_user_id,
      studentDisplayName: sponsorship.student_display_name,
    };

    for (const snapshot of own) {
      rows.push({
        ...identity,
        courseId: snapshot.course_id,
        courseTitle: snapshot.course_title,
        targetLanguage: snapshot.target_language,
        curriculumLevel: snapshot.curriculum_level,
        snapshotKind: snapshot.boundary === "SPONSORSHIP_START" ? "start" : "end",
        snapshotAt: snapshot.captured_at,
        completedUnitCount: snapshot.completed_active_lesson_unit_count,
        activeUnitCount: snapshot.active_lesson_unit_count,
        completedDuringSponsorship: gainFor(snapshot.course_id),
        // A frozen boundary's own revisions are what was revised about it. An
        // Attendance correction elsewhere in the period did not change these values.
        correctionCount: snapshot.revision_count,
        latestCorrectionAt: snapshot.revised_at,
      });
    }

    // Reporting for an ended Sponsorship stays frozen at its ending snapshot, so no
    // live row is written for it at all.
    if (sponsorship.state !== "ACTIVE") continue;
    const completedFor = (courseId: string) => completionCounts.find((count) =>
      count.student_user_id === sponsorship.student_user_id && count.course_id === courseId)?.completed_count ?? 0;
    const currentCourseIds = new Set([
      ...own.map((snapshot) => snapshot.course_id),
      ...reportableCourseIds.filter((courseId) => completedFor(courseId) > 0),
    ]);
    for (const courseId of currentCourseIds) {
      const course = courses.find((candidate) => candidate.id === courseId);
      if (!course) continue;
      const correction = corrections.find((entry) =>
        entry.sponsorship_id === sponsorship.sponsorship_id && entry.course_id === courseId);
      rows.push({
        ...identity,
        courseId,
        courseTitle: course.title,
        targetLanguage: course.target_language,
        curriculumLevel: course.curriculum_level,
        snapshotKind: "current",
        // A current row is not a frozen boundary: the instant it describes is the
        // snapshot instant of the extract itself.
        snapshotAt: range.dataAsOf,
        completedUnitCount: completedFor(courseId),
        activeUnitCount: course.active_count,
        completedDuringSponsorship: gainFor(courseId),
        correctionCount: correction?.correction_count ?? 0,
        latestCorrectionAt: correction?.latest_correction_at ?? null,
      });
    }
  }

  return rows.sort((first, second) =>
    first.organizationName.localeCompare(second.organizationName)
    || first.studentDisplayName.localeCompare(second.studentDisplayName)
    || first.studentUserId.localeCompare(second.studentUserId)
    || first.courseTitle.localeCompare(second.courseTitle)
    || first.courseId.localeCompare(second.courseId)
    || SNAPSHOT_KIND_ORDER[first.snapshotKind] - SNAPSHOT_KIND_ORDER[second.snapshotKind]);
}

type CorrectionRowSource = {
  organizationId: string | null;
  subjectRef: string;
  subjectType: "attendance" | "course_progress_snapshot";
  studentUserId: string;
  fieldCode: string;
  revisionSequence: number;
  priorValue: string;
  currentValue: string;
  changedAt: Date;
};

/**
 * The correction-history extract: the prior and current value behind every revision
 * of a fact the requested period reports.
 *
 * The period selects revised facts by the date the fact itself is reported on — a
 * Class Session's scheduled date, a Course Progress Snapshot's boundary — rather
 * than by when the revision was made, so this extract explains exactly the
 * correction markers the ordinary extract shows for the same range.
 *
 * No correcting actor and no reason appear here. Both stay in the filtered,
 * append-only Audit Log.
 */
async function correctionHistoryRows(transaction: Database, scope: ReportExportScope): Promise<CorrectionRowSource[]> {
  const { range } = scope;
  const attendance = await transaction.selectFrom("attendance_record_corrections")
    .innerJoin("bookings", "bookings.id", "attendance_record_corrections.booking_id")
    .innerJoin("class_sessions", "class_sessions.id", "bookings.class_session_id")
    .leftJoin("attendance_records", "attendance_records.booking_id", "bookings.id")
    .select(({ selectFrom }) => [
      "attendance_record_corrections.id",
      "attendance_record_corrections.booking_id",
      "attendance_records.id as attendance_record_id",
      "bookings.student_user_id",
      "attendance_record_corrections.prior_outcome",
      "attendance_record_corrections.corrected_outcome",
      "attendance_record_corrections.corrected_at",
      // The Organization whose reporting covered the Student when the Class Session
      // occurred, if any. An unsponsored Student's revision carries no Organization
      // rather than being attributed to one it never belonged to.
      selectFrom("sponsorships")
        .select("sponsorships.organization_id")
        .whereRef("sponsorships.student_user_id", "=", "bookings.student_user_id")
        .whereRef("sponsorships.accepted_at", "<=", "class_sessions.starts_at")
        .where(sql<SqlBool>`(sponsorships.ended_at is null or sponsorships.ended_at > class_sessions.starts_at)`)
        .limit(1)
        .as("organization_id"),
    ])
    .where("class_sessions.starts_at", ">=", range.startInstant)
    .where("class_sessions.starts_at", "<", range.endInstantExclusive)
    .orderBy("attendance_record_corrections.corrected_at")
    .orderBy("attendance_record_corrections.id")
    .execute();

  const sequenceByBooking = new Map<string, number>();
  const attendanceRows = attendance.map((correction): CorrectionRowSource => {
    const revisionSequence = (sequenceByBooking.get(correction.booking_id) ?? 0) + 1;
    sequenceByBooking.set(correction.booking_id, revisionSequence);
    return {
      organizationId: correction.organization_id ?? null,
      // A correction always revises the Attendance Record of its Booking; the
      // Booking identifies it when a reconciliation left no record behind.
      subjectRef: correction.attendance_record_id ?? correction.booking_id,
      subjectType: "attendance",
      studentUserId: correction.student_user_id,
      fieldCode: "outcome",
      revisionSequence,
      priorValue: correction.prior_outcome.toLowerCase(),
      currentValue: correction.corrected_outcome.toLowerCase(),
      changedAt: correction.corrected_at,
    };
  });

  const snapshotRevisions = await transaction.selectFrom("course_progress_snapshot_revisions")
    .innerJoin("course_progress_snapshots", "course_progress_snapshots.id", "course_progress_snapshot_revisions.snapshot_id")
    .innerJoin("sponsorships", "sponsorships.id", "course_progress_snapshots.sponsorship_id")
    .select([
      "course_progress_snapshot_revisions.snapshot_id",
      "course_progress_snapshot_revisions.revision_sequence",
      "course_progress_snapshot_revisions.field_code",
      "course_progress_snapshot_revisions.prior_value",
      "course_progress_snapshot_revisions.current_value",
      "course_progress_snapshot_revisions.revised_at",
      "sponsorships.organization_id",
      "sponsorships.student_user_id",
    ])
    // The ordinary extract writes a boundary row, and its revision marker, for every
    // Sponsorship the period overlaps — whatever instant the boundary froze at. The
    // history extract selects the same population, so it never omits the revision
    // behind a marker the ordinary extract shows for the same range.
    .where(overlapsRange(range))
    .execute();

  return [
    ...attendanceRows,
    ...snapshotRevisions.map((revision): CorrectionRowSource => ({
      organizationId: revision.organization_id,
      subjectRef: revision.snapshot_id,
      subjectType: "course_progress_snapshot",
      studentUserId: revision.student_user_id,
      fieldCode: revision.field_code,
      revisionSequence: revision.revision_sequence,
      priorValue: String(revision.prior_value),
      currentValue: String(revision.current_value),
      changedAt: revision.revised_at,
    })),
  ].sort((first, second) =>
    first.changedAt.getTime() - second.changedAt.getTime()
    || first.subjectType.localeCompare(second.subjectType)
    || first.subjectRef.localeCompare(second.subjectRef)
    || first.revisionSequence - second.revisionSequence);
}

/**
 * Builds one Report Export's CSV inside the caller's consistent snapshot. The row
 * count is returned beside the document so the caller can refuse an extract that
 * exceeds the accepted bound rather than write a truncated file.
 */
export async function buildReportExtract(transaction: Database, scope: ReportExportScope) {
  const { range } = scope;
  const schemaVersion = REPORT_EXPORT_SCHEMA_VERSIONS[scope.kind];
  const provenance = [schemaVersion, exportInstant(range.dataAsOf, range.timeZone), range.timeZone];
  const instant = (value: Date | null) => value === null ? null : exportInstant(value, range.timeZone);

  const rows: CsvRow[] = scope.kind === "ORDINARY"
    ? (await ordinaryRows(transaction, scope)).map((row) => [
      ...provenance,
      range.fromLocalDate,
      range.endExclusiveLocalDate,
      row.organizationId,
      row.organizationName,
      row.studentUserId,
      row.studentDisplayName,
      row.courseId,
      row.targetLanguage,
      row.curriculumLevel,
      row.snapshotKind,
      instant(row.snapshotAt),
      row.completedUnitCount,
      row.activeUnitCount,
      exportProgressPercentage(row.completedUnitCount, row.activeUnitCount),
      row.completedDuringSponsorship,
      row.correctionCount > 0,
      row.correctionCount,
      instant(row.latestCorrectionAt),
    ])
    : (await correctionHistoryRows(transaction, scope)).map((row) => [
      ...provenance,
      row.organizationId,
      row.subjectRef,
      row.subjectType,
      row.studentUserId,
      row.fieldCode,
      row.revisionSequence,
      row.priorValue,
      row.currentValue,
      instant(row.changedAt),
    ]);

  // The bound is checked before the document is written: an extract past it produces
  // no file at all, rather than a whole CSV string built only to be thrown away.
  if (reportExportRowLimitRefusal(rows.length)) {
    return { schemaVersion, rowCount: rows.length, content: null };
  }
  return {
    schemaVersion,
    rowCount: rows.length,
    content: csvDocument(REPORT_EXPORT_COLUMNS[scope.kind], rows),
  };
}
