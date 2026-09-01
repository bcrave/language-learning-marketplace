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
 * The Organization Manager journey.
 *
 * Nimbus Logistics carries the demonstration's whole Sponsorship lifecycle at
 * once: one Sponsorship that started and ended, one invitation still waiting on
 * a decision, and one Cohort. Walking the two places in order is what shows a
 * manager where each of those lives.
 */

test("an Organization Manager reviews sponsored Students, Cohorts, and frozen reporting", async ({
  page,
}) => {
  await actAs(page, DEMONSTRATION_USERS.sofia);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hola, Sofía Rivera" })).toBeVisible();
  await changeRole(page, "es", "ORGANIZATION_MANAGER");
  await openPlace(page, "es", "ORGANIZATION_STUDENTS");

  await expect(
    workspaceShell(page).getByText("Alcance: Organización asignada"),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Invitar a un Estudiante al Patrocinio" }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Cohortes" })).toContainText(
    "Warehouse Operations",
  );
  await expectNoSeriousAccessibilityViolations(page);

  await openPlace(page, "es", "ORGANIZATION_REPORTS");
  const report = page.getByRole("region", { name: "Asistencia y Progreso del Curso" });
  // Reporting freezes at the end of a Sponsorship rather than following the
  // Student onwards, which is the promise the disclosure made at acceptance.
  await expect(report).toContainText("Tasa de Asistencia");
  await expect(
    page.getByRole("region", { name: "Estudiantes patrocinados" }),
  ).toContainText("Alex Morgan");
  await expectNoSeriousAccessibilityViolations(page);
});
