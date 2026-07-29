# Operational readiness evidence

This document is the version-controlled template for candidate-specific operational evidence. Completed records are privacy-safe GitHub Actions artifacts tied to an exact release; private raw evidence stays in its originating provider.

## Release rule

Public release is blocked until every applicable row passes and no unresolved finding threatens state integrity, private data, secrets, recoverability, or the $15 cost ceiling. Drills repeat after a relevant material change. The [operator guide](operator-guide.md) owns mutable thresholds and runbooks; the [security verification policy](../security-verification.md) owns the Security Gate Record.

## Candidate metadata

| Field | Value |
| --- | --- |
| Candidate commit and release | |
| Schema version | |
| Fixture-manifest version | |
| Persisted-operation-manifest version | |
| Operator-guide version | |
| Evidence generated at | |
| Project Owner sign-off | |

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

## Evidence handling

Record safe setting names, fingerprints, aggregate counts, correlations, workflow/provider links, and outcomes. Never copy credentials, tokens, private configuration, raw source addresses, personal data, notification content, complete GraphQL variables, attack payloads, raw provider responses, or raw private evidence into this record.
