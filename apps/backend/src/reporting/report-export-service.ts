import {
  reportExportIsAuthorized,
  reportExportIsDownloadable,
  REPORT_EXPORT_SCHEMA_VERSIONS,
  type ReportExportKind,
  type ReportExportState,
} from "@marketplace/core";

import type { Database } from "../database/database.js";
import { reportingDisplayTimeZone, resolveReportRange } from "./report-range.js";

export type ReportExportActingRole = "ORGANIZATION_MANAGER" | "PLATFORM_ADMINISTRATOR";

export type ReportExportRequester = {
  id: string;
  actingRole: ReportExportActingRole;
  organizationId: string | null;
  locale: "en" | "es";
};

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

/**
 * A `date` column arrives as a Date at local midnight, so its calendar date is read
 * from the local parts. Deriving it from the UTC instant would move the boundary a
 * day for any reader west of UTC.
 */
function localDateString(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return [
    String(value.getFullYear()).padStart(4, "0"),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

type ReportExportRow = {
  id: string;
  requested_by_user_id: string;
  acting_role: ReportExportActingRole;
  organization_id: string | null;
  kind: ReportExportKind;
  schema_version: string;
  period_start: string | Date;
  period_end_exclusive: string | Date;
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
  return {
    id: reportExport.id,
    kind: reportExport.kind,
    schemaVersion: reportExport.schema_version,
    actingRole: reportExport.acting_role,
    state: reportExport.state,
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
    downloadable: reportExportIsDownloadable(
      { state: reportExport.state, expiresAt: reportExport.expires_at },
      now,
    ),
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
  requester: ReportExportRequester;
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
 * The Report Export authority one User holds now, read from their current Role
 * Assignments rather than from anything the request carried. Generation and download
 * both recheck through this function, so a removed Role Assignment or a moved
 * Organization Manager stops producing and stops downloading (ADR 0056).
 *
 * Marketplace-wide authority is decided first: an administrator who also manages an
 * Organization exports as an administrator, and never silently narrows to one
 * Organization's scope.
 */
export async function reportExportAuthorizationFor(
  db: Database,
  userId: string,
): Promise<ReportExportRequester | null> {
  const user = await db.selectFrom("users")
    .select(["id", "interface_locale"])
    .where("id", "=", userId)
    .executeTakeFirst();
  if (!user) return null;
  const locale = user.interface_locale ?? "en";

  const administrator = await db.selectFrom("role_assignments")
    .select("role")
    .where("user_id", "=", userId)
    .where("role", "=", "PLATFORM_ADMINISTRATOR")
    .executeTakeFirst();
  if (administrator) {
    return { id: userId, actingRole: "PLATFORM_ADMINISTRATOR", organizationId: null, locale };
  }

  const membership = await db.selectFrom("organization_managers")
    .innerJoin("role_assignments", (join) => join
      .onRef("role_assignments.user_id", "=", "organization_managers.user_id")
      .on("role_assignments.role", "=", "ORGANIZATION_MANAGER"))
    .select("organization_managers.organization_id")
    .where("organization_managers.user_id", "=", userId)
    .executeTakeFirst();
  if (!membership) return null;
  return {
    id: userId,
    actingRole: "ORGANIZATION_MANAGER",
    organizationId: membership.organization_id,
    locale,
  };
}

/**
 * Confirms the authority a stored Report Export was requested under is still held,
 * unchanged. A requester who has since become an administrator, or moved to another
 * Organization, does not keep an extract built under the old scope.
 */
export async function reportExportAuthorizationStillHolds(
  db: Database,
  reportExport: { requested_by_user_id: string; acting_role: ReportExportActingRole; organization_id: string | null; kind: ReportExportKind },
) {
  const current = await reportExportAuthorizationFor(db, reportExport.requested_by_user_id);
  return current !== null
    && current.actingRole === reportExport.acting_role
    && current.organizationId === reportExport.organization_id
    && reportExportIsAuthorized(current.actingRole, reportExport.kind);
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
  requester: ReportExportRequester,
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

  if (!reportExportIsAuthorized(requester.actingRole, input.kind)) {
    return denied(
      "CORRECTION_HISTORY_NOT_AUTHORIZED",
      "The correction-history extract requires its own authorization.",
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

  const created = await db.insertInto("report_exports").values({
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

/** One requester's own Report Exports, newest first. Nobody sees another's. */
export async function reportExportsForRequester(db: Database, requester: ReportExportRequester, now: Date) {
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
  requester: ReportExportRequester,
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
