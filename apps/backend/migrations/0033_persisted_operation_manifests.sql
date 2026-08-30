-- ADR 0024 lets production execute only the GraphQL documents the build
-- produced, and ADR 0038 deploys the API before the browser client. Between
-- those two stages the previous client bundle is still being served while the
-- new API is already answering, so an API that knew only its own manifest
-- would refuse every reviewer for the length of the rollout — the window
-- ADR 0038 exists to protect.
--
-- The manifest a release accepts therefore outlives that release's process.
-- Each API records its own manifest as it starts and accepts the documents of
-- the current and immediately previous releases; older ones are pruned, so the
-- table holds at most two generations and a removed operation stops being
-- executable one release after it stops being sent.
create table persisted_operation_manifests (
  release text primary key,
  -- The manifest fingerprint, which a Security Gate Record names for a candidate.
  version text not null,
  recorded_at timestamptz not null default now()
);

create table persisted_operations (
  document_id text not null,
  release text not null references persisted_operation_manifests(release) on delete cascade,
  document text not null,
  primary key (document_id, release)
);

create index persisted_operations_release_idx on persisted_operations (release);
