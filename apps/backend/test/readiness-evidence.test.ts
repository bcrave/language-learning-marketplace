import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { INCIDENT_FAMILIES, type IncidentFamily } from "../src/observability/alert-policy.js";
import {
  buildReadinessEvidenceRecord,
  isPrivateEvidenceLink,
  readinessEvidenceFindings,
  renderReadinessEvidence,
  type ReadinessCandidate,
  type ReadinessExercise,
} from "../src/operations/readiness-evidence.js";
import { absentWhenBlank } from "../src/operations/workflow-inputs.js";

const RELEASE = "9b8b961";
const SCHEMA = "0035_operational_readiness_exercises.sql";
const MANIFEST = "synthetic-curriculum.v1";
const SIGNED_AT = new Date("2026-08-30T09:00:00.000Z");

function candidate(overrides: Partial<ReadinessCandidate> = {}): ReadinessCandidate {
  return {
    release: RELEASE,
    schemaVersion: SCHEMA,
    fixtureManifestVersion: MANIFEST,
    persistedOperationManifestVersion: "persisted.v4",
    configurationFingerprints: { "Operator guide": "8f1c2d3e4a5b6c7d" },
    generatedAt: new Date("2026-08-30T10:00:00.000Z"),
    projectOwnerSignOff: "Project Owner",
    ...overrides,
  };
}

function exercise(
  family: IncidentFamily,
  overrides: Partial<ReadinessExercise> = {},
): ReadinessExercise {
  return {
    exercise: `${family}-exercise`,
    family,
    release: RELEASE,
    schemaVersion: SCHEMA,
    fixtureManifestVersion: MANIFEST,
    persistedOperationManifestVersion: "persisted.v4",
    testIdentifiers: ["drill.schemaCompatible"],
    exercisedAt: SIGNED_AT,
    measuredRecoveryMilliseconds: null,
    result: "PASSED",
    evidenceLink: "https://github.com/bcrave/language-learning-marketplace/actions/runs/1",
    limitation: null,
    followUpOwner: null,
    correlationId: `recovery-drill-${family}`,
    signedOffBy: "Project Owner",
    signedOffAt: SIGNED_AT,
    ...overrides,
  };
}

/** One passing exercise for every family: the only shape that releases. */
function completeCandidateEvidence(overrides: Partial<ReadinessExercise> = {}) {
  return (Object.keys(INCIDENT_FAMILIES) as IncidentFamily[]).map((family) =>
    exercise(family, overrides),
  );
}

const recordFor = (exercises: readonly ReadinessExercise[], owner?: Partial<ReadinessCandidate>) =>
  buildReadinessEvidenceRecord({ candidate: candidate(owner), exercises });

const checksIn = (exercises: readonly ReadinessExercise[], owner?: Partial<ReadinessCandidate>) =>
  readinessEvidenceFindings(recordFor(exercises, owner)).map((finding) => finding.check);

describe("the release rule", () => {
  it("clears a candidate every family has a signed, passing exercise for", () => {
    expect(readinessEvidenceFindings(recordFor(completeCandidateEvidence()))).toEqual([]);
  });

  it("blocks on a family nobody exercised, naming the family rather than a count", () => {
    const missing = completeCandidateEvidence().filter(
      (row) => row.family !== "backups-and-recovery-verification",
    );
    const findings = readinessEvidenceFindings(recordFor(missing));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      check: "readiness.familyExercised",
      family: "backups-and-recovery-verification",
    });
  });

  // A record assembled from a form would have no way to tell these apart. This
  // is the distinction that makes the record evidence rather than a checklist.
  it("blocks on a failed exercise exactly as it blocks on a missing one", () => {
    const failed = completeCandidateEvidence().map((row) =>
      row.family === "backups-and-recovery-verification" ? { ...row, result: "FAILED" as const } : row,
    );
    expect(checksIn(failed)).toEqual(["readiness.exercisePassed"]);
  });

  it("blocks an exercise that proved a different candidate", () => {
    for (const drifted of [
      { release: "0000000" },
      { schemaVersion: "0034_operational_alerting.sql" },
      { fixtureManifestVersion: "synthetic-curriculum.v0" },
    ]) {
      const evidence = completeCandidateEvidence().map((row) =>
        row.family === "deployment-and-deployed-smoke" ? { ...row, ...drifted } : row,
      );
      expect(checksIn(evidence)).toEqual(["readiness.candidateMatches"]);
    }
  });

  it("blocks a recovery that proved every invariant past the one-hour target", () => {
    const within = completeCandidateEvidence().map((row) =>
      row.family === "backups-and-recovery-verification"
        ? { ...row, measuredRecoveryMilliseconds: 60 * 60_000 }
        : row,
    );
    expect(checksIn(within)).toEqual([]);

    const beyond = completeCandidateEvidence().map((row) =>
      row.family === "backups-and-recovery-verification"
        ? { ...row, measuredRecoveryMilliseconds: 60 * 60_000 + 1 }
        : row,
    );
    expect(checksIn(beyond)).toEqual(["readiness.recoveryTimeTarget"]);
  });

  it("requires a sign-off on the record and on every exercise in it", () => {
    expect(checksIn(completeCandidateEvidence(), { projectOwnerSignOff: null }))
      .toEqual(["readiness.projectOwnerSignOff"]);
    expect(checksIn(completeCandidateEvidence(), { projectOwnerSignOff: "   " }))
      .toEqual(["readiness.projectOwnerSignOff"]);

    const unsigned = completeCandidateEvidence().map((row) =>
      row.family === "third-party-integrations"
        ? { ...row, signedOffBy: null, signedOffAt: null }
        : row,
    );
    expect(checksIn(unsigned)).toEqual(["readiness.exerciseSignedOff"]);
  });

  // "Not applicable" is the cell an unexercised family hides behind. It is
  // allowed, but only with a reason and a name attached to it.
  it("blocks an inapplicable exercise that explains nothing and an exception nobody owns", () => {
    const unexplained = completeCandidateEvidence().map((row) =>
      row.family === "sentry-failure-patterns" ? { ...row, result: "NOT_APPLICABLE" as const } : row,
    );
    expect(checksIn(unexplained)).toEqual(["readiness.exceptionOwned"]);

    const unowned = completeCandidateEvidence().map((row) =>
      row.family === "sentry-failure-patterns"
        ? {
          ...row,
          result: "NOT_APPLICABLE" as const,
          limitation: "Browser fingerprint rules are configured in Sentry, not evaluated here",
        }
        : row,
    );
    expect(checksIn(unowned)).toEqual(["readiness.exceptionOwned"]);

    const owned = completeCandidateEvidence().map((row) =>
      row.family === "sentry-failure-patterns"
        ? {
          ...row,
          result: "NOT_APPLICABLE" as const,
          limitation: "Browser fingerprint rules are configured in Sentry, not evaluated here",
          followUpOwner: "Project Owner",
        }
        : row,
    );
    expect(checksIn(owned)).toEqual([]);
  });

  it("blocks a follow-up owner named for no limitation", () => {
    const dangling = completeCandidateEvidence().map((row) =>
      row.family === "notification-reconciliation" ? { ...row, followUpOwner: "Project Owner" } : row,
    );
    expect(checksIn(dangling)).toEqual(["readiness.exceptionOwned"]);
  });
});

describe("the evidence boundary", () => {
  it("accepts a link to private provider evidence over https", () => {
    for (const link of [
      "https://github.com/bcrave/language-learning-marketplace/actions/runs/1",
      "https://railway.com/project/abc/service/def",
      "https://marketplace.sentry.io/issues/1234",
    ]) {
      expect(isPrivateEvidenceLink(link)).toBe(true);
    }
  });

  it("refuses a link that is not private provider evidence, or that carries access with it", () => {
    for (const link of [
      // Not a private provider surface at all.
      "https://pastebin.com/raw/abcd",
      "https://example.com/dump.sql",
      // The evidence over plaintext.
      "http://github.com/bcrave/language-learning-marketplace/actions/runs/1",
      // A signed provider link puts its credential in the query string, so
      // publishing one publishes the access rather than the pointer.
      "https://railway.com/download?token=abc123",
      "https://user:secret@github.com/bcrave/x/actions/runs/1",
      // A host that merely ends in the allowed name.
      "https://github.com.attacker.test/actions/runs/1",
      "not a url at all",
    ]) {
      expect(isPrivateEvidenceLink(link)).toBe(false);
    }
  });

  it("blocks a record whose evidence link is not a private pointer", () => {
    const leaking = completeCandidateEvidence().map((row) =>
      row.family === "abusive-traffic-and-credential-exposure"
        ? { ...row, evidenceLink: "https://pastebin.com/raw/abcd" }
        : row,
    );
    expect(checksIn(leaking)).toEqual(["readiness.evidenceLinkPrivate"]);
  });

  it("blocks raw evidence written into a limitation or a follow-up owner", () => {
    for (const limitation of [
      "restore from postgresql://demo:hunter2@db.internal:5432/marketplace",
      "the exposed token was eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghijk",
      "rotate railway_0123456789abcdefghij before release",
      // The header plus real key material. The header alone is a description,
      // not a disclosure, and the shared detector deliberately allows it.
      `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDaBcdEfGhIjKlMn`,
      "the source at 203.0.113.9 kept retrying",
    ]) {
      const leaking = completeCandidateEvidence().map((row) =>
        row.family === "deployment-cost-ceiling"
          ? { ...row, limitation, followUpOwner: "Project Owner" }
          : row,
      );
      expect(checksIn(leaking)).toContain("readiness.evidenceSanitized");
    }

    const addressed = completeCandidateEvidence().map((row) =>
      row.family === "deployment-cost-ceiling"
        ? {
          ...row,
          limitation: "Railway hard limit verified by hand",
          followUpOwner: "owner@example.test",
        }
        : row,
    );
    expect(checksIn(addressed)).toEqual(["readiness.evidenceSanitized"]);
  });

  // The names of settings and thresholds are exactly what the record is for.
  it("keeps a limitation that names a secret without carrying one", () => {
    const named = completeCandidateEvidence().map((row) =>
      row.family === "deployment-cost-ceiling"
        ? {
          ...row,
          limitation: "API_TRUSTED_PROXY_SECRET rotation is still manual",
          followUpOwner: "Project Owner",
        }
        : row,
    );
    expect(checksIn(named)).toEqual([]);
  });
});

// A `workflow_dispatch` input left empty arrives as "", not as an absent
// variable, and zod's `.optional()` admits only `undefined`. Every operation
// entry point parses through this, so the ordinary case — no limitation to
// record, no sign-off yet — reaches the schema as the absence it actually is.
describe("workflow inputs", () => {
  const schema = z.object({
    REQUIRED: z.string().min(1),
    OPTIONAL: z.string().trim().min(1).max(120).optional(),
  });

  it("reads an omitted input as absent rather than as an empty string", () => {
    expect(() => schema.parse({ REQUIRED: "x", OPTIONAL: "" })).toThrow();
    expect(schema.parse(absentWhenBlank({ REQUIRED: "x", OPTIONAL: "" })))
      .toEqual({ REQUIRED: "x" });
    expect(schema.parse(absentWhenBlank({ REQUIRED: "x", OPTIONAL: "   " })))
      .toEqual({ REQUIRED: "x" });
  });

  it("leaves a supplied input exactly as it arrived", () => {
    expect(absentWhenBlank({ OPTIONAL: " Project Owner " }))
      .toEqual({ OPTIONAL: " Project Owner " });
    expect(absentWhenBlank({ OPTIONAL: undefined })).toEqual({ OPTIONAL: undefined });
  });
});

describe("the rendered record", () => {
  it("gives every incident family a row, exercised or not", () => {
    const rendered = renderReadinessEvidence(recordFor([]));
    for (const label of Object.values(INCIDENT_FAMILIES)) {
      expect(rendered).toContain(label);
    }
    expect(rendered).toContain("NOT EXERCISED");
    expect(rendered).toContain("Release rule: BLOCKED");
  });

  it("ties the record to the exact candidate and its policy fingerprints", () => {
    const rendered = renderReadinessEvidence(recordFor(completeCandidateEvidence()));
    expect(rendered).toContain(RELEASE);
    expect(rendered).toContain(SCHEMA);
    expect(rendered).toContain(MANIFEST);
    expect(rendered).toContain("persisted.v4");
    expect(rendered).toContain("Operator guide fingerprint");
    expect(rendered).toContain("8f1c2d3e4a5b6c7d");
    expect(rendered).toContain("Release rule: every applicable row passes");
  });

  it("carries the alert policy's own condition identifiers rather than retyped thresholds", () => {
    const rendered = renderReadinessEvidence(recordFor(completeCandidateEvidence()));
    expect(rendered).toContain("backups.restore-drill-failed");
    expect(rendered).toContain("readiness.database-unreachable");
  });

  // A record that blocked the release but printed a clean page would be worse
  // than one that printed nothing: the owner would read it and ship.
  it("prints the findings that block the release", () => {
    const rendered = renderReadinessEvidence(recordFor([]));
    expect(rendered).toContain("readiness.familyExercised");
    expect(rendered).toContain("Release-blocking findings");
  });

  // The limitation is typed by a person into a workflow input. One `|` would
  // split the row and shift every later column, reattributing a result in the
  // artifact the release decision is read from.
  it("keeps a limitation containing a table delimiter inside its own cell", () => {
    const rendered = renderReadinessEvidence(
      recordFor(
        completeCandidateEvidence().map((row) =>
          row.family === "api-database-readiness"
            ? {
              ...row,
              limitation: "restore succeeded | worker queue\nwas empty",
              followUpOwner: "Project Owner",
            }
            : row,
        ),
      ),
    );

    const row = rendered
      .split("\n")
      .find((line) => line.includes("restore succeeded"))!;
    expect(row).toContain("restore succeeded \\| worker queue was empty");
    // Ten columns means ten separators plus the two that bound the row.
    expect(row.split(/(?<!\\)\|/).length - 1).toBe(11);
  });

  // A renamed family leaves exercises pointing at a name this build no longer
  // defines. They belong to no row, and the release still fails closed — but
  // telling the owner nothing ran would send them to rerun it rather than fix
  // the rename.
  it("names an exercise whose stored family it cannot place, rather than losing it", () => {
    const renamed = [
      ...completeCandidateEvidence(),
      exercise("a-family-a-later-build-renamed" as IncidentFamily, {
        exercise: "renamed-family-exercise",
      }),
    ];
    const record = recordFor(renamed);

    expect(record.unrecognisedExercises.map((row) => row.exercise))
      .toEqual(["renamed-family-exercise"]);
    expect(readinessEvidenceFindings(record).map((finding) => finding.check))
      .toEqual(["readiness.familyRecognised"]);

    const rendered = renderReadinessEvidence(record);
    expect(rendered).toContain("Exercises in no row");
    expect(rendered).toContain("renamed-family-exercise");
  });

  it("never renders raw evidence, whatever an exercise stored", () => {
    const raw = [
      "postgresql://demo:hunter2@db.internal:5432/marketplace",
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghijk",
      "railway_0123456789abcdefghij",
      "203.0.113.9",
      "reviewer@example.test",
    ];
    fc.assert(
      fc.property(fc.constantFrom(...raw), fc.constantFrom(...raw), (limitation, owner) => {
        const record = recordFor(
          completeCandidateEvidence().map((row) =>
            row.family === "worker-heartbeat-backlog-exhaustion"
              ? { ...row, limitation, followUpOwner: owner }
              : row,
          ),
        );
        // The record refuses to release, and the finding says what shape was
        // found without repeating the value that was found.
        const findings = readinessEvidenceFindings(record);
        const sanitized = findings.filter(
          (finding) => finding.check === "readiness.evidenceSanitized",
        );
        return (
          sanitized.length > 0
          && findings.every(
            (finding) => !finding.detail.includes(limitation) && !finding.detail.includes(owner),
          )
        );
      }),
    );
  });
});
