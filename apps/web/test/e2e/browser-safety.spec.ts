import { expect, test } from "@playwright/test";

import { actAs, changeRole, DEMONSTRATION_USERS, openPlace } from "./support/journeys.js";

/**
 * The two browser-safety claims the Security Release Gate maps to this suite.
 *
 * The gate's verification catalog says the role journeys prove that tokens
 * reach no persistent browser storage or URL, and that external links gain no
 * opener control. Those were claims about a browser, and only a browser can
 * check them — so they are asserted here, in the suite the catalog names,
 * rather than asserted nowhere and recorded as passing anyway.
 *
 * The local journeys authenticate through the fake authenticator of ADR 0037,
 * so no real access token exists to leak. That does not make the assertion
 * empty: what it guards is the client's own habit. ADR 0027 keeps tokens in
 * memory through `cacheLocation: "memory"`, and the failure this catches is
 * somebody later persisting a credential-shaped value into web storage or a
 * query string — which would look identical here whether the value came from
 * Auth0 or from anywhere else.
 */

/** A JWT, a bearer header, or anything else shaped like a credential. */
const CREDENTIAL_SHAPED = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|bearer\s+\S{20,}/i;

test("keeps nothing credential-shaped in web storage or the address bar", async ({ page }) => {
  await actAs(page, DEMONSTRATION_USERS.casey);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hello, Casey Nguyen" })).toBeVisible();
  await openPlace(page, "en", "STUDENT_LEARNING");

  const stored = await page.evaluate(() => {
    const read = (store: Storage) =>
      Object.keys(store).map((key) => `${key}=${store.getItem(key) ?? ""}`);
    return [...read(window.localStorage), ...read(window.sessionStorage)].join("\n");
  });

  expect(stored).not.toMatch(CREDENTIAL_SHAPED);
  expect(page.url()).not.toMatch(CREDENTIAL_SHAPED);
  // The saved acting role and remembered places are the only things the client
  // is meant to keep, and they are preferences rather than credentials.
  expect(await page.evaluate(() => Object.keys(window.localStorage))).toEqual([]);
});

test("gives every external link no opener and no referrer", async ({ page }) => {
  // The administration curriculum rather than a Student's or a Teacher's view:
  // it lists every Lesson Unit's materials, so the manifest's HTTPS references
  // are reachable without depending on who has completed what. A view scoped by
  // relationship would make this suite pass or fail on whichever journey ran
  // before it and left the fixtures somewhere else.
  await actAs(page, DEMONSTRATION_USERS.sofia);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hola, Sofía Rivera" })).toBeVisible();
  await changeRole(page, "es", "PLATFORM_ADMINISTRATOR");
  await openPlace(page, "es", "ADMINISTRATION_OPERATIONS");

  const curriculum = page.getByRole("region", { name: "Administración del currículo" });
  await expect(
    curriculum.getByRole("heading", { name: "Everyday English Foundations" }),
  ).toBeVisible();

  // Collapsed inside `<details>`, which is exactly where an unsafe `rel` would
  // hide from a reader while remaining one click from a reviewer's browser.
  const external = curriculum.locator('a[href^="https://"]:not([href*="localhost"])');
  const links = await external.count();
  // A check that silently found no link would pass every run while proving
  // nothing, so finding none is itself the failure: the Lesson Material HTTPS
  // references are exactly what this suite exists to inspect.
  expect(links).toBeGreaterThan(0);

  for (let index = 0; index < links; index += 1) {
    const rel = (await external.nth(index).getAttribute("rel")) ?? "";
    // `noopener` is what stops the opened tab reaching back through
    // `window.opener`; `noreferrer` is what stops it learning where the
    // reviewer came from. The threat model asks for both.
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
  }
});
