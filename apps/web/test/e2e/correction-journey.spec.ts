import { expect, test } from "@playwright/test";

import {
  actAs,
  changeRole,
  DEMONSTRATION_USERS,
  expectNoSeriousAccessibilityViolations,
  openPlace,
} from "./support/journeys.js";

/**
 * The correction journey.
 *
 * One Attendance Record in the demonstration was corrected from Attended to
 * No-show, and the interesting property is that the two people who can see it
 * see different things. The Student whose record it is sees the marker on her
 * own Attendance; the Platform Administrator sees that corrections happened and
 * is told where the prior values and the correcting actor live instead. Neither
 * view is the whole story, and that is the design.
 */

test("the corrected Student sees the correction marker on her own Attendance Record", async ({
  page,
}) => {
  await actAs(page, DEMONSTRATION_USERS.priya);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hello, Priya Raman" })).toBeVisible();
  await openPlace(page, "en", "STUDENT_LEARNING");

  const attendance = page.getByRole("region", { name: "Attendance and reviews" });
  await expect(attendance).toContainText("Attendance: No-show");
  // The marker states that a correction happened and how many times, without
  // reprinting the value it replaced.
  await expect(attendance).toContainText(/Corrected .* after one correction\./);
  await expect(attendance).not.toContainText("Attended");
  await expectNoSeriousAccessibilityViolations(page);
});

test("a Platform Administrator sees corrections as markers and is told where the rest lives", async ({
  page,
}) => {
  await actAs(page, DEMONSTRATION_USERS.alex);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hello, Alex Morgan" })).toBeVisible();
  await changeRole(page, "en", "PLATFORM_ADMINISTRATOR");
  await openPlace(page, "en", "ADMINISTRATION_REPORTS");

  // The report is current-effective rather than a rebuild of a past date, and
  // says so: a reader who assumed otherwise would misread every corrected row.
  await expect(
    page.getByRole("region", { name: "Marketplace operational report" }),
  ).toContainText("These are the values in force now.");

  const corrections = page.getByRole("region", { name: "Attendance corrections" });
  await expect(corrections).toContainText(
    /\d+ corrected Attendance Records, last corrected/,
  );
  await expect(corrections).toContainText(
    "Corrections appear as markers. Prior values belong to the correction-history extract, and the correcting actor and reason stay in the Audit Log.",
  );
  await expectNoSeriousAccessibilityViolations(page);
});
