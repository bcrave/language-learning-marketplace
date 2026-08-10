alter table class_sessions
  add column cancellation_reason text,
  add column cancelled_at timestamptz,
  add constraint class_sessions_cancellation_state_check check (
    (state = 'PUBLISHED' and cancellation_reason is null and cancelled_at is null)
    or
    (state = 'CANCELLED' and cancellation_reason is not null and cancelled_at is not null)
  );

create table absence_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references users(id),
  state text not null default 'OPEN' check (state in ('OPEN', 'RESOLVED')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  check ((state = 'OPEN' and resolved_at is null) or (state = 'RESOLVED' and resolved_at is not null))
);

create table absence_request_sessions (
  absence_request_id uuid not null references absence_requests(id),
  class_session_id uuid not null references class_sessions(id),
  original_teacher_user_id uuid not null references users(id),
  resolution text check (resolution in ('TEACHER_SUBSTITUTION', 'CLASS_SESSION_CANCELLATION')),
  replacement_teacher_user_id uuid references users(id),
  resolution_reason text,
  resolved_at timestamptz,
  primary key (absence_request_id, class_session_id),
  check (
    (resolution is null and replacement_teacher_user_id is null and resolution_reason is null and resolved_at is null)
    or
    (resolution = 'TEACHER_SUBSTITUTION' and replacement_teacher_user_id is not null and resolution_reason is null and resolved_at is not null)
    or
    (resolution = 'CLASS_SESSION_CANCELLATION' and replacement_teacher_user_id is null and resolution_reason is not null and resolved_at is not null)
  )
);

create unique index absence_request_sessions_one_unresolved_session_idx
  on absence_request_sessions (class_session_id)
  where resolution is null;

create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings(id),
  outcome text not null check (outcome in ('ATTENDED', 'NO_SHOW')),
  submitted_at timestamptz not null default now()
);

create function prevent_attendance_for_cancelled_class_session()
returns trigger language plpgsql as $$
declare
  session_state text;
begin
  select class_sessions.state into session_state
  from bookings
  join class_sessions on class_sessions.id = bookings.class_session_id
  where bookings.id = new.booking_id
  for update of class_sessions;
  if session_state = 'CANCELLED' then
    raise exception 'Attendance cannot be submitted for a cancelled Class Session' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger attendance_records_cancelled_session_guard
before insert or update of booking_id on attendance_records
for each row execute function prevent_attendance_for_cancelled_class_session();

alter table bookings
  drop constraint bookings_terminal_reason_check,
  add constraint bookings_terminal_reason_check
    check (terminal_reason in ('STUDENT_CANCELLATION', 'RESCHEDULED', 'CLASS_SESSION_CANCELLATION'));

create index absence_requests_open_idx
  on absence_requests (requested_at, id)
  where state = 'OPEN';

create function prevent_cancelled_class_session_reopening()
returns trigger language plpgsql as $$
begin
  if old.state = 'CANCELLED' and (
    new.state is distinct from old.state
    or new.cancellation_reason is distinct from old.cancellation_reason
    or new.cancelled_at is distinct from old.cancelled_at
  ) then
    raise exception 'Class Session Cancellation is irreversible' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger class_sessions_cancellation_irreversible
before update of state, cancellation_reason, cancelled_at on class_sessions
for each row execute function prevent_cancelled_class_session_reopening();
