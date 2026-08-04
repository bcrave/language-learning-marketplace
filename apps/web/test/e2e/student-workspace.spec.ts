import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ENGLISH_STUDENT_ID = "00000000-0000-4000-8000-000000000002";
const FIRST_USE_STUDENT_ID = "00000000-0000-4000-8000-000000000003";
const LIMITED_STUDENT_ID = "00000000-0000-4000-8000-000000000004";

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

test("a multi-role User switches explicitly and returns to each role's last place", async ({
  page,
}) => {
  await page.goto("/student");
  const actingRole = page.getByRole("combobox", { name: "Rol activo" });

  await actingRole.selectOption("TEACHER");
  await expect(page).toHaveURL(/\/teacher\/schedule$/);
  await page.getByRole("link", { name: "Disponibilidad" }).click();
  await expect(page).toHaveURL(/\/teacher\/availability$/);
  await expectNoSeriousAccessibilityViolations(page);

  await page.goto("/student");
  await expect(
    page.getByRole("heading", { name: "¿Cambiar al espacio de estudiante?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cambiar a estudiante" }).click();
  await expect(page).toHaveURL(/\/student\/discover$/);
  await page.getByRole("link", { name: "Mi aprendizaje" }).click();
  await expect(page).toHaveURL(/\/student\/learning$/);
  await page.getByRole("combobox", { name: "Rol activo" }).selectOption("TEACHER");
  await expect(page).toHaveURL(/\/teacher\/availability$/);
  await expect(
    page.getByRole("heading", { name: "Disponibilidad" }),
  ).toBeVisible();

  await page.goto("/student");
  await page.getByRole("button", { name: "Cambiar a estudiante" }).click();
  await expect(page).toHaveURL(/\/student\/learning$/);
  await page.getByRole("combobox", { name: "Rol activo" }).selectOption("TEACHER");
  await expect(page).toHaveURL(/\/teacher\/availability$/);

  await page
    .getByRole("combobox", { name: "Rol activo" })
    .selectOption("ORGANIZATION_MANAGER");
  await expect(
    page.getByRole("heading", { name: "Estudiantes patrocinados" }),
  ).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  await page.goto("/administration/operations");
  await expect(
    page.getByRole("heading", {
      name: "¿Cambiar al espacio de administración de la plataforma?",
    }),
  ).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  await page
    .getByRole("button", { name: "Volver a responsable de organización" })
    .click();
  await expect(page).toHaveURL(/\/organization\/students$/);

  await page.goto("/administration/operations");
  await page
    .getByRole("button", { name: "Cambiar a administración de la plataforma" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Operaciones del mercado" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Rol activo" }),
  ).toHaveValue("PLATFORM_ADMINISTRATOR");
  await expect(page).toHaveURL(/\/administration\/operations$/);
  await expectNoSeriousAccessibilityViolations(page);
});

test("each English acting-role workspace is accessible", async ({ page }) => {
  await page.route("**/graphql", async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        "x-demo-user-id": ENGLISH_STUDENT_ID,
      },
    });
  });
  await page.goto("/student");

  const actingRole = page.getByRole("combobox", { name: "Acting role" });
  for (const [role, heading] of [
    ["TEACHER", "Teaching schedule"],
    ["ORGANIZATION_MANAGER", "Sponsored Students"],
    ["PLATFORM_ADMINISTRATOR", "Marketplace operations"],
  ] as const) {
    await actingRole.selectOption(role);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expectNoSeriousAccessibilityViolations(page);
  }
});

test("a Platform Administrator opens the localized canonical curriculum", async ({ page }) => {
  await page.goto("/student");
  await page.getByRole("combobox", { name: "Rol activo" }).selectOption("PLATFORM_ADMINISTRATOR");

  await expect(page.getByRole("heading", { name: "Administración del currículo" })).toBeVisible();
  await expect(page.getByText("Currículo de muestra")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Everyday English Foundations" })).toBeVisible();
  await expect(page.getByText("Conversación cotidiana").first()).toBeVisible();
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
  await expect(
    page.getByRole("heading", { name: "Horario docente" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => window.sessionStorage.getItem("marketplace.actingRole")),
  ).toBe("TEACHER");
});

test("an unassigned deep-link role is denied and keeps the current role", async ({
  page,
}) => {
  await page.route("**/graphql", async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        "x-demo-user-id": LIMITED_STUDENT_ID,
      },
    });
  });
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hello, Casey Nguyen" })).toBeVisible();

  await page.goto("/teacher/schedule");
  await page.getByRole("button", { name: "Change to Teacher" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "We couldn't open your workspace",
  );
  expect(
    await page.evaluate(() => window.sessionStorage.getItem("marketplace.actingRole")),
  ).toBe("STUDENT");
  await page.getByRole("button", { name: "Return safely" }).click();
  await expect(page).toHaveURL(/\/student\/discover$/);
});

test.describe("mobile role navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("uses a journey drawer and compact bottom navigation", async ({ page }) => {
    await page.goto("/student");

    await expect(page.getByText("Menú de recorridos")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Menú de recorridos" }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Descubrir sesiones de clase" })
      .click();
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

  test("a Student consents to suggestions that survive a new session", async ({ page }) => {
    await page.route("**/graphql", async (route) => {
      await route.continue({
        headers: {
          ...route.request().headers(),
          "x-demo-user-id": FIRST_USE_STUDENT_ID,
        },
      });
    });
    await page.goto("/student");

    await expect(
      page.getByRole("heading", { name: "Elige tus preferencias" }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Zona horaria de visualización" }),
    ).toHaveValue("Europe/Madrid");
    await page
      .getByRole("combobox", { name: "Idioma de la interfaz" })
      .selectOption("en");
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
