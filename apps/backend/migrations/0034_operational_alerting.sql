-- ADR 0022 gives the Project Owner privately routed alerts rather than a pager,
-- a status page, or an external uptime monitor. The operator guide's alert model
-- is what needs durable state: an incident sends one confirmation alert, one more
-- if its severity rises, and one recovery notification — never periodic reminders
-- — so the process that dispatches has to remember what it already said.
--
-- In-memory state would forget across an API restart, and a restart is exactly
-- what a readiness or deployment incident involves. The owner would then receive
-- the same confirmation again for an incident they are already holding.
create table operational_incidents (
  id uuid primary key default gen_random_uuid(),
  condition_id text not null,
  incident_family text not null,
  -- The operator guide's join key: the same incident-family and safe-failure
  -- fingerprint joins an open incident, and recurrence after clearing opens a
  -- new correlated one. The partial unique index below is that rule.
  fingerprint text not null,
  severity text not null check (severity in ('IMMEDIATE', 'OWNER_ATTENTION')),
  route text not null check (route in ('SENTRY_EMAIL', 'GITHUB_ACTIONS', 'RAILWAY_BILLING')),
  correlation_id text not null unique,
  -- Privacy-safe evidence only. Every name is drawn from the telemetry-safe
  -- allowlist the same event travels to Sentry under, so this table cannot
  -- become the one place a source address or authored content is retained.
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  first_observed_at timestamptz not null,
  last_observed_at timestamptz not null,
  observation_count integer not null default 1 check (observation_count > 0),
  -- When the condition stopped holding, and how many healthy readings have
  -- followed. A clearing rule is a confirmation window in the other direction.
  healthy_since timestamptz,
  healthy_observation_count integer not null default 0 check (healthy_observation_count >= 0),
  confirmed_at timestamptz,
  escalated_at timestamptz,
  cleared_at timestamptz,
  check (escalated_at is null or confirmed_at is not null),
  check (cleared_at is null or confirmed_at is not null)
);

create unique index operational_incidents_open_fingerprint
  on operational_incidents (fingerprint)
  where cleared_at is null;

create index operational_incidents_recent
  on operational_incidents (first_observed_at desc);

-- Deliberately outside the maintenance write guard of migration 0032. The
-- incident this table exists to remember is frequently the Canonical Data
-- Rebuild that holds the lease: an operational record that could only be
-- written while the marketplace is available would fall silent exactly when
-- the owner needs it, and it carries no marketplace state a rebuild replaces.
