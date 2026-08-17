import { CombinedGraphQLErrors } from "@apollo/client";
import { MockedProvider } from "@apollo/client/testing/react";
import { interfaceMessages, type InterfaceLocale } from "@marketplace/core";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";

import { MarketplaceOperationalReportDocument } from "../src/generated/graphql.js";
import { MarketplaceReportPanel } from "../src/marketplace-report.js";

afterEach(cleanup);

const classSessionId = "00000000-0000-4000-8000-000000000010";
const reviewedClassSessionId = "00000000-0000-4000-8000-000000000011";

function exceptionItem(overrides: Record<string, unknown> = {}) {
  return {
    __typename: "MarketplaceExceptionItem",
    kind: "UNRECORDED_ATTENDANCE",
    classSessionId,
    occurredAt: "2026-06-10T15:00:00.000Z",
    courseTitle: "Spanish B2",
    lessonUnitTitle: "Unit 3",
    teacherDisplayName: "Tomás Teacher",
    affectedBookingCount: 2,
    ...overrides,
  };
}

function creditSource(source: string, entryCount: number, netAmount: number) {
  return { __typename: "MarketplaceCreditSourceTotal", source, entryCount, netAmount };
}

function report(overrides: Record<string, unknown> = {}) {
  return {
    __typename: "MarketplaceOperationalReport",
    generatedAt: "2026-06-25T18:00:00.000Z",
    range: {
      __typename: "MarketplaceReportRange",
      fromLocalDate: "2026-05-27",
      toLocalDate: "2026-06-25",
      timeZone: "America/Denver",
    },
    attendance: {
      __typename: "MarketplaceAttendanceSummary",
      attendedCount: 6,
      noShowCount: 2,
      recordedCount: 8,
      attendanceRatePercentage: 75,
      excludedUnrecordedCount: 2,
      correctedCount: 1,
      exceptionCount: 5,
    },
    cancellations: {
      __typename: "MarketplaceCancellationSummary",
      studentCancellationCount: 2,
      timelyCount: 1,
      lateCount: 1,
      studentCancellationRatePercentage: 20,
      excludedClassSessionCancellationCount: 3,
      excludedRescheduleCount: 1,
      dailyRates: [{
        __typename: "MarketplaceDailyCancellationRate",
        localDate: "2026-06-10",
        studentCancellationCount: 2,
        timelyCount: 1,
        lateCount: 1,
        recordedOutcomeCount: 4,
        excludedUnrecordedCount: 0,
        studentCancellationRatePercentage: 33,
      }],
    },
    corrections: {
      __typename: "MarketplaceCorrectionSummary",
      correctedAttendanceCount: 1,
      lastCorrectedAt: "2026-06-20T17:00:00.000Z",
      pendingAttendanceReviewCount: 1,
    },
    credits: {
      __typename: "MarketplaceCreditSummary",
      creditAdjustmentCount: 2,
      grantedCreditCount: 16,
      refundedCreditCount: 3,
      deductedCreditCount: 9,
      netCreditChange: 12,
      bySource: [
        creditSource("CREDIT_ADJUSTMENT", 2, 3),
        creditSource("SUBSCRIPTION_GRANT", 8, 8),
        creditSource("ORGANIZATION_CREDIT_GRANT", 8, 8),
        creditSource("BOOKING_DEDUCTION", 9, -9),
        creditSource("BOOKING_REFUND", 3, 2),
      ],
    },
    courseProgress: [{
      __typename: "MarketplaceCourseProgressReport",
      courseId: "00000000-0000-4000-8000-000000000090",
      courseTitle: "Spanish B2",
      targetLanguage: "es",
      curriculumLevel: "B2",
      activeLessonUnitCount: 4,
      completedActiveLessonUnitCount: 6,
      studentsWithProgressCount: 3,
    }],
    actionableExceptions: {
      __typename: "MarketplaceActionableExceptions",
      totalCount: 2,
      items: [
        exceptionItem(),
        exceptionItem({
          kind: "PENDING_ATTENDANCE_REVIEW",
          classSessionId: reviewedClassSessionId,
          occurredAt: "2026-06-12T15:00:00.000Z",
          affectedBookingCount: 1,
        }),
      ],
    },
    ...overrides,
  };
}

function reportMock(input: Record<string, unknown> | null, overrides: Record<string, unknown> = {}) {
  return {
    request: { query: MarketplaceOperationalReportDocument, variables: { input } },
    result: { data: { marketplaceOperationalReport: report(overrides) } },
  };
}

function renderPanel(mocks: unknown[], locale: InterfaceLocale = "en") {
  return render(
    <MockedProvider mocks={mocks as never[]}>
      <IntlProvider locale={locale} messages={interfaceMessages[locale]}>
        <MarketplaceReportPanel />
      </IntlProvider>
    </MockedProvider>,
  );
}

async function expectNoSeriousViolations(container: HTMLElement) {
  const accessibility = await axe.run(container);
  expect(accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
}

describe("Marketplace operational report", () => {
  it("leads with the actionable exceptions a Platform Administrator can act on", async () => {
    const { container } = renderPanel([reportMock(null)]);

    expect(await screen.findByRole("heading", { name: "Marketplace operational report" })).toBeVisible();
    const exceptions = within(screen.getByRole("region", { name: "Needs attention" }));
    expect(exceptions.getByText("2 actionable exceptions, oldest first")).toBeVisible();
    expect(exceptions.getByRole("heading", { name: "Attendance still Unrecorded" })).toBeVisible();
    expect(exceptions.getByRole("heading", { name: "Attendance Review Request awaiting a decision" })).toBeVisible();
    expect(exceptions.getByText(/Spanish B2: Unit 3, led by Tomás Teacher on June 10, 2026.*2 Bookings affected/)).toBeVisible();
    await expectNoSeriousViolations(container);
  });

  it("states the canonical Attendance Rate and Student Cancellation Rate with their exclusions", async () => {
    renderPanel([reportMock(null)]);

    expect(await screen.findByRole("heading", { name: "Attendance" })).toBeVisible();
    expect(screen.getByText("Attendance Rate 75% from 8 recorded outcomes")).toBeVisible();
    expect(screen.getByText("2 Unrecorded excluded from the rate")).toBeVisible();
    expect(screen.getByText("Student Cancellation Rate 20% from 2 cancellations and 8 recorded outcomes")).toBeVisible();
    expect(screen.getByText("1 timely, 1 late")).toBeVisible();
    expect(screen.getByText("Excluded from the rate: 3 Class Session Cancellations and 1 Reschedules")).toBeVisible();
  });

  it("groups the Student Cancellation Rate by the Class Session's scheduled date", async () => {
    renderPanel([reportMock(null)]);

    expect(await screen.findByRole("heading", { name: "By Class Session date" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Jun 10, 2026" })).toBeVisible();
    expect(screen.getByText("33% from 2 cancellations (1 timely, 1 late) and 4 recorded outcomes")).toBeVisible();
  });

  it("says a date carrying only Unrecorded attendance has no rate rather than showing 0%", async () => {
    renderPanel([reportMock(null, {
      cancellations: {
        __typename: "MarketplaceCancellationSummary",
        studentCancellationCount: 0,
        timelyCount: 0,
        lateCount: 0,
        studentCancellationRatePercentage: null,
        excludedClassSessionCancellationCount: 0,
        excludedRescheduleCount: 0,
        dailyRates: [{
          __typename: "MarketplaceDailyCancellationRate",
          localDate: "2026-06-15",
          studentCancellationCount: 0,
          timelyCount: 0,
          lateCount: 0,
          recordedOutcomeCount: 0,
          excludedUnrecordedCount: 2,
          studentCancellationRatePercentage: null,
        }],
      },
    })]);

    expect(await screen.findByRole("heading", { name: "Jun 15, 2026" })).toBeVisible();
    expect(screen.getByText("No rate yet: no cancellation and no recorded outcome, with 2 Unrecorded excluded")).toBeVisible();
    // A day still waiting to be recorded must never read as a clean day.
    expect(screen.queryByText(/^0% from/)).toBeNull();
  });

  it("presents current-effective values and correction markers without implying an as-of rebuild", async () => {
    renderPanel([reportMock(null)]);

    expect(await screen.findByText(/Current effective values as of June 25, 2026/)).toBeVisible();
    expect(screen.getByText(/The range selects which activity is counted, not the moment it is read at/)).toBeVisible();
    expect(screen.getByText(/1 corrected Attendance Records, last corrected June 20, 2026/)).toBeVisible();
    expect(screen.getByText(/Prior values belong to the correction-history extract, and the correcting actor and reason stay in the Audit Log/)).toBeVisible();
    expect(screen.getByText("Course Progress is current effective now rather than confined to the reported range.")).toBeVisible();
  });

  it("reports Class Credit movement by ledger provenance", async () => {
    renderPanel([reportMock(null)]);

    const credits = within(await screen.findByRole("region", { name: "Class Credits" }));
    expect(credits.getByText("2 Credit Adjustments issued by a Platform Administrator")).toBeVisible();
    expect(credits.getByText("16 Class Credits granted, 9 deducted, 3 refunded")).toBeVisible();
    expect(credits.getByRole("heading", { name: "Organization Credit Benefit" })).toBeVisible();
    expect(credits.getByText("Net change 12 Class Credits")).toBeVisible();
  });

  it("reads a narrower range of activity", async () => {
    renderPanel([
      reportMock(null),
      reportMock({ fromLocalDate: "2026-06-01", toLocalDate: "2026-06-30" }, {
        range: {
          __typename: "MarketplaceReportRange",
          fromLocalDate: "2026-06-01",
          toLocalDate: "2026-06-30",
          timeZone: "America/Denver",
        },
      }),
    ]);

    expect(await screen.findByText(/Activity from May 27, 2026 through Jun 25, 2026/)).toBeVisible();
    await userEvent.type(screen.getByLabelText("From"), "2026-06-01");
    await userEvent.type(screen.getByLabelText("To"), "2026-06-30");
    await userEvent.click(screen.getByRole("button", { name: "Update the report" }));
    expect(await screen.findByText(/Activity from Jun 1, 2026 through Jun 30, 2026/)).toBeVisible();
  });

  it("tells a refused range apart from a report we could not load", async () => {
    const { container } = renderPanel([{
      request: { query: MarketplaceOperationalReportDocument, variables: { input: null } },
      error: new CombinedGraphQLErrors(
        { data: null },
        [{ message: "Choose a range of at most 12 months.", extensions: { code: "BAD_USER_INPUT" } }],
      ),
    }]);

    expect(await screen.findByText(/Choose a range of at most 12 months that starts on or before it ends/)).toBeVisible();
    await expectNoSeriousViolations(container);
  });

  it("renders the report in Spanish", async () => {
    const { container } = renderPanel([reportMock(null)], "es");

    expect(await screen.findByRole("heading", { name: "Informe operativo del mercado" })).toBeVisible();
    expect(screen.getByText("Tasa de Asistencia del 75% sobre 8 resultados registrados")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Asistencia todavía sin registrar" })).toBeVisible();
    await expectNoSeriousViolations(container);
  });

  it.each([
    ["quiet", [reportMock(null, {
      actionableExceptions: { __typename: "MarketplaceActionableExceptions", totalCount: 0, items: [] },
    })], "No actionable exceptions in the reported activity."],
    ["failed", [{
      request: { query: MarketplaceOperationalReportDocument, variables: { input: null } },
      error: new Error("private diagnostic"),
    }], "We couldn't load the marketplace report. Try again."],
  ])("keeps the %s state accessible", async (_state, mocks, expectedText) => {
    const { container } = renderPanel(mocks);
    expect(await screen.findByText(expectedText)).toBeVisible();
    // A failure never leaks the diagnostic behind it into reporting.
    expect(screen.queryByText(/private diagnostic/)).toBeNull();
    await expectNoSeriousViolations(container);
  });
});
