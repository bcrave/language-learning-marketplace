create table bookings (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references users(id),
  class_session_id uuid not null references class_sessions(id),
  teacher_user_id_at_booking uuid not null references users(id),
  state text not null default 'ACTIVE' check (state in ('ACTIVE', 'ENDED')),
  terminal_reason text check (terminal_reason in ('STUDENT_CANCELLATION')),
  class_credit_refunded boolean not null default false,
  late_cancellation_refund_until timestamptz,
  booked_at timestamptz not null default now(),
  ended_at timestamptz,
  check (
    (state = 'ACTIVE' and terminal_reason is null and ended_at is null and not class_credit_refunded)
    or
    (state = 'ENDED' and terminal_reason is not null and ended_at is not null)
  )
);

create unique index bookings_one_active_student_session_idx
  on bookings (student_user_id, class_session_id)
  where state = 'ACTIVE';

create index bookings_student_history_idx
  on bookings (student_user_id, booked_at desc, id desc);

create function preserve_booking_identity()
returns trigger language plpgsql as $$
begin
  if new.student_user_id <> old.student_user_id
    or new.class_session_id <> old.class_session_id
    or new.teacher_user_id_at_booking <> old.teacher_user_id_at_booking
    or new.booked_at <> old.booked_at then
    raise exception 'Booking identity and origin are immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger bookings_immutable_identity
before update on bookings
for each row execute function preserve_booking_identity();

create function enforce_booking_seat_reconciliation()
returns trigger language plpgsql as $$
declare
  session_id uuid := coalesce(new.class_session_id, old.class_session_id);
  recorded_occupied_seats integer;
  active_booking_count integer;
begin
  select occupied_seats into recorded_occupied_seats
  from class_sessions where id = session_id;
  select count(*) into active_booking_count
  from bookings where class_session_id = session_id and state = 'ACTIVE';
  if recorded_occupied_seats <> active_booking_count then
    raise exception 'Class Session occupied seats must equal active Booking history' using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger bookings_reconcile_occupied_seats
after insert or update of state or delete on bookings
deferrable initially deferred
for each row execute function enforce_booking_seat_reconciliation();

create function enforce_class_session_seat_reconciliation()
returns trigger language plpgsql as $$
declare
  active_booking_count integer;
begin
  if exists (select 1 from bookings where class_session_id = new.id) then
    select count(*) into active_booking_count
    from bookings where class_session_id = new.id and state = 'ACTIVE';
    if new.occupied_seats <> active_booking_count then
      raise exception 'Class Session occupied seats must equal active Booking history' using errcode = '23514';
    end if;
  end if;
  return null;
end;
$$;

create constraint trigger class_sessions_reconcile_occupied_seats
after update of occupied_seats on class_sessions
deferrable initially deferred
for each row execute function enforce_class_session_seat_reconciliation();
