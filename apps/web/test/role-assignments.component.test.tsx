import { MockedProvider } from "@apollo/client/testing/react";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { IntlProvider } from "react-intl";

import {
  AnonymizeUserDocument,
  GrantRoleAssignmentDocument,
  RemoveRoleAssignmentDocument,
  RoleAssignmentAdministrationDocument,
  SuspendUserDocument,
} from "../src/generated/graphql.js";
import { RoleAssignmentAdministrationPanel } from "../src/role-assignments.js";

afterEach(cleanup);

const userId = "00000000-0000-4000-8000-000000000046";
const roleUser = {
  id: userId,
  displayName: "Lucía User",
  accessStatus: "ACTIVE" as const,
  suspensionReason: null,
  roles: ["STUDENT" as const],
  roleAssignmentHistory: [],
};

describe("Role Assignment administration", () => {
  it("grants a reasoned Role Assignment and keeps the User's existing role visible", async () => {
    const user = userEvent.setup();
    renderPanel([
      { request: { query: RoleAssignmentAdministrationDocument }, result: { data: { roleAssignmentAdministration: { organizations: [], users: [roleUser] } } } },
      {
        request: { query: GrantRoleAssignmentDocument, variables: { input: { idempotencyKey: "grant-role-key", userId, role: "TEACHER", reason: "Approved for teaching", organizationId: null } } },
        result: { data: { grantRoleAssignment: { __typename: "RoleAssignmentChangeSuccess", user: { ...roleUser, roles: ["STUDENT", "TEACHER"], roleAssignmentHistory: [{ id: "change-46", action: "GRANTED", role: "TEACHER", reason: "Approved for teaching", changedAt: "2026-08-18T18:00:00.000Z" }] }, endedBookingCount: 0, removedWaitlistEntryCount: 0, refundedClassCreditCount: 0, subscriptionEnded: false, sponsorshipEnded: false } } },
      },
    ], "en", () => "grant-role-key");

    expect(await screen.findByRole("heading", { name: "Role Assignments" })).toBeVisible();
    expect(screen.getAllByText("Student").some((element) => element.tagName === "LI")).toBe(true);
    await user.selectOptions(screen.getByRole("combobox", { name: "User" }), userId);
    await user.selectOptions(screen.getByRole("combobox", { name: "Role" }), "TEACHER");
    await user.type(screen.getByRole("textbox", { name: "Reason" }), "Approved for teaching");
    await user.click(screen.getByRole("button", { name: "Grant Role Assignment" }));

    expect(await screen.findByText("Role Assignment granted.")).toHaveAttribute("role", "status");
    expect(screen.getAllByText("Teacher").some((element) => element.tagName === "LI")).toBe(true);
    expect(screen.getByText(/Approved for teaching/)).toBeVisible();
  });

  it("has no serious or critical automated accessibility violations", async () => {
    const user = userEvent.setup();
    const { container } = renderPanel([
      { request: { query: RoleAssignmentAdministrationDocument }, result: { data: { roleAssignmentAdministration: { organizations: [], users: [roleUser] } } } },
    ], "es");
    expect(await screen.findByRole("heading", { name: "Asignaciones de roles" })).toBeVisible();
    await user.selectOptions(screen.getByRole("combobox", { name: "Acción" }), "SUSPEND");
    expect(screen.getByRole("button", { name: "Suspender usuario" })).toBeVisible();
    await user.selectOptions(screen.getByRole("combobox", { name: "Acción" }), "ANONYMIZE");
    expect(screen.getByRole("textbox", { name: /ANONYMIZE USER/ })).toBeVisible();
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it("suspends a User with a visible reason while keeping assigned roles visible", async () => {
    const user = userEvent.setup();
    renderPanel([
      { request: { query: RoleAssignmentAdministrationDocument }, result: { data: { roleAssignmentAdministration: { organizations: [], users: [roleUser] } } } },
      {
        request: { query: SuspendUserDocument, variables: { input: { idempotencyKey: "suspend-user-key", userId, reason: "Security review in progress" } } },
        result: { data: { suspendUser: { __typename: "UserAccessChangeSuccess", user: { ...roleUser, accessStatus: "SUSPENDED", suspensionReason: "Security review in progress" }, endedBookingCount: 0, removedWaitlistEntryCount: 0, refundedClassCreditCount: 0, teacherClassSessionIds: [] } } },
      },
    ], "en", () => "suspend-user-key");

    await screen.findByRole("heading", { name: "Role Assignments" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Action" }), "SUSPEND");
    await user.type(screen.getByRole("textbox", { name: "Reason" }), "Security review in progress");
    await user.click(screen.getByRole("button", { name: "Suspend User" }));

    expect(await screen.findByRole("status")).toHaveTextContent("User suspended.");
    expect(screen.getByText("Suspended: Security review in progress")).toBeVisible();
    expect(screen.getAllByText("Student").some((element) => element.tagName === "LI")).toBe(true);
  });

  it("requires the deliberate phrase before anonymizing a User", async () => {
    const user = userEvent.setup();
    renderPanel([
      { request: { query: RoleAssignmentAdministrationDocument }, result: { data: { roleAssignmentAdministration: { organizations: [], users: [roleUser] } } } },
      {
        request: { query: AnonymizeUserDocument, variables: { input: { idempotencyKey: "anonymize-user-key", userId, reason: "User requested irreversible privacy action", confirmation: "ANONYMIZE USER" } } },
        result: { data: { anonymizeUser: { __typename: "AnonymizeUserSuccess", state: "PENDING", user: { ...roleUser, displayName: "Former User", accessStatus: "ANONYMIZATION_PENDING", roles: [] }, redactedLearningFeedbackCount: 1, redactedSessionRatingCount: 1 } } },
      },
    ], "en", () => "anonymize-user-key");

    await screen.findByRole("heading", { name: "Role Assignments" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Action" }), "ANONYMIZE");
    await user.type(screen.getByRole("textbox", { name: "Reason" }), "User requested irreversible privacy action");
    expect(screen.getByRole("button", { name: "Anonymize User" })).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: /Type ANONYMIZE USER/ }), "ANONYMIZE USER");
    await user.click(screen.getByRole("button", { name: "Anonymize User" }));

    expect(await screen.findByRole("status")).toHaveTextContent("User Anonymization accepted. Identity deletion is pending.");
    expect(screen.getByRole("heading", { name: "Former User" })).toBeVisible();
    expect(screen.getByText("Anonymization pending identity deletion")).toBeVisible();
  });

  it("localizes typed server errors instead of displaying server-authored English", async () => {
    const user = userEvent.setup();
    renderPanel([
      { request: { query: RoleAssignmentAdministrationDocument }, result: { data: { roleAssignmentAdministration: { organizations: [], users: [roleUser] } } } },
      {
        request: { query: RemoveRoleAssignmentDocument, variables: { input: { idempotencyKey: "remove-role-key", userId, role: "STUDENT", reason: "Cambio administrativo", organizationId: null } } },
        result: { data: { removeRoleAssignment: { __typename: "RoleAssignmentError", code: "ROLE_NOT_ASSIGNED", message: "The User does not have this Role Assignment.", classSessionIds: [] } } },
      },
    ], "es", () => "remove-role-key");

    await screen.findByRole("heading", { name: "Asignaciones de roles" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Acción" }), "REMOVE");
    await user.type(screen.getByRole("textbox", { name: "Motivo" }), "Cambio administrativo");
    await user.click(screen.getByRole("button", { name: "Eliminar asignación de rol" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El usuario no tiene esta asignación de rol.");
    expect(screen.queryByText("The User does not have this Role Assignment.")).not.toBeInTheDocument();
  });
});

function renderPanel(
  mocks: React.ComponentProps<typeof MockedProvider>["mocks"],
  locale: "en" | "es",
  idempotencyKeyFactory = () => "role-key",
) {
  return render(
    <MockedProvider mocks={mocks ?? []}>
      <IntlProvider locale={locale} messages={interfaceMessages[locale]}>
        <RoleAssignmentAdministrationPanel idempotencyKeyFactory={idempotencyKeyFactory} />
      </IntlProvider>
    </MockedProvider>,
  );
}
