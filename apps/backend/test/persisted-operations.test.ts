import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  classifyOperationBudget,
  loadPersistedOperationManifest,
  persistedOperationId,
  persistedOperationManifest,
} from "../src/api/persisted-operations.js";
import { RELEASE_JOURNEY_OPERATIONS } from "../src/api/release-journey-operations.js";

const generatedManifest = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, "../../web/src/generated/persisted-documents.json"),
    "utf8",
  ),
) as Record<string, string>;

describe("the persisted GraphQL operation manifest", () => {
  it("reproduces the identifier the build stamped onto every client document", () => {
    // The browser sends the identifier codegen wrote into the document; the API
    // looks the same identifier up. If the two rules ever diverged, every
    // deployed operation would fail at once, so the rule is asserted rather
    // than assumed.
    for (const [id, document] of Object.entries(generatedManifest)) {
      expect(persistedOperationId(document)).toBe(id);
    }
  });

  it("serves the browser client's documents and the release journey's own", () => {
    const manifest = loadPersistedOperationManifest();

    for (const [id, document] of Object.entries(generatedManifest)) {
      expect(manifest.documentFor(id)).toBe(document);
    }
    for (const document of Object.values(RELEASE_JOURNEY_OPERATIONS)) {
      expect(manifest.documentFor(persistedOperationId(document))).toBe(document);
    }
  });

  it("knows nothing about a document the build did not produce", () => {
    const manifest = loadPersistedOperationManifest();

    expect(manifest.documentFor(persistedOperationId("query Probe { __typename }")))
      .toBeUndefined();
    expect(manifest.documentFor("sha256:not-an-identifier")).toBeUndefined();
  });

  it("fingerprints exactly the set of operations it holds", () => {
    const one = persistedOperationManifest({
      [persistedOperationId("query A { __typename }")]: "query A { __typename }",
    });
    const same = persistedOperationManifest({
      [persistedOperationId("query A { __typename }")]: "query A { __typename }",
    });
    const other = persistedOperationManifest({
      [persistedOperationId("query B { __typename }")]: "query B { __typename }",
    });

    expect(one.version).toBe(same.version);
    expect(one.version).not.toBe(other.version);
  });

  it("refuses a manifest whose identifier does not match its document", () => {
    // A manifest that can be edited without changing its identifiers would let
    // a known hash execute an unknown document.
    expect(() =>
      persistedOperationManifest({
        [persistedOperationId("query A { __typename }")]: "query B { __typename }",
      }),
    ).toThrow(/does not match/);
  });

  it("refuses a persisted entry holding more than one operation", () => {
    const document = "query A { __typename } query B { __typename }";

    expect(() =>
      persistedOperationManifest({ [persistedOperationId(document)]: document }),
    ).toThrow(/exactly one operation/);
  });
});

describe("charging an operation to the right budget", () => {
  it("charges a mutation as a mutation", () => {
    expect(classifyOperationBudget(RELEASE_JOURNEY_OPERATIONS.SmokeBook)).toBe("MUTATION");
  });

  it("leaves an ordinary read to the per-source request limit", () => {
    expect(classifyOperationBudget(RELEASE_JOURNEY_OPERATIONS.SmokeCredits)).toBe("QUERY");
  });

  it("charges a report or export read against the stricter reporting budget", () => {
    expect(classifyOperationBudget(RELEASE_JOURNEY_OPERATIONS.SmokeAudit)).toBe("REPORT");
    expect(
      classifyOperationBudget(
        "query R { marketplaceOperationalReport { __typename } }",
      ),
    ).toBe("REPORT");
  });

  it("charges requesting an export against the reporting budget, not the mutation budget", () => {
    // Queuing an export buys the same range scan that reading a report performs
    // inline, so the cheaper mutation allowance would be the wrong one.
    expect(
      classifyOperationBudget(
        "mutation E($input: RequestReportExportInput!) { requestReportExport(input: $input) { __typename } }",
      ),
    ).toBe("REPORT");
  });

  it("charges the named operation when a document carries several", () => {
    const document =
      "query Read { __typename } mutation Write { __typename }";

    expect(classifyOperationBudget(document, "Write")).toBe("MUTATION");
    expect(classifyOperationBudget(document, "Read")).toBe("QUERY");
  });

  it("never lets an unparseable document fall into the cheapest budget", () => {
    expect(classifyOperationBudget("{{{")).toBe("MUTATION");
  });
});
