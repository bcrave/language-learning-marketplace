import { MockedProvider } from "@apollo/client/testing/react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import {
  RememberRoleWorkspacePlaceDocument,
  RoleWorkspaceDocument,
} from "../src/generated/graphql.js";
import { workspaceRouteObjects } from "../src/app.js";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe("Role workspace navigation", () => {
  it("requires authorization after an explicit incompatible deep-link choice", async () => {
    window.sessionStorage.setItem("marketplace.actingRole", "STUDENT");

    const { container } = render(
      <MockedProvider>
        <RouterProvider
          router={createMemoryRouter(workspaceRouteObjects, {
            initialEntries: ["/teacher/schedule"],
          })}
        />
      </MockedProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Change to the Teacher workspace?" }),
    ).toBeVisible();
    expect(screen.getByText(/will not change your acting role/i)).toBeVisible();
    const accessibility = await axe.run(container);
    expect(
      accessibility.violations.filter(({ impact }) =>
        impact === "serious" || impact === "critical",
      ),
    ).toEqual([]);

    await userEvent.click(
      screen.getByRole("button", { name: "Change to Teacher" }),
    );
    expect(window.sessionStorage.getItem("marketplace.actingRole")).toBe("STUDENT");
  });

  it("keeps the acting role, relationship scope, and journey map visible", async () => {
    const { container } = render(
      <MockedProvider
        mocks={[
          {
            request: {
              query: RoleWorkspaceDocument,
              variables: { actingRole: "TEACHER" },
            },
            result: {
              data: {
                roleWorkspace: {
                  actingRole: "TEACHER",
                  relationshipScope: "ASSIGNED_CLASS_SESSIONS",
                  user: {
                    id: "00000000-0000-4000-8000-000000000010",
                    displayName: "María Torres",
                    interfaceLocale: "EN",
                    displayTimeZone: "America/Denver",
                  },
                  rolePlaces: [
                    { role: "STUDENT", place: "STUDENT_LEARNING" },
                    { role: "TEACHER", place: "TEACHER_SCHEDULE" },
                  ],
                },
              },
            },
          },
        ]}
      >
        <RouterProvider
          router={createMemoryRouter(workspaceRouteObjects, {
            initialEntries: [
              {
                pathname: "/teacher/schedule",
                state: { explicitRole: "TEACHER" },
              },
            ],
          })}
        />
      </MockedProvider>,
    );

    const contextRail = await screen.findByRole("complementary", {
      name: "Teacher workspace",
    });
    expect(contextRail).toBeVisible();
    expect(
      within(contextRail).getByText("Scope: Assigned Class Sessions"),
    ).toBeVisible();
    expect(within(contextRail).getByRole("link", { name: "Teaching schedule" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(contextRail).getByRole("link", { name: "Availability" })).toBeVisible();
    expect(
      within(contextRail).getByRole("combobox", { name: "Acting role" }),
    ).toHaveValue("TEACHER");
    const accessibility = await axe.run(container);
    expect(
      accessibility.violations.filter(({ impact }) =>
        impact === "serious" || impact === "critical",
      ),
    ).toEqual([]);
  });

  it("remembers a journey before showing the selected place", async () => {
    render(
      <MockedProvider
        mocks={[
          {
            request: {
              query: RoleWorkspaceDocument,
              variables: { actingRole: "TEACHER" },
            },
            result: {
              data: {
                roleWorkspace: {
                  actingRole: "TEACHER",
                  relationshipScope: "ASSIGNED_CLASS_SESSIONS",
                  user: {
                    id: "00000000-0000-4000-8000-000000000010",
                    displayName: "María Torres",
                    interfaceLocale: "EN",
                    displayTimeZone: "America/Denver",
                  },
                  rolePlaces: [
                    { role: "STUDENT", place: "STUDENT_DISCOVERY" },
                    { role: "TEACHER", place: "TEACHER_SCHEDULE" },
                  ],
                },
              },
            },
          },
          {
            request: {
              query: RememberRoleWorkspacePlaceDocument,
              variables: {
                input: {
                  actingRole: "TEACHER",
                  place: "TEACHER_AVAILABILITY",
                },
              },
            },
            result: {
              data: {
                rememberRoleWorkspacePlace: {
                  role: "TEACHER",
                  place: "TEACHER_AVAILABILITY",
                },
              },
            },
          },
        ]}
      >
        <RouterProvider
          router={createMemoryRouter(workspaceRouteObjects, {
            initialEntries: [
              {
                pathname: "/teacher/schedule",
                state: { explicitRole: "TEACHER" },
              },
            ],
          })}
        />
      </MockedProvider>,
    );

    await screen.findByRole("heading", { name: "Teaching schedule" });
    const contextRail = screen.getByRole("complementary", {
      name: "Teacher workspace",
    });
    await userEvent.click(
      within(contextRail).getByRole("link", { name: "Availability" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Availability" }),
    ).toBeVisible();
    expect(within(contextRail).getByRole("link", { name: "Availability" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
