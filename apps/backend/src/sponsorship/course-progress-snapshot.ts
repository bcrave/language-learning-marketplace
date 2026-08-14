import { courseProgressPercentage } from "@marketplace/core";
import { sql } from "kysely";

import type { Database } from "../database/database.js";

export type CourseProgressSnapshotBoundary = "SPONSORSHIP_START" | "SPONSORSHIP_END";

/**
 * Freezes the aggregate Course Progress an Organization may report for one
 * Sponsorship boundary. The boundary freezes both its time scope and its active
 * Lesson Unit denominator, so the exact set of units behind the denominator is
 * stored with it: a unit retired afterwards stays in this snapshot, and a unit
 * activated afterwards never joins it. Courses the Student never touched carry no
 * reportable fact and are left out entirely.
 */
export async function captureCourseProgressSnapshot(
  transaction: Database,
  sponsorship: { id: string; student_user_id: string },
  boundary: CourseProgressSnapshotBoundary,
  capturedAt: Date,
) {
  const reportableCourses = await transaction.selectFrom("lesson_unit_completions")
    .innerJoin("lesson_units", "lesson_units.id", "lesson_unit_completions.lesson_unit_id")
    .select("lesson_units.course_id")
    .distinct()
    .where("lesson_unit_completions.student_user_id", "=", sponsorship.student_user_id)
    .execute();
  if (reportableCourses.length === 0) return;
  const courseIds = reportableCourses.map((course) => course.course_id);

  const activeUnits = await transaction.selectFrom("lesson_units")
    .leftJoin("lesson_unit_completions", (join) => join
      .onRef("lesson_unit_completions.lesson_unit_id", "=", "lesson_units.id")
      .on("lesson_unit_completions.student_user_id", "=", sponsorship.student_user_id))
    .select([
      "lesson_units.id",
      "lesson_units.course_id",
      sql<boolean>`lesson_unit_completions.id is not null`.as("completed"),
    ])
    .where("lesson_units.state", "=", "ACTIVE")
    .where("lesson_units.course_id", "in", courseIds)
    .execute();

  const inserted = await transaction.insertInto("course_progress_snapshots")
    .values(courseIds.map((courseId) => {
      const units = activeUnits.filter((unit) => unit.course_id === courseId);
      return {
        sponsorship_id: sponsorship.id,
        boundary,
        course_id: courseId,
        completed_active_lesson_unit_count: units.filter((unit) => unit.completed).length,
        active_lesson_unit_count: units.length,
        captured_at: capturedAt,
      };
    }))
    // A boundary is captured once. A repeated capture keeps the original frozen
    // values, so its frozen unit set must not be rewritten either.
    .onConflict((conflict) => conflict.columns(["sponsorship_id", "boundary", "course_id"]).doNothing())
    .returning(["id", "course_id"])
    .execute();

  const frozenUnits = inserted.flatMap((snapshot) => activeUnits
    .filter((unit) => unit.course_id === snapshot.course_id)
    .map((unit) => ({ snapshot_id: snapshot.id, lesson_unit_id: unit.id })));
  if (frozenUnits.length > 0) {
    await transaction.insertInto("course_progress_snapshot_units").values(frozenUnits).execute();
  }
}

/**
 * Revises the completion facts a frozen boundary attributes to its own period after
 * one Student's Lesson Unit Completion changed — whether an accepted Attendance
 * correction removed it or late-recorded attendance established it. The recount runs
 * against the frozen unit set and the frozen time scope, so only facts that belong to
 * the period move; the denominator never does. Callers hold the per-Student, per-unit
 * completion lock, which serializes concurrent revisions of the same snapshot.
 */
export async function reviseCourseProgressSnapshots(
  transaction: Database,
  studentUserId: string,
  lessonUnitId: string,
  revisedAt: Date,
) {
  const snapshots = await transaction.selectFrom("course_progress_snapshots")
    .innerJoin("course_progress_snapshot_units", "course_progress_snapshot_units.snapshot_id", "course_progress_snapshots.id")
    .innerJoin("sponsorships", "sponsorships.id", "course_progress_snapshots.sponsorship_id")
    .select([
      "course_progress_snapshots.id",
      "course_progress_snapshots.captured_at",
      "course_progress_snapshots.completed_active_lesson_unit_count",
    ])
    .where("course_progress_snapshot_units.lesson_unit_id", "=", lessonUnitId)
    .where("sponsorships.student_user_id", "=", studentUserId)
    .execute();

  for (const snapshot of snapshots) {
    const recount = await transaction.selectFrom("course_progress_snapshot_units")
      .innerJoin("lesson_unit_completions", (join) => join
        .onRef("lesson_unit_completions.lesson_unit_id", "=", "course_progress_snapshot_units.lesson_unit_id")
        .on("lesson_unit_completions.student_user_id", "=", studentUserId))
      .select(sql<number>`count(*)::integer`.as("completed_count"))
      .where("course_progress_snapshot_units.snapshot_id", "=", snapshot.id)
      .where("lesson_unit_completions.earned_at", "<=", snapshot.captured_at)
      .executeTakeFirstOrThrow();
    if (recount.completed_count === snapshot.completed_active_lesson_unit_count) continue;
    await transaction.updateTable("course_progress_snapshots")
      .set({
        completed_active_lesson_unit_count: recount.completed_count,
        revision_count: sql<number>`course_progress_snapshots.revision_count + 1`,
        revised_at: revisedAt,
      })
      .where("id", "=", snapshot.id)
      .execute();
  }
}

export async function courseProgressSnapshotsForSponsorship(db: Database, sponsorshipId: string) {
  const rows = await db.selectFrom("course_progress_snapshots")
    .innerJoin("courses", "courses.id", "course_progress_snapshots.course_id")
    .select([
      "course_progress_snapshots.boundary",
      "course_progress_snapshots.course_id",
      "courses.title as course_title",
      "course_progress_snapshots.completed_active_lesson_unit_count",
      "course_progress_snapshots.active_lesson_unit_count",
      "course_progress_snapshots.captured_at",
      "course_progress_snapshots.revision_count",
      "course_progress_snapshots.revised_at",
    ])
    .where("course_progress_snapshots.sponsorship_id", "=", sponsorshipId)
    .orderBy("course_progress_snapshots.boundary")
    .orderBy("courses.title")
    .execute();
  return rows.map((row) => ({
    boundary: row.boundary,
    courseId: row.course_id,
    courseTitle: row.course_title,
    completedActiveLessonUnitCount: row.completed_active_lesson_unit_count,
    activeLessonUnitCount: row.active_lesson_unit_count,
    percentage: courseProgressPercentage(row.completed_active_lesson_unit_count, row.active_lesson_unit_count),
    capturedAt: row.captured_at.toISOString(),
    revisionCount: row.revision_count,
    revisedAt: row.revised_at?.toISOString() ?? null,
  }));
}
