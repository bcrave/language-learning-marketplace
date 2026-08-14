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

-- A revision marker, not a second history: the prior values of a corrected report
-- belong to the separately authorized correction-history extract of ADR 0056.
alter table course_progress_snapshots
  add column revision_count integer not null default 0 check (revision_count >= 0),
  add column revised_at timestamptz,
  add constraint course_progress_snapshots_revision_check check (
    (revision_count = 0 and revised_at is null)
    or (revision_count > 0 and revised_at is not null)
  );

-- Reporting reads every snapshot of one Organization's Sponsorships by course.
create index course_progress_snapshots_course_idx
  on course_progress_snapshots (course_id, sponsorship_id);
