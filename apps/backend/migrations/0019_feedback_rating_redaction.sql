alter table learning_feedback
  add column redacted_at timestamptz,
  add column redacted_by_user_id uuid references users(id),
  add column redaction_reason text check (char_length(redaction_reason) between 10 and 500);

alter table learning_feedback
  drop constraint learning_feedback_check1,
  add constraint learning_feedback_check1 check (
    state = 'DRAFT'
    or redacted_at is not null
    or cardinality(observed_strengths) > 0
    or cardinality(suggested_focuses) > 0
    or observations <> ''
    or next_practice <> ''
  );

create table learning_feedback_redactions (
  id uuid primary key default gen_random_uuid(),
  learning_feedback_id uuid not null references learning_feedback(id),
  redacted_by_user_id uuid not null references users(id),
  feedback_state_at_redaction text not null check (feedback_state_at_redaction in ('DRAFT', 'SUBMITTED')),
  reason text not null check (char_length(reason) between 10 and 500),
  redacted_at timestamptz not null
);

create index learning_feedback_redactions_feedback_idx
  on learning_feedback_redactions (learning_feedback_id, redacted_at, id);

alter table session_ratings
  add column redacted_at timestamptz,
  add column redacted_by_user_id uuid references users(id),
  add column redaction_reason text check (char_length(redaction_reason) between 10 and 500);

create table session_rating_redactions (
  id uuid primary key default gen_random_uuid(),
  session_rating_id uuid not null references session_ratings(id),
  redacted_by_user_id uuid not null references users(id),
  reason text not null check (char_length(reason) between 10 and 500),
  redacted_at timestamptz not null
);

create index session_rating_redactions_rating_idx
  on session_rating_redactions (session_rating_id, redacted_at, id);
