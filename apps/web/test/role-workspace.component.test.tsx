import { MockedProvider } from "@apollo/client/testing/react";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
  it("does not replay a consumed role choice from browser history", async () => {
    window.sessionStorage.setItem("marketplace.actingRole", "STUDENT");
    const user = {
      id: "00000000-0000-4000-8000-000000000010",
      displayName: "María Torres",
      interfaceLocale: "EN" as const,
      displayTimeZone: "America/Denver",
    };
    const rolePlaces = [
      { role: "STUDENT" as const, place: "STUDENT_DISCOVERY" as const },
      { role: "TEACHER" as const, place: "TEACHER_SCHEDULE" as const },
    ];
    const studentResult = {
      data: {
        roleWorkspace: {
          actingRole: "STUDENT" as const,
          relationshipScope: "SELF" as const,
          rolePlaces,
          user,
        },
      },
    };
    const router = createMemoryRouter(workspaceRouteObjects, {
      initialEntries: ["/student/discover"],
    });

    render(
      <MockedProvider
        mocks={[
          {
            request: {
              query: RoleWorkspaceDocument,
              variables: { actingRole: "STUDENT" },
            },
            result: studentResult,
          },
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
                  rolePlaces,
                  user,
                },
              },
            },
          },
          {
            request: {
              query: RoleWorkspaceDocument,
              variables: { actingRole: "STUDENT" },
            },
            result: studentResult,
          },
        ]}
      >
        <RouterProvider router={router} />
      </MockedProvider>,
    );

    await screen.findByRole("heading", { name: "Discover Class Sessions" });
    await act(() =>
      router.navigate("/teacher/schedule", {
        state: { explicitRole: "TEACHER" },
      }),
    );
    await screen.findByRole("heading", { name: "Teaching schedule" });
    await waitFor(() =>
      expect(window.sessionStorage.getItem("marketplace.actingRole")).toBe(
        "TEACHER",
      ),
    );
    await act(() =>
      router.navigate("/student/discover", {
        state: { explicitRole: "STUDENT" },
      }),
    );
    await screen.findByRole("heading", { name: "Discover Class Sessions" });
    await waitFor(() =>
      expect(window.sessionStorage.getItem("marketplace.actingRole")).toBe(
        "STUDENT",
      ),
    );

    await act(() => router.navigate(-1));

    expect(
      await screen.findByRole("heading", {
        name: "Change to the Teacher workspace?",
      }),
    ).toBeVisible();
    expect(window.sessionStorage.getItem("marketplace.actingRole")).toBe(
      "STUDENT",
    );
  });

  it("requires a new explicit choice after client-side navigation changes roles", async () => {
    window.sessionStorage.setItem("marketplace.actingRole", "TEACHER");
    const router = createMemoryRouter(workspaceRouteObjects, {
      initialEntries: ["/teacher/schedule"],
    });

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
                    { role: "TEACHER", place: "TEACHER_SCHEDULE" },
                    {
                      role: "PLATFORM_ADMINISTRATOR",
                      place: "ADMINISTRATION_OPERATIONS",
                    },
                  ],
                },
              },
            },
          },
        ]}
      >
        <RouterProvider router={router} />
      </MockedProvider>,
    );

    await screen.findByRole("heading", { name: "Teaching schedule" });
    await act(() => router.navigate("/administration/operations"));

    expect(
      await screen.findByRole("heading", {
        name: "Change to the Platform Administrator workspace?",
      }),
    ).toBeVisible();
    expect(window.sessionStorage.getItem("marketplace.actingRole")).toBe(
      "TEACHER",
    );
  });

  it("follows the server-remembered Student place from the canonical entry", async () => {
    render(
      <MockedProvider
        mocks={[
          {
            request: {
              query: RoleWorkspaceDocument,
              variables: { actingRole: "STUDENT" },
            },
            result: {
              data: {
                roleWorkspace: {
                  actingRole: "STUDENT",
                  relationshipScope: "SELF",
                  user: {
                    id: "00000000-0000-4000-8000-000000000010",
                    displayName: "María Torres",
                    interfaceLocale: "EN",
                    displayTimeZone: "America/Denver",
                  },
                  rolePlaces: [
                    { role: "STUDENT", place: "STUDENT_LEARNING" },
                  ],
                },
              },
            },
          },
          {
            request: {
              query: RoleWorkspaceDocument,
              variables: { actingRole: "STUDENT" },
            },
            result: {
              data: {
                roleWorkspace: {
                  actingRole: "STUDENT",
                  relationshipScope: "SELF",
                  user: {
                    id: "00000000-0000-4000-8000-000000000010",
                    displayName: "María Torres",
                    interfaceLocale: "EN",
                    displayTimeZone: "America/Denver",
                  },
                  rolePlaces: [
                    { role: "STUDENT", place: "STUDENT_LEARNING" },
                  ],
                },
              },
            },
          },
        ]}
      >
        <RouterProvider
          router={createMemoryRouter(workspaceRouteObjects, {
            initialEntries: ["/student"],
          })}
        />
      </MockedProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "My learning" }),
    ).toBeVisible();
  });

  it("guards the Student landing alias when another acting role is current", async () => {
    window.sessionStorage.setItem("marketplace.actingRole", "TEACHER");

    render(
      <MockedProvider>
        <RouterProvider
          router={createMemoryRouter(workspaceRouteObjects, {
            initialEntries: ["/student"],
          })}
        />
      </MockedProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Change to the Student workspace?",
      }),
    ).toBeVisible();
    expect(window.sessionStorage.getItem("marketplace.actingRole")).toBe(
      "TEACHER",
    );
  });

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
