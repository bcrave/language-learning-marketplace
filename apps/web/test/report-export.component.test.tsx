import { MockedProvider } from "@apollo/client/testing/react";
import { interfaceMessages } from "@marketplace/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";

import {
  ReportExportArtifactDocument,
  ReportExportsDocument,
  RequestReportExportDocument,
} from "../src/generated/graphql.js";
import { ReportExportPanel } from "../src/report-export.js";

afterEach(cleanup);

const completedId = "00000000-0000-4000-8000-000000000090";
const queuedId = "00000000-0000-4000-8000-000000000091";
const failedId = "00000000-0000-4000-8000-000000000092";
const expiredId = "00000000-0000-4000-8000-000000000093";

const PERIOD = { fromLocalDate: "2026-02-01", toLocalDate: "2026-06-30" };

// The list reads a named fragment, so a cached result only matches the
// `... on ReportExport` type condition when the mock carries __typename.
function reportExport(overrides: Record<string, unknown>) {
  return {
    __typename: "ReportExport",
    id: completedId,
    kind: "ORDINARY",
    schemaVersion: "org_progress.v1",
    state: "COMPLETED",
    periodStartLocalDate: "2026-02-01",
    periodEndExclusiveLocalDate: "2026-07-01",
    timeZone: "America/Denver",
    requestedAt: "2026-06-25T17:55:00.000Z",
    completedAt: "2026-06-25T18:00:00.000Z",
    expiresAt: "2026-06-26T18:00:00.000Z",
    dataAsOf: "2026-06-25T18:00:00.000Z",
    rowCount: 42,
    contentDigest: "a".repeat(64),
    failureReasonCode: null,
    downloadable: true,
    ...overrides,
  };
}

const listQuery = (exports: Array<Record<string, unknown>>) => ({
  request: { query: ReportExportsDocument },
  result: { data: { reportExports: exports } },
});

describe("Report Export panel", () => {
  it("states the scope, schema, row count, digest, and expiry of a completed export", async () => {
    renderWithLocale(<ReportExportPanel />, "en", [listQuery([reportExport({})])]);

    expect(await screen.findByRole("heading", {
      name: "Progress and attendance for Feb 1, 2026 through Jul 1, 2026 (exclusive), read in America/Denver",
    })).toBeVisible();
    expect(screen.getByText("Schema org_progress.v1")).toBeVisible();
    expect(screen.getByText("Completed June 25, 2026 at 12:00 PM: 42 rows as of June 25, 2026 at 12:00 PM.")).toBeVisible();
    expect(screen.getByText(`Content digest ${"a".repeat(64)}`)).toBeVisible();
    expect(screen.getByText("Available to download until June 26, 2026 at 12:00 PM")).toBeVisible();
  });

  it("shows the whole lifecycle, and offers download only while an artifact lives", async () => {
    renderWithLocale(<ReportExportPanel />, "en", [listQuery([
      reportExport({ id: queuedId, state: "QUEUED", completedAt: null, expiresAt: null, dataAsOf: null, rowCount: null, contentDigest: null, downloadable: false }),
      reportExport({}),
      reportExport({ id: failedId, state: "FAILED", failureReasonCode: "ROW_LIMIT_EXCEEDED", completedAt: null, expiresAt: null, dataAsOf: null, rowCount: null, contentDigest: null, downloadable: false }),
      reportExport({ id: expiredId, state: "EXPIRED", downloadable: false }),
    ])]);

    expect(await screen.findByText("Queued: waiting for a worker.")).toBeVisible();
    expect(screen.getByText("Failed. No file was created.")).toBeVisible();
    expect(screen.getByText(
      "The range produced more than 25,000 rows. The export was refused rather than shortened; choose a shorter range.",
    )).toBeVisible();
    expect(screen.getByText("Expired. The file is gone; request a fresh export.")).toBeVisible();
    // Exactly one of the four is still downloadable.
    expect(screen.getAllByRole("button", { name: "Download Progress and attendance export" })).toHaveLength(1);
  });

  it("queues a bounded request and reports the queued state without any report data", async () => {
    const user = userEvent.setup();
    renderWithLocale(<ReportExportPanel idempotencyKeyFactory={() => "export-key"} />, "en", [
      listQuery([]),
      {
        request: {
          query: RequestReportExportDocument,
          variables: { input: { idempotencyKey: "export-key", kind: "ORDINARY", ...PERIOD } },
        },
        result: {
          data: {
            requestReportExport: {
              __typename: "RequestReportExportSuccess",
              reportExport: reportExport({
                id: queuedId,
                state: "QUEUED",
                completedAt: null,
                expiresAt: null,
                dataAsOf: null,
                rowCount: null,
                contentDigest: null,
                downloadable: false,
              }),
            },
          },
        },
      },
    ]);

    expect(await screen.findByText("You have no Report Exports.")).toBeVisible();
    await requestExport(user, "Progress and attendance");

    expect(await screen.findByText("Export queued. It appears below when it is ready.")).toHaveAttribute("role", "status");
    expect(screen.getByText("Queued: waiting for a worker.")).toBeVisible();
  });

  it("reports a correction-history request that has no Organization to scope it to", async () => {
    const user = userEvent.setup();
    renderWithLocale(<ReportExportPanel idempotencyKeyFactory={() => "history-key"} />, "en", [
      listQuery([]),
      {
        request: {
          query: RequestReportExportDocument,
          variables: { input: { idempotencyKey: "history-key", kind: "CORRECTION_HISTORY", ...PERIOD } },
        },
        result: {
          data: {
            requestReportExport: {
              __typename: "ReportExportError",
              code: "CORRECTION_HISTORY_NOT_AUTHORIZED",
              message: "The correction-history extract requires an Organization to scope it to.",
            },
          },
        },
      },
    ]);

    await requestExport(user, "Correction history");

    expect(await screen.findByText("The correction-history extract requires an Organization to scope it to."))
      .toHaveAttribute("role", "alert");
  });

  it("keeps one attempt's Idempotency Key while the requester fixes it, and starts a new attempt after a busy queue", async () => {
    const user = userEvent.setup();
    const keys = ["first-key", "second-key"];
    renderWithLocale(<ReportExportPanel idempotencyKeyFactory={() => keys.shift() ?? "exhausted"} />, "en", [
      listQuery([]),
      {
        request: {
          query: RequestReportExportDocument,
          variables: { input: { idempotencyKey: "first-key", kind: "ORDINARY", ...PERIOD } },
        },
        result: {
          data: {
            requestReportExport: {
              __typename: "ReportExportError",
              code: "EXPORT_ALREADY_IN_PROGRESS",
              message: "One Report Export runs at a time.",
            },
          },
        },
      },
      {
        request: {
          query: RequestReportExportDocument,
          variables: { input: { idempotencyKey: "second-key", kind: "ORDINARY", ...PERIOD } },
        },
        result: {
          data: {
            requestReportExport: {
              __typename: "RequestReportExportSuccess",
              reportExport: reportExport({ id: queuedId, state: "QUEUED", downloadable: false }),
            },
          },
        },
      },
    ]);

    await requestExport(user, "Progress and attendance");
    expect(await screen.findByText("One Report Export runs at a time. Wait for the current one to finish."))
      .toHaveAttribute("role", "alert");

    // The same unchanged request, once the queue has drained, is a fresh attempt.
    await user.click(screen.getByRole("button", { name: "Request export" }));
    expect(await screen.findByText("Export queued. It appears below when it is ready."))
      .toHaveAttribute("role", "status");
  });

  it("reports a refused range as the requester's own filter to fix", async () => {
    const user = userEvent.setup();
    renderWithLocale(<ReportExportPanel idempotencyKeyFactory={() => "range-key"} />, "en", [
      listQuery([]),
      {
        request: {
          query: RequestReportExportDocument,
          variables: { input: { idempotencyKey: "range-key", kind: "ORDINARY", ...PERIOD } },
        },
        result: {
          data: {
            requestReportExport: {
              __typename: "ReportExportError",
              code: "INVALID_REPORT_RANGE",
              message: "Choose a range of at most 12 months.",
            },
          },
        },
      },
    ]);

    await requestExport(user, "Progress and attendance");

    expect(await screen.findByText("Choose a range of at most 12 months that starts on or before it ends."))
      .toHaveAttribute("role", "alert");
  });

  it("offers the released extract as a named file rather than rendering its rows", async () => {
    const user = userEvent.setup();
    renderWithLocale(<ReportExportPanel />, "en", [
      listQuery([reportExport({})]),
      {
        request: { query: ReportExportArtifactDocument, variables: { id: completedId } },
        result: {
          data: {
            reportExportArtifact: {
              __typename: "ReportExportArtifact",
              fileName: "org_progress.v1_2026-02-01_2026-07-01.csv",
              contentType: "text/csv; charset=utf-8",
              csv: "schema_version,data_as_of\norg_progress.v1,2026-06-25T12:00:00-06:00\n",
              reportExport: reportExport({}),
            },
          },
        },
      },
    ]);

    await user.click(await screen.findByRole("button", { name: "Download Progress and attendance export" }));

    const link = await screen.findByRole("link", { name: "org_progress.v1_2026-02-01_2026-07-01.csv is ready: 42 rows." });
    expect(link).toHaveAttribute("download", "org_progress.v1_2026-02-01_2026-07-01.csv");
    expect(link.getAttribute("href")).toContain("data:text/csv; charset=utf-8,");
    // The panel hands over a file; it never becomes a second reporting surface.
    expect(screen.queryByText(/org_progress.v1,2026-06-25/)).not.toBeInTheDocument();
  });

  it("reports an artifact that expired between listing and download", async () => {
    const user = userEvent.setup();
    renderWithLocale(<ReportExportPanel />, "en", [
      listQuery([reportExport({})]),
      {
        request: { query: ReportExportArtifactDocument, variables: { id: completedId } },
        error: new Error("That Report Export is no longer available."),
      },
    ]);

    await user.click(await screen.findByRole("button", { name: "Download Progress and attendance export" }));

    expect(await screen.findByText("That Report Export is no longer available. Request a fresh export."))
      .toHaveAttribute("role", "alert");
  });

  it("has no serious or critical automated accessibility violations", async () => {
    const { container } = renderWithLocale(<ReportExportPanel />, "es", [listQuery([reportExport({})])]);

    expect(await screen.findByRole("heading", { name: "Exportaciones de informes" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Solicitar exportación" })).toBeVisible();
    const result = await axe.run(container);
    expect(result.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });
});

async function requestExport(user: ReturnType<typeof userEvent.setup>, extract: string) {
  await user.selectOptions(await screen.findByRole("combobox", { name: "Extract" }), extract);
  await user.type(screen.getByLabelText("From"), PERIOD.fromLocalDate);
  await user.type(screen.getByLabelText("To"), PERIOD.toLocalDate);
  await user.click(screen.getByRole("button", { name: "Request export" }));
}

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
