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
import { createMarketplaceLogger } from "../observability/correlated-logger.js";
import { clearOperationalIncidentsForFamily } from "../observability/operational-incidents.js";
import { createTelemetryReporter } from "../observability/telemetry.js";
import { runProtectedCanonicalVerification } from "./protected-canonical-verification.js";

const environment = z.object({
  DATABASE_URL: z.url(),
  CANONICAL_RECOVERY_MODE: z.enum(["ASSESS", "VERIFY_AND_REOPEN", "CLEAN_REBUILD", "CONTAIN_FAILED_SMOKE"]),
  CANONICAL_RECOVERY_REASON: z.string().trim().min(10).max(500),
  CANONICAL_RECOVERY_DISPATCH_ID: z.string().min(1).max(255),
  CANONICAL_RECOVERY_INCIDENT_CORRELATION_ID: z.string().min(1).max(255).optional(),
  GITHUB_RUN_ATTEMPT: z.string().regex(/^1$/).optional(),
  APP_RELEASE: z.string().min(1).max(255).default("unknown"),
  SENTRY_DSN: z.url().optional(),
}).parse(process.env);

const db = createDatabase(environment.DATABASE_URL);
// A verified recovery closes the incident that opened when the rebuild became
// indeterminate. The operator guide's return-to-service ends in "send one
// recovery notification", and it has to come from here: the API's watch sees
// only that the condition stopped holding, which its clearing rule refuses to
// accept as proof.
const telemetry = createTelemetryReporter({
  logger: createMarketplaceLogger({ release: environment.APP_RELEASE }),
  release: environment.APP_RELEASE,
  environment: "production",
  ...(environment.SENTRY_DSN ? { dsn: environment.SENTRY_DSN } : {}),
});
const announceRecovery = async () => {
  const recovered = await clearOperationalIncidentsForFamily(db, {
    family: "canonical-rebuild-fixture-reconciliation",
  });
  for (const dispatch of recovered) telemetry.reportAlert(dispatch);
  return recovered.length;
};
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
    const clearedIncidents = await announceRecovery();
    process.stdout.write(`${JSON.stringify({
      event: "canonical-data-recovery.verified-and-reopened",
      correlationId,
      clearedIncidents,
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
    const clearedIncidents = await announceRecovery();
    process.stdout.write(`${JSON.stringify({
      event: "canonical-data-recovery.clean-rebuild-completed",
      correlationId,
      clearedIncidents,
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
  await telemetry.flush();
  await db.destroy();
}
