import { useApolloClient, useQuery } from "@apollo/client/react";
import { useState } from "react";
import { useIntl } from "react-intl";

import {
  AuditLogDocument,
  AuditLogExportDocument,
  type AuditLogErrorCode,
  type AuditLogQuery,
  type AuditLogScope,
  type AuditOutcome,
  type UserRole,
} from "./generated/graphql.js";

type IntlShape = ReturnType<typeof useIntl>;
type AuditLogResult = AuditLogQuery["auditLog"];
type AuditLogPage = Extract<AuditLogResult, { __typename: "AuditLog" }>;
type AuditEntry = AuditLogPage["entries"][number];

type FilterForm = {
  fromLocalDate: string;
  toLocalDate: string;
  outcome: AuditOutcome | "";
  actingRole: UserRole | "";
  operation: string;
  actorUserId: string;
  correlationId: string;
};

const emptyFilter: FilterForm = {
  fromLocalDate: "",
  toLocalDate: "",
  outcome: "",
  actingRole: "",
  operation: "",
  actorUserId: "",
  correlationId: "",
};

// The catalog test requires every message key to appear literally in application
// source, and a reader benefits from the same thing: every label one of these unions
// can produce is visible in one place.
const scopeMessageIds: Record<AuditLogScope, string> = {
  MARKETPLACE_WIDE: "auditLog.scope.MARKETPLACE_WIDE",
  ASSIGNED_ORGANIZATION: "auditLog.scope.ASSIGNED_ORGANIZATION",
};

const outcomeMessageIds: Record<AuditOutcome, string> = {
  SUCCEEDED: "auditLog.outcome.SUCCEEDED",
  DENIED: "auditLog.outcome.DENIED",
  FAILED: "auditLog.outcome.FAILED",
};

const actingRoleMessageIds: Record<UserRole, string> = {
  STUDENT: "role.student",
  TEACHER: "role.teacher",
  ORGANIZATION_MANAGER: "role.organizationManager",
  PLATFORM_ADMINISTRATOR: "role.platformAdministrator",
};

const errorMessageIds: Record<AuditLogErrorCode, string> = {
  INVALID_AUDIT_LOG_FILTER: "auditLog.error.INVALID_AUDIT_LOG_FILTER",
  INVALID_AUDIT_LOG_RANGE: "auditLog.error.INVALID_AUDIT_LOG_RANGE",
  DISPLAY_TIME_ZONE_REQUIRED: "auditLog.error.DISPLAY_TIME_ZONE_REQUIRED",
  INVALID_AUDIT_LOG_CURSOR: "auditLog.error.INVALID_AUDIT_LOG_CURSOR",
  AUDIT_LOG_ROW_LIMIT_EXCEEDED: "auditLog.error.AUDIT_LOG_ROW_LIMIT_EXCEEDED",
};

/** Only the filters the viewer actually set travel; the rest stay unstated. */
function filterVariables(filter: FilterForm, after?: string) {
  return {
    fromLocalDate: filter.fromLocalDate || null,
    toLocalDate: filter.toLocalDate || null,
    outcome: filter.outcome || null,
    actingRole: filter.actingRole || null,
    operation: filter.operation.trim() || null,
    actorUserId: filter.actorUserId.trim() || null,
    correlationId: filter.correlationId.trim() || null,
    after: after ?? null,
  };
}

function localDate(intl: IntlShape, isoDate: string) {
  // A bound is already the calendar date the viewer chose, so it is shown as a plain
  // date rather than converted through a zone a second time.
  return intl.formatDate(`${isoDate}T00:00:00Z`, { dateStyle: "medium", timeZone: "UTC" });
}

function AuditEntryItem({ entry, intl, timeZone }: { entry: AuditEntry; intl: IntlShape; timeZone: string }) {
  return (
    <li>
      <h4>{intl.formatMessage({ id: "auditLog.entry.summary" }, {
        operation: entry.operation,
        outcome: intl.formatMessage({ id: outcomeMessageIds[entry.outcome] }),
      })}</h4>
      <p>{intl.formatMessage({ id: "auditLog.entry.occurredAt" }, {
        occurredAt: intl.formatDate(entry.occurredAt, { dateStyle: "long", timeStyle: "medium", timeZone }),
      })}</p>
      {/* An actor is an opaque identity: an acting User's identifier, or the system
          identity of a background action. There is no name to show and none is asked for. */}
      {entry.actorUserId !== null && entry.actingRole !== null && (
        <p>{intl.formatMessage({ id: "auditLog.entry.actor.user" }, {
          actorUserId: entry.actorUserId,
          actingRole: intl.formatMessage({ id: actingRoleMessageIds[entry.actingRole] }),
        })}</p>
      )}
      {entry.actorUserId !== null && entry.actingRole === null && (
        <p>{intl.formatMessage({ id: "auditLog.entry.actor.unattributedUser" }, { actorUserId: entry.actorUserId })}</p>
      )}
      {entry.actorUserId === null && (
        <p>{intl.formatMessage({ id: "auditLog.entry.actor.system" }, { systemIdentity: entry.systemIdentity ?? "" })}</p>
      )}
      <p>{intl.formatMessage({ id: "auditLog.entry.target" }, {
        targetType: entry.targetType,
        targetId: entry.targetId,
      })}</p>
      <p>{intl.formatMessage({ id: "auditLog.entry.reason" }, { reasonCode: entry.reasonCode })}</p>
      <p>{intl.formatMessage({ id: "auditLog.entry.correlation" }, { correlationId: entry.correlationId })}</p>
    </li>
  );
}

/**
 * The Audit Log journey: state a bounded filter, read the immutable entries the
 * viewer's own relationship scope allows, page back through them, and take the same
 * scoped entries away as a file. The panel renders the record and never interprets
 * it — an Audit Entry carries codes and opaque identities, so there is nothing here
 * to resolve into a name.
 */
export function AuditLogPanel() {
  const intl = useIntl();
  const client = useApolloClient();
  const [filter, setFilter] = useState<FilterForm>(emptyFilter);
  const [applied, setApplied] = useState<FilterForm>(emptyFilter);
  const [olderEntries, setOlderEntries] = useState<AuditEntry[]>([]);
  const [olderPageInfo, setOlderPageInfo] = useState<AuditLogPage["pageInfo"] | null>(null);
  const [paging, setPaging] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<{ fileName: string; rows: number; href: string } | null>(null);

  const { data, loading, error } = useQuery(AuditLogDocument, {
    variables: { filter: filterVariables(applied) },
  });

  if (loading) return <p role="status">{intl.formatMessage({ id: "auditLog.loading" })}</p>;
  if (error || !data) return <p role="alert">{intl.formatMessage({ id: "auditLog.loadError" })}</p>;

  const result = data.auditLog;
  const page = result.__typename === "AuditLog" ? result : null;
  const refusal = result.__typename === "AuditLogError" ? errorMessageIds[result.code] : null;
  const entries = page ? [...page.entries, ...olderEntries] : [];
  const pageInfo = olderPageInfo ?? page?.pageInfo ?? null;

  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOlderEntries([]);
    setOlderPageInfo(null);
    setFailure(null);
    setArtifact(null);
    setApplied(filter);
  }

  async function showOlder(after: string) {
    setPaging(true);
    setFailure(null);
    try {
      const older = await client.query({
        query: AuditLogDocument,
        variables: { filter: filterVariables(applied, after) },
        fetchPolicy: "no-cache",
      });
      const olderResult = older.data?.auditLog;
      if (olderResult?.__typename !== "AuditLog") {
        setFailure(olderResult ? errorMessageIds[olderResult.code] : "auditLog.loadError");
        return;
      }
      setOlderEntries((current) => [...current, ...olderResult.entries]);
      setOlderPageInfo(olderResult.pageInfo);
    } catch {
      setFailure("auditLog.loadError");
    } finally {
      setPaging(false);
    }
  }

  async function exportEntries() {
    setExporting(true);
    setFailure(null);
    setArtifact(null);
    try {
      const exported = await client.query({
        query: AuditLogExportDocument,
        variables: { filter: filterVariables(applied) },
        // The file is built for one authorization at one instant; a cached copy
        // would outlive the scope that released it.
        fetchPolicy: "no-cache",
      });
      const outcome = exported.data?.auditLogExport;
      if (outcome?.__typename !== "AuditLogExport") {
        setFailure(outcome ? errorMessageIds[outcome.code] : "auditLog.loadError");
        return;
      }
      setArtifact({
        fileName: outcome.fileName,
        rows: outcome.rowCount,
        href: `data:${outcome.contentType},${encodeURIComponent(outcome.csv)}`,
      });
    } catch {
      setFailure("auditLog.loadError");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="workspace-card" aria-labelledby="audit-log-title">
      <h2 id="audit-log-title">{intl.formatMessage({ id: "auditLog.title" })}</h2>
      <p>{intl.formatMessage({ id: "auditLog.help" })}</p>
      <p>{intl.formatMessage({ id: "auditLog.excludes" })}</p>
      <p>{intl.formatMessage({ id: "auditLog.retention" })}</p>
      {page && <p>{intl.formatMessage({ id: scopeMessageIds[page.scope] })}</p>}

      <form onSubmit={apply}>
        <fieldset>
          <legend>{intl.formatMessage({ id: "auditLog.filter.legend" })}</legend>
          <label htmlFor="audit-log-from">{intl.formatMessage({ id: "auditLog.filter.from" })}</label>
          <input
            id="audit-log-from"
            type="date"
            value={filter.fromLocalDate}
            onChange={(event) => setFilter((current) => ({ ...current, fromLocalDate: event.target.value }))}
          />
          <label htmlFor="audit-log-to">{intl.formatMessage({ id: "auditLog.filter.to" })}</label>
          <input
            id="audit-log-to"
            type="date"
            value={filter.toLocalDate}
            onChange={(event) => setFilter((current) => ({ ...current, toLocalDate: event.target.value }))}
          />
          <label htmlFor="audit-log-outcome">{intl.formatMessage({ id: "auditLog.filter.outcome" })}</label>
          <select
            id="audit-log-outcome"
            value={filter.outcome}
            onChange={(event) => setFilter((current) => ({ ...current, outcome: event.target.value as AuditOutcome | "" }))}
          >
            <option value="">{intl.formatMessage({ id: "auditLog.filter.anyOutcome" })}</option>
            <option value="SUCCEEDED">{intl.formatMessage({ id: outcomeMessageIds.SUCCEEDED })}</option>
            <option value="DENIED">{intl.formatMessage({ id: outcomeMessageIds.DENIED })}</option>
            <option value="FAILED">{intl.formatMessage({ id: outcomeMessageIds.FAILED })}</option>
          </select>
          <label htmlFor="audit-log-acting-role">{intl.formatMessage({ id: "auditLog.filter.actingRole" })}</label>
          <select
            id="audit-log-acting-role"
            value={filter.actingRole}
            onChange={(event) => setFilter((current) => ({ ...current, actingRole: event.target.value as UserRole | "" }))}
          >
            <option value="">{intl.formatMessage({ id: "auditLog.filter.anyActingRole" })}</option>
            <option value="STUDENT">{intl.formatMessage({ id: actingRoleMessageIds.STUDENT })}</option>
            <option value="TEACHER">{intl.formatMessage({ id: actingRoleMessageIds.TEACHER })}</option>
            <option value="ORGANIZATION_MANAGER">{intl.formatMessage({ id: actingRoleMessageIds.ORGANIZATION_MANAGER })}</option>
            <option value="PLATFORM_ADMINISTRATOR">{intl.formatMessage({ id: actingRoleMessageIds.PLATFORM_ADMINISTRATOR })}</option>
          </select>
          <label htmlFor="audit-log-operation">{intl.formatMessage({ id: "auditLog.filter.operation" })}</label>
          <input
            id="audit-log-operation"
            type="text"
            value={filter.operation}
            onChange={(event) => setFilter((current) => ({ ...current, operation: event.target.value }))}
          />
          <label htmlFor="audit-log-actor">{intl.formatMessage({ id: "auditLog.filter.actorUserId" })}</label>
          <input
            id="audit-log-actor"
            type="text"
            value={filter.actorUserId}
            onChange={(event) => setFilter((current) => ({ ...current, actorUserId: event.target.value }))}
          />
          <label htmlFor="audit-log-correlation">{intl.formatMessage({ id: "auditLog.filter.correlationId" })}</label>
          <input
            id="audit-log-correlation"
            type="text"
            value={filter.correlationId}
            onChange={(event) => setFilter((current) => ({ ...current, correlationId: event.target.value }))}
          />
          <p>{intl.formatMessage({ id: "auditLog.filter.help" })}</p>
          <button type="submit">{intl.formatMessage({ id: "auditLog.filter.apply" })}</button>
        </fieldset>
      </form>

      {page && (
        <p>{intl.formatMessage({ id: "auditLog.appliedRange" }, {
          from: localDate(intl, page.appliedFilter.fromLocalDate),
          to: localDate(intl, page.appliedFilter.toLocalDate),
          timeZone: page.appliedFilter.timeZone,
        })}</p>
      )}

      {page && (
        <button type="button" disabled={exporting} onClick={() => void exportEntries()}>
          {intl.formatMessage({ id: "auditLog.export" })}
        </button>
      )}
      {exporting && <p role="status">{intl.formatMessage({ id: "auditLog.exporting" })}</p>}
      {artifact && (
        <p role="status">
          <a href={artifact.href} download={artifact.fileName}>
            {intl.formatMessage({ id: "auditLog.exportReady" }, { fileName: artifact.fileName, rows: artifact.rows })}
          </a>
        </p>
      )}
      {refusal && <p role="alert">{intl.formatMessage({ id: refusal })}</p>}
      {failure && <p role="alert">{intl.formatMessage({ id: failure })}</p>}

      {page && (entries.length === 0 ? (
        <p>{intl.formatMessage({ id: "auditLog.list.empty" })}</p>
      ) : (
        <ul className="audit-entries">
          {entries.map((entry) => (
            <AuditEntryItem
              key={entry.id}
              entry={entry}
              intl={intl}
              timeZone={page.appliedFilter.timeZone}
            />
          ))}
        </ul>
      ))}

      {pageInfo?.hasNextPage && pageInfo.endCursor && (
        <button type="button" disabled={paging} onClick={() => void showOlder(pageInfo.endCursor!)}>
          {intl.formatMessage({ id: "auditLog.more" })}
        </button>
      )}
    </section>
  );
}
