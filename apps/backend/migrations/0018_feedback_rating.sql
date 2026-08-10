create type feedback_skill as enum (
  'LISTENING',
  'READING',
  'SPOKEN_INTERACTION',
  'SPOKEN_PRODUCTION',
  'WRITING',
  'VOCABULARY',
  'GRAMMAR',
  'PRONUNCIATION'
);

create type session_rating_positive_tag as enum (
  'CLEAR_EXPLANATIONS',
  'SUPPORTIVE',
  'ENGAGING',
  'USEFUL_PRACTICE'
);

create type session_rating_improvement_tag as enum (
  'PACING',
  'AUDIO_QUALITY',
  'MORE_CORRECTION',
  'MORE_SPEAKING_TIME'
);

create table learning_feedback (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings(id),
  teacher_user_id uuid not null references users(id),
  observed_strengths feedback_skill[] not null default '{}',
  suggested_focuses feedback_skill[] not null default '{}',
  observations text not null default '' check (char_length(observations) <= 500),
  next_practice text not null default '' check (char_length(next_practice) <= 500),
  state text not null check (state in ('DRAFT', 'SUBMITTED')),
  submitted_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  check (cardinality(observed_strengths) <= 3),
  check (cardinality(suggested_focuses) <= 3),
  check ((state = 'DRAFT' and submitted_at is null) or (state = 'SUBMITTED' and submitted_at is not null)),
  check (state = 'DRAFT' or cardinality(observed_strengths) > 0 or cardinality(suggested_focuses) > 0 or observations <> '' or next_practice <> '')
);

create index learning_feedback_teacher_idx on learning_feedback (teacher_user_id, updated_at desc);

create table session_ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings(id),
  student_user_id uuid not null references users(id),
  overall_rating smallint not null check (overall_rating between 1 and 5),
  positive_tags session_rating_positive_tag[] not null default '{}',
  improvement_tags session_rating_improvement_tag[] not null default '{}',
  comment text not null default '' check (char_length(comment) <= 500),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index session_ratings_student_idx on session_ratings (student_user_id, updated_at desc);
