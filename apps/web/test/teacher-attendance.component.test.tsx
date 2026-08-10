import type { MockedResponse } from "@apollo/client/testing";
import { MockedProvider } from "@apollo/client/testing/react";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TeacherAttendancePanel } from "../src/teacher-attendance.js";
import { ClassRosterDocument, RecordAttendanceDocument, TeacherAttendanceSessionsDocument } from "../src/generated/graphql.js";

describe("Teacher Attendance", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("submits an accessible localized Class Roster after the Class Session", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000037");
    const session = { id: "session-37", lessonUnitId: "unit-37", teacherUserId: "teacher-37", startsAt: "2026-08-10T10:00:00Z", endsAt: "2026-08-10T11:00:00Z", schedulingTimeZone: "America/Denver", seatCapacity: 5, occupiedSeats: 1, state: "PUBLISHED", cancellationReason: null };
    const roster = { classSession: session, students: [{ bookingId: "booking-37", studentUserId: "student-37", displayName: "Sam Student", placement: { targetLanguage: "es", curriculumLevel: "B2" }, attendance: null }] };
    const mocks: MockedResponse[] = [
      { request: { query: TeacherAttendanceSessionsDocument }, result: { data: { teacherAttendanceClassSessions: [session] } } },
      { request: { query: ClassRosterDocument, variables: { classSessionId: "session-37" } }, result: { data: { classRoster: roster } } },
      { request: { query: RecordAttendanceDocument, variables: { input: { idempotencyKey: "00000000-0000-4000-8000-000000000037", classSessionId: "session-37", records: [{ bookingId: "booking-37", outcome: "ATTENDED" }] } } }, result: { data: { recordAttendance: { __typename: "RecordAttendanceSuccess", classRoster: { ...roster, students: [{ ...roster.students[0], attendance: { outcome: "ATTENDED", submittedAt: "2026-08-10T11:01:00Z" } }] } } } } },
    ];
    const { container } = render(<MockedProvider mocks={mocks}><IntlProvider locale="es" messages={interfaceMessages.es}><TeacherAttendancePanel /></IntlProvider></MockedProvider>);
    await userEvent.click(await screen.findByRole("button", { name: /registrar asistencia.*10 de agosto/i }));
    await userEvent.click(await screen.findByRole("radio", { name: "Asistió" }));
    await userEvent.click(screen.getByRole("button", { name: "Publicar asistencia" }));
    expect(await screen.findByRole("status")).toHaveTextContent("La asistencia se publicó");
    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });

  it("collects the Teacher's correction reason and handles a typed denial accessibly", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000038");
    const session = { id: "session-38", lessonUnitId: "unit-38", teacherUserId: "teacher-38", startsAt: "2026-08-10T10:00:00Z", endsAt: "2026-08-10T11:00:00Z", schedulingTimeZone: "America/Denver", seatCapacity: 5, occupiedSeats: 1, state: "PUBLISHED", cancellationReason: null };
    const student = { bookingId: "booking-38", studentUserId: "student-38", displayName: "Sara Student", placement: null, attendance: { outcome: "ATTENDED" as const, submittedAt: "2026-08-10T11:01:00Z" } };
    const reason = "The Student was marked present in error after leaving before the session began.";
    const mocks: MockedResponse[] = [
      { request: { query: TeacherAttendanceSessionsDocument }, result: { data: { teacherAttendanceClassSessions: [session] } } },
      { request: { query: ClassRosterDocument, variables: { classSessionId: "session-38" } }, result: { data: { classRoster: { classSession: session, students: [student] } } } },
      { request: { query: RecordAttendanceDocument, variables: { input: { idempotencyKey: "00000000-0000-4000-8000-000000000038", classSessionId: "session-38", records: [{ bookingId: "booking-38", outcome: "NO_SHOW", correctionReason: reason }] } } }, result: { data: { recordAttendance: { __typename: "AttendanceError", code: "ATTENDANCE_RECORDING_WINDOW_CLOSED", message: "private server copy" } } } },
    ];
    const { container } = render(<MockedProvider mocks={mocks}><IntlProvider locale="en" messages={interfaceMessages.en}><TeacherAttendancePanel /></IntlProvider></MockedProvider>);
    await userEvent.click(await screen.findByRole("button", { name: /record attendance.*august 10/i }));
    await userEvent.click(await screen.findByRole("radio", { name: "No-show" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Correction reason" }), reason);
    await userEvent.click(screen.getByRole("button", { name: "Publish Attendance" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The Teacher Attendance recording window has closed");
    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });

  it.each([
    ["empty", { request: { query: TeacherAttendanceSessionsDocument }, result: { data: { teacherAttendanceClassSessions: [] } } }, "No Class Sessions are currently open for Attendance recording."],
    ["error", { request: { query: TeacherAttendanceSessionsDocument }, error: new Error("private diagnostic") }, "We couldn't load Attendance work. Try again."],
  ])("keeps the %s state accessible", async (_state, mock, expectedText) => {
    const { container } = render(<MockedProvider mocks={[mock]}><IntlProvider locale="en" messages={interfaceMessages.en}><TeacherAttendancePanel /></IntlProvider></MockedProvider>);
    expect(await screen.findByText(expectedText)).toBeVisible();
    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });
});
