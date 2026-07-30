import { MockedProvider } from "@apollo/client/testing/react";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  StudentWorkspaceDocument,
} from "../src/generated/graphql.js";
import type {
  InterfaceLocale,
  UserRole,
} from "../src/generated/graphql.js";
import { StudentWorkspaceScreen } from "../src/student-workspace.js";

afterEach(cleanup);

function studentWorkspaceMock(interfaceLocale: InterfaceLocale) {
  return {
    request: { query: StudentWorkspaceDocument },
    result: {
      data: {
        studentWorkspace: {
          user: {
            id: "00000000-0000-4000-8000-000000000001",
            displayName: "Sofía Rivera",
            interfaceLocale,
            displayTimeZone: "America/Denver",
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
