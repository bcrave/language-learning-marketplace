import { MockedProvider } from "@apollo/client/testing/react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IntlProvider } from "react-intl";
import { afterEach, expect, it } from "vitest";

import { interfaceMessages } from "@marketplace/core";
import {
  AddAvailabilityExceptionDocument,
  SaveTeacherAvailabilityRangeDocument,
  TeacherAvailabilityDocument,
} from "../src/generated/graphql.js";
import { TeacherAvailabilityPanel } from "../src/teacher-availability.js";

afterEach(cleanup);

it("lets a Teacher schedule availability and redirects a conflicting exception to an Absence Request", async () => {
  const user = userEvent.setup();
  render(
    <MockedProvider mocks={[
      {
        request: { query: TeacherAvailabilityDocument },
        result: { data: { teacherAvailability: { timeZone: "America/Denver", weeklyRanges: [], exceptions: [] } } },
      },
      {
        request: { query: SaveTeacherAvailabilityRangeDocument, variables: { input: {
          idempotencyKey: "availability-range",
          weekday: "MONDAY", startLocalTime: "09:00", endLocalTime: "12:00",
          effectiveFrom: "2026-08-10", timeZone: "America/Denver",
        } } },
        result: { data: { saveTeacherAvailabilityRange: { range: { id: "range-1", weekday: "MONDAY", startLocalTime: "09:00", endLocalTime: "12:00", effectiveFrom: "2026-08-10", effectiveUntil: null, timeZone: "America/Denver" } } } },
      },
      {
        request: { query: AddAvailabilityExceptionDocument, variables: { input: {
          idempotencyKey: "availability-exception",
          startsAtLocal: "2026-08-18T09:00", endsAtLocal: "2026-08-18T11:00",
          startDisambiguation: "REJECT", endDisambiguation: "REJECT",
        } } },
        result: { data: { addAvailabilityException: { code: "PUBLISHED_CLASS_SESSION_OVERLAP", message: "A published Class Session occupies this time. Create an Absence Request instead.", classSessionIds: ["session-1"], absenceRequestPath: "/teacher/schedule" } } },
      },
    ]}>
      <IntlProvider locale="en" messages={interfaceMessages.en}>
        <TeacherAvailabilityPanel idempotencyKeyFactory={(kind) => kind === "range" ? "availability-range" : "availability-exception"} />
      </IntlProvider>
    </MockedProvider>,
  );

  await screen.findByRole("heading", { name: "Weekly Teacher Availability" });
  await user.selectOptions(screen.getByRole("combobox", { name: "Weekday" }), "MONDAY");
  await user.clear(screen.getByLabelText("Effective from"));
  await user.type(screen.getByLabelText("Effective from"), "2026-08-10");
  await user.click(screen.getByRole("button", { name: "Add weekly range" }));
  expect(await screen.findByText("Monday, 9:00 AM–12:00 PM from August 10, 2026")).toBeVisible();

  await user.type(screen.getByLabelText("Unavailable from"), "2026-08-18T09:00");
  await user.type(screen.getByLabelText("Unavailable until"), "2026-08-18T11:00");
  await user.click(screen.getByRole("button", { name: "Add Availability Exception" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Create an Absence Request instead");
  expect(screen.getByRole("link", { name: "Create an Absence Request" })).toHaveAttribute("href", "/teacher/schedule");
  expect((await axe.run(document.body)).violations).toEqual([]);
});
