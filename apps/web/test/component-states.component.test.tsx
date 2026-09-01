import { MockedProvider } from "@apollo/client/testing/react";
import { interfaceMessages, type InterfaceLocale } from "@marketplace/core";
import { cleanup, render, waitFor } from "@testing-library/react";
import axe from "axe-core";
import type { ReactElement } from "react";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";

import {
  AdministratorAttendanceReviewPanel,
  StudentAttendanceReviewPanel,
} from "../src/attendance-review.js";
import { AdministratorTaskQueue } from "../src/administrator-task-queue.js";
import { AuditLogPanel } from "../src/audit-log.js";
import {
  AdminClassCredits,
  StudentClassCredits,
  StudentSubscription,
} from "../src/class-credits.js";
import { OrganizationCohortsPanel } from "../src/cohorts.js";
import { CourseProgressPanel } from "../src/course-progress.js";
import { LearningAccessPanel } from "../src/learning-access.js";
import { MarketplaceReportPanel } from "../src/marketplace-report.js";
import { NotificationInbox } from "../src/notification-inbox.js";
import { OrganizationReportPanel } from "../src/organization-report.js";
import { ReportExportPanel } from "../src/report-export.js";
import { RoleAssignmentAdministrationPanel } from "../src/role-assignments.js";
import {
  OrganizationSponsorshipPanel,
  StudentSponsorshipPanel,
} from "../src/sponsorship.js";
import { StudentDiscoveryPanel } from "../src/student-discovery.js";
import { TeacherAttendancePanel } from "../src/teacher-attendance.js";
import { TeacherAvailabilityPanel } from "../src/teacher-availability.js";
import { TeacherSchedulePanel } from "../src/teacher-schedule.js";

/**
 * Every panel scanned in the state it reaches when its data never arrives —
 * an announced error for most, "nothing to show" for a few — in both languages.
 *
 * The panels' own test files cover the states each one cares about, and several
 * already scan their empty and error paths. This is the net underneath them: a
 * panel added later gets this state scanned because it is on this list, not
 * because somebody remembered. It is the state worth guaranteeing centrally,
 * because it is the one a reviewer meets least often and the one whose markup
 * appears only when something has already gone wrong — so an unlabelled alert
 * or an error nobody announces survives a long time there.
 *
 * Both locales, because a translated message is a different accessible name,
 * and Spanish is the longer of the two.
 */
const PANELS: ReadonlyArray<readonly [string, ReactElement]> = [
  ["Administrator task queue", <AdministratorTaskQueue />],
  ["Administrator Attendance review", <AdministratorAttendanceReviewPanel />],
  ["Audit Log", <AuditLogPanel />],
  ["Class Credit administration", <AdminClassCredits />],
  ["Course Progress", <CourseProgressPanel />],
  ["Marketplace report", <MarketplaceReportPanel />],
  ["Notifications", <NotificationInbox />],
  ["Organization Cohorts", <OrganizationCohortsPanel />],
  ["Organization report", <OrganizationReportPanel />],
  ["Organization Sponsorships", <OrganizationSponsorshipPanel />],
  ["Report Exports", <ReportExportPanel />],
  ["Role Assignments", <RoleAssignmentAdministrationPanel />],
  ["Student Attendance review", <StudentAttendanceReviewPanel />],
  ["Student Class Credits", <StudentClassCredits />],
  ["Student discovery", <StudentDiscoveryPanel displayTimeZone="America/Denver" />],
  ["Student learning access", <LearningAccessPanel actingRole="STUDENT" />],
  ["Student Sponsorship", <StudentSponsorshipPanel />],
  ["Student Subscription", <StudentSubscription />],
  ["Teacher Attendance", <TeacherAttendancePanel />],
  ["Teacher availability", <TeacherAvailabilityPanel />],
  ["Teacher learning access", <LearningAccessPanel actingRole="TEACHER" />],
  ["Teacher schedule", <TeacherSchedulePanel />],
];

const LOCALES: readonly InterfaceLocale[] = ["en", "es"];

describe("component states", () => {
  afterEach(cleanup);

  for (const locale of LOCALES) {
    it.each(PANELS.map(([name, element]) => ({ element, name })))(
      `keeps $name accessible in ${locale} when its data never arrives`,
      async ({ element }) => {
        // No mocks at all, so every query the panel issues is refused. Which
        // query it issues is deliberately not encoded here: this test should
        // not need updating when a panel changes what it asks for.
        const { container } = render(
          <MockedProvider mocks={[]}>
            <IntlProvider locale={locale} messages={interfaceMessages[locale]}>
              {element}
            </IntlProvider>
          </MockedProvider>,
        );

        // Wait for the rendering to stop changing rather than for particular
        // words. Most panels go loading → refused; a few have no loading state
        // and settle immediately on "nothing to show". Two consecutive equal
        // readings mean whichever of those happened is finished, and the test
        // never has to know which panel does which.
        let previous: string | null = null;
        await waitFor(() => {
          const current = container.textContent;
          const settled = previous !== null && current === previous;
          previous = current;
          expect(settled).toBe(true);
        });

        const accessibility = await axe.run(container);
        expect(
          accessibility.violations.filter(
            ({ impact }) => impact === "serious" || impact === "critical",
          ),
        ).toEqual([]);
      },
    );
  }
});
