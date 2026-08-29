-- ADR 0030 keeps the public demonstration useful on the real clock and makes a
-- Canonical Data Rebuild an explicitly unavailable, serialized operation.  The
-- singleton is intentionally small enough for readiness to inspect without
-- exposing the private owner workflow or its reason.
create table maintenance_state (
  singleton boolean primary key default true check (singleton),
  state text not null check (state in ('AVAILABLE', 'REBUILDING', 'INDETERMINATE')),
  holder_id text,
  correlation_id text,
  fixture_manifest_version text,
  fixture_generation integer not null default 0 check (fixture_generation >= 0),
  changed_at timestamptz not null default now(),
  check (
    (state = 'AVAILABLE' and holder_id is null and correlation_id is null)
    or (state <> 'AVAILABLE' and holder_id is not null and correlation_id is not null)
  )
);

insert into maintenance_state (singleton, state) values (true, 'AVAILABLE');

create table canonical_data_rebuilds (
  dispatch_id text primary key,
  correlation_id text not null unique,
  fixture_manifest_version text not null,
  fixture_generation integer not null check (fixture_generation > 0),
  schema_version text not null,
  initiator text not null check (initiator in ('PROJECT_OWNER', 'SCHEDULED_SYSTEM')),
  owner_reason text not null check (owner_reason = btrim(owner_reason) and char_length(owner_reason) between 10 and 500),
  validation_evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(validation_evidence) = 'object'),
  state text not null check (state in ('STARTED', 'COMPLETED', 'ROLLED_BACK', 'INDETERMINATE')),
  safe_failure_code text,
  started_at timestamptz not null,
  completed_at timestamptz,
  check (
    (state = 'STARTED' and completed_at is null and safe_failure_code is null)
    or (state = 'COMPLETED' and completed_at is not null and safe_failure_code is null)
    or (state in ('ROLLED_BACK', 'INDETERMINATE') and completed_at is not null and safe_failure_code is not null)
  )
);

alter table audit_entries
  add column evidence jsonb not null default '{}'::jsonb
  check (jsonb_typeof(evidence) = 'object');

create table rolling_fixture_reconciliations (
  correlation_id text primary key,
  reconciled_for timestamptz not null,
  advanced_fixture_count integer not null check (advanced_fixture_count >= 0),
  completed_at timestamptz not null
);

alter table class_sessions
  add column is_rolling_fixture boolean not null default false,
  add column rolling_offset_hours smallint,
  add constraint class_sessions_rolling_fixture_shape check (
    (is_rolling_fixture and rolling_offset_hours between 0 and 23)
    or (not is_rolling_fixture and rolling_offset_hours is null)
  );

create or replace function preserve_published_class_session_start()
returns trigger language plpgsql as $$
begin
  if new.starts_at <> old.starts_at
     and not (
       old.is_rolling_fixture
       and new.is_rolling_fixture
       and current_setting('marketplace.fixture_maintenance', true) = 'on'
     ) then
    raise exception 'a published Class Session start instant cannot change' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function sync_teacher_schedule_commitment()
returns trigger language plpgsql as $$
begin
  if current_setting('marketplace.fixture_maintenance', true) = 'on' then
    return new;
  end if;
  update schedule_commitments
  set user_id = new.teacher_user_id,
      starts_at = new.starts_at,
      ends_at = new.starts_at + interval '60 minutes',
      active = new.state = 'PUBLISHED'
  where class_session_id = new.id and commitment_role = 'TEACHER';
  if not found then
    insert into schedule_commitments (user_id, class_session_id, commitment_role, starts_at, ends_at, active)
    values (new.teacher_user_id, new.id, 'TEACHER', new.starts_at, new.starts_at + interval '60 minutes', new.state = 'PUBLISHED');
  end if;
  return new;
end;
$$;

-- Every business write takes the shared side of the global lease. A rebuild first
-- publishes maintenance, then takes the exclusive side: admitted transactions drain,
-- later writes fail closed, and the replacement cannot race either API or worker
-- state changes. Operational evidence tables are the narrow explicit exclusions;
-- later public business tables receive the same guard in their own migration.
create function guard_marketplace_write()
returns trigger language plpgsql as $$
declare
  maintenance maintenance_state%rowtype;
begin
  select * into maintenance from maintenance_state where singleton = true;
  if maintenance.state <> 'AVAILABLE'
     and current_setting('marketplace.maintenance_holder', true) is distinct from maintenance.holder_id
     and current_setting('marketplace.maintenance_verifier', true) is distinct from 'on' then
    raise exception 'Marketplace maintenance is active' using errcode = '57P03';
  end if;
  perform pg_advisory_xact_lock_shared(5203003052);
  return null;
end;
$$;

do $$
declare
  guarded_table text;
begin
  for guarded_table in
    select tablename from pg_tables
    where schemaname = current_schema()
      and tablename not in (
        'audit_entries', 'schema_migrations', 'worker_heartbeats',
        'maintenance_state', 'canonical_data_rebuilds',
        'rolling_fixture_reconciliations'
      )
      and tablename not like 'audit_entries\_%' escape '\'
  loop
    execute format(
      'create trigger marketplace_write_guard before insert or update or delete or truncate on %I for each statement execute function guard_marketplace_write()',
      guarded_table
    );
  end loop;
end;
$$;

revoke all on function guard_marketplace_write() from public;

-- Rebuilds preserve the provider binding of noncanonical synthetic Users but
-- make their public profile opaque without fabricating a domain anonymization.
alter table users add column fixture_removed_at timestamptz;
alter table users drop constraint users_access_status_check;
alter table users add constraint users_access_status_check check (access_status in ('ACTIVE', 'SUSPENDED', 'ANONYMIZATION_PENDING', 'ANONYMIZED', 'FIXTURE_REMOVED'));
alter table users drop constraint users_access_state_check;
alter table users add constraint users_access_state_check check (
  (access_status = 'ACTIVE' and identity_issuer is not null and identity_subject is not null and suspension_reason is null and suspended_at is null and suspended_by_user_id is null and anonymized_at is null and anonymized_by_user_id is null and fixture_removed_at is null)
  or
  (access_status = 'SUSPENDED' and identity_issuer is not null and identity_subject is not null and suspension_reason is not null and suspended_at is not null and suspended_by_user_id is not null and anonymized_at is null and anonymized_by_user_id is null and fixture_removed_at is null)
  or
  (access_status = 'ANONYMIZATION_PENDING' and identity_issuer is not null and identity_subject is not null and display_name = 'Former User' and interface_locale is null and display_time_zone is null and suspension_reason is null and suspended_at is null and suspended_by_user_id is null and anonymized_at is not null and anonymized_by_user_id is not null and fixture_removed_at is null)
  or
  (access_status = 'ANONYMIZED' and identity_issuer is null and identity_subject is null and display_name = 'Former User' and interface_locale is null and display_time_zone is null and suspension_reason is null and suspended_at is null and suspended_by_user_id is null and anonymized_at is not null and anonymized_by_user_id is not null and fixture_removed_at is null)
  or
  (access_status = 'FIXTURE_REMOVED' and identity_issuer is not null and identity_subject is not null and display_name = 'Former User' and interface_locale is null and display_time_zone is null and suspension_reason is null and suspended_at is null and suspended_by_user_id is null and anonymized_at is null and anonymized_by_user_id is null and fixture_removed_at is not null)
);
