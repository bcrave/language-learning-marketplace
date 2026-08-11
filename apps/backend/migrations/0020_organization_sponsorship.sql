create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  created_at timestamptz not null default now()
);

create table organization_managers (
  user_id uuid primary key,
  role text not null default 'ORGANIZATION_MANAGER' check (role = 'ORGANIZATION_MANAGER'),
  organization_id uuid not null references organizations(id),
  created_at timestamptz not null default now(),
  foreign key (user_id, role)
    references role_assignments (user_id, role)
    on delete cascade
);

create table sponsorship_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  student_user_id uuid not null references users(id),
  invited_by_user_id uuid not null references users(id),
  state text not null check (state in ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
  disclosure_text_version text not null,
  expires_at timestamptz not null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (state = 'PENDING' and decided_at is null)
    or (state <> 'PENDING' and decided_at is not null)
  )
);

create unique index sponsorship_invitations_pending_idx
  on sponsorship_invitations (organization_id, student_user_id)
  where state = 'PENDING';

create index sponsorship_invitations_expiry_idx
  on sponsorship_invitations (expires_at)
  where state = 'PENDING';

create index sponsorship_invitations_student_idx
  on sponsorship_invitations (student_user_id, created_at desc);

create index sponsorship_invitations_organization_idx
  on sponsorship_invitations (organization_id, created_at desc);

-- A Student may hold at most one Sponsorship. Ending Sponsorship (#42) will relax
-- this to a partial index over an added active-state column so a Student can be
-- re-invited after a prior Sponsorship ends.
create table sponsorships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  student_user_id uuid not null unique references users(id),
  invitation_id uuid not null unique references sponsorship_invitations(id),
  accepted_at timestamptz not null,
  grant_count integer not null default 0 check (grant_count >= 0),
  next_anniversary_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index sponsorships_next_anniversary_idx
  on sponsorships (next_anniversary_at);

create index sponsorships_organization_idx
  on sponsorships (organization_id, accepted_at desc);
