-- The marketplace-wide operational report is its own place in the Platform
-- Administrator's workspace rather than another panel under operations: it is where
-- an administrator goes to find exceptions across the marketplace, and remembering
-- it separately keeps that reading trip from resetting to the operations queue.
-- 0004 wrote this rule as a column check that reads another column, so PostgreSQL
-- stored it as the table constraint `role_workspace_places_check`.
alter table role_workspace_places
  drop constraint role_workspace_places_check;

alter table role_workspace_places
  add constraint role_workspace_places_check check (
    (role = 'STUDENT' and place in ('STUDENT_DISCOVERY', 'STUDENT_LEARNING')) or
    (role = 'TEACHER' and place in ('TEACHER_SCHEDULE', 'TEACHER_AVAILABILITY')) or
    (role = 'ORGANIZATION_MANAGER' and place in ('ORGANIZATION_STUDENTS', 'ORGANIZATION_REPORTS')) or
    (role = 'PLATFORM_ADMINISTRATOR' and place in ('ADMINISTRATION_OPERATIONS', 'ADMINISTRATION_PEOPLE', 'ADMINISTRATION_REPORTS'))
  );
