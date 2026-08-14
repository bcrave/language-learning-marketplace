-- ADR 0047 freezes the active Lesson Unit denominator at a Sponsorship boundary
-- while still allowing a later accepted Attendance correction to revise the
-- completion facts attributed to that period. Storing only the denominator count
-- is not enough to recount safely: a unit retired after capture would silently
-- leave the recount even though it was active when the boundary froze. The frozen
-- set below is therefore the denominator, and the recount reads it directly.
create table course_progress_snapshot_units (
  snapshot_id uuid not null references course_progress_snapshots(id) on delete cascade,
  lesson_unit_id uuid not null references lesson_units(id),
  primary key (snapshot_id, lesson_unit_id)
);

-- Revision reads this table by Lesson Unit on every Attendance record and
-- correction, which the snapshot-leading primary key cannot serve.
create index course_progress_snapshot_units_lesson_unit_idx
  on course_progress_snapshot_units (lesson_unit_id);

-- Backfills boundaries captured under 0022, which stored the denominator only as a
-- count. Reconstructing it from the Course's currently active units is exact
-- wherever the curriculum has not changed since capture, and without it those
-- boundaries could never be revised at all. The stored active_lesson_unit_count
-- stays authoritative as the frozen denominator; this set only drives the recount.
insert into course_progress_snapshot_units (snapshot_id, lesson_unit_id)
select course_progress_snapshots.id, lesson_units.id
from course_progress_snapshots
join lesson_units
  on lesson_units.course_id = course_progress_snapshots.course_id
 and lesson_units.state = 'ACTIVE'
on conflict do nothing;

-- A revision marker, not a second history: the prior values of a corrected report
-- belong to the separately authorized correction-history extract of ADR 0056.
alter table course_progress_snapshots
  add column revision_count integer not null default 0 check (revision_count >= 0),
  add column revised_at timestamptz,
  add constraint course_progress_snapshots_revision_check check (
    (revision_count = 0 and revised_at is null)
    or (revision_count > 0 and revised_at is not null)
  );
