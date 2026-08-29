import { createHash, randomBytes } from "node:crypto";

import type { OperationBudgetClass } from "./persisted-operations.js";

/**
 * ADR 0025's bounded public API consumption, in one place so the thresholds can
 * be asserted rather than rediscovered at each call site.
 *
 * Counters are in-memory and per process, which the ADR accepts while the
 * budget permits exactly one API replica. They are keyed by a salted hash: a
 * source address is used transiently to decide one request and is never
 * retained in a form that could be read back out.
 *
 * Two of the ADR's bounds are not budgets and are not here. Page size is fixed
 * by each connection's own resolver rather than chosen by the caller, so there
 * is nothing to charge; and one concurrent Report Export per User is enforced
 * by the export's own state, which outlives any window.
 */
export const BUDGET_WINDOW_MILLISECONDS = 60_000;

/** What a refused caller is told to wait, and the only detail a 429 discloses. */
export const RETRY_AFTER_SECONDS = 60;

export const USER_MUTATION_LIMIT_PER_MINUTE = 30;

/**
 * Reports and exports scan a range rather than a record, so they carry the
 * stricter allowance the ADR gives them. It applies to Platform Administrators
 * too: marketplace-wide reporting is the widest read the demonstration offers.
 */
export const USER_REPORT_LIMIT_PER_MINUTE = 5;

/**
 * Denied authorization is the shape enumeration takes. A caller walking
 * identifiers under a shared credential reaches this limit long before it
 * reaches the per-source request limit.
 */
export const SOURCE_DENIED_AUTHORIZATION_LIMIT_PER_MINUTE = 10;

/**
 * The largest accepted variables payload. The largest legitimate one is a
 * structured Lesson Material — 40 blocks of up to 2,000 characters — so this
 * leaves that comfortably inside while keeping the 1 MB body limit from being
 * spent entirely on variables.
 */
export const GRAPHQL_VARIABLES_LIMIT_BYTES = 100_000;

/** Above this many live keys, expired windows are swept before a new one lands. */
const COUNTER_SWEEP_THRESHOLD = 10_000;

/**
 * The three outcomes of charging a budget. `FIRST_REFUSAL` exists so a refusal
 * can be recorded once per window: auditing every request past the limit would
 * let a caller who is already being refused drive unbounded Audit writes.
 */
export type BudgetOutcome = "ACCEPTED" | "FIRST_REFUSAL" | "REFUSED";

export interface WindowedBudget {
  /** Charges one unit against the key's current window. */
  consume(key: string, now: number): BudgetOutcome;
  /** Whether the budget is already spent, without charging for the question. */
  isExhausted(key: string, now: number): boolean;
}

export function createWindowedBudget(
  limit: number,
  windowMilliseconds = BUDGET_WINDOW_MILLISECONDS,
): WindowedBudget {
  const counters = new Map<string, { count: number; startedAt: number }>();
  const salt = randomBytes(32);

  const keyFor = (key: string) =>
    createHash("sha256").update(salt).update(key).digest("base64url");

  const currentWindow = (hashed: string, now: number) => {
    const counter = counters.get(hashed);
    if (!counter || now - counter.startedAt >= windowMilliseconds) return undefined;
    return counter;
  };

  return {
    consume(key, now) {
      const hashed = keyFor(key);
      const counter = currentWindow(hashed, now);
      if (!counter) {
        if (counters.size >= COUNTER_SWEEP_THRESHOLD) {
          for (const [candidate, expiring] of counters) {
            if (now - expiring.startedAt >= windowMilliseconds) counters.delete(candidate);
          }
        }
        counters.set(hashed, { count: 1, startedAt: now });
        return limit >= 1 ? "ACCEPTED" : "FIRST_REFUSAL";
      }
      counter.count += 1;
      if (counter.count <= limit) return "ACCEPTED";
      return counter.count === limit + 1 ? "FIRST_REFUSAL" : "REFUSED";
    },
    isExhausted(key, now) {
      const counter = currentWindow(keyFor(key), now);
      return counter !== undefined && counter.count > limit;
    },
  };
}

export interface ResourceBudgets {
  /**
   * Charges one authenticated operation to its User. Ordinary reads are left to
   * the per-source request limit: they carry no write and no reporting range.
   */
  chargeUserOperation(
    userKey: string,
    budgetClass: OperationBudgetClass,
    now: number,
  ): BudgetOutcome;
  /** Records one denied authorization attempt against the source that made it. */
  recordDeniedAuthorization(source: string, now: number): void;
  /** Whether the source has spent its denied-authorization allowance. */
  acceptsFromSource(source: string, now: number): boolean;
}

export function createResourceBudgets(
  limits: {
    userMutationLimit?: number;
    userReportLimit?: number;
    sourceDeniedAuthorizationLimit?: number;
  } = {},
): ResourceBudgets {
  const mutations = createWindowedBudget(
    limits.userMutationLimit ?? USER_MUTATION_LIMIT_PER_MINUTE,
  );
  const reports = createWindowedBudget(limits.userReportLimit ?? USER_REPORT_LIMIT_PER_MINUTE);
  const denials = createWindowedBudget(
    limits.sourceDeniedAuthorizationLimit ?? SOURCE_DENIED_AUTHORIZATION_LIMIT_PER_MINUTE,
  );

  return {
    chargeUserOperation(userKey, budgetClass, now) {
      if (budgetClass === "REPORT") return reports.consume(userKey, now);
      if (budgetClass === "MUTATION") return mutations.consume(userKey, now);
      return "ACCEPTED";
    },
    recordDeniedAuthorization(source, now) {
      denials.consume(source, now);
    },
    acceptsFromSource(source, now) {
      return !denials.isExhausted(source, now);
    },
  };
}
