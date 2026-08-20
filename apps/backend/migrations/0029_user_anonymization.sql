alter table users
  drop constraint users_access_status_check,
  drop constraint users_suspension_state_check,
  alter column identity_issuer drop not null,
  alter column identity_subject drop not null,
  alter column display_name set default 'Former User',
  add column anonymized_at timestamptz,
  add column anonymized_by_user_id uuid references users(id),
  add constraint users_access_status_check check (access_status in ('ACTIVE', 'SUSPENDED', 'ANONYMIZATION_PENDING', 'ANONYMIZED')),
  add constraint users_access_state_check check (
    (access_status = 'ACTIVE' and identity_issuer is not null and identity_subject is not null and suspension_reason is null and suspended_at is null and suspended_by_user_id is null and anonymized_at is null and anonymized_by_user_id is null)
    or
    (access_status = 'SUSPENDED' and identity_issuer is not null and identity_subject is not null and suspension_reason is not null and suspended_at is not null and suspended_by_user_id is not null and anonymized_at is null and anonymized_by_user_id is null)
    or
    (access_status = 'ANONYMIZATION_PENDING' and identity_issuer is not null and identity_subject is not null and display_name = 'Former User' and interface_locale is null and display_time_zone is null and suspension_reason is null and suspended_at is null and suspended_by_user_id is null and anonymized_at is not null and anonymized_by_user_id is not null)
    or
    (access_status = 'ANONYMIZED' and identity_issuer is null and identity_subject is null and display_name = 'Former User' and interface_locale is null and display_time_zone is null and suspension_reason is null and suspended_at is null and suspended_by_user_id is null and anonymized_at is not null and anonymized_by_user_id is not null)
  );

create table user_anonymization_requests (
  user_id uuid primary key references users(id),
  identity_issuer text,
  identity_subject text,
  reason text not null check (reason = btrim(reason) and char_length(reason) between 10 and 500),
  requested_by_user_id uuid not null references users(id),
  state text not null check (state in ('PENDING', 'COMPLETED')),
  redacted_learning_feedback_count integer not null check (redacted_learning_feedback_count >= 0),
  redacted_session_rating_count integer not null check (redacted_session_rating_count >= 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  correlation_id text not null,
  requested_at timestamptz not null,
  completed_at timestamptz,
  check (
    (state = 'PENDING' and identity_issuer is not null and identity_subject is not null and completed_at is null)
    or (state = 'COMPLETED' and identity_issuer is null and identity_subject is null and completed_at is not null)
  )
);

create function suppress_anonymized_user_notification()
returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.recipient_user_id::text, 28));
  if exists (select 1 from users where id = new.recipient_user_id and access_status in ('ANONYMIZATION_PENDING', 'ANONYMIZED')) then
    return null;
  end if;
  return new;
end;
$$;

create trigger in_app_notifications_suppress_anonymized_user
before insert on in_app_notifications
for each row execute function suppress_anonymized_user_notification();

create trigger email_notification_intents_suppress_anonymized_user
before insert on email_notification_intents
for each row execute function suppress_anonymized_user_notification();

create function prevent_anonymized_user_role_assignment()
returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 28));
  if exists (select 1 from users where id = new.user_id and access_status in ('ANONYMIZATION_PENDING', 'ANONYMIZED')) then
    raise exception 'An anonymized User cannot receive a Role Assignment' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger role_assignments_prevent_anonymized_user
before insert or update on role_assignments
for each row execute function prevent_anonymized_user_role_assignment();

create function prevent_private_data_for_anonymized_user()
returns trigger language plpgsql as $$
declare
  target_user_id uuid;
begin
  if tg_table_name = 'learning_feedback' then
    select student_user_id into target_user_id from bookings where id = new.booking_id;
  elsif tg_table_name = 'session_ratings' then
    target_user_id := new.student_user_id;
  else
    target_user_id := new.teacher_user_id;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_user_id::text, 28));
  if exists (select 1 from users where id = target_user_id and access_status in ('ANONYMIZATION_PENDING', 'ANONYMIZED')) then
    raise exception 'Private or public profile data cannot be written for an anonymized User' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger learning_feedback_prevent_anonymized_user_write
before insert or update on learning_feedback
for each row execute function prevent_private_data_for_anonymized_user();

create trigger session_ratings_prevent_anonymized_user_write
before insert or update on session_ratings
for each row execute function prevent_private_data_for_anonymized_user();

create trigger teacher_profiles_prevent_anonymized_user_write
before insert or update on teacher_profiles
for each row execute function prevent_private_data_for_anonymized_user();
