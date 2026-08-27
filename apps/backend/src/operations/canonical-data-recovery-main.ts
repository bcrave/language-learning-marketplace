import { randomUUID } from "node:crypto";

import { z } from "zod";

import { parseDemonstrationIdentityBinding } from "../auth/demonstration-identities.js";
import { createDatabase } from "../database/database.js";
import {
  assessCanonicalDataRecovery,
  containFailedPostRebuildSmoke,
  runCanonicalDataRebuild,
  verifyAndReopenCanonicalData,
} from "../fixtures/fixture-maintenance.js";
import { runProtectedCanonicalVerification } from "./protected-canonical-verification.js";

const environment = z.object({
  DATABASE_URL: z.url(),
  CANONICAL_RECOVERY_MODE: z.enum(["ASSESS", "VERIFY_AND_REOPEN", "CLEAN_REBUILD", "CONTAIN_FAILED_SMOKE"]),
  CANONICAL_RECOVERY_REASON: z.string().trim().min(10).max(500),
  CANONICAL_RECOVERY_DISPATCH_ID: z.string().min(1).max(255),
  CANONICAL_RECOVERY_INCIDENT_CORRELATION_ID: z.string().min(1).max(255).optional(),
  GITHUB_RUN_ATTEMPT: z.string().regex(/^1$/).optional(),
}).parse(process.env);

const db = createDatabase(environment.DATABASE_URL);
const beforeReopen = async () => {
  await runProtectedCanonicalVerification({
    environment: process.env,
  });
};
try {
  if (environment.CANONICAL_RECOVERY_MODE === "ASSESS") {
    process.stdout.write(`${JSON.stringify({
      event: "canonical-data-recovery.assessed",
      ...await assessCanonicalDataRecovery(db),
    })}\n`);
  } else if (environment.CANONICAL_RECOVERY_MODE === "VERIFY_AND_REOPEN") {
    const correlationId = `canonical-recovery-${randomUUID()}`;
    await verifyAndReopenCanonicalData(db, {
      correlationId,
      reason: environment.CANONICAL_RECOVERY_REASON,
      beforeReopen,
    });
    process.stdout.write(`${JSON.stringify({
      event: "canonical-data-recovery.verified-and-reopened",
      correlationId,
    })}\n`);
  } else if (environment.CANONICAL_RECOVERY_MODE === "CLEAN_REBUILD") {
    if (!environment.CANONICAL_RECOVERY_INCIDENT_CORRELATION_ID) {
      throw new Error("Clean recovery rebuild requires the incident correlation identifier");
    }
    const correlationId = `canonical-recovery-${randomUUID()}`;
    const identityBinding = parseDemonstrationIdentityBinding(process.env);
    await runCanonicalDataRebuild(db, {
      correlationId,
      dispatchId: environment.CANONICAL_RECOVERY_DISPATCH_ID,
      reason: environment.CANONICAL_RECOVERY_REASON,
      initiator: "PROJECT_OWNER",
      recoverIndeterminate: true,
      incidentCorrelationId: environment.CANONICAL_RECOVERY_INCIDENT_CORRELATION_ID,
      verifyOperationalReadiness: true,
      beforeReopen,
      ...(identityBinding ? { identityBinding } : {}),
    });
    process.stdout.write(`${JSON.stringify({
      event: "canonical-data-recovery.clean-rebuild-completed",
      correlationId,
    })}\n`);
  } else {
    const correlationId = `canonical-recovery-${randomUUID()}`;
    await containFailedPostRebuildSmoke(db, {
      correlationId,
      dispatchId: environment.CANONICAL_RECOVERY_DISPATCH_ID,
    });
    process.stdout.write(`${JSON.stringify({
      event: "canonical-data-recovery.post-rebuild-smoke-contained",
      correlationId,
    })}\n`);
  }
} finally {
  await db.destroy();
}
