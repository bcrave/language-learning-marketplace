import { createGraphQLError, type Plugin } from "graphql-yoga";

import type { OperationalCounters } from "../observability/operational-counters.js";
import type { PersistedOperationManifest } from "./persisted-operations.js";
import {
  GRAPHQL_VARIABLES_LIMIT_BYTES,
  RETRY_AFTER_SECONDS,
  type ResourceBudgets,
} from "./resource-budget.js";
import {
  UNATTRIBUTED_SOURCE,
  VERIFIED_SOURCE_CONTEXT_HEADER,
} from "./verified-source.js";

/**
 * The request-shaped half of the public boundary: everything that is decided
 * before a document is parsed or a resolver runs.
 *
 * It lives beside the API rather than inside it because these are transport
 * decisions — a method, a body's size, an identifier, a source — and the schema
 * and its resolvers have nothing to say about any of them. What the boundary
 * cannot decide here is the per-User budget, which needs a validated token
 * resolved to a User; that is charged where authentication happens.
 */

/**
 * A refusal is thrown rather than returned as a result: Yoga's own parameter
 * check runs after this plugin and throws when no document is present, which
 * would replace a returned result with its own message. Throwing ends the
 * request here, with this status and this privacy-safe message.
 */
export function refusal(status: number, code: string, message: string) {
  return createGraphQLError(message, {
    extensions: {
      code,
      http: {
        status,
        ...(status === 429
          ? { headers: { "retry-after": String(RETRY_AFTER_SECONDS) } }
          : {}),
      },
    },
  });
}

/**
 * The codes a resolver uses to refuse a caller. Identifier enumeration is
 * deliberately answered as `NOT_FOUND` so a denial does not disclose that the
 * record exists, which makes all three the same abuse signal from outside.
 *
 * Authorization denials reach the caller as GraphQL errors carrying one of
 * these, so counting them here counts them all — with one exception. A
 * correction-history Report Export refused to an unauthorized requester comes
 * back as a typed result instead. That path is charged against the reporting
 * budget of five per User per minute, which is already tighter than this
 * per-source allowance of ten, so it needs no second bound.
 */
const DENIAL_CODES = new Set(["UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND"]);

/** The source Caddy verified, as `createMarketplaceServer` established it. */
function verifiedSourceOf(request: Request) {
  return request.headers.get(VERIFIED_SOURCE_CONTEXT_HEADER) ?? UNATTRIBUTED_SOURCE;
}

export function createPublicBoundaryPlugin(options: {
  /** Whether this API is the public boundary, or a local one that is not. */
  enforced: boolean;
  budgets: ResourceBudgets;
  persistedOperations: PersistedOperationManifest;
  clock: () => Date;
  /** The aggregate the operator guide's enumeration threshold is measured on. */
  counters?: OperationalCounters;
}): Plugin {
  const { enforced, budgets, persistedOperations, clock, counters } = options;

  return {
    onParams({ params, request, setParams }) {
      // The threat model keeps authenticated operations on POST so credentials
      // and private inputs never reach a URL. Yoga would otherwise answer a GET
      // carrying a persisted identifier and its variables in the query string,
      // where a proxy, a history entry, or an access log would keep them.
      if (enforced && request.method !== "POST") {
        throw refusal(
          405,
          "METHOD_NOT_ALLOWED",
          "GraphQL operations are accepted only as POST requests.",
        );
      }

      if (
        enforced &&
        !budgets.acceptsFromSource(verifiedSourceOf(request), clock().getTime())
      ) {
        throw refusal(
          429,
          "REQUEST_LIMIT_EXCEEDED",
          "Too many refused requests. Try again shortly.",
        );
      }

      if (
        params.variables &&
        JSON.stringify(params.variables).length > GRAPHQL_VARIABLES_LIMIT_BYTES
      ) {
        throw refusal(413, "VARIABLES_TOO_LARGE", "The operation variables are too large.");
      }

      const documentId = params.extensions?.["documentId"];
      if (typeof documentId === "string") {
        const document = persistedOperations.documentFor(documentId);
        if (!document) {
          throw refusal(
            400,
            "UNKNOWN_PERSISTED_OPERATION",
            "This deployment does not know that persisted GraphQL operation.",
          );
        }
        setParams({ ...params, query: document });
        return;
      }

      if (enforced) {
        throw refusal(
          400,
          "PERSISTED_OPERATION_REQUIRED",
          "This deployment executes only persisted GraphQL operations.",
        );
      }
    },
    onExecutionResult({ request, result }) {
      if (!enforced || !result || Symbol.asyncIterator in result) return;
      const denied = result.errors?.some((error) =>
        DENIAL_CODES.has(String(error.extensions?.["code"] ?? "")),
      );
      if (!denied) return;
      budgets.recordDeniedAuthorization(verifiedSourceOf(request), clock().getTime());
      // The budget refuses one enumerating source; the counter measures the
      // guide's marketplace-wide threshold across sources, which a shared
      // reviewer identity reaches without any single source standing out.
      counters?.recordDeniedAuthorization(clock().getTime());
    },
  };
}
