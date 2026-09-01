import AxeBuilder from "@axe-core/playwright";
import { interfaceMessages, type InterfaceLocale } from "@marketplace/core";
import { expect, type Page } from "@playwright/test";
import { createIntl } from "react-intl";

import type { UserRole, WorkspacePlace } from "../../../src/generated/graphql.js";
import { workspacePlacePresentation } from "../../../src/student-workspace.js";

/**
 * The demonstration identities the role journeys act as, from the [canonical
 * fixture manifest](../../../../backend/src/fixtures/canonical-fixture-manifest.ts).
 *
 * The journeys name them rather than raw identifiers because which identity a
 * journey uses is the substance of the journey: only Priya holds a corrected
 * Attendance Record, only Casey lacks the Teacher Role Assignment that makes a
 * denial a denial, and Sofía and Alex manage *different* Organizations, which is
 * the whole privacy boundary.
 */
export const DEMONSTRATION_USERS = {
  /** Spanish interface. Every role; Teacher of every showcase Class Session; manages Nimbus Logistics. */
  sofia: "00000000-0000-4000-8000-000000000001",
  /** English interface. Every role; the sponsored Student of Nimbus; manages Riverside Health. */
  alex: "00000000-0000-4000-8000-000000000002",
  /** Has never chosen an Interface Locale or Display Time Zone. */
  jordan: "00000000-0000-4000-8000-000000000003",
  /** Student only, so every other workspace is a denial rather than an empty page. */
  casey: "00000000-0000-4000-8000-000000000004",
  /** Student only; holds the one Attendance Record corrected from Attended to No-show. */
  priya: "00000000-0000-4000-8000-000000000005",
} as const;

/**
 * The two identities that hold all four Role Assignments, one per Interface
 * Locale. Parametrizing a journey over this pair is what makes it an English
 * *and* Spanish scan without either language needing its own copy of the test.
 */
export const BILINGUAL_REVIEWERS = [
  { locale: "es", userId: DEMONSTRATION_USERS.sofia, displayName: "Sofía Rivera" },
  { locale: "en", userId: DEMONSTRATION_USERS.alex, displayName: "Alex Morgan" },
] as const satisfies ReadonlyArray<{
  locale: InterfaceLocale;
  userId: string;
  displayName: string;
}>;

/**
 * Reads a label out of the catalog the application renders from.
 *
 * Navigation is the right place for this and assertions are not. A test that
 * finds the "Availability" link through the catalog keeps working when the
 * wording changes, which is what you want from a step that is only trying to
 * get somewhere; a test that *asserts* through the catalog would pass whatever
 * the catalog said, which is not a test. Substantive assertions below therefore
 * spell out the words they expect.
 */
export function label(
  locale: InterfaceLocale,
  id: string,
  values: Record<string, string> = {},
) {
  return createIntl({ locale, messages: interfaceMessages[locale] }).formatMessage(
    { id },
    values,
  );
}

const roleLabelIds: Record<UserRole, string> = {
  STUDENT: "role.student",
  TEACHER: "role.teacher",
  ORGANIZATION_MANAGER: "role.organizationManager",
  PLATFORM_ADMINISTRATOR: "role.platformAdministrator",
};

/** Every place one role can reach, in the order its journey menu lists them. */
export function placesFor(role: UserRole) {
  return (Object.entries(workspacePlacePresentation) as Array<
    [WorkspacePlace, (typeof workspacePlacePresentation)[WorkspacePlace]]
  >).filter(([, presentation]) => presentation.role === role);
}

/**
 * Acts as one demonstration identity for the rest of the test.
 *
 * The browser build carries a single fake-authentication identity, so a journey
 * that needs a different one rewrites the header on the way out. This is the
 * `AUTH_MODE=fake` seam ADR 0037 keeps out of production entirely; nothing here
 * exists in a production build.
 */
export async function actAs(page: Page, userId: string) {
  // A journey that crosses identities — someone is refused, an administrator
  // then reads the Audit Entry it left — calls this twice. Removing the
  // previous handler first makes the second call unambiguously replace the
  // first rather than depend on which order Playwright consults them in.
  await page.unroute("**/graphql");
  await page.route("**/graphql", async (route) => {
    await route.continue({
      headers: { ...route.request().headers(), "x-demo-user-id": userId },
    });
  });
}

/**
 * Fails on any serious or critical accessibility finding on the current page.
 *
 * Serious and critical are the impacts that stop somebody: an unlabelled
 * control, a contrast failure, a trap. Moderate and minor findings are reported
 * by the same scan and left to the manual review, because acting on them
 * automatically is how a suite ends up asserting a rule's opinion rather than a
 * person's experience.
 */
export async function expectNoSeriousAccessibilityViolations(page: Page) {
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
}

/**
 * The workspace shell that carries the role control and the journey menu.
 *
 * It is a `complementary` rail on a wide viewport and a `banner` on a narrow
 * one, and only ever one of the two is rendered. Scoping to it matters because
 * "Acting role" is not a unique name on the page: the Audit Log filters by
 * acting role too, and an unscoped lookup finds both on the reports place.
 */
export function workspaceShell(page: Page) {
  return page.getByRole("complementary").or(page.getByRole("banner"));
}

/**
 * Changes the acting role the way a User does — explicitly, through the role
 * control — and waits for the change to take.
 *
 * What is asserted is the role, not the destination. A role returns to the
 * place it was last left in, and that memory lives on the server against the
 * User rather than in this browser session: a journey that asserted a landing
 * path would be asserting which test ran before it. Callers that care where
 * they are follow this with `openPlace`.
 */
export async function changeRole(
  page: Page,
  locale: InterfaceLocale,
  role: UserRole,
) {
  const actingRole = workspaceShell(page).getByRole("combobox", {
    name: label(locale, "workspace.actingRole"),
  });
  await actingRole.selectOption(role);
  await expect(actingRole).toHaveValue(role);
}

/** Follows one journey link inside the role already being acted as. */
export async function openPlace(
  page: Page,
  locale: InterfaceLocale,
  place: WorkspacePlace,
) {
  const presentation = workspacePlacePresentation[place];
  await workspaceShell(page)
    .getByRole("link", { name: label(locale, presentation.labelId), exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`${presentation.path}$`));
}

/**
 * Follows a deep link into a role and answers the guard that meets it.
 *
 * The guard is not an obstacle the test routes around: a link never changes
 * somebody's acting role on its own, so confirming it *is* the journey.
 */
export async function confirmDeepLink(
  page: Page,
  locale: InterfaceLocale,
  role: UserRole,
) {
  await page
    .getByRole("button", {
      name: label(locale, "workspace.deepLink.change", {
        role: label(locale, roleLabelIds[role]),
      }),
    })
    .click();
}
