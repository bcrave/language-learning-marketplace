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
 * The Teacher journey.
 *
 * The pair of reviewers is the point. Sofía leads every showcase Class Session;
 * Alex holds the same Teacher Role Assignment and the same Qualifications and
 * leads nothing. Asserting both is what proves the schedule is scoped by
 * assignment rather than by role — an empty schedule for a qualified Teacher is
 * the result, not a missing fixture.
 */

test("an assigned Teacher opens their scheduled Class Sessions and availability", async ({
  page,
}) => {
  await actAs(page, DEMONSTRATION_USERS.sofia);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hola, Sofía Rivera" })).toBeVisible();
  await changeRole(page, "es", "TEACHER");
  await openPlace(page, "es", "TEACHER_SCHEDULE");

  await expect(workspaceShell(page).getByText("Alcance: Sesiones de clase asignadas")).toBeVisible();
  const schedule = page.getByRole("region", { name: "Sesiones de clase asignadas" });
  await expect(schedule).toContainText(
    "Informar una solicitud de ausencia mantiene intactas cada sesión de clase publicada",
  );
  // Lesson Materials follow the teaching assignment, which is why this panel is
  // on the Teacher's schedule at all.
  await expect(
    page.getByRole("region", { name: "Materiales de la unidad y aula" }),
  ).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  await openPlace(page, "es", "TEACHER_AVAILABILITY");
  await expect(
    page.getByRole("region", { name: "Disponibilidad docente semanal" }),
  ).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test("a qualified Teacher with no assignment sees an empty schedule, not a denial", async ({
  page,
}) => {
  await actAs(page, DEMONSTRATION_USERS.alex);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hello, Alex Morgan" })).toBeVisible();
  await changeRole(page, "en", "TEACHER");
  await openPlace(page, "en", "TEACHER_SCHEDULE");

  const schedule = page.getByRole("region", { name: "Assigned Class Sessions" });
  await expect(schedule).toContainText("You have no upcoming assigned Class Sessions.");
  await expect(schedule).toContainText("You have no Absence Requests.");
  await expectNoSeriousAccessibilityViolations(page);
});
