import { MockedProvider } from "@apollo/client/testing/react";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";

import { OrganizationCohortsPanel } from "../src/cohorts.js";
import {
  AddCohortMembershipDocument,
  CreateCohortDocument,
  EndCohortMembershipDocument,
  OrganizationCohortsDocument,
  OrganizationSponsoredStudentsDocument,
} from "../src/generated/graphql.js";

afterEach(cleanup);

const organization = { id: "00000000-0000-4000-8000-000000000041", name: "Nimbus Logistics" };
const cohortId = "00000000-0000-4000-8000-000000000080";
const membershipId = "00000000-0000-4000-8000-000000000081";
const sponsorshipId = "00000000-0000-4000-8000-000000000060";
const studentUserId = "00000000-0000-4000-8000-000000000001";

const sponsoredStudent = {
  id: sponsorshipId,
  studentUserId,
  studentDisplayName: "Casey Nguyen",
  acceptedAt: "2026-08-01T18:00:00.000Z",
  nextAnniversaryAt: "2026-09-01T18:00:00.000Z",
  state: "ACTIVE" as const,
  endedAt: null,
  endedByParty: null,
  reportingFrom: "2026-08-01T18:00:00.000Z",
  reportingUntil: null,
  organization,
  progressSnapshots: [],
};

// The Cohort queries read a named fragment, so cached results only match the
// `... on Cohort` type condition when the mock carries __typename.
const emptyCohort = {
  __typename: "Cohort",
  id: cohortId,
  name: "Engineering",
  createdAt: "2026-08-12T12:00:00.000Z",
  organization: { __typename: "Organization", ...organization },
  attributedActivity: { __typename: "CohortAttributedActivity", attendedCount: 0, noShowCount: 0 },
  memberships: [],
};

const membership = {
  __typename: "CohortMembership",
  id: membershipId,
  cohortId,
  cohortName: "Engineering",
  sponsorshipId,
  studentUserId,
  studentDisplayName: "Casey Nguyen",
  effectiveFrom: "2026-08-12T12:00:00.000Z",
  effectiveUntil: null as string | null,
  attributedActivity: { __typename: "CohortAttributedActivity", attendedCount: 2, noShowCount: 1 },
};

const cohortWithMember = {
  ...emptyCohort,
  attributedActivity: { __typename: "CohortAttributedActivity", attendedCount: 2, noShowCount: 1 },
  memberships: [membership],
};

const cohortWithEndedMember = {
  ...cohortWithMember,
  memberships: [{ ...membership, effectiveUntil: "2026-09-15T12:00:00.000Z" }],
};

describe("Cohorts", () => {
  it("lets an Organization Manager create a Cohort and states that it grants nothing", async () => {
    const user = userEvent.setup();
    renderWithLocale(
      <OrganizationCohortsPanel idempotencyKeyFactory={() => "cohort-key"} />,
      "en",
      [
        { request: { query: OrganizationCohortsDocument }, result: { data: { organizationCohorts: [] } } },
        { request: { query: OrganizationSponsoredStudentsDocument }, result: { data: { organizationSponsoredStudents: [sponsoredStudent] } } },
        {
          request: { query: CreateCohortDocument, variables: { input: { idempotencyKey: "cohort-key", name: "Engineering" } } },
          result: { data: { createCohort: { cohort: emptyCohort } } },
        },
      ],
    );

    expect(await screen.findByRole("heading", { name: "Create a Cohort" })).toBeVisible();
    expect(screen.getByText(/grants no Class Credits, no additional authority, and no Booking restriction/)).toBeVisible();
    expect(screen.getByText("Your Organization has no Cohorts yet.")).toBeVisible();

    await user.type(screen.getByRole("textbox", { name: "Cohort name" }), "Engineering");
    await user.click(screen.getByRole("button", { name: "Create Cohort" }));

    expect(await screen.findByText("Cohort created.")).toHaveAttribute("role", "status");
    expect(screen.getByRole("heading", { name: "Engineering" })).toBeVisible();
    expect(screen.getByText("No sponsored Students belong to this Cohort.")).toBeVisible();
  });

  it("adds a sponsored Student to a Cohort and shows the attributed activity for the membership", async () => {
    const user = userEvent.setup();
    renderWithLocale(
      <OrganizationCohortsPanel idempotencyKeyFactory={() => "membership-key"} />,
      "en",
      [
        { request: { query: OrganizationCohortsDocument }, result: { data: { organizationCohorts: [emptyCohort] } } },
        { request: { query: OrganizationSponsoredStudentsDocument }, result: { data: { organizationSponsoredStudents: [sponsoredStudent] } } },
        {
          request: { query: AddCohortMembershipDocument, variables: { input: { idempotencyKey: "membership-key", cohortId, sponsorshipId } } },
          result: { data: { addCohortMembership: { cohort: cohortWithMember } } },
        },
      ],
    );

    expect(await screen.findByRole("heading", { name: "Add a sponsored Student to a Cohort" })).toBeVisible();
    await user.selectOptions(screen.getByRole("combobox", { name: "Cohort" }), cohortId);
    await user.selectOptions(screen.getByRole("combobox", { name: "Sponsored Student" }), sponsorshipId);
    await user.click(screen.getByRole("button", { name: "Add to Cohort" }));

    expect(await screen.findByText("Cohort membership added.")).toHaveAttribute("role", "status");
    expect(screen.getByText("Student: Casey Nguyen")).toBeVisible();
    expect(screen.getByText(/In this Cohort since August 12, 2026/)).toBeVisible();
    expect(screen.getAllByText("Attributed activity: 2 attended, 1 no-show")).toHaveLength(2);
  });

  it("ends a Cohort membership prospectively and keeps the earlier attribution", async () => {
    const user = userEvent.setup();
    renderWithLocale(
      <OrganizationCohortsPanel idempotencyKeyFactory={() => "end-key"} />,
      "en",
      [
        { request: { query: OrganizationCohortsDocument }, result: { data: { organizationCohorts: [cohortWithMember] } } },
        { request: { query: OrganizationSponsoredStudentsDocument }, result: { data: { organizationSponsoredStudents: [sponsoredStudent] } } },
        {
          request: { query: EndCohortMembershipDocument, variables: { input: { idempotencyKey: "end-key", cohortMembershipId: membershipId } } },
          result: { data: { endCohortMembership: { cohort: cohortWithEndedMember } } },
        },
      ],
    );

    await user.click(await screen.findByRole("button", { name: "End membership" }));

    expect(await screen.findByText("Cohort membership ended.")).toHaveAttribute("role", "status");
    expect(screen.getByText(/In this Cohort from August 12, 2026 .* until September 15, 2026/)).toBeVisible();
    expect(screen.getAllByText("Attributed activity: 2 attended, 1 no-show")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "End membership" })).not.toBeInTheDocument();
  });

  it("reports an overlapping Cohort membership as a typed error", async () => {
    const user = userEvent.setup();
    renderWithLocale(
      <OrganizationCohortsPanel idempotencyKeyFactory={() => "membership-key"} />,
      "en",
      [
        { request: { query: OrganizationCohortsDocument }, result: { data: { organizationCohorts: [cohortWithMember] } } },
        { request: { query: OrganizationSponsoredStudentsDocument }, result: { data: { organizationSponsoredStudents: [sponsoredStudent] } } },
        {
          request: { query: AddCohortMembershipDocument, variables: { input: { idempotencyKey: "membership-key", cohortId, sponsorshipId } } },
          result: { data: { addCohortMembership: { code: "MEMBERSHIP_WINDOW_OVERLAPS", message: "The Student already has an overlapping membership in that Cohort." } } },
        },
      ],
    );

    await user.selectOptions(await screen.findByRole("combobox", { name: "Cohort" }), cohortId);
    await user.selectOptions(screen.getByRole("combobox", { name: "Sponsored Student" }), sponsorshipId);
    await user.click(screen.getByRole("button", { name: "Add to Cohort" }));

    expect(await screen.findByText("The Student already has an overlapping membership in that Cohort."))
      .toHaveAttribute("role", "alert");
  });

  it("has no serious or critical automated accessibility violations", async () => {
    const { container } = renderWithLocale(
      <OrganizationCohortsPanel />,
      "es",
      [
        { request: { query: OrganizationCohortsDocument }, result: { data: { organizationCohorts: [cohortWithMember] } } },
        { request: { query: OrganizationSponsoredStudentsDocument }, result: { data: { organizationSponsoredStudents: [sponsoredStudent] } } },
      ],
    );

    expect(await screen.findByRole("heading", { name: "Cohortes" })).toBeVisible();
    expect(screen.getAllByText("Actividad atribuida: 2 asistencias, 1 ausencias")).toHaveLength(2);
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
