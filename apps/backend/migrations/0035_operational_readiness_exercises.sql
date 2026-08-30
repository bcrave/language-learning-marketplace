-- The [operational readiness evidence](../../docs/operations/readiness-evidence.md)
-- record has to be "dated and tied to the exact release candidate". A record
-- assembled from what somebody typed into a workflow form at release time would
-- satisfy the shape and none of the meaning: nothing would connect a row saying
-- a restore drill passed to a drill that actually ran, against this schema, on
-- this candidate.
--
-- So the exercises write here as they happen, and the release record is read
-- back out of them. A family with no passing row for the candidate is a missing
-- exercise the release rule blocks on, rather than an empty cell nobody noticed.
create table operational_readiness_exercises (
  id uuid primary key default gen_random_uuid(),
  -- The exact candidate. ADR 0018's demonstration re-exercises after a material
  -- change, and "the same drill, but on the release before this one" is the
  -- distinction the whole record exists to keep.
  release text not null,
  -- What was exercised, as a stable identifier. Several exercises share an
  -- incident family — an isolated backup restoration and a change-triggered
  -- recovery drill both prove "Backups and recovery verification" — and
  -- collapsing them onto the family would silently discard one of the two.
  exercise text not null,
  incident_family text not null,
  schema_version text not null,
  fixture_manifest_version text not null,
  persisted_operation_manifest_version text,
  -- The stable test identifiers the readiness record asks each row to carry, so
  -- a reader can rerun exactly what was run.
  test_identifiers text[] not null default '{}',
  exercised_at timestamptz not null,
  -- Measured against the operator guide's 60-minute recovery-time target. Null
  -- where the exercise measures no recovery, which is not the same as zero.
  measured_recovery_milliseconds integer
    check (measured_recovery_milliseconds is null or measured_recovery_milliseconds >= 0),
  result text not null check (result in ('PASSED', 'FAILED', 'NOT_APPLICABLE')),
  -- A link to private provider evidence — a workflow run, a Railway or Sentry
  -- view. The raw evidence stays with its provider; this column carries the
  -- pointer, and the application refuses anything that is not one.
  evidence_link text not null,
  limitation text,
  follow_up_owner text,
  correlation_id text not null,
  -- Project Owner sign-off, which is per exercise rather than per record: an
  -- unsigned row is evidence that exists but has not been accepted.
  signed_off_by text,
  signed_off_at timestamptz,
  check ((signed_off_by is null) = (signed_off_at is null)),
  -- A follow-up owner without a limitation, or a limitation nobody owns, is a
  -- half-recorded exception. The release rule reads both together.
  check ((limitation is null) = (follow_up_owner is null))
);

-- Rerunning an exercise for the same candidate replaces its row: the record
-- carries the outcome that stands, not every attempt. The attempt history lives
-- in the workflow runs the evidence link points at.
create unique index operational_readiness_exercises_candidate
  on operational_readiness_exercises (release, exercise);

create index operational_readiness_exercises_recent
  on operational_readiness_exercises (exercised_at desc);

-- Deliberately outside migration 0032's maintenance write guard, for the same
-- reason as the incident table in 0034: a recovery drill runs precisely while
-- the marketplace is unavailable, and evidence that could only be written
-- during normal service would be missing from every drill worth recording.
