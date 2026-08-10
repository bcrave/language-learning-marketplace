alter table attendance_records
  add column submitted_by_user_id uuid references users(id),
  add column updated_at timestamptz not null default now();

create table lesson_unit_completions (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references users(id),
  lesson_unit_id uuid not null references lesson_units(id),
  established_by_booking_id uuid not null references bookings(id),
  earned_at timestamptz not null,
  unique (student_user_id, lesson_unit_id)
);

create index lesson_unit_completions_student_idx
  on lesson_unit_completions (student_user_id, earned_at, id);

create table attendance_record_corrections (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  prior_outcome text not null check (prior_outcome in ('ATTENDED', 'NO_SHOW')),
  corrected_outcome text not null check (corrected_outcome in ('ATTENDED', 'NO_SHOW')),
  corrected_by_user_id uuid not null references users(id),
  reason text not null check (char_length(reason) between 10 and 500),
  corrected_at timestamptz not null
);

create index attendance_record_corrections_booking_idx
  on attendance_record_corrections (booking_id, corrected_at, id);
