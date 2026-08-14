import { MockedProvider } from "@apollo/client/testing/react";
import { interfaceMessages, type InterfaceLocale } from "@marketplace/core";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";

import { OrganizationAttendanceAndProgressReportDocument } from "../src/generated/graphql.js";
import { OrganizationReportPanel } from "../src/organization-report.js";

afterEach(cleanup);

const engineeringCohortId = "00000000-0000-4000-8000-000000000080";
const pilotCohortId = "00000000-0000-4000-8000-000000000081";

function attendance(overrides: Partial<Record<string, number | null>> = {}) {
  return {
    __typename: "OrganizationAttendanceSummary",
    attendedCount: 2,
    noShowCount: 1,
    recordedCount: 3,
    attendanceRatePercentage: 67,
    excludedUnrecordedCount: 1,
    correctedCount: 1,
    exceptionCount: 3,
    ...overrides,
  };
}

function progressValue(completed: number, active: number, percentage: number) {
  return { __typename: "OrganizationCourseProgressValue", completedActiveLessonUnitCount: completed, activeLessonUnitCount: active, percentage };
}

const activeStudent = {
  __typename: "OrganizationSponsoredStudentReport",
  sponsorshipId: "00000000-0000-4000-8000-000000000060",
  studentUserId: "00000000-0000-4000-8000-000000000001",
  studentDisplayName: "Casey Nguyen",
  state: "ACTIVE",
  reportingFrom: "2026-03-01T00:00:00.000Z",
  reportingUntil: null,
  cohortNames: ["Engineering", "Spanish Pilot"],
  attendance: attendance(),
  courseProgress: [{
    __typename: "OrganizationCourseProgressReport",
    courseId: "00000000-0000-4000-8000-000000000090",
    courseTitle: "Spanish B2",
    baseline: progressValue(1, 4, 25),
    baselineCapturedAt: "2026-03-01T00:00:00.000Z",
    endingSnapshot: null,
    endingSnapshotCapturedAt: null,
    currentEffective: progressValue(3, 4, 75),
    completedLessonUnitGain: 2,
    percentagePointGain: 50,
    snapshotRevisionCount: 0,
    lastRevisedAt: null,
  }],
};

const endedStudent = {
  ...activeStudent,
  sponsorshipId: "00000000-0000-4000-8000-000000000061",
  studentUserId: "00000000-0000-4000-8000-000000000002",
  studentDisplayName: "Dana Ortiz",
  state: "ENDED",
  reportingUntil: "2026-05-01T00:00:00.000Z",
  cohortNames: [],
  attendance: attendance({ attendanceRatePercentage: null, attendedCount: 0, noShowCount: 0, recordedCount: 0, correctedCount: 0, excludedUnrecordedCount: 0, exceptionCount: 0 }),
  courseProgress: [{
    ...activeStudent.courseProgress[0]!,
    endingSnapshot: progressValue(3, 4, 75),
    endingSnapshotCapturedAt: "2026-05-01T00:00:00.000Z",
    currentEffective: null,
    snapshotRevisionCount: 1,
    lastRevisedAt: "2026-06-20T00:00:00.000Z",
  }],
};

function reportMock(cohortId: string | null, students: unknown[]) {
  return {
    request: { query: OrganizationAttendanceAndProgressReportDocument, variables: { cohortId } },
    result: {
      data: {
        organizationAttendanceAndProgressReport: {
          __typename: "OrganizationAttendanceAndProgressReport",
          organization: { __typename: "Organization", id: "00000000-0000-4000-8000-000000000041", name: "Nimbus Logistics" },
          generatedAt: "2026-06-25T12:00:00.000Z",
          attendance: attendance(),
          cohorts: [
            { __typename: "OrganizationCohortReport", cohortId: engineeringCohortId, cohortName: "Engineering", sponsoredStudentCount: 2, attendance: attendance() },
            { __typename: "OrganizationCohortReport", cohortId: pilotCohortId, cohortName: "Spanish Pilot", sponsoredStudentCount: 1, attendance: attendance({ attendedCount: 0, noShowCount: 0, recordedCount: 0, attendanceRatePercentage: null, correctedCount: 0, exceptionCount: 1 }) },
          ],
          students,
        },
      },
    },
  };
}

function renderPanel(mocks: unknown[], locale: InterfaceLocale = "en") {
  return render(
    <MockedProvider mocks={mocks as never[]}>
      <IntlProvider locale={locale} messages={interfaceMessages[locale]}>
        <OrganizationReportPanel />
      </IntlProvider>
    </MockedProvider>,
  );
}

async function expectNoSeriousViolations(container: HTMLElement) {
  const accessibility = await axe.run(container);
  expect(accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
}

describe("Organization attendance and progress report", () => {
  it("leads with the exceptions and states what the rate excludes", async () => {
    const { container } = renderPanel([reportMock(null, [activeStudent, endedStudent])]);

    expect(await screen.findByRole("heading", { name: "Attendance and Course Progress" })).toBeVisible();
    expect(screen.getByText("3 exceptions: 1 no-show, 1 Unrecorded excluded, 1 corrected")).toBeVisible();
    expect(screen.getAllByText("Attendance Rate 67% from 3 recorded outcomes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 Unrecorded excluded from the rate").length).toBeGreaterThan(0);
    expect(screen.getByText(/covers only sponsored activity inside each Sponsorship/)).toBeVisible();
    await expectNoSeriousViolations(container);
  });

  it("shows a baseline, the gain, and the current-effective value while the Sponsorship is active", async () => {
    renderPanel([reportMock(null, [activeStudent])]);

    expect(await screen.findByRole("heading", { name: "Casey Nguyen" })).toBeVisible();
    expect(screen.getByText("Baseline at the Sponsorship start: 1 of 4 active Lesson Units (25%)")).toBeVisible();
    expect(screen.getByText("Current effective: 3 of 4 active Lesson Units (75%)")).toBeVisible();
    expect(screen.getByText("Gain during Sponsorship: 2 Lesson Units (50 percentage points)")).toBeVisible();
    expect(screen.getByText("Cohorts: Engineering and Spanish Pilot")).toBeVisible();
    expect(screen.queryByText(/Frozen ending snapshot/)).toBeNull();
  });

  it("freezes an ended Sponsorship at its ending snapshot and marks accepted corrections", async () => {
    renderPanel([reportMock(null, [endedStudent])]);

    expect(await screen.findByRole("heading", { name: "Dana Ortiz" })).toBeVisible();
    expect(screen.getByText(/Sponsorship ended May 1, 2026.*reporting is frozen there/)).toBeVisible();
    expect(screen.getByText("Frozen ending snapshot: 3 of 4 active Lesson Units (75%)")).toBeVisible();
    expect(screen.queryByText(/Current effective:/)).toBeNull();
    expect(screen.getByText(/Revised by 1 accepted Attendance corrections on June 20, 2026/)).toBeVisible();
    const students = within(screen.getByRole("region", { name: "Sponsored Students" }));
    expect(students.getByText("No recorded Attendance outcome yet")).toBeVisible();
    expect(students.getByText("No Cohort attribution for the reported activity")).toBeVisible();
  });

  it("narrows the report to one Cohort", async () => {
    renderPanel([
      reportMock(null, [activeStudent, endedStudent]),
      reportMock(pilotCohortId, [activeStudent]),
    ]);

    expect(await screen.findByRole("heading", { name: "Dana Ortiz" })).toBeVisible();
    await userEvent.selectOptions(screen.getByLabelText("Cohort"), pilotCohortId);
    expect(await screen.findByRole("heading", { name: "Casey Nguyen" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Dana Ortiz" })).toBeNull();
  });

  it("renders the report in Spanish", async () => {
    const { container } = renderPanel([reportMock(null, [endedStudent])], "es");

    expect(await screen.findByRole("heading", { name: "Asistencia y Progreso del Curso" })).toBeVisible();
    expect(screen.getByText("Instantánea final congelada: 3 de 4 Unidades de Lección activas (75%)")).toBeVisible();
    const students = within(screen.getByRole("region", { name: "Estudiantes patrocinados" }));
    expect(students.getByText("Todavía no hay ningún resultado de Asistencia registrado")).toBeVisible();
    await expectNoSeriousViolations(container);
  });

  it.each([
    ["empty", [reportMock(null, [])], "No sponsored Students match this report."],
    ["error", [{ request: { query: OrganizationAttendanceAndProgressReportDocument, variables: { cohortId: null } }, error: new Error("private diagnostic") }], "We couldn't load your Organization report. Try again."],
  ])("keeps the %s state accessible", async (_state, mocks, expectedText) => {
    const { container } = renderPanel(mocks);
    expect(await screen.findByText(expectedText)).toBeVisible();
    await expectNoSeriousViolations(container);
  });
});
