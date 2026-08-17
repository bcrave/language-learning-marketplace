import {
  attributedCohortIds,
  classSessionEndsAt,
  courseProgressGain,
  courseProgressPercentage,
  sponsorshipReportingIncludes,
  type CohortMembershipWindow,
  type CourseProgressValue,
} from "@marketplace/core";
import { sql } from "kysely";

import type { Database } from "../database/database.js";
import { emptyAttendanceCounts, projectAttendanceSummary, type AttendanceCounts } from "../reporting/attendance-summary.js";

type OrganizationManagerActor = { id: string; organizationId: string };

type ReportedSponsorship = {
  sponsorshipId: string;
  studentUserId: string;
  studentDisplayName: string;
  state: "ACTIVE" | "ENDED";
  acceptedAt: Date;
  endedAt: Date | null;
};

type ReportedActivity = {
  studentUserId: string;
  occurredAt: Date;
  outcome: "ATTENDED" | "NO_SHOW" | "UNRECORDED";
  corrected: boolean;
};

function countActivity(counts: AttendanceCounts, activity: ReportedActivity) {
  if (activity.outcome === "ATTENDED") counts.attendedCount += 1;
  else if (activity.outcome === "NO_SHOW") counts.noShowCount += 1;
  else counts.excludedUnrecordedCount += 1;
  if (activity.corrected) counts.correctedCount += 1;
}

/**
 * The Attendance facts an Organization may report for its own sponsored Students.
 * Only the Booking's own outcome and the Class Session instant leave this query:
 * no Class Roster, no teacher identity, no Learning Feedback, no Session Rating,
 * and no Class Credit balance can be reached from what it selects. Cancelled
 * Bookings are excluded, matching the Attendance Rate definition, and a Class
 * Session still awaiting its outcome is reported as excluded Unrecorded attendance
 * rather than counted against the Student.
 */
async function reportedActivity(db: Database, studentUserIds: readonly string[], now: Date): Promise<ReportedActivity[]> {
  if (studentUserIds.length === 0) return [];
  const rows = await db.selectFrom("bookings")
    .innerJoin("class_sessions", "class_sessions.id", "bookings.class_session_id")
    .leftJoin("attendance_records", "attendance_records.booking_id", "bookings.id")
    .select([
      "bookings.student_user_id",
      "class_sessions.starts_at",
      "attendance_records.outcome",
      sql<number>`(select count(*) from attendance_record_corrections where attendance_record_corrections.booking_id = bookings.id)::integer`.as("correction_count"),
    ])
    .where("bookings.student_user_id", "in", [...studentUserIds])
    .where("bookings.state", "=", "ACTIVE")
    .where("class_sessions.state", "=", "PUBLISHED")
    .execute();

  return rows.flatMap((row) => {
    // A Class Session that has not finished yet is neither an outcome nor an
    // exception: it is simply not reportable activity.
    if (!row.outcome && classSessionEndsAt(row.starts_at).getTime() > now.getTime()) return [];
    return [{
      studentUserId: row.student_user_id,
      occurredAt: row.starts_at,
      outcome: row.outcome ?? "UNRECORDED" as const,
      corrected: row.correction_count > 0,
    }];
  });
}

type CourseAggregate = { courseId: string; courseTitle: string } & CourseProgressValue;

/**
 * The Student's live aggregate Course Progress for every Course, reported only while
 * the Sponsorship is active. It carries counts and a percentage, never the identities
 * of the Lesson Units behind them, so an Organization still cannot learn what its
 * Student studied before the relationship began.
 */
async function currentCourseProgress(db: Database, studentUserId: string, courseIds: readonly string[]): Promise<CourseAggregate[]> {
  if (courseIds.length === 0) return [];
  const rows = await db.selectFrom("courses")
    .innerJoin("lesson_units", "lesson_units.course_id", "courses.id")
    .leftJoin("lesson_unit_completions", (join) => join
      .onRef("lesson_unit_completions.lesson_unit_id", "=", "lesson_units.id")
      .on("lesson_unit_completions.student_user_id", "=", studentUserId))
    .select([
      "courses.id",
      "courses.title",
      sql<number>`count(*) filter (where lesson_units.state = 'ACTIVE')::integer`.as("active_count"),
      sql<number>`count(lesson_unit_completions.id) filter (where lesson_units.state = 'ACTIVE')::integer`.as("completed_active_count"),
    ])
    .where("courses.id", "in", [...courseIds])
    .groupBy(["courses.id", "courses.title"])
    .execute();
  return rows.map((row) => ({
    courseId: row.id,
    courseTitle: row.title,
    completedActiveLessonUnitCount: row.completed_active_count,
    activeLessonUnitCount: row.active_count,
  }));
}

/** The Courses one Student may carry a reportable fact for, without naming any unit. */
async function reportableCourseIds(db: Database, studentUserId: string, snapshotCourseIds: readonly string[]) {
  const completed = await db.selectFrom("lesson_unit_completions")
    .innerJoin("lesson_units", "lesson_units.id", "lesson_unit_completions.lesson_unit_id")
    .select("lesson_units.course_id")
    .distinct()
    .where("lesson_unit_completions.student_user_id", "=", studentUserId)
    .execute();
  return [...new Set([...snapshotCourseIds, ...completed.map((row) => row.course_id)])];
}

function projectProgressValue(value: CourseProgressValue) {
  return {
    completedActiveLessonUnitCount: value.completedActiveLessonUnitCount,
    activeLessonUnitCount: value.activeLessonUnitCount,
    percentage: courseProgressPercentage(value.completedActiveLessonUnitCount, value.activeLessonUnitCount),
  };
}

type SnapshotRow = {
  sponsorship_id: string;
  boundary: "SPONSORSHIP_START" | "SPONSORSHIP_END";
  course_id: string;
  course_title: string;
  completed_active_lesson_unit_count: number;
  active_lesson_unit_count: number;
  captured_at: Date;
  revision_count: number;
  revised_at: Date | null;
};

function snapshotValue(snapshot: SnapshotRow): CourseProgressValue {
  return {
    completedActiveLessonUnitCount: snapshot.completed_active_lesson_unit_count,
    activeLessonUnitCount: snapshot.active_lesson_unit_count,
  };
}

async function courseProgressReport(db: Database, sponsorship: ReportedSponsorship, snapshots: readonly SnapshotRow[]) {
  const own = snapshots.filter((snapshot) => snapshot.sponsorship_id === sponsorship.sponsorshipId);
  // Reporting for an ended Sponsorship stays frozen at its ending snapshot. Reading
  // live progress afterwards would turn a closed relationship into ongoing access to
  // the Student's later learning.
  const current = sponsorship.state === "ACTIVE"
    ? await currentCourseProgress(
      db,
      sponsorship.studentUserId,
      await reportableCourseIds(db, sponsorship.studentUserId, own.map((snapshot) => snapshot.course_id)),
    )
    : [];

  // A Course is reportable once it carries a fact: a frozen boundary of this
  // Sponsorship, or a completion the Student holds now. A Course a corrected
  // Attendance Record emptied keeps its boundary, so the loss stays visible instead
  // of the Course quietly disappearing from the report.
  const courseTitles = new Map<string, string>();
  for (const snapshot of own) courseTitles.set(snapshot.course_id, snapshot.course_title);
  for (const course of current) {
    if (course.completedActiveLessonUnitCount > 0) courseTitles.set(course.courseId, course.courseTitle);
  }

  return [...courseTitles]
    .map(([courseId, courseTitle]) => {
      const baselineRow = own.find((snapshot) => snapshot.course_id === courseId && snapshot.boundary === "SPONSORSHIP_START");
      const endingRow = own.find((snapshot) => snapshot.course_id === courseId && snapshot.boundary === "SPONSORSHIP_END");
      const currentValue = current.find((course) => course.courseId === courseId);
      const effective = sponsorship.state === "ACTIVE" ? currentValue : endingRow && snapshotValue(endingRow);
      // A Course the Student had not touched when the Sponsorship began has no
      // baseline snapshot: nothing was completed, measured against the same
      // denominator as the value it is compared with.
      const baseline: CourseProgressValue = baselineRow
        ? snapshotValue(baselineRow)
        : { completedActiveLessonUnitCount: 0, activeLessonUnitCount: effective?.activeLessonUnitCount ?? 0 };
      const revisions = own.filter((snapshot) => snapshot.course_id === courseId);
      const lastRevisedAt = revisions
        .flatMap((snapshot) => snapshot.revised_at ? [snapshot.revised_at] : [])
        .sort((first, second) => first.getTime() - second.getTime())
        .at(-1);

      return {
        courseId,
        courseTitle,
        baseline: projectProgressValue(baseline),
        baselineCapturedAt: baselineRow?.captured_at.toISOString() ?? null,
        endingSnapshot: endingRow ? projectProgressValue(snapshotValue(endingRow)) : null,
        endingSnapshotCapturedAt: endingRow?.captured_at.toISOString() ?? null,
        currentEffective: sponsorship.state === "ACTIVE" && currentValue ? projectProgressValue(currentValue) : null,
        ...courseProgressGain(baseline, effective ?? baseline),
        snapshotRevisionCount: revisions.reduce((total, snapshot) => total + snapshot.revision_count, 0),
        lastRevisedAt: lastRevisedAt?.toISOString() ?? null,
      };
    })
    .sort((first, second) => first.courseTitle.localeCompare(second.courseTitle));
}

export class UnknownCohort extends Error {}

/**
 * The Organization Manager's exception-first attendance and Course Progress report.
 * Every fact is scoped twice: to a Sponsorship of this Organization, and to the
 * instant range that Sponsorship covers. An optional Cohort narrows it further, to
 * the activity that Cohort membership covered when the activity occurred.
 */
export async function organizationAttendanceAndProgressReport(
  db: Database,
  organizationManager: OrganizationManagerActor,
  input: { cohortId?: string | null | undefined },
  now: Date,
) {
  const organization = await db.selectFrom("organizations")
    .select(["id", "name"])
    .where("id", "=", organizationManager.organizationId)
    .executeTakeFirstOrThrow();

  const cohorts = await db.selectFrom("cohorts")
    .select(["id", "name"])
    .where("organization_id", "=", organizationManager.organizationId)
    .orderBy("name")
    .execute();
  if (input.cohortId && !cohorts.some((cohort) => cohort.id === input.cohortId)) throw new UnknownCohort();

  const sponsorshipRows = await db.selectFrom("sponsorships")
    .innerJoin("users", "users.id", "sponsorships.student_user_id")
    .select([
      "sponsorships.id",
      "sponsorships.student_user_id",
      "users.display_name",
      "sponsorships.state",
      "sponsorships.accepted_at",
      "sponsorships.ended_at",
    ])
    .where("sponsorships.organization_id", "=", organizationManager.organizationId)
    .execute();
  const sponsorships: ReportedSponsorship[] = sponsorshipRows.map((row) => ({
    sponsorshipId: row.id,
    studentUserId: row.student_user_id,
    studentDisplayName: row.display_name,
    state: row.state,
    acceptedAt: row.accepted_at,
    endedAt: row.ended_at,
  }));

  const membershipRows = sponsorships.length === 0 ? [] : await db.selectFrom("cohort_memberships")
    .innerJoin("cohorts", "cohorts.id", "cohort_memberships.cohort_id")
    .select([
      "cohort_memberships.cohort_id",
      "cohort_memberships.sponsorship_id",
      "cohort_memberships.effective_from",
      "cohort_memberships.effective_until",
    ])
    .where("cohorts.organization_id", "=", organizationManager.organizationId)
    .execute();
  const membershipsBySponsorship = new Map<string, CohortMembershipWindow[]>();
  for (const row of membershipRows) {
    const windows = membershipsBySponsorship.get(row.sponsorship_id) ?? [];
    windows.push({ cohortId: row.cohort_id, effectiveFrom: row.effective_from, effectiveUntil: row.effective_until });
    membershipsBySponsorship.set(row.sponsorship_id, windows);
  }

  const reportedSponsorships = input.cohortId
    ? sponsorships.filter((sponsorship) => (membershipsBySponsorship.get(sponsorship.sponsorshipId) ?? [])
      .some((window) => window.cohortId === input.cohortId))
    : sponsorships;

  const snapshots = reportedSponsorships.length === 0 ? [] : await db.selectFrom("course_progress_snapshots")
    .innerJoin("courses", "courses.id", "course_progress_snapshots.course_id")
    .select([
      "course_progress_snapshots.sponsorship_id",
      "course_progress_snapshots.boundary",
      "course_progress_snapshots.course_id",
      "courses.title as course_title",
      "course_progress_snapshots.completed_active_lesson_unit_count",
      "course_progress_snapshots.active_lesson_unit_count",
      "course_progress_snapshots.captured_at",
      "course_progress_snapshots.revision_count",
      "course_progress_snapshots.revised_at",
    ])
    .where("course_progress_snapshots.sponsorship_id", "in", reportedSponsorships.map((sponsorship) => sponsorship.sponsorshipId))
    .execute();

  const activity = await reportedActivity(db, [...new Set(sponsorships.map((sponsorship) => sponsorship.studentUserId))], now);

  // The Cohort breakdown covers every Cohort of the Organization whether or not a
  // filter is applied: a per-Cohort aggregate does not change when the reader drills
  // into one of them, and the reader still needs the whole list to move between them.
  const cohortCounts = new Map<string, AttendanceCounts>(cohorts.map((cohort) => [cohort.id, emptyAttendanceCounts()]));
  const cohortStudents = new Map<string, Set<string>>(cohorts.map((cohort) => [cohort.id, new Set()]));
  for (const sponsorship of sponsorships) {
    const windows = membershipsBySponsorship.get(sponsorship.sponsorshipId) ?? [];
    for (const occurrence of activity) {
      if (occurrence.studentUserId !== sponsorship.studentUserId) continue;
      if (!sponsorshipReportingIncludes(sponsorship, occurrence.occurredAt)) continue;
      for (const cohortId of attributedCohortIds(windows, occurrence.occurredAt)) {
        const forCohort = cohortCounts.get(cohortId);
        if (forCohort) countActivity(forCohort, occurrence);
      }
    }
    for (const window of windows) {
      // A membership scheduled to begin later covers no activity yet, so it does not
      // make the Student a reportable member of that Cohort.
      if (window.effectiveFrom.getTime() > now.getTime()) continue;
      cohortStudents.get(window.cohortId)?.add(sponsorship.sponsorshipId);
    }
  }

  const organizationCounts = emptyAttendanceCounts();
  const students = await Promise.all(reportedSponsorships.map(async (sponsorship) => {
    const windows = membershipsBySponsorship.get(sponsorship.sponsorshipId) ?? [];
    const counts = emptyAttendanceCounts();
    const attributedCohorts = new Set<string>();
    for (const occurrence of activity) {
      if (occurrence.studentUserId !== sponsorship.studentUserId) continue;
      if (!sponsorshipReportingIncludes(sponsorship, occurrence.occurredAt)) continue;
      const occurrenceCohorts = attributedCohortIds(windows, occurrence.occurredAt);
      // A Cohort filter reports the activity that Cohort covered, not everything the
      // Students in it ever did: membership must have been effective when the Class
      // Session occurred.
      if (input.cohortId && !occurrenceCohorts.includes(input.cohortId)) continue;
      countActivity(counts, occurrence);
      countActivity(organizationCounts, occurrence);
      for (const cohortId of occurrenceCohorts) attributedCohorts.add(cohortId);
    }

    return {
      sponsorshipId: sponsorship.sponsorshipId,
      studentUserId: sponsorship.studentUserId,
      studentDisplayName: sponsorship.studentDisplayName,
      state: sponsorship.state,
      reportingFrom: sponsorship.acceptedAt.toISOString(),
      reportingUntil: sponsorship.endedAt?.toISOString() ?? null,
      cohortNames: [...attributedCohorts]
        .flatMap((cohortId) => cohorts.filter((cohort) => cohort.id === cohortId).map((cohort) => cohort.name))
        .sort(),
      attendance: projectAttendanceSummary(counts),
      courseProgress: await courseProgressReport(db, sponsorship, snapshots),
    };
  }));

  return {
    organization,
    generatedAt: now.toISOString(),
    attendance: projectAttendanceSummary(organizationCounts),
    // Exception-first: the sponsored Students needing attention lead the report.
    students: students.sort((first, second) =>
      second.attendance.exceptionCount - first.attendance.exceptionCount
      || first.studentDisplayName.localeCompare(second.studentDisplayName)),
    cohorts: cohorts.map((cohort) => ({
      cohortId: cohort.id,
      cohortName: cohort.name,
      sponsoredStudentCount: cohortStudents.get(cohort.id)?.size ?? 0,
      attendance: projectAttendanceSummary(cohortCounts.get(cohort.id) ?? emptyAttendanceCounts()),
    })),
  };
}
