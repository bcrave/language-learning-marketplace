# Public demonstration operator guide

This mutable policy defines alert thresholds, containment, diagnosis, recovery, and clearing evidence for the best-effort public portfolio demonstration. It creates no SLA, response-time promise, support window, pager duty, or 24/7 on-call expectation. The Project Owner operates it through the private surfaces defined by the [threat model](../threat-model.md).

## Alert model and routes

- **Immediate private alert:** confirmed unsafe admission, possible durable-state corruption, secret or private-data exposure, unrecoverable state, failed recovery, or imminent cost-ceiling breach. “Immediate” describes dispatch after confirmation, not an owner response commitment.
- **Owner attention:** the deployment remains safe and recoverable, but manual action is required.
- Automatically recovered transients remain only in privacy-filtered telemetry and owner diagnostics.

An incident sends one confirmation alert, one additional alert if severity rises, and one recovery notification—never periodic reminders. The same incident-family and safe-failure fingerprint joins an open incident; recurrence after clearing opens a new correlated incident.

Use Sentry email for application, worker, reconciliation, third-party-integration, Sentry-pattern, and abuse incidents; GitHub Actions notifications for deployment, Canonical Data Rebuild, backup verification, and recovery-drill failures; and Railway billing email for its native warning and hard limit. The owner diagnostics summary is current-state evidence, not an alert channel. There is no pager, SMS, public issue, User notification, external uptime monitor, or public status page. If an originating service cannot emit recovery, send a privacy-safe recovery event through Sentry.

“Third-party integration” means a runtime boundary such as Auth0 or Sentry. PostgreSQL, worker, and Caddy are internal; GitHub Actions and Railway deployment control use their own runbooks; simulated email, classroom, and subscription adapters use worker or notification reconciliation.

## Incident runbooks

### API and database readiness

- **Detect:** probe liveness and readiness internally every 30 seconds. Readiness fails closed when PostgreSQL access or schema compatibility is unverified. Owner attention follows three failed readiness probes (90 seconds); schema mismatch alerts after one confirmed probe. For liveness, allow platform restart and alert after two failed restarts or five minutes without health, whichever comes first.
- **Contain and diagnose:** keep readiness false; inspect PostgreSQL reachability, schema version, release and migration identifiers, and correlated privacy-filtered failures.
- **Recover and clear:** restore reachability or deploy a schema-compatible application; never reverse a migration automatically. Clear after three consecutive healthy probes, notify recovery once, and retain evidence.

### Worker heartbeat, queue backlog, and exhausted jobs

- **Detect:** write the PostgreSQL heartbeat every 60 seconds; owner attention when it is over three minutes stale. Measure runnable jobs only. Alert when oldest runnable age exceeds 10 minutes or runnable depth exceeds 100 continuously for five minutes. The first exhausted job creates its domain reconciliation task and grouped owner-attention alert.
- **Diagnose:** record worker release, heartbeat age, runnable age/depth, retry state, job type, safe failure code, and correlations.
- **Recover and clear:** restore the worker, safely retry idempotent work, or reasonedly reconcile/discard exhausted jobs. Clear heartbeat/backlog after three healthy minutes; exhaustion clears only after every affected job reaches a safe disposition.

### Canonical Data Rebuild and hourly fixture reconciliation

- **Detect:** routine rebuild gets one automatic retry. If both attempts fail but verified rollback restores the prior state, send owner attention; if rollback or health cannot establish safety, keep readiness false and alert immediately. Owner attention also follows 26 hours without a successful rebuild. Hourly reconciliation retries once after 10 minutes and alerts after two consecutive failed runs or 150 minutes without success.
- **Diagnose:** inspect maintenance-lease owner, schema and fixture-manifest versions, generation, attempt outcomes, aggregate validation, Audit Entries, and safe failure codes. Any failed invariant rolls back its transaction.
- **Recover and clear:** follow [Canonical Data Rebuild and recovery](#canonical-data-rebuild-and-recovery). Clear only after the operation succeeds and every aggregate invariant passes.

### Notification reconciliation

- **Detect:** each Notification Intent gets the initial attempt and retries after 1, 5, and 30 minutes. Retryable failures remain telemetry-only until the fourth failure; exhaustion creates one administrator task per intent and an alert grouped by channel and safe failure fingerprint.
- **Diagnose:** use policy identifier, channel, attempt count, safe failure code, timing, and correlation—never content or recipient details.
- **Recover and clear:** never blindly retry an ambiguous third-party timeout unless the adapter queries outcome or enforces idempotency; otherwise mark `delivery-uncertain`. Clear when every affected intent has a Delivery Receipt of delivered, safely retried, or administrator-suppressed with reason. Never notify about notification failure.

### Deployment and deployed smoke tests

- **Detect:** each service has 10 minutes to become healthy and must produce three consecutive 30-second readiness successes. After API health, require a worker heartbeat within three minutes; deploy frontend last. The complete anonymous and shared-role smoke suite has 10 minutes. Any failed stage stops later stages and sends owner attention.
- **Contain and recover:** if a live release becomes unhealthy or violates a data/security invariant, alert immediately and restore the last compatible application release; never reverse migrations automatically.
- **Clear:** new or restored release passes readiness, heartbeat, and complete deployed smoke suite. Record release, schema, persisted-operation manifest, and correlations.

### Backups and recovery verification

- **Detect:** check provider backup status once after the expected daily window. Owner attention follows 26 hours without a daily backup or eight days without a weekly backup; alert immediately at 48 hours without a valid backup. A failed verification or drill blocks release; inability to establish any recoverable state alerts immediately.
- **Verify:** isolated restore drills prove schema compatibility, canonical aggregates, and sampled ledger invariants within the accepted 60-minute recovery-time target.
- **Clear:** verify a new backup or pass an isolated restore; retain failed evidence and measured recovery duration.

### Observed third-party-integration failures

- **Detect:** do not continuously poll providers. Evaluate actual calls, scheduled work, deployed smokes, and explicit recovery checks. Owner attention follows exhausted adapter retries or five failures for one integration across at least two correlations in five minutes. Alert immediately for credential rejection suggesting revocation/misconfiguration, fail-open authorization, accepted invalid signed data, or possible duplicated/corrupted business outcome.
- **Diagnose:** retain integration, operation class, safe failure code, counts, timing, and correlations—never tokens or raw responses.
- **Recover and clear:** retry only established safe/idempotent operations. Clear after an explicit integration smoke and three observed successes; low traffic requires manual confirmation.

### Sentry failure patterns

- **Detect:** owner attention for a new unhandled server fingerprint at five events in five minutes, any 10 unhandled server errors in 10 minutes, or a browser fingerprint at 10 events across at least three correlations in 10 minutes. During the first hour after deployment, alert at three occurrences of a new server or browser fingerprint in 10 minutes. Alert immediately for authorization bypass, secret/private-data exposure, corrupted durable state, or violated Class Credit or Booking invariant.
- **Recover and clear:** group repeats, inspect release/operation and safe breadcrumbs, exercise the journey, and restore a compatible release for regressions. Clear after the journey passes and the fingerprint stays absent for 30 minutes. Sentry ingestion failure does not block work; treat locally observed transport failure as an integration incident.

### Abusive traffic and credential exposure

- **Detect:** shared demo credentials, public Auth0 client configuration, and browser Sentry DSN are not exposures. Owner attention follows one verified source hitting a limit in three consecutive one-minute windows, 300 aggregate HTTP 429 responses in five minutes, or 50 denied authorization attempts across sources in five minutes. Alert immediately when a runtime secret leaves its approved store, an internal/owner-only endpoint is publicly reached, authorization fails open, or an unauthorized mutation commits.
- **Contain:** availability may be sacrificed. Retain limits, disable the affected shared identity or operation, revoke exposed secrets, and set readiness false whenever safety is uncertain. Broad HTTP 403 responses with `source.unverified` are a Caddy trusted-proxy misconfiguration failing closed, not abuse: restore matching proxy-secret configuration on both services rather than relaxing the limit.
- **Clear:** 30 minutes below every abuse threshold plus an authorization smoke. Exposure also requires rotation/revocation, any needed redeployment, and proof that the old credential fails. Retain aggregate counts and correlations, not source addresses or attack payloads.

### Deployment-cost ceiling

- **Detect:** retain Railway's native $8 billing-cycle warning and $15 hard usage limit. Check actual and projected usage daily and after deployments, projecting with the greater of the last 24-hour rate and trailing seven-day daily average. Owner attention at $8 actual or $12 projected; immediate alert at $12 actual or a projection reaching $15 within 72 hours.
- **Contain and diagnose:** the $15 hard limit may stop the demo; the ceiling outranks availability. Inspect per-service usage, replicas, volumes, and jobs; stop unintended consumption.
- **Clear:** projection below $12 after verified change or cycle reset. A hard-limit incident also proves no unintended service, replica, volume, or job remains.

## Canonical Data Rebuild and recovery

Canonical Data Rebuild returns mutable synthetic marketplace state to its versioned fixture baseline. It does not deploy, recreate infrastructure/provider identities, or restore a backup.

Routine scheduled/manual rebuild and indeterminate-state recovery are separate protected GitHub Actions workflows. A manual run fixes `production`, takes a non-secret reason and explicit acknowledgement that maintenance begins and reviewer mutations are discarded, then requires protected-environment approval. Shared identities and Platform Administrators have no access.

Routine rebuild has one automatic retry and verified rollback. After verified rollback, reopen the demo and send owner attention; any later attempt is a fresh dispatch with a new reason and correlation, never GitHub job rerun. An indeterminate state blocks routine rebuild. Cancellation before lease acquisition is safe; after quiescence, cleanup must verify prior state or keep readiness false as indeterminate. Force-cancel after quiescence only to contain a greater threat.

Recovery is diagnosis-first. A protected assessment keeps maintenance active and classifies database reachability, schema compatibility, lease ownership, fixture generation, Audit Entries, and aggregate invariants. It may recommend only: verify and reopen current state; perform a clean Canonical Data Rebuild; or invoke established backup restoration. A separate protected dispatch authorizes state change and references the incident correlation. Direct provider access is break glass only when approved workflows cannot restore safety.

### Return to service

1. Identify alert, workflow, safe failure code, and correlation.
2. Confirm no deployment or rebuild unexpectedly owns the maintenance lease.
3. Choose a fresh rebuild only after verified rollback; otherwise choose assessment-first recovery.
4. Perform only the assessed repair. Use break glass solely to restore safety or the normal workflow path.
5. Verify canonical aggregates and ledger invariants.
6. Require schema compatibility, three readiness successes, fresh worker heartbeat, fixture reconciliation, and complete deployed role smokes.
7. Confirm exactly one terminal Audit Entry for the rebuild attempt and separate correlated Audit Entries for state-changing recovery.
8. Reopen reviewer access, verify maintenance response is gone, and send one recovery notification.
9. Retain only sanitized evidence and follow-up; rotate any secret found outside its store.

Never clear maintenance from elapsed time or intuition alone.

## Evidence boundary

Each incident records detection/confirmation times, severity/family/fingerprint, release and schema/fixture/persisted-operation manifest versions, safe failure code, aggregate counts and correlations, containment/recovery, verification, clear time, and follow-up.

Exclude credentials, tokens, source addresses, personal data, notification content, complete GraphQL variables, attack payloads, and raw provider responses. Operational observations remain in filtered logs and Sentry. Alerts do not create Audit Entries merely for alerting; every state-changing containment or recovery action creates the Audit Entries required by the canonical Audit Log policy. Recovery requires explicit healthy probes, smoke journeys, invariant validation, terminal receipts, isolated restore, or revocation proof plus the family-specific confirmation window.

The required dated evidence record is defined in [operational readiness evidence](readiness-evidence.md). Security-specific proof additionally follows the [Security Release Gate](../security-verification.md).
