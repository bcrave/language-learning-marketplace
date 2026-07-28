# Keep persistence SQL-first with Kysely

The API and worker use Kysely with explicit SQL migrations rather than a full object-relational mapper. Kysely provides TypeScript-checked routine queries while keeping PostgreSQL-specific transactions, row locks, range and exclusion constraints, partial indexes, and outbox operations visible through direct SQL where needed. This accepts more deliberate schema work in exchange for making the concurrency guarantees central to the portfolio project inspectable rather than hidden behind an abstraction that cannot express them cleanly.
