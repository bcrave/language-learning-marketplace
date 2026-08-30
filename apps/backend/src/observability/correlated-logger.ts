import { sanitizeTelemetryContext } from "@marketplace/core";
import pino, { type Logger } from "pino";

/**
 * ADR 0022's correlated structured logs. Railway keeps them; nothing else does.
 *
 * The redaction list below is defence in depth for the direct `logger.warn`
 * calls the transport already makes. The rule that actually holds is
 * `logOperationalEvent`: it puts every field through the same telemetry-safe
 * allowlist a Sentry event goes through, so a log line and an error report
 * cannot disagree about what is safe to record.
 */
export function createMarketplaceLogger(options: { release: string }): Logger {
  return pino({
    base: { release: options.release },
    redact: {
      paths: [
        "authorization",
        "headers",
        "graphqlVariables",
        "variables",
        "password",
        "token",
        "secret",
        "*.authorization",
        "*.headers",
        "*.variables",
      ],
      censor: "[REDACTED]",
    },
  });
}

export type OperationalLogLevel = "info" | "warn" | "error";

/**
 * Writes one correlated operational event. A field the allowlist does not know
 * is dropped rather than truncated or hashed: an operational log that quietly
 * accumulated GraphQL variables would be the same disclosure as an unfiltered
 * Sentry event, on infrastructure with a longer memory.
 */
export function logOperationalEvent(
  logger: Pick<Logger, OperationalLogLevel>,
  level: OperationalLogLevel,
  fields: { event: string } & Record<string, unknown>,
): void {
  logger[level](sanitizeTelemetryContext(fields) ?? { event: fields.event });
}
