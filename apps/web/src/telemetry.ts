import { filterTelemetryEvent, type TelemetryEvent } from "@marketplace/core";
import * as Sentry from "@sentry/react";

/**
 * The browser half of ADR 0022's telemetry.
 *
 * The ADR names what must be off, and the safest way to honour that list is to
 * start from nothing: `defaultIntegrations: false` means Session Replay, user
 * Feedback, screenshots, and attachments are absent because they were never
 * added, rather than because a flag disabled them. What is added back is the
 * smallest set that still makes a reviewer's failure actionable — the global
 * error handlers, deduplication, navigation traces, and breadcrumbs with the
 * two content-carrying kinds removed.
 *
 * There is no `tunnel`. Routing telemetry through the application's own origin
 * would add an abusable forwarding endpoint and load to a deployment with one
 * small container and a $15 monthly ceiling; the threat model accepts that an
 * ad blocker may drop a browser event instead.
 */

export function browserTelemetryOptions(options: {
  dsn: string;
  environment: string;
  release?: string;
}): Sentry.BrowserOptions {
  return {
    dsn: options.dsn,
    environment: options.environment,
    ...(options.release ? { release: options.release } : {}),
    // No IP address, no cookies, no request headers, no browser-inferred user.
    sendDefaultPii: false,
    defaultIntegrations: false,
    integrations: [
      Sentry.globalHandlersIntegration({ onerror: true, onunhandledrejection: true }),
      Sentry.dedupeIntegration(),
      Sentry.browserTracingIntegration(),
      // `dom` breadcrumbs carry the text of whatever the reviewer clicked or
      // typed into, and `console` carries whatever the application logged.
      // Both are reviewer-entered content by another name.
      Sentry.breadcrumbsIntegration({
        console: false,
        dom: false,
        fetch: true,
        history: true,
        sentry: true,
        xhr: false,
      }),
    ],
    // The ADR's selected traces: enough to see a slow journey, far short of
    // sampling every navigation a reviewer makes.
    tracesSampleRate: 0.1,
    beforeSend: filterTelemetryEvent,
    beforeSendTransaction: filterTelemetryEvent,
    beforeBreadcrumb: (breadcrumb) => {
      const sanitized = filterTelemetryEvent({ breadcrumbs: [breadcrumb] } as TelemetryEvent);
      return (sanitized.breadcrumbs?.[0] ?? null) as typeof breadcrumb | null;
    },
  };
}

/** Starts browser telemetry. Without a DSN the application simply reports nothing. */
export function startBrowserTelemetry(options: {
  dsn?: string;
  environment: string;
  release?: string;
}): void {
  if (!options.dsn) return;
  Sentry.init(browserTelemetryOptions({ ...options, dsn: options.dsn }));
}
