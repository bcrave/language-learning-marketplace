import { MockedProvider } from "@apollo/client/testing/react";
import type { MockedResponse } from "@apollo/client/testing";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminCurriculum } from "../src/admin-curriculum.js";
import {
  AdministrationCurriculumDocument,
  CreateCourseDocument,
} from "../src/generated/graphql.js";

describe("Platform Administrator curriculum journey", () => {
  afterEach(cleanup);
  it("localizes product chrome and Topic labels without translating authored curriculum", async () => {
    const { container } = renderPanel("es");

    expect(await screen.findByRole("heading", { name: "Administración del currículo" })).toBeVisible();
    expect(screen.getByText("Currículo de muestra")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Everyday English Foundations" })).toBeVisible();
    expect(screen.getAllByText("Conversación cotidiana").length).toBeGreaterThan(1);
    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });

  it("creates a Course through the administration form", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000099");
    renderPanel("en", true);
    await screen.findByRole("heading", { name: "Curriculum administration" });
    const form = screen.getByRole("heading", { name: "Create a Course" }).closest("form")!;
    await userEvent.type(within(form).getByLabelText("Target language code"), "en");
    await userEvent.type(within(form).getByLabelText("Course title"), "Everyday English Foundations");
    await userEvent.type(within(form).getByLabelText("Summary"), "Build confidence in practical exchanges.");
    await userEvent.click(within(form).getByRole("button", { name: "Create Course" }));
    expect(await screen.findByText("Course created.")).toBeVisible();
  });

  it("exposes approved structured-material, revision, and profile-image controls", async () => {
    renderPanel("en", false, true);
    await screen.findByRole("heading", { name: "Curriculum administration" });
    const addMaterial = screen.getByRole("heading", { name: "Add Lesson Material" }).closest("form")!;
    await userEvent.type(within(addMaterial).getByLabelText("Structured heading"), "Session plan");
    await userEvent.type(within(addMaterial).getByLabelText("Structured list (one item per line)"), "Model\nPractice");
    await userEvent.type(within(addMaterial).getByLabelText("Structured emphasis"), "Reflect");
    expect(within(addMaterial).getByLabelText("Structured heading")).toHaveValue("Session plan");
    const reviseMaterial = screen.getByRole("heading", { name: "Revise a Lesson Material" }).closest("form")!;
    await userEvent.type(within(reviseMaterial).getByLabelText("Structured heading"), "Revised plan");
    await userEvent.type(within(reviseMaterial).getByLabelText("Structured list (one item per line)"), "Review\nReflect");
    expect(within(reviseMaterial).getByLabelText("Structured heading")).toHaveValue("Revised plan");
    const profile = screen.getByRole("heading", { name: "Manage a Teacher Profile" }).closest("form")!;
    await userEvent.type(within(profile).getByLabelText("Profile image HTTPS URL"), "https://example.org/teacher.jpg");
    expect(within(profile).getByLabelText("Profile image HTTPS URL")).toHaveValue("https://example.org/teacher.jpg");
  });

  it("opens an approved external reference without giving it opener access", async () => {
    // The threat model requires that no external link can reach back into the
    // page that opened it, on every surface that renders one.
    renderPanel("en", false, true);
    await screen.findByRole("heading", { name: "Curriculum administration" });

    const reference = screen.getByText("Example Publisher").closest("a")!;

    expect(reference).toHaveAttribute("href", "https://example.org/guide");
    expect(reference).toHaveAttribute("target", "_blank");
    expect(reference).toHaveAttribute("rel", "noreferrer noopener");
  });
});

function renderPanel(locale: "en" | "es", includeMutation = false, includeCatalog = locale === "es") {
  const queryResult = {
    administrationCurriculum: {
      topics: [{ key: "EC", label: locale === "es" ? "Conversación cotidiana" : "Everyday Conversation", labelEn: "Everyday Conversation", labelEs: "Conversación cotidiana" }],
      courses: includeCatalog ? [{
        id: "course-1", targetLanguage: "en", curriculumLevel: "A1", title: "Everyday English Foundations", summary: "Build confidence in practical exchanges.",
        lessonUnits: [{ id: "unit-1", title: "Introductions That Continue", summary: "Ask follow-up questions.", order: 1, state: "ACTIVE", objectives: ["Introduce yourself."], topics: [{ key: "EC", label: locale === "es" ? "Conversación cotidiana" : "Everyday Conversation" }], materials: [{ id: "material-1", kind: "STRUCTURED_TEXT", title: "Lesson guide", structuredContent: "[{\"type\":\"paragraph\",\"text\":\"Practice.\"}]", httpsUrl: null, publisher: null }, { id: "material-2", kind: "HTTPS_REFERENCE", title: "External guide", structuredContent: null, httpsUrl: "https://example.org/guide", publisher: "Example Publisher" }] }],
      }] : [],
      teachers: [],
    },
  };
  const mocks: MockedResponse[] = [{ request: { query: AdministrationCurriculumDocument, variables: { locale: locale === "es" ? "ES" : "EN" } }, result: { data: queryResult } }];
  if (includeMutation) {
    mocks.push({
      request: { query: CreateCourseDocument, variables: { input: { idempotencyKey: "00000000-0000-4000-8000-000000000099", targetLanguage: "en", curriculumLevel: "A1", title: "Everyday English Foundations", summary: "Build confidence in practical exchanges." } } },
      result: { data: { createCourse: { __typename: "CreateCourseSuccess", course: { id: "course-1", targetLanguage: "en", curriculumLevel: "A1", title: "Everyday English Foundations", summary: "Build confidence in practical exchanges." } } } },
    });
    mocks.push({ request: { query: AdministrationCurriculumDocument, variables: { locale: "EN" } }, result: { data: queryResult } });
  }
  return render(<MockedProvider mocks={mocks}><IntlProvider locale={locale} messages={interfaceMessages[locale]}><AdminCurriculum locale={locale} /></IntlProvider></MockedProvider>);
}
