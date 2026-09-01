import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { INCIDENT_FAMILIES } from "../src/observability/alert-policy.js";
import {
  buildSecurityGateRecord,
  renderSecurityGateRecord,
  requiredForScope,
  securityGateFindings,
  securityGateReadinessExercises,
  securityResultsFromRecoveryDrills,
  type SecurityCheckResult,
  type SecurityGateCandidate,
} from "../src/operations/security-gate.js";
import {
  ACCEPTED_RESIDUAL_RISKS,
  SECURITY_ABUSE_FAMILIES,
  SECURITY_GATE_READINESS_EVIDENCE,
  SECURITY_GATE_SUITES,
  SECURITY_TRUST_BOUNDARIES,
  SECURITY_VERIFICATION_CATALOG,
} from "../src/operations/security-verification-catalog.js";
import type { ReadinessExercise } from "../src/operations/readiness-evidence.js";

/**
 * Credential-shaped fixtures, assembled at runtime from fragments, for the same
 * reason the readiness suite does it: proving the evidence boundary refuses a
 * credential requires something that looks like one, and a contiguous
 * credential literal in a source file is exactly what a secret scanner exists
 * to flag. The shape exists at runtime and never in the file. None is real.
 */
const shaped = (...parts: readonly string[]) => parts.join("");
const SIGNED_TOKEN = shaped("eyJ", "x".repeat(12), ".", "y".repeat(12), ".", "z".repeat(12));
const SOURCE_ADDRESS = "203.0.113.9";

const RELEASE = "883d064";
const EVIDENCE = "https://github.com/bcrave/language-learning-marketplace/actions/runs/9";
const OBSERVED_AT = new Date("2026-09-01T09:00:00.000Z");
const GENERATED_AT = new Date("2026-09-01T10:00:00.000Z");

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function candidate(overrides: Partial<SecurityGateCandidate> = {}): SecurityGateCandidate {
  return {
    release: RELEASE,
    schemaVersion: "0036_security_gate_results.sql",
    fixtureManifestVersion: "synthetic-curriculum.v1",
    persistedOperationManifestVersion: "persisted.v4",
    cspPolicyFingerprint: "0f1e2d3c4b5a6978",
    configurationFingerprints: { "Threat model": "8f1c2d3e4a5b6c7d" },
    scope: "PUBLIC_LAUNCH",
    changedBoundaries: [],
    notRepeated: {},
    evidenceLink: EVIDENCE,
    generatedAt: GENERATED_AT,
    projectOwnerSignOff: "Project Owner",
    ...overrides,
  };
}

function result(
  check: string,
  overrides: Partial<SecurityCheckResult> = {},
): SecurityCheckResult {
  const catalogued = SECURITY_VERIFICATION_CATALOG.find((entry) => entry.id === check);
  const signed = catalogued?.evidence === "OWNER" || catalogued?.evidence === "DRILL";
  return {
    check,
    release: RELEASE,
    evidenceKind: catalogued?.evidence ?? "SUITE",
    outcome: "PASSED",
    observedAt: OBSERVED_AT,
    evidenceLink: EVIDENCE,
    observation: `${check} produced its required evidence`,
    residualRisk: null,
    correlationId: "security-gate-1",
    signedOffBy: signed ? "Project Owner" : null,
    signedOffAt: signed ? OBSERVED_AT : null,
    ...overrides,
  };
}

/** Every catalog check passing, which is the only shape that clears the gate. */
function fullyEvidenced(): SecurityCheckResult[] {
  return SECURITY_VERIFICATION_CATALOG.map((check) => result(check.id));
}

function findingsFor(
  results: readonly SecurityCheckResult[],
  overrides: Partial<SecurityGateCandidate> = {},
) {
  return securityGateFindings(
    buildSecurityGateRecord({ candidate: candidate(overrides), results }),
  );
}

describe("the security verification catalog", () => {
  it("covers every abuse family the threat model requires evidence of", () => {
    const covered = new Set(SECURITY_VERIFICATION_CATALOG.map((check) => check.family));
    expect([...Object.keys(SECURITY_ABUSE_FAMILIES)].filter((family) => !covered.has(family as never)))
      .toEqual([]);
  });

  it("gives every check a unique identifier, a known family, and a rerun boundary", () => {
    const ids = SECURITY_VERIFICATION_CATALOG.map((check) => check.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const check of SECURITY_VERIFICATION_CATALOG) {
      expect(Object.keys(SECURITY_ABUSE_FAMILIES)).toContain(check.family);
      // A check mapped to no boundary would never be rerun after a change, and
      // uncertain classification is supposed to fail closed.
      expect(check.boundaries.length).toBeGreaterThan(0);
      for (const boundary of check.boundaries) {
        expect(Object.keys(SECURITY_TRUST_BOUNDARIES)).toContain(boundary);
      }
      expect(check.statement.length).toBeGreaterThan(20);
    }
  });

  it("names a suite for exactly the automatically recorded checks", () => {
    for (const check of SECURITY_VERIFICATION_CATALOG) {
      if (check.evidence === "SUITE" || check.evidence === "DEPLOYED") {
        expect(Object.keys(SECURITY_GATE_SUITES)).toContain(check.suite);
      } else {
        // An owner-performed case or a drill has no suite to run it. Naming one
        // would let the gate record a pass for it from a job.
        expect(check.suite).toBeUndefined();
      }
    }
  });

  it("gives every suite at least one check to record", () => {
    for (const suite of Object.keys(SECURITY_GATE_SUITES)) {
      expect(SECURITY_VERIFICATION_CATALOG.some((check) => check.suite === suite)).toBe(true);
    }
  });

  it("accepts exactly the residual risks the threat model documents", () => {
    // The gate cannot invent an exception, so the list it will honour has to be
    // the list the threat model actually accepts. Counting the document's own
    // bullets catches a risk quietly added here to let a finding through.
    const threatModel = readFileSync(resolve(repositoryRoot, "docs/threat-model.md"), "utf8");
    const section = threatModel
      .split("## Accepted residual risks")[1]!
      .split("\n## ")[0]!;
    const documented = section.split("\n").filter((line) => line.startsWith("- "));
    expect(Object.keys(ACCEPTED_RESIDUAL_RISKS)).toHaveLength(documented.length);
  });

  it("evidences every incident family that the recovery drills do not own", () => {
    // Every family the readiness record has a row for is written by somebody:
    // this gate, or the two recovery drills. A family neither writes would
    // block every release for ever with nothing able to clear it.
    const drilled = "backups-and-recovery-verification";
    const unevidenced = Object.keys(INCIDENT_FAMILIES).filter(
      (family) =>
        family !== drilled
        && !(family in SECURITY_GATE_READINESS_EVIDENCE),
    );
    expect(unevidenced).toEqual([]);
    for (const [family, mapping] of Object.entries(SECURITY_GATE_READINESS_EVIDENCE)) {
      expect(Object.keys(INCIDENT_FAMILIES)).toContain(family);
      expect(mapping!.checks.length).toBeGreaterThan(0);
      for (const checkId of mapping!.checks) {
        expect(SECURITY_VERIFICATION_CATALOG.some((check) => check.id === checkId)).toBe(true);
      }
    }
    // The drills write this row themselves; a second writer could disagree.
    expect(SECURITY_GATE_READINESS_EVIDENCE["backups-and-recovery-verification"]).toBeUndefined();
  });
});

describe("the release rule", () => {
  it("clears a candidate whose every required check passed", () => {
    expect(findingsFor(fullyEvidenced())).toEqual([]);
  });

  it("blocks a record nobody signed", () => {
    const findings = findingsFor(fullyEvidenced(), { projectOwnerSignOff: null });
    expect(findings.map((finding) => finding.finding)).toEqual(["security.projectOwnerSignOff"]);
  });

  it("blocks a record that cannot say which policy the journeys ran against", () => {
    const findings = findingsFor(fullyEvidenced(), { cspPolicyFingerprint: null });
    expect(findings.map((finding) => finding.finding)).toEqual(["security.policyFingerprint"]);
  });

  it("blocks a check nobody ran exactly as it blocks one that failed", () => {
    const missing = fullyEvidenced().filter((entry) => entry.check !== "manual.replayAndRace");
    expect(findingsFor(missing)).toEqual([
      {
        finding: "security.checkRequired",
        check: "manual.replayAndRace",
        detail: "no result was recorded for this candidate",
      },
    ]);
  });

  it("blocks a check recorded as deliberately not run", () => {
    const results = fullyEvidenced().map((entry) =>
      entry.check === "csp.enforcedJourneys" ? { ...entry, outcome: "NOT_RUN" as const } : entry,
    );
    expect(findingsFor(results)).toEqual([
      {
        finding: "security.checkRequired",
        check: "csp.enforcedJourneys",
        detail: "the check was recorded as not run for this candidate",
      },
    ]);
  });

  it("cannot waive a failed required check", () => {
    const results = fullyEvidenced().map((entry) =>
      entry.check === "request.originAndCors" ? { ...entry, outcome: "FAILED" as const } : entry,
    );
    expect(findingsFor(results)).toEqual([
      { finding: "security.checkPassed", check: "request.originAndCors", detail: "the check failed" },
    ]);
  });

  it("lets a finding inside a documented residual risk proceed, once signed", () => {
    const results = fullyEvidenced().map((entry) =>
      entry.check === "manual.boundedFailureUnderLoad"
        ? {
          ...entry,
          outcome: "FAILED" as const,
          residualRisk: "residual.rateLimitEvasion",
          signedOffBy: "Project Owner",
          signedOffAt: OBSERVED_AT,
        }
        : entry,
    );

    const record = buildSecurityGateRecord({ candidate: candidate(), results });
    expect(securityGateFindings(record)).toEqual([]);
    expect(record.acceptedResidualRisks).toEqual([
      {
        risk: "residual.rateLimitEvasion",
        description: ACCEPTED_RESIDUAL_RISKS["residual.rateLimitEvasion"],
        checks: ["manual.boundedFailureUnderLoad"],
      },
    ]);
  });

  it("refuses a risk the threat model does not already accept", () => {
    const results = fullyEvidenced().map((entry) =>
      entry.check === "manual.boundedFailureUnderLoad"
        ? { ...entry, outcome: "FAILED" as const, residualRisk: "residual.weWillFixItLater" }
        : entry,
    );
    expect(findingsFor(results).map((finding) => finding.finding))
      .toEqual(["security.residualRiskAccepted"]);
  });

  it("refuses an accepted risk nobody dated", () => {
    const results = fullyEvidenced().map((entry) =>
      entry.check === "manual.boundedFailureUnderLoad"
        ? {
          ...entry,
          outcome: "FAILED" as const,
          residualRisk: "residual.rateLimitEvasion",
          signedOffBy: null,
          signedOffAt: null,
        }
        : entry,
    );
    // Both the waiver and the manual case's own sign-off are missing, and the
    // record says so twice rather than letting one stand in for the other.
    expect(findingsFor(results).map((finding) => finding.finding)).toEqual([
      "security.residualRiskAccepted",
      "security.resultSignedOff",
    ]);
  });

  it("refuses a residual risk claimed for something that did not fail", () => {
    const results = fullyEvidenced().map((entry) =>
      entry.check === "manual.boundedFailureUnderLoad"
        ? { ...entry, residualRisk: "residual.rateLimitEvasion" }
        : entry,
    );
    expect(findingsFor(results).map((finding) => finding.finding))
      .toEqual(["security.residualRiskAccepted"]);
  });

  it("blocks a result carried over from another release", () => {
    const results = fullyEvidenced().map((entry) =>
      entry.check === "smoke.student" ? { ...entry, release: "a0d9c74" } : entry,
    );
    expect(findingsFor(results)).toEqual([
      {
        finding: "security.candidateMatches",
        check: "smoke.student",
        detail: "the result was recorded against a different release",
      },
    ]);
  });

  it("blocks a manually performed check with no dated sign-off", () => {
    const results = fullyEvidenced().map((entry) =>
      entry.check === "configuration.auth0"
        ? { ...entry, signedOffBy: null, signedOffAt: null }
        : entry,
    );
    expect(findingsFor(results)).toEqual([
      {
        finding: "security.resultSignedOff",
        check: "configuration.auth0",
        detail: "the manually performed check carries no dated Project Owner sign-off",
      },
    ]);
  });

  it("blocks evidence that is not a private provider link", () => {
    const results = fullyEvidenced().map((entry) =>
      entry.check === "smoke.teacher"
        ? { ...entry, evidenceLink: "https://paste.example.test/dump" }
        : entry,
    );
    expect(findingsFor(results).map((finding) => finding.finding))
      .toEqual(["security.evidenceLinkPrivate"]);
  });

  it.each([
    ["a signed token", SIGNED_TOKEN],
    ["a source address", SOURCE_ADDRESS],
  ])("blocks an observation carrying %s", (_name, secret) => {
    const results = fullyEvidenced().map((entry) =>
      entry.check === "manual.browserLeakageInspection"
        ? { ...entry, observation: `the console showed ${secret}` }
        : entry,
    );
    expect(findingsFor(results).map((finding) => finding.finding))
      .toEqual(["security.evidenceSanitized"]);
  });

  it("names a result whose check this build no longer defines rather than losing it", () => {
    const results = [...fullyEvidenced(), result("manual.somethingRenamed")];
    const record = buildSecurityGateRecord({ candidate: candidate(), results });

    expect(record.unrecognisedResults.map((entry) => entry.check))
      .toEqual(["manual.somethingRenamed"]);
    expect(securityGateFindings(record)).toEqual([
      {
        finding: "security.checkRecognised",
        check: "manual.somethingRenamed",
        detail: "the result names a check this build's verification catalog does not define",
      },
    ]);
  });

  it("blocks a result claiming evidence the catalog does not give it", () => {
    const results = fullyEvidenced().map((entry) =>
      entry.check === "manual.copiedCredentials"
        ? { ...entry, evidenceKind: "SUITE" as const }
        : entry,
    );
    expect(findingsFor(results).map((finding) => finding.finding))
      .toEqual(["security.evidenceKindMatches"]);
  });

  it("blocks free text the record publishes verbatim", () => {
    // The sign-off and the not-repeated reasons are typed by a person and
    // rendered straight into the record, so they are scanned exactly as an
    // observation is.
    expect(
      findingsFor(fullyEvidenced(), {
        projectOwnerSignOff: `Project Owner ${SOURCE_ADDRESS}`,
      }).map((finding) => finding.finding),
    ).toEqual(["security.evidenceSanitized"]);

    expect(
      findingsFor(fullyEvidenced(), {
        notRepeated: { "manual.replayAndRace": `raised by ${SIGNED_TOKEN}` },
      }).map((finding) => finding.finding),
    ).toEqual(["security.evidenceSanitized"]);
  });

  it("blocks a check that answered differently twice on the same candidate", () => {
    const flaky = [
      ...fullyEvidenced(),
      result("smoke.student", {
        outcome: "FAILED",
        observedAt: new Date(OBSERVED_AT.getTime() - 60_000),
      }),
    ];
    expect(findingsFor(flaky)).toEqual([
      {
        finding: "security.resultStable",
        check: "smoke.student",
        detail: "1 earlier attempt(s) on this candidate disagreed with the result that stands",
      },
    ]);
  });
});

describe("the rerun scope after launch", () => {
  const CHANGE = {
    scope: "SECURITY_RELEVANT_CHANGE" as const,
    changedBoundaries: ["browser-to-auth0"] as const,
  };

  it("always requires the automated baseline", () => {
    for (const check of SECURITY_VERIFICATION_CATALOG) {
      if (check.evidence === "SUITE" || check.evidence === "DEPLOYED") {
        expect(requiredForScope(check, { ...CHANGE, changedBoundaries: [] })).toBe(true);
      }
    }
  });

  it("requires every check mapped to a boundary the change touched", () => {
    const auth0 = SECURITY_VERIFICATION_CATALOG.filter((check) =>
      check.boundaries.includes("browser-to-auth0"),
    );
    expect(auth0.length).toBeGreaterThan(0);
    for (const check of auth0) {
      expect(requiredForScope(check, CHANGE)).toBe(true);
    }
  });

  it("lets an unaffected check be carried forward with a stated reason", () => {
    const carried = fullyEvidenced().filter(
      (entry) => entry.check !== "manual.replayAndRace",
    );
    expect(
      findingsFor(carried, {
        ...CHANGE,
        notRepeated: {
          "manual.replayAndRace": "no change to Booking, Class Credit, or Audit paths",
        },
      }),
    ).toEqual([]);
  });

  it("blocks an unaffected check carried forward with no stated reason", () => {
    const carried = fullyEvidenced().filter(
      (entry) => entry.check !== "manual.replayAndRace",
    );
    expect(findingsFor(carried, CHANGE)).toEqual([
      {
        finding: "security.rerunScopeCovered",
        check: "manual.replayAndRace",
        detail: "the check was not repeated and the record states no reason",
      },
    ]);
  });

  it("names a public launch, not a boundary, when the complete gate is what required it", () => {
    const carried = fullyEvidenced().filter(
      (entry) => entry.check !== "manual.replayAndRace",
    );
    expect(
      findingsFor(carried, {
        notRepeated: { "manual.replayAndRace": "no change to Booking or Audit paths" },
      }),
    ).toEqual([
      {
        finding: "security.rerunScopeCovered",
        check: "manual.replayAndRace",
        detail: "a public launch runs the complete gate, so no check may be carried forward",
      },
    ]);
  });

  it("refuses to carry forward a check the change itself touched", () => {
    const carried = fullyEvidenced().filter(
      (entry) => entry.check !== "configuration.auth0",
    );
    expect(
      findingsFor(carried, {
        ...CHANGE,
        notRepeated: { "configuration.auth0": "the tenant was not touched" },
      }),
    ).toEqual([
      {
        finding: "security.rerunScopeCovered",
        check: "configuration.auth0",
        detail: "the check maps to a changed trust boundary and cannot be carried forward",
      },
    ]);
  });
});

describe("the recovery drills the gate reads rather than reruns", () => {
  function exercise(overrides: Partial<ReadinessExercise> = {}): ReadinessExercise {
    return {
      exercise: "backup-restoration-drill",
      family: "backups-and-recovery-verification",
      release: RELEASE,
      schemaVersion: "0036_security_gate_results.sql",
      fixtureManifestVersion: "synthetic-curriculum.v1",
      persistedOperationManifestVersion: "persisted.v4",
      testIdentifiers: ["drill.schemaCompatible", "drill.fixtureInvariants"],
      exercisedAt: OBSERVED_AT,
      measuredRecoveryMilliseconds: 900_000,
      result: "PASSED",
      evidenceLink: EVIDENCE,
      limitation: null,
      followUpOwner: null,
      correlationId: "recovery-drill-1",
      signedOffBy: "Project Owner",
      signedOffAt: OBSERVED_AT,
      ...overrides,
    };
  }

  it("reads a passing drill as its catalog check", () => {
    expect(securityResultsFromRecoveryDrills([exercise()], RELEASE)).toMatchObject([
      { check: "drill.backupRestoration", outcome: "PASSED", evidenceKind: "DRILL" },
    ]);
  });

  it("reads an inapplicable drill as evidence of nothing", () => {
    // NOT_APPLICABLE is an honest readiness row and is not a working recovery.
    expect(securityResultsFromRecoveryDrills([exercise({ result: "NOT_APPLICABLE" })], RELEASE))
      .toMatchObject([{ check: "drill.backupRestoration", outcome: "FAILED" }]);
  });

  it("carries no drill forward from another release", () => {
    expect(securityResultsFromRecoveryDrills([exercise({ release: "a0d9c74" })], RELEASE))
      .toEqual([]);
  });

  it("ignores readiness exercises that are not drills", () => {
    expect(
      securityResultsFromRecoveryDrills(
        [exercise({ exercise: "security-gate-cost-ceiling", family: "deployment-cost-ceiling" })],
        RELEASE,
      ),
    ).toEqual([]);
  });
});

describe("the readiness exercises the gate writes", () => {
  const evidence = { evidenceLink: EVIDENCE, correlationId: "security-gate-1" };

  it("passes a family only when every check that evidences it passed", () => {
    const record = buildSecurityGateRecord({ candidate: candidate(), results: fullyEvidenced() });
    const exercises = securityGateReadinessExercises(record, evidence);

    expect(exercises.map((exercise) => exercise.family).sort())
      .toEqual(Object.keys(SECURITY_GATE_READINESS_EVIDENCE).sort());
    expect(exercises.every((exercise) => exercise.result === "PASSED")).toBe(true);
    // Nothing here measured a recovery, and zero would read as an instant one.
    expect(exercises.every((exercise) => exercise.measuredRecoveryMilliseconds === null)).toBe(true);
  });

  it("fails the families a missing result leaves unproven", () => {
    const record = buildSecurityGateRecord({
      candidate: candidate(),
      results: fullyEvidenced().filter((entry) => entry.check !== "configuration.railway"),
    });

    const failed = securityGateReadinessExercises(record, evidence)
      .filter((exercise) => exercise.result === "FAILED")
      .map((exercise) => exercise.family);
    expect(failed).toEqual([
      "api-database-readiness",
      "worker-heartbeat-backlog-exhaustion",
      "canonical-rebuild-fixture-reconciliation",
    ]);
  });

  it("names only the checks that produced a result among its tests", () => {
    const record = buildSecurityGateRecord({
      candidate: candidate(),
      results: fullyEvidenced().filter((entry) => entry.check !== "configuration.costCeiling"),
    });

    const cost = securityGateReadinessExercises(record, evidence)
      .find((exercise) => exercise.family === "deployment-cost-ceiling");
    expect(cost).toMatchObject({ result: "FAILED", testIdentifiers: [] });
  });
});

describe("the rendered record", () => {
  it("says plainly whether the candidate may be released", () => {
    const cleared = renderSecurityGateRecord(
      buildSecurityGateRecord({ candidate: candidate(), results: fullyEvidenced() }),
    );
    expect(cleared).toContain("**Release rule: every required check passes");
    expect(cleared).toContain("None. Every required check passes for this exact candidate.");

    const blocked = renderSecurityGateRecord(
      buildSecurityGateRecord({ candidate: candidate({ projectOwnerSignOff: null }), results: [] }),
    );
    expect(blocked).toContain("**Release rule: BLOCKED by");
    expect(blocked).toContain("**NOT RECORDED**");
  });

  it("carries every catalog check, so a reader can see what was required", () => {
    const rendered = renderSecurityGateRecord(
      buildSecurityGateRecord({ candidate: candidate(), results: fullyEvidenced() }),
    );
    for (const check of SECURITY_VERIFICATION_CATALOG) {
      expect(rendered).toContain(check.id);
    }
  });

  it("keeps a typed observation inside its own table cell", () => {
    const results = fullyEvidenced().map((entry) =>
      entry.check === "manual.guessedPrivatePaths"
        ? { ...entry, observation: "every path\nrefused | nothing answered" }
        : entry,
    );
    const rendered = renderSecurityGateRecord(
      buildSecurityGateRecord({ candidate: candidate(), results }),
    );

    const row = rendered
      .split("\n")
      .find((line) => line.startsWith("| manual.guessedPrivatePaths |"))!;
    // One row, and the typed `|` is escaped rather than shifting every later
    // column and reattributing an outcome in the artifact the decision is read
    // from.
    expect(row).toContain("every path refused \\| nothing answered");
    expect(row.split(" | ")).toHaveLength(9);
  });
});
