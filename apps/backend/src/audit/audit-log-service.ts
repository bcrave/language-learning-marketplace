import {
  auditActorReference,
  auditLogExportRowLimitRefusal,
  auditLogScopeFor,
  csvDocument,
  AUDIT_LOG_EXPORT_COLUMNS,
  AUDIT_LOG_EXPORT_MAXIMUM_ROW_COUNT,
  AUDIT_LOG_EXPORT_SCHEMA_VERSION,
  AUDIT_LOG_PAGE_SIZE,
  type AuditLogScope,
  type UserRole,
} from "@marketplace/core";
import { z } from "zod";

import {
  reportingAuthorityFor,
  type ReportingAuthority,
} from "../authorization/reporting-authority.js";
import type { Database } from "../database/database.js";
import type { AuditEntriesTable } from "../database/types.js";
import {
  exportInstant,
  InvalidReportRange,
  MissingDisplayTimeZone,
  reportingDisplayTimeZone,
  resolveReportRange,
  type ResolvedReportRange,
} from "../reporting/report-range.js";

export type AuditLogViewer = ReportingAuthority & { scope: AuditLogScope };

/**
 * The Audit Log a reporting authority may read, or nothing. The scope is the whole
 * decision this adds: which entries the viewer's own relationship allows them to
 * see (ADR 0059).
 */
export async function auditLogViewerFor(db: Database, userId: string): Promise<AuditLogViewer | null> {
  const authority = await reportingAuthorityFor(db, userId);
  if (!authority) return null;
  const scope = auditLogScopeFor(authority.actingRole);
  if (!scope) return null;
  return { ...authority, scope };
}

export type AuditLogErrorCode =
  | "INVALID_AUDIT_LOG_FILTER"
  | "INVALID_AUDIT_LOG_RANGE"
  | "DISPLAY_TIME_ZONE_REQUIRED"
  | "INVALID_AUDIT_LOG_CURSOR"
  | "AUDIT_LOG_ROW_LIMIT_EXCEEDED";

export function auditLogError(code: AuditLogErrorCode, message: string) {
  return { __typename: "AuditLogError" as const, code, message };
}

export type AuditLogFilterInput = {
  fromLocalDate?: string | null | undefined;
  toLocalDate?: string | null | undefined;
  outcome?: "SUCCEEDED" | "DENIED" | "FAILED" | null | undefined;
  actingRole?: UserRole | null | undefined;
  operation?: string | null | undefined;
  actorUserId?: string | null | undefined;
  correlationId?: string | null | undefined;
  after?: string | null | undefined;
};

const cursorSchema = z.object({ occurredAt: z.iso.datetime(), id: z.uuid() }).strict();

function decodeCursor(cursor: string) {
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}

function encodeCursor(cursor: z.infer<typeof cursorSchema>) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

type AuditEntryRow = {
  id: string;
  occurred_at: Date;
  actor_user_id: string | null;
  system_identity: AuditEntriesTable["system_identity"];
  acting_role: UserRole | null;
  operation: string;
  target_type: string;
  target_id: string;
  outcome: "SUCCEEDED" | "DENIED" | "FAILED";
  reason_code: string;
  correlation_id: string;
};

const PROJECTED_COLUMNS = [
  "id",
  "occurred_at",
  "actor_user_id",
  "system_identity",
  "acting_role",
  "operation",
  "target_type",
  "target_id",
  "outcome",
  "reason_code",
  "correlation_id",
] as const;

/**
 * An Audit Entry as an authorized viewer sees it: opaque actor and target
 * identities, the acting role, the outcome, the reason code, the time, and the
 * correlation identifier. There is nothing else on the row to project — no secret,
 * no free text, and no operational diagnostic ever reaches an Audit Entry (ADR
 * 0004), so the read surface cannot leak one.
 */
function projectAuditEntry(entry: AuditEntryRow) {
  return {
    id: entry.id,
    occurredAt: entry.occurred_at.toISOString(),
    actorUserId: entry.actor_user_id,
    systemIdentity: entry.system_identity,
    actingRole: entry.acting_role,
    operation: entry.operation,
    targetType: entry.target_type,
    targetId: entry.target_id,
    outcome: entry.outcome,
    reasonCode: entry.reason_code,
    correlationId: entry.correlation_id,
  };
}

type AppliedFilter = {
  range: ResolvedReportRange;
  outcome: "SUCCEEDED" | "DENIED" | "FAILED" | null;
  actingRole: UserRole | null;
  operation: string | null;
  actorUserId: string | null;
  correlationId: string | null;
};

function projectAppliedFilter(filter: AppliedFilter) {
  return {
    fromLocalDate: filter.range.fromLocalDate,
    toLocalDate: filter.range.toLocalDate,
    timeZone: filter.range.timeZone,
    outcome: filter.outcome,
    actingRole: filter.actingRole,
    operation: filter.operation,
    actorUserId: filter.actorUserId,
    correlationId: filter.correlationId,
  };
}

const trimmedFilterValue = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
};

async function resolveFilter(
  db: Database,
  viewer: AuditLogViewer,
  input: AuditLogFilterInput,
  now: Date,
): Promise<AppliedFilter | ReturnType<typeof auditLogError>> {
  // Both refusals are named by their own error class, so a dropped connection or an
  // unexpected failure keeps travelling rather than reaching the viewer disguised as
  // a Display Time Zone they never saved or a range they can fix.
  let timeZone: string;
  try {
    timeZone = await reportingDisplayTimeZone(db, viewer.id);
  } catch (error) {
    if (!(error instanceof MissingDisplayTimeZone)) throw error;
    return auditLogError(
      "DISPLAY_TIME_ZONE_REQUIRED",
      "A saved Display Time Zone is required to read the Audit Log.",
    );
  }
  let range: ResolvedReportRange;
  try {
    range = resolveReportRange({ fromLocalDate: input.fromLocalDate, toLocalDate: input.toLocalDate }, timeZone, now);
  } catch (error) {
    if (!(error instanceof InvalidReportRange)) throw error;
    return auditLogError("INVALID_AUDIT_LOG_RANGE", error.message);
  }
  return {
    range,
    outcome: input.outcome ?? null,
    actingRole: input.actingRole ?? null,
    operation: trimmedFilterValue(input.operation),
    actorUserId: trimmedFilterValue(input.actorUserId),
    correlationId: trimmedFilterValue(input.correlationId),
  };
}

/**
 * The scope of ADR 0059 expressed once, as a query the caller cannot forget to
 * apply. Marketplace-wide authority adds no narrowing; an Organization Manager sees
 * only entries acted by a manager of its own Organization, which excludes every
 * background action and every Student's own activity by construction.
 */
function scopedAuditEntries(db: Database, viewer: AuditLogViewer, filter: AppliedFilter) {
  let query = db.selectFrom("audit_entries")
    .select([...PROJECTED_COLUMNS])
    .where("occurred_at", ">=", filter.range.startInstant)
    .where("occurred_at", "<", filter.range.endInstantExclusive);

  if (viewer.scope === "ASSIGNED_ORGANIZATION") {
    // Both halves are load-bearing. The membership narrows to this Organization's
    // managers; the acting role narrows to what they did as managers. Without the
    // second, a User who manages this Organization and also studies here would have
    // their own Bookings and denied reads exposed to their Organization — the
    // Sponsorship widening ADR 0059 exists to make impossible.
    query = query
      .where("acting_role", "=", "ORGANIZATION_MANAGER")
      .where("actor_user_id", "in", (eb) => eb.selectFrom("organization_managers")
        .select("organization_managers.user_id")
        .where("organization_managers.organization_id", "=", viewer.organizationId));
  }

  if (filter.outcome) query = query.where("outcome", "=", filter.outcome);
  if (filter.actingRole) query = query.where("acting_role", "=", filter.actingRole);
  if (filter.operation) query = query.where("operation", "=", filter.operation);
  if (filter.actorUserId) query = query.where("actor_user_id", "=", filter.actorUserId);
  if (filter.correlationId) query = query.where("correlation_id", "=", filter.correlationId);
  return query;
}

/**
 * An export refused before the service ever runs — an unreadable filter caught at
 * the API boundary — still leaves the same evidence as one refused inside it. The
 * refusal is audited wherever it is decided.
 */
export async function recordAuditLogExportRefusal(
  db: Database,
  viewer: AuditLogViewer,
  reasonCode: AuditLogErrorCode,
  correlationId: string,
) {
  await recordAuditLogAudit(db, {
    viewer,
    operation: "audit-log.exported",
    outcome: "DENIED",
    reasonCode,
    correlationId,
  });
}

async function recordAuditLogAudit(db: Database, values: {
  viewer: AuditLogViewer;
  operation: string;
  outcome: "SUCCEEDED" | "DENIED" | "FAILED";
  reasonCode: string;
  correlationId: string;
}) {
  await db.insertInto("audit_entries").values({
    actor_user_id: values.viewer.id,
    acting_role: values.viewer.actingRole,
    operation: values.operation,
    target_type: "AuditLog",
    target_id: values.viewer.id,
    outcome: values.outcome,
    reason_code: values.reasonCode,
    correlation_id: values.correlationId,
  }).execute();
}

/**
 * One bounded page of the Audit Log, newest first.
 *
 * A successful read records no Audit Entry of its own: ADR 0004 audits mutations,
 * denied sensitive reads, and background actions, and a log that recorded every
 * inspection of itself would bury the history an investigation came for. The refusal
 * an unauthorized role receives is audited at the API boundary, where it happens.
 */
export async function readAuditLog(
  db: Database,
  viewer: AuditLogViewer,
  input: AuditLogFilterInput,
  now: Date,
) {
  const filter = await resolveFilter(db, viewer, input, now);
  if ("__typename" in filter) return filter;

  let query = scopedAuditEntries(db, viewer, filter);
  if (input.after) {
    const cursor = decodeCursor(input.after);
    if (!cursor) {
      return auditLogError("INVALID_AUDIT_LOG_CURSOR", "Choose a valid Audit Log cursor.");
    }
    const cursorInstant = new Date(cursor.occurredAt);
    query = query.where((expression) => expression.or([
      expression("occurred_at", "<", cursorInstant),
      expression.and([
        expression("occurred_at", "=", cursorInstant),
        expression("id", "<", cursor.id),
      ]),
    ]));
  }

  // One row past the page proves whether another page exists without counting the
  // whole retained window on every read.
  const rows = await query
    .orderBy("occurred_at", "desc")
    .orderBy("id", "desc")
    .limit(AUDIT_LOG_PAGE_SIZE + 1)
    .execute();
  const page = rows.slice(0, AUDIT_LOG_PAGE_SIZE);
  const last = page.at(-1);

  return {
    __typename: "AuditLog" as const,
    scope: viewer.scope,
    appliedFilter: projectAppliedFilter(filter),
    entries: page.map(projectAuditEntry),
    pageInfo: {
      hasNextPage: rows.length > AUDIT_LOG_PAGE_SIZE,
      endCursor: last ? encodeCursor({ occurredAt: last.occurred_at.toISOString(), id: last.id }) : null,
    },
  };
}

/**
 * The same scoped, filtered entries as a file. An export is the Audit Log leaving
 * the platform rather than an ordinary read, so both outcomes leave evidence — and
 * the file itself becomes an Audit Entry's target the way a Report Export does.
 */
export async function exportAuditLog(
  db: Database,
  viewer: AuditLogViewer,
  input: AuditLogFilterInput,
  correlationId: string,
  now: Date,
) {
  const operation = "audit-log.exported";
  const refuse = async (refusal: ReturnType<typeof auditLogError>) => {
    await recordAuditLogAudit(db, { viewer, operation, outcome: "DENIED", reasonCode: refusal.code, correlationId });
    return refusal;
  };

  const filter = await resolveFilter(db, viewer, input, now);
  if ("__typename" in filter) return refuse(filter);

  // One row past the accepted count is enough to decide the refusal; the file is
  // never built at all when the range is too wide.
  const rows = await scopedAuditEntries(db, viewer, filter)
    .orderBy("occurred_at", "asc")
    .orderBy("id", "asc")
    .limit(AUDIT_LOG_EXPORT_MAXIMUM_ROW_COUNT + 1)
    .execute();
  if (auditLogExportRowLimitRefusal(rows.length)) {
    return refuse(auditLogError(
      "AUDIT_LOG_ROW_LIMIT_EXCEEDED",
      `An Audit Log export carries at most ${AUDIT_LOG_EXPORT_MAXIMUM_ROW_COUNT} Audit Entries. Narrow the range or the filters.`,
    ));
  }

  const timeZone = filter.range.timeZone;
  const csv = csvDocument(AUDIT_LOG_EXPORT_COLUMNS, rows.map((entry) => [
    AUDIT_LOG_EXPORT_SCHEMA_VERSION,
    exportInstant(now, timeZone),
    timeZone,
    entry.id,
    exportInstant(entry.occurred_at, timeZone),
    auditActorReference({ actorUserId: entry.actor_user_id, systemIdentity: entry.system_identity }),
    entry.acting_role,
    entry.operation,
    entry.target_type,
    entry.target_id,
    entry.outcome,
    entry.reason_code,
    entry.correlation_id,
  ]));

  await recordAuditLogAudit(db, { viewer, operation, outcome: "SUCCEEDED", reasonCode: "AUDIT_LOG_EXPORTED", correlationId });

  return {
    __typename: "AuditLogExport" as const,
    scope: viewer.scope,
    appliedFilter: projectAppliedFilter(filter),
    schemaVersion: AUDIT_LOG_EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    rowCount: rows.length,
    fileName: `${AUDIT_LOG_EXPORT_SCHEMA_VERSION}_${filter.range.fromLocalDate}_${filter.range.endExclusiveLocalDate}.csv`,
    contentType: "text/csv; charset=utf-8",
    csv,
  };
}
