import { CombinedGraphQLErrors } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { useState } from "react";
import { useIntl } from "react-intl";

import {
  ClassCreditLedgerSource,
  MarketplaceExceptionKind,
  MarketplaceOperationalReportDocument,
} from "./generated/graphql.js";

type IntlShape = ReturnType<typeof useIntl>;

function instantIn(intl: IntlShape, instant: string, timeZone: string) {
  return intl.formatDate(instant, { dateStyle: "long", timeStyle: "short", timeZone });
}

function localDate(intl: IntlShape, isoDate: string) {
  // A reported local date is already the calendar date the administrator reads it
  // on, so it is formatted as a plain date rather than converted a second time.
  return intl.formatDate(`${isoDate}T00:00:00Z`, { dateStyle: "medium", timeZone: "UTC" });
}

// The catalog test requires every message key to appear literally in application
// source, and a reader benefits from the same thing: the whole set of labels one of
// these unions can produce is visible in one place.
const exceptionMessageIds: Record<MarketplaceExceptionKind, string> = {
  UNRECORDED_ATTENDANCE: "marketplaceReport.exception.UNRECORDED_ATTENDANCE",
  PENDING_ATTENDANCE_REVIEW: "marketplaceReport.exception.PENDING_ATTENDANCE_REVIEW",
};

const creditSourceMessageIds: Record<ClassCreditLedgerSource, string> = {
  CREDIT_ADJUSTMENT: "marketplaceReport.credits.source.CREDIT_ADJUSTMENT",
  SUBSCRIPTION_GRANT: "marketplaceReport.credits.source.SUBSCRIPTION_GRANT",
  ORGANIZATION_CREDIT_GRANT: "marketplaceReport.credits.source.ORGANIZATION_CREDIT_GRANT",
  BOOKING_DEDUCTION: "marketplaceReport.credits.source.BOOKING_DEDUCTION",
  BOOKING_REFUND: "marketplaceReport.credits.source.BOOKING_REFUND",
};

export function MarketplaceReportPanel() {
  const intl = useIntl();
  const [range, setRange] = useState<{ fromLocalDate: string; toLocalDate: string }>({ fromLocalDate: "", toLocalDate: "" });
  const [requestedRange, setRequestedRange] = useState<{ fromLocalDate: string; toLocalDate: string } | null>(null);
  const { data, loading, error } = useQuery(MarketplaceOperationalReportDocument, {
    variables: {
      input: requestedRange
        ? {
          fromLocalDate: requestedRange.fromLocalDate || null,
          toLocalDate: requestedRange.toLocalDate || null,
        }
        : null,
    },
  });

  if (loading) return <p role="status">{intl.formatMessage({ id: "marketplaceReport.loading" })}</p>;

  const report = data?.marketplaceOperationalReport;
  if (error || !report) {
    // A refused range is the administrator's own filter to fix, while any other
    // failure is ours; saying so keeps them from retyping a range that was fine.
    const refusedRange = CombinedGraphQLErrors.is(error)
      && error.errors.some((graphQLError) => graphQLError.extensions?.["code"] === "BAD_USER_INPUT");
    return (
      <p role="alert">
        {intl.formatMessage({ id: refusedRange ? "marketplaceReport.rangeError" : "marketplaceReport.loadError" })}
      </p>
    );
  }

  const { attendance, cancellations, corrections, credits, courseProgress, exceptions } = report;
  const timeZone = report.range.timeZone;

  return (
    <>
      <section className="workspace-card" aria-labelledby="marketplace-report-title">
        <h2 id="marketplace-report-title">{intl.formatMessage({ id: "marketplaceReport.title" })}</h2>
        <p>{intl.formatMessage({ id: "marketplaceReport.generatedAt" }, { generatedAt: instantIn(intl, report.generatedAt, timeZone) })}</p>
        <p>{intl.formatMessage({ id: "marketplaceReport.currentEffective" })}</p>
        <form onSubmit={(event) => {
          event.preventDefault();
          setRequestedRange(range);
        }}>
          <fieldset>
            <legend>{intl.formatMessage({ id: "marketplaceReport.range.legend" })}</legend>
            <label htmlFor="marketplace-report-from">{intl.formatMessage({ id: "marketplaceReport.range.from" })}</label>
            <input
              id="marketplace-report-from"
              type="date"
              value={range.fromLocalDate}
              onChange={(event) => setRange((current) => ({ ...current, fromLocalDate: event.target.value }))}
            />
            <label htmlFor="marketplace-report-to">{intl.formatMessage({ id: "marketplaceReport.range.to" })}</label>
            <input
              id="marketplace-report-to"
              type="date"
              value={range.toLocalDate}
              onChange={(event) => setRange((current) => ({ ...current, toLocalDate: event.target.value }))}
            />
            <button type="submit">{intl.formatMessage({ id: "marketplaceReport.range.apply" })}</button>
          </fieldset>
        </form>
        <p>{intl.formatMessage({ id: "marketplaceReport.range.summary" }, {
          from: localDate(intl, report.range.fromLocalDate),
          to: localDate(intl, report.range.toLocalDate),
          timeZone,
        })}</p>
      </section>

      <section className="workspace-card" aria-labelledby="marketplace-report-exceptions-title">
        <h2 id="marketplace-report-exceptions-title">{intl.formatMessage({ id: "marketplaceReport.exceptions.title" })}</h2>
        {exceptions.totalCount === 0 ? (
          <p>{intl.formatMessage({ id: "marketplaceReport.exceptions.none" })}</p>
        ) : (
          <>
            <p>{intl.formatMessage({ id: "marketplaceReport.exceptions.total" }, { total: exceptions.totalCount })}</p>
            {exceptions.items.length < exceptions.totalCount && (
              <p>{intl.formatMessage({ id: "marketplaceReport.exceptions.truncated" }, {
                shown: exceptions.items.length,
                total: exceptions.totalCount,
              })}</p>
            )}
            <ul className="marketplace-report-exceptions">
              {exceptions.items.map((item) => (
                <li key={`${item.kind}-${item.classSessionId}`}>
                  <h3>{intl.formatMessage({ id: exceptionMessageIds[item.kind] })}</h3>
                  <p>{intl.formatMessage({ id: "marketplaceReport.exception.detail" }, {
                    courseTitle: item.courseTitle,
                    lessonUnitTitle: item.lessonUnitTitle,
                    teacher: item.teacherDisplayName,
                    occurredAt: instantIn(intl, item.occurredAt, timeZone),
                    count: item.affectedBookingCount,
                  })}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="workspace-card" aria-labelledby="marketplace-report-attendance-title">
        <h2 id="marketplace-report-attendance-title">{intl.formatMessage({ id: "marketplaceReport.attendance.title" })}</h2>
        <p>{attendance.attendanceRatePercentage === null
          ? intl.formatMessage({ id: "marketplaceReport.attendance.noRate" })
          : intl.formatMessage({ id: "marketplaceReport.attendance.rate" }, {
            rate: attendance.attendanceRatePercentage,
            recorded: attendance.recordedCount,
          })}</p>
        <p>{intl.formatMessage({ id: "marketplaceReport.attendance.counts" }, {
          attended: attendance.attendedCount,
          noShow: attendance.noShowCount,
        })}</p>
        <p>{intl.formatMessage({ id: "marketplaceReport.attendance.excluded" }, {
          unrecorded: attendance.excludedUnrecordedCount,
        })}</p>
      </section>

      <section className="workspace-card" aria-labelledby="marketplace-report-cancellations-title">
        <h2 id="marketplace-report-cancellations-title">{intl.formatMessage({ id: "marketplaceReport.cancellations.title" })}</h2>
        <p>{cancellations.studentCancellationRatePercentage === null
          ? intl.formatMessage({ id: "marketplaceReport.cancellations.noRate" })
          : intl.formatMessage({ id: "marketplaceReport.cancellations.rate" }, {
            rate: cancellations.studentCancellationRatePercentage,
            cancellations: cancellations.studentCancellationCount,
            recorded: attendance.recordedCount,
          })}</p>
        <p>{intl.formatMessage({ id: "marketplaceReport.cancellations.timing" }, {
          timely: cancellations.timelyCount,
          late: cancellations.lateCount,
        })}</p>
        <p>{intl.formatMessage({ id: "marketplaceReport.cancellations.excluded" }, {
          sessionCancellations: cancellations.excludedClassSessionCancellationCount,
          reschedules: cancellations.excludedRescheduleCount,
        })}</p>
        <h3>{intl.formatMessage({ id: "marketplaceReport.cancellations.daily" })}</h3>
        {cancellations.dailyRates.length === 0 ? (
          <p>{intl.formatMessage({ id: "marketplaceReport.cancellations.dailyEmpty" })}</p>
        ) : (
          <ul className="marketplace-report-daily">
            {cancellations.dailyRates.map((day) => (
              <li key={day.localDate}>
                <h4>{localDate(intl, day.localDate)}</h4>
                <p>{intl.formatMessage({ id: "marketplaceReport.cancellations.dailyRow" }, {
                  rate: day.studentCancellationRatePercentage ?? 0,
                  cancellations: day.studentCancellationCount,
                  timely: day.timelyCount,
                  late: day.lateCount,
                  recorded: day.recordedOutcomeCount,
                })}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="workspace-card" aria-labelledby="marketplace-report-corrections-title">
        <h2 id="marketplace-report-corrections-title">{intl.formatMessage({ id: "marketplaceReport.corrections.title" })}</h2>
        <p>{corrections.correctedAttendanceCount === 0 || !corrections.lastCorrectedAt
          ? intl.formatMessage({ id: "marketplaceReport.corrections.none" })
          : intl.formatMessage({ id: "marketplaceReport.corrections.count" }, {
            corrected: corrections.correctedAttendanceCount,
            lastCorrectedAt: instantIn(intl, corrections.lastCorrectedAt, timeZone),
          })}</p>
        <p>{intl.formatMessage({ id: "marketplaceReport.corrections.pending" }, {
          pending: corrections.pendingAttendanceReviewCount,
        })}</p>
        <p>{intl.formatMessage({ id: "marketplaceReport.corrections.metadata" })}</p>
      </section>

      <section className="workspace-card" aria-labelledby="marketplace-report-credits-title">
        <h2 id="marketplace-report-credits-title">{intl.formatMessage({ id: "marketplaceReport.credits.title" })}</h2>
        <p>{intl.formatMessage({ id: "marketplaceReport.credits.adjustments" }, { adjustments: credits.creditAdjustmentCount })}</p>
        <p>{intl.formatMessage({ id: "marketplaceReport.credits.movement" }, {
          granted: credits.grantedCount,
          deducted: credits.deductedCount,
          refunded: credits.refundedCount,
        })}</p>
        <p>{intl.formatMessage({ id: "marketplaceReport.credits.net" }, { net: credits.netCreditChange })}</p>
        <ul className="marketplace-report-credits">
          {credits.bySource.map((entry) => (
            <li key={entry.source}>
              <h3>{intl.formatMessage({ id: creditSourceMessageIds[entry.source] })}</h3>
              <p>{intl.formatMessage({ id: "marketplaceReport.credits.source" }, {
                entries: entry.entryCount,
                net: entry.netAmount,
              })}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="workspace-card" aria-labelledby="marketplace-report-progress-title">
        <h2 id="marketplace-report-progress-title">{intl.formatMessage({ id: "marketplaceReport.progress.title" })}</h2>
        <p>{intl.formatMessage({ id: "marketplaceReport.progress.current" })}</p>
        {courseProgress.length === 0 ? (
          <p>{intl.formatMessage({ id: "marketplaceReport.progress.empty" })}</p>
        ) : (
          <ul className="marketplace-report-progress">
            {courseProgress.map((course) => (
              <li key={course.courseId}>
                <h3>{intl.formatMessage({ id: "marketplaceReport.progress.course" }, {
                  title: course.courseTitle,
                  language: course.targetLanguage,
                  level: course.curriculumLevel,
                })}</h3>
                <p>{intl.formatMessage({ id: "marketplaceReport.progress.row" }, {
                  percentage: course.averageProgressPercentage,
                  students: course.studentsWithProgressCount,
                  completed: course.completedActiveLessonUnitCount,
                  active: course.activeLessonUnitCount,
                })}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
