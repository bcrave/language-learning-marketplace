alter table users
  add column if not exists identity_issuer text,
  add column if not exists identity_subject text;

update users
set
  identity_issuer = 'https://fake.local/',
  identity_subject = id::text
where identity_issuer is null or identity_subject is null;

alter table users
  alter column identity_issuer set not null,
  alter column identity_subject set not null;

create unique index if not exists users_external_identity_idx
  on users (identity_issuer, identity_subject);
