alter table users
  add column access_status text not null default 'ACTIVE'
    check (access_status in ('ACTIVE', 'SUSPENDED')),
  add column suspension_reason text,
  add column suspended_at timestamptz,
  add column suspended_by_user_id uuid references users(id),
  add constraint users_suspension_state_check check (
    (access_status = 'ACTIVE' and suspension_reason is null and suspended_at is null and suspended_by_user_id is null)
    or
    (access_status = 'SUSPENDED' and suspension_reason is not null and suspended_at is not null and suspended_by_user_id is not null)
  );

create table user_access_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  action text not null check (action in ('SUSPENDED', 'REACTIVATED')),
  reason text not null check (reason = btrim(reason) and char_length(reason) between 3 and 200),
  changed_by_user_id uuid not null references users(id),
  changed_at timestamptz not null default now()
);

create index user_access_changes_user_history_idx
  on user_access_changes (user_id, changed_at desc, id desc);

create trigger user_access_changes_prevent_update
before update on user_access_changes
for each row execute function preserve_role_assignment_change_history();

create trigger user_access_changes_prevent_delete
before delete on user_access_changes
for each row execute function preserve_role_assignment_change_history();

alter table bookings
  drop constraint bookings_terminal_reason_check,
  add constraint bookings_terminal_reason_check
    check (terminal_reason in ('STUDENT_CANCELLATION', 'RESCHEDULED', 'CLASS_SESSION_CANCELLATION', 'ROLE_ASSIGNMENT_REMOVAL', 'USER_SUSPENSION'));

alter table waitlist_entries
  drop constraint waitlist_entries_terminal_reason_check,
  add constraint waitlist_entries_terminal_reason_check check (terminal_reason in (
    'WITHDRAWN', 'PROMOTED', 'EXPIRED', 'CLASS_SESSION_UNAVAILABLE',
    'INSUFFICIENT_CLASS_CREDITS', 'SCHEDULE_CONFLICT', 'ALREADY_BOOKED',
    'ROLE_ASSIGNMENT_REMOVAL', 'USER_SUSPENSION'
  )),
  drop constraint waitlist_entries_check1,
  add constraint waitlist_entries_check1 check (
    (state = 'ACTIVE' and terminal_reason is null and completed_at is null and promoted_booking_id is null)
    or (state = 'PROMOTED' and terminal_reason = 'PROMOTED' and completed_at is not null and promoted_booking_id is not null)
    or (state = 'WITHDRAWN' and terminal_reason = 'WITHDRAWN' and completed_at is not null and promoted_booking_id is null)
    or (state = 'EXPIRED' and terminal_reason = 'EXPIRED' and completed_at is not null and promoted_booking_id is null)
    or (state = 'INELIGIBLE' and terminal_reason in ('CLASS_SESSION_UNAVAILABLE', 'INSUFFICIENT_CLASS_CREDITS', 'SCHEDULE_CONFLICT', 'ALREADY_BOOKED', 'ROLE_ASSIGNMENT_REMOVAL', 'USER_SUSPENSION') and completed_at is not null and promoted_booking_id is null)
  );
