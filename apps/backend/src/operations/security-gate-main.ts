import { createHash } from "node:crypto";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { createDatabase } from "../database/database.js";
import { latestMigrationName } from "../database/migrate.js";
import { canonicalFixtureManifest } from "../fixtures/canonical-fixture-manifest.js";
import { contentSecurityPolicy } from "./browser-policy.js";
import { readinessExercisesFor } from "./readiness-evidence.js";
import {
  buildSecurityGateRecord,
  recordSecurityGateEvidence,
  renderSecurityGateRecord,
  securityCheckResultsFor,
  securityGateFindings,
  securityResultsFromRecoveryDrills,
} from "./security-gate.js";
import {
  SECURITY_TRUST_BOUNDARIES,
  type SecurityTrustBoundary,
} from "./security-verification-catalog.js";
import { absentWhenBlank } from "./workflow-inputs.js";

/**
 * Assembles the candidate's Security Gate Record and enforces the release rule
 * on it.
 *
 * Nothing is typed in here that the deployment already knows: the required
 * checks come from the verification catalog, the results are read back from
 * what actually ran against this release, and the two recovery drills are read
 * from the readiness exercises they wrote themselves. The workflow supplies
 * only what no database holds — the rerun scope, the boundaries a change
 * touched, the reason any full-gate check was not repeated, the link to the
 * run, and the Project Owner's sign-off.
 *
 * A blocked record is still written, and its evidence is still recorded. The
 * owner needs to read *which* checks block the release; a gate that printed
 * nothing when the answer was "no" would send them back to guessing, and a
 * readiness record that never heard about the blocked families would quietly
 * describe them as unexercised rather than failed.
 */
const environment = z.object({
  DATABASE_URL: z.url(),
  APP_RELEASE: z.string().min(1).max(255),
  SECURITY_GATE_SCOPE: z.enum(["PUBLIC_LAUNCH", "SECURITY_RELEVANT_CHANGE"]),
  /** Comma-separated trust boundaries a Security-Relevant Change touched. */
  SECURITY_CHANGED_BOUNDARIES: z.string().max(500).optional(),
  /** JSON object of check identifier to the reason it was not repeated. */
  SECURITY_NOT_REPEATED: z.string().max(4000).optional(),
  SECURITY_GATE_EVIDENCE_LINK: z.url(),
  SECURITY_GATE_SIGN_OFF: z.string().trim().min(1).max(120).optional(),
  SECURITY_GATE_CORRELATION_ID: z.string().min(1).max(120).optional(),
  SECURITY_GATE_LIMITATION: z.string().trim().min(1).max(500).optional(),
  SECURITY_GATE_FOLLOW_UP_OWNER: z.string().trim().min(1).max(120).optional(),
  PERSISTED_OPERATION_MANIFEST_VERSION: z.string().min(1).max(255).optional(),
  /** The two provider origins the enforced browser policy names, and no other. */
  AUTH0_TENANT_ORIGIN: z.url().optional(),
  SENTRY_INGEST_ORIGIN: z.url().optional(),
  SECURITY_GATE_RECORD_PATH: z.string().min(1).optional(),
  GITHUB_STEP_SUMMARY: z.string().optional(),
}).parse(absentWhenBlank(process.env));

const boundarySchema = z.enum(
  Object.keys(SECURITY_TRUST_BOUNDARIES) as [SecurityTrustBoundary, ...SecurityTrustBoundary[]],
);
const changedBoundaries = boundarySchema
  .array()
  .parse(
    (environment.SECURITY_CHANGED_BOUNDARIES ?? "")
      .split(",")
      .map((boundary) => boundary.trim())
      .filter((boundary) => boundary !== ""),
  );

const notRepeated = z
  .record(z.string().min(1).max(120), z.string().trim().min(1).max(500))
  .parse(environment.SECURITY_NOT_REPEATED ? JSON.parse(environment.SECURITY_NOT_REPEATED) : {});

/**
 * The mutable policy documents this candidate was evidenced against.
 *
 * The threat model and the verification policy are mutable by design, so "the
 * abuse case passed" is only meaningful alongside which threat model it was
 * judged against. A digest is the whole claim: it changes when the policy
 * changes, and it carries none of the policy's content into the record.
 */
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const FINGERPRINTED_POLICY_DOCUMENTS = {
  "Threat model": "docs/threat-model.md",
  "Security verification": "docs/security-verification.md",
  "Operator guide": "docs/operations/operator-guide.md",
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

/**
 * The enforced policy this candidate serves, as a digest.
 *
 * Taken from the build's own policy with the deployment's provider origins
 * substituted, rather than from the live response: the live header is what the
 * `configuration.caddy` assertion and the deployed public-surface step compare
 * against this, and a fingerprint read from the thing being checked would agree
 * with itself no matter what either of them found.
 */
function cspPolicyFingerprint() {
  if (!environment.AUTH0_TENANT_ORIGIN || !environment.SENTRY_INGEST_ORIGIN) return null;
  const policy = contentSecurityPolicy({
    auth0Origin: new URL(environment.AUTH0_TENANT_ORIGIN).origin,
    sentryOrigin: new URL(environment.SENTRY_INGEST_ORIGIN).origin,
  });
  return createHash("sha256").update(policy).digest("hex").slice(0, 16);
}

const db = createDatabase(environment.DATABASE_URL);
try {
  const record = buildSecurityGateRecord({
    candidate: {
      release: environment.APP_RELEASE,
      schemaVersion: await latestMigrationName(),
      fixtureManifestVersion: canonicalFixtureManifest.version,
      persistedOperationManifestVersion:
        environment.PERSISTED_OPERATION_MANIFEST_VERSION ?? null,
      cspPolicyFingerprint: cspPolicyFingerprint(),
      configurationFingerprints: policyFingerprints(),
      scope: environment.SECURITY_GATE_SCOPE,
      changedBoundaries,
      notRepeated,
      generatedAt: new Date(),
      projectOwnerSignOff: environment.SECURITY_GATE_SIGN_OFF ?? null,
    },
    results: [
      ...(await securityCheckResultsFor(db, environment.APP_RELEASE)),
      ...securityResultsFromRecoveryDrills(
        await readinessExercisesFor(db, environment.APP_RELEASE),
        environment.APP_RELEASE,
      ),
    ],
  });

  const rendered = renderSecurityGateRecord(record);
  if (environment.SECURITY_GATE_RECORD_PATH) {
    writeFileSync(environment.SECURITY_GATE_RECORD_PATH, rendered);
  }
  if (environment.GITHUB_STEP_SUMMARY) {
    appendFileSync(environment.GITHUB_STEP_SUMMARY, rendered);
  }
  process.stdout.write(rendered);

  await recordSecurityGateEvidence(db, record, {
    evidenceLink: environment.SECURITY_GATE_EVIDENCE_LINK,
    correlationId:
      environment.SECURITY_GATE_CORRELATION_ID ?? `security-gate-${environment.APP_RELEASE}`,
    limitation: environment.SECURITY_GATE_LIMITATION ?? null,
    followUpOwner: environment.SECURITY_GATE_FOLLOW_UP_OWNER ?? null,
    signedOffBy: environment.SECURITY_GATE_SIGN_OFF ?? null,
    signedOffAt: environment.SECURITY_GATE_SIGN_OFF ? record.candidate.generatedAt : null,
  });

  // Fail-closed: the release rule blocks on any finding, and the job failing is
  // what stops a release that would otherwise have published anyway.
  if (securityGateFindings(record).length > 0) process.exitCode = 1;
} finally {
  await db.destroy();
}
