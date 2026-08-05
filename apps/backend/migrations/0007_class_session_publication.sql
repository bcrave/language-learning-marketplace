alter table class_sessions
  alter column id set default gen_random_uuid(),
  add column scheduling_time_zone text,
  add column seat_capacity smallint not null default 5,
  add column occupied_seats smallint not null default 0;

update class_sessions
set scheduling_time_zone = coalesce(
  (select time_zone from teacher_availability_settings where teacher_user_id = class_sessions.teacher_user_id),
  (select display_time_zone from users where id = class_sessions.teacher_user_id),
  'America/Denver'
);

alter table class_sessions
  alter column scheduling_time_zone set default 'America/Denver',
  alter column scheduling_time_zone set not null,
  add constraint class_sessions_scheduling_time_zone_named check (scheduling_time_zone ~ '^[A-Za-z_]+/[A-Za-z0-9_+/-]+$'),
  add constraint class_sessions_seat_capacity_valid check (seat_capacity between 2 and 8),
  add constraint class_sessions_occupied_seats_valid check (occupied_seats between 0 and seat_capacity);

create extension if not exists btree_gist;

create table schedule_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  class_session_id uuid not null references class_sessions(id),
  commitment_role text not null check (commitment_role in ('STUDENT', 'TEACHER')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true,
  unique (class_session_id, user_id, commitment_role),
  check (starts_at < ends_at),
  exclude using gist (
    user_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (active)
);

create unique index schedule_commitments_one_teacher_idx
  on schedule_commitments (class_session_id)
  where commitment_role = 'TEACHER';

insert into schedule_commitments (user_id, class_session_id, commitment_role, starts_at, ends_at, active)
select teacher_user_id, id, 'TEACHER', starts_at, starts_at + interval '60 minutes', state = 'PUBLISHED'
from class_sessions;

create or replace function sync_teacher_schedule_commitment()
returns trigger language plpgsql as $$
begin
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

create trigger class_sessions_teacher_schedule_commitment
after insert or update of teacher_user_id, starts_at, state on class_sessions
for each row execute function sync_teacher_schedule_commitment();

create or replace function preserve_published_class_session_start()
returns trigger language plpgsql as $$
begin
  if new.starts_at <> old.starts_at then
    raise exception 'a published Class Session start instant cannot change' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger class_sessions_immutable_start
before update of starts_at on class_sessions
for each row execute function preserve_published_class_session_start();
