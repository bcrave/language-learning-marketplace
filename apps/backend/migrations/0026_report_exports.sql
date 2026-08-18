-- ADR 0056 makes a Report Export an immutable, short-lived extract of authorized
-- reporting facts captured at one consistent instant. The request, its bounds, and
-- the artifact live in one row so the record that outlives the file still states the
-- acting role, filters, schema version, completion time, row count, and digest —
-- while the Audit Entry that names this row stays inside the fields ADR 0004 allows.
create table report_exports (
  id uuid primary key default gen_random_uuid(),
  requested_by_user_id uuid not null references users(id),
  acting_role text not null check (acting_role in ('ORGANIZATION_MANAGER', 'PLATFORM_ADMINISTRATOR')),
  organization_id uuid references organizations(id),
  kind text not null check (kind in ('ORDINARY', 'CORRECTION_HISTORY')),
  schema_version text not null,
  -- The range is stored as the requester read it: local dates plus the Display Time
  -- Zone that interprets them. A stored instant alone would silently re-interpret
  -- the same filter for a reader in another zone.
  period_start date not null,
  period_end_exclusive date not null,
  time_zone text not null,
  state text not null check (state in ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'EXPIRED')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  requested_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  data_as_of timestamptz,
  row_count integer check (row_count >= 0),
  content_digest text,
  content text,
  failure_reason_code text,
  correlation_id text not null,

  check (period_start < period_end_exclusive),
  -- An Organization Manager's export is always scoped to its own Organization;
  -- marketplace-wide authority carries no Organization scope at all.
  check (
    (acting_role = 'ORGANIZATION_MANAGER' and organization_id is not null)
    or (acting_role = 'PLATFORM_ADMINISTRATOR' and organization_id is null)
  ),
  -- Separate authorization, enforced at rest as well as at the request: an
  -- Organization Manager's authority over ordinary reporting never produces a
  -- correction-history extract, whatever a later caller asks for.
  check (kind <> 'CORRECTION_HISTORY' or acting_role = 'PLATFORM_ADMINISTRATOR'),
  -- A completed export carries its whole provenance or it is not completed.
  check (
    state <> 'COMPLETED'
    or (data_as_of is not null and row_count is not null and content_digest is not null
      and content is not null and completed_at is not null and expires_at is not null)
  ),
  check (state <> 'FAILED' or (failure_reason_code is not null and content is null)),
  -- Expiry keeps the record and drops the extract, so an expired Report Export can
  -- never be read as a backup of what it once contained.
  check (state <> 'EXPIRED' or (content is null and completed_at is not null)),
  check (state not in ('QUEUED', 'RUNNING') or (content is null and row_count is null and content_digest is null))
);

-- ADR 0025 bounds a User to one concurrent export. Enforcing it here rather than
-- only in the request path means two simultaneous requests cannot both win.
create unique index report_exports_in_flight_idx
  on report_exports (requested_by_user_id)
  where state in ('QUEUED', 'RUNNING');

create index report_exports_queue_idx on report_exports (state, requested_at, id);

create index report_exports_requester_idx
  on report_exports (requested_by_user_id, requested_at desc, id);

-- The expiry sweep reads only the artifacts that still hold content.
create index report_exports_expiry_idx on report_exports (expires_at) where state = 'COMPLETED';

-- Immutability is a property of the artifact, not a convention of the code that
-- writes it. Once a Report Export reaches a terminal state its facts are fixed, and
-- the single permitted later change is expiry dropping the extract.
create function report_export_stays_immutable() returns trigger as $$
begin
  if old.state not in ('COMPLETED', 'FAILED', 'EXPIRED') then
    return new;
  end if;
  if new.requested_by_user_id is distinct from old.requested_by_user_id
    or new.acting_role is distinct from old.acting_role
    or new.organization_id is distinct from old.organization_id
    or new.kind is distinct from old.kind
    or new.schema_version is distinct from old.schema_version
    or new.period_start is distinct from old.period_start
    or new.period_end_exclusive is distinct from old.period_end_exclusive
    or new.time_zone is distinct from old.time_zone
    or new.data_as_of is distinct from old.data_as_of
    or new.row_count is distinct from old.row_count
    or new.content_digest is distinct from old.content_digest
    or new.completed_at is distinct from old.completed_at
    -- The lifetime is part of what makes the artifact short-lived. Left mutable, a
    -- later write could extend an expired export back into reach.
    or new.expires_at is distinct from old.expires_at
  then
    raise exception 'A terminal Report Export cannot be rewritten';
  end if;
  if new.content is distinct from old.content and new.content is not null then
    raise exception 'A Report Export artifact cannot be rewritten';
  end if;
  if new.state is distinct from old.state and not (old.state = 'COMPLETED' and new.state = 'EXPIRED') then
    raise exception 'A terminal Report Export cannot change state';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger report_exports_immutable
  before update on report_exports
  for each row execute function report_export_stays_immutable();

-- A Course Progress Snapshot already records that it was revised; the
-- correction-history extract of ADR 0056 additionally needs the prior and current
-- values behind each revision. The correcting actor and reason stay out: they belong
-- to the filtered Audit Log, not to an extract an authorized reader downloads.
create table course_progress_snapshot_revisions (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references course_progress_snapshots(id) on delete cascade,
  revision_sequence integer not null check (revision_sequence > 0),
  field_code text not null check (field_code = 'completed_unit_count'),
  prior_value integer not null check (prior_value >= 0),
  current_value integer not null check (current_value >= 0),
  revised_at timestamptz not null,
  check (prior_value <> current_value),
  unique (snapshot_id, revision_sequence)
);

create index course_progress_snapshot_revisions_order_idx
  on course_progress_snapshot_revisions (revised_at, id);
