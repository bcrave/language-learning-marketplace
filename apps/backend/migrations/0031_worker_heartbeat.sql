-- ADR 0038 releases the API before the worker and the browser client last, and
-- the operator guide gates each transition on the previous service actually
-- being live. The API answers that for itself over HTTP; the worker is a
-- non-HTTP process, so the only place a release job and an operator can both
-- observe it is the database it already writes to.
--
-- One row per named worker process. The release gate and the staleness alert
-- read `observed_at`; `release` names the build that wrote it so a heartbeat
-- from the previous release cannot be mistaken for the new one being live.
create table worker_heartbeats (
  worker_name text primary key,
  release text not null,
  observed_at timestamptz not null default now()
);
