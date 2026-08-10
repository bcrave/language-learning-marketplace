import { useQuery } from "@apollo/client/react";
import { useIntl } from "react-intl";

import { StudentCourseProgressDocument } from "./generated/graphql.js";

export function CourseProgressPanel() {
  const intl = useIntl();
  const { data, loading, error } = useQuery(StudentCourseProgressDocument);
  if (loading) return <p role="status">{intl.formatMessage({ id: "progress.loading" })}</p>;
  if (error || !data) return <p role="alert">{intl.formatMessage({ id: "progress.loadError" })}</p>;
  return <section className="workspace-card" aria-labelledby="course-progress-title">
    <h2 id="course-progress-title">{intl.formatMessage({ id: "progress.title" })}</h2>
    {data.studentCourseProgress.length === 0 ? <p>{intl.formatMessage({ id: "progress.none" })}</p> : data.studentCourseProgress.map((progress) => <article key={progress.courseId}>
      <h3>{progress.title}</h3>
      <div role="progressbar" aria-label={intl.formatMessage({ id: "progress.label" }, { course: progress.title })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage}>{progress.percentage}%</div>
      <p>{intl.formatMessage({ id: "progress.summary" }, { completed: progress.completedActiveLessonUnitCount, total: progress.activeLessonUnitCount })}</p>
      <h4>{intl.formatMessage({ id: "progress.history" })}</h4>
      <ul>{progress.learningHistory.map((completion) => <li key={completion.lessonUnitId}>{intl.formatMessage({ id: completion.countsTowardProgress ? "progress.activeHistory" : "progress.retiredHistory" }, { title: completion.title })}</li>)}</ul>
    </article>)}
  </section>;
}
