import { expect, test } from "@playwright/test";

import {
  actAs,
  changeRole,
  confirmDeepLink,
  DEMONSTRATION_USERS,
  expectNoSeriousAccessibilityViolations,
  openPlace,
  workspaceShell,
} from "./support/journeys.js";

/**
 * The privacy-boundary journey.
 *
 * Two boundaries are worth reaching through a browser rather than a resolver
 * test, because both are things a reviewer can try by hand: a role somebody was
 * never assigned, and an Organization somebody does not manage. In each case
 * what is asserted is not only the refusal but what the refusal leaves behind —
 * an Audit Entry that names the operation and not the person.
 *
 * Each journey starts at `/student` rather than deep-linking straight in. That
 * is not ceremony: until a workspace has loaded once, the application has no
 * saved Interface Locale to render with and falls back to what the browser
 * suggests, so a Spanish reviewer's *first* screen is in the browser's language.
 * Landing first is what a real session does, and it is what makes the language
 * of everything after it the User's own.
 */

test("a denied workspace read is refused and leaves a privacy-safe Audit Entry", async ({
  page,
}) => {
  await actAs(page, DEMONSTRATION_USERS.casey);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hello, Casey Nguyen" })).toBeVisible();

  // Casey holds only the Student Role Assignment, so the Teacher workspace is a
  // denial rather than an empty page.
  await page.goto("/teacher/schedule");
  await confirmDeepLink(page, "en", "TEACHER");
  await expect(page.getByRole("alert")).toContainText("We couldn't open your workspace");

  // The same browser, a different reviewer: the Platform Administrator who can
  // read the marketplace-wide Audit Log. Nothing about the denial is visible to
  // Casey, which is exactly why it has to be observable here.
  await actAs(page, DEMONSTRATION_USERS.sofia);
  await page.evaluate(() => window.sessionStorage.clear());
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hola, Sofía Rivera" })).toBeVisible();
  await changeRole(page, "es", "PLATFORM_ADMINISTRATOR");
  await openPlace(page, "es", "ADMINISTRATION_OPERATIONS");

  const auditLog = page.getByRole("region", { name: "Registro de auditoría" });
  await expect(auditLog).toContainText(
    "Estás leyendo el registro de auditoría de todo el mercado.",
  );
  await auditLog.getByRole("combobox", { name: "Resultado" }).selectOption("DENIED");
  await auditLog.getByRole("textbox", { name: "Operación" }).fill("role-workspace.opened");
  await auditLog.getByRole("button", { name: "Aplicar filtros" }).click();

  // `.first()` because the Audit Log is append-only and every refusal in this
  // suite lands in it. One matching entry is the assertion; how many refusals
  // the whole run produced is not.
  await expect(
    auditLog.getByText("role-workspace.opened: Denegada").first(),
  ).toBeVisible();
  await expect(
    auditLog.getByText("Motivo ROLE_ASSIGNMENT_REQUIRED").first(),
  ).toBeVisible();

  // The entry carries opaque identifiers. A display name here would make the
  // Audit Log itself the disclosure the rest of the boundary prevents.
  await expect(auditLog).not.toContainText("Casey Nguyen");
  await expectNoSeriousAccessibilityViolations(page);
});

test("an Organization Manager reads only their own Organization's sponsored Students", async ({
  page,
}) => {
  // Sofía manages Nimbus Logistics, which sponsored Alex and only invited Casey.
  await actAs(page, DEMONSTRATION_USERS.sofia);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hola, Sofía Rivera" })).toBeVisible();
  await changeRole(page, "es", "ORGANIZATION_MANAGER");
  await openPlace(page, "es", "ORGANIZATION_REPORTS");

  await expect(
    page.getByRole("region", { name: "Asistencia y Progreso del Curso" }),
  ).toContainText(
    "Excluye las Listas de Clase, los Comentarios de Aprendizaje privados",
  );

  const sponsored = page.getByRole("region", { name: "Estudiantes patrocinados" });
  await expect(sponsored).toContainText("Alex Morgan");

  // An invitation is not a Sponsorship, and reporting access begins at
  // acceptance. Casey's pending invitation must therefore disclose nothing.
  await expect(sponsored).not.toContainText("Casey Nguyen");
  // Priya's corrected Attendance Record belongs to no Sponsorship at all.
  await expect(sponsored).not.toContainText("Priya Raman");

  // Sofía is also a Platform Administrator, and reporting authority resolves
  // marketplace-wide first rather than silently narrowing to one Organization.
  // So the Audit Log beside an Organization's report is the marketplace-wide
  // one — and it says so, in as many words. That disclosure is the assertion:
  // the boundary this journey defends is the report above, and an Audit Log
  // that quietly widened without telling the reader would undo it.
  await expect(
    page.getByRole("region", { name: "Registro de auditoría" }),
  ).toContainText("Estás leyendo el registro de auditoría de todo el mercado.");
  await expectNoSeriousAccessibilityViolations(page);
});

test("a manager of another Organization sees none of the first Organization's Students", async ({
  page,
}) => {
  // Alex manages Riverside Health, which sponsors nobody. Reading the same
  // place as a different manager is what proves the scope is the assigned
  // Organization and not simply "the reports place".
  await actAs(page, DEMONSTRATION_USERS.alex);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hello, Alex Morgan" })).toBeVisible();
  await changeRole(page, "en", "ORGANIZATION_MANAGER");
  await openPlace(page, "en", "ORGANIZATION_REPORTS");

  await expect(
    workspaceShell(page).getByText("Scope: Assigned Organization"),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Attendance and Course Progress" }),
  ).toContainText("0 attended, 0 no-show");

  const sponsored = page.getByRole("region", { name: "Sponsored Students" });
  await expect(sponsored).toContainText("No sponsored Students match this report.");

  // Alex is a sponsored Student of *Nimbus*. Managing Riverside must not
  // surface that Sponsorship, not even to the person who holds both roles.
  await expect(sponsored).not.toContainText("Alex Morgan");
  await expect(sponsored).not.toContainText("Sofía Rivera");
  await expectNoSeriousAccessibilityViolations(page);
});
