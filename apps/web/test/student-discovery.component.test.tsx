import { MockedProvider } from "@apollo/client/testing/react";
import type { MockedResponse } from "@apollo/client/testing";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { IntlProvider } from "react-intl";

import {
  BookClassSessionDocument,
  CancelBookingDocument,
  ClassSessionDiscoveryOptionsDocument,
  DiscoverClassSessionsDocument,
  SetStudentPlacementDocument,
  StudentBookingsDocument,
  StudentPlacementsDocument,
} from "../src/generated/graphql.js";
import { StudentDiscoveryPanel } from "../src/student-discovery.js";

afterEach(cleanup);

const mocks: MockedResponse[] = [
  {
    request: { query: StudentBookingsDocument },
    result: { data: { studentBookings: [] } },
  },
  {
    request: { query: StudentPlacementsDocument },
    result: { data: { studentPlacements: [{ targetLanguage: "es", curriculumLevel: "B1" }] } },
  },
  {
    request: { query: ClassSessionDiscoveryOptionsDocument },
    result: { data: { classSessionDiscoveryOptions: {
      targetLanguages: ["en", "es"],
      topics: [
        { key: "EC", label: "Everyday Conversation" },
        { key: "RW", label: "Reading & Writing" },
      ],
      teachers: [{ id: "00000000-0000-4000-8000-000000000002", displayName: "Taylor Teacher" }],
    } } },
  },
  {
    request: {
      query: DiscoverClassSessionsDocument,
      variables: { input: { targetLanguage: "es", curriculumLevel: "B1", topicKeys: [] } },
    },
    result: { data: { discoverClassSessions: {
      appliedFilter: { targetLanguage: "es", curriculumLevel: "B1", teacherUserId: null, topicKeys: [], localDate: null },
      nodes: [{
        id: "00000000-0000-4000-8000-000000000010",
        startsAt: "2026-08-06T16:00:00Z",
        endsAt: "2026-08-06T17:00:00Z",
        schedulingTimeZone: "America/Denver",
        seatCapacity: 5,
        occupiedSeats: 4,
        lessonUnit: {
          id: "00000000-0000-4000-8000-000000000020",
          title: "Conversación práctica",
          summary: "Practica conversaciones cotidianas.",
          objectives: ["Mantener una conversación."],
          topics: [{ key: "EC", label: "Everyday Conversation" }],
        },
        teacherProfile: {
          id: "00000000-0000-4000-8000-000000000002",
          displayName: "Taylor Teacher",
          pronouns: "they/them",
          profileImageUrl: null,
          professionalBiography: "Conversation-focused teacher.",
          taughtLanguages: ["es"],
          qualifiedCurriculumLevels: ["B1"],
          teachingTopics: [{ key: "EC", label: "Everyday Conversation" }],
          completedSessionCount: 12,
        },
      }],
      pageInfo: { endCursor: null, hasNextPage: false },
    } } },
  },
  {
    request: {
      query: SetStudentPlacementDocument,
      variables: { input: { targetLanguage: "es", curriculumLevel: "C1" } },
    },
    result: { data: { setStudentPlacement: { targetLanguage: "es", curriculumLevel: "C1" } } },
  },
  {
    request: { query: StudentPlacementsDocument },
    result: { data: { studentPlacements: [{ targetLanguage: "es", curriculumLevel: "C1" }] } },
  },
  {
    request: {
      query: DiscoverClassSessionsDocument,
      variables: { input: { targetLanguage: "es", curriculumLevel: "C1", topicKeys: [] } },
    },
    result: { data: { discoverClassSessions: {
      appliedFilter: { targetLanguage: "es", curriculumLevel: "C1", teacherUserId: null, topicKeys: [], localDate: null },
      nodes: [],
      pageInfo: { endCursor: null, hasNextPage: false },
    } } },
  },
];

function renderPanel(locale: "en" | "es" = "en", providedMocks: MockedResponse[] = mocks, idempotencyKeyFactory?: () => string) {
  return render(
    <MockedProvider mocks={providedMocks}>
      <IntlProvider locale={locale} messages={interfaceMessages[locale]}>
        <StudentDiscoveryPanel
          displayTimeZone="America/Denver"
          {...(idempotencyKeyFactory ? { idempotencyKeyFactory } : {})}
        />
      </IntlProvider>
    </MockedProvider>,
  );
}

describe("Student Class Session Discovery", () => {
  it("defaults filters from Student Placement and presents only aggregate seats with public Teacher Profile context", async () => {
    renderPanel();

    expect(await screen.findByRole("heading", { name: "Discover Class Sessions" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Target language" })).toHaveValue("es");
    expect(screen.getByRole("combobox", { name: "Curriculum Level" })).toHaveValue("B1");
    expect(screen.getByRole("combobox", { name: "Teacher" })).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: "Everyday Conversation" })).not.toBeChecked();
    expect(screen.getByLabelText("Local date")).toHaveValue("");

    expect(await screen.findByRole("heading", { name: "Conversación práctica" })).toBeVisible();
    expect(screen.getByText("4 of 5 seats occupied; seats available")).toBeVisible();
    expect(screen.getByRole("button", { name: "Book Class Session" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Taylor Teacher" })).toBeVisible();
    expect(screen.getByText("Conversation-focused teacher.")).toBeVisible();
    expect(screen.getByText("Taught languages: es")).toBeVisible();
    expect(screen.getByText("Qualified Curriculum Levels: B1")).toBeVisible();
    expect(screen.getByText("Teaching Topics: Everyday Conversation")).toBeVisible();
    expect(screen.queryByText(/student identity|waitlist identity/i)).not.toBeInTheDocument();
  });

  it("has no serious or critical automated accessibility violations", async () => {
    const { container } = renderPanel();
    await screen.findByRole("heading", { name: "Conversación práctica" });
    const result = await axe.run(container);
    expect(result.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });

  it("lets the Student save a new placement and applies it to discovery", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByRole("heading", { name: "Conversación práctica" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Curriculum Level" }), "C1");
    await user.click(screen.getByRole("button", { name: "Save Student Placement" }));

    expect(await screen.findByText("Student Placement saved.")).toHaveAttribute("role", "status");
    expect(await screen.findByText("No actionable Class Sessions match these filters.")).toBeVisible();
  });

  it("lets the Student book and cancel an available Class Session with accessible status feedback", async () => {
    const user = userEvent.setup();
    const bookingId = "00000000-0000-4000-8000-000000000099";
    const sessionId = "00000000-0000-4000-8000-000000000010";
    const activeBooking = {
      __typename: "Booking",
      id: bookingId,
      state: "ACTIVE",
      terminalReason: null,
      classCreditRefunded: false,
      bookedAt: "2026-08-05T12:00:00Z",
      endedAt: null,
      classSession: {
        __typename: "ClassSession",
        id: sessionId,
        startsAt: "2026-08-06T16:00:00Z",
        endsAt: "2026-08-06T17:00:00Z",
        occupiedSeats: 5,
        seatCapacity: 5,
      },
    };
    const bookingMocks = [
      ...mocks,
      {
        request: { query: BookClassSessionDocument, variables: { input: { idempotencyKey: "book-key", classSessionId: sessionId } } },
        result: { data: { bookClassSession: {
          __typename: "BookClassSessionSuccess",
          booking: activeBooking,
          account: { availableBalance: 1 },
        } } },
      },
      {
        request: { query: StudentBookingsDocument },
        result: { data: { studentBookings: [activeBooking] } },
      },
      {
        request: { query: CancelBookingDocument, variables: { input: { idempotencyKey: "cancel-key", bookingId } } },
        result: { data: { cancelBooking: {
          __typename: "CancelBookingSuccess",
          booking: {
            ...activeBooking,
            state: "ENDED",
            terminalReason: "STUDENT_CANCELLATION",
            classCreditRefunded: true,
            endedAt: "2026-08-05T12:05:00Z",
            classSession: { ...activeBooking.classSession, occupiedSeats: 4 },
          },
          account: { availableBalance: 2 },
        } } },
      },
      {
        request: { query: StudentBookingsDocument },
        result: { data: { studentBookings: [] } },
      },
    ];
    const keys = ["book-key", "cancel-key"];
    renderPanel("en", bookingMocks, () => keys.shift()!);
    await screen.findByRole("heading", { name: "Conversación práctica" });

    await user.click(screen.getByRole("button", { name: "Book Class Session" }));
    expect(await screen.findByText("Booking confirmed. One Class Credit was exchanged.")).toHaveAttribute("role", "status");
    expect(screen.getByRole("button", { name: /Cancel Booking for/ })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Cancel Booking for/ }));
    expect(await screen.findByText("Booking cancelled. One Class Credit was returned.")).toHaveAttribute("role", "status");
    expect(screen.getByRole("button", { name: "Book Class Session" })).toBeVisible();
  });

  it("localizes discovery chrome in Spanish", async () => {
    renderPanel("es");
    expect(await screen.findByRole("heading", { name: "Descubrir sesiones de clase" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Idioma objetivo" })).toHaveValue("es");
    expect(screen.getByRole("button", { name: "Buscar sesiones de clase" })).toBeVisible();
    expect(await screen.findByRole("button", { name: "Reservar sesión de clase" })).toBeVisible();
  });

  it("shows a localized error when discovery options fail", async () => {
    render(
      <MockedProvider mocks={[
        {
          request: { query: StudentPlacementsDocument },
          result: { data: { studentPlacements: [] } },
        },
        {
          request: { query: ClassSessionDiscoveryOptionsDocument },
          error: new Error("private diagnostic"),
        },
      ]}>
        <IntlProvider locale="en" messages={interfaceMessages.en}>
          <StudentDiscoveryPanel displayTimeZone="America/Denver" />
        </IntlProvider>
      </MockedProvider>,
    );

    expect(await screen.findByText("We couldn't load Class Session Discovery. Try again.")).toHaveAttribute("role", "alert");
  });
});
