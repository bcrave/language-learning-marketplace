import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ENGLISH_STUDENT_ID = "00000000-0000-4000-8000-000000000002";

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter(({ impact }) =>
      impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
}

test("a local Student opens the persisted workspace", async ({ page, request }) => {
  await expect((await request.get("http://127.0.0.1:4000/health/live")).status()).toBe(
    200,
  );
  await expect((await request.get("http://127.0.0.1:4000/health/ready")).status()).toBe(
    200,
  );
  await page.goto("/student");

  await expect(
    page.getByRole("heading", { name: "Hola, Sofía Rivera" }),
  ).toBeVisible();
  await expect(page.getByText("Zona horaria: America/Denver")).toBeVisible();

  await expectNoSeriousAccessibilityViolations(page);
});

test("the English Student journey is localized and accessible", async ({ page }) => {
  await page.route("**/graphql", async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        "x-demo-user-id": ENGLISH_STUDENT_ID,
      },
    });
  });
  await page.goto("/student");

  await expect(page.getByRole("heading", { name: "Hello, Alex Morgan" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expectNoSeriousAccessibilityViolations(page);
});
