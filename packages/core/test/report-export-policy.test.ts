import {
  correctionHistoryReportExportIsAuthorized,
  csvDocument,
  csvField,
  exportProgressPercentage,
  ordinaryReportExportIsAuthorized,
  reportExportExpiresAt,
  reportExportIsDownloadable,
  reportExportRowLimitRefusal,
  REPORT_EXPORT_COLUMNS,
  REPORT_EXPORT_LIFETIME_MILLISECONDS,
  REPORT_EXPORT_MAXIMUM_ROW_COUNT,
  REPORT_EXPORT_SCHEMA_VERSIONS,
  USER_ROLES,
} from "@marketplace/core";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

const COMPLETED_AT = new Date("2026-07-29T17:42:10.000Z");

describe("Report Export authorization policy", () => {
  it("authorizes the ordinary extract for the two reporting roles", () => {
    expect(ordinaryReportExportIsAuthorized("ORGANIZATION_MANAGER")).toBe(true);
    expect(ordinaryReportExportIsAuthorized("PLATFORM_ADMINISTRATOR")).toBe(true);
    expect(ordinaryReportExportIsAuthorized("STUDENT")).toBe(false);
    expect(ordinaryReportExportIsAuthorized("TEACHER")).toBe(false);
  });

  it("authorizes the correction-history extract separately, so authority over the ordinary extract never carries into prior values", () => {
    expect(correctionHistoryReportExportIsAuthorized("PLATFORM_ADMINISTRATOR")).toBe(true);
    expect(correctionHistoryReportExportIsAuthorized("ORGANIZATION_MANAGER")).toBe(false);
    expect(correctionHistoryReportExportIsAuthorized("STUDENT")).toBe(false);
    expect(correctionHistoryReportExportIsAuthorized("TEACHER")).toBe(false);
  });

  it("never authorizes the correction-history extract for a role the ordinary extract refuses", () => {
    fc.assert(fc.property(fc.constantFrom(...USER_ROLES), (role) =>
      !correctionHistoryReportExportIsAuthorized(role) || ordinaryReportExportIsAuthorized(role)));
  });
});

describe("Report Export lifetime policy", () => {
  it("expires an artifact 24 hours after it completes", () => {
    expect(reportExportExpiresAt(COMPLETED_AT)).toEqual(new Date("2026-07-30T17:42:10.000Z"));
    expect(REPORT_EXPORT_LIFETIME_MILLISECONDS).toBe(24 * 60 * 60_000);
  });

  it("allows download only from a completed artifact inside its lifetime", () => {
    const expiresAt = reportExportExpiresAt(COMPLETED_AT);
    expect(reportExportIsDownloadable({ state: "COMPLETED", expiresAt }, COMPLETED_AT)).toBe(true);
    expect(reportExportIsDownloadable({ state: "COMPLETED", expiresAt }, new Date(expiresAt.getTime() - 1))).toBe(true);
    expect(reportExportIsDownloadable({ state: "COMPLETED", expiresAt }, expiresAt)).toBe(false);
    expect(reportExportIsDownloadable({ state: "QUEUED", expiresAt: null }, COMPLETED_AT)).toBe(false);
    expect(reportExportIsDownloadable({ state: "RUNNING", expiresAt: null }, COMPLETED_AT)).toBe(false);
    expect(reportExportIsDownloadable({ state: "FAILED", expiresAt: null }, COMPLETED_AT)).toBe(false);
    expect(reportExportIsDownloadable({ state: "EXPIRED", expiresAt }, COMPLETED_AT)).toBe(false);
  });

  it("never re-opens download once the lifetime has passed, whatever the clock is asked", () => {
    const expiresAt = reportExportExpiresAt(COMPLETED_AT);
    fc.assert(fc.property(fc.integer({ min: 0, max: 10_000_000 }), (millisecondsAfterExpiry) =>
      !reportExportIsDownloadable(
        { state: "COMPLETED", expiresAt },
        new Date(expiresAt.getTime() + millisecondsAfterExpiry),
      )));
  });
});

describe("Report Export row bound", () => {
  it("refuses rather than truncates above the accepted row count", () => {
    expect(reportExportRowLimitRefusal(REPORT_EXPORT_MAXIMUM_ROW_COUNT)).toBeNull();
    expect(reportExportRowLimitRefusal(REPORT_EXPORT_MAXIMUM_ROW_COUNT + 1)).toBe("ROW_LIMIT_EXCEEDED");
    expect(REPORT_EXPORT_MAXIMUM_ROW_COUNT).toBe(25_000);
  });
});

describe("Report Export CSV schemas", () => {
  it("names each accepted stable schema version", () => {
    expect(REPORT_EXPORT_SCHEMA_VERSIONS).toEqual({
      ORDINARY: "org_progress.v1",
      CORRECTION_HISTORY: "correction_history.v1",
    });
  });

  it("leads the ordinary schema with its provenance columns and ends with its correction markers", () => {
    expect(REPORT_EXPORT_COLUMNS.ORDINARY.slice(0, 5)).toEqual([
      "schema_version",
      "data_as_of",
      "requester_time_zone",
      "period_start",
      "period_end_exclusive",
    ]);
    expect(REPORT_EXPORT_COLUMNS.ORDINARY.slice(-3)).toEqual([
      "is_corrected",
      "correction_count",
      "latest_correction_at",
    ]);
  });

  it("carries prior and current values in the correction-history schema and no actor or reason", () => {
    expect(REPORT_EXPORT_COLUMNS.CORRECTION_HISTORY).toContain("prior_value");
    expect(REPORT_EXPORT_COLUMNS.CORRECTION_HISTORY).toContain("current_value");
    for (const forbidden of ["actor", "actor_ref", "reason", "corrected_by", "explanation"]) {
      expect(REPORT_EXPORT_COLUMNS.CORRECTION_HISTORY).not.toContain(forbidden);
    }
  });

  it("keeps both schemas free of contact details, free text, and ratings", () => {
    for (const columns of Object.values(REPORT_EXPORT_COLUMNS)) {
      for (const column of columns) {
        expect(column).not.toMatch(/email|password|token|comment|rating|feedback|note|balance/);
        expect(column).toMatch(/^[a-z][a-z0-9_]*$/);
      }
    }
  });
});

describe("Report Export CSV encoding", () => {
  it("writes locale-independent values", () => {
    expect(csvField(1234.5)).toBe("1234.5");
    expect(csvField(true)).toBe("true");
    expect(csvField(false)).toBe("false");
    expect(csvField(null)).toBe("");
  });

  it("quotes a field that would otherwise break the row", () => {
    expect(csvField("Nimbus Logistics")).toBe("Nimbus Logistics");
    expect(csvField("Nimbus, Logistics")).toBe("\"Nimbus, Logistics\"");
    expect(csvField("Sofía \"Sofi\" Rivera")).toBe("\"Sofía \"\"Sofi\"\" Rivera\"");
    expect(csvField("two\nlines")).toBe("\"two\nlines\"");
  });

  it("neutralizes a display name a spreadsheet would otherwise execute as a formula", () => {
    expect(csvField("=1+1")).toBe("\"'=1+1\"");
    expect(csvField("+34 600 000 000")).toBe("\"'+34 600 000 000\"");
    expect(csvField("@Nimbus")).toBe("\"'@Nimbus\"");
    expect(csvField("-Nimbus")).toBe("\"'-Nimbus\"");
    // A negative number is a value, not an injected formula, so it stays readable.
    expect(csvField(-3)).toBe("-3");
  });

  it("always writes the header row and never truncates a supplied row", () => {
    expect(csvDocument(["a", "b"], [["1", "2"], ["3", null]]))
      .toBe("a,b\n1,2\n3,\n");
    expect(csvDocument(["a", "b"], [])).toBe("a,b\n");
  });

  it("writes exactly one line per row plus the header, for any row set", () => {
    fc.assert(fc.property(
      fc.array(fc.array(fc.string({ maxLength: 8 }), { minLength: 2, maxLength: 2 }), { maxLength: 40 }),
      (rows) => {
        const document = csvDocument(["a", "b"], rows);
        // Quoting is what keeps an embedded newline from becoming an extra record.
        const records = document.match(/(?:[^,"\n]|"(?:[^"]|"")*")*\n/g) ?? [];
        return records.length === rows.length + 1;
      },
    ));
  });
});

describe("Report Export progress percentage", () => {
  it("writes one fixed decimal place rather than a localized number", () => {
    expect(exportProgressPercentage(6, 10)).toBe("60.0");
    expect(exportProgressPercentage(1, 3)).toBe("33.3");
    expect(exportProgressPercentage(4, 4)).toBe("100.0");
  });

  it("reports no progress for a Course with no active Lesson Units rather than dividing by zero", () => {
    expect(exportProgressPercentage(0, 0)).toBe("0.0");
  });

  it("stays between 0.0 and 100.0 and never uses a grouping separator", () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 500 }),
      fc.integer({ min: 1, max: 500 }),
      (completed, active) => {
        const value = exportProgressPercentage(Math.min(completed, active), active);
        return /^\d{1,3}\.\d$/.test(value) && Number(value) >= 0 && Number(value) <= 100;
      },
    ));
  });
});
