import type { MockedResponse } from "@apollo/client/testing";
import { MockedProvider } from "@apollo/client/testing/react";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdministratorQualityPanel, StudentFeedbackRatingsPanel, TeacherFeedbackPanel } from "../src/feedback-rating.js";
import {
  AdministratorFeedbackAndRatingsDocument,
  RedactLearningFeedbackDocument,
  SaveLearningFeedbackDocument,
  SaveSessionRatingDocument,
  StudentFeedbackAndRatingsDocument,
  TeacherFeedbackWorkDocument,
} from "../src/generated/graphql.js";

describe("private feedback and ratings", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("lets a Teacher explicitly submit structured Learning Feedback accessibly", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000039");
    const item = { bookingId: "booking-39", classSessionId: "session-39", feedbackDeadline: "2026-08-12T11:00:00Z", studentDisplayName: "Sam Student", learningFeedback: null };
    const mocks: MockedResponse[] = [
      { request: { query: TeacherFeedbackWorkDocument }, result: { data: { teacherFeedbackWork: [item] } } },
      { request: { query: SaveLearningFeedbackDocument, variables: { input: { idempotencyKey: "00000000-0000-4000-8000-000000000039", bookingId: "booking-39", observedStrengths: ["SPOKEN_PRODUCTION"], suggestedFocuses: ["PRONUNCIATION"], observations: "Clear sequence", nextPractice: "Practice target sounds", submit: true } } }, result: { data: { saveLearningFeedback: { __typename: "SaveLearningFeedbackSuccess", feedback: { bookingId: "booking-39", observedStrengths: ["SPOKEN_PRODUCTION"], suggestedFocuses: ["PRONUNCIATION"], observations: "Clear sequence", nextPractice: "Practice target sounds", state: "SUBMITTED", submittedAt: "2026-08-10T12:00:00Z", redactedAt: null, redactionReason: null, updatedAt: "2026-08-10T12:00:00Z" } } } } },
      { request: { query: TeacherFeedbackWorkDocument }, result: { data: { teacherFeedbackWork: [{ ...item, learningFeedback: { bookingId: "booking-39", observedStrengths: ["SPOKEN_PRODUCTION"], suggestedFocuses: ["PRONUNCIATION"], observations: "Clear sequence", nextPractice: "Practice target sounds", state: "SUBMITTED", submittedAt: "2026-08-10T12:00:00Z", redactedAt: null, redactionReason: null, updatedAt: "2026-08-10T12:00:00Z" } }] } } },
    ];
    const { container } = render(<MockedProvider mocks={mocks}><IntlProvider locale="en" messages={interfaceMessages.en}><TeacherFeedbackPanel /></IntlProvider></MockedProvider>);
    const strengths = await screen.findByRole("group", { name: /observed strengths/i });
    const focuses = screen.getByRole("group", { name: /suggested focus/i });
    await userEvent.click(within(strengths).getByRole("checkbox", { name: "Spoken production" }));
    await userEvent.click(within(focuses).getByRole("checkbox", { name: "Pronunciation" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Observations" }), "Clear sequence");
    await userEvent.type(screen.getByRole("textbox", { name: "Next practice" }), "Practice target sounds");
    await userEvent.click(screen.getByRole("button", { name: "Submit Learning Feedback" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Learning Feedback saved");
    expect((await axe.run(container)).violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });

  it("shows submitted feedback and submits a private Session Rating", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000040");
    const item = { bookingId: "booking-40", classSessionId: "session-40", classSessionEndsAt: "2026-08-10T11:00:00Z", feedbackDeadline: "2026-08-12T11:00:00Z", ratingDeadline: "2026-08-17T11:00:00Z", teacherDisplayName: "Taylor Teacher", learningFeedback: { bookingId: "booking-40", observedStrengths: ["SPOKEN_PRODUCTION"], suggestedFocuses: [], observations: "Clear sequence", nextPractice: "Practice target sounds", state: "SUBMITTED", submittedAt: "2026-08-10T12:00:00Z", redactedAt: null, redactionReason: null, updatedAt: "2026-08-10T12:00:00Z" }, sessionRating: null };
    const mocks: MockedResponse[] = [
      { request: { query: StudentFeedbackAndRatingsDocument }, result: { data: { studentFeedbackAndRatings: [item] } } },
      { request: { query: SaveSessionRatingDocument, variables: { input: { idempotencyKey: "00000000-0000-4000-8000-000000000040", bookingId: "booking-40", overallRating: 5, positiveTags: ["SUPPORTIVE"], improvementTags: [], comment: "A useful session" } } }, result: { data: { saveSessionRating: { __typename: "SaveSessionRatingSuccess", rating: { bookingId: "booking-40", overallRating: 5, positiveTags: ["SUPPORTIVE"], improvementTags: [], comment: "A useful session", redactedAt: null, redactionReason: null, createdAt: "2026-08-10T12:00:00Z", updatedAt: "2026-08-10T12:00:00Z" } } } } },
      { request: { query: StudentFeedbackAndRatingsDocument }, result: { data: { studentFeedbackAndRatings: [{ ...item, sessionRating: { bookingId: "booking-40", overallRating: 5, positiveTags: ["SUPPORTIVE"], improvementTags: [], comment: "A useful session", redactedAt: null, redactionReason: null, createdAt: "2026-08-10T12:00:00Z", updatedAt: "2026-08-10T12:00:00Z" } }] } } },
    ];
    const { container } = render(<MockedProvider mocks={mocks}><IntlProvider locale="en" messages={interfaceMessages.en}><StudentFeedbackRatingsPanel /></IntlProvider></MockedProvider>);
    expect(await screen.findByText("Clear sequence")).toBeVisible();
    await userEvent.click(screen.getByRole("radio", { name: "5" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Supportive" }));
    await userEvent.type(screen.getByRole("textbox", { name: /private comment/i }), "A useful session");
    await userEvent.click(screen.getByRole("button", { name: "Submit Session Rating" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Session Rating saved privately");
    expect((await axe.run(container)).violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });

  it("lets a Platform Administrator redact submitted Learning Feedback accessibly", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000041");
    const item = {
      bookingId: "booking-41", classSessionId: "session-41", studentDisplayName: "Sam Student", teacherDisplayName: "Taylor Teacher",
      learningFeedback: { state: "SUBMITTED", observedStrengths: ["SPOKEN_PRODUCTION"], suggestedFocuses: [], observations: "Clear sequence", nextPractice: "Practice target sounds", redactedAt: null, redactionReason: null, updatedAt: "2026-08-10T12:00:00Z" },
      sessionRating: null,
    };
    const reason = "This observation named a third-party student inappropriately.";
    const mocks: MockedResponse[] = [
      { request: { query: AdministratorFeedbackAndRatingsDocument }, result: { data: { administratorFeedbackAndRatings: [item] } } },
      { request: { query: RedactLearningFeedbackDocument, variables: { input: { idempotencyKey: "00000000-0000-4000-8000-000000000041", bookingId: "booking-41", reason } } }, result: { data: { redactLearningFeedback: { __typename: "RedactLearningFeedbackSuccess", feedback: { bookingId: "booking-41", redactedAt: "2026-08-10T13:00:00Z", redactionReason: reason } } } } },
    ];
    const { container } = render(<MockedProvider mocks={mocks}><IntlProvider locale="en" messages={interfaceMessages.en}><AdministratorQualityPanel /></IntlProvider></MockedProvider>);
    await userEvent.click(await screen.findByRole("button", { name: "Redact" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Redaction reason" }), reason);
    await userEvent.click(screen.getByRole("button", { name: "Redact" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Redacted.");
    expect((await axe.run(container)).violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });
});
