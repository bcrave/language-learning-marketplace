import { expect, test } from "@playwright/test";

import {
  actAs,
  changeRole,
  DEMONSTRATION_USERS,
  expectNoSeriousAccessibilityViolations,
  openPlace,
} from "./support/journeys.js";

/**
 * The Report Export journey.
 *
 * What a browser can prove here is the half a resolver test cannot: that a
 * requester is told what an extract contains before asking for one, that the
 * two refusals arrive as announced text rather than a silent no-op, and that
 * the one-at-a-time rule is visible rather than merely enforced. Generation
 * itself belongs to the worker, which this suite does not run, so an export
 * stops at Queued here and its completed, downloadable, and expired
 * presentations are covered where they can be driven — the component tests.
 */

test("a Platform Administrator is told what an extract carries, refused twice, and queued once", async ({
  page,
}) => {
  await actAs(page, DEMONSTRATION_USERS.alex);
  await page.goto("/student");
  await expect(page.getByRole("heading", { name: "Hello, Alex Morgan" })).toBeVisible();
  await changeRole(page, "en", "PLATFORM_ADMINISTRATOR");
  await openPlace(page, "en", "ADMINISTRATION_REPORTS");

  const exports = page.getByRole("region", { name: "Report Exports" });
  await expect(exports).toContainText(
    "An export captures the reporting facts in force when generation starts.",
  );
  await expect(exports).toContainText(
    "Every schema excludes email and authentication identifiers",
  );
  await expect(exports).toContainText("You have no Report Exports.");

  // The request form shares its "From" and "To" wording with the marketplace
  // report on the same place, so the fieldset is what disambiguates them.
  const request = exports.getByRole("group", { name: "Request an export" });

  // A range that ends before it starts is refused rather than quietly swapped,
  // and refusing changes nothing — the list stays empty for the next step.
  await request.getByLabel("From").fill("2026-06-30");
  await request.getByLabel("To").fill("2026-01-01");
  await request.getByRole("button", { name: "Request export" }).click();
  await expect(exports.getByRole("alert")).toContainText(
    "Choose a range of at most 12 months that starts on or before it ends.",
  );
  await expect(exports).toContainText("You have no Report Exports.");
  await expectNoSeriousAccessibilityViolations(page);

  // The correction-history extract is authorized separately from ordinary
  // reporting. Marketplace-wide authority is what carries it here; an
  // Organization Manager would get their own Organization's revisions and
  // nobody else's. It is also a different schema, which is the point of
  // separating them — prior values never appear in the ordinary extract.
  await request.getByLabel("Extract").selectOption("CORRECTION_HISTORY");
  await request.getByLabel("From").fill("2026-01-01");
  await request.getByLabel("To").fill("2026-06-30");
  await request.getByRole("button", { name: "Request export" }).click();
  await expect(exports.getByRole("status")).toContainText(
    "Export queued. It appears below when it is ready.",
  );
  await expect(exports).toContainText("Queued: waiting for a worker.");
  await expect(exports).toContainText("Schema correction_history.v1");
  await expect(exports).toContainText(
    "Correction history for Jan 1, 2026 through Jul 1, 2026 (exclusive)",
  );

  // One export runs at a time, and the second request says so instead of
  // stacking work nobody asked to pay for.
  await request.getByRole("button", { name: "Request export" }).click();
  await expect(exports.getByRole("alert")).toContainText(
    "One Report Export runs at a time. Wait for the current one to finish.",
  );
  await expectNoSeriousAccessibilityViolations(page);
});
