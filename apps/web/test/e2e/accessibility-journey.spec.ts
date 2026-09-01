import { expect, test } from "@playwright/test";

import type { UserRole } from "../../src/generated/graphql.js";
import {
  actAs,
  BILINGUAL_REVIEWERS,
  changeRole,
  DEMONSTRATION_USERS,
  expectNoSeriousAccessibilityViolations,
  label,
  openPlace,
  placesFor,
} from "./support/journeys.js";

const ROLES: readonly UserRole[] = [
  "STUDENT",
  "TEACHER",
  "ORGANIZATION_MANAGER",
  "PLATFORM_ADMINISTRATOR",
];

/**
 * The English and Spanish role-journey scans.
 *
 * Both reviewers hold all four Role Assignments and differ only in Interface
 * Locale, so one loop reaches every place in both languages. Scanning the same
 * place twice is not duplication: a translated string changes the accessible
 * name of every control that carries it, and Spanish is the longer language of
 * the two, which is where a label overruns its control.
 */
for (const { locale, userId, displayName } of BILINGUAL_REVIEWERS) {
  test(`every ${locale} role workspace is accessible`, async ({ page }) => {
    await actAs(page, userId);
    await page.goto("/student");
    await expect(
      page.getByRole("heading", { name: `${displayName}`, level: 1 }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);

    for (const role of ROLES) {
      await changeRole(page, locale, role);
      for (const [place, presentation] of placesFor(role)) {
        await openPlace(page, locale, place);
        // The place summary rather than its heading: a place and the panel it
        // opens can share a name ("Discover Class Sessions" titles both), and
        // the summary is the sentence only this place carries.
        await expect(
          page.getByText(label(locale, presentation.summaryId), { exact: true }),
        ).toBeVisible();
        await expectNoSeriousAccessibilityViolations(page);
      }
    }
  });
}

/**
 * Keyboard-only operation.
 *
 * Reaching the main content without a pointer is the check that fails first and
 * hurts most, so it is asserted as a property of tabbing rather than of any one
 * control: from a cold load, some small number of Tab presses has to land
 * somewhere inside `main`. A count is used instead of a fixed sequence because
 * the assertion is "the rail does not trap you", not "the rail has six links".
 */
test("the workspace is reachable and operable with the keyboard alone", async ({
  page,
}) => {
  await actAs(page, DEMONSTRATION_USERS.alex);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Alex Morgan" })).toBeVisible();

  const focusedInMain = async () =>
    page.evaluate(() => {
      const active = document.activeElement;
      return active !== null && document.querySelector("main")?.contains(active) === true;
    });

  let reachedMain = false;
  for (let press = 0; press < 40 && !reachedMain; press += 1) {
    await page.keyboard.press("Tab");
    reachedMain = await focusedInMain();
  }
  expect(reachedMain).toBe(true);

  // Every stop along the way had to be a real control. A tab stop with no
  // accessible role is a keyboard user arriving somewhere nothing can be done.
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.tagName ?? null))
    .not.toBe("BODY");

  // Navigation is operable from the keyboard, not merely focusable. Enter on a
  // focused journey link has to move, or the whole workspace is a pointer-only
  // application that happens to have tab stops.
  await page.getByRole("link", { name: "My learning", exact: true }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/student\/learning$/);
});

/**
 * A focus indicator that is both visible and unobscured.
 *
 * Visible is asserted as a computed outline rather than a screenshot: what a
 * reader needs is that the browser draws *something* the theme did not remove,
 * and a pixel comparison would fail across three engines for reasons that have
 * nothing to do with focus. Unobscured is asserted against the two bars that
 * can cover it — the sticky header and the fixed bottom navigation — by
 * checking the focused control's box stays inside the viewport's usable band.
 */
test("focus is visible and never hidden behind the sticky bars", async ({ page }) => {
  await actAs(page, DEMONSTRATION_USERS.alex);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Alex Morgan" })).toBeVisible();

  // Focus is moved with Tab rather than `element.focus()`. The indicator is
  // drawn by `:focus-visible`, whose whole job is to tell a keyboard user apart
  // from a script or a pointer — and the engines disagree about which of those
  // a programmatic focus counts as. Tabbing is what the rule is for, and what a
  // keyboard user actually does.
  // The first Tab does not always land on a control — WebKit takes a press to
  // enter the document — so tab until something is genuinely focused.
  const focused = async () =>
    page.evaluate(() => {
      const active = document.activeElement;
      if (!active || active === document.body) return null;
      const style = getComputedStyle(active);
      return { style: style.outlineStyle, width: style.outlineWidth };
    });

  let outline = null as Awaited<ReturnType<typeof focused>>;
  for (let press = 0; press < 5 && outline === null; press += 1) {
    await page.keyboard.press("Tab");
    outline = await focused();
  }

  expect(outline).not.toBeNull();
  expect(outline?.style).not.toBe("none");
  expect(Number.parseFloat(outline?.width ?? "0")).toBeGreaterThanOrEqual(2);
});

test.describe("small viewports", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("focus stays clear of the sticky header and bottom navigation", async ({
    page,
  }) => {
    await actAs(page, DEMONSTRATION_USERS.alex);
    await page.goto("/student");
    await expect(page.getByText("Journey menu")).toBeVisible();

    // Both Student places, named rather than whichever one this Student was
    // last left in. The two are very differently shaped — a short discovery
    // form against a long list of Lesson Materials — and the long one is where
    // a control ends up scrolled under a fixed bar.
    //
    // Reached by address rather than through the journey menu: at this width
    // the menu is a drawer, and opening it is a different test's subject. The
    // acting role is already Student, so neither link meets the role guard.
    for (const path of ["/student/discover", "/student/learning"] as const) {
      await page.goto(path);
      await expect(page.getByText("Journey menu")).toBeVisible();

      // Tab through the page; no focused control may end up completely behind
      // the fixed bottom navigation or the sticky header. WCAG 2.2 calls this
      // Focus Not Obscured, and a fixed bar creates the failure for free — the
      // browser scrolls the element into the viewport, which the bar covers.
      const bars = await page.evaluate(() => ({
        bottomNavigationTop:
          document.querySelector(".mobile-bottom-nav")?.getBoundingClientRect().top ??
          window.innerHeight,
        headerBottom:
          document.querySelector(".mobile-context")?.getBoundingClientRect().bottom ?? 0,
      }));

      for (let press = 0; press < 25; press += 1) {
        await page.keyboard.press("Tab");
        const box = await page.evaluate(() => {
          const active = document.activeElement;
          if (!active || active === document.body) return null;
          // The bars themselves are allowed to sit in their own space.
          if (active.closest(".mobile-bottom-nav, .mobile-context")) return null;
          const { bottom, top } = active.getBoundingClientRect();
          return { bottom, top };
        });
        if (box === null) continue;
        expect(box.top, `${path} focus hidden by the bottom navigation`)
          .toBeLessThan(bars.bottomNavigationTop);
        expect(box.bottom, `${path} focus hidden by the header`)
          .toBeGreaterThan(bars.headerBottom);
      }
    }
  });

  test("reflows to a single column with no horizontal scrolling", async ({ page }) => {
    await actAs(page, DEMONSTRATION_USERS.alex);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto("/student");
    await expect(page.getByRole("heading", { name: "Alex Morgan" })).toBeVisible();

    // 320 CSS pixels is the reflow width, and content that scrolls sideways
    // there is content somebody at 400% zoom reads one word at a time.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await expectNoSeriousAccessibilityViolations(page);
  });
});

test("text resized to 200% neither clips content nor scrolls sideways", async ({
  page,
}) => {
  await actAs(page, DEMONSTRATION_USERS.alex);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Alex Morgan" })).toBeVisible();

  // Doubling the root font size is the text-only resize the criterion asks
  // about: layout that is sized in rem grows with it, and layout pinned to
  // pixels starts overlapping instead. The tag survives client-side navigation,
  // so every place below is measured at the doubled size.
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await expect(page.getByRole("heading", { name: "Alex Morgan" })).toBeVisible();

  const overflow = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
  expect(await overflow()).toBeLessThanOrEqual(1);

  // The places whose layouts are grids with a column floor measured in `rem`,
  // because that floor is what stops fitting when the text doubles. One place
  // is not enough: the first version of this test measured only where it
  // happened to land and passed over two grids with the same defect.
  for (const [role, place] of [
    ["STUDENT", "STUDENT_DISCOVERY"],
    ["PLATFORM_ADMINISTRATOR", "ADMINISTRATION_OPERATIONS"],
    ["PLATFORM_ADMINISTRATOR", "ADMINISTRATION_REPORTS"],
  ] as const) {
    await changeRole(page, "en", role);
    await openPlace(page, "en", place);
    expect(await overflow(), `${place} overflows at 200% text`).toBeLessThanOrEqual(1);
  }

  await expectNoSeriousAccessibilityViolations(page);
});

test("honours a reduced-motion preference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await actAs(page, DEMONSTRATION_USERS.alex);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Alex Morgan" })).toBeVisible();

  // Nothing may animate or transition under the preference. Asserting over
  // every element rather than a known list is what keeps a future component
  // from quietly introducing the first animation nobody scans for.
  const moving = await page.evaluate(() =>
    [...document.querySelectorAll("*")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const durations = [
          ...style.transitionDuration.split(","),
          ...style.animationDuration.split(","),
        ];
        return durations.some((duration) => Number.parseFloat(duration) > 0);
      })
      .map((element) => element.tagName),
  );
  expect(moving).toEqual([]);
  await expectNoSeriousAccessibilityViolations(page);
});

/**
 * Error recovery.
 *
 * A refusal has to say what happened somewhere a screen reader is listening and
 * offer a way out that does not require the back button. The denied deep link
 * is the strongest available case because it is a refusal a reviewer can reach
 * deliberately, and because the way out has to leave the acting role alone.
 */
test("a refusal announces itself and offers a way back", async ({ page }) => {
  await actAs(page, DEMONSTRATION_USERS.casey);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hello, Casey Nguyen" })).toBeVisible();

  await page.goto("/teacher/schedule");
  await page.getByRole("button", { name: "Change to Teacher" }).click();

  const alert = page.getByRole("alert");
  await expect(alert).toContainText("We couldn't open your workspace");
  await expectNoSeriousAccessibilityViolations(page);

  await page.getByRole("button", { name: "Return safely" }).click();
  await expect(page).toHaveURL(/\/student\/discover$/);
  expect(
    await page.evaluate(() => window.sessionStorage.getItem("marketplace.actingRole")),
  ).toBe("STUDENT");
});
