import { MockedProvider } from "@apollo/client/testing/react";
import type { MockedResponse } from "@apollo/client/testing";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminClassSessions } from "../src/admin-class-sessions.js";
import { AdministrationClassSessionsDocument, CancelClassSessionDocument, ChangeClassSessionSeatCapacityDocument, PublishClassSessionDocument, SubstituteTeacherDocument } from "../src/generated/graphql.js";

describe("Platform Administrator Class Session journey", () => {
  afterEach(cleanup);

  it("publishes a qualified, available Class Session from accessible localized controls", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000028");
    const { container } = renderPanel();
    const form = (await screen.findByRole("heading", { name: "Publish a Class Session" })).closest("form")!;
    await userEvent.selectOptions(within(form).getByLabelText("Lesson Unit"), "unit-1");
    await userEvent.selectOptions(within(form).getByLabelText("Teacher"), "teacher-1");
    fireEvent.change(within(form).getByLabelText("Local start time"), { target: { value: "2026-08-10T10:00" } });
    await userEvent.clear(within(form).getByLabelText("Scheduling time zone"));
    await userEvent.type(within(form).getByLabelText("Scheduling time zone"), "America/Denver");
    await userEvent.click(within(form).getByRole("button", { name: "Publish Class Session" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Class Session published for 60 minutes with Seat Capacity 5.");
    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });

  it("changes Seat Capacity and renders the administrator journey in Spanish", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000029");
    const { container } = renderPanel("es", true);
    expect(await screen.findByRole("heading", { name: "Administración de sesiones de clase" })).toBeVisible();
    const capacityForm = screen.getByRole("button", { name: "Cambiar capacidad de plazas" }).closest("form")!;
    fireEvent.change(within(capacityForm).getByLabelText("Capacidad de plazas"), { target: { value: "8" } });
    await userEvent.click(within(capacityForm).getByRole("button", { name: "Cambiar capacidad de plazas" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Capacidad de plazas cambiada a 8.");
    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });

  it("presents a typed publication failure in localized product language", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000028");
    renderPanel("en", false, true);
    const form = (await screen.findByRole("heading", { name: "Publish a Class Session" })).closest("form")!;
    await userEvent.selectOptions(within(form).getByLabelText("Lesson Unit"), "unit-1");
    await userEvent.selectOptions(within(form).getByLabelText("Teacher"), "teacher-1");
    fireEvent.change(within(form).getByLabelText("Local start time"), { target: { value: "2026-08-10T10:00" } });
    await userEvent.type(within(form).getByLabelText("Scheduling time zone"), "America/Denver");
    await userEvent.click(within(form).getByRole("button", { name: "Publish Class Session" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The Teacher needs a matching Teacher Qualification.");
  });

  it("resolves an Absence Request through a reasoned Class Session Cancellation", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000035");
    renderPanel("en", true, false, true);
    const form = (await screen.findByRole("heading", { name: "Resolve Absence Requests" })).parentElement!.querySelector("form")!;
    await userEvent.type(within(form).getByLabelText("Cancellation reason"), "No qualified replacement accepted the assignment.");
    await userEvent.click(within(form).getByRole("button", { name: "Cancel Class Session" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Class Session cancelled; 1 Booking refunded and 1 Waitlist Entry removed.");
  });

  it("resolves an Absence Request through Teacher Substitution", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000035");
    renderPanel("en", true, false, true);
    const resolution = (await screen.findByRole("heading", { name: "Resolve Absence Requests" })).parentElement!;
    const form = within(resolution).getByRole("button", { name: "Substitute Teacher" }).closest("form")!;
    await userEvent.selectOptions(within(form).getByLabelText("Replacement Teacher"), "teacher-2");
    await userEvent.click(within(form).getByRole("button", { name: "Substitute Teacher" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Replacement Teacher assigned without changing the Class Session start time.");
  });
});

function renderPanel(locale: "en" | "es" = "en", includeSession = false, publishError = false, includeAbsence = false) {
  const session = { id: "session-1", lessonUnitId: "unit-1", teacherUserId: "teacher-1", startsAt: "2026-08-10T16:00:00Z", endsAt: "2026-08-10T17:00:00Z", schedulingTimeZone: "America/Denver", seatCapacity: 5, occupiedSeats: 0 };
  const queryResult = {
    administrationCurriculum: {
      courses: [{ id: "course-1", title: "A1 English", lessonUnits: [{ id: "unit-1", title: "Introductions", state: "ACTIVE" }] }],
      teachers: [
        { id: "teacher-1", displayName: "Taylor Teacher", taughtLanguages: ["en"], qualifiedCurriculumLevels: ["A1"] },
        { id: "teacher-2", displayName: "Riley Replacement", taughtLanguages: ["en"], qualifiedCurriculumLevels: ["A1"] },
      ],
    },
    administrationClassSessions: includeSession ? [session] : [],
    administrationAbsenceRequests: includeAbsence ? [{ id: "absence-35", state: "OPEN", requestedAt: "2026-08-10T12:00:00Z", classSessions: [{ ...session, state: "PUBLISHED", cancellationReason: null }] }] : [],
  };
  const mocks: MockedResponse[] = [
    { request: { query: AdministrationClassSessionsDocument, variables: { locale: locale === "es" ? "ES" : "EN" } }, result: { data: queryResult } },
    { request: { query: PublishClassSessionDocument, variables: { input: { idempotencyKey: "00000000-0000-4000-8000-000000000028", lessonUnitId: "unit-1", teacherUserId: "teacher-1", startsAtLocal: "2026-08-10T10:00", schedulingTimeZone: "America/Denver", timeDisambiguation: "REJECT", seatCapacity: 5 } } }, result: { data: { publishClassSession: publishError ? { __typename: "ClassSessionPublicationError", code: "TEACHER_QUALIFICATION_REQUIRED", message: "The Teacher needs a matching Teacher Qualification." } : { __typename: "PublishClassSessionSuccess", classSession: { id: "session-1", lessonUnitId: "unit-1", teacherUserId: "teacher-1", startsAt: "2026-08-10T16:00:00Z", endsAt: "2026-08-10T17:00:00Z", schedulingTimeZone: "America/Denver", seatCapacity: 5, occupiedSeats: 0 } } } } },
  ];
  if (includeSession) mocks.push({ request: { query: ChangeClassSessionSeatCapacityDocument, variables: { input: { idempotencyKey: "00000000-0000-4000-8000-000000000029", classSessionId: "session-1", seatCapacity: 8 } } }, result: { data: { changeClassSessionSeatCapacity: { __typename: "ChangeClassSessionSeatCapacitySuccess", classSession: { ...session, seatCapacity: 8 } } } } });
  if (includeAbsence) mocks.push({ request: { query: CancelClassSessionDocument, variables: { input: { idempotencyKey: "00000000-0000-4000-8000-000000000035", absenceRequestId: "absence-35", classSessionId: "session-1", reason: "No qualified replacement accepted the assignment." } } }, result: { data: { cancelClassSession: { __typename: "CancelClassSessionSuccess", classSession: { ...session, state: "CANCELLED", cancellationReason: "No qualified replacement accepted the assignment." }, absenceRequest: { id: "absence-35", state: "RESOLVED" }, refundedBookingCount: 1, removedWaitlistEntryCount: 1 } } } });
  if (includeAbsence) mocks.push({ request: { query: SubstituteTeacherDocument, variables: { input: { idempotencyKey: "00000000-0000-4000-8000-000000000035", absenceRequestId: "absence-35", classSessionId: "session-1", replacementTeacherUserId: "teacher-2" } } }, result: { data: { substituteTeacher: { __typename: "SubstituteTeacherSuccess", classSession: { ...session, teacherUserId: "teacher-2", state: "PUBLISHED", cancellationReason: null }, absenceRequest: { id: "absence-35", state: "RESOLVED" } } } } });
  return render(<MockedProvider mocks={mocks}><IntlProvider locale={locale} messages={interfaceMessages[locale]}><AdminClassSessions locale={locale} /></IntlProvider></MockedProvider>);
}
