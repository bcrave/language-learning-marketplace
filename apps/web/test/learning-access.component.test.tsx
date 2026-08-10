import type { MockedResponse } from "@apollo/client/testing";
import { MockedProvider } from "@apollo/client/testing/react";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";

import { LearningAccessPanel } from "../src/learning-access.js";
import { EnterClassroomDocument, LearningAccessClassSessionsDocument, LessonMaterialsDocument } from "../src/generated/graphql.js";

describe("Lesson Material and Classroom Access journey", () => {
  afterEach(cleanup);

  it("renders safe Lesson Materials and enters the simulated classroom", async () => {
    const session = { id: "session-38", lessonUnitId: "unit-38", startsAt: "2026-08-11T16:00:00Z", endsAt: "2026-08-11T17:00:00Z", schedulingTimeZone: "America/Denver" };
    const mocks: MockedResponse[] = [
      { request: { query: LearningAccessClassSessionsDocument, variables: { actingRole: "STUDENT" } }, result: { data: { learningAccessLessonUnits: [{ id: "unit-38", title: "Plan a visit" }], learningAccessClassSessions: [session] } } },
      { request: { query: LessonMaterialsDocument, variables: { lessonUnitId: "unit-38", actingRole: "STUDENT" } }, result: { data: { lessonMaterials: [
        { id: "material-1", kind: "STRUCTURED_TEXT", title: "Visit planning guide", structuredContent: JSON.stringify([{ type: "heading", text: "Meet-up phrases" }, { type: "paragraph", text: "Choose a time and place." }, { type: "list", items: ["Where shall we meet?", "What time works?"] }, { type: "emphasis", text: "Confirm the details." }]), httpsUrl: null, publisher: null },
        { id: "material-2", kind: "HTTPS_REFERENCE", title: "Public phrase guide", structuredContent: null, httpsUrl: "https://example.com/phrases", publisher: "Example Publisher" },
      ] } } },
      { request: { query: EnterClassroomDocument, variables: { input: { classSessionId: "session-38", actingRole: "STUDENT" } } }, result: { data: { enterClassroom: { __typename: "EnterClassroomSuccess", classroom: { classSessionId: "session-38", lessonUnitId: "unit-38", teacherUserId: "teacher-38", simulationStatus: "SIMULATED" } } } } },
    ];
    const { container } = render(<MockedProvider mocks={mocks}><IntlProvider locale="en" messages={interfaceMessages.en}><LearningAccessPanel actingRole="STUDENT" /></IntlProvider></MockedProvider>);

    expect(await screen.findByRole("heading", { name: "Lesson Materials and classroom" })).toBeVisible();
    await userEvent.click(await screen.findByRole("button", { name: "Open Lesson Materials" }));
    expect(await screen.findByRole("heading", { name: "Visit planning guide" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Meet-up phrases" })).toBeVisible();
    const reference = screen.getByRole("link", { name: /Public phrase guide/ });
    expect(reference).toHaveAttribute("target", "_blank");
    expect(reference).toHaveAttribute("rel", "noreferrer noopener");

    await userEvent.click(screen.getByRole("button", { name: "Enter classroom" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Simulated classroom ready");
    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });
});
