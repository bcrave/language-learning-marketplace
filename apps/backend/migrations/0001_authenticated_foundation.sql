create table if not exists schema_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key,
  display_name text not null check (char_length(display_name) between 1 and 100),
  interface_locale text not null check (interface_locale in ('en', 'es')),
  display_time_zone text not null,
  created_at timestamptz not null default now()
);

create table if not exists role_assignments (
  user_id uuid not null references users(id),
  role text not null check (
    role in ('STUDENT', 'TEACHER', 'ORGANIZATION_MANAGER', 'PLATFORM_ADMINISTRATOR')
  ),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists audit_entries (
  id uuid not null default gen_random_uuid(),
  actor_user_id uuid not null references users(id),
  acting_role text check (
    acting_role is null or
    acting_role in ('STUDENT', 'TEACHER', 'ORGANIZATION_MANAGER', 'PLATFORM_ADMINISTRATOR')
  ),
  operation text not null,
  target_type text not null,
  target_id uuid not null,
  outcome text not null check (outcome in ('SUCCEEDED', 'DENIED', 'FAILED')),
  reason_code text not null,
  correlation_id text not null,
  occurred_at timestamptz not null default now(),
  primary key (id, occurred_at)
) partition by range (occurred_at);

do $$
declare
  month_offset integer;
  month_start timestamptz;
  partition_name text;
begin
  for month_offset in -3..12 loop
    month_start := date_trunc('month', now()) + make_interval(months => month_offset);
    partition_name := 'audit_entries_' || to_char(month_start, 'YYYY_MM');
    execute format(
      'create table if not exists %I partition of audit_entries for values from (%L) to (%L)',
      partition_name,
      month_start,
      month_start + interval '1 month'
    );
  end loop;
end;
$$;

create index if not exists audit_entries_correlation_id_idx
  on audit_entries (correlation_id);

create or replace function prevent_audit_entry_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Audit Entries are append-only';
end;
$$;

drop trigger if exists audit_entries_append_only on audit_entries;
create trigger audit_entries_append_only
before update or delete on audit_entries
for each row execute function prevent_audit_entry_mutation();

create or replace function expire_audit_partitions(reference_time timestamptz)
returns text[] language plpgsql as $$
declare
  cutoff_month date := date_trunc('month', reference_time - interval '90 days')::date;
  expired_partition text;
  dropped_partitions text[] := array[]::text[];
begin
  for expired_partition in
    select child.relname
    from pg_inherits inheritance
    join pg_class parent on parent.oid = inheritance.inhparent
    join pg_class child on child.oid = inheritance.inhrelid
    where parent.oid = 'audit_entries'::regclass
      and child.relname ~ '^audit_entries_[0-9]{4}_[0-9]{2}$'
      and to_date(substring(child.relname from 15), 'YYYY_MM') < cutoff_month
  loop
    execute format('drop table %I', expired_partition);
    dropped_partitions := array_append(dropped_partitions, expired_partition);
  end loop;
  return dropped_partitions;
end;
$$;

revoke all on function expire_audit_partitions(timestamptz) from public;
