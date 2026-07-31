create table role_workspace_places (
  user_id uuid not null,
  role text not null,
  place text not null check (
    (role = 'STUDENT' and place in ('STUDENT_DISCOVERY', 'STUDENT_LEARNING')) or
    (role = 'TEACHER' and place in ('TEACHER_SCHEDULE', 'TEACHER_AVAILABILITY')) or
    (role = 'ORGANIZATION_MANAGER' and place in ('ORGANIZATION_STUDENTS', 'ORGANIZATION_REPORTS')) or
    (role = 'PLATFORM_ADMINISTRATOR' and place in ('ADMINISTRATION_OPERATIONS', 'ADMINISTRATION_PEOPLE'))
  ),
  updated_at timestamptz not null default now(),
  primary key (user_id, role),
  foreign key (user_id, role)
    references role_assignments (user_id, role)
    on delete cascade
);
