import type { Database } from "../database/database.js";
import type { IncidentFamily } from "../observability/alert-policy.js";
import {
  evidenceCell,
  isPrivateEvidenceLink,
  rawEvidenceShape,
} from "./evidence-boundary.js";
import {
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
  "security.resultStable",
  "security.resultSignedOff",
  "security.evidenceLinkPrivate",
  "security.evidenceSanitized",
  "security.checkRecognised",
  "security.evidenceKindMatches",
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
  /**
   * The private workflow run that assembled this record. The policy asks the
   * record for "links to the workflow and originating private provider
   * histories": each row carries its own provider link, and this is the run
   * they were assembled in.
   */
  evidenceLink: string;
  generatedAt: Date;
  /** Who accepted the record. The release rule has no unsigned path. */
  projectOwnerSignOff: string | null;
}

export interface SecurityGateRow {
  check: SecurityCheck;
  /** The latest result for this candidate, which is the one that stands. */
  result: SecurityCheckResult | null;
  /**
   * Earlier attempts for this candidate whose outcome differed from the one
   * that stands. A check that answers differently on the same commit is the
   * "flaky" the release rule blocks on, and it exists nowhere else: each
   * attempt on its own looks like a perfectly ordinary result.
   */
  disagreeingAttempts: readonly SecurityCheckResult[];
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
    // Latest last, so the attempt that stands is the one most recently
    // observed rather than whichever the store happened to return first.
    const attempts = input.results
      .filter((candidateResult) => candidateResult.check === check.id)
      .sort((left, right) => left.observedAt.getTime() - right.observedAt.getTime());
    const result = attempts.at(-1);
    return {
      check,
      result: result ?? null,
      disagreeingAttempts: attempts
        .slice(0, -1)
        .filter((attempt) => attempt.outcome !== result?.outcome),
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

  // The candidate's own free text reaches the published record verbatim, and
  // it is typed by a person into a workflow input like every observation is.
  // Scanning the observations but not the sign-off and the not-repeated
  // reasons would leave the record's most hand-written fields the only place a
  // credential could still travel.
  for (const [field, text] of [
    ["Project Owner sign-off", record.candidate.projectOwnerSignOff],
    ...Object.entries(record.candidate.notRepeated).map(
      ([checkId, reason]) => [`not-repeated reason for ${checkId}`, reason] as const,
    ),
  ] as ReadonlyArray<readonly [string, string | null]>) {
    const shape = text ? rawEvidenceShape(text) : undefined;
    if (shape) {
      add(
        "security.evidenceSanitized",
        null,
        `the ${field} carries ${shape}, which belongs only with its provider`,
      );
    }
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
      if (row.required && row.notRepeatedReason) {
        // A reason was stated for a check the scope required anyway. Naming
        // which of the two made it required matters: "the complete gate" and
        // "this change touched that boundary" send the owner to different
        // places, and reporting a public launch as a boundary change would
        // send them looking for a change that does not exist.
        add(
          "security.rerunScopeCovered",
          check.id,
          record.candidate.scope === "PUBLIC_LAUNCH"
            ? "a public launch runs the complete gate, so no check may be carried forward"
            : "the check maps to a changed trust boundary and cannot be carried forward",
        );
      } else if (row.required) {
        add(
          "security.checkRequired",
          check.id,
          result
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
        "security.evidenceKindMatches",
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

    // "A failed, missing, flaky, stale, or unexplained required result blocks
    // public launch or release." Flaky is the only one of the five that no
    // single attempt reveals: it is two attempts on one candidate disagreeing.
    if (row.disagreeingAttempts.length > 0) {
      add(
        "security.resultStable",
        check.id,
        `${row.disagreeingAttempts.length} earlier attempt(s) on this candidate disagreed with the result that stands`,
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
  const cell = evidenceCell;

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
    `| Gate workflow run | [private evidence](${record.candidate.evidenceLink}) |`,
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
    // The stated reason travels with the outcome whether or not the scope let
    // the check be carried forward. A required row that drops it would hide
    // the very sentence the policy asks the record to state — and hide it
    // exactly when someone tried to carry forward something they could not.
    const outcome = row.result
      ? row.result.outcome
      : row.required
        ? `**NOT RECORDED**${row.notRepeatedReason ? ` (claimed: ${cell(row.notRepeatedReason)})` : ""}`
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
 * Records one attempt at one check against one candidate.
 *
 * Every attempt is kept. The record reads the latest as the outcome that
 * stands and blocks when an earlier one disagreed, because "flaky" is a word
 * the release rule uses and nothing else in the deployment can see: each
 * attempt on its own looks like an ordinary result, and only the pair is
 * evidence that the check does not answer the same way twice.
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

  await db.insertInto("security_gate_results").values(values).execute();
}

/** Every attempt recorded against one candidate, oldest first. */
export async function securityCheckResultsFor(
  db: Database,
  release: string,
): Promise<SecurityCheckResult[]> {
  const rows = await db
    .selectFrom("security_gate_results")
    .selectAll()
    .where("release", "=", release)
    .orderBy("check_id")
    .orderBy("observed_at")
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
 * What one gate run carries beyond the record itself: where its raw output
 * lives, what to correlate it with, and the exception only a person can
 * record. Both writers below take the same envelope, because they are two
 * halves of one act — the Audit Entry and the readiness rows are written in
 * one transaction and must describe the same run.
 */
export interface SecurityGateEvidence {
  /** Link to the private workflow run holding the raw gate output. */
  evidenceLink: string;
  correlationId: string;
  limitation?: string | null;
  followUpOwner?: string | null;
  signedOffBy?: string | null;
  signedOffAt?: Date | null;
}

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
  evidence: SecurityGateEvidence,
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
  evidence: SecurityGateEvidence,
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
