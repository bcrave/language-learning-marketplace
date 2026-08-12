create table attendance_review_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings(id),
  student_user_id uuid not null references users(id),
  outcome_at_request text not null check (outcome_at_request in ('ATTENDED', 'NO_SHOW')),
  explanation text not null default '' check (char_length(explanation) <= 500),
  state text not null check (state in ('PENDING', 'UPHELD', 'CORRECTED')),
  requested_at timestamptz not null,
  decided_by_user_id uuid references users(id),
  decided_at timestamptz,
  decision_outcome text check (decision_outcome in ('ATTENDED', 'NO_SHOW')),
  student_visible_rationale text check (char_length(student_visible_rationale) between 10 and 500),
  private_administrator_note text check (char_length(private_administrator_note) <= 500),
  attendance_record_correction_id uuid references attendance_record_corrections(id),
  check (
    (state = 'PENDING'
      and decided_by_user_id is null
      and decided_at is null
      and decision_outcome is null
      and student_visible_rationale is null
      and private_administrator_note is null
      and attendance_record_correction_id is null)
    or (state <> 'PENDING'
      and decided_by_user_id is not null
      and decided_at is not null
      and decision_outcome is not null
      and student_visible_rationale is not null)
  ),
  check (state <> 'UPHELD' or attendance_record_correction_id is null),
  check (state <> 'CORRECTED' or attendance_record_correction_id is not null)
);

create index attendance_review_requests_queue_idx
  on attendance_review_requests (state, requested_at, id);

create index attendance_review_requests_student_idx
  on attendance_review_requests (student_user_id, requested_at desc, id);
