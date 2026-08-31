import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";

import { z } from "zod";

import { parseDemonstrationIdentityBinding } from "../auth/demonstration-identities.js";
import { createDatabase } from "../database/database.js";
import {
  bearerHeaders,
  requestDemonstrationAccessToken,
} from "./demonstration-access-token.js";
import { runDeployedSmoke } from "./deployed-smoke.js";
import {
  recordRecoveryDrillEvidence,
  renderRecoveryDrillSummary,
  runRecoveryDrill,
  type RoleJourneyResult,
} from "./recovery-drills.js";

/**
 * The protected entry point for both recovery drills.
 *
 * A backup drill points `DRILL_DATABASE_URL` at the isolated copy the workflow
 * restored, and leaves `DATABASE_URL` on the deployment so the evidence outlives
 * the copy. A change-triggered drill runs against the deployment on both, and
 * additionally drives the deployed role journeys.
 *
 * `DRILL_STARTED_AT` is the workflow's own timestamp from before it began
 * restoring, because the recovery-time target measures the outage rather than
 * the validation. A drill that started its clock here would meet the target by
 * construction.
 */
const environment = z.object({
  DATABASE_URL: z.url(),
  DRILL_DATABASE_URL: z.url().optional(),
  RECOVERY_DRILL_KIND: z.enum(["BACKUP_RESTORATION", "CHANGE_TRIGGERED_RECOVERY"]),
  DRILL_STARTED_AT: z.iso.datetime(),
  DRILL_EVIDENCE_LINK: z.url(),
  DRILL_LIMITATION: z.string().trim().min(1).max(500).optional(),
  DRILL_FOLLOW_UP_OWNER: z.string().trim().min(1).max(120).optional(),
  DRILL_SIGNED_OFF_BY: z.string().trim().min(1).max(120).optional(),
  APP_RELEASE: z.string().min(1).max(255),
  PERSISTED_OPERATION_MANIFEST_VERSION: z.string().min(1).max(255).optional(),
  GITHUB_STEP_SUMMARY: z.string().optional(),
}).parse(process.env);

const deployment = createDatabase(environment.DATABASE_URL);
const target = environment.DRILL_DATABASE_URL
  ? createDatabase(environment.DRILL_DATABASE_URL)
  : deployment;
const correlationId = `recovery-drill-${randomUUID()}`;

/**
 * The deployed shared-role smoke journeys, as the drill's critical-role-journey
 * check. It is the same suite the release and recovery workflows gate on, so a
 * drill can never pass a journey the release itself would fail.
 *
 * Only check names and outcomes reach the report. The credentials come from the
 * protected `production` environment for this run only and are never printed
 * (ADR 0020, ADR 0039).
 */
async function roleJourneys(): Promise<RoleJourneyResult> {
  const tenant = z.object({
    PUBLIC_ORIGIN: z.url(),
    AUTH0_ISSUER: z.url(),
    AUTH0_AUDIENCE: z.string().min(1),
    SMOKE_CLIENT_ID: z.string().min(1),
    SMOKE_CLIENT_SECRET: z.string().min(1),
    SMOKE_STUDENT_USERNAME: z.string().min(1),
    SMOKE_STUDENT_PASSWORD: z.string().min(1),
    SMOKE_ADMINISTRATOR_USERNAME: z.string().min(1),
    SMOKE_ADMINISTRATOR_PASSWORD: z.string().min(1),
  }).parse(process.env);
  const credentials = {
    issuer: tenant.AUTH0_ISSUER,
    audience: tenant.AUTH0_AUDIENCE,
    clientId: tenant.SMOKE_CLIENT_ID,
    clientSecret: tenant.SMOKE_CLIENT_SECRET,
  };
  const [student, administrator] = await Promise.all([
    requestDemonstrationAccessToken({
      ...credentials,
      credential: {
        username: tenant.SMOKE_STUDENT_USERNAME,
        password: tenant.SMOKE_STUDENT_PASSWORD,
      },
    }),
    requestDemonstrationAccessToken({
      ...credentials,
      credential: {
        username: tenant.SMOKE_ADMINISTRATOR_USERNAME,
        password: tenant.SMOKE_ADMINISTRATOR_PASSWORD,
      },
    }),
  ]);

  const report = await runDeployedSmoke({
    origin: tenant.PUBLIC_ORIGIN,
    authorizationFor: {
      student: bearerHeaders(student),
      administrator: bearerHeaders(administrator),
    },
  });
  const failed = report.checks.filter((check) => check.outcome !== "PASSED");
  return {
    passed: report.passed,
    detail: failed.length === 0
      ? `${report.checks.length} deployed role smoke check(s) passed`
      : `${failed.length} deployed role smoke check(s) failed: ${failed.map((check) => check.name).join(", ")}`,
  };
}

try {
  const report = await runRecoveryDrill(target, {
    kind: environment.RECOVERY_DRILL_KIND,
    correlationId,
    release: environment.APP_RELEASE,
    startedAt: new Date(environment.DRILL_STARTED_AT),
    ...(environment.RECOVERY_DRILL_KIND === "CHANGE_TRIGGERED_RECOVERY" ? { roleJourneys } : {}),
    identityBinding: parseDemonstrationIdentityBinding(process.env),
  });

  await recordRecoveryDrillEvidence(deployment, report, {
    evidenceLink: environment.DRILL_EVIDENCE_LINK,
    persistedOperationManifestVersion: environment.PERSISTED_OPERATION_MANIFEST_VERSION ?? null,
    limitation: environment.DRILL_LIMITATION ?? null,
    followUpOwner: environment.DRILL_FOLLOW_UP_OWNER ?? null,
    signedOffBy: environment.DRILL_SIGNED_OFF_BY ?? null,
    signedOffAt: environment.DRILL_SIGNED_OFF_BY ? report.completedAt : null,
  });

  const summary = renderRecoveryDrillSummary(report);
  if (environment.GITHUB_STEP_SUMMARY) {
    appendFileSync(environment.GITHUB_STEP_SUMMARY, summary);
  }
  process.stdout.write(summary);

  // The guide routes a failed drill through GitHub Actions, and a failing job
  // is that route. It also blocks release, which the readiness record now
  // carries independently of whether anyone read this run.
  if (report.outcome === "FAILED") process.exitCode = 1;
} finally {
  if (target !== deployment) await target.destroy();
  await deployment.destroy();
}
