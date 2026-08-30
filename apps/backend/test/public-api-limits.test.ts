import { describe, expect, it } from "vitest";

import {
  BUDGET_WINDOW_MILLISECONDS,
  createResourceBudgets,
  createWindowedBudget,
  SOURCE_DENIED_AUTHORIZATION_LIMIT_PER_MINUTE,
  USER_MUTATION_LIMIT_PER_MINUTE,
  USER_REPORT_LIMIT_PER_MINUTE,
} from "../src/api/resource-budget.js";
import {
  WORKER_CONCURRENCY,
  WORKER_POLL_INTERVAL_MILLISECONDS,
} from "../src/worker/worker-limits.js";

const START = 1_700_000_000_000;

describe("a windowed budget", () => {
  it("accepts up to the limit and names only the first refusal", () => {
    const budget = createWindowedBudget(2);

    expect(budget.consume("caller", START)).toBe("ACCEPTED");
    expect(budget.consume("caller", START)).toBe("ACCEPTED");
    // Only the request that exhausts the budget is worth recording: later ones
    // would let a refused caller drive unbounded evidence of its own refusal.
    expect(budget.consume("caller", START)).toBe("FIRST_REFUSAL");
    expect(budget.consume("caller", START)).toBe("REFUSED");
  });

  it("gives each key its own allowance", () => {
    const budget = createWindowedBudget(1);

    expect(budget.consume("one", START)).toBe("ACCEPTED");
    expect(budget.consume("two", START)).toBe("ACCEPTED");
  });

  it("starts a fresh allowance once the window has passed", () => {
    const budget = createWindowedBudget(1);

    expect(budget.consume("caller", START)).toBe("ACCEPTED");
    expect(budget.consume("caller", START)).toBe("FIRST_REFUSAL");
    expect(budget.consume("caller", START + BUDGET_WINDOW_MILLISECONDS)).toBe("ACCEPTED");
  });

  it("answers whether a budget is spent without spending more of it", () => {
    const budget = createWindowedBudget(1);

    budget.consume("caller", START);
    expect(budget.isExhausted("caller", START)).toBe(false);
    budget.consume("caller", START);
    expect(budget.isExhausted("caller", START)).toBe(true);
    expect(budget.isExhausted("caller", START + BUDGET_WINDOW_MILLISECONDS)).toBe(false);
  });
});

describe("ADR 0025's public API budgets", () => {
  it("holds the accepted thresholds", () => {
    expect(USER_MUTATION_LIMIT_PER_MINUTE).toBe(30);
    expect(USER_REPORT_LIMIT_PER_MINUTE).toBe(5);
    expect(SOURCE_DENIED_AUTHORIZATION_LIMIT_PER_MINUTE).toBe(10);
  });

  it("leaves ordinary reads to the per-source request limit", () => {
    const budgets = createResourceBudgets({ userMutationLimit: 1, userReportLimit: 1 });

    for (let attempt = 0; attempt < 50; attempt += 1) {
      expect(budgets.chargeUserOperation("student", "QUERY", START)).toBe("ACCEPTED");
    }
  });

  it("spends a report's allowance without spending the mutation allowance", () => {
    // A reviewer who has read five reports can still cancel a Booking.
    const budgets = createResourceBudgets({ userMutationLimit: 2, userReportLimit: 1 });

    expect(budgets.chargeUserOperation("student", "REPORT", START)).toBe("ACCEPTED");
    expect(budgets.chargeUserOperation("student", "REPORT", START)).toBe("FIRST_REFUSAL");
    expect(budgets.chargeUserOperation("student", "MUTATION", START)).toBe("ACCEPTED");
  });

  it("gives each User its own allowance under a shared credential", () => {
    const budgets = createResourceBudgets({ userMutationLimit: 1 });

    expect(budgets.chargeUserOperation("student", "MUTATION", START)).toBe("ACCEPTED");
    expect(budgets.chargeUserOperation("teacher", "MUTATION", START)).toBe("ACCEPTED");
  });

  it("stops answering a source that keeps being denied", () => {
    const budgets = createResourceBudgets({ sourceDeniedAuthorizationLimit: 2 });

    expect(budgets.acceptsFromSource("203.0.113.4", START)).toBe(true);
    budgets.recordDeniedAuthorization("203.0.113.4", START);
    budgets.recordDeniedAuthorization("203.0.113.4", START);
    expect(budgets.acceptsFromSource("203.0.113.4", START)).toBe(true);

    budgets.recordDeniedAuthorization("203.0.113.4", START);
    expect(budgets.acceptsFromSource("203.0.113.4", START)).toBe(false);
    // Another source is unaffected, and the window eventually reopens.
    expect(budgets.acceptsFromSource("198.51.100.7", START)).toBe(true);
    expect(budgets.acceptsFromSource("203.0.113.4", START + BUDGET_WINDOW_MILLISECONDS)).toBe(true);
  });
});

describe("the worker's bounded runtime", () => {
  it("runs one background job at a time", () => {
    // The worker shares one PostgreSQL instance and one deployment budget with
    // the API, so background work is bounded rather than elastic.
    expect(WORKER_CONCURRENCY).toBe(1);
    expect(WORKER_POLL_INTERVAL_MILLISECONDS).toBeGreaterThan(0);
  });
});
