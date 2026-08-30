import { describe, expect, it } from "vitest";

import { browserTelemetryOptions, startBrowserTelemetry } from "../src/telemetry.js";

const options = browserTelemetryOptions({
  dsn: "https://0123456789abcdef@o1.ingest.sentry.io/42",
  environment: "production",
  release: "abc1234",
});

const integrationNames = (options.integrations as { name: string }[]).map(
  (integration) => integration.name,
);

// ADR 0022 names exactly what browser telemetry must not do. These are those
// clauses, asserted against the options the bundle actually initializes with.
describe("browser telemetry options", () => {
  it("disables default PII", () => {
    expect(options.sendDefaultPii).toBe(false);
  });

  it("adds no Session Replay, Feedback, screenshot, or attachment integration", () => {
    expect(options.defaultIntegrations).toBe(false);
    for (const excluded of ["Replay", "Feedback", "Screenshot", "Attachment", "ReportingObserver"]) {
      expect(integrationNames.some((name) => name.includes(excluded))).toBe(false);
    }
  });

  it("still reports the unhandled failures a reviewer would hit", () => {
    expect(integrationNames).toContain("GlobalHandlers");
    expect(integrationNames).toContain("Dedupe");
  });

  it("opens no same-origin tunnel, which would be a forwarding endpoint to abuse", () => {
    expect(options.tunnel).toBeUndefined();
  });

  it("filters an event before it leaves the browser", () => {
    const filtered = options.beforeSend!(
      {
        message: "Booking failed",
        request: {
          url: "https://demo.example.test/student/discovery?language=es",
          headers: { authorization: "Bearer secret-access-token" },
        },
        user: { id: "9f0d4d1e", email: "reviewer@example.test", ip_address: "203.0.113.7" },
        extra: { correlationId: "req-7", observations: "private Learning Feedback" },
        type: undefined,
      } satisfies Parameters<NonNullable<typeof options.beforeSend>>[0],
      {},
    );
    const serialized = JSON.stringify(filtered);
    expect(serialized).toContain("https://demo.example.test/student/discovery");
    expect(serialized).toContain("req-7");
    for (const disclosure of [
      "secret-access-token",
      "reviewer@example.test",
      "203.0.113.7",
      "language=es",
      "private Learning Feedback",
    ]) {
      expect(serialized).not.toContain(disclosure);
    }
  });

  it("keeps a navigation breadcrumb and drops the content one that carried it", () => {
    const kept = options.beforeBreadcrumb!(
      { category: "navigation", data: { operationName: "StudentDiscovery" } },
      {},
    );
    expect(kept).toEqual({ category: "navigation", data: { operationName: "StudentDiscovery" } });
    const stripped = options.beforeBreadcrumb!(
      { category: "ui.input", message: "Ana Ruiz", data: { value: "private note" } },
      {},
    );
    expect(JSON.stringify(stripped)).not.toContain("private note");
  });
});

describe("starting browser telemetry", () => {
  it("reports nothing when no destination is configured", () => {
    expect(() => startBrowserTelemetry({ environment: "development" })).not.toThrow();
  });
});
