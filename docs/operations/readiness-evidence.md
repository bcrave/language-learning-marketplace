# Operational readiness evidence

This document is the version-controlled template for candidate-specific operational evidence. Completed records are privacy-safe GitHub Actions artifacts tied to an exact release; private raw evidence stays in its originating provider.

## Release rule

Public release is blocked until every applicable row passes and no unresolved finding threatens state integrity, private data, secrets, recoverability, or the $15 cost ceiling. Drills repeat after a relevant material change. The [operator guide](operator-guide.md) owns mutable thresholds and runbooks; the [security verification policy](../security-verification.md) owns the Security Gate Record.

## How a completed record is produced

The record is generated, not filled in. The repository's **Readiness Evidence**
workflow reads two things and combines them:

- the alert policy, for every family's conditions, thresholds, confirmation
  steps, alert routes, and clearing rules — so a row can never claim a threshold
  the deployment does not implement; and
- the readiness exercises that actually ran against this exact release, each
  recorded by the workflow that ran it, with its stable test identifiers,
  measured recovery duration, result, and private evidence link.

Only three things are supplied by a person, because only a person has them: a
limitation, its follow-up owner, and sign-off.

The generator is fail-closed and its job fails when any row blocks the release.
A family with no exercise for this candidate blocks exactly as a failed exercise
does — a candidate nobody drilled and a candidate whose drill failed are equally
unproven — and an exercise that ran against a different release, schema version,
or fixture-manifest version does not carry forward.

## Candidate metadata

| Field | Value |
| --- | --- |
| Candidate commit and release | |
| Schema version | |
| Fixture-manifest version | |
| Persisted-operation-manifest version | |
| Operator-guide version | |
| Configuration fingerprints | |
| Evidence generated at | |
| Project Owner sign-off | |

Configuration fingerprints are content digests of the mutable policy documents
the candidate was evidenced against — the operator guide, notification policy,
threat model, security verification policy, and fixture manifest. The operator
guide is mutable by design, so "the drill passed" means nothing without saying
which thresholds it passed against.

## Readiness rows

Create one row for each incident family below. Each row records its stable test identifiers, threshold and confirmation-window tests, initial/escalation/deduplication/recovery-route tests, exercise date, measured recovery duration, result, privacy-safe evidence link, unresolved limitation, follow-up owner, and Project Owner sign-off.

| Incident family | Threshold and confirmation | Alert-route lifecycle | Recovery proof | Result/evidence | Limitation/follow-up | Sign-off |
| --- | --- | --- | --- | --- | --- | --- |
| API and database readiness | | | | | | |
| Worker heartbeat, backlog, exhausted jobs | | | | | | |
| Canonical Data Rebuild and fixture reconciliation | | | | | | |
| Notification reconciliation | | | | | | |
| Deployment and deployed smoke tests | | | | | | |
| Backups and recovery verification | | | | | | |
| Third-party integrations | | | | | | |
| Sentry failure patterns | | | | | | |
| Abusive traffic and credential exposure | | | | | | |
| Deployment-cost ceiling | | | | | | |

The cost row additionally records seven measured days, total and per-service usage, the projection calculation, Railway warning proof, and hard-limit configuration. Every row records the release and relevant manifest identifiers used by its exercise.

The backup and recovery row carries two exercises rather than one, because they
prove different things and neither substitutes for the other: an isolated
`backup-restoration-drill` and a `change-triggered-recovery-drill` run against
the deployment. Both are described in the [operator guide](operator-guide.md#recovery-drills).
A drill records the deployed role journeys and the shared-identity binding as
not applicable where it genuinely could not drive them, and a not-applicable
result requires a limitation and a named follow-up owner — a blank exception is
how an unexercised family leaves a record looking complete.

Measured recovery is compared against the 60-minute recovery-time target of ADR
0023, and exceeding it fails the exercise even when every invariant held.

## Break glass

A candidate that required [break glass](operator-guide.md#break-glass-and-the-return-to-the-normal-path)
is not disqualified, but the episode is recorded as a limitation with a
follow-up owner, naming the workflow that could not run, the narrowest action
taken, the incident correlation it was recorded against, and any credential
rotated afterwards. A candidate that needed break glass and does not say so is
the disqualifying case.

## Evidence handling

Record safe setting names, fingerprints, aggregate counts, correlations, workflow/provider links, and outcomes. Never copy credentials, tokens, private configuration, raw source addresses, personal data, notification content, complete GraphQL variables, attack payloads, raw provider responses, or raw private evidence into this record.
