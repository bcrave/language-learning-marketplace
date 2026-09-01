import { expect, test } from "@playwright/test";

import {
  changeRole,
  expectNoSeriousAccessibilityViolations,
  openPlace,
} from "./support/journeys.js";

/**
 * The multi-role journey.
 *
 * A reviewer who holds four Role Assignments is not four users, and the
 * application never decides for them which one they are. Every crossing is
 * explicit, and every role keeps the place it was last left in — so returning
 * to a role resumes work rather than restarting it.
 *
 * The journey establishes each role's place itself rather than trusting a
 * default. Where a role resumes is remembered on the server against the User,
 * so a test that asserted the default would really be asserting that no earlier
 * journey had visited that role — which is not a property of the application.
 *
 * The role-change prompts are asserted as literal Spanish rather than through
 * the message catalog: the wording *is* the safeguard, and reading it from the
 * catalog the prompt renders from would agree with any wording at all.
 */

test("a multi-role User switches explicitly and returns to each role's last place", async ({
  page,
}) => {
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hola, Sofía Rivera" })).toBeVisible();

  // Leave each role somewhere deliberate.
  await openPlace(page, "es", "STUDENT_LEARNING");
  await changeRole(page, "es", "TEACHER");
  await openPlace(page, "es", "TEACHER_AVAILABILITY");
  await expectNoSeriousAccessibilityViolations(page);

  // Each role now resumes where it was left, in both directions.
  await changeRole(page, "es", "STUDENT");
  await expect(page).toHaveURL(/\/student\/learning$/);
  await changeRole(page, "es", "TEACHER");
  await expect(page).toHaveURL(/\/teacher\/availability$/);
  // `name` matches a substring by default, and the availability panel adds
  // "Disponibilidad docente semanal" and "Excepciones de disponibilidad" once
  // its query resolves. Only the journey heading is under test here, so match
  // it exactly; otherwise this passes or fails on how fast the panel loads.
  await expect(
    page.getByRole("heading", { name: "Disponibilidad", exact: true }),
  ).toBeVisible();

  // A link into another role's workspace never changes the acting role by
  // itself. Declining leaves the Teacher exactly where they were.
  await page.goto("/administration/operations");
  await expect(
    page.getByRole("heading", {
      name: "¿Cambiar al espacio de administración de la plataforma?",
    }),
  ).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  await page.getByRole("button", { name: "Volver a docente" }).click();
  await expect(page).toHaveURL(/\/teacher\/availability$/);

  // Accepting is what changes it, and the change is complete: the role control
  // agrees, not just the address bar.
  await page.goto("/administration/operations");
  await page
    .getByRole("button", { name: "Cambiar a administración de la plataforma" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Operaciones del mercado" }),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Rol activo" })).toHaveValue(
    "PLATFORM_ADMINISTRATOR",
  );
  await expect(page).toHaveURL(/\/administration\/operations$/);
  await expectNoSeriousAccessibilityViolations(page);
});

test("a fresh deep link waits for an explicit authorized role choice", async ({
  page,
}) => {
  await page.goto("/teacher/schedule");

  await expect(
    page.getByRole("heading", { name: "Change to the Teacher workspace?" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => window.sessionStorage.getItem("marketplace.actingRole")),
  ).toBeNull();
  await expectNoSeriousAccessibilityViolations(page);

  await page.getByRole("button", { name: "Change to Teacher" }).click();
  await expect(page.getByRole("heading", { name: "Horario docente" })).toBeVisible();
  expect(
    await page.evaluate(() => window.sessionStorage.getItem("marketplace.actingRole")),
  ).toBe("TEACHER");
});
