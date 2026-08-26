import {
  correctionHistoryExportIsOrganizationScoped,
  reportExportIsAuthorized,
  reportExportIsDownloadable,
  REPORT_EXPORT_SCHEMA_VERSIONS,
  type ReportExportKind,
  type ReportExportState,
} from "@marketplace/core";

import {
  reportingAuthorityFor,
  type ReportingActingRole,
  type ReportingAuthority,
} from "../authorization/reporting-authority.js";
import type { Database } from "../database/database.js";
import {
  localDateString,
  reportingDisplayTimeZone,
  resolveReportRange,
  type ResolvedReportRange,
} from "./report-range.js";

export type ReportExportErrorCode =
  | "INVALID_REPORT_RANGE"
  | "DISPLAY_TIME_ZONE_REQUIRED"
  | "CORRECTION_HISTORY_NOT_AUTHORIZED"
  | "EXPORT_ALREADY_IN_PROGRESS"
  | "REPORT_EXPORT_NOT_FOUND"
  | "REPORT_EXPORT_NOT_DOWNLOADABLE"
  | "IDEMPOTENCY_KEY_REUSED";

const LISTED_EXPORT_LIMIT = 20;

export function reportExportError(code: ReportExportErrorCode, message: string) {
  return { __typename: "ReportExportError" as const, code, message };
}

type ReportExportRow = {
  id: string;
  requested_by_user_id: string;
  acting_role: ReportingActingRole;
  organization_id: string | null;
  kind: ReportExportKind;
  schema_version: string;
  period_start: Date;
  period_end_exclusive: Date;
  time_zone: string;
  state: ReportExportState;
  requested_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  expires_at: Date | null;
  data_as_of: Date | null;
  row_count: number | null;
  content_digest: string | null;
  failure_reason_code: string | null;
};

export function projectReportExport(reportExport: ReportExportRow, now: Date) {
  const downloadable = reportExportIsDownloadable(
    { state: reportExport.state, expiresAt: reportExport.expires_at },
    now,
  );
  return {
    id: reportExport.id,
    kind: reportExport.kind,
    schemaVersion: reportExport.schema_version,
    actingRole: reportExport.acting_role,
    // The sweep that drops the content runs on its own schedule, so a completed
    // export that has outlived its 24 hours reads as Expired straight away rather
    // than claiming to be available until the worker catches up.
    state: reportExport.state === "COMPLETED" && !downloadable ? "EXPIRED" as const : reportExport.state,
    periodStartLocalDate: localDateString(reportExport.period_start),
    periodEndExclusiveLocalDate: localDateString(reportExport.period_end_exclusive),
    timeZone: reportExport.time_zone,
    requestedAt: reportExport.requested_at.toISOString(),
    startedAt: reportExport.started_at?.toISOString() ?? null,
    completedAt: reportExport.completed_at?.toISOString() ?? null,
    expiresAt: reportExport.expires_at?.toISOString() ?? null,
    dataAsOf: reportExport.data_as_of?.toISOString() ?? null,
    rowCount: reportExport.row_count,
    contentDigest: reportExport.content_digest,
    failureReasonCode: reportExport.failure_reason_code,
    downloadable,
  };
}

const PROJECTED_COLUMNS = [
  "id",
  "requested_by_user_id",
  "acting_role",
  "organization_id",
  "kind",
  "schema_version",
  "period_start",
  "period_end_exclusive",
  "time_zone",
  "state",
  "requested_at",
  "started_at",
  "completed_at",
  "expires_at",
  "data_as_of",
  "row_count",
  "content_digest",
  "failure_reason_code",
] as const;

async function recordReportExportAudit(db: Database, values: {
  requester: ReportingAuthority;
  operation: string;
  targetId: string;
  outcome: "SUCCEEDED" | "DENIED" | "FAILED";
  reasonCode: string;
  correlationId: string;
}) {
  await db.insertInto("audit_entries").values({
    actor_user_id: values.requester.id,
    acting_role: values.requester.actingRole,
    operation: values.operation,
    target_type: "ReportExport",
    target_id: values.targetId,
    outcome: values.outcome,
    reason_code: values.reasonCode,
    correlation_id: values.correlationId,
  }).execute();
}

/**
 * Confirms the authority a stored Report Export was requested under is still held,
 * unchanged. A requester who has since become an administrator, or moved to another
 * Organization, does not keep an extract built under the old scope.
 */
export async function reportExportAuthorizationStillHolds(
  db: Database,
  reportExport: { requested_by_user_id: string; acting_role: ReportingActingRole; organization_id: string | null; kind: ReportExportKind },
) {
  const current = await reportingAuthorityFor(db, reportExport.requested_by_user_id);
  return current !== null
    && current.actingRole === reportExport.acting_role
    && current.organizationId === reportExport.organization_id
    && reportExportIsAuthorized(current.actingRole);
}

export type RequestReportExportInput = {
  kind: ReportExportKind;
  fromLocalDate: string;
  toLocalDate: string;
};

/**
 * Requests one bounded, asynchronous Report Export. Nothing is generated here: the
 * request records the authority, the kind, and the bounds it was accepted under, and
 * a worker captures the extract from one consistent snapshot afterwards.
 */
export async function requestReportExport(
  db: Database,
  requester: ReportingAuthority,
  input: RequestReportExportInput,
  correlationId: string,
  now: Date,
) {
  const denied = async (code: ReportExportErrorCode, message: string) => {
    await recordReportExportAudit(db, {
      requester,
      operation: "report-export.requested",
      targetId: requester.id,
      outcome: "DENIED",
      reasonCode: code,
      correlationId,
    });
    return reportExportError(code, message);
  };

  // An Organization Manager's correction history exists only as its Organization's.
  // Without one there is no scope to narrow the prior values to, so the extract is
  // refused rather than widened into everyone else's revisions.
  if (input.kind === "CORRECTION_HISTORY"
    && correctionHistoryExportIsOrganizationScoped(requester.actingRole)
    && requester.organizationId === null) {
    return denied(
      "CORRECTION_HISTORY_NOT_AUTHORIZED",
      "The correction-history extract requires an Organization to scope it to.",
    );
  }

  let timeZone: string;
  try {
    timeZone = await reportingDisplayTimeZone(db, requester.id);
  } catch {
    return denied(
      "DISPLAY_TIME_ZONE_REQUIRED",
      "A saved Display Time Zone is required to request a Report Export.",
    );
  }

  // An export states its own range: a default window would silently decide which
  // months an extract covers, and the file outlives the screen that produced it.
  if (!input.fromLocalDate || !input.toLocalDate) {
    return denied("INVALID_REPORT_RANGE", "Choose the local date range this export covers.");
  }
  let range;
  try {
    range = resolveReportRange({ fromLocalDate: input.fromLocalDate, toLocalDate: input.toLocalDate }, timeZone, now);
  } catch (error) {
    return denied("INVALID_REPORT_RANGE", (error as Error).message);
  }

  const inFlight = await db.selectFrom("report_exports")
    .select("id")
    .where("requested_by_user_id", "=", requester.id)
    .where("state", "in", ["QUEUED", "RUNNING"])
    .executeTakeFirst();
  if (inFlight) {
    return denied(
      "EXPORT_ALREADY_IN_PROGRESS",
      "One Report Export runs at a time. Wait for the current one to finish.",
    );
  }

  const created = await insertQueuedExport(db, requester, input, range, correlationId, now);
  if (created === null) {
    return denied(
      "EXPORT_ALREADY_IN_PROGRESS",
      "One Report Export runs at a time. Wait for the current one to finish.",
    );
  }

  await recordReportExportAudit(db, {
    requester,
    operation: "report-export.requested",
    targetId: created.id,
    outcome: "SUCCEEDED",
    reasonCode: "REPORT_EXPORT_QUEUED",
    correlationId,
  });

  return { __typename: "RequestReportExportSuccess" as const, reportExport: projectReportExport(created, now) };
}

// PostgreSQL raises this when the one-in-flight index catches a request the read a
// moment earlier could not see. It is the same refusal, decided by the index.
const UNIQUE_VIOLATION = "23505";

async function insertQueuedExport(
  db: Database,
  requester: ReportingAuthority,
  input: RequestReportExportInput,
  range: ResolvedReportRange,
  correlationId: string,
  now: Date,
) {
  try {
    return await db.insertInto("report_exports").values({
      requested_by_user_id: requester.id,
      acting_role: requester.actingRole,
      organization_id: requester.organizationId,
      kind: input.kind,
      schema_version: REPORT_EXPORT_SCHEMA_VERSIONS[input.kind],
      period_start: range.fromLocalDate,
      period_end_exclusive: range.endExclusiveLocalDate,
      time_zone: range.timeZone,
      state: "QUEUED",
      requested_at: now,
      correlation_id: correlationId,
    }).returning([...PROJECTED_COLUMNS]).executeTakeFirstOrThrow();
  } catch (error) {
    if ((error as { code?: string }).code === UNIQUE_VIOLATION) return null;
    throw error;
  }
}

/** One requester's own Report Exports, newest first. Nobody sees another's. */
export async function reportExportsForRequester(db: Database, requester: ReportingAuthority, now: Date) {
  const rows = await db.selectFrom("report_exports")
    .select([...PROJECTED_COLUMNS])
    .where("requested_by_user_id", "=", requester.id)
    .orderBy("requested_at", "desc")
    .orderBy("id")
    .limit(LISTED_EXPORT_LIMIT)
    .execute();
  return rows.map((row) => projectReportExport(row, now));
}

export class ReportExportUnavailable extends Error {
  readonly code: ReportExportErrorCode;

  constructor(code: ReportExportErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Releases one completed extract to the requester who asked for it.
 *
 * Authorization is rechecked here, not only when the export was requested: the
 * artifact is the sensitive part, and the authority that produced it may since have
 * been removed. An expired artifact is refused for the same reason it was deleted —
 * a Report Export is short-lived by design and never a later route to old data.
 */
export async function reportExportArtifact(
  db: Database,
  requester: ReportingAuthority,
  reportExportId: string,
  correlationId: string,
  now: Date,
) {
  const refuse = async (code: ReportExportErrorCode, message: string) => {
    await recordReportExportAudit(db, {
      requester,
      operation: "report-export.downloaded",
      targetId: reportExportId,
      outcome: "DENIED",
      reasonCode: code,
      correlationId,
    });
    throw new ReportExportUnavailable(code, message);
  };

  const reportExport = await db.selectFrom("report_exports")
    .select([...PROJECTED_COLUMNS, "content"])
    .where("id", "=", reportExportId)
    .executeTakeFirst();
  // Another requester's export is not found rather than forbidden: the refusal must
  // not confirm that the identifier names a real export.
  if (!reportExport || reportExport.requested_by_user_id !== requester.id) {
    return refuse("REPORT_EXPORT_NOT_FOUND", "That Report Export was not found.");
  }
  if (!await reportExportAuthorizationStillHolds(db, reportExport)) {
    return refuse("REPORT_EXPORT_NOT_FOUND", "That Report Export was not found.");
  }
  if (!reportExportIsDownloadable({ state: reportExport.state, expiresAt: reportExport.expires_at }, now)
    || reportExport.content === null) {
    return refuse(
      "REPORT_EXPORT_NOT_DOWNLOADABLE",
      "That Report Export is no longer available. Request a fresh export.",
    );
  }

  // A download is the extract leaving the platform rather than an ordinary read, so
  // both outcomes leave evidence that the recheck ran.
  await recordReportExportAudit(db, {
    requester,
    operation: "report-export.downloaded",
    targetId: reportExport.id,
    outcome: "SUCCEEDED",
    reasonCode: "REPORT_EXPORT_DOWNLOADED",
    correlationId,
  });

  return {
    reportExport: projectReportExport(reportExport, now),
    fileName: `${reportExport.schema_version}_${localDateString(reportExport.period_start)}_${localDateString(reportExport.period_end_exclusive)}.csv`,
    contentType: "text/csv; charset=utf-8",
    csv: reportExport.content,
  };
}
