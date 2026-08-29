/**
 * The worker's bounded runtime, stated once so the bound is a decision rather
 * than an argument at a call site.
 *
 * ADR 0025 bounds what the public API can spend; the worker is the other half
 * of the same ceiling, because background work runs against the same single
 * PostgreSQL instance and the same $15 deployment budget. One job at a time is
 * what the demonstration's scale needs, and it is also what keeps a burst of
 * queued work — a Waitlist promotion storm, a reporting range, a Canonical Data
 * Rebuild's reconciliation — from competing with the API for connections.
 *
 * A failing job is retried by Graphile Worker with exponential backoff and then
 * exhausted; the operator guide's task-queue items, not an unbounded retry, are
 * how exhausted work reaches a person.
 */
export const WORKER_CONCURRENCY = 1;

/** How long the worker waits before asking for work again when the queue is empty. */
export const WORKER_POLL_INTERVAL_MILLISECONDS = 10_000;
