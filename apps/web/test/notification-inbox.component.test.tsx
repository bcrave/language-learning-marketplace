import { MockedProvider } from "@apollo/client/testing/react";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { IntlProvider } from "react-intl";
import type { ComponentProps } from "react";

import { MarkNotificationReadDocument, NotificationsDocument } from "../src/generated/graphql.js";
import { NotificationInbox } from "../src/notification-inbox.js";

afterEach(cleanup);

describe("Notification inbox", () => {
  const notification = {
    id: "00000000-0000-4000-8000-000000000036",
    messageId: "subscription.renewed.student",
    renderedContent: "Suscripción renovada con 8 créditos de clase.",
    readAt: null,
    archivedAt: null,
    createdAt: "2026-08-09T12:00:00.000Z",
  };

  it("shows localized durable messages and lets the User mark one read", async () => {
    const user = userEvent.setup();
    renderInbox([
      { request: { query: NotificationsDocument }, result: { data: { notifications: [notification] } } },
      { request: { query: MarkNotificationReadDocument, variables: { id: notification.id } }, result: { data: { markNotificationRead: { ...notification, readAt: "2026-08-09T12:01:00.000Z" } } } },
    ]);

    expect(await screen.findByRole("heading", { name: "Notificaciones" })).toBeVisible();
    expect(screen.getByText(notification.renderedContent)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Marcar como leída" }));
    expect(await screen.findByText("Leída")).toHaveAttribute("role", "status");
  });

  it("has no serious or critical accessibility violations", async () => {
    const { container } = renderInbox([
      { request: { query: NotificationsDocument }, result: { data: { notifications: [notification] } } },
    ]);
    await screen.findByRole("heading", { name: "Notificaciones" });
    const result = await axe.run(container);
    expect(result.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });

  function renderInbox(mocks: NonNullable<ComponentProps<typeof MockedProvider>["mocks"]>) {
    return render(
      <MockedProvider mocks={mocks}>
        <IntlProvider locale="es" messages={interfaceMessages.es}>
          <NotificationInbox />
        </IntlProvider>
      </MockedProvider>,
    );
  }
});
