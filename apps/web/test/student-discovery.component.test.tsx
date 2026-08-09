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
  JoinWaitlistDocument,
  RescheduleBookingDocument,
  SetStudentPlacementDocument,
  StudentBookingsDocument,
  StudentWaitlistEntriesDocument,
  StudentPlacementsDocument,
  WithdrawWaitlistDocument,
} from "../src/generated/graphql.js";
import { StudentDiscoveryPanel } from "../src/student-discovery.js";

afterEach(cleanup);

const mocks: MockedResponse[] = [
  {
    request: { query: StudentBookingsDocument },
    result: { data: { studentBookings: [] } },
  },
  {
    request: { query: StudentWaitlistEntriesDocument },
    result: { data: { studentWaitlistEntries: [] } },
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
        lessonUnitId: "00000000-0000-4000-8000-000000000020",
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

  it("lets the Student join and withdraw from a full Waitlist with accessible status feedback", async () => {
    const user = userEvent.setup();
    const sessionId = "00000000-0000-4000-8000-000000000010";
    const entryId = "00000000-0000-4000-8000-000000000088";
    const fullDiscoveryMocks = mocks.map((mock) => {
      if (mock.request.query !== DiscoverClassSessionsDocument) return mock;
      const result = mock.result as { data: { discoverClassSessions: {
        appliedFilter: Record<string, unknown>;
        nodes: Array<Record<string, unknown>>;
        pageInfo: Record<string, unknown>;
      } } };
      return {
        ...mock,
        result: { data: { discoverClassSessions: {
          ...result.data.discoverClassSessions,
          nodes: result.data.discoverClassSessions.nodes.map((session) => ({
            ...session,
            occupiedSeats: 5,
          })),
        } } },
      };
    });
    const activeEntry = {
      __typename: "WaitlistEntry",
      id: entryId,
      state: "ACTIVE",
      terminalReason: null,
      joinedAt: "2026-08-05T12:00:00Z",
      expiresAt: "2026-08-06T14:00:00Z",
      completedAt: null,
      resultingBooking: null,
      classSession: {
        __typename: "ClassSession",
        id: sessionId,
        startsAt: "2026-08-06T16:00:00Z",
        endsAt: "2026-08-06T17:00:00Z",
        occupiedSeats: 5,
        seatCapacity: 5,
      },
    };
    const waitlistMocks = [
      ...fullDiscoveryMocks,
      {
        request: { query: JoinWaitlistDocument, variables: { input: { idempotencyKey: "join-key", classSessionId: sessionId } } },
        result: { data: { joinWaitlist: { __typename: "JoinWaitlistSuccess", entry: activeEntry } } },
      },
      { request: { query: StudentWaitlistEntriesDocument }, result: { data: { studentWaitlistEntries: [activeEntry] } } },
      {
        request: { query: WithdrawWaitlistDocument, variables: { input: { idempotencyKey: "withdraw-key", waitlistEntryId: entryId } } },
        result: { data: { withdrawWaitlist: {
          __typename: "WithdrawWaitlistSuccess",
          entry: { ...activeEntry, state: "WITHDRAWN", terminalReason: "WITHDRAWN", completedAt: "2026-08-05T12:05:00Z" },
        } } },
      },
      { request: { query: StudentWaitlistEntriesDocument }, result: { data: { studentWaitlistEntries: [] } } },
      { request: { query: StudentBookingsDocument }, result: { data: { studentBookings: [] } } },
    ];
    const keys = ["join-key", "withdraw-key"];
    const { container } = renderPanel("en", waitlistMocks, () => keys.shift()!);
    await screen.findByRole("heading", { name: "Conversación práctica" });

    await user.click(screen.getByRole("button", { name: "Join Waitlist" }));
    expect(await screen.findByText("Waitlist joined. No seat or Class Credit is reserved."))
      .toHaveAttribute("role", "status");
    await user.click(screen.getByRole("button", { name: /Withdraw from Waitlist for/ }));
    expect(await screen.findByText("Waitlist withdrawn. No Booking was created or Class Credit exchanged."))
      .toHaveAttribute("role", "status");
    expect(screen.getByRole("button", { name: "Join Waitlist" })).toBeVisible();
    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical"))
      .toEqual([]);
  });

  it("lets the Student reschedule an active Booking to a discovered Class Session for the same Lesson Unit", async () => {
    const user = userEvent.setup();
    const bookingId = "00000000-0000-4000-8000-000000000098";
    const originalSessionId = "00000000-0000-4000-8000-000000000009";
    const replacementSessionId = "00000000-0000-4000-8000-000000000010";
    const lessonUnitId = "00000000-0000-4000-8000-000000000020";
    const originalBooking = {
      __typename: "Booking",
      id: bookingId,
      state: "ACTIVE",
      terminalReason: null,
      classCreditRefunded: false,
      bookedAt: "2026-08-05T12:00:00Z",
      endedAt: null,
      classSession: {
        __typename: "ClassSession",
        id: originalSessionId,
        lessonUnitId,
        startsAt: "2026-08-05T16:00:00Z",
        endsAt: "2026-08-05T17:00:00Z",
        occupiedSeats: 1,
        seatCapacity: 5,
      },
    };
    const replacementBooking = {
      ...originalBooking,
      id: "00000000-0000-4000-8000-000000000097",
      bookedAt: "2026-08-05T12:05:00Z",
      classSession: {
        ...originalBooking.classSession,
        id: replacementSessionId,
        startsAt: "2026-08-06T16:00:00Z",
        endsAt: "2026-08-06T17:00:00Z",
        occupiedSeats: 5,
      },
    };
    const otherOriginalBooking = {
      ...originalBooking,
      id: "00000000-0000-4000-8000-000000000096",
      classSession: {
        ...originalBooking.classSession,
        id: "00000000-0000-4000-8000-000000000008",
        startsAt: "2026-08-04T16:00:00Z",
        endsAt: "2026-08-04T17:00:00Z",
      },
    };
    const rescheduleMocks = [
      { request: { query: StudentBookingsDocument }, result: { data: { studentBookings: [originalBooking, otherOriginalBooking] } } },
      ...mocks.slice(1),
      {
        request: {
          query: RescheduleBookingDocument,
          variables: { input: { idempotencyKey: "reschedule-key", bookingId, replacementClassSessionId: replacementSessionId } },
        },
        result: { data: { rescheduleBooking: {
          __typename: "RescheduleBookingSuccess",
          originalBooking: { ...originalBooking, state: "ENDED", terminalReason: "RESCHEDULED", endedAt: "2026-08-05T12:05:00Z" },
          replacementBooking,
          account: { availableBalance: 1 },
        } } },
      },
      { request: { query: StudentBookingsDocument }, result: { data: { studentBookings: [replacementBooking, otherOriginalBooking] } } },
    ];
    const { container } = renderPanel("en", rescheduleMocks, () => "reschedule-key");
    await screen.findByRole("heading", { name: "Conversación práctica" });

    expect(screen.getAllByRole("button", { name: /Reschedule Booking from .* to/ })).toHaveLength(2);
    await user.click(screen.getByRole("button", {
      name: /Reschedule Booking from August 5, 2026.*to August 6, 2026/,
    }));

    expect(await screen.findByText("Booking rescheduled. The same Class Credit was retained."))
      .toHaveAttribute("role", "status");
    expect(screen.getByText("Booking active")).toBeVisible();
    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical"))
      .toEqual([]);
  });

  it("localizes discovery chrome in Spanish", async () => {
    renderPanel("es");
    expect(await screen.findByRole("heading", { name: "Descubrir sesiones de clase" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Idioma objetivo" })).toHaveValue("es");
    expect(screen.getByRole("button", { name: "Buscar sesiones de clase" })).toBeVisible();
    expect(await screen.findByRole("button", { name: "Reservar sesión de clase" })).toBeVisible();
  });

  it("localizes the reschedule action in Spanish", async () => {
    const activeBooking = {
      __typename: "Booking",
      id: "00000000-0000-4000-8000-000000000095",
      state: "ACTIVE",
      terminalReason: null,
      classCreditRefunded: false,
      bookedAt: "2026-08-05T12:00:00Z",
      endedAt: null,
      classSession: {
        __typename: "ClassSession",
        id: "00000000-0000-4000-8000-000000000009",
        lessonUnitId: "00000000-0000-4000-8000-000000000020",
        startsAt: "2026-08-05T16:00:00Z",
        endsAt: "2026-08-05T17:00:00Z",
        occupiedSeats: 1,
        seatCapacity: 5,
      },
    };
    renderPanel("es", [
      { request: { query: StudentBookingsDocument }, result: { data: { studentBookings: [activeBooking] } } },
      ...mocks.slice(1),
    ]);

    expect(await screen.findByRole("button", { name: /Reprogramar reserva del .* para el/ }))
      .toBeVisible();
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
