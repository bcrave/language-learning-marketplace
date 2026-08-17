-- The marketplace operational report reads whole ranges of activity rather than one
-- relationship's worth, so it needs leading columns the existing indexes do not offer.

-- Reporting counts Class Session Cancellations and Reschedules as disclosed
-- exclusions, so it cannot filter on state and cannot use the partial
-- class_sessions_discovery_idx, which covers only published sessions.
create index class_sessions_starts_at_idx
  on class_sessions (starts_at);

-- class_credit_ledger_student_created_idx leads on student_user_id, which a
-- marketplace-wide range over created_at alone cannot use.
create index class_credit_ledger_entries_created_at_idx
  on class_credit_ledger_entries (created_at);
