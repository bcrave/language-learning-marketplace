import { MockedProvider } from "@apollo/client/testing/react";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";

import { OrganizationSponsorshipPanel, StudentSponsorshipPanel } from "../src/sponsorship.js";
import {
  AcceptSponsorshipInvitationDocument,
  DeclineSponsorshipInvitationDocument,
  EndSponsorshipAsOrganizationDocument,
  EndSponsorshipAsStudentDocument,
  InviteToSponsorshipDocument,
  OrganizationSponsoredStudentsDocument,
  OrganizationSponsorshipInvitationsDocument,
  StudentSponsorshipDocument,
  StudentSponsorshipInvitationsDocument,
} from "../src/generated/graphql.js";

afterEach(cleanup);

const studentUserId = "00000000-0000-4000-8000-000000000001";
const invitationId = "00000000-0000-4000-8000-000000000050";
const organization = { id: "00000000-0000-4000-8000-000000000041", name: "Nimbus Logistics" };
const disclosure = {
  version: "1",
  benefitDescription: "Eight Class Credits at acceptance and eight more on each monthly anniversary.",
  organizationVisibleDataDescription: "Your attendance and Course Progress during the Sponsorship.",
  excludedPrivateDataDescription: "Private Learning Feedback, Session Ratings, and your total balance.",
};
const pendingInvitation = {
  id: invitationId,
  studentUserId,
  studentDisplayName: "Casey Nguyen",
  state: "PENDING" as const,
  expiresAt: "2026-08-25T18:00:00.000Z",
  createdAt: "2026-08-11T18:00:00.000Z",
  decidedAt: null,
  organization,
  disclosure,
};
const sponsorshipId = "00000000-0000-4000-8000-000000000060";
const activeSponsorship = {
  id: sponsorshipId,
  studentUserId,
  studentDisplayName: "Casey Nguyen",
  acceptedAt: "2026-08-11T18:05:00.000Z",
  nextAnniversaryAt: "2026-09-11T18:05:00.000Z",
  state: "ACTIVE" as const,
  endedAt: null,
  endedByParty: null,
  reportingFrom: "2026-08-11T18:05:00.000Z",
  reportingUntil: null,
  organization,
  progressSnapshots: [],
};
const endedSponsorship = {
  ...activeSponsorship,
  nextAnniversaryAt: null,
  state: "ENDED" as const,
  endedAt: "2026-08-20T12:00:00.000Z",
  reportingUntil: "2026-08-20T12:00:00.000Z",
  progressSnapshots: [{
    boundary: "SPONSORSHIP_END" as const,
    courseId: "00000000-0000-4000-8000-000000000070",
    courseTitle: "Spanish B2",
    completedActiveLessonUnitCount: 3,
    activeLessonUnitCount: 4,
    percentage: 75,
    capturedAt: "2026-08-20T12:00:00.000Z",
  }],
};

describe("Sponsorship", () => {
  it("lets a Student review the disclosure and accept a pending Sponsorship Invitation", async () => {
    const user = userEvent.setup();
    renderWithLocale(
      <StudentSponsorshipPanel idempotencyKeyFactory={() => "accept-key"} />,
      "en",
      [
        { request: { query: StudentSponsorshipDocument }, result: { data: { studentSponsorship: null } } },
        { request: { query: StudentSponsorshipInvitationsDocument }, result: { data: { studentSponsorshipInvitations: [pendingInvitation] } } },
        {
          request: { query: AcceptSponsorshipInvitationDocument, variables: { input: { idempotencyKey: "accept-key", invitationId } } },
          result: { data: { acceptSponsorshipInvitation: {
            sponsorship: activeSponsorship,
            account: { studentUserId, availableBalance: 8 },
          } } },
        },
      ],
    );

    expect(await screen.findByRole("heading", { name: "My Sponsorship" })).toBeVisible();
    expect(screen.getByText("No Organization currently sponsors you.")).toBeVisible();
    expect(screen.getByText(/Eight Class Credits at acceptance/)).toBeVisible();
    expect(screen.getByText(/Your attendance and Course Progress/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Accept" }));

    expect(await screen.findByText("Sponsorship accepted.")).toHaveAttribute("role", "status");
    expect(screen.getByText("Accepted")).toBeVisible();
    expect(screen.getAllByText("Organization: Nimbus Logistics")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
  });

  it("lets a Student decline a pending Sponsorship Invitation", async () => {
    const user = userEvent.setup();
    renderWithLocale(
      <StudentSponsorshipPanel idempotencyKeyFactory={() => "decline-key"} />,
      "en",
      [
        { request: { query: StudentSponsorshipDocument }, result: { data: { studentSponsorship: null } } },
        { request: { query: StudentSponsorshipInvitationsDocument }, result: { data: { studentSponsorshipInvitations: [pendingInvitation] } } },
        {
          request: { query: DeclineSponsorshipInvitationDocument, variables: { input: { idempotencyKey: "decline-key", invitationId } } },
          result: { data: { declineSponsorshipInvitation: { invitation: { ...pendingInvitation, state: "DECLINED", decidedAt: "2026-08-11T18:05:00.000Z" } } } },
        },
      ],
    );

    await screen.findByRole("heading", { name: "My Sponsorship" });
    await user.click(screen.getByRole("button", { name: "Decline" }));

    expect(await screen.findByText("Invitation declined.")).toHaveAttribute("role", "status");
    expect(screen.getByText("Declined")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
  });

  it("lets an Organization Manager invite a Student and see the resulting invitation and sponsored Students", async () => {
    const user = userEvent.setup();
    renderWithLocale(
      <OrganizationSponsorshipPanel idempotencyKeyFactory={() => "invite-key"} />,
      "en",
      [
        { request: { query: OrganizationSponsorshipInvitationsDocument }, result: { data: { organizationSponsorshipInvitations: [] } } },
        { request: { query: OrganizationSponsoredStudentsDocument }, result: { data: { organizationSponsoredStudents: [] } } },
        {
          request: { query: InviteToSponsorshipDocument, variables: { input: { idempotencyKey: "invite-key", studentUserId } } },
          result: { data: { inviteToSponsorship: { invitation: pendingInvitation } } },
        },
      ],
    );

    expect(await screen.findByRole("heading", { name: "Invite a Student to Sponsorship" })).toBeVisible();
    expect(screen.getByText("Your Organization has not sent any Sponsorship Invitations.")).toBeVisible();

    await user.type(screen.getByRole("textbox", { name: "Student User ID" }), studentUserId);
    await user.click(screen.getByRole("button", { name: "Send Sponsorship Invitation" }));

    expect(await screen.findByText("Sponsorship Invitation sent.")).toHaveAttribute("role", "status");
    expect(screen.getByText("Student: Casey Nguyen")).toBeVisible();
  });

  it("shows a typed error when a Student is already sponsored", async () => {
    const user = userEvent.setup();
    renderWithLocale(
      <OrganizationSponsorshipPanel idempotencyKeyFactory={() => "invite-key"} />,
      "en",
      [
        { request: { query: OrganizationSponsorshipInvitationsDocument }, result: { data: { organizationSponsorshipInvitations: [] } } },
        { request: { query: OrganizationSponsoredStudentsDocument }, result: { data: { organizationSponsoredStudents: [] } } },
        {
          request: { query: InviteToSponsorshipDocument, variables: { input: { idempotencyKey: "invite-key", studentUserId } } },
          result: { data: { inviteToSponsorship: { code: "STUDENT_ALREADY_SPONSORED", message: "The Student already has a Sponsorship." } } },
        },
      ],
    );

    await screen.findByRole("heading", { name: "Invite a Student to Sponsorship" });
    await user.type(screen.getByRole("textbox", { name: "Student User ID" }), studentUserId);
    await user.click(screen.getByRole("button", { name: "Send Sponsorship Invitation" }));

    expect(await screen.findByText("The Student already has a Sponsorship.")).toHaveAttribute("role", "alert");
  });

  it("lets a Student end their own Sponsorship and keeps their Class Credits", async () => {
    const user = userEvent.setup();
    renderWithLocale(
      <StudentSponsorshipPanel idempotencyKeyFactory={() => "end-key"} />,
      "en",
      [
        { request: { query: StudentSponsorshipDocument }, result: { data: { studentSponsorship: activeSponsorship } } },
        { request: { query: StudentSponsorshipInvitationsDocument }, result: { data: { studentSponsorshipInvitations: [] } } },
        {
          request: { query: EndSponsorshipAsStudentDocument, variables: { input: { idempotencyKey: "end-key" } } },
          result: { data: { endSponsorshipAsStudent: {
            sponsorship: endedSponsorship,
            account: { studentUserId, availableBalance: 8 },
          } } },
        },
      ],
    );

    expect(await screen.findByRole("heading", { name: "End this Sponsorship" })).toBeVisible();
    expect(screen.getByText(/Organization reporting covers activity since/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "End Sponsorship" }));

    expect(await screen.findByText("Sponsorship ended. The Class Credits you already own remain yours.")).toHaveAttribute("role", "status");
    expect(screen.getByText("Ended")).toBeVisible();
    expect(screen.getByText(/Organization reporting is frozen to activity from/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "End Sponsorship" })).not.toBeInTheDocument();
  });

  it("lets an Organization Manager end a sponsored Student's Sponsorship and freeze its reporting", async () => {
    const user = userEvent.setup();
    renderWithLocale(
      <OrganizationSponsorshipPanel idempotencyKeyFactory={() => "end-key"} />,
      "en",
      [
        { request: { query: OrganizationSponsorshipInvitationsDocument }, result: { data: { organizationSponsorshipInvitations: [] } } },
        { request: { query: OrganizationSponsoredStudentsDocument }, result: { data: { organizationSponsoredStudents: [activeSponsorship] } } },
        {
          request: { query: EndSponsorshipAsOrganizationDocument, variables: { input: { idempotencyKey: "end-key", sponsorshipId } } },
          result: { data: { endSponsorshipAsOrganization: { sponsorship: endedSponsorship } } },
        },
      ],
    );

    expect(await screen.findByRole("heading", { name: "Sponsored Students" })).toBeVisible();
    expect(await screen.findByText("Student: Casey Nguyen")).toBeVisible();
    expect(screen.getByText("Active")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "End Sponsorship" }));

    expect(await screen.findByText("Sponsorship ended. Reporting is frozen to the Sponsorship period.")).toHaveAttribute("role", "status");
    expect(screen.getByText("Ended")).toBeVisible();
    expect(screen.getByText("Frozen ending — Spanish B2: 3 of 4 Lesson Units (75%)")).toBeVisible();
    expect(screen.queryByRole("button", { name: "End Sponsorship" })).not.toBeInTheDocument();
  });

  it("has no serious or critical automated accessibility violations", async () => {
    const { container } = renderWithLocale(
      <StudentSponsorshipPanel />,
      "en",
      [
        { request: { query: StudentSponsorshipDocument }, result: { data: { studentSponsorship: null } } },
        { request: { query: StudentSponsorshipInvitationsDocument }, result: { data: { studentSponsorshipInvitations: [pendingInvitation] } } },
      ],
    );
    await screen.findByRole("heading", { name: "My Sponsorship" });
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
