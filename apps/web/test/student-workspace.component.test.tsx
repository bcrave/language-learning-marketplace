import { MockedProvider } from "@apollo/client/testing/react";
import { Temporal } from "@js-temporal/polyfill";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  StudentWorkspaceDocument,
  SaveUserPreferencesDocument,
} from "../src/generated/graphql.js";
import type {
  InterfaceLocale,
  UserRole,
} from "../src/generated/graphql.js";
import { StudentWorkspaceScreen } from "../src/student-workspace.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function studentWorkspaceMock(
  interfaceLocale: InterfaceLocale | null,
  displayTimeZone: string | null = "America/Denver",
) {
  return {
    request: { query: StudentWorkspaceDocument },
    result: {
      data: {
        studentWorkspace: {
          user: {
            id: "00000000-0000-4000-8000-000000000001",
            displayName: "Sofía Rivera",
            interfaceLocale,
            displayTimeZone,
          },
          roles: ["STUDENT" as UserRole],
        },
      },
    },
  };
}

describe("Student workspace", () => {
  it("welcomes the persisted User in their Interface Locale", async () => {
    render(
      <MockedProvider
        mocks={[studentWorkspaceMock("ES" as InterfaceLocale)]}
      >
        <StudentWorkspaceScreen />
      </MockedProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Hola, Sofía Rivera" }),
    ).toBeVisible();
    expect(
      screen.getByRole("complementary", { name: "Espacio de estudiante" }),
    ).toBeVisible();
    expect(screen.getByText("Zona horaria: America/Denver")).toBeVisible();
    expect(document.documentElement).toHaveAttribute("lang", "es");
  });

  it("presents browser preferences as first-use suggestions until the User saves", async () => {
    vi.spyOn(window.navigator, "language", "get").mockReturnValue("en-US");
    render(
      <MockedProvider mocks={[studentWorkspaceMock(null, null)]}>
        <StudentWorkspaceScreen />
      </MockedProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Choose your preferences" }),
    ).toBeVisible();
    expect(screen.getByText(/suggested from this browser/i)).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Interface language" })).toHaveValue(
      "en",
    );
    expect(screen.getByRole("combobox", { name: "Display time zone" })).toHaveValue(
      "America/Denver",
    );
  });

  it("keeps saved preferences ahead of different browser suggestions", async () => {
    vi.spyOn(window.navigator, "language", "get").mockReturnValue("es-MX");
    render(
      <MockedProvider
        mocks={[
          studentWorkspaceMock("EN" as InterfaceLocale, "America/Los_Angeles"),
        ]}
      >
        <StudentWorkspaceScreen />
      </MockedProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Hello, Sofía Rivera" }),
    ).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Interface language" })).toHaveValue(
      "en",
    );
    expect(screen.getByRole("combobox", { name: "Display time zone" })).toHaveValue(
      "America/Los_Angeles",
    );
    expect(screen.queryByText(/suggested from this browser/i)).not.toBeInTheDocument();
  });

  it("deliberately saves both preferences and reflects them immediately", async () => {
    vi.spyOn(Temporal.Now, "instant").mockReturnValue(
      Temporal.Instant.from("2026-08-01T00:00:00Z"),
    );
    const user = userEvent.setup();
    render(
      <MockedProvider
        mocks={[
          studentWorkspaceMock("EN" as InterfaceLocale),
          {
            request: {
              query: SaveUserPreferencesDocument,
              variables: {
                input: {
                  actingRole: "STUDENT",
                  interfaceLocale: "ES",
                  displayTimeZone: "America/Los_Angeles",
                },
              },
            },
            result: {
              data: {
                saveUserPreferences: {
                  user: {
                    id: "00000000-0000-4000-8000-000000000001",
                    displayName: "Sofía Rivera",
                    interfaceLocale: "ES",
                    displayTimeZone: "America/Los_Angeles",
                  },
                },
              },
            },
          },
        ]}
      >
        <StudentWorkspaceScreen />
      </MockedProvider>,
    );

    await screen.findByRole("heading", { name: "Hello, Sofía Rivera" });
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Interface language" }),
      "es",
    );
    const timeZone = screen.getByRole("combobox", { name: "Display time zone" });
    await user.clear(timeZone);
    await user.type(timeZone, "America/Los_Angeles");
    const calendarDate = screen.getByLabelText("Calendar date");
    await user.clear(calendarDate);
    await user.type(calendarDate, "2026-08-01");
    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    expect(
      await screen.findByRole("heading", { name: "Hola, Sofía Rivera" }),
    ).toBeVisible();
    expect(screen.getByText("Preferencias guardadas.")).toHaveAttribute(
      "role",
      "status",
    );
    expect(screen.getByText(/31 de julio de 2026/)).toBeVisible();
    expect(screen.getByText(/1 de agosto de 2026.*7:00/)).toBeVisible();
  });

  it("has no serious or critical automated accessibility violations", async () => {
    const { container } = render(
      <MockedProvider
        mocks={[studentWorkspaceMock("EN" as InterfaceLocale)]}
      >
        <StudentWorkspaceScreen />
      </MockedProvider>,
    );

    await screen.findByRole("heading", { name: "Hello, Sofía Rivera" });
    const result = await axe.run(container);
    expect(
      result.violations.filter(({ impact }) =>
        impact === "serious" || impact === "critical",
      ),
    ).toEqual([]);
  });

  it("localizes a failed workspace request from the browser suggestion", async () => {
    vi.spyOn(window.navigator, "language", "get").mockReturnValue("es-MX");
    render(
      <MockedProvider
        mocks={[
          {
            request: { query: StudentWorkspaceDocument },
            error: new Error("private diagnostic"),
          },
        ]}
      >
        <StudentWorkspaceScreen />
      </MockedProvider>,
    );

    expect(
      await screen.findByText("No pudimos abrir tu espacio. Inténtalo de nuevo."),
    ).toHaveAttribute("role", "alert");
  });
});
