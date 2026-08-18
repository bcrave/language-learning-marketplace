import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { useState } from "react";
import { useIntl } from "react-intl";

import {
  ReportExportArtifactDocument,
  ReportExportDetailsFragmentDoc,
  ReportExportsDocument,
  RequestReportExportDocument,
  type ReportExportDetailsFragment,
  type ReportExportErrorCode,
  type ReportExportFailureReason,
  type ReportExportKind,
  type ReportExportState,
} from "./generated/graphql.js";
import { useFragment as readFragment } from "./generated/fragment-masking.js";

type IntlShape = ReturnType<typeof useIntl>;

// The catalog test requires every message key to appear literally in application
// source, and a reader benefits from the same thing: every label one of these unions
// can produce is visible in one place.
const kindMessageIds: Record<ReportExportKind, string> = {
  ORDINARY: "reportExport.kind.ORDINARY",
  CORRECTION_HISTORY: "reportExport.kind.CORRECTION_HISTORY",
};

const stateMessageIds: Record<ReportExportState, string> = {
  QUEUED: "reportExport.state.QUEUED",
  RUNNING: "reportExport.state.RUNNING",
  COMPLETED: "reportExport.state.COMPLETED",
  FAILED: "reportExport.state.FAILED",
  EXPIRED: "reportExport.state.EXPIRED",
};

const failureMessageIds: Record<ReportExportFailureReason, string> = {
  ROW_LIMIT_EXCEEDED: "reportExport.failure.ROW_LIMIT_EXCEEDED",
  AUTHORIZATION_REVOKED: "reportExport.failure.AUTHORIZATION_REVOKED",
  GENERATION_FAILED: "reportExport.failure.GENERATION_FAILED",
};

const errorMessageIds: Record<ReportExportErrorCode, string> = {
  INVALID_REPORT_RANGE: "reportExport.error.INVALID_REPORT_RANGE",
  DISPLAY_TIME_ZONE_REQUIRED: "reportExport.error.DISPLAY_TIME_ZONE_REQUIRED",
  CORRECTION_HISTORY_NOT_AUTHORIZED: "reportExport.error.CORRECTION_HISTORY_NOT_AUTHORIZED",
  EXPORT_ALREADY_IN_PROGRESS: "reportExport.error.EXPORT_ALREADY_IN_PROGRESS",
  REPORT_EXPORT_NOT_FOUND: "reportExport.error.REPORT_EXPORT_NOT_FOUND",
  REPORT_EXPORT_NOT_DOWNLOADABLE: "reportExport.error.REPORT_EXPORT_NOT_DOWNLOADABLE",
  IDEMPOTENCY_KEY_REUSED: "reportExport.error.IDEMPOTENCY_KEY_REUSED",
};

function instantIn(intl: IntlShape, instant: string, timeZone: string) {
  return intl.formatDate(instant, { dateStyle: "long", timeStyle: "short", timeZone });
}

function localDate(intl: IntlShape, isoDate: string) {
  // A stored bound is already the calendar date the requester chose, so it is shown
  // as a plain date rather than converted through a zone a second time.
  return intl.formatDate(`${isoDate}T00:00:00Z`, { dateStyle: "medium", timeZone: "UTC" });
}

function ReportExportEntry({
  reportExport,
  intl,
  onDownload,
}: {
  reportExport: ReportExportDetailsFragment;
  intl: IntlShape;
  onDownload: (id: string) => void;
}) {
  const kind = intl.formatMessage({ id: kindMessageIds[reportExport.kind] });
  return (
    <li>
      <h3>{intl.formatMessage({ id: "reportExport.summary" }, {
        kind,
        periodStart: localDate(intl, reportExport.periodStartLocalDate),
        periodEndExclusive: localDate(intl, reportExport.periodEndExclusiveLocalDate),
        timeZone: reportExport.timeZone,
      })}</h3>
      <p>{intl.formatMessage({ id: "reportExport.schemaVersion" }, { schemaVersion: reportExport.schemaVersion })}</p>
      <p>{intl.formatMessage({ id: stateMessageIds[reportExport.state] }, {
        rows: reportExport.rowCount ?? 0,
        completedAt: reportExport.completedAt ? instantIn(intl, reportExport.completedAt, reportExport.timeZone) : "",
        dataAsOf: reportExport.dataAsOf ? instantIn(intl, reportExport.dataAsOf, reportExport.timeZone) : "",
      })}</p>
      {reportExport.failureReasonCode && (
        <p>{intl.formatMessage({ id: failureMessageIds[reportExport.failureReasonCode] })}</p>
      )}
      {reportExport.downloadable && reportExport.expiresAt && (
        <p>{intl.formatMessage({ id: "reportExport.expiresAt" }, {
          expiresAt: instantIn(intl, reportExport.expiresAt, reportExport.timeZone),
        })}</p>
      )}
      {reportExport.contentDigest && (
        <p>{intl.formatMessage({ id: "reportExport.digest" }, { digest: reportExport.contentDigest })}</p>
      )}
      {reportExport.downloadable && (
        <button type="button" onClick={() => onDownload(reportExport.id)}>
          {intl.formatMessage({ id: "reportExport.download" }, { kind })}
        </button>
      )}
    </li>
  );
}

/**
 * The Report Export journey: request a bounded extract, watch it reach a terminal
 * state, and download it while it lives. The panel never renders reported data
 * itself — the artifact is a file, and the list beside it says only what the record
 * says: scope, schema, row count, digest, and expiry.
 */
export function ReportExportPanel({
  idempotencyKeyFactory = () => crypto.randomUUID(),
}: {
  idempotencyKeyFactory?: () => string;
}) {
  const intl = useIntl();
  const client = useApolloClient();
  const { data, loading, error } = useQuery(ReportExportsDocument);
  const [requestReportExport, { loading: requesting }] = useMutation(RequestReportExportDocument);
  const [kind, setKind] = useState<ReportExportKind>("ORDINARY");
  const [range, setRange] = useState({ fromLocalDate: "", toLocalDate: "" });
  const [requestedExports, setRequestedExports] = useState<ReportExportDetailsFragment[]>([]);
  const [queued, setQueued] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [artifact, setArtifact] = useState<{ fileName: string; rows: number; href: string } | null>(null);
  const [pendingAttempt, setPendingAttempt] = useState<{ fingerprint: string; key: string } | null>(null);

  if (loading) return <p role="status">{intl.formatMessage({ id: "reportExport.loading" })}</p>;
  if (error || !data) return <p role="alert">{intl.formatMessage({ id: "reportExport.loadError" })}</p>;

  const listed = readFragment(ReportExportDetailsFragmentDoc, data.reportExports);
  const reportExports = [
    ...requestedExports.filter((requested) => !listed.some((existing) => existing.id === requested.id)),
    ...listed,
  ];

  // A refused request keeps its Idempotency Key: the requester fixing a date range is
  // correcting one attempt rather than making a second one.
  function idempotencyKeyFor(fingerprint: string) {
    const key = pendingAttempt?.fingerprint === fingerprint ? pendingAttempt.key : idempotencyKeyFactory();
    setPendingAttempt({ fingerprint, key });
    return key;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQueued(false);
    setFailure(null);
    setArtifact(null);
    const input = { kind, ...range };
    const result = await requestReportExport({
      variables: { input: { idempotencyKey: idempotencyKeyFor(JSON.stringify(input)), ...input } },
    });
    const outcome = result.data?.requestReportExport;
    if (outcome?.__typename === "RequestReportExportSuccess") {
      setRequestedExports((current) => [readFragment(ReportExportDetailsFragmentDoc, outcome.reportExport), ...current]);
      setQueued(true);
      setPendingAttempt(null);
      return;
    }
    if (outcome?.__typename !== "ReportExportError") {
      setFailure("reportExport.loadError");
      return;
    }
    setFailure(errorMessageIds[outcome.code]);
    // A range or an authorization the requester must change is the same attempt
    // again, so it keeps its key. A queue that was simply busy is not: pressing
    // Request once the queue drains is a new attempt and needs a new key, or the
    // stored refusal would replay forever.
    if (outcome.code === "EXPORT_ALREADY_IN_PROGRESS") setPendingAttempt(null);
  }

  async function download(id: string) {
    setQueued(false);
    setFailure(null);
    setArtifact(null);
    setDownloading(true);
    try {
      const result = await client.query({
        query: ReportExportArtifactDocument,
        variables: { id },
        // An extract is generated once and expires; a cached copy would outlive the
        // authorization that released it.
        fetchPolicy: "no-cache",
      });
      const downloaded = result.data?.reportExportArtifact;
      if (!downloaded) throw new Error("The Report Export artifact was not released.");
      const reportExport = readFragment(ReportExportDetailsFragmentDoc, downloaded.reportExport);
      setArtifact({
        fileName: downloaded.fileName,
        rows: reportExport.rowCount ?? 0,
        href: `data:${downloaded.contentType},${encodeURIComponent(downloaded.csv)}`,
      });
    } catch {
      setFailure("reportExport.error.REPORT_EXPORT_NOT_DOWNLOADABLE");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="workspace-card" aria-labelledby="report-export-title">
      <h2 id="report-export-title">{intl.formatMessage({ id: "reportExport.title" })}</h2>
      <p>{intl.formatMessage({ id: "reportExport.help" })}</p>
      <p>{intl.formatMessage({ id: "reportExport.excludes" })}</p>

      <form onSubmit={submit}>
        <fieldset>
          <legend>{intl.formatMessage({ id: "reportExport.request.legend" })}</legend>
          <label htmlFor="report-export-kind">{intl.formatMessage({ id: "reportExport.request.kind" })}</label>
          <select
            id="report-export-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as ReportExportKind)}
          >
            <option value="ORDINARY">{intl.formatMessage({ id: kindMessageIds.ORDINARY })}</option>
            <option value="CORRECTION_HISTORY">{intl.formatMessage({ id: kindMessageIds.CORRECTION_HISTORY })}</option>
          </select>
          <p>{intl.formatMessage({ id: "reportExport.correctionHistoryHelp" })}</p>
          <label htmlFor="report-export-from">{intl.formatMessage({ id: "reportExport.request.from" })}</label>
          <input
            id="report-export-from"
            type="date"
            required
            value={range.fromLocalDate}
            onChange={(event) => setRange((current) => ({ ...current, fromLocalDate: event.target.value }))}
          />
          <label htmlFor="report-export-to">{intl.formatMessage({ id: "reportExport.request.to" })}</label>
          <input
            id="report-export-to"
            type="date"
            required
            value={range.toLocalDate}
            onChange={(event) => setRange((current) => ({ ...current, toLocalDate: event.target.value }))}
          />
          <p>{intl.formatMessage({ id: "reportExport.request.help" })}</p>
          <button type="submit" disabled={requesting}>
            {intl.formatMessage({ id: requesting ? "reportExport.request.submitting" : "reportExport.request.submit" })}
          </button>
        </fieldset>
      </form>

      {queued && <p role="status">{intl.formatMessage({ id: "reportExport.request.queued" })}</p>}
      {downloading && <p role="status">{intl.formatMessage({ id: "reportExport.downloading" })}</p>}
      {failure && <p role="alert">{intl.formatMessage({ id: failure })}</p>}
      {artifact && (
        <p role="status">
          <a href={artifact.href} download={artifact.fileName}>
            {intl.formatMessage({ id: "reportExport.downloadReady" }, {
              fileName: artifact.fileName,
              rows: artifact.rows,
            })}
          </a>
        </p>
      )}

      <h3>{intl.formatMessage({ id: "reportExport.list.title" })}</h3>
      {reportExports.length === 0 ? (
        <p>{intl.formatMessage({ id: "reportExport.list.empty" })}</p>
      ) : (
        <ul className="report-exports">
          {reportExports.map((reportExport) => (
            <ReportExportEntry
              key={reportExport.id}
              reportExport={reportExport}
              intl={intl}
              onDownload={download}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
