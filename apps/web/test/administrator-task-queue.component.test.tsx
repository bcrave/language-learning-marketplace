import { MockedProvider } from "@apollo/client/testing/react";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { IntlProvider } from "react-intl";

import { AdministratorTasksDocument, ResolveAdministratorTaskDocument } from "../src/generated/graphql.js";
import { AdministratorTaskQueue } from "../src/administrator-task-queue.js";

afterEach(cleanup);

describe("Administrator task queue", () => {
  it("shows the Class Session requiring urgent resolution after a Teacher suspension", async () => {
    const task = { id: "00000000-0000-4000-8000-000000000047", requiredRole: "PLATFORM_ADMINISTRATOR" as const, kind: "USER_SUSPENSION_TEACHER_ASSIGNMENT", state: "OPEN", correlationReference: "safe-correlation-47", safeContext: { channel: null, messageId: null, recipientReference: null, classSessionId: "00000000-0000-4000-8000-000000000147", suspendedUserId: "00000000-0000-4000-8000-000000000247" }, createdAt: "2026-08-19T18:00:00.000Z", resolvedAt: null };
    render(
      <MockedProvider mocks={[{ request: { query: AdministratorTasksDocument }, result: { data: { administratorTasks: [task] } } }]}>
        <IntlProvider locale="en" messages={interfaceMessages.en}>
          <AdministratorTaskQueue />
        </IntlProvider>
      </MockedProvider>,
    );

    expect(await screen.findByText("Resolve a suspended Teacher's future Class Session assignment.")).toBeVisible();
    expect(screen.getByText(task.safeContext.classSessionId)).toBeVisible();
    expect(screen.queryByText(task.safeContext.suspendedUserId)).not.toBeInTheDocument();
  });

  it("shows safe reconciliation context and resolves actionable work", async () => {
    const user = userEvent.setup();
    const task = { id: "00000000-0000-4000-8000-000000000036", requiredRole: "PLATFORM_ADMINISTRATOR" as const, kind: "NOTIFICATION_DELIVERY_RECONCILIATION", state: "OPEN", correlationReference: "safe-correlation-36", safeContext: { channel: "EMAIL", messageId: "booking.created.student", recipientReference: null, classSessionId: null, suspendedUserId: null }, createdAt: "2026-08-09T12:00:00.000Z", resolvedAt: null };
    const { container } = render(
      <MockedProvider mocks={[
        { request: { query: AdministratorTasksDocument }, result: { data: { administratorTasks: [task] } } },
        { request: { query: ResolveAdministratorTaskDocument, variables: { input: { idempotencyKey: "task-key-36", taskId: task.id, reason: "Delivery reconciled safely." } } }, result: { data: { resolveAdministratorTask: { __typename: "ResolveAdministratorTaskSuccess", task: { ...task, state: "RESOLVED", resolvedAt: "2026-08-09T12:05:00.000Z" } } } } },
      ]}>
        <IntlProvider locale="en" messages={interfaceMessages.en}>
          <AdministratorTaskQueue createIdempotencyKey={() => "task-key-36"} />
        </IntlProvider>
      </MockedProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Administrator tasks" })).toBeVisible();
    expect(screen.getByText(/safe-correlation-36/)).toBeVisible();
    expect(screen.queryByText(/diagnostic/i)).not.toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Resolution reason" }), "Delivery reconciled safely.");
    await user.click(screen.getByRole("button", { name: "Resolve task" }));
    expect(await screen.findByText("Task resolved.")).toHaveAttribute("role", "status");

    // Scanned after resolving rather than before: the queue's accessible state
    // includes the confirmation it announces, and that markup exists only here.
    const accessibility = await axe.run(container);
    expect(
      accessibility.violations.filter(
        ({ impact }) => impact === "serious" || impact === "critical",
      ),
    ).toEqual([]);
  });
});
