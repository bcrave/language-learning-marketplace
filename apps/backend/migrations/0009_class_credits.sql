create table class_credit_accounts (
  student_user_id uuid primary key references users(id),
  available_balance integer not null default 0 check (available_balance >= 0),
  updated_at timestamptz not null default now()
);

create table class_credit_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references class_credit_accounts(student_user_id),
  amount integer not null check (amount <> 0),
  source text not null check (source in (
    'CREDIT_ADJUSTMENT',
    'SUBSCRIPTION_GRANT',
    'ORGANIZATION_CREDIT_GRANT',
    'BOOKING_DEDUCTION',
    'BOOKING_REFUND'
  )),
  source_reference text not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (source, source_reference),
  check (
    source <> 'CREDIT_ADJUSTMENT'
    or (reason is not null and reason = btrim(reason) and char_length(reason) between 3 and 200)
  )
);

create index class_credit_ledger_student_created_idx
  on class_credit_ledger_entries (student_user_id, created_at desc, id desc);

create function prevent_class_credit_ledger_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Class Credit ledger entries are append-only';
end;
$$;

create trigger class_credit_ledger_entries_append_only
before update or delete on class_credit_ledger_entries
for each row execute function prevent_class_credit_ledger_mutation();
