create table role_assignment_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  role text not null check (
    role in ('STUDENT', 'TEACHER', 'ORGANIZATION_MANAGER', 'PLATFORM_ADMINISTRATOR')
  ),
  action text not null check (action in ('GRANTED', 'REMOVED')),
  reason text not null check (
    reason = btrim(reason) and char_length(reason) between 3 and 200
  ),
  changed_by_user_id uuid not null references users(id),
  changed_at timestamptz not null default now()
);

create index role_assignment_changes_user_history_idx
  on role_assignment_changes (user_id, changed_at desc, id desc);

create function preserve_role_assignment_change_history()
returns trigger language plpgsql as $$
begin
  raise exception 'Role Assignment change history is append-only' using errcode = '23514';
end;
$$;

create trigger role_assignment_changes_prevent_update
before update on role_assignment_changes
for each row execute function preserve_role_assignment_change_history();

create trigger role_assignment_changes_prevent_delete
before delete on role_assignment_changes
for each row execute function preserve_role_assignment_change_history();

alter table bookings
  drop constraint bookings_terminal_reason_check,
  add constraint bookings_terminal_reason_check
    check (terminal_reason in ('STUDENT_CANCELLATION', 'RESCHEDULED', 'CLASS_SESSION_CANCELLATION', 'ROLE_ASSIGNMENT_REMOVAL'));

alter table waitlist_entries
  drop constraint waitlist_entries_terminal_reason_check,
  add constraint waitlist_entries_terminal_reason_check check (terminal_reason in (
    'WITHDRAWN', 'PROMOTED', 'EXPIRED', 'CLASS_SESSION_UNAVAILABLE',
    'INSUFFICIENT_CLASS_CREDITS', 'SCHEDULE_CONFLICT', 'ALREADY_BOOKED',
    'ROLE_ASSIGNMENT_REMOVAL'
  )),
  drop constraint waitlist_entries_check1,
  add constraint waitlist_entries_check1 check (
    (state = 'ACTIVE' and terminal_reason is null and completed_at is null and promoted_booking_id is null)
    or (state = 'PROMOTED' and terminal_reason = 'PROMOTED' and completed_at is not null and promoted_booking_id is not null)
    or (state = 'WITHDRAWN' and terminal_reason = 'WITHDRAWN' and completed_at is not null and promoted_booking_id is null)
    or (state = 'EXPIRED' and terminal_reason = 'EXPIRED' and completed_at is not null and promoted_booking_id is null)
    or (state = 'INELIGIBLE' and terminal_reason in ('CLASS_SESSION_UNAVAILABLE', 'INSUFFICIENT_CLASS_CREDITS', 'SCHEDULE_CONFLICT', 'ALREADY_BOOKED', 'ROLE_ASSIGNMENT_REMOVAL') and completed_at is not null and promoted_booking_id is null)
  );
