-- Either party may end a Sponsorship prospectively. The Student, their Role
-- Assignments, and their owned Class Credits are untouched; only future
-- Organization grants and Organization reporting stop at the end instant.
alter table sponsorships
  add column state text not null default 'ACTIVE' check (state in ('ACTIVE', 'ENDED')),
  add column ended_at timestamptz,
  add column ended_by_party text check (ended_by_party in ('STUDENT', 'ORGANIZATION')),
  add column ended_by_user_id uuid references users(id),
  add constraint sponsorships_end_state_check check (
    (state = 'ACTIVE'
      and ended_at is null
      and ended_by_party is null
      and ended_by_user_id is null)
    or (state = 'ENDED'
      and ended_at is not null
      and ended_by_party is not null
      and ended_by_user_id is not null
      and ended_at >= accepted_at)
  );

-- Replaces the one-Sponsorship-per-Student constraint from 0020: at most one
-- Sponsorship may be active, so a Student may be invited again after one ends.
alter table sponsorships drop constraint sponsorships_student_user_id_key;

create unique index sponsorships_active_student_idx
  on sponsorships (student_user_id)
  where state = 'ACTIVE';

-- Only an active Sponsorship can reach another monthly anniversary grant.
drop index sponsorships_next_anniversary_idx;

create index sponsorships_next_anniversary_idx
  on sponsorships (next_anniversary_at)
  where state = 'ACTIVE';

create table cohorts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index cohorts_organization_name_idx
  on cohorts (organization_id, lower(name));

create table cohort_memberships (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id),
  sponsorship_id uuid not null references sponsorships(id),
  effective_from timestamptz not null,
  effective_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_until is null or effective_until > effective_from)
);

-- A Cohort holds at most one open-ended membership per Sponsorship. The service
-- rejects overlapping bounded windows while holding the Sponsorship row lock,
-- which this partial index backstops for the common open-ended case.
create unique index cohort_memberships_open_idx
  on cohort_memberships (cohort_id, sponsorship_id)
  where effective_until is null;

create index cohort_memberships_sponsorship_idx
  on cohort_memberships (sponsorship_id, effective_from);

create index cohort_memberships_cohort_idx
  on cohort_memberships (cohort_id, effective_from);

-- Aggregate Course Progress frozen at a Sponsorship boundary. The active unit
-- count is the denominator as it stood at capture time, so a later curriculum
-- change cannot silently rewrite an Organization's historical report.
create table course_progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  sponsorship_id uuid not null references sponsorships(id),
  boundary text not null check (boundary in ('SPONSORSHIP_START', 'SPONSORSHIP_END')),
  course_id uuid not null references courses(id),
  completed_active_lesson_unit_count integer not null check (completed_active_lesson_unit_count >= 0),
  active_lesson_unit_count integer not null check (active_lesson_unit_count >= 0),
  captured_at timestamptz not null,
  unique (sponsorship_id, boundary, course_id)
);

create index course_progress_snapshots_sponsorship_idx
  on course_progress_snapshots (sponsorship_id, boundary);
