/**
 * The browser matrix the demonstration claims to support.
 *
 * It lives in one place because two very different things have to agree about
 * it: the Playwright projects that actually run the role journeys, and the
 * [public accessibility statement](../../../../../docs/accessibility-statement.md),
 * which tells a reader which combinations were tested. A statement naming a
 * combination nothing exercised is the failure mode worth engineering against —
 * it is a claim about someone else's assistive technology — so the statement is
 * checked against this list rather than maintained beside it.
 *
 * Each entry names an engine, not a product. Exercising Chromium is evidence
 * about Chrome and Edge because they share an engine; it is not evidence about
 * one version on one operating system, and `testedCombination` is worded so the
 * statement cannot imply otherwise.
 */
export interface SupportedBrowser {
  /**
   * The Playwright project name. It is also the browser `playwright install`
   * receives and the CI matrix entry, so the three cannot drift apart.
   */
  readonly project: "chromium" | "firefox" | "webkit";
  /** The Playwright device descriptor the project runs as. */
  readonly device: "Desktop Chrome" | "Desktop Firefox" | "Desktop Safari";
  /** Exactly how the public accessibility statement names this combination. */
  readonly testedCombination: string;
}

export const SUPPORTED_BROWSERS: readonly SupportedBrowser[] = [
  {
    project: "chromium",
    device: "Desktop Chrome",
    testedCombination:
      "Chromium engine, as shipped by Google Chrome and Microsoft Edge on macOS and Windows",
  },
  {
    project: "firefox",
    device: "Desktop Firefox",
    testedCombination:
      "Gecko engine, as shipped by Mozilla Firefox on macOS and Windows",
  },
  {
    project: "webkit",
    device: "Desktop Safari",
    testedCombination: "WebKit engine, as shipped by Safari on macOS and iOS",
  },
];
