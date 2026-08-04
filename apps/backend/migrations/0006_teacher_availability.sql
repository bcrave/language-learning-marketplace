create table teacher_availability_settings (
  teacher_user_id uuid primary key references users(id),
  time_zone text not null check (time_zone ~ '^[A-Za-z_]+/[A-Za-z0-9_+/-]+$'),
  updated_at timestamptz not null default now()
);

create table teacher_availability_ranges (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references users(id),
  weekday smallint not null check (weekday between 1 and 7),
  start_local_time time not null,
  end_local_time time not null,
  effective_from date not null,
  effective_until date,
  time_zone text not null check (time_zone ~ '^[A-Za-z_]+/[A-Za-z0-9_+/-]+$'),
  created_at timestamptz not null default now(),
  check (start_local_time < end_local_time),
  check (effective_until is null or effective_until >= effective_from),
  unique (teacher_user_id, weekday, start_local_time, end_local_time, effective_from)
);

create index teacher_availability_ranges_teacher_effective_idx
  on teacher_availability_ranges (teacher_user_id, effective_from, weekday);

create table availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references users(id),
  starts_at_local timestamp without time zone not null,
  ends_at_local timestamp without time zone not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  time_zone text not null check (time_zone ~ '^[A-Za-z_]+/[A-Za-z0-9_+/-]+$'),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  check (starts_at_local < ends_at_local),
  check (starts_at < ends_at)
);

create index availability_exceptions_teacher_instant_idx
  on availability_exceptions (teacher_user_id, starts_at, ends_at);

create or replace function guard_published_session_against_availability_exception()
returns trigger language plpgsql as $$
begin
  if new.state = 'PUBLISHED' then
    perform pg_advisory_xact_lock(hashtextextended(new.teacher_user_id::text, 28));
    if exists (
      select 1 from availability_exceptions
      where teacher_user_id = new.teacher_user_id
        and removed_at is null
        and starts_at < new.starts_at + interval '60 minutes'
        and ends_at > new.starts_at
    ) then
      raise exception 'published Class Session overlaps an Availability Exception'
        using errcode = '23P01';
    end if;
  end if;
  return new;
end;
$$;

create trigger class_sessions_availability_exception_guard
before insert or update of teacher_user_id, starts_at, state on class_sessions
for each row execute function guard_published_session_against_availability_exception();

create or replace function guard_availability_exception_against_published_session()
returns trigger language plpgsql as $$
begin
  if new.removed_at is null then
    perform pg_advisory_xact_lock(hashtextextended(new.teacher_user_id::text, 28));
    if exists (
      select 1 from class_sessions
      where teacher_user_id = new.teacher_user_id
        and state = 'PUBLISHED'
        and starts_at < new.ends_at
        and starts_at + interval '60 minutes' > new.starts_at
    ) then
      raise exception 'Availability Exception overlaps a published Class Session'
        using errcode = '23P01';
    end if;
  end if;
  return new;
end;
$$;

create trigger availability_exceptions_published_session_guard
before insert or update of teacher_user_id, starts_at, ends_at, removed_at on availability_exceptions
for each row execute function guard_availability_exception_against_published_session();
