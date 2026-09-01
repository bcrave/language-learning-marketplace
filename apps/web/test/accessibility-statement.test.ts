import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SUPPORTED_BROWSERS } from "./e2e/support/browser-matrix.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const statement = readFileSync(
  resolve(repositoryRoot, "docs/accessibility-statement.md"),
  "utf8",
);
const review = readFileSync(
  resolve(repositoryRoot, "docs/accessibility-review.md"),
  "utf8",
);

/**
 * The cases the manual review has to carry, from the accepted slice.
 *
 * They are listed here rather than read out of the document because the
 * document is the thing under test: a checklist that defined its own
 * requirements could be satisfied by deleting a row.
 */
const REQUIRED_REVIEW_CASES = [
  "a11y.keyboardOnly",
  "a11y.voiceOverSafari",
  "a11y.focusVisible",
  "a11y.focusNotObscured",
  "a11y.contrast",
  "a11y.reducedMotion",
  "a11y.textResize",
  "a11y.reflow",
  "a11y.errorRecovery",
  "a11y.schedulingInteractions",
] as const;

/**
 * Wording that would turn a description of what was tested into a claim about
 * what somebody else will experience. The demonstration has had no audit and no
 * assistive-technology user testing, so none of these can be true of it, and a
 * public page saying otherwise is the failure this slice exists to prevent.
 */
const PROHIBITED_CLAIMS = [
  /\bcertified\b/i,
  /\bcertification of\b/i,
  /\bfully accessible\b/i,
  /\bfully conformant\b/i,
  /\bwcag[^.]{0,40}\bcompliant\b/i,
  /\bconforms to\b/i,
  /\baccessible to everyone\b/i,
];

describe("public accessibility statement", () => {
  it("carries a review date that has already happened", () => {
    const [, reviewed] = /\*\*Last reviewed: (\d{4}-\d{2}-\d{2})\.\*\*/.exec(statement) ?? [];
    expect(reviewed).toBeDefined();
    // A statement dated in the future describes a review nobody has done.
    expect(new Date(`${reviewed}T00:00:00Z`).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("names exactly the combinations the role journeys actually run against", () => {
    for (const { testedCombination } of SUPPORTED_BROWSERS) {
      expect(statement).toContain(testedCombination);
    }

    // And nothing else: a table row that no project backs is a claim about
    // somebody's browser that nothing in this repository can support.
    const tableRows = statement
      .split("\n")
      .filter((line) => line.includes("Automated role journeys and accessibility scans"));
    expect(tableRows).toHaveLength(SUPPORTED_BROWSERS.length);
  });

  it("claims neither certification nor universal conformance", () => {
    for (const claim of PROHIBITED_CLAIMS) {
      expect(statement).not.toMatch(claim);
    }
  });

  it("states known limitations and how to report a problem", () => {
    expect(statement).toContain("## Known limitations");
    expect(statement).toContain("## Reporting a problem");
    // "No known limitations" from a project with no audit would be a claim, not
    // an absence, so the section has to carry entries.
    const limitations = statement
      .split("## Known limitations")[1]
      ?.split("## Reporting a problem")[0]
      ?.split("\n")
      .filter((line) => line.startsWith("- ")) ?? [];
    expect(limitations.length).toBeGreaterThanOrEqual(3);
  });

  it("points at a manual review record that carries every required case", () => {
    expect(statement).toContain("accessibility-review.md");
    for (const reviewCase of REQUIRED_REVIEW_CASES) {
      expect(review).toContain(`\`${reviewCase}\``);
    }
  });

  /**
   * The claim and the evidence, held together.
   *
   * Listing the cases is not the same as running them, and the first version of
   * this file checked only the list — so an entirely empty record satisfied it
   * while the statement said the review "was performed". That is the exact
   * false claim the statement exists to avoid, and a public page is the worst
   * place to discover it. So the statement's wording is now tied to the
   * record's rows: until a row carries a result, the statement has to say the
   * manual cases are outstanding, and may not say any of them was performed.
   */
  it("does not claim a manual review nobody has performed", () => {
    const performed = review
      .split("\n")
      .filter((line) => /^\|\s*`a11y\./.test(line))
      .filter((line) => {
        // | case | asks | automated evidence | result | date | reviewer |
        const [, , , , result] = line.split("|").map((cell) => cell.trim());
        return result !== undefined && result !== "";
      });

    if (performed.length > 0) return;

    expect(statement).toMatch(/have not been performed yet/);
    expect(statement).toContain("No case has been performed yet.");
    expect(statement).not.toMatch(/manual review[^.]{0,40}was performed/i);
  });
});
