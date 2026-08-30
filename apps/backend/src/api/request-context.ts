import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

import { z } from "zod";

const correlationIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);

export function correlationIdForRequest(headers: Headers) {
  const candidate = correlationIdSchema.safeParse(headers.get("x-correlation-id"));
  return candidate.success ? candidate.data : randomUUID();
}

/**
 * The correlation of the operation currently in flight.
 *
 * ADR 0022 follows one identifier through an operation, but a boundary the API
 * shares across requests — the Auth0 authenticator, which caches JWKS and so
 * must outlive any one of them — is called with no request context of its own.
 * Storing the resolved identifier here lets such a boundary attribute what it
 * observes to the operation that provoked it, rather than inventing a new
 * identifier per failure and reporting every retry as a distinct operation.
 */
const correlationStorage = new AsyncLocalStorage<string>();

/**
 * What a boundary reports when it failed outside any operation. One shared
 * bucket keeps such failures countable without either inventing an operation
 * that did not happen or inflating how many distinct ones were affected.
 */
export const UNCORRELATED_OPERATION = "uncorrelated";

/** Runs `operation` with `correlationId` as the ambient correlation. */
export function withCorrelationId<T>(correlationId: string, operation: () => T): T {
  return correlationStorage.run(correlationId, operation);
}

/**
 * The ambient correlation, or `null` outside a request. A caller reached from
 * no operation — a worker or a startup probe — has nothing honest to report,
 * and must say so rather than fabricate one.
 */
export function currentCorrelationId(): string | null {
  return correlationStorage.getStore() ?? null;
}
