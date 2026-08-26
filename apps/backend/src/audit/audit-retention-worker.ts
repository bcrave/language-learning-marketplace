import { randomUUID } from "node:crypto";

import type { TaskList } from "graphile-worker";
import { sql } from "kysely";

import type { Database } from "../database/database.js";

/**
 * Retention keeps a rolling window of complete monthly partitions: months ahead are
 * prepared before an Audit Entry needs them, and a month whose every instant has
 * left the 90-day window is dropped whole.
 *
 * Dropping a partition is the only removal the Audit Log allows. No entry inside a
 * retained month is rewritten or selectively deleted to make room — the append-only
 * trigger of ADR 0004 still refuses that, to this worker as much as to anyone else.
 */
export function auditRetentionTasks(
  db: Database,
  options: { now?: () => Date; correlationId?: () => string } = {},
): TaskList {
  return {
    maintain_audit_partitions: async () => {
      await maintainAuditPartitions(
        db,
        options.now?.() ?? new Date(),
        options.correlationId?.() ?? `audit-retention-${randomUUID()}`,
      );
    },
  };
}

async function recordRetentionAudit(db: Database, values: {
  partitionName: string;
  operation: string;
  reasonCode: string;
  correlationId: string;
  occurredAt: Date;
}) {
  await db.insertInto("audit_entries").values({
    actor_user_id: null,
    system_identity: "AUDIT_RETENTION_WORKER",
    acting_role: null,
    operation: values.operation,
    target_type: "AuditLogPartition",
    target_id: values.partitionName,
    outcome: "SUCCEEDED",
    reason_code: values.reasonCode,
    correlation_id: values.correlationId,
    // Stamped with the swept instant rather than left to the database default: the
    // partition this entry belongs to is the one the sweep has just made sure exists.
    occurred_at: values.occurredAt,
  }).execute();
}

export async function maintainAuditPartitions(db: Database, now: Date, correlationId: string) {
  const prepared = await sql<{ partitions: string[] }>`
    select ensure_audit_partitions(${now}::timestamptz) as partitions
  `.execute(db);
  const expired = await sql<{ partitions: string[] }>`
    select expire_audit_partitions(${now}::timestamptz) as partitions
  `.execute(db);

  const preparedPartitions = prepared.rows[0]?.partitions ?? [];
  const expiredPartitions = expired.rows[0]?.partitions ?? [];

  for (const partitionName of preparedPartitions) {
    await recordRetentionAudit(db, {
      partitionName,
      operation: "audit-log.partition-prepared",
      reasonCode: "AUDIT_PARTITION_PREPARED",
      correlationId,
      occurredAt: now,
    });
  }
  for (const partitionName of expiredPartitions) {
    await recordRetentionAudit(db, {
      partitionName,
      operation: "audit-log.partition-expired",
      reasonCode: "AUDIT_PARTITION_EXPIRED",
      correlationId,
      occurredAt: now,
    });
  }

  return { preparedPartitions, expiredPartitions };
}
