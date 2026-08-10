import { sql } from "kysely";

import type { Database } from "../database/database.js";

export async function courseProgressForStudent(db: Database, studentUserId: string) {
  const [courses, placements] = await Promise.all([db.selectFrom("courses")
    .innerJoin("lesson_units", "lesson_units.course_id", "courses.id")
    .leftJoin("lesson_unit_completions", (join) => join
      .onRef("lesson_unit_completions.lesson_unit_id", "=", "lesson_units.id")
      .on("lesson_unit_completions.student_user_id", "=", studentUserId))
    .select([
      "courses.id", "courses.title", "courses.target_language", "courses.curriculum_level",
      sql<number>`count(*) filter (where lesson_units.state = 'ACTIVE')::integer`.as("active_count"),
      sql<number>`count(lesson_unit_completions.id) filter (where lesson_units.state = 'ACTIVE')::integer`.as("completed_active_count"),
    ])
    .groupBy(["courses.id", "courses.title", "courses.target_language", "courses.curriculum_level"])
    .orderBy("courses.target_language").orderBy("courses.curriculum_level").execute(),
  db.selectFrom("student_placements").select(["target_language", "curriculum_level"]).where("student_user_id", "=", studentUserId).execute()]);

  const progress = await Promise.all(courses.map(async (course) => {
    const history = await db.selectFrom("lesson_unit_completions")
      .innerJoin("lesson_units", "lesson_units.id", "lesson_unit_completions.lesson_unit_id")
      .select(["lesson_units.id", "lesson_units.title", "lesson_units.state", "lesson_unit_completions.earned_at"])
      .where("lesson_unit_completions.student_user_id", "=", studentUserId)
      .where("lesson_units.course_id", "=", course.id)
      .orderBy("lesson_unit_completions.earned_at").orderBy("lesson_units.id").execute();
    return {
      courseId: course.id, title: course.title, targetLanguage: course.target_language, curriculumLevel: course.curriculum_level,
      activeLessonUnitCount: course.active_count, completedActiveLessonUnitCount: course.completed_active_count,
      percentage: course.active_count === 0 ? 0 : Math.round(100 * course.completed_active_count / course.active_count),
      learningHistory: history.map((completion) => ({ lessonUnitId: completion.id, title: completion.title, state: completion.state, earnedAt: completion.earned_at.toISOString(), countsTowardProgress: completion.state === "ACTIVE" })),
    };
  }));
  return progress.filter((course) => course.learningHistory.length > 0 || placements.some((placement) => placement.target_language === course.targetLanguage && placement.curriculum_level === course.curriculumLevel));
}
