alter table audit_entries
  alter column actor_user_id drop not null;

create table class_session_reminders (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references class_sessions(id),
  recipient_user_id uuid not null references users(id),
  commitment_role text not null check (commitment_role in ('STUDENT', 'TEACHER')),
  due_at timestamptz not null,
  terminal_outcome text check (terminal_outcome in ('DELIVERED', 'SUPPRESSED')),
  completed_at timestamptz,
  unique (class_session_id, recipient_user_id, commitment_role),
  check ((terminal_outcome is null and completed_at is null) or (terminal_outcome is not null and completed_at is not null))
);

create index class_session_reminders_due_idx
  on class_session_reminders (due_at, id)
  where terminal_outcome is null;
