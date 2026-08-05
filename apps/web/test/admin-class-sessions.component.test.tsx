import { MockedProvider } from "@apollo/client/testing/react";
import type { MockedResponse } from "@apollo/client/testing";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminClassSessions } from "../src/admin-class-sessions.js";
import { AdministrationClassSessionsDocument, ChangeClassSessionSeatCapacityDocument, PublishClassSessionDocument } from "../src/generated/graphql.js";

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
});

function renderPanel(locale: "en" | "es" = "en", includeSession = false, publishError = false) {
  const session = { id: "session-1", lessonUnitId: "unit-1", teacherUserId: "teacher-1", startsAt: "2026-08-10T16:00:00Z", endsAt: "2026-08-10T17:00:00Z", schedulingTimeZone: "America/Denver", seatCapacity: 5, occupiedSeats: 0 };
  const queryResult = {
    administrationCurriculum: {
      courses: [{ id: "course-1", title: "A1 English", lessonUnits: [{ id: "unit-1", title: "Introductions", state: "ACTIVE" }] }],
      teachers: [{ id: "teacher-1", displayName: "Taylor Teacher", taughtLanguages: ["en"], qualifiedCurriculumLevels: ["A1"] }],
    },
    administrationClassSessions: includeSession ? [session] : [],
  };
  const mocks: MockedResponse[] = [
    { request: { query: AdministrationClassSessionsDocument, variables: { locale: locale === "es" ? "ES" : "EN" } }, result: { data: queryResult } },
    { request: { query: PublishClassSessionDocument, variables: { input: { idempotencyKey: "00000000-0000-4000-8000-000000000028", lessonUnitId: "unit-1", teacherUserId: "teacher-1", startsAtLocal: "2026-08-10T10:00", schedulingTimeZone: "America/Denver", timeDisambiguation: "REJECT", seatCapacity: 5 } } }, result: { data: { publishClassSession: publishError ? { __typename: "ClassSessionPublicationError", code: "TEACHER_QUALIFICATION_REQUIRED", message: "The Teacher needs a matching Teacher Qualification." } : { __typename: "PublishClassSessionSuccess", classSession: { id: "session-1", lessonUnitId: "unit-1", teacherUserId: "teacher-1", startsAt: "2026-08-10T16:00:00Z", endsAt: "2026-08-10T17:00:00Z", schedulingTimeZone: "America/Denver", seatCapacity: 5, occupiedSeats: 0 } } } } },
  ];
  if (includeSession) mocks.push({ request: { query: ChangeClassSessionSeatCapacityDocument, variables: { input: { idempotencyKey: "00000000-0000-4000-8000-000000000029", classSessionId: "session-1", seatCapacity: 8 } } }, result: { data: { changeClassSessionSeatCapacity: { __typename: "ChangeClassSessionSeatCapacitySuccess", classSession: { ...session, seatCapacity: 8 } } } } });
  return render(<MockedProvider mocks={mocks}><IntlProvider locale={locale} messages={interfaceMessages[locale]}><AdminClassSessions locale={locale} /></IntlProvider></MockedProvider>);
}
