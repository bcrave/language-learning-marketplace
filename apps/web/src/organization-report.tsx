import { useQuery } from "@apollo/client/react";
import { useState } from "react";
import { useIntl } from "react-intl";

import {
  OrganizationAttendanceAndProgressReportDocument,
  OrganizationAttendanceSummaryDetailsFragmentDoc,
  type OrganizationAttendanceSummaryDetailsFragment,
} from "./generated/graphql.js";
import { useFragment as readFragment } from "./generated/fragment-masking.js";

type IntlShape = ReturnType<typeof useIntl>;

function longInstant(intl: IntlShape, instant: string) {
  return intl.formatDate(instant, { dateStyle: "long", timeStyle: "short", timeZone: "UTC" });
}

/**
 * The Attendance facts, led by what needs attention. The Attendance Rate is absent
 * until an outcome is recorded, and the excluded Unrecorded count is always stated
 * beside it so an empty rate is never mistaken for a poor one.
 */
function AttendanceSummary({ attendance, intl }: { attendance: OrganizationAttendanceSummaryDetailsFragment; intl: IntlShape }) {
  return (
    <>
      <p>{attendance.attendanceRatePercentage === null
        ? intl.formatMessage({ id: "organizationReport.attendance.noRate" })
        : intl.formatMessage({ id: "organizationReport.attendance.rate" }, {
          rate: attendance.attendanceRatePercentage,
          recorded: attendance.recordedCount,
        })}</p>
      <p>{intl.formatMessage({ id: "organizationReport.attendance.counts" }, {
        attended: attendance.attendedCount,
        noShow: attendance.noShowCount,
      })}</p>
      <p>{intl.formatMessage({ id: "organizationReport.attendance.excluded" }, {
        unrecorded: attendance.excludedUnrecordedCount,
      })}</p>
      {attendance.correctedCount > 0 && (
        <p>{intl.formatMessage({ id: "organizationReport.attendance.corrected" }, {
          corrected: attendance.correctedCount,
        })}</p>
      )}
    </>
  );
}

export function OrganizationReportPanel() {
  const intl = useIntl();
  const [cohortId, setCohortId] = useState("");
  const { data, loading, error } = useQuery(OrganizationAttendanceAndProgressReportDocument, {
    variables: { cohortId: cohortId === "" ? null : cohortId },
  });

  if (loading) return <p role="status">{intl.formatMessage({ id: "organizationReport.loading" })}</p>;
  if (error || !data) return <p role="alert">{intl.formatMessage({ id: "organizationReport.loadError" })}</p>;

  const report = data.organizationAttendanceAndProgressReport;
  const summary = readFragment(OrganizationAttendanceSummaryDetailsFragmentDoc, report.attendance);

  return (
    <>
      <section className="workspace-card" aria-labelledby="organization-report-title">
        <h2 id="organization-report-title">{intl.formatMessage({ id: "organizationReport.title" })}</h2>
        <p>{intl.formatMessage({ id: "organizationReport.generatedAt" }, { generatedAt: longInstant(intl, report.generatedAt) })}</p>
        <p>{intl.formatMessage({ id: "organizationReport.notice" })}</p>
        <label htmlFor="organization-report-cohort">{intl.formatMessage({ id: "organizationReport.filter.label" })}</label>
        <select
          id="organization-report-cohort"
          value={cohortId}
          onChange={(event) => setCohortId(event.target.value)}
        >
          <option value="">{intl.formatMessage({ id: "organizationReport.filter.all" })}</option>
          {report.cohorts.map((cohort) => (
            <option key={cohort.cohortId} value={cohort.cohortId}>{cohort.cohortName}</option>
          ))}
        </select>
        <h3>{intl.formatMessage({ id: "organizationReport.exceptions.title" })}</h3>
        <p>{summary.exceptionCount === 0
          ? intl.formatMessage({ id: "organizationReport.exceptions.none" })
          : intl.formatMessage({ id: "organizationReport.exceptions.summary" }, {
            exceptions: summary.exceptionCount,
            noShow: summary.noShowCount,
            unrecorded: summary.excludedUnrecordedCount,
            corrected: summary.correctedCount,
          })}</p>
        <AttendanceSummary attendance={summary} intl={intl} />
      </section>

      <section className="workspace-card" aria-labelledby="organization-report-cohorts-title">
        <h2 id="organization-report-cohorts-title">{intl.formatMessage({ id: "organizationReport.cohorts.title" })}</h2>
        {report.cohorts.length === 0 ? (
          <p>{intl.formatMessage({ id: "organizationReport.cohorts.empty" })}</p>
        ) : (
          <ul className="organization-report-cohorts">
            {report.cohorts.map((cohort) => (
              <li key={cohort.cohortId}>
                <h3>{cohort.cohortName}</h3>
                <p>{intl.formatMessage({ id: "organizationReport.cohorts.students" }, { count: cohort.sponsoredStudentCount })}</p>
                <AttendanceSummary attendance={readFragment(OrganizationAttendanceSummaryDetailsFragmentDoc, cohort.attendance)} intl={intl} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="workspace-card" aria-labelledby="organization-report-students-title">
        <h2 id="organization-report-students-title">{intl.formatMessage({ id: "organizationReport.students.title" })}</h2>
        {report.students.length === 0 ? (
          <p>{intl.formatMessage({ id: "organizationReport.students.empty" })}</p>
        ) : (
          <ul className="organization-report-students">
            {report.students.map((student) => (
              <li key={student.sponsorshipId}>
                <h3>{student.studentDisplayName}</h3>
                <p>{student.state === "ENDED"
                  ? intl.formatMessage({ id: "organizationReport.state.ENDED" }, { until: longInstant(intl, student.reportingUntil!) })
                  : intl.formatMessage({ id: "organizationReport.state.ACTIVE" }, { from: longInstant(intl, student.reportingFrom) })}</p>
                <p>{student.cohortNames.length === 0
                  ? intl.formatMessage({ id: "organizationReport.students.noCohorts" })
                  : intl.formatMessage({ id: "organizationReport.students.cohorts" }, {
                    names: intl.formatList(student.cohortNames, { type: "conjunction" }),
                  })}</p>
                <AttendanceSummary attendance={readFragment(OrganizationAttendanceSummaryDetailsFragmentDoc, student.attendance)} intl={intl} />
                <h4>{intl.formatMessage({ id: "organizationReport.progress.title" })}</h4>
                {student.courseProgress.length === 0 ? (
                  <p>{intl.formatMessage({ id: "organizationReport.progress.empty" })}</p>
                ) : (
                  <ul className="organization-report-progress">
                    {student.courseProgress.map((course) => (
                      <li key={course.courseId}>
                        <h5>{course.courseTitle}</h5>
                        <p>{intl.formatMessage({ id: "organizationReport.progress.baseline" }, {
                          completed: course.baseline.completedActiveLessonUnitCount,
                          active: course.baseline.activeLessonUnitCount,
                          percentage: course.baseline.percentage,
                        })}</p>
                        {course.currentEffective && (
                          <p>{intl.formatMessage({ id: "organizationReport.progress.current" }, {
                            completed: course.currentEffective.completedActiveLessonUnitCount,
                            active: course.currentEffective.activeLessonUnitCount,
                            percentage: course.currentEffective.percentage,
                          })}</p>
                        )}
                        {course.endingSnapshot && (
                          <p>{intl.formatMessage({ id: "organizationReport.progress.ending" }, {
                            completed: course.endingSnapshot.completedActiveLessonUnitCount,
                            active: course.endingSnapshot.activeLessonUnitCount,
                            percentage: course.endingSnapshot.percentage,
                          })}</p>
                        )}
                        <p>{intl.formatMessage({ id: "organizationReport.progress.gain" }, {
                          units: course.completedLessonUnitGain,
                          points: course.percentagePointGain,
                        })}</p>
                        {course.snapshotRevisionCount > 0 && course.lastRevisedAt && (
                          <p>{intl.formatMessage({ id: "organizationReport.progress.revised" }, {
                            count: course.snapshotRevisionCount,
                            revisedAt: longInstant(intl, course.lastRevisedAt),
                          })}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
