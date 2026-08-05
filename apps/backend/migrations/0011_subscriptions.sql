create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null unique references users(id),
  state text not null check (state in ('ACTIVE', 'CANCELLATION_SCHEDULED', 'CANCELLED')),
  activated_at timestamptz not null,
  anchor_day smallint not null check (anchor_day between 1 and 31),
  accounting_time_utc time not null,
  renewal_count integer not null default 0 check (renewal_count >= 0),
  next_anniversary_at timestamptz,
  cancellation_effective_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    (state = 'ACTIVE' and next_anniversary_at is not null and cancellation_effective_at is null)
    or (state = 'CANCELLATION_SCHEDULED' and next_anniversary_at is not null and cancellation_effective_at = next_anniversary_at)
    or (state = 'CANCELLED' and next_anniversary_at is null and cancellation_effective_at is not null)
  )
);

create table subscription_provider_events (
  provider_event_id text primary key check (char_length(provider_event_id) between 1 and 200),
  student_user_id uuid not null references users(id),
  event_type text not null check (event_type in ('ACTIVATED', 'RENEWED', 'CANCELLED', 'REACTIVATED')),
  effective_at timestamptz not null,
  reason text not null check (reason = btrim(reason) and char_length(reason) between 3 and 200),
  input_fingerprint text not null,
  outcome jsonb not null,
  created_at timestamptz not null default now()
);

create index subscription_provider_events_student_created_idx
  on subscription_provider_events (student_user_id, created_at desc);

alter table in_app_notifications add column source_reference text;
alter table email_notification_intents add column source_reference text;

create unique index in_app_notifications_source_recipient_idx
  on in_app_notifications (source_reference, recipient_user_id)
  where source_reference is not null;

create unique index email_notification_intents_source_recipient_idx
  on email_notification_intents (source_reference, recipient_user_id)
  where source_reference is not null;
