import { MockedProvider } from "@apollo/client/testing/react";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";

import { AuditLogDocument, AuditLogExportDocument } from "../src/generated/graphql.js";
import { AuditLogPanel } from "../src/audit-log.js";

afterEach(cleanup);

const administratorId = "00000000-0000-4000-8000-0000000000a1";
const studentId = "00000000-0000-4000-8000-0000000000a2";

const UNFILTERED = {
  fromLocalDate: null,
  toLocalDate: null,
  outcome: null,
  actingRole: null,
  operation: null,
  actorUserId: null,
  correlationId: null,
  after: null,
};

const appliedFilter = {
  __typename: "AuditLogFilter",
  fromLocalDate: "2026-07-28",
  toLocalDate: "2026-08-26",
  timeZone: "America/Denver",
  outcome: null,
  actingRole: null,
  operation: null,
  actorUserId: null,
  correlationId: null,
};

function auditEntry(overrides: Record<string, unknown> = {}) {
  return {
    __typename: "AuditEntry",
    id: "00000000-0000-4000-8000-0000000000b1",
    occurredAt: "2026-08-21T16:30:00.000Z",
    actorUserId: administratorId,
    systemIdentity: null,
    actingRole: "PLATFORM_ADMINISTRATOR",
    operation: "class-credit.adjusted",
    targetType: "ClassCreditAccount",
    targetId: studentId,
    outcome: "SUCCEEDED",
    reasonCode: "CLASS_CREDIT_ADJUSTED",
    correlationId: "b6b1b3c2-0000-4000-8000-0000000000c1",
    ...overrides,
  };
}

function auditLogPage(overrides: Record<string, unknown> = {}) {
  return {
    __typename: "AuditLog",
    scope: "MARKETPLACE_WIDE",
    appliedFilter,
    entries: [auditEntry()],
    pageInfo: { __typename: "AuditLogPageInfo", endCursor: null, hasNextPage: false },
    ...overrides,
  };
}

const auditLogQuery = (
  auditLog: Record<string, unknown>,
  filter: Record<string, unknown> = UNFILTERED,
) => ({
  request: { query: AuditLogDocument, variables: { filter } },
  result: { data: { auditLog } },
});

describe("Audit Log panel", () => {
  it("states the scope, the range it read, and each entry's opaque record", async () => {
    renderWithLocale(<AuditLogPanel />, "en", [auditLogQuery(auditLogPage())]);

    expect(await screen.findByText("You are reading the marketplace-wide Audit Log.")).toBeVisible();
    expect(screen.getByText("Jul 28, 2026 through Aug 26, 2026, read in America/Denver")).toBeVisible();
    expect(screen.getByRole("heading", { name: "class-credit.adjusted — Succeeded" })).toBeVisible();
    expect(screen.getByText(`Acted by User ${administratorId} as Platform Administrator`)).toBeVisible();
    expect(screen.getByText(`Target ClassCreditAccount ${studentId}`)).toBeVisible();
    expect(screen.getByText("Reason CLASS_CREDIT_ADJUSTED")).toBeVisible();
    expect(screen.getByText("Correlation b6b1b3c2-0000-4000-8000-0000000000c1")).toBeVisible();
    // The instant is read in the same Display Time Zone the range was read in.
    expect(screen.getByText("Occurred August 21, 2026 at 10:30:00 AM")).toBeVisible();
  });

  it("names a background actor by its system identity rather than inventing a User", async () => {
    renderWithLocale(<AuditLogPanel />, "en", [auditLogQuery(auditLogPage({
      entries: [auditEntry({
        actorUserId: null,
        systemIdentity: "AUDIT_RETENTION_WORKER",
        actingRole: null,
        operation: "audit-log.partition-expired",
        targetType: "AuditLogPartition",
        targetId: "audit_entries_2026_04",
        reasonCode: "AUDIT_PARTITION_EXPIRED",
      })],
    }))]);

    expect(await screen.findByText("Acted by the background system identity AUDIT_RETENTION_WORKER")).toBeVisible();
    expect(screen.getByText("Target AuditLogPartition audit_entries_2026_04")).toBeVisible();
  });

  it("tells an Organization Manager what its own scope leaves out", async () => {
    renderWithLocale(<AuditLogPanel />, "en", [auditLogQuery(auditLogPage({
      scope: "ASSIGNED_ORGANIZATION",
      entries: [],
    }))]);

    expect(await screen.findByText(
      "You are reading what your Organization's managers did. It excludes every other Organization, marketplace-wide administration, and the activity of the Students you sponsor.",
    )).toBeVisible();
    expect(screen.getByText("No Audit Entry matches these filters.")).toBeVisible();
  });

  it("applies a stated filter and pages back through older entries", async () => {
    const user = userEvent.setup();
    const filtered = {
      ...UNFILTERED,
      fromLocalDate: "2026-08-22",
      toLocalDate: "2026-08-22",
      outcome: "DENIED",
      actorUserId: administratorId,
    };
    const olderEntry = auditEntry({
      id: "00000000-0000-4000-8000-0000000000b2",
      operation: "audit-log.read",
      outcome: "DENIED",
      reasonCode: "AUDIT_LOG_ROLE_REQUIRED",
      occurredAt: "2026-08-22T12:00:00.000Z",
    });

    renderWithLocale(<AuditLogPanel />, "en", [
      auditLogQuery(auditLogPage()),
      auditLogQuery(auditLogPage({
        appliedFilter: { ...appliedFilter, fromLocalDate: "2026-08-22", toLocalDate: "2026-08-22", outcome: "DENIED" },
        entries: [auditEntry({ outcome: "DENIED", reasonCode: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED" })],
        pageInfo: { __typename: "AuditLogPageInfo", endCursor: "cursor-1", hasNextPage: true },
      }), filtered),
      auditLogQuery(auditLogPage({
        appliedFilter: { ...appliedFilter, fromLocalDate: "2026-08-22", toLocalDate: "2026-08-22", outcome: "DENIED" },
        entries: [olderEntry],
        pageInfo: { __typename: "AuditLogPageInfo", endCursor: null, hasNextPage: false },
      }), { ...filtered, after: "cursor-1" }),
    ]);

    await screen.findByRole("heading", { name: "class-credit.adjusted — Succeeded" });
    await user.type(screen.getByLabelText("From"), "2026-08-22");
    await user.type(screen.getByLabelText("To"), "2026-08-22");
    await user.selectOptions(screen.getByRole("combobox", { name: "Outcome" }), "Denied");
    await user.type(screen.getByLabelText("Acting User identifier"), administratorId);
    await user.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(await screen.findByText("Reason PLATFORM_ADMINISTRATOR_ROLE_REQUIRED")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Show older entries" }));

    expect(await screen.findByText("Reason AUDIT_LOG_ROLE_REQUIRED")).toBeVisible();
    // The first page stays on screen: paging adds history, it does not replace it.
    expect(screen.getByText("Reason PLATFORM_ADMINISTRATOR_ROLE_REQUIRED")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Show older entries" })).not.toBeInTheDocument();
  });

  it("offers the scoped entries as a named file rather than a second reading surface", async () => {
    const user = userEvent.setup();
    renderWithLocale(<AuditLogPanel />, "en", [
      auditLogQuery(auditLogPage()),
      {
        request: { query: AuditLogExportDocument, variables: { filter: UNFILTERED } },
        result: {
          data: {
            auditLogExport: {
              __typename: "AuditLogExport",
              scope: "MARKETPLACE_WIDE",
              schemaVersion: "audit_log.v1",
              exportedAt: "2026-08-26T18:00:00.000Z",
              rowCount: 25,
              fileName: "audit_log.v1_2026-07-28_2026-08-27.csv",
              contentType: "text/csv; charset=utf-8",
              csv: "schema_version,occurred_at\naudit_log.v1,2026-08-21T10:30:00-06:00\n",
            },
          },
        },
      },
    ]);

    await user.click(await screen.findByRole("button", { name: "Export these Audit Entries" }));

    const link = await screen.findByRole("link", {
      name: "audit_log.v1_2026-07-28_2026-08-27.csv is ready: 25 Audit Entries.",
    });
    expect(link).toHaveAttribute("download", "audit_log.v1_2026-07-28_2026-08-27.csv");
    expect(screen.queryByText(/audit_log.v1,2026-08-21/)).not.toBeInTheDocument();
  });

  it("reports an export refused for being too wide as the viewer's own filter to narrow", async () => {
    const user = userEvent.setup();
    renderWithLocale(<AuditLogPanel />, "en", [
      auditLogQuery(auditLogPage()),
      {
        request: { query: AuditLogExportDocument, variables: { filter: UNFILTERED } },
        result: {
          data: {
            auditLogExport: {
              __typename: "AuditLogError",
              code: "AUDIT_LOG_ROW_LIMIT_EXCEEDED",
              message: "An Audit Log export carries at most 5000 Audit Entries.",
            },
          },
        },
      },
    ]);

    await user.click(await screen.findByRole("button", { name: "Export these Audit Entries" }));

    expect(await screen.findByText(
      "The filters match more than 5,000 Audit Entries. The export was refused rather than shortened; narrow the range or the filters.",
    )).toHaveAttribute("role", "alert");
  });

  it("reports a range the Audit Log cannot interpret", async () => {
    renderWithLocale(<AuditLogPanel />, "en", [auditLogQuery({
      __typename: "AuditLogError",
      code: "INVALID_AUDIT_LOG_RANGE",
      message: "Choose a range of at most 12 months.",
    })]);

    expect(await screen.findByText(
      "Choose a range of at most 12 months that starts on or before it ends.",
    )).toHaveAttribute("role", "alert");
  });

  it("has no serious or critical automated accessibility violations", async () => {
    const { container } = renderWithLocale(<AuditLogPanel />, "es", [auditLogQuery(auditLogPage())]);

    expect(await screen.findByRole("heading", { name: "Registro de auditoría" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Aplicar filtros" })).toBeVisible();
    const result = await axe.run(container);
    expect(result.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });
});

function renderWithLocale(
  element: React.ReactNode,
  locale: "en" | "es",
  mocks: NonNullable<React.ComponentProps<typeof MockedProvider>["mocks"]>,
) {
  return render(
    <MockedProvider mocks={mocks}>
      <IntlProvider locale={locale} messages={interfaceMessages[locale]}>
        {element}
      </IntlProvider>
    </MockedProvider>,
  );
}
