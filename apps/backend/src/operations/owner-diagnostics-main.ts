import { appendFileSync } from "node:fs";

import { z } from "zod";

import { createDatabase } from "../database/database.js";
import { createMarketplaceLogger } from "../observability/correlated-logger.js";
import { clearOperationalIncident } from "../observability/operational-incidents.js";
import {
  readOwnerDiagnostics,
  renderOwnerDiagnosticsSummary,
} from "../observability/owner-diagnostics.js";
import { createTelemetryReporter } from "../observability/telemetry.js";

/**
 * Writes the owner-only diagnostics summary into the GitHub Actions job it runs
 * in. Reading changes nothing, so it is safe to dispatch at any time, including
 * while a Canonical Data Rebuild holds the maintenance lease.
 *
 * Naming an incident is the one thing that does change state. Several of the
 * operator guide's clearing rules end in a verification only a person can
 * perform — an authorization smoke after abusive traffic, an integration smoke,
 * a rotated credential — and this is where they record having performed it. The
 * incident's single recovery notification goes out from here, because the
 * originating service cannot emit one for a fact it never observed.
 */
const environment = z
  .object({
    DATABASE_URL: z.url(),
    APP_RELEASE: z.string().min(1).max(255).default("unknown"),
    SENTRY_DSN: z.url().optional(),
    GITHUB_STEP_SUMMARY: z.string().min(1).optional(),
    CLEAR_INCIDENT_CORRELATION_ID: z.string().min(1).max(255).optional(),
    // What the owner reads off Railway for the guide's daily cost check. All
    // four or none: a projection from three of them would be a guess.
    COST_ACTUAL_USD: z.coerce.number().nonnegative().optional(),
    COST_LAST_24H_USD: z.coerce.number().nonnegative().optional(),
    COST_TRAILING_7D_USD: z.coerce.number().nonnegative().optional(),
    COST_DAYS_REMAINING: z.coerce.number().int().nonnegative().optional(),
  })
  .parse(process.env);

const cost =
  environment.COST_ACTUAL_USD !== undefined &&
  environment.COST_LAST_24H_USD !== undefined &&
  environment.COST_TRAILING_7D_USD !== undefined &&
  environment.COST_DAYS_REMAINING !== undefined
    ? {
        actualUsd: environment.COST_ACTUAL_USD,
        last24HourUsd: environment.COST_LAST_24H_USD,
        trailingSevenDayUsd: environment.COST_TRAILING_7D_USD,
        daysRemainingInCycle: environment.COST_DAYS_REMAINING,
      }
    : undefined;

const logger = createMarketplaceLogger({ release: environment.APP_RELEASE });
const db = createDatabase(environment.DATABASE_URL);
const telemetry = createTelemetryReporter({
  logger,
  release: environment.APP_RELEASE,
  environment: "production",
  ...(environment.SENTRY_DSN ? { dsn: environment.SENTRY_DSN } : {}),
});
try {
  if (environment.CLEAR_INCIDENT_CORRELATION_ID) {
    const recovered = await clearOperationalIncident(db, {
      correlationId: environment.CLEAR_INCIDENT_CORRELATION_ID,
    });
    if (recovered) telemetry.reportAlert(recovered);
    process.stdout.write(
      `${JSON.stringify({
        event: "owner-diagnostics.incident-cleared",
        incidentCorrelationId: environment.CLEAR_INCIDENT_CORRELATION_ID,
        outcome: recovered ? "RECOVERED" : "NOT_OPEN",
      })}\n`,
    );
  }

  const summary = renderOwnerDiagnosticsSummary(
    await readOwnerDiagnostics(db, {
      release: environment.APP_RELEASE,
      ...(cost ? { cost } : {}),
    }),
  );
  process.stdout.write(summary);
  if (environment.GITHUB_STEP_SUMMARY) {
    appendFileSync(environment.GITHUB_STEP_SUMMARY, summary);
  }
} finally {
  await telemetry.flush();
  await db.destroy();
}
