import {
  auditActorReference,
  auditLogExportRowLimitRefusal,
  auditLogIsAuthorized,
  auditLogScopeFor,
  auditPartitionIsExpired,
  AUDIT_ENTRY_RETENTION_DAYS,
  AUDIT_LOG_EXPORT_COLUMNS,
  AUDIT_LOG_EXPORT_MAXIMUM_ROW_COUNT,
  USER_ROLES,
} from "@marketplace/core";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

const RETENTION_MILLISECONDS = AUDIT_ENTRY_RETENTION_DAYS * 24 * 60 * 60_000;

function monthStart(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1));
}

describe("Audit Log scope policy", () => {
  it("gives marketplace-wide authority the whole Audit Log and an Organization Manager its own Organization", () => {
    expect(auditLogScopeFor("PLATFORM_ADMINISTRATOR")).toBe("MARKETPLACE_WIDE");
    expect(auditLogScopeFor("ORGANIZATION_MANAGER")).toBe("ASSIGNED_ORGANIZATION");
  });

  it("leaves the Audit Log closed to the roles whose own activity it records", () => {
    expect(auditLogScopeFor("STUDENT")).toBeNull();
    expect(auditLogScopeFor("TEACHER")).toBeNull();
    expect(auditLogIsAuthorized("STUDENT")).toBe(false);
    expect(auditLogIsAuthorized("TEACHER")).toBe(false);
  });

  it("never resolves a scope for a role that may not read the Audit Log at all", () => {
    fc.assert(fc.property(fc.constantFrom(...USER_ROLES), (role) =>
      auditLogScopeFor(role) === null || auditLogIsAuthorized(role)));
  });
});

describe("Audit Entry actor identity", () => {
  it("names an acting User by opaque identifier and a background action by system identity", () => {
    expect(auditActorReference({ actorUserId: "9f0d4d1e-0f1a-4a5f-9a2e-6d6f6f0f5a11", systemIdentity: null }))
      .toBe("9f0d4d1e-0f1a-4a5f-9a2e-6d6f6f0f5a11");
    expect(auditActorReference({ actorUserId: null, systemIdentity: "AUDIT_RETENTION_WORKER" }))
      .toBe("system:AUDIT_RETENTION_WORKER");
  });
});

describe("Audit Log export bounds", () => {
  it("refuses an export past the accepted row count rather than shortening it", () => {
    expect(auditLogExportRowLimitRefusal(AUDIT_LOG_EXPORT_MAXIMUM_ROW_COUNT)).toBeNull();
    expect(auditLogExportRowLimitRefusal(AUDIT_LOG_EXPORT_MAXIMUM_ROW_COUNT + 1)).toBe("AUDIT_LOG_ROW_LIMIT_EXCEEDED");
  });

  it("keeps the exported schema free of names, free text, and sensitive content", () => {
    expect([...AUDIT_LOG_EXPORT_COLUMNS]).toEqual([
      "schema_version",
      "exported_at",
      "viewer_time_zone",
      "audit_entry_id",
      "occurred_at",
      "actor_reference",
      "acting_role",
      "operation",
      "target_type",
      "target_reference",
      "outcome",
      "reason_code",
      "correlation_id",
    ]);
  });
});

describe("Audit Entry retention", () => {
  it("expires a complete month only once the whole month has left the retention window", () => {
    const now = new Date("2026-08-26T12:00:00.000Z");
    // 90 days back from 26 August 2026 is 28 May 2026, so May is still retained
    // whole and April is the newest month that may be dropped.
    expect(auditPartitionIsExpired(monthStart(2026, 5), now)).toBe(false);
    expect(auditPartitionIsExpired(monthStart(2026, 4), now)).toBe(true);
    expect(auditPartitionIsExpired(monthStart(2026, 8), now)).toBe(false);
  });

  it("never expires a month that could still hold an Audit Entry inside the retention window", () => {
    fc.assert(fc.property(
      fc.date({ min: new Date("2024-01-01T00:00:00.000Z"), max: new Date("2032-01-01T00:00:00.000Z"), noInvalidDate: true }),
      fc.integer({ min: 0, max: 120 }),
      (now, monthsBack) => {
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1));
        if (!auditPartitionIsExpired(start, now)) return true;
        // The partition's last possible instant is strictly before the retained window.
        const endExclusive = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
        return endExclusive.getTime() <= now.getTime() - RETENTION_MILLISECONDS;
      },
    ));
  });
});
