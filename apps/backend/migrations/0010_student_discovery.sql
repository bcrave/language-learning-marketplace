create table student_placements (
  student_user_id uuid not null references users(id),
  target_language text not null,
  curriculum_level text not null references curriculum_levels(code),
  updated_at timestamptz not null default now(),
  primary key (student_user_id, target_language),
  check (target_language ~ '^[a-z]{2,3}$')
);

create index class_sessions_discovery_idx
  on class_sessions (starts_at, id)
  where state = 'PUBLISHED';
