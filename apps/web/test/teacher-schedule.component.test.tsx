import type { MockedResponse } from "@apollo/client/testing";
import { MockedProvider } from "@apollo/client/testing/react";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TeacherSchedulePanel } from "../src/teacher-schedule.js";
import { ReportAbsenceDocument, TeacherScheduleDocument } from "../src/generated/graphql.js";

describe("Teacher Class Session disruption journey", () => {
  afterEach(cleanup);

  it("reports an Absence Request from accessible localized assigned-session controls", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000035");
    const session = { id: "session-35", lessonUnitId: "unit-1", teacherUserId: "teacher-1", startsAt: "2026-08-12T16:00:00Z", endsAt: "2026-08-12T17:00:00Z", schedulingTimeZone: "America/Denver", seatCapacity: 5, occupiedSeats: 2, state: "PUBLISHED", cancellationReason: null };
    const mocks: MockedResponse[] = [
      { request: { query: TeacherScheduleDocument }, result: { data: { teacherClassSessions: [session], teacherAbsenceRequests: [] } } },
      { request: { query: ReportAbsenceDocument, variables: { input: { idempotencyKey: "00000000-0000-4000-8000-000000000035", classSessionIds: ["session-35"] } } }, result: { data: { reportAbsence: { __typename: "ReportAbsenceSuccess", absenceRequest: { id: "absence-35", state: "OPEN", requestedAt: "2026-08-10T12:00:00Z", classSessions: [session] } } } } },
    ];
    const { container } = render(<MockedProvider mocks={mocks}><IntlProvider locale="es" messages={interfaceMessages.es}><TeacherSchedulePanel /></IntlProvider></MockedProvider>);
    await userEvent.click(await screen.findByRole("checkbox", { name: /12 de agosto de 2026/i }));
    await userEvent.click(screen.getByRole("button", { name: "Informar ausencia" }));
    expect(await screen.findByRole("status")).toHaveTextContent("La solicitud de ausencia se envió");
    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });
});
