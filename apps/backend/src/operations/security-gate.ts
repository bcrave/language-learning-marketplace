import type { Database } from "../database/database.js";
import { INCIDENT_FAMILIES, type IncidentFamily } from "../observability/alert-policy.js";
import { firstCredentialShape } from "./credential-shapes.js";
import {
  isPrivateEvidenceLink,
  recordReadinessExercise,
  type ReadinessExercise,
} from "./readiness-evidence.js";
import {
  ACCEPTED_RESIDUAL_RISKS,
  isAcceptedResidualRisk,
  isSecurityCheck,
  SECURITY_GATE_READINESS_EVIDENCE,
  SECURITY_VERIFICATION_CATALOG,
  type AcceptedResidualRisk,
  type SecurityCheck,
  type SecurityEvidenceKind,
  type SecurityTrustBoundary,
} from "./security-verification-catalog.js";

/**
 * The [Security Gate Record](../../../../docs/security-verification.md) for one
 * exact production candidate.
 *
 * The policy is the rule; the catalog is the rule as data; this is what one
 * candidate proved against it. Like the readiness record, it is deliberately
 * not a form. Which checks are required, what each disproves, and which trust
 * boundaries rerun it are read from the catalog rather than retyped, so a
 * record can never claim coverage the deployment does not have. What each check
 * actually did is read from the results that were recorded as they happened.
 *
 * What is left for a person is the part only a person has: the rerun scope, the
 * reason a full-gate check was not repeated, the residual risk a finding maps
 * to, and the sign-off.
 *
 * The release rule is fail-closed. `securityGateFindings` returns what blocks
 * the release, and an empty result is the only thing that clears it. A missing
 * required result blocks exactly as a failed one does, because a check nobody
 * ran and a check that failed are equally unproven — and a failed required
 * check cannot be waived at all.
 */

/**
 * Every way a candidate can fail the release rule, as stable identifiers a
 * finding can be reported and tracked under.
 */
export const SECURITY_GATE_FINDINGS = [
  "security.checkRequired",
  "security.checkPassed",
  "security.candidateMatches",
  "security.rerunScopeCovered",
  "security.residualRiskAccepted",
  "security.resultSignedOff",
  "security.evidenceLinkPrivate",
  "security.evidenceSanitized",
  "security.checkRecognised",
  "security.policyFingerprint",
  "security.projectOwnerSignOff",
] as const;

export type SecurityGateFindingCheck = (typeof SECURITY_GATE_FINDINGS)[number];

export type SecurityResultOutcome = "PASSED" | "FAILED" | "NOT_RUN";

/**
 * What the gate is being run for.
 *
 * `PUBLIC_LAUNCH` runs the complete gate: every catalog check is required, and
 * nothing may be carried forward. `SECURITY_RELEVANT_CHANGE` reruns the
 * automated baseline plus every check mapped to a boundary the change touched,
 * and the record has to say why anything else was not repeated.
 */
export type SecurityGateScope = "PUBLIC_LAUNCH" | "SECURITY_RELEVANT_CHANGE";

export interface SecurityCheckResult {
  check: string;
  release: string;
  evidenceKind: SecurityEvidenceKind;
  outcome: SecurityResultOutcome;
  observedAt: Date;
  /** A link to private provider evidence, never the evidence itself. */
  evidenceLink: string;
  /** Privacy-safe: what was seen, never the value that was seen. */
  observation: string;
  /** The documented residual risk a failing result maps wholly to, if any. */
  residualRisk: string | null;
  correlationId: string;
  signedOffBy: string | null;
  signedOffAt: Date | null;
}

export interface SecurityGateCandidate {
  /** The exact commit the candidate is, which is also its release identifier. */
  release: string;
  schemaVersion: string;
  fixtureManifestVersion: string;
  persistedOperationManifestVersion: string | null;
  /**
   * The enforced Content Security Policy this candidate serves, as a digest.
   * The policy's rollout proof is about one exact policy running twice — once
   * report-only, once enforced — and a record that named the journeys without
   * naming the policy could not tell those two apart.
   */
  cspPolicyFingerprint: string | null;
  /** Digests of the policy documents this candidate was evidenced against. */
  configurationFingerprints: Readonly<Record<string, string>>;
  scope: SecurityGateScope;
  /** The trust boundaries a Security-Relevant Change touched. */
  changedBoundaries: readonly SecurityTrustBoundary[];
  /**
   * Why a full-gate check was not repeated for this candidate, by check
   * identifier. The policy requires the record to state this; an entry is the
   * statement, and its absence is what turns an unrepeated check back into a
   * missing required result.
   */
  notRepeated: Readonly<Record<string, string>>;
  generatedAt: Date;
  /** Who accepted the record. The release rule has no unsigned path. */
  projectOwnerSignOff: string | null;
}

export interface SecurityGateRow {
  check: SecurityCheck;
  /** The result that stands for this candidate, where one was recorded. */
  result: SecurityCheckResult | null;
  /** Whether this candidate's rerun scope required the check to be repeated. */
  required: boolean;
  /** The stated reason it was not repeated, where the scope allowed that. */
  notRepeatedReason: string | null;
}

export interface SecurityGateRecord {
  candidate: SecurityGateCandidate;
  rows: readonly SecurityGateRow[];
  /**
   * Results whose check identifier this build no longer defines, most likely
   * because a check was renamed after they were recorded. They belong to no
   * row, and the record names them rather than losing them.
   */
  unrecognisedResults: readonly SecurityCheckResult[];
  /** The residual risks this candidate leans on, with who accepted each. */
  acceptedResidualRisks: readonly {
    risk: AcceptedResidualRisk;
    description: string;
    checks: readonly string[];
  }[];
}

export interface SecurityGateFinding {
  finding: SecurityGateFindingCheck;
  /** The catalog check the finding is about, where it is about one. */
  check: string | null;
  /** Privacy-safe: names what is missing or wrong, never the offending value. */
  detail: string;
}

/**
 * The personal data the evidence boundary excludes on top of the credential
 * shapes, matching the readiness record's boundary.
 *
 * An observation is written by a person after an abuse case, which is exactly
 * where an address the case involved would be tempting to write down. The
 * policy names both as things the record must never retain.
 */
const PERSONAL_DATA_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ["an email address", /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/],
  ["a source address", /\b(?:\d{1,3}\.){3}\d{1,3}\b/],
];

function rawEvidenceShape(text: string) {
  return (
    firstCredentialShape(text)
    ?? PERSONAL_DATA_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0]
  );
}

/**
 * Whether the candidate's rerun scope requires this check to have been repeated.
 *
 * A public launch requires all of them. After launch, a Security-Relevant
 * Change requires every check mapped to a boundary it touched, plus the
 * automated baseline — which is every check an automated suite records, because
 * those cost nothing to rerun and the policy runs them on every candidate.
 */
export function requiredForScope(
  check: SecurityCheck,
  candidate: Pick<SecurityGateCandidate, "scope" | "changedBoundaries">,
): boolean {
  if (candidate.scope === "PUBLIC_LAUNCH") return true;
  if (check.evidence === "SUITE" || check.evidence === "DEPLOYED") return true;
  return check.boundaries.some((boundary) => candidate.changedBoundaries.includes(boundary));
}

/**
 * Assembles the record for one candidate from the catalog and the results
 * recorded against it. It never filters or rewrites a result: a failing row
 * belongs in the record, where the release rule can block on it.
 */
export function buildSecurityGateRecord(input: {
  candidate: SecurityGateCandidate;
  results: readonly SecurityCheckResult[];
}): SecurityGateRecord {
  const rows = SECURITY_VERIFICATION_CATALOG.map((check) => {
    const result = input.results.find((candidateResult) => candidateResult.check === check.id);
    return {
      check,
      result: result ?? null,
      required: requiredForScope(check, input.candidate),
      notRepeatedReason: input.candidate.notRepeated[check.id]?.trim() || null,
    };
  });

  const waived = input.results.filter((result) => result.residualRisk !== null);
  const acceptedResidualRisks = [...new Set(waived.map((result) => result.residualRisk!))]
    .filter(isAcceptedResidualRisk)
    .sort()
    .map((risk) => ({
      risk,
      description: ACCEPTED_RESIDUAL_RISKS[risk],
      checks: waived
        .filter((result) => result.residualRisk === risk)
        .map((result) => result.check)
        .sort(),
    }));

  return {
    candidate: input.candidate,
    rows,
    // A result stored under a check this build cannot name belongs to no row
    // above, so it would vanish from the record entirely. The release still
    // fails closed — its check reports "no result" — but the owner would be
    // told nothing ran when something did, and would rerun it rather than fix
    // the rename. Carried out separately so the record can say so plainly.
    unrecognisedResults: input.results.filter((result) => !isSecurityCheck(result.check)),
    acceptedResidualRisks,
  };
}

/**
 * Everything that blocks this candidate's release. An empty result is the pass;
 * there is no severity ordering, because the release rule treats every one of
 * them the same way.
 */
export function securityGateFindings(record: SecurityGateRecord): SecurityGateFinding[] {
  const findings: SecurityGateFinding[] = [];
  const add = (
    finding: SecurityGateFindingCheck,
    check: string | null,
    detail: string,
  ) => findings.push({ finding, check, detail });

  if (!record.candidate.projectOwnerSignOff?.trim()) {
    add("security.projectOwnerSignOff", null, "the record carries no Project Owner sign-off");
  }

  // The rollout proof is about one exact policy enforced after being observed
  // report-only. Without the fingerprint the record cannot say which policy the
  // journeys ran against, so the journeys prove nothing that survives a change.
  if (!record.candidate.cspPolicyFingerprint?.trim()) {
    add(
      "security.policyFingerprint",
      null,
      "the record names no enforced browser-policy fingerprint",
    );
  }

  for (const result of record.unrecognisedResults) {
    add(
      "security.checkRecognised",
      result.check,
      "the result names a check this build's verification catalog does not define",
    );
  }

  for (const row of record.rows) {
    const { check, result } = row;

    if (!result || result.outcome === "NOT_RUN") {
      if (row.required) {
        add(
          row.notRepeatedReason ? "security.rerunScopeCovered" : "security.checkRequired",
          check.id,
          row.notRepeatedReason
            ? "the check maps to a changed trust boundary and cannot be carried forward"
            : result
              ? "the check was recorded as not run for this candidate"
              : "no result was recorded for this candidate",
        );
      } else if (!row.notRepeatedReason) {
        add(
          "security.rerunScopeCovered",
          check.id,
          "the check was not repeated and the record states no reason",
        );
      }
      if (!result) continue;
    }

    // A result from another release proves something about a candidate that is
    // not this one. Any content change creates a new candidate, so there is no
    // reading of "close enough" the policy would accept.
    if (result.release !== record.candidate.release) {
      add(
        "security.candidateMatches",
        check.id,
        "the result was recorded against a different release",
      );
    }

    if (result.evidenceKind !== check.evidence) {
      add(
        "security.checkRecognised",
        check.id,
        `the result claims ${result.evidenceKind} evidence where the catalog requires ${check.evidence}`,
      );
    }

    if (result.outcome === "FAILED") {
      if (!result.residualRisk) {
        // A failed required check cannot be waived. It closes with a fix, or
        // with reproducible evidence that the prohibited outcome is absent —
        // which is a new result, not an annotation on this one.
        add("security.checkPassed", check.id, "the check failed");
      } else if (!isAcceptedResidualRisk(result.residualRisk)) {
        add(
          "security.residualRiskAccepted",
          check.id,
          "the finding is mapped to a risk the threat model does not accept; a genuinely new risk needs an amendment first",
        );
      } else if (!result.signedOffBy || !result.signedOffAt) {
        add(
          "security.residualRiskAccepted",
          check.id,
          "the finding maps to an accepted residual risk but carries no dated Project Owner sign-off",
        );
      }
    } else if (result.residualRisk) {
      add(
        "security.residualRiskAccepted",
        check.id,
        "a residual risk is claimed for a result that did not fail",
      );
    }

    // An owner-performed case is a person's testimony. Undated and unsigned, it
    // is indistinguishable from nobody having performed it.
    if (check.evidence === "OWNER" && (!result.signedOffBy || !result.signedOffAt)) {
      add(
        "security.resultSignedOff",
        check.id,
        "the manually performed check carries no dated Project Owner sign-off",
      );
    }

    if (!isPrivateEvidenceLink(result.evidenceLink)) {
      add(
        "security.evidenceLinkPrivate",
        check.id,
        "the evidence link does not point at private provider evidence",
      );
    }

    const shape = rawEvidenceShape(result.observation);
    if (shape) {
      add(
        "security.evidenceSanitized",
        check.id,
        `the observation carries ${shape}, which belongs only with its provider`,
      );
    }
  }

  return findings;
}

/**
 * Renders the record as the privacy-safe Markdown artifact the gate publishes.
 *
 * Rendered from the record rather than assembled as text, so the findings above
 * are computed over the same values the reader sees. Every value here is a
 * check identifier, an outcome, a date, a digest, or a link: the raw evidence
 * stays in the provider console it came from.
 */
export function renderSecurityGateRecord(record: SecurityGateRecord): string {
  const findings = securityGateFindings(record);
  /**
   * A Markdown table cell. An observation and a not-repeated reason are typed
   * by a person into a workflow input, and a single `|` in one of them would
   * split the row and shift every later column — silently reattributing a
   * result in the artifact the release decision is read from.
   */
  const cell = (value: string | null) =>
    value === null || value === ""
      ? "—"
      : value.replaceAll("|", "\\|").replaceAll(/\r?\n/g, " ");

  const lines = [
    "# Security Gate Record",
    "",
    `Release \`${record.candidate.release}\`, generated ${record.candidate.generatedAt.toISOString()}.`,
    "",
    findings.length === 0
      ? "**Release rule: every required check passes for this exact candidate.**"
      : `**Release rule: BLOCKED by ${findings.length} finding(s).**`,
    "",
    "## Candidate",
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Candidate commit and release | ${record.candidate.release} |`,
    `| Schema version | ${record.candidate.schemaVersion} |`,
    `| Fixture-manifest version | ${record.candidate.fixtureManifestVersion} |`,
    `| Persisted-operation-manifest version | ${cell(record.candidate.persistedOperationManifestVersion)} |`,
    `| Enforced browser-policy fingerprint | ${record.candidate.cspPolicyFingerprint ? `\`${record.candidate.cspPolicyFingerprint}\`` : "—"} |`,
    ...Object.entries(record.candidate.configurationFingerprints)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, digest]) => `| ${name} fingerprint | \`${digest}\` |`),
    `| Rerun scope | ${record.candidate.scope} |`,
    `| Changed trust boundaries | ${record.candidate.changedBoundaries.join(", ") || "—"} |`,
    `| Evidence generated at | ${record.candidate.generatedAt.toISOString()} |`,
    `| Project Owner sign-off | ${cell(record.candidate.projectOwnerSignOff)} |`,
    "",
    "## Required results",
    "",
    "| Check | Abuse family | Evidence | Boundaries | Outcome | Observed | Observation | Evidence link | Sign-off |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const row of record.rows) {
    const outcome = row.result
      ? row.result.outcome
      : row.required
        ? "**NOT RECORDED**"
        : `NOT REPEATED (${cell(row.notRepeatedReason)})`;
    lines.push([
      "",
      row.check.id,
      row.check.family,
      row.check.evidence,
      row.check.boundaries.join("<br>"),
      outcome,
      row.result ? row.result.observedAt.toISOString() : "—",
      cell(row.result?.observation ?? null),
      row.result ? `[private evidence](${row.result.evidenceLink})` : "—",
      row.result?.signedOffAt
        ? `${cell(row.result.signedOffBy)} ${row.result.signedOffAt.toISOString()}`
        : "—",
      "",
    ].join(" | ").trim());
  }

  lines.push("", "## Accepted residual risks", "");
  if (record.acceptedResidualRisks.length === 0) {
    lines.push("None. No finding was carried under a documented residual risk.");
  } else {
    lines.push(
      "| Risk | Description | Findings carried |",
      "| --- | --- | --- |",
      ...record.acceptedResidualRisks.map(
        (accepted) =>
          `| ${accepted.risk} | ${cell(accepted.description)} | ${accepted.checks.join("<br>")} |`,
      ),
    );
  }

  if (record.unrecognisedResults.length > 0) {
    lines.push(
      "",
      "## Results in no row",
      "",
      "These were recorded, but name a check this build's catalog does not",
      "define — most likely a check renamed after they were recorded.",
      "",
      "| Check | Outcome | Observed |",
      "| --- | --- | --- |",
      ...record.unrecognisedResults.map(
        (result) =>
          `| ${cell(result.check)} | ${result.outcome} | ${result.observedAt.toISOString()} |`,
      ),
    );
  }

  lines.push("", "## Release-blocking findings", "");
  if (findings.length === 0) {
    lines.push("None. Every required check passes for this exact candidate.");
  } else {
    lines.push(
      "| Finding | Check | Detail |",
      "| --- | --- | --- |",
      ...findings.map(
        (finding) => `| ${finding.finding} | ${finding.check ?? "—"} | ${finding.detail} |`,
      ),
    );
  }

  lines.push(
    "",
    "## Evidence handling",
    "",
    "Check identifiers, outcomes, dates, fingerprints, and provider links only.",
    "Credentials, tokens, private configuration, raw source addresses, personal",
    "data, attack payloads, complete GraphQL variables, and raw provider",
    "responses stay in the private console they came from.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

/**
 * Records one check's result against one candidate, replacing an earlier run of
 * the same check for the same release. The record carries the outcome that
 * stands; the attempts live in the workflow runs the evidence link points at.
 *
 * It refuses what the record could not publish rather than storing it and
 * failing at render time, so a check that would have written a credential into
 * the evidence fails where whoever ran it is still watching.
 */
export async function recordSecurityCheckResult(
  db: Database,
  result: SecurityCheckResult,
): Promise<void> {
  if (!isSecurityCheck(result.check)) {
    throw new Error(
      "A Security Gate result names a check in the verification catalog; adding one is a change to the catalog, not to a workflow input",
    );
  }
  if (!isPrivateEvidenceLink(result.evidenceLink)) {
    throw new Error(
      "A Security Gate result links to private provider evidence over https, without a query string",
    );
  }
  const shape = rawEvidenceShape(result.observation);
  if (shape) {
    throw new Error(`A Security Gate result records no raw evidence; found ${shape}`);
  }
  if (result.residualRisk && !isAcceptedResidualRisk(result.residualRisk)) {
    throw new Error(
      "A Security Gate result may reference only a residual risk the threat model already accepts",
    );
  }

  const values = {
    release: result.release,
    check_id: result.check,
    evidence_kind: result.evidenceKind,
    outcome: result.outcome,
    observed_at: result.observedAt,
    evidence_link: result.evidenceLink,
    observation: result.observation,
    residual_risk: result.residualRisk,
    correlation_id: result.correlationId,
    signed_off_by: result.signedOffBy,
    signed_off_at: result.signedOffAt,
  };

  await db
    .insertInto("security_gate_results")
    .values(values)
    .onConflict((conflict) =>
      conflict.columns(["release", "check_id"]).doUpdateSet(values),
    )
    .execute();
}

/** Every result recorded against one candidate. */
export async function securityCheckResultsFor(
  db: Database,
  release: string,
): Promise<SecurityCheckResult[]> {
  const rows = await db
    .selectFrom("security_gate_results")
    .selectAll()
    .where("release", "=", release)
    .orderBy("check_id")
    .execute();

  return rows.map((row) => ({
    check: row.check_id,
    release: row.release,
    evidenceKind: row.evidence_kind,
    outcome: row.outcome,
    observedAt: row.observed_at,
    evidenceLink: row.evidence_link,
    observation: row.observation,
    residualRisk: row.residual_risk,
    correlationId: row.correlation_id,
    signedOffBy: row.signed_off_by,
    signedOffAt: row.signed_off_at,
  }));
}

/**
 * The `drill.*` results, read out of the readiness exercises the two recovery
 * drills already wrote for this candidate.
 *
 * The drills are the only checks the gate does not record for itself. They
 * write their own evidence when they run, days before a release in the case of
 * a backup restoration, and asking somebody to retype the outcome here would
 * create a second copy of a fact that can then disagree with the first.
 *
 * An exercise for a release other than the candidate's is not carried forward.
 * It is simply not returned, and the missing required result is what the gate
 * then blocks on — which is the correct reading: this candidate has no drill.
 */
export function securityResultsFromRecoveryDrills(
  exercises: readonly ReadinessExercise[],
  release: string,
): SecurityCheckResult[] {
  const drills: Readonly<Record<string, string>> = {
    "backup-restoration-drill": "drill.backupRestoration",
    "change-triggered-recovery-drill": "drill.changeTriggeredRecovery",
  };

  return exercises
    .filter((exercise) => exercise.release === release && drills[exercise.exercise])
    .map((exercise) => ({
      check: drills[exercise.exercise]!,
      release: exercise.release,
      evidenceKind: "DRILL" as const,
      // A drill that could not be applied is not a drill that passed. The
      // readiness record carries the limitation and the follow-up owner; the
      // gate needs only to know it is not evidence of a working recovery.
      outcome: exercise.result === "PASSED" ? ("PASSED" as const) : ("FAILED" as const),
      observedAt: exercise.exercisedAt,
      evidenceLink: exercise.evidenceLink,
      observation: `${exercise.testIdentifiers.length} drill check(s) recorded, result ${exercise.result}`,
      residualRisk: null,
      correlationId: exercise.correlationId,
      signedOffBy: exercise.signedOffBy,
      signedOffAt: exercise.signedOffAt,
    }));
}

export const SECURITY_GATE_SYSTEM_IDENTITY = "SECURITY_RELEASE_GATE";

/**
 * The readiness exercises this gate's own results evidence.
 *
 * A family's exercise passes only when every check mapped to it passed. A
 * missing result is not a pass: the gate has already blocked the release for
 * it, and a readiness row that read `PASSED` while its evidence was missing
 * would outlive that block in an artifact somebody later trusts.
 */
export function securityGateReadinessExercises(
  record: SecurityGateRecord,
  evidence: {
    evidenceLink: string;
    correlationId: string;
    limitation?: string | null;
    followUpOwner?: string | null;
    signedOffBy?: string | null;
    signedOffAt?: Date | null;
  },
): ReadinessExercise[] {
  const resultFor = (checkId: string) =>
    record.rows.find((row) => row.check.id === checkId)?.result ?? null;

  return (Object.keys(SECURITY_GATE_READINESS_EVIDENCE) as IncidentFamily[]).map((family) => {
    const mapping = SECURITY_GATE_READINESS_EVIDENCE[family]!;
    const results = mapping.checks.map((checkId) => resultFor(checkId));
    const passed = results.every((result) => result?.outcome === "PASSED");
    const observed = results
      .filter((result) => result !== null)
      .map((result) => result.observedAt.getTime());

    return {
      exercise: mapping.exercise,
      family,
      release: record.candidate.release,
      schemaVersion: record.candidate.schemaVersion,
      fixtureManifestVersion: record.candidate.fixtureManifestVersion,
      persistedOperationManifestVersion: record.candidate.persistedOperationManifestVersion,
      // Only the checks that produced a result. A family that lists a check
      // nothing ran must not name it among the tests it passed.
      testIdentifiers: mapping.checks.filter((checkId) => resultFor(checkId) !== null),
      // The last of its checks to be observed, because that is when the family
      // was actually proved. `generatedAt` would date every family to the
      // moment somebody assembled the record instead.
      exercisedAt: observed.length > 0
        ? new Date(Math.max(...observed))
        : record.candidate.generatedAt,
      // The gate measures no recovery. Null rather than zero: the readiness
      // record compares a measured duration against the recovery-time target,
      // and zero would read as an instant recovery nobody performed.
      measuredRecoveryMilliseconds: null,
      result: passed ? ("PASSED" as const) : ("FAILED" as const),
      evidenceLink: evidence.evidenceLink,
      limitation: evidence.limitation ?? null,
      followUpOwner: evidence.followUpOwner ?? null,
      correlationId: evidence.correlationId,
      signedOffBy: evidence.signedOffBy ?? null,
      signedOffAt: evidence.signedOffAt ?? null,
    };
  });
}

/**
 * Writes what the gate proved into the deployment's durable evidence: an Audit
 * Entry for the background action, and the readiness exercises the operational
 * readiness record is assembled from.
 *
 * Both writes happen in one transaction. A gate whose Audit Entry committed
 * without its readiness rows would be a background action with no evidence
 * behind it; one whose readiness rows committed without the Audit Entry would
 * be a release claim with no immutable history.
 */
export async function recordSecurityGateEvidence(
  db: Database,
  record: SecurityGateRecord,
  evidence: {
    /** Link to the private workflow run holding the raw gate output. */
    evidenceLink: string;
    correlationId: string;
    limitation?: string | null;
    followUpOwner?: string | null;
    signedOffBy?: string | null;
    signedOffAt?: Date | null;
  },
): Promise<void> {
  const findings = securityGateFindings(record);
  const passed = findings.length === 0;

  await db.transaction().execute(async (transaction) => {
    await transaction.insertInto("audit_entries").values({
      actor_user_id: null,
      system_identity: SECURITY_GATE_SYSTEM_IDENTITY,
      acting_role: null,
      operation: `security-gate.${passed ? "passed" : "blocked"}`,
      target_type: "SecurityGateRecord",
      target_id: record.candidate.release,
      outcome: passed ? "SUCCEEDED" : "FAILED",
      reason_code: `SECURITY_GATE_${record.candidate.scope}_${passed ? "PASSED" : "BLOCKED"}`,
      correlation_id: evidence.correlationId,
      occurred_at: record.candidate.generatedAt,
      // Check identifiers, counts, fingerprints, and a scope. No source
      // address, no credential, no reviewer content — the same boundary the
      // policy draws around every piece of release evidence.
      evidence: JSON.stringify({
        scope: record.candidate.scope,
        release: record.candidate.release,
        schemaVersion: record.candidate.schemaVersion,
        fixtureManifestVersion: record.candidate.fixtureManifestVersion,
        cspPolicyFingerprint: record.candidate.cspPolicyFingerprint,
        changedBoundaries: [...record.candidate.changedBoundaries],
        requiredCheckCount: record.rows.filter((row) => row.required).length,
        findings: findings.map((finding) => finding.finding),
        acceptedResidualRisks: record.acceptedResidualRisks.map((accepted) => accepted.risk),
      }),
    }).execute();

    for (const exercise of securityGateReadinessExercises(record, evidence)) {
      await recordReadinessExercise(transaction as Database, exercise);
    }
  });
}

/**
 * The incident families no part of this repository records evidence for.
 *
 * Nothing reads this at release time; it exists so `security-gate.test.ts` can
 * assert that the readiness record's ten families are all accounted for —
 * either by this gate or by the recovery drills — and fail when a family is
 * added that nothing would ever exercise.
 */
export function unevidencedIncidentFamilies(): IncidentFamily[] {
  const drilled: IncidentFamily = "backups-and-recovery-verification";
  return (Object.keys(INCIDENT_FAMILIES) as IncidentFamily[]).filter(
    (family) => family !== drilled && !SECURITY_GATE_READINESS_EVIDENCE[family],
  );
}
