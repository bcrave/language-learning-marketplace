import { filterTelemetryEvent, sanitizeTelemetryEvent, type TelemetryEvent } from "@marketplace/core";
import * as Sentry from "@sentry/node";
import type { Logger } from "pino";

import { alertCondition } from "./alert-policy.js";
import { logOperationalEvent } from "./correlated-logger.js";
import type { AlertDispatch } from "./operational-incidents.js";

/**
 * The server half of ADR 0022's telemetry.
 *
 * Two things leave this process for Sentry: unexpected server failures, and the
 * private alerts of the operator guide. The guide routes application, worker,
 * reconciliation, integration, Sentry-pattern, and abuse incidents through
 * Sentry email, so an alert is dispatched as an ordinary Sentry event carrying
 * only allowlisted evidence — no new outbound integration, no owner endpoint,
 * and no second place a secret could be configured.
 *
 * The Node SDK's automatic instrumentation is deliberately off. It installs an
 * OpenTelemetry stack into the process, which is the shape of overhead ADR 0022
 * declined for a demonstration operating under a $15 monthly ceiling, and it
 * attaches request and query detail this project would then have to filter back
 * out. Unhandled failures and explicit reports are what the owner acts on.
 */

export interface TelemetryReporter {
  /** Sends one alert, exactly as the incident lifecycle decided it. */
  reportAlert(dispatch: AlertDispatch): void;
  /** Reports one unexpected failure that no alert threshold covers. */
  reportFailure(error: unknown, context: Record<string, unknown>): void;
  flush(timeoutMilliseconds?: number): Promise<boolean>;
}

function alertMessage(dispatch: AlertDispatch) {
  const verb =
    dispatch.kind === "CONFIRMED"
      ? "confirmed"
      : dispatch.kind === "ESCALATED"
        ? "escalated"
        : "recovered";
  return `${dispatch.family}: ${dispatch.conditionId} ${verb}`;
}

/**
 * Builds the event an alert travels as. It is exported so the shape can be
 * asserted without a Sentry client, and so the same construction is used by the
 * reporter that has no DSN configured.
 */
export function alertTelemetryEvent(dispatch: AlertDispatch): TelemetryEvent {
  const policy = alertCondition(dispatch.conditionId);
  return sanitizeTelemetryEvent({
    message: alertMessage(dispatch),
    // A recovery notification is informational however severe the incident was;
    // only an open incident carries its severity into the owner's inbox.
    level: dispatch.kind === "RECOVERED" ? "info" : dispatch.severity === "IMMEDIATE" ? "fatal" : "warning",
    fingerprint: [dispatch.fingerprint, dispatch.kind],
    tags: {
      incidentFamily: dispatch.family,
      alertCondition: dispatch.conditionId,
      severity: dispatch.severity,
      route: policy.route,
      outcome: dispatch.kind,
      incidentFingerprint: dispatch.fingerprint,
      incidentCorrelationId: dispatch.incidentCorrelationId,
    },
    extra: dispatch.evidence,
  } as TelemetryEvent);
}

/**
 * Starts telemetry for this process. Without a DSN — local development, tests,
 * and the private deployment before Sentry is configured — alerts and failures
 * still reach the correlated log, so the thresholds are exercised rather than
 * silently disabled.
 */
export function createTelemetryReporter(options: {
  logger: Logger;
  release: string;
  environment: string;
  dsn?: string;
}): TelemetryReporter {
  const enabled = Boolean(options.dsn);
  if (enabled) {
    Sentry.init({
      dsn: options.dsn!,
      release: options.release,
      environment: options.environment,
      // ADR 0022 excludes default PII, and the filter below removes what the
      // SDK would still attach. Both, because one of them is a boolean the
      // next SDK release could reinterpret and the other is this project's own.
      sendDefaultPii: false,
      defaultIntegrations: false,
      integrations: [
        Sentry.onUncaughtExceptionIntegration({ exitEvenIfOtherHandlersAreRegistered: false }),
        Sentry.onUnhandledRejectionIntegration({ mode: "warn" }),
        Sentry.dedupeIntegration(),
      ],
      registerEsmLoaderHooks: false,
      // No `beforeSendTransaction`: with automatic instrumentation off this
      // process starts no transactions, and a filter for events that cannot
      // occur would read as coverage this deployment does not have.
      beforeSend: filterTelemetryEvent,
    });
  }

  return {
    reportAlert(dispatch) {
      logOperationalEvent(options.logger, dispatch.severity === "IMMEDIATE" ? "error" : "warn", {
        event: `alert.${dispatch.kind.toLowerCase()}`,
        incidentFamily: dispatch.family,
        alertCondition: dispatch.conditionId,
        incidentFingerprint: dispatch.fingerprint,
        incidentCorrelationId: dispatch.incidentCorrelationId,
        severity: dispatch.severity,
        route: dispatch.route,
        ...dispatch.evidence,
      });
      if (!enabled) return;
      // `alertTelemetryEvent` already filtered it, and `beforeSend` filters
      // everything again on the way out; a third pass here would only obscure
      // which of the three is the contract.
      Sentry.captureEvent(alertTelemetryEvent(dispatch) as Sentry.Event);
    },
    reportFailure(error, context) {
      logOperationalEvent(options.logger, "error", {
        event: "telemetry.failure",
        ...context,
      });
      if (!enabled) return;
      Sentry.captureException(error, {
        contexts: { marketplace: sanitizeTelemetryEvent({ extra: context }).extra ?? {} },
      });
    },
    async flush(timeoutMilliseconds = 2_000) {
      if (!enabled) return true;
      return Sentry.flush(timeoutMilliseconds);
    },
  };
}
