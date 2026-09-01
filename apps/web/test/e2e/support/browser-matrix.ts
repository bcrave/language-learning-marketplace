/**
 * The browser matrix the demonstration claims to support.
 *
 * The Playwright projects and the [public accessibility
 * statement](../../../../../docs/accessibility-statement.md) both read it, and
 * a test fails if they disagree: a statement naming a combination nothing
 * exercised is a claim about someone else's assistive technology.
 *
 * Each entry names an engine rather than a product, because that is what was
 * exercised — not one version on one operating system.
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
