create table curriculum_levels (
  code text primary key check (code in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  sort_order smallint not null unique check (sort_order between 1 and 6)
);

insert into curriculum_levels (code, sort_order) values
  ('A1', 1), ('A2', 2), ('B1', 3), ('B2', 4), ('C1', 5), ('C2', 6);

create table courses (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique check (stable_key ~ '^[a-z]{2}-(a1|a2|b1|b2|c1|c2)$'),
  target_language text not null check (target_language ~ '^[a-z]{2}$'),
  curriculum_level text not null references curriculum_levels(code),
  title text not null check (char_length(title) between 1 and 120),
  summary text not null check (char_length(summary) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (target_language, curriculum_level)
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[A-Z]{2,8}$'),
  label_en text not null check (char_length(label_en) between 1 and 80),
  label_es text not null check (char_length(label_es) between 1 and 80),
  created_at timestamptz not null default now()
);

insert into topics (key, label_en, label_es) values
  ('EC', 'Everyday Conversation', 'Conversación cotidiana'),
  ('TN', 'Travel & Navigation', 'Viajes y orientación'),
  ('FC', 'Food & Culture', 'Comida y cultura'),
  ('WS', 'Work & Study', 'Trabajo y estudios'),
  ('CS', 'Community & Society', 'Comunidad y sociedad'),
  ('GS', 'Grammar & Structure', 'Gramática y estructura'),
  ('PL', 'Pronunciation & Listening', 'Pronunciación y comprensión auditiva'),
  ('RW', 'Reading & Writing', 'Lectura y escritura');

create table lesson_units (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique check (stable_key ~ '^[a-z]{2}-(a1|a2|b1|b2|c1|c2)-[0-9]{2}$'),
  course_id uuid not null references courses(id),
  title text not null check (char_length(title) between 1 and 160),
  summary text not null check (char_length(summary) between 1 and 500),
  objectives jsonb not null check (
    jsonb_typeof(objectives) = 'array' and jsonb_array_length(objectives) between 1 and 6
  ),
  sort_order integer not null check (sort_order > 0),
  state text not null default 'ACTIVE' check (state in ('ACTIVE', 'RETIRED')),
  replacement_lesson_unit_id uuid references lesson_units(id),
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  constraint lesson_units_course_order_unique unique (course_id, sort_order) deferrable initially immediate,
  check ((state = 'ACTIVE' and retired_at is null) or (state = 'RETIRED' and retired_at is not null)),
  check (replacement_lesson_unit_id is null or replacement_lesson_unit_id <> id)
);

create table lesson_unit_topics (
  lesson_unit_id uuid not null references lesson_units(id),
  topic_key text not null references topics(key),
  primary key (lesson_unit_id, topic_key)
);

create or replace function enforce_replacement_in_same_course()
returns trigger language plpgsql as $$
begin
  if new.replacement_lesson_unit_id is not null and not exists (
    select 1 from lesson_units replacement
    where replacement.id = new.replacement_lesson_unit_id
      and replacement.course_id = new.course_id
  ) then
    raise exception 'replacement Lesson Unit must belong to the same Course' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger lesson_unit_replacement_same_course
before insert or update of replacement_lesson_unit_id, course_id on lesson_units
for each row execute function enforce_replacement_in_same_course();

create or replace function enforce_lesson_unit_topic_cardinality()
returns trigger language plpgsql as $$
declare
  unit_id uuid;
  topic_count integer;
begin
  if tg_table_name = 'lesson_units' then
    unit_id := (to_jsonb(new) ->> 'id')::uuid;
  else
    unit_id := coalesce((to_jsonb(new) ->> 'lesson_unit_id')::uuid, (to_jsonb(old) ->> 'lesson_unit_id')::uuid);
  end if;
  if exists (select 1 from lesson_units where id = unit_id) then
    select count(*) into topic_count from lesson_unit_topics where lesson_unit_id = unit_id;
    if topic_count not between 1 and 2 then
      raise exception 'Lesson Unit must have one or two Topics' using errcode = '23514';
    end if;
  end if;
  return null;
end;
$$;

create constraint trigger lesson_unit_topic_cardinality_from_unit
after insert or update on lesson_units
deferrable initially deferred
for each row execute function enforce_lesson_unit_topic_cardinality();

create constraint trigger lesson_unit_topic_cardinality_from_assignment
after insert or update or delete on lesson_unit_topics
deferrable initially deferred
for each row execute function enforce_lesson_unit_topic_cardinality();

create table lesson_materials (
  id uuid primary key default gen_random_uuid(),
  lesson_unit_id uuid not null references lesson_units(id),
  kind text not null check (kind in ('STRUCTURED_TEXT', 'HTTPS_REFERENCE')),
  title text not null check (char_length(title) between 1 and 160),
  structured_content jsonb,
  https_url text,
  publisher text,
  created_at timestamptz not null default now(),
  unique (lesson_unit_id, title),
  check (
    (kind = 'STRUCTURED_TEXT' and structured_content is not null and https_url is null and publisher is null)
    or
    (kind = 'HTTPS_REFERENCE' and structured_content is null and https_url ~ '^https://' and publisher is not null)
  )
);

create table teacher_profiles (
  teacher_user_id uuid primary key references users(id),
  pronouns text check (pronouns is null or char_length(pronouns) between 1 and 40),
  profile_image_url text check (profile_image_url is null or profile_image_url ~ '^https://'),
  professional_bio text not null check (char_length(professional_bio) between 1 and 1000),
  updated_at timestamptz not null default now()
);

create table teacher_profile_topics (
  teacher_user_id uuid not null references teacher_profiles(teacher_user_id),
  topic_key text not null references topics(key),
  primary key (teacher_user_id, topic_key)
);

create table teacher_qualifications (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references users(id),
  target_language text not null check (target_language ~ '^[a-z]{2}$'),
  curriculum_level text not null references curriculum_levels(code),
  granted_by_user_id uuid not null references users(id),
  granted_at timestamptz not null default now(),
  unique (teacher_user_id, target_language, curriculum_level)
);

create table class_sessions (
  id uuid primary key,
  lesson_unit_id uuid not null references lesson_units(id),
  teacher_user_id uuid not null references users(id),
  starts_at timestamptz not null,
  state text not null check (state in ('PUBLISHED', 'CANCELLED'))
);

create table in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references users(id),
  message_id text not null,
  variables jsonb not null,
  created_at timestamptz not null default now()
);

create table email_notification_intents (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references users(id),
  message_id text not null,
  locale text not null check (locale in ('en', 'es')),
  variables jsonb not null,
  rendered_content text not null,
  created_at timestamptz not null default now()
);

create table mutation_idempotency_records (
  actor_user_id uuid not null references users(id),
  operation text not null,
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 100),
  input_fingerprint text not null,
  outcome jsonb not null,
  created_at timestamptz not null default now(),
  primary key (actor_user_id, operation, idempotency_key)
);

create index class_sessions_future_teacher_idx
  on class_sessions (teacher_user_id, starts_at)
  where state = 'PUBLISHED' and teacher_user_id is not null;

create or replace function enforce_published_session_curriculum_guards()
returns trigger language plpgsql as $$
declare
  unit_language text;
  unit_level text;
begin
  perform 1 from lesson_units where id = new.lesson_unit_id for update;
  if new.state = 'PUBLISHED' then
    select courses.target_language, courses.curriculum_level
      into unit_language, unit_level
      from lesson_units join courses on courses.id = lesson_units.course_id
      where lesson_units.id = new.lesson_unit_id;
    if not exists (
      select 1 from teacher_qualifications
      where teacher_user_id = new.teacher_user_id
        and target_language = unit_language
        and curriculum_level = unit_level
      for key share
    ) then
      raise exception 'matching Teacher Qualification is required' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger class_sessions_curriculum_guards
before insert or update of lesson_unit_id, teacher_user_id, state on class_sessions
for each row execute function enforce_published_session_curriculum_guards();
