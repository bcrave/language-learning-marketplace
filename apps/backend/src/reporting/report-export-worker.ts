import { createHash, randomUUID } from "node:crypto";

import { reportExportExpiresAt, type ReportExportKind } from "@marketplace/core";
import type { TaskList } from "graphile-worker";

import type { Database } from "../database/database.js";
import { buildReportExtract } from "./report-export-extract.js";
import { notifyReportExportRequester } from "./report-export-notifications.js";
import type { ReportingActingRole } from "../authorization/reporting-authority.js";
import { reportExportAuthorizationStillHolds } from "./report-export-service.js";
import { lastIncludedLocalDate, localDateString, resolveReportRange } from "./report-range.js";

/**
 * Generation retries a transient failure automatically. Only once the attempts are
 * exhausted does the requester hear about it, which is what
 * `report-export.failed.requester` means by terminal failure.
 */
const MAXIMUM_GENERATION_ATTEMPTS = 3;

export function reportExportTasks(
  db: Database,
  options: { now?: () => Date; correlationId?: () => string } = {},
): TaskList {
  return {
    generate_report_exports: async () => {
      await generateDueReportExports(
        db,
        options.now?.() ?? new Date(),
        options.correlationId?.() ?? `report-export-generation-${randomUUID()}`,
      );
    },
    expire_report_exports: async () => {
      await expireDueReportExports(
        db,
        options.now?.() ?? new Date(),
        options.correlationId?.() ?? `report-export-expiry-${randomUUID()}`,
      );
    },
  };
}

type ClaimedExport = {
  id: string;
  requested_by_user_id: string;
  acting_role: ReportingActingRole;
  organization_id: string | null;
  kind: ReportExportKind;
  period_start: Date;
  period_end_exclusive: Date;
  time_zone: string;
  attempt_count: number;
};

async function recordWorkerAudit(db: Database, values: {
  targetId: string;
  operation: string;
  outcome: "SUCCEEDED" | "DENIED" | "FAILED";
  reasonCode: string;
  correlationId: string;
}) {
  await db.insertInto("audit_entries").values({
    actor_user_id: null,
    system_identity: "REPORT_EXPORT_WORKER",
    acting_role: null,
    operation: values.operation,
    target_type: "ReportExport",
    target_id: values.targetId,
    outcome: values.outcome,
    reason_code: values.reasonCode,
    correlation_id: values.correlationId,
  }).execute();
}

async function failReportExport(
  db: Database,
  reportExport: ClaimedExport,
  reasonCode: "ROW_LIMIT_EXCEEDED" | "AUTHORIZATION_REVOKED" | "GENERATION_FAILED",
  now: Date,
  correlationId: string,
) {
  await db.updateTable("report_exports")
    .set({ state: "FAILED", failure_reason_code: reasonCode, completed_at: now, content: null })
    .where("id", "=", reportExport.id)
    .where("state", "=", "RUNNING")
    .execute();
  await recordWorkerAudit(db, {
    targetId: reportExport.id,
    operation: "report-export.generated",
    outcome: "FAILED",
    reasonCode,
    correlationId,
  });
  await notifyReportExportRequester(db, {
    recipientUserId: reportExport.requested_by_user_id,
    messageId: "report-export.failed.requester",
    sourceReference: `report-export.failed:${reportExport.id}`,
    kind: reportExport.kind,
    periodStart: localDateString(reportExport.period_start),
    periodEndExclusive: localDateString(reportExport.period_end_exclusive),
    guidance: reasonCode === "GENERATION_FAILED" ? "RETRY" : reasonCode,
    correlationReference: correlationId,
  });
}

/**
 * Generates the extract for one claimed Report Export inside a single repeatable-read
 * transaction, so every fact it writes belongs to one consistent instant and no
 * concurrent Attendance correction can land halfway through the file.
 */
async function generateReportExport(db: Database, reportExport: ClaimedExport, now: Date, correlationId: string) {
  if (!await reportExportAuthorizationStillHolds(db, reportExport)) {
    // The authority that requested this export is gone, so the extract is never
    // built. This is terminal: waiting would only produce a file nobody may read.
    await failReportExport(db, reportExport, "AUTHORIZATION_REVOKED", now, correlationId);
    return;
  }

  const range = resolveReportRange(
    {
      fromLocalDate: localDateString(reportExport.period_start),
      // The stored bound is the first excluded date; the resolver takes the last
      // included one, so the two never drift apart by a day.
      toLocalDate: lastIncludedLocalDate(localDateString(reportExport.period_end_exclusive)),
    },
    reportExport.time_zone,
    now,
  );

  const extract = await db.transaction().setIsolationLevel("repeatable read").execute((transaction) =>
    buildReportExtract(transaction as Database, {
      kind: reportExport.kind,
      organizationId: reportExport.organization_id,
      range: { ...range, dataAsOf: now },
    }));

  if (extract.content === null) {
    // Refused rather than truncated: a shortened file still opens and still looks
    // complete, which is the outcome ADR 0056 rules out.
    await failReportExport(db, reportExport, "ROW_LIMIT_EXCEEDED", now, correlationId);
    return;
  }

  await db.updateTable("report_exports")
    .set({
      state: "COMPLETED",
      completed_at: now,
      expires_at: reportExportExpiresAt(now),
      data_as_of: now,
      row_count: extract.rowCount,
      content_digest: createHash("sha256").update(extract.content).digest("hex"),
      content: extract.content,
      failure_reason_code: null,
    })
    .where("id", "=", reportExport.id)
    .where("state", "=", "RUNNING")
    .executeTakeFirstOrThrow();

  await recordWorkerAudit(db, {
    targetId: reportExport.id,
    operation: "report-export.generated",
    outcome: "SUCCEEDED",
    reasonCode: "REPORT_EXPORT_COMPLETED",
    correlationId,
  });
  await notifyReportExportRequester(db, {
    recipientUserId: reportExport.requested_by_user_id,
    messageId: "report-export.completed.requester",
    sourceReference: `report-export.completed:${reportExport.id}`,
    kind: reportExport.kind,
    periodStart: localDateString(reportExport.period_start),
    periodEndExclusive: localDateString(reportExport.period_end_exclusive),
    rowCount: extract.rowCount,
    expiresAt: reportExportExpiresAt(now),
  });
}

export async function generateDueReportExports(db: Database, now: Date, correlationId: string) {
  const queued = await db.selectFrom("report_exports")
    .select("id")
    .where("state", "=", "QUEUED")
    .orderBy("requested_at")
    .orderBy("id")
    .execute();
  let generatedCount = 0;

  for (const due of queued) {
    // Claiming is its own committed transaction: the extract that follows is long
    // enough that holding the row lock across it would block the requester's own
    // view of their queue.
    const claimed = await db.transaction().execute(async (transaction) => {
      const reportExport = await transaction.selectFrom("report_exports")
        .select([
          "id", "requested_by_user_id", "acting_role", "organization_id", "kind",
          "period_start", "period_end_exclusive", "time_zone", "attempt_count",
        ])
        .where("id", "=", due.id)
        .where("state", "=", "QUEUED")
        .forUpdate()
        .skipLocked()
        .executeTakeFirst();
      if (!reportExport) return null;
      await transaction.updateTable("report_exports")
        .set({ state: "RUNNING", started_at: now, attempt_count: reportExport.attempt_count + 1 })
        .where("id", "=", reportExport.id)
        .execute();
      return { ...reportExport, attempt_count: reportExport.attempt_count + 1 } satisfies ClaimedExport;
    });
    if (!claimed) continue;

    try {
      await generateReportExport(db, claimed, now, correlationId);
      generatedCount += 1;
    } catch (error) {
      if (claimed.attempt_count >= MAXIMUM_GENERATION_ATTEMPTS) {
        await failReportExport(db, claimed, "GENERATION_FAILED", now, correlationId);
        throw error;
      }
      // Still retryable, so the requester hears nothing: the export returns to the
      // queue and the next run tries again.
      await db.updateTable("report_exports")
        .set({ state: "QUEUED" })
        .where("id", "=", claimed.id)
        .where("state", "=", "RUNNING")
        .execute();
      await recordWorkerAudit(db, {
        targetId: claimed.id,
        operation: "report-export.generated",
        outcome: "FAILED",
        reasonCode: "GENERATION_RETRYING",
        correlationId,
      });
      throw error;
    }
  }

  return generatedCount;
}

/**
 * Drops every extract that has outlived its 24 hours. The Report Export record stays
 * — its acting role, filters, schema version, row count, and digest remain auditable
 * — while the content it released is gone, so expiry can never be read as a backup.
 */
export async function expireDueReportExports(db: Database, now: Date, correlationId: string) {
  const expired = await db.updateTable("report_exports")
    .set({ state: "EXPIRED", content: null })
    .where("state", "=", "COMPLETED")
    .where("expires_at", "<=", now)
    .returning("id")
    .execute();

  for (const reportExport of expired) {
    await recordWorkerAudit(db, {
      targetId: reportExport.id,
      operation: "report-export.expired",
      outcome: "SUCCEEDED",
      reasonCode: "REPORT_EXPORT_EXPIRED",
      correlationId,
    });
  }
  return expired.length;
}
