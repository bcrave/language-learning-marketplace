import type { Database } from "../database/database.js";
import {
  ALERT_CONDITIONS,
  INCIDENT_FAMILIES,
  isIncidentFamily,
  RECOVERY_TIME_TARGET_MILLISECONDS,
  type AlertCondition,
  type IncidentFamily,
} from "../observability/alert-policy.js";
import {
  evidenceCell,
  isPrivateEvidenceLink,
  rawEvidenceShape,
} from "./evidence-boundary.js";

/**
 * The candidate-specific [operational readiness
 * evidence](../../../../docs/operations/readiness-evidence.md) record.
 *
 * The document is the template; this is what fills it in for one exact release,
 * and it is deliberately not a form. Half of every row — the threshold, the
 * confirmation step, the alert route and its lifecycle, the containment and the
 * clearing rule — is already stated by the alert policy, so it is read from
 * there rather than retyped, and a row can never claim a threshold the
 * deployment does not implement. The other half is what an exercise measured,
 * and that is read from the exercises that actually ran against this candidate.
 *
 * What is left for a person is the part only a person has: the limitation, the
 * follow-up owner, and the sign-off.
 *
 * The release rule is fail-closed. `readinessEvidenceFindings` returns what
 * blocks the release, and an empty result is the only thing that clears it — a
 * missing exercise blocks exactly as a failed one does, because a candidate
 * nobody drilled and a candidate whose drill failed are equally unproven.
 */

/**
 * Every way a candidate can fail the release rule, as stable identifiers a
 * finding can be reported and tracked under.
 */
export const READINESS_EVIDENCE_CHECKS = [
  "readiness.familyExercised",
  "readiness.exercisePassed",
  "readiness.candidateMatches",
  "readiness.recoveryTimeTarget",
  "readiness.exceptionOwned",
  "readiness.exerciseSignedOff",
  "readiness.evidenceLinkPrivate",
  "readiness.evidenceSanitized",
  "readiness.projectOwnerSignOff",
  "readiness.familyRecognised",
] as const;

export type ReadinessEvidenceCheck = (typeof READINESS_EVIDENCE_CHECKS)[number];

export type ReadinessExerciseResult = "PASSED" | "FAILED" | "NOT_APPLICABLE";

export interface ReadinessExercise {
  /** Stable identifier for what was exercised, e.g. `backup-restoration-drill`. */
  exercise: string;
  family: IncidentFamily;
  release: string;
  schemaVersion: string;
  fixtureManifestVersion: string;
  persistedOperationManifestVersion: string | null;
  /** Stable test identifiers, so a reader can rerun exactly what was run. */
  testIdentifiers: readonly string[];
  exercisedAt: Date;
  measuredRecoveryMilliseconds: number | null;
  result: ReadinessExerciseResult;
  /** A link to private provider evidence, never the evidence itself. */
  evidenceLink: string;
  limitation: string | null;
  followUpOwner: string | null;
  correlationId: string;
  signedOffBy: string | null;
  signedOffAt: Date | null;
}

export interface ReadinessCandidate {
  /** The exact commit the candidate is, which is also its release identifier. */
  release: string;
  schemaVersion: string;
  fixtureManifestVersion: string;
  persistedOperationManifestVersion: string | null;
  /**
   * Digests of the policy documents this candidate was evidenced against. The
   * operator guide is mutable by design, so "the drill passed" means nothing
   * without saying which thresholds it passed against.
   */
  configurationFingerprints: Readonly<Record<string, string>>;
  generatedAt: Date;
  /** Who accepted the record. The release rule has no unsigned path. */
  projectOwnerSignOff: string | null;
}

export interface ReadinessEvidenceRow {
  family: IncidentFamily;
  familyLabel: string;
  /** Read from the alert policy, never retyped into the record. */
  conditions: readonly {
    id: string;
    severity: AlertCondition["severity"];
    route: AlertCondition["route"];
    detection: AlertCondition["detection"];
    threshold: AlertCondition["threshold"];
    confirmation: AlertCondition["confirmation"];
    clearing: AlertCondition["clearing"];
  }[];
  exercises: readonly ReadinessExercise[];
}

export interface ReadinessEvidenceRecord {
  candidate: ReadinessCandidate;
  rows: readonly ReadinessEvidenceRow[];
  /**
   * Exercises whose stored incident family this build no longer defines, most
   * likely because a family was renamed after they were recorded. They belong
   * to no row, and the record names them rather than losing them.
   */
  unrecognisedExercises: readonly ReadinessExercise[];
  recoveryTimeTargetMilliseconds: number;
}

export interface ReadinessEvidenceFinding {
  check: ReadinessEvidenceCheck;
  family: IncidentFamily | null;
  exercise: string | null;
  /** Privacy-safe: names what is missing or wrong, never the offending value. */
  detail: string;
}

/**
 * Assembles the record for one candidate from the policy and the exercises that
 * ran against it. It never filters or rewrites an exercise: a failing row
 * belongs in the record, where the release rule can block on it.
 */
export function buildReadinessEvidenceRecord(input: {
  candidate: ReadinessCandidate;
  exercises: readonly ReadinessExercise[];
}): ReadinessEvidenceRecord {
  const rows = (Object.keys(INCIDENT_FAMILIES) as IncidentFamily[]).map((family) => ({
    family,
    familyLabel: INCIDENT_FAMILIES[family],
    conditions: ALERT_CONDITIONS.filter((condition) => condition.family === family).map(
      (condition) => ({
        id: condition.id,
        severity: condition.severity,
        route: condition.route,
        detection: condition.detection,
        threshold: condition.threshold,
        confirmation: condition.confirmation,
        clearing: condition.clearing,
      }),
    ),
    exercises: input.exercises
      .filter((exercise) => exercise.family === family)
      .sort((left, right) => left.exercise.localeCompare(right.exercise)),
  }));

  return {
    candidate: input.candidate,
    rows,
    // An exercise stored under a family this build cannot name belongs to
    // neither row above, so it would vanish from the record entirely. The
    // release still fails closed — its family reports "not exercised" — but the
    // owner would be told nothing ran when something did, and would rerun it
    // rather than fix the rename. Carried out separately so the record can say
    // so plainly.
    unrecognisedExercises: input.exercises.filter(
      (exercise) => !isIncidentFamily(exercise.family),
    ),
    recoveryTimeTargetMilliseconds: RECOVERY_TIME_TARGET_MILLISECONDS,
  };
}

/**
 * Everything that blocks this candidate's public release. An empty result is
 * the pass; there is no severity ordering here because the release rule treats
 * all of them the same way.
 */
export function readinessEvidenceFindings(
  record: ReadinessEvidenceRecord,
): ReadinessEvidenceFinding[] {
  const findings: ReadinessEvidenceFinding[] = [];
  const add = (
    check: ReadinessEvidenceCheck,
    family: IncidentFamily | null,
    exercise: string | null,
    detail: string,
  ) => findings.push({ check, family, exercise, detail });

  if (!record.candidate.projectOwnerSignOff?.trim()) {
    add("readiness.projectOwnerSignOff", null, null, "the record carries no Project Owner sign-off");
  }

  for (const exercise of record.unrecognisedExercises) {
    add(
      "readiness.familyRecognised",
      null,
      exercise.exercise,
      "the exercise names an incident family this build does not define",
    );
  }

  for (const row of record.rows) {
    if (row.exercises.length === 0) {
      add(
        "readiness.familyExercised",
        row.family,
        null,
        `no exercise ran against this candidate for ${row.familyLabel}`,
      );
      continue;
    }

    for (const exercise of row.exercises) {
      if (exercise.result === "FAILED") {
        add("readiness.exercisePassed", row.family, exercise.exercise, "the exercise failed");
      }

      // An exercise run against a different schema, manifest, or release proves
      // something about a candidate that is not this one. ADR 0018's
      // demonstration re-exercises after a material change precisely so this
      // cannot be waved through.
      if (
        exercise.release !== record.candidate.release
        || exercise.schemaVersion !== record.candidate.schemaVersion
        || exercise.fixtureManifestVersion !== record.candidate.fixtureManifestVersion
      ) {
        add(
          "readiness.candidateMatches",
          row.family,
          exercise.exercise,
          "the exercise ran against a different release, schema, or fixture manifest",
        );
      }

      if (
        exercise.measuredRecoveryMilliseconds !== null
        && exercise.measuredRecoveryMilliseconds > record.recoveryTimeTargetMilliseconds
      ) {
        add(
          "readiness.recoveryTimeTarget",
          row.family,
          exercise.exercise,
          `measured recovery exceeded the ${record.recoveryTimeTargetMilliseconds / 60_000}-minute target`,
        );
      }

      // A row that is neither a pass nor a failure has to say why, and name who
      // carries it. "Not applicable" with nobody's name on it is how an
      // unexercised family leaves a record looking complete.
      if (exercise.result === "NOT_APPLICABLE" && !exercise.limitation) {
        add(
          "readiness.exceptionOwned",
          row.family,
          exercise.exercise,
          "an inapplicable exercise records no limitation",
        );
      }
      if (Boolean(exercise.limitation) !== Boolean(exercise.followUpOwner)) {
        add(
          "readiness.exceptionOwned",
          row.family,
          exercise.exercise,
          exercise.limitation
            ? "a recorded limitation names no follow-up owner"
            : "a follow-up owner is named for no recorded limitation",
        );
      }

      if (!exercise.signedOffBy || !exercise.signedOffAt) {
        add(
          "readiness.exerciseSignedOff",
          row.family,
          exercise.exercise,
          "the exercise carries no Project Owner sign-off",
        );
      }

      if (!isPrivateEvidenceLink(exercise.evidenceLink)) {
        add(
          "readiness.evidenceLinkPrivate",
          row.family,
          exercise.exercise,
          "the evidence link does not point at private provider evidence",
        );
      }

      for (const [field, text] of [
        ["limitation", exercise.limitation],
        ["follow-up owner", exercise.followUpOwner],
      ] as const) {
        const shape = text ? rawEvidenceShape(text) : undefined;
        if (shape) {
          add(
            "readiness.evidenceSanitized",
            row.family,
            exercise.exercise,
            `the ${field} carries ${shape}, which belongs only with its provider`,
          );
        }
      }
    }
  }

  return findings;
}

/**
 * Renders the record as the privacy-safe Markdown artifact a release publishes.
 *
 * It is rendered from the record rather than assembled as text so the findings
 * above are computed over the same values the reader sees. A row's policy half
 * is summarised rather than dumped: the alert policy is the canonical statement
 * of it and is in the repository, and the record's job is to say what this
 * candidate proved against it.
 */
export function renderReadinessEvidence(record: ReadinessEvidenceRecord): string {
  const findings = readinessEvidenceFindings(record);
  const minutes = (milliseconds: number | null) =>
    milliseconds === null ? "—" : `${(milliseconds / 60_000).toFixed(1)} min`;
  const cell = evidenceCell;

  const lines = [
    "# Operational readiness evidence",
    "",
    `Release \`${record.candidate.release}\`, generated ${record.candidate.generatedAt.toISOString()}.`,
    "",
    findings.length === 0
      ? "**Release rule: every applicable row passes.**"
      : `**Release rule: BLOCKED by ${findings.length} finding(s).**`,
    "",
    "## Candidate metadata",
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Candidate commit and release | ${record.candidate.release} |`,
    `| Schema version | ${record.candidate.schemaVersion} |`,
    `| Fixture-manifest version | ${record.candidate.fixtureManifestVersion} |`,
    `| Persisted-operation-manifest version | ${cell(record.candidate.persistedOperationManifestVersion)} |`,
    ...Object.entries(record.candidate.configurationFingerprints)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, digest]) => `| ${name} fingerprint | \`${digest}\` |`),
    `| Evidence generated at | ${record.candidate.generatedAt.toISOString()} |`,
    `| Recovery-time target | ${minutes(record.recoveryTimeTargetMilliseconds)} |`,
    `| Project Owner sign-off | ${cell(record.candidate.projectOwnerSignOff)} |`,
    "",
    "## Readiness rows",
    "",
    "| Incident family | Conditions | Exercise | Tests | Exercised | Measured recovery | Result | Evidence | Limitation/follow-up | Sign-off |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const row of record.rows) {
    const conditions = row.conditions.map((condition) => condition.id).join("<br>");
    if (row.exercises.length === 0) {
      lines.push(
        `| ${row.familyLabel} | ${conditions} | — | — | — | — | **NOT EXERCISED** | — | — | — |`,
      );
      continue;
    }
    for (const exercise of row.exercises) {
      lines.push([
        "",
        row.familyLabel,
        conditions,
        cell(exercise.exercise),
        exercise.testIdentifiers.map((test) => cell(test)).join("<br>") || "—",
        exercise.exercisedAt.toISOString(),
        minutes(exercise.measuredRecoveryMilliseconds),
        exercise.result,
        `[private evidence](${exercise.evidenceLink})`,
        exercise.limitation
          ? `${cell(exercise.limitation)} (${cell(exercise.followUpOwner)})`
          : "—",
        exercise.signedOffAt
          ? `${cell(exercise.signedOffBy)} ${exercise.signedOffAt.toISOString()}`
          : "—",
        "",
      ].join(" | ").trim());
    }
  }

  if (record.unrecognisedExercises.length > 0) {
    lines.push(
      "",
      "## Exercises in no row",
      "",
      "These ran and were recorded, but name an incident family this build does",
      "not define — most likely a family renamed after they were recorded.",
      "",
      "| Exercise | Stored family | Result | Exercised |",
      "| --- | --- | --- | --- |",
      ...record.unrecognisedExercises.map(
        (exercise) =>
          `| ${cell(exercise.exercise)} | ${cell(exercise.family)} | ${exercise.result} | ${exercise.exercisedAt.toISOString()} |`,
      ),
    );
  }

  lines.push("", "## Release-blocking findings", "");
  if (findings.length === 0) {
    lines.push("None. Every applicable row passes for this exact candidate.");
  } else {
    lines.push(
      "| Check | Family | Exercise | Detail |",
      "| --- | --- | --- | --- |",
      ...findings.map(
        (finding) =>
          `| ${finding.check} | ${finding.family ?? "—"} | ${finding.exercise ?? "—"} | ${finding.detail} |`,
      ),
    );
  }

  lines.push(
    "",
    "## Evidence handling",
    "",
    "Safe setting names, fingerprints, aggregate counts, correlations, and provider",
    "links only. Credentials, tokens, private configuration, raw source addresses,",
    "personal data, notification content, complete GraphQL variables, attack",
    "payloads, and raw provider responses stay with their originating provider.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

/**
 * Records one exercise against one candidate, replacing an earlier run of the
 * same exercise for the same release. The record carries the outcome that
 * stands; the attempts live in the workflow runs the evidence link points at.
 *
 * It refuses what the record could not publish rather than storing it and
 * failing at render time, so a drill that would have written a credential into
 * the evidence fails at the drill, where the owner is watching.
 */
export async function recordReadinessExercise(
  db: Database,
  exercise: ReadinessExercise,
): Promise<void> {
  if (!isPrivateEvidenceLink(exercise.evidenceLink)) {
    throw new Error("A readiness exercise links to private provider evidence over https, without a query string");
  }
  for (const text of [exercise.limitation, exercise.followUpOwner]) {
    const shape = text ? rawEvidenceShape(text) : undefined;
    if (shape) {
      throw new Error(`A readiness exercise records no raw evidence; found ${shape}`);
    }
  }

  const values = {
    release: exercise.release,
    exercise: exercise.exercise,
    incident_family: exercise.family,
    schema_version: exercise.schemaVersion,
    fixture_manifest_version: exercise.fixtureManifestVersion,
    persisted_operation_manifest_version: exercise.persistedOperationManifestVersion,
    test_identifiers: [...exercise.testIdentifiers],
    exercised_at: exercise.exercisedAt,
    measured_recovery_milliseconds: exercise.measuredRecoveryMilliseconds,
    result: exercise.result,
    evidence_link: exercise.evidenceLink,
    limitation: exercise.limitation,
    follow_up_owner: exercise.followUpOwner,
    correlation_id: exercise.correlationId,
    signed_off_by: exercise.signedOffBy,
    signed_off_at: exercise.signedOffAt,
  };

  await db
    .insertInto("operational_readiness_exercises")
    .values(values)
    .onConflict((conflict) =>
      conflict.columns(["release", "exercise"]).doUpdateSet(values),
    )
    .execute();
}

/** Every exercise recorded against one candidate. */
export async function readinessExercisesFor(
  db: Database,
  release: string,
): Promise<ReadinessExercise[]> {
  const rows = await db
    .selectFrom("operational_readiness_exercises")
    .selectAll()
    .where("release", "=", release)
    .orderBy("incident_family")
    .orderBy("exercise")
    .execute();

  return rows.map((row) => ({
    exercise: row.exercise,
    // Carried as stored, not narrowed away. A family this build cannot name is
    // still an exercise that ran; `buildReadinessEvidenceRecord` separates
    // those out so the record can name them rather than lose them.
    family: row.incident_family as IncidentFamily,
    release: row.release,
    schemaVersion: row.schema_version,
    fixtureManifestVersion: row.fixture_manifest_version,
    persistedOperationManifestVersion: row.persisted_operation_manifest_version,
    testIdentifiers: row.test_identifiers,
    exercisedAt: row.exercised_at,
    measuredRecoveryMilliseconds: row.measured_recovery_milliseconds,
    result: row.result,
    evidenceLink: row.evidence_link,
    limitation: row.limitation,
    followUpOwner: row.follow_up_owner,
    correlationId: row.correlation_id,
    signedOffBy: row.signed_off_by,
    signedOffAt: row.signed_off_at,
  }));
}
