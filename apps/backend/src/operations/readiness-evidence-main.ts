import { createHash } from "node:crypto";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { createDatabase } from "../database/database.js";
import { latestMigrationName } from "../database/migrate.js";
import { canonicalFixtureManifest } from "../fixtures/canonical-fixture-manifest.js";
import {
  buildReadinessEvidenceRecord,
  readinessEvidenceFindings,
  readinessExercisesFor,
  renderReadinessEvidence,
} from "./readiness-evidence.js";
import { absentWhenBlank } from "./workflow-inputs.js";

/**
 * Generates the candidate's operational readiness record and enforces the
 * release rule on it.
 *
 * Nothing is typed in here that the deployment already knows: the exercises are
 * read back from what actually ran against this release, and the thresholds come
 * from the alert policy. The workflow supplies only the two things a database
 * cannot hold — the Project Owner's sign-off, and the link to the run.
 *
 * A blocked record is still written. The owner needs to read *which* rows block
 * the release, and a generator that printed nothing when the answer was "no"
 * would send them back to guessing.
 */
const environment = z.object({
  DATABASE_URL: z.url(),
  APP_RELEASE: z.string().min(1).max(255),
  PERSISTED_OPERATION_MANIFEST_VERSION: z.string().min(1).max(255).optional(),
  READINESS_SIGN_OFF: z.string().trim().min(1).max(120).optional(),
  READINESS_EVIDENCE_PATH: z.string().min(1).optional(),
  GITHUB_STEP_SUMMARY: z.string().optional(),
}).parse(absentWhenBlank(process.env));

/**
 * The mutable policy documents this candidate was evidenced against.
 *
 * The operator guide is mutable by design, so "the drill passed" is only
 * meaningful alongside which thresholds it passed against. A digest is the
 * whole claim: it changes when the policy changes, and it carries none of the
 * policy's content into the record.
 */
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const FINGERPRINTED_POLICY_DOCUMENTS = {
  "Operator guide": "docs/operations/operator-guide.md",
  "Notification policy": "docs/notification-policy.md",
  "Threat model": "docs/threat-model.md",
  "Security verification": "docs/security-verification.md",
  "Fixture manifest": "docs/fixtures/synthetic-curriculum-manifest.md",
};

function policyFingerprints() {
  return Object.fromEntries(
    Object.entries(FINGERPRINTED_POLICY_DOCUMENTS).map(([name, path]) => {
      try {
        const digest = createHash("sha256")
          .update(readFileSync(resolve(repositoryRoot, path)))
          .digest("hex");
        return [name, digest.slice(0, 16)];
      } catch {
        // A record that silently omitted a fingerprint would read as though the
        // document had not changed. Saying it is unreadable is the honest cell.
        return [name, "unreadable"];
      }
    }),
  );
}

const db = createDatabase(environment.DATABASE_URL);
try {
  const record = buildReadinessEvidenceRecord({
    candidate: {
      release: environment.APP_RELEASE,
      schemaVersion: await latestMigrationName(),
      fixtureManifestVersion: canonicalFixtureManifest.version,
      persistedOperationManifestVersion:
        environment.PERSISTED_OPERATION_MANIFEST_VERSION ?? null,
      configurationFingerprints: policyFingerprints(),
      generatedAt: new Date(),
      projectOwnerSignOff: environment.READINESS_SIGN_OFF ?? null,
    },
    exercises: await readinessExercisesFor(db, environment.APP_RELEASE),
  });

  const rendered = renderReadinessEvidence(record);
  if (environment.READINESS_EVIDENCE_PATH) {
    writeFileSync(environment.READINESS_EVIDENCE_PATH, rendered);
  }
  if (environment.GITHUB_STEP_SUMMARY) {
    appendFileSync(environment.GITHUB_STEP_SUMMARY, rendered);
  }
  process.stdout.write(rendered);

  // Fail-closed: the release rule blocks on any finding, and the job failing is
  // what stops a release that would otherwise have published anyway.
  if (readinessEvidenceFindings(record).length > 0) process.exitCode = 1;
} finally {
  await db.destroy();
}
