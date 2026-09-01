import { expect, test } from "@playwright/test";

import {
  actAs,
  DEMONSTRATION_USERS,
  expectNoSeriousAccessibilityViolations,
  openPlace,
} from "./support/journeys.js";

/**
 * The Student journey.
 *
 * Three Students, three different first screens: the returning reviewer whose
 * preferences are saved, the English reviewer, and the one who has never chosen
 * anything and is asked before anything is stored.
 */

test("a local Student opens the persisted workspace behind healthy probes", async ({
  page,
  request,
}) => {
  await expect((await request.get("http://127.0.0.1:4000/health/live")).status()).toBe(
    200,
  );
  await expect((await request.get("http://127.0.0.1:4000/health/ready")).status()).toBe(
    200,
  );
  await page.goto("/student");

  await expect(page.getByRole("heading", { name: "Hola, Sofía Rivera" })).toBeVisible();
  await expect(page.getByText("Zona horaria: America/Denver")).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test("the English Student journey is localized and reaches learning", async ({ page }) => {
  await actAs(page, DEMONSTRATION_USERS.alex);
  await page.goto("/student");

  await expect(page.getByRole("heading", { name: "Hello, Alex Morgan" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  // `/student` resumes wherever this Student was last left, so the journey asks
  // for discovery rather than assuming it landed there.
  await openPlace(page, "en", "STUDENT_DISCOVERY");
  await expect(
    page.getByRole("region", { name: "Discover Class Sessions" }).first(),
  ).toBeVisible();

  await openPlace(page, "en", "STUDENT_LEARNING");
  await expect(page.getByRole("region", { name: "Course Progress" })).toBeVisible();
  await expect(page.getByRole("region", { name: "My Class Credits" })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

/**
 * The Student's own scheduling interaction, end to end.
 *
 * Discovery and learning can both be walked without changing anything, and a
 * Student journey that only navigates would prove the panels render rather than
 * that a Student can do the one thing they come here to do. Booking exchanges a
 * Class Credit and cancelling settles it, so this is also where the journey
 * touches a real authenticated mutation.
 *
 * Casey rather than the shared reviewers: Casey holds Class Credits and no
 * conflicting Booking, so a seat is genuinely available to take.
 */
test("a Student discovers, books, and cancels a Class Session", async ({ page }) => {
  await actAs(page, DEMONSTRATION_USERS.casey);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hello, Casey Nguyen" })).toBeVisible();
  await openPlace(page, "en", "STUDENT_DISCOVERY");

  const discovery = page
    .getByRole("region", { name: "Discover Class Sessions" })
    .last();
  await discovery.getByRole("combobox", { name: "Target language" }).selectOption("en");
  await discovery
    .getByRole("combobox", { name: "Curriculum Level" })
    .selectOption("A1");
  await discovery.getByRole("button", { name: "Search Class Sessions" }).click();

  // Only actionable Class Sessions are listed, so whatever comes back can be
  // booked — no need to reason about the Booking window from out here.
  const book = discovery.getByRole("button", { name: "Book Class Session" }).first();
  await expect(book).toBeVisible();
  await book.click();

  await expect(discovery.getByRole("status")).toContainText(
    "Booking confirmed. One Class Credit was exchanged.",
  );
  await expectNoSeriousAccessibilityViolations(page);

  // Cancelling settles the Class Credit either way — returned, or forfeited
  // under the late-cancellation rule if the Class Session is close enough. Which
  // one depends on the clock, so the journey asserts the settlement happened
  // rather than picking the branch the fixtures happen to land in today.
  const cancel = discovery.getByRole("button", { name: /Cancel Booking for/ }).first();
  await expect(cancel).toBeVisible();
  await cancel.click();
  await expect(discovery.getByRole("status")).toContainText(/Booking cancelled\./);
  await expectNoSeriousAccessibilityViolations(page);
});

test.describe("mobile role navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("uses a journey drawer and compact bottom navigation", async ({ page }) => {
    await page.goto("/student");

    await expect(page.getByText("Menú de recorridos")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Menú de recorridos" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Descubrir sesiones de clase" }).click();
    await expect(
      page.getByRole("link", { name: "Descubrir sesiones de clase" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("banner").getByText("Alcance: Tu propio aprendizaje"),
    ).toBeVisible();
    await expectNoSeriousAccessibilityViolations(page);
  });
});

test.describe("first-use browser suggestions", () => {
  test.use({ locale: "es-MX", timezoneId: "Europe/Madrid" });

  test("a Student consents to suggestions that survive a new session", async ({
    page,
  }) => {
    await actAs(page, DEMONSTRATION_USERS.jordan);
    await page.goto("/student");

    await expect(
      page.getByRole("heading", { name: "Elige tus preferencias" }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Zona horaria de visualización" }),
    ).toHaveValue("Europe/Madrid");
    await page.getByRole("combobox", { name: "Idioma de la interfaz" }).selectOption("en");
    await page
      .getByRole("combobox", { name: "Zona horaria de visualización" })
      .fill("America/Los_Angeles");
    await page.getByRole("button", { name: "Guardar preferencias" }).click();

    await expect(page.getByRole("heading", { name: "Hello, Jordan Lee" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Hello, Jordan Lee" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Interface language" })).toHaveValue(
      "en",
    );
    await expect(page.getByRole("combobox", { name: "Display time zone" })).toHaveValue(
      "America/Los_Angeles",
    );
    await expectNoSeriousAccessibilityViolations(page);
  });
});
