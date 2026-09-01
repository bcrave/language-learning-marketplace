-- The [Security Release Gate](../../docs/security-verification.md) is
-- fail-closed, and its record has to name "every required stable check
-- identifier and result" for one exact candidate. A record assembled from what
-- somebody typed into a workflow form at release time would satisfy that shape
-- and none of its meaning: nothing would connect a row saying an abuse case
-- passed to an abuse case anybody performed.
--
-- So results write here as each check produces one — a CI suite the moment it
-- finishes, an owner-performed abuse case or configuration assertion the moment
-- it is recorded — and the record is read back out of them. A catalog check
-- with no row for the candidate is a missing required result the gate blocks
-- on, rather than an empty cell nobody noticed.
create table security_gate_results (
  id uuid primary key default gen_random_uuid(),
  -- The exact candidate. The policy says any content change creates a new
  -- candidate, and "the same check, but on the release before this one" is the
  -- distinction the whole record exists to keep.
  release text not null,
  -- A stable identifier from the verification catalog. Stored as text rather
  -- than constrained here: a check renamed in the catalog leaves rows this
  -- build cannot name, and the record says so plainly instead of the database
  -- refusing to hand them back at all.
  check_id text not null,
  -- SUITE, DEPLOYED, OWNER, or DRILL. Carried with the row because it decides
  -- what the gate demands alongside the result: an owner-performed case needs a
  -- dated sign-off, an automated suite needs only its workflow run.
  evidence_kind text not null check (evidence_kind in ('SUITE', 'DEPLOYED', 'OWNER', 'DRILL')),
  -- NOT_RUN is a first-class outcome rather than an absent row. A check that
  -- was deliberately skipped and one nobody ever ran block the release
  -- identically, but only the first can explain itself.
  outcome text not null check (outcome in ('PASSED', 'FAILED', 'NOT_RUN')),
  observed_at timestamptz not null,
  -- A link to private provider evidence — a workflow run, a Railway or Sentry
  -- view. The raw evidence stays with its provider; this carries the pointer,
  -- and the application refuses anything that is not one.
  evidence_link text not null,
  -- Privacy-safe: what was seen, never the value that was seen. The policy
  -- forbids copying credentials, tokens, private configuration, raw source
  -- addresses, personal data, attack payloads, complete GraphQL variables, or
  -- raw provider responses into the record.
  observation text not null,
  -- The accepted residual risk a failing result maps wholly to, where one does.
  -- A failed required check cannot be waived; only a finding already inside a
  -- documented residual risk may proceed, and then only with dated sign-off.
  residual_risk text,
  correlation_id text not null,
  signed_off_by text,
  signed_off_at timestamptz,
  check ((signed_off_by is null) = (signed_off_at is null)),
  -- A waived result that nobody signed is the exception the policy explicitly
  -- refuses: "an existing documented residual risk may be referenced with dated
  -- Project Owner sign-off".
  check (residual_risk is null or signed_off_by is not null)
);

-- Rerunning a check for the same candidate replaces its row: the record carries
-- the outcome that stands, not every attempt. The attempts live in the workflow
-- runs the evidence link points at.
create unique index security_gate_results_candidate
  on security_gate_results (release, check_id);

create index security_gate_results_recent
  on security_gate_results (observed_at desc);

-- Deliberately outside migration 0032's maintenance write guard, for the same
-- reason as the readiness exercises in 0035: a gate check can be recorded while
-- the marketplace is quiesced, and evidence that could only be written during
-- normal service would be missing from exactly the candidates that needed it.
