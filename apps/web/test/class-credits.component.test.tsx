import { MockedProvider } from "@apollo/client/testing/react";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminClassCredits, StudentClassCredits, StudentSubscription } from "../src/class-credits.js";
import {
  AdjustClassCreditsDocument,
  AdministrationClassCreditsDocument,
  ScheduleSubscriptionCancellationDocument,
  StudentSubscriptionDocument,
  StudentClassCreditsDocument,
  UndoSubscriptionCancellationDocument,
} from "../src/generated/graphql.js";

afterEach(cleanup);

const studentUserId = "00000000-0000-4000-8000-000000000001";
const initialAccount = {
  studentUserId,
  availableBalance: 2,
  ledger: [{
    id: "00000000-0000-4000-8000-000000000010",
    amount: 2,
    source: "CREDIT_ADJUSTMENT" as const,
    sourceReference: "adjustment:initial",
    reason: "Initial correction",
    createdAt: "2026-08-05T16:00:00.000Z",
  }],
};

describe("Class Credits", () => {
  it("lets a Platform Administrator inspect and adjust a Student's account", async () => {
    const user = userEvent.setup();
    renderWithLocale(
      <AdminClassCredits idempotencyKeyFactory={() => "adjustment-key"} />,
      "en",
      [
        {
          request: { query: AdministrationClassCreditsDocument, variables: { studentUserId } },
          result: { data: { administrationClassCredits: initialAccount } },
        },
        {
          request: {
            query: AdjustClassCreditsDocument,
            variables: {
              input: { idempotencyKey: "adjustment-key", studentUserId, amount: -1, reason: "Duplicate grant correction" },
            },
          },
          result: {
            data: {
              adjustClassCredits: {
                account: {
                  ...initialAccount,
                  availableBalance: 1,
                  ledger: [{
                    id: "00000000-0000-4000-8000-000000000011",
                    amount: -1,
                    source: "CREDIT_ADJUSTMENT" as const,
                    sourceReference: "adjustment:duplicate",
                    reason: "Duplicate grant correction",
                    createdAt: "2026-08-05T17:00:00.000Z",
                  }, ...initialAccount.ledger],
                },
              },
            },
          },
        },
      ],
    );

    await user.type(screen.getByRole("textbox", { name: "Student User ID" }), studentUserId);
    await user.click(screen.getByRole("button", { name: "Inspect Class Credits" }));
    expect(await screen.findByText("2 Class Credits available")).toBeVisible();
    expect(screen.getByText(/Initial correction/)).toBeVisible();

    await user.clear(screen.getByRole("spinbutton", { name: "Signed adjustment" }));
    await user.type(screen.getByRole("spinbutton", { name: "Signed adjustment" }), "-1");
    await user.type(screen.getByRole("textbox", { name: "Student-visible reason" }), "Duplicate grant correction");
    await user.click(screen.getByRole("button", { name: "Apply Credit Adjustment" }));

    expect(await screen.findByText("1 Class Credit available")).toBeVisible();
    expect(screen.getByText("Credit Adjustment applied and the Student was notified.")).toHaveAttribute("role", "status");
    expect(screen.getByText(/Duplicate grant correction/)).toBeVisible();
  });

  it("shows the Student's localized balance and provenance", async () => {
    renderWithLocale(<StudentClassCredits />, "es", [{
      request: { query: StudentClassCreditsDocument },
      result: { data: { studentClassCredits: initialAccount } },
    }]);

    expect(await screen.findByRole("heading", { name: "Mis créditos de clase" })).toBeVisible();
    expect(screen.getByText("2 créditos de clase disponibles")).toBeVisible();
    expect(screen.getByText("Initial correction", { exact: false })).toBeVisible();
  });

  it("lets a Student inspect, schedule cancellation of, and resume a Subscription", async () => {
    const user = userEvent.setup();
    const activeSubscription = {
      id: "00000000-0000-4000-8000-000000000020",
      state: "ACTIVE" as const,
      anchorDay: 31,
      accountingTimeUtc: "16:30:00",
      activatedAt: "2027-01-31T16:30:00.000Z",
      nextAnniversaryAt: "2027-03-31T16:30:00.000Z",
      cancellationEffectiveAt: null,
    };
    renderWithLocale(<StudentSubscription idempotencyKeyFactory={() => "subscription-key"} />, "en", [
      { request: { query: StudentSubscriptionDocument }, result: { data: { studentSubscription: activeSubscription } } },
      {
        request: { query: ScheduleSubscriptionCancellationDocument, variables: { input: { idempotencyKey: "subscription-key" } } },
        result: { data: { scheduleSubscriptionCancellation: { subscription: { ...activeSubscription, state: "CANCELLATION_SCHEDULED", cancellationEffectiveAt: activeSubscription.nextAnniversaryAt } } } },
      },
      {
        request: { query: UndoSubscriptionCancellationDocument, variables: { input: { idempotencyKey: "subscription-key" } } },
        result: { data: { undoSubscriptionCancellation: { subscription: activeSubscription } } },
      },
    ]);

    expect(await screen.findByRole("heading", { name: "My Subscription" })).toBeVisible();
    expect(screen.getByText("Active")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Schedule cancellation" }));
    expect(await screen.findByText("Cancellation scheduled")).toBeVisible();
    expect(screen.getByText(/Your existing Class Credits remain/)).toHaveAttribute("role", "status");
    await user.click(screen.getByRole("button", { name: "Keep Subscription" }));
    expect(await screen.findByText("Active")).toBeVisible();
    expect(screen.getByText(/No immediate Class Credits were granted/)).toHaveAttribute("role", "status");
  });

  it("clears an inspected account when the target Student ID changes", async () => {
    const user = userEvent.setup();
    renderWithLocale(<AdminClassCredits />, "en", [{
      request: { query: AdministrationClassCreditsDocument, variables: { studentUserId } },
      result: { data: { administrationClassCredits: initialAccount } },
    }]);
    const target = screen.getByRole("textbox", { name: "Student User ID" });
    await user.type(target, studentUserId);
    await user.click(screen.getByRole("button", { name: "Inspect Class Credits" }));
    expect(await screen.findByText("2 Class Credits available")).toBeVisible();

    await user.type(target, "2");

    expect(screen.queryByText("2 Class Credits available")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply Credit Adjustment" })).not.toBeInTheDocument();
  });

  it("reuses the Idempotency Key when a committed response is lost", async () => {
    const user = userEvent.setup();
    const idempotencyKeyFactory = vi.fn()
      .mockReturnValueOnce("stable-attempt-key")
      .mockReturnValue("next-attempt-key");
    const adjustmentRequest = {
      query: AdjustClassCreditsDocument,
      variables: { input: { idempotencyKey: "stable-attempt-key", studentUserId, amount: 1, reason: "Recovered response" } },
    };
    renderWithLocale(<AdminClassCredits idempotencyKeyFactory={idempotencyKeyFactory} />, "en", [
      {
        request: { query: AdministrationClassCreditsDocument, variables: { studentUserId } },
        result: { data: { administrationClassCredits: initialAccount } },
      },
      { request: adjustmentRequest, error: new Error("response lost") },
      { request: adjustmentRequest, result: { data: { adjustClassCredits: { account: { ...initialAccount, availableBalance: 3 } } } } },
    ]);
    await user.type(screen.getByRole("textbox", { name: "Student User ID" }), studentUserId);
    await user.click(screen.getByRole("button", { name: "Inspect Class Credits" }));
    await screen.findByText("2 Class Credits available");
    await user.type(screen.getByRole("spinbutton", { name: "Signed adjustment" }), "1");
    await user.type(screen.getByRole("textbox", { name: "Student-visible reason" }), "Recovered response");

    await user.click(screen.getByRole("button", { name: "Apply Credit Adjustment" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Apply Credit Adjustment" }));

    expect(await screen.findByText("3 Class Credits available")).toBeVisible();
    expect(idempotencyKeyFactory).toHaveBeenCalledTimes(1);
  });

  it("has no serious or critical automated accessibility violations", async () => {
    const { container } = renderWithLocale(<>
      <AdminClassCredits />
      <StudentSubscription />
    </>, "en", [{
      request: { query: StudentSubscriptionDocument },
      result: { data: { studentSubscription: null } },
    }]);
    await screen.findByRole("heading", { name: "My Subscription" });
    const result = await axe.run(container);
    expect(result.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });
});

function renderWithLocale(
  element: React.ReactNode,
  locale: "en" | "es",
  mocks: NonNullable<React.ComponentProps<typeof MockedProvider>["mocks"]>,
) {
  return render(
    <MockedProvider mocks={mocks}>
      <IntlProvider locale={locale} messages={interfaceMessages[locale]}>
        {element}
      </IntlProvider>
    </MockedProvider>,
  );
}
