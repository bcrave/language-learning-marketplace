alter table audit_entries
  alter column target_id type text using target_id::text;

alter table in_app_notifications
  add column read_at timestamptz,
  add column archived_at timestamptz;

update in_app_notifications
set source_reference = 'legacy-notification:' || id::text
where source_reference is null;

update email_notification_intents
set source_reference = 'legacy-notification:' || id::text
where source_reference is null;

alter table in_app_notifications alter column source_reference set not null;
alter table email_notification_intents alter column source_reference set not null;

alter table email_notification_intents
  add column state text not null default 'PENDING'
    check (state in ('PENDING', 'DELIVERED', 'EXHAUSTED', 'SUPPRESSED')),
  add column attempt_count smallint not null default 0 check (attempt_count between 0 and 4),
  add column next_attempt_at timestamptz not null default now(),
  add column completed_at timestamptz,
  add column provider_message_id text,
  add constraint email_notification_intents_terminal_state check (
    (state = 'PENDING' and completed_at is null)
    or (state <> 'PENDING' and completed_at is not null)
  );

create index email_notification_intents_due_idx
  on email_notification_intents (next_attempt_at, id)
  where state = 'PENDING';

create table notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  notification_intent_id uuid not null references email_notification_intents(id) on delete cascade,
  attempt_number smallint not null check (attempt_number between 1 and 4),
  outcome text not null check (outcome in ('DELIVERED', 'RETRYABLE_FAILURE', 'PERMANENT_FAILURE')),
  safe_failure_code text,
  attempted_at timestamptz not null default now(),
  unique (notification_intent_id, attempt_number),
  check ((outcome = 'DELIVERED' and safe_failure_code is null) or (outcome <> 'DELIVERED' and safe_failure_code is not null))
);

create table delivery_receipts (
  id uuid primary key default gen_random_uuid(),
  source_reference text not null,
  recipient_user_id uuid not null references users(id),
  channel text not null check (channel in ('IN_APP', 'EMAIL')),
  outcome text not null check (outcome in ('DELIVERED', 'SUPPRESSED', 'DELIVERY_UNCERTAIN')),
  completed_at timestamptz not null,
  provider_message_id text,
  unique (source_reference, recipient_user_id, channel)
);

insert into delivery_receipts (source_reference, recipient_user_id, channel, outcome, completed_at)
select source_reference, recipient_user_id, 'IN_APP', 'DELIVERED', created_at
from in_app_notifications
on conflict (source_reference, recipient_user_id, channel) do nothing;

create table recorded_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  recipient_user_id uuid not null references users(id),
  locale text not null check (locale in ('en', 'es')),
  rendered_content text,
  accepted_at timestamptz not null default now(),
  content_expired_at timestamptz
);

create function prevent_terminal_in_app_redelivery()
returns trigger language plpgsql as $$
begin
  if new.source_reference is not null and exists (
    select 1 from delivery_receipts
    where source_reference = new.source_reference
      and recipient_user_id = new.recipient_user_id
      and channel = 'IN_APP'
  ) then
    return null;
  end if;
  return new;
end;
$$;

create trigger in_app_notifications_prevent_terminal_redelivery
before insert on in_app_notifications
for each row execute function prevent_terminal_in_app_redelivery();

create function record_in_app_delivery_receipt()
returns trigger language plpgsql as $$
begin
  insert into delivery_receipts (
    source_reference, recipient_user_id, channel, outcome, completed_at
  ) values (
    new.source_reference,
    new.recipient_user_id,
    'IN_APP',
    'DELIVERED',
    new.created_at
  ) on conflict (source_reference, recipient_user_id, channel) do nothing;
  return new;
end;
$$;

create trigger in_app_notifications_record_delivery_receipt
after insert on in_app_notifications
for each row execute function record_in_app_delivery_receipt();

create table administrator_task_items (
  id uuid primary key default gen_random_uuid(),
  required_role text not null default 'PLATFORM_ADMINISTRATOR'
    check (required_role = 'PLATFORM_ADMINISTRATOR'),
  kind text not null,
  state text not null default 'OPEN' check (state in ('OPEN', 'RESOLVED')),
  correlation_reference text not null,
  safe_context jsonb not null default '{}'::jsonb,
  source_reference text not null,
  recipient_reference uuid not null references users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_reason text,
  check ((state = 'OPEN' and resolved_at is null and resolution_reason is null) or (state = 'RESOLVED' and resolved_at is not null and resolution_reason is not null)),
  unique (source_reference, recipient_reference)
);
