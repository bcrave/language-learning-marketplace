import { MockedProvider } from "@apollo/client/testing/react";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";

import { CourseProgressPanel } from "../src/course-progress.js";
import { StudentCourseProgressDocument } from "../src/generated/graphql.js";

describe("Student Course Progress", () => {
  afterEach(cleanup);

  it("shows active progress and retained retired Lesson Unit history", async () => {
    const { container } = render(<MockedProvider mocks={[{ request: { query: StudentCourseProgressDocument }, result: { data: { studentCourseProgress: [{ courseId: "course-37", title: "Spanish B2", targetLanguage: "es", curriculumLevel: "B2", activeLessonUnitCount: 2, completedActiveLessonUnitCount: 1, percentage: 50, learningHistory: [{ lessonUnitId: "active-37", title: "Tell a story", state: "ACTIVE", earnedAt: "2026-08-10T11:01:00Z", countsTowardProgress: true }, { lessonUnitId: "retired-37", title: "Legacy narration", state: "RETIRED", earnedAt: "2026-07-01T12:00:00Z", countsTowardProgress: false }] }] } } }] }><IntlProvider locale="en" messages={interfaceMessages.en}><CourseProgressPanel /></IntlProvider></MockedProvider>);
    expect(await screen.findByRole("heading", { name: "Spanish B2" })).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Spanish B2 progress" })).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("1 of 2 active Lesson Units completed")).toBeVisible();
    expect(screen.getByText(/Legacy narration.*retired history/i)).toBeVisible();
    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });

  it.each([
    ["empty", { request: { query: StudentCourseProgressDocument }, result: { data: { studentCourseProgress: [] } } }, "No Course Progress is available yet."],
    ["error", { request: { query: StudentCourseProgressDocument }, error: new Error("private diagnostic") }, "We couldn't load Course Progress. Try again."],
  ])("keeps the %s state accessible", async (_state, mock, expectedText) => {
    const { container } = render(<MockedProvider mocks={[mock]}><IntlProvider locale="en" messages={interfaceMessages.en}><CourseProgressPanel /></IntlProvider></MockedProvider>);
    expect(await screen.findByText(expectedText)).toBeVisible();
    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });
});
