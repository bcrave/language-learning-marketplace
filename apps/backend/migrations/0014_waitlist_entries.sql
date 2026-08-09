create table waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references users(id),
  class_session_id uuid not null references class_sessions(id),
  state text not null check (state in ('ACTIVE', 'WITHDRAWN', 'PROMOTED', 'EXPIRED', 'INELIGIBLE')),
  terminal_reason text check (terminal_reason in (
    'WITHDRAWN',
    'PROMOTED',
    'EXPIRED',
    'CLASS_SESSION_UNAVAILABLE',
    'INSUFFICIENT_CLASS_CREDITS',
    'SCHEDULE_CONFLICT',
    'ALREADY_BOOKED'
  )),
  joined_at timestamptz not null,
  expires_at timestamptz not null,
  completed_at timestamptz,
  promoted_booking_id uuid references bookings(id),
  check (expires_at > joined_at),
  check (
    (state = 'ACTIVE' and terminal_reason is null and completed_at is null and promoted_booking_id is null)
    or
    (state = 'PROMOTED' and terminal_reason = 'PROMOTED' and completed_at is not null and promoted_booking_id is not null)
    or
    (state = 'WITHDRAWN' and terminal_reason = 'WITHDRAWN' and completed_at is not null and promoted_booking_id is null)
    or
    (state = 'EXPIRED' and terminal_reason = 'EXPIRED' and completed_at is not null and promoted_booking_id is null)
    or
    (state = 'INELIGIBLE' and terminal_reason in ('CLASS_SESSION_UNAVAILABLE', 'INSUFFICIENT_CLASS_CREDITS', 'SCHEDULE_CONFLICT', 'ALREADY_BOOKED') and completed_at is not null and promoted_booking_id is null)
  )
);

create unique index waitlist_entries_one_active_student_session_idx
  on waitlist_entries (student_user_id, class_session_id)
  where state = 'ACTIVE';

create index waitlist_entries_promotion_order_idx
  on waitlist_entries (class_session_id, joined_at, id)
  where state = 'ACTIVE';

create index waitlist_entries_student_history_idx
  on waitlist_entries (student_user_id, joined_at desc, id desc);

create unique index waitlist_entries_one_promotion_per_booking_idx
  on waitlist_entries (promoted_booking_id)
  where promoted_booking_id is not null;

create function preserve_waitlist_entry_identity()
returns trigger language plpgsql as $$
begin
  if new.student_user_id <> old.student_user_id
    or new.class_session_id <> old.class_session_id
    or new.joined_at <> old.joined_at
    or new.expires_at <> old.expires_at then
    raise exception 'Waitlist Entry identity, join order, and expiry are immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger waitlist_entries_immutable_identity
before update on waitlist_entries
for each row execute function preserve_waitlist_entry_identity();
