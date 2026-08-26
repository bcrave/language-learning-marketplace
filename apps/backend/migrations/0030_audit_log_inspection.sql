-- ADR 0059 opens the append-only Audit Entries of ADR 0004 to two relationship
-- scopes. Nothing about an entry changes here: the inspection surface reads the same
-- immutable rows, so this migration adds only the access paths that reading and
-- exporting them need, plus the partition maintenance that keeps a rolling
-- 90-day window whole.

-- The Audit Log is always read newest-first inside one bounded local date range, and
-- paginated on the same (occurred_at, id) key the order uses.
create index audit_entries_occurred_at_idx on audit_entries (occurred_at desc, id desc);

-- An Organization Manager's scope is the acting record of its own Organization's
-- managers, so the actor is the column the scope filter narrows on before the range.
create index audit_entries_actor_occurred_at_idx
  on audit_entries (actor_user_id, occurred_at desc, id desc);

-- Retention drops whole expired partitions, so the months ahead have to exist before
-- an insert reaches for them. `expire_audit_partitions` from the authenticated
-- foundation removes; this one prepares, and the two run in the same sweep.
create function ensure_audit_partitions(reference_time timestamptz)
returns text[] language plpgsql as $$
declare
  month_offset integer;
  month_start timestamptz;
  partition_name text;
  prepared_partitions text[] := array[]::text[];
begin
  for month_offset in 0..3 loop
    month_start := date_trunc('month', reference_time) + make_interval(months => month_offset);
    partition_name := 'audit_entries_' || to_char(month_start, 'YYYY_MM');
    if to_regclass(partition_name) is null then
      execute format(
        'create table if not exists %I partition of audit_entries for values from (%L) to (%L)',
        partition_name,
        month_start,
        month_start + interval '1 month'
      );
      prepared_partitions := array_append(prepared_partitions, partition_name);
    end if;
  end loop;
  return prepared_partitions;
end;
$$;

revoke all on function ensure_audit_partitions(timestamptz) from public;
