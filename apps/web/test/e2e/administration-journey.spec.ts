import { expect, test } from "@playwright/test";

import {
  actAs,
  changeRole,
  DEMONSTRATION_USERS,
  expectNoSeriousAccessibilityViolations,
  openPlace,
  workspaceShell,
} from "./support/journeys.js";

/**
 * The Platform Administrator journey.
 *
 * Three places, each answering a different question: what needs resolving, who
 * has access, and what the marketplace looks like. The administrator is the one
 * role whose scope is the whole marketplace, so the assertions here are as much
 * about that being *stated* as about the panels loading.
 */

test("a Platform Administrator works the operations queue and the curriculum", async ({
  page,
}) => {
  await actAs(page, DEMONSTRATION_USERS.sofia);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hola, Sofía Rivera" })).toBeVisible();
  await changeRole(page, "es", "PLATFORM_ADMINISTRATOR");
  await openPlace(page, "es", "ADMINISTRATION_OPERATIONS");

  await expect(workspaceShell(page).getByText("Alcance: Todo el mercado")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Tareas de administración" }),
  ).toBeVisible();

  // The canonical curriculum is authored content: its titles stay in the
  // language they were written in even while the interface is Spanish.
  const curriculum = page.getByRole("region", { name: "Administración del currículo" });
  await expect(
    curriculum.getByRole("heading", { name: "Everyday English Foundations" }),
  ).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test("a Platform Administrator reaches Role Assignments without Project Owner authority", async ({
  page,
}) => {
  await actAs(page, DEMONSTRATION_USERS.alex);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hello, Alex Morgan" })).toBeVisible();
  await changeRole(page, "en", "PLATFORM_ADMINISTRATOR");
  await openPlace(page, "en", "ADMINISTRATION_PEOPLE");

  const people = page.getByRole("region", { name: "Role Assignments" });
  await expect(people).toContainText(
    "Project Owner authority is never available here.",
  );
  // Anonymization is offered, and offered as irreversible. A destructive action
  // presented without its warning is the accessibility failure here, not a
  // missing label.
  await expect(people.getByRole("combobox", { name: "Action" })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test("a Platform Administrator reads the marketplace-wide report", async ({ page }) => {
  await actAs(page, DEMONSTRATION_USERS.alex);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hello, Alex Morgan" })).toBeVisible();
  await changeRole(page, "en", "PLATFORM_ADMINISTRATOR");
  await openPlace(page, "en", "ADMINISTRATION_REPORTS");

  await expect(
    page.getByRole("region", { name: "Marketplace operational report" }),
  ).toContainText("Class Sessions by their scheduled date");
  await expect(page.getByRole("region", { name: "Attendance", exact: true })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});
