import type { MockedResponse } from "@apollo/client/testing";
import { MockedProvider } from "@apollo/client/testing/react";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdministratorAttendanceReviewPanel, StudentAttendanceReviewPanel } from "../src/attendance-review.js";
import {
  AdministrationAttendanceReviewRequestsDocument,
  DecideAttendanceReviewDocument,
  RequestAttendanceReviewDocument,
  StudentAttendanceRecordsDocument,
} from "../src/generated/graphql.js";

const reviewableRecord = {
  bookingId: "booking-40",
  classSessionId: "session-40",
  classSessionStartsAt: "2026-08-11T10:00:00Z",
  teacherDisplayName: "Taylor Teacher",
  outcome: "NO_SHOW",
  publishedAt: "2026-08-11T11:05:00Z",
  correctedAt: null,
  correctionCount: 0,
  reviewDeadline: "2026-08-18T11:05:00Z",
  reviewRequestOpen: true,
  reviewRequest: null,
};

const pendingRequest = {
  id: "review-40",
  bookingId: "booking-40",
  classSessionId: "session-40",
  studentDisplayName: "Sam Student",
  outcomeAtRequest: "NO_SHOW",
  effectiveOutcome: "NO_SHOW",
  explanation: "I joined from the shared classroom link and stayed for the whole hour.",
  state: "PENDING",
  requestedAt: "2026-08-12T12:00:00Z",
  decidedAt: null,
  studentVisibleRationale: null,
  privateAdministratorNote: null,
};

describe("Attendance Review Requests", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("lets a Student request review of a recent Attendance Record accessibly", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000040");
    const explanation = "I joined from the shared classroom link and stayed for the whole hour.";
    const mocks: MockedResponse[] = [
      { request: { query: StudentAttendanceRecordsDocument }, result: { data: { studentAttendanceRecords: [reviewableRecord] } } },
      {
        request: { query: RequestAttendanceReviewDocument, variables: { input: { idempotencyKey: "00000000-0000-4000-8000-000000000040", bookingId: "booking-40", explanation } } },
        result: { data: { requestAttendanceReview: { __typename: "RequestAttendanceReviewSuccess", attendanceReviewRequest: { id: "review-40", bookingId: "booking-40", state: "PENDING", outcomeAtRequest: "NO_SHOW", effectiveOutcome: "NO_SHOW", explanation, requestedAt: "2026-08-12T12:00:00Z", decidedAt: null, studentVisibleRationale: null } } } },
      },
    ];
    const { container } = render(<MockedProvider mocks={mocks}><IntlProvider locale="en" messages={interfaceMessages.en}><StudentAttendanceReviewPanel /></IntlProvider></MockedProvider>);

    expect(await screen.findByText("Attendance: No-show")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Request Attendance review" }));
    expect(screen.getByText("A correction does not automatically refund a Class Credit.")).toBeVisible();
    await userEvent.type(screen.getByRole("textbox", { name: /explanation/i }), explanation);
    await userEvent.click(screen.getByRole("button", { name: "Submit Attendance Review Request" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Attendance Review Request submitted.");
    expect((await axe.run(container)).violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });

  it("shows the decided outcome and correction metadata instead of a second request", async () => {
    const mocks: MockedResponse[] = [
      { request: { query: StudentAttendanceRecordsDocument }, result: { data: { studentAttendanceRecords: [{
        ...reviewableRecord,
        outcome: "ATTENDED",
        correctedAt: "2026-08-12T13:00:00Z",
        correctionCount: 1,
        reviewRequestOpen: false,
        reviewRequest: { ...pendingRequest, state: "CORRECTED", effectiveOutcome: "ATTENDED", decidedAt: "2026-08-12T13:00:00Z", studentVisibleRationale: "The classroom entry log confirms attendance for the whole Class Session." },
      }] } } },
    ];
    render(<MockedProvider mocks={mocks}><IntlProvider locale="en" messages={interfaceMessages.en}><StudentAttendanceReviewPanel /></IntlProvider></MockedProvider>);

    expect(await screen.findByText("Attendance: Attended")).toBeVisible();
    expect(screen.getByText(/Corrected .* after one correction\./)).toBeVisible();
    expect(screen.getByText("Review: Corrected")).toBeVisible();
    expect(screen.getByText(/The classroom entry log confirms attendance/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Request Attendance review" })).toBeNull();
  });

  it("lets a Platform Administrator correct an outcome with a Student-visible rationale in Spanish", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000041");
    const studentVisibleRationale = "El registro de entrada al aula confirma la asistencia completa.";
    const mocks: MockedResponse[] = [
      { request: { query: AdministrationAttendanceReviewRequestsDocument }, result: { data: { administrationAttendanceReviewRequests: [pendingRequest] } } },
      {
        request: { query: DecideAttendanceReviewDocument, variables: { input: { idempotencyKey: "00000000-0000-4000-8000-000000000041", attendanceReviewRequestId: "review-40", decision: "CORRECT", studentVisibleRationale, privateAdministratorNote: "" } } },
        result: { data: { decideAttendanceReview: { __typename: "DecideAttendanceReviewSuccess", attendanceReviewRequest: { id: "review-40", bookingId: "booking-40", state: "CORRECTED", effectiveOutcome: "ATTENDED", decidedAt: "2026-08-12T13:00:00Z", studentVisibleRationale, privateAdministratorNote: null } } } },
      },
    ];
    const { container } = render(<MockedProvider mocks={mocks}><IntlProvider locale="es" messages={interfaceMessages.es}><AdministratorAttendanceReviewPanel /></IntlProvider></MockedProvider>);

    expect(await screen.findByText("Sam Student: resultado vigente Ausente")).toBeVisible();
    const correct = screen.getByRole("button", { name: "Corregir el resultado registrado" });
    expect(correct).toBeDisabled();
    await userEvent.type(screen.getByRole("textbox", { name: /Justificación visible para el estudiante/ }), studentVisibleRationale);
    await userEvent.click(correct);
    expect(await screen.findByRole("status")).toHaveTextContent("Decisión registrada.");
    expect((await axe.run(container)).violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });
});
