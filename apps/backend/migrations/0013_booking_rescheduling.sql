alter table bookings
  drop constraint bookings_terminal_reason_check,
  add column rescheduled_from_booking_id uuid references bookings(id),
  add constraint bookings_terminal_reason_check
    check (terminal_reason in ('STUDENT_CANCELLATION', 'RESCHEDULED'));

create unique index bookings_one_reschedule_per_original_idx
  on bookings (rescheduled_from_booking_id)
  where rescheduled_from_booking_id is not null;

create or replace function preserve_booking_identity()
returns trigger language plpgsql as $$
begin
  if new.student_user_id <> old.student_user_id
    or new.class_session_id <> old.class_session_id
    or new.teacher_user_id_at_booking <> old.teacher_user_id_at_booking
    or new.booked_at <> old.booked_at
    or new.rescheduled_from_booking_id is distinct from old.rescheduled_from_booking_id then
    raise exception 'Booking identity and origin are immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;
