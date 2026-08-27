import { randomUUID } from "node:crypto";

import { z } from "zod";

import { parseDemonstrationIdentityBinding } from "../auth/demonstration-identities.js";
import { createDatabase } from "../database/database.js";
import { latestMigrationName } from "../database/migrate.js";
import { runCanonicalDataRebuild } from "../fixtures/fixture-maintenance.js";
import { runProtectedCanonicalVerification } from "./protected-canonical-verification.js";

const environmentSchema = z.object({
  DATABASE_URL: z.url(),
  CANONICAL_REBUILD_DISPATCH_ID: z.string().min(1).max(255),
  CANONICAL_REBUILD_REASON: z.string().trim().min(10).max(500),
  CANONICAL_REBUILD_INITIATOR: z.enum(["PROJECT_OWNER", "SCHEDULED_SYSTEM"]).default("PROJECT_OWNER"),
  GITHUB_RUN_ATTEMPT: z.string().regex(/^1$/).optional(),
});

const environment = environmentSchema.parse(process.env);
const db = createDatabase(environment.DATABASE_URL);
let cancellationRequested = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    // Do not abandon an ambiguous replacement. The in-flight transaction is allowed
    // to reach its verified completion or rollback, then the protected dispatch exits.
    cancellationRequested = true;
  });
}

try {
  const expectedMigration = await latestMigrationName();
  const appliedMigration = await db.selectFrom("schema_migrations").select("name")
    .orderBy("name", "desc").executeTakeFirstOrThrow();
  if (appliedMigration.name !== expectedMigration) {
    throw new Error("Canonical Data Rebuild requires the schema shipped by this build");
  }
  const identityBinding = parseDemonstrationIdentityBinding(process.env);
  let completed = false;

  for (let attempt = 1; attempt <= 2 && !completed; attempt += 1) {
    if (cancellationRequested) break;
    const correlationId = `canonical-rebuild-${randomUUID()}`;
    const dispatchId = `${environment.CANONICAL_REBUILD_DISPATCH_ID}:attempt-${attempt}`;
    try {
      const result = await runCanonicalDataRebuild(db, {
        correlationId,
        dispatchId,
        reason: environment.CANONICAL_REBUILD_REASON,
        initiator: environment.CANONICAL_REBUILD_INITIATOR,
        verifyOperationalReadiness: true,
        shouldAbortBeforeReopen: () => cancellationRequested,
        beforeReopen: async () => {
          if (cancellationRequested) throw new Error("Canonical Data Rebuild was cancelled before reopen");
          await runProtectedCanonicalVerification({
            environment: process.env,
          });
          if (cancellationRequested) throw new Error("Canonical Data Rebuild was cancelled before reopen");
        },
        ...(identityBinding ? { identityBinding } : {}),
      });
      process.stdout.write(`${JSON.stringify({
        event: "canonical-data-rebuild.completed",
        attempt,
        correlationId,
        manifestVersion: result.manifestVersion,
      })}\n`);
      completed = true;
    } catch {
      process.stdout.write(`${JSON.stringify({
        event: "canonical-data-rebuild.rolled-back",
        attempt,
        correlationId,
        safeFailureCode: "CANONICAL_DATA_REBUILD_FAILED",
      })}\n`);
    }
  }

  if (!completed || cancellationRequested) process.exitCode = cancellationRequested ? 130 : 1;
} finally {
  await db.destroy();
}
