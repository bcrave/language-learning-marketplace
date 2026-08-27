import { randomUUID } from "node:crypto";

/**
 * The deployed smoke journey of ADR 0038: the last release stage, run against
 * the public origin after the browser client has been transitioned. It proves
 * the release end to end at the seam a reviewer actually uses — authentication,
 * Interface Locale, Class Session Discovery, Booking, Student Cancellation, and
 * the Audit Entries those mutations must leave behind.
 *
 * Every check is expressed as observable API behaviour, so the same journey
 * runs unchanged against a local server. Nothing it records carries a secret,
 * an access token, or a person's content: only operation names, codes, and
 * counts, because a release job's output is privacy-safe evidence (ADR 0039).
 */
export type SmokeRole = "student" | "administrator";

export interface DeployedSmokeCheck {
  name: string;
  outcome: "PASSED" | "FAILED";
  detail: string;
}

export interface DeployedSmokeReport {
  correlationId: string;
  checks: DeployedSmokeCheck[];
  passed: boolean;
}

export interface DeployedSmokeOptions {
  origin: string;
  /**
   * Request headers carrying each shared demonstration identity's credential.
   * The caller owns how those are obtained, so the journey never handles a
   * provider secret itself.
   */
  authorizationFor: Record<SmokeRole, Record<string, string>>;
  fetch?: typeof fetch;
  now?: () => Date;
  correlationId?: string;
}

/** A refund requires cancelling at least 24 hours before the session starts. */
const REFUNDABLE_CANCELLATION_MILLISECONDS = 24 * 60 * 60_000;

class SmokeFailure extends Error {}

interface GraphQLResponse {
  data?: Record<string, unknown> | null;
  errors?: { message: string }[];
}

export async function runDeployedSmoke(
  options: DeployedSmokeOptions,
): Promise<DeployedSmokeReport> {
  const correlationId = options.correlationId ?? `deployed-smoke-${randomUUID()}`;
  const call = options.fetch ?? fetch;
  const now = options.now ?? (() => new Date());
  const checks: DeployedSmokeCheck[] = [];
  const endpoint = new URL("/graphql", options.origin).toString();

  const record = (name: string, detail: string) =>
    checks.push({ name, outcome: "PASSED", detail });
  // Annotated so TypeScript narrows on the calls that end the journey.
  const fail: (name: string, detail: string) => never = (name, detail) => {
    checks.push({ name, outcome: "FAILED", detail });
    throw new SmokeFailure(name);
  };

  async function graphql(
    role: SmokeRole | null,
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<GraphQLResponse> {
    const response = await call(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
        ...(role ? options.authorizationFor[role] : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
    return (await response.json()) as GraphQLResponse;
  }

  /** Reads one field, failing the named check rather than throwing raw shapes. */
  function fieldOf<T>(name: string, response: GraphQLResponse, field: string): T {
    if (response.errors?.length) {
      return fail(name, `the API answered ${response.errors.length} error(s)`);
    }
    const value = response.data?.[field];
    if (value === undefined || value === null) return fail(name, `${field} was absent`);
    return value as T;
  }

  try {
    // Authentication. An unauthenticated caller reaches nothing, and a shared
    // identity reaches its own workspace.
    const anonymous = await graphql(
      null,
      "query SmokeAnonymous { studentClassCredits { availableBalance } }",
    );
    if (!anonymous.errors?.length || anonymous.data?.studentClassCredits) {
      fail("authentication.anonymousDenied", "an unauthenticated request was answered");
    }
    record("authentication.anonymousDenied", "an unauthenticated request was refused");

    const workspace = fieldOf<{
      actingRole: string;
      relationshipScope: string;
      user: {
        id: string;
        interfaceLocale: "EN" | "ES" | null;
        displayTimeZone: string | null;
      };
    }>(
      "authentication.studentIdentified",
      await graphql(
        "student",
        `query SmokeWorkspace {
          roleWorkspace(actingRole: STUDENT) {
            actingRole
            relationshipScope
            user { id interfaceLocale displayTimeZone }
          }
        }`,
      ),
      "roleWorkspace",
    );
    if (workspace.actingRole !== "STUDENT" || workspace.relationshipScope !== "SELF") {
      fail(
        "authentication.studentIdentified",
        `the Student workspace opened as ${workspace.actingRole}/${workspace.relationshipScope}`,
      );
    }
    const savedLocale = workspace.user.interfaceLocale;
    const savedTimeZone = workspace.user.displayTimeZone;
    if (!savedLocale || !savedTimeZone) {
      fail(
        "authentication.studentIdentified",
        "the shared Student identity has no saved Interface Locale and Display Time Zone",
      );
    }
    record("authentication.studentIdentified", "the shared Student reached its own workspace");

    // Localization. The same Topics come back in the saved Interface Locale,
    // which is what a reviewer switching languages actually observes.
    async function topicsIn(locale: "EN" | "ES") {
      const saved = await graphql(
        "student",
        `mutation SmokePreferences($input: SaveUserPreferencesInput!) {
          saveUserPreferences(input: $input) { user { interfaceLocale } }
        }`,
        {
          input: {
            actingRole: "STUDENT",
            interfaceLocale: locale,
            displayTimeZone: savedTimeZone,
          },
        },
      );
      fieldOf("localization.topicsLocalized", saved, "saveUserPreferences");
      return fieldOf<{
        targetLanguages: string[];
        topics: { key: string; label: string; labelEn: string; labelEs: string }[];
      }>(
        "localization.topicsLocalized",
        await graphql(
          "student",
          `query SmokeDiscoveryOptions {
            classSessionDiscoveryOptions {
              targetLanguages
              topics { key label labelEn labelEs }
            }
          }`,
        ),
        "classSessionDiscoveryOptions",
      );
    }

    const spanish = await topicsIn("ES");
    // A catalog whose two languages happen to be identical would pass a
    // label comparison without localizing anything.
    if (!spanish.topics.some((topic) => topic.labelEs !== topic.labelEn)) {
      fail("localization.topicsLocalized", "no Topic distinguishes its two locales");
    }
    if (!spanish.topics.every((topic) => topic.label === topic.labelEs)) {
      fail("localization.topicsLocalized", "a Topic did not answer in Spanish");
    }
    const english = await topicsIn("EN");
    if (!english.topics.every((topic) => topic.label === topic.labelEn)) {
      fail("localization.topicsLocalized", "a Topic did not answer in English");
    }
    // A smoke run is not allowed to leave a shared identity changed behind it.
    if (savedLocale !== "EN") await topicsIn(savedLocale);
    record(
      "localization.topicsLocalized",
      `${spanish.topics.length} Topics answered in both Interface Locales`,
    );

    // Discovery. The journey needs a still-actionable Class Session with a free
    // seat far enough ahead that its Student Cancellation refunds, so it looks
    // for one rather than assuming a fixture identifier.
    const bookableFrom = new Date(now().getTime() + REFUNDABLE_CANCELLATION_MILLISECONDS);
    let bookable:
      | { id: string; startsAt: string; seatCapacity: number; occupiedSeats: number }
      | undefined;
    for (const targetLanguage of english.targetLanguages) {
      const connection = fieldOf<{
        nodes: {
          id: string;
          startsAt: string;
          seatCapacity: number;
          occupiedSeats: number;
        }[];
      }>(
        "discovery.results",
        await graphql(
          "student",
          `query SmokeDiscovery($input: ClassSessionDiscoveryInput!) {
            discoverClassSessions(input: $input) {
              nodes { id startsAt seatCapacity occupiedSeats }
            }
          }`,
          { input: { targetLanguage } },
        ),
        "discoverClassSessions",
      );
      bookable = connection.nodes.find(
        (node) =>
          node.occupiedSeats < node.seatCapacity &&
          new Date(node.startsAt).getTime() > bookableFrom.getTime(),
      );
      if (bookable) break;
    }
    if (!bookable) {
      fail("discovery.results", "no discoverable Class Session had a refundable free seat");
    }
    record("discovery.results", "Class Session Discovery offered a bookable seat");

    const balanceBefore = fieldOf<{ availableBalance: number }>(
      "booking.created",
      await graphql(
        "student",
        "query SmokeCredits { studentClassCredits { availableBalance } }",
      ),
      "studentClassCredits",
    ).availableBalance;

    // Booking. One Class Credit is exchanged for the seat.
    const booked = fieldOf<{
      __typename: string;
      booking?: { id: string; state: string };
      account?: { availableBalance: number };
      code?: string;
    }>(
      "booking.created",
      await graphql(
        "student",
        `mutation SmokeBook($input: BookClassSessionInput!) {
          bookClassSession(input: $input) {
            __typename
            ... on BookClassSessionSuccess {
              booking { id state }
              account { availableBalance }
            }
            ... on BookingError { code }
          }
        }`,
        { input: { idempotencyKey: randomUUID(), classSessionId: bookable.id } },
      ),
      "bookClassSession",
    );
    if (booked.__typename !== "BookClassSessionSuccess") {
      fail("booking.created", `Booking was refused with ${booked.code ?? booked.__typename}`);
    }
    if (booked.account!.availableBalance !== balanceBefore - 1) {
      fail(
        "booking.created",
        `Booking left ${booked.account!.availableBalance} Class Credits, expected ${balanceBefore - 1}`,
      );
    }
    record("booking.created", "one Class Credit claimed one seat");

    // Student Cancellation, far enough ahead that the credit returns.
    const cancelled = fieldOf<{
      __typename: string;
      booking?: { state: string; terminalReason: string | null; classCreditRefunded: boolean };
      account?: { availableBalance: number };
      code?: string;
    }>(
      "booking.cancelled",
      await graphql(
        "student",
        `mutation SmokeCancel($input: CancelBookingInput!) {
          cancelBooking(input: $input) {
            __typename
            ... on CancelBookingSuccess {
              booking { state terminalReason classCreditRefunded }
              account { availableBalance }
            }
            ... on BookingError { code }
          }
        }`,
        { input: { idempotencyKey: randomUUID(), bookingId: booked.booking!.id } },
      ),
      "cancelBooking",
    );
    if (cancelled.__typename !== "CancelBookingSuccess") {
      fail(
        "booking.cancelled",
        `Student Cancellation was refused with ${cancelled.code ?? cancelled.__typename}`,
      );
    }
    if (
      cancelled.booking!.terminalReason !== "STUDENT_CANCELLATION" ||
      !cancelled.booking!.classCreditRefunded ||
      cancelled.account!.availableBalance !== balanceBefore
    ) {
      fail(
        "booking.cancelled",
        `Student Cancellation ended as ${cancelled.booking!.terminalReason} leaving ${cancelled.account!.availableBalance} Class Credits`,
      );
    }
    record("booking.cancelled", "the timely Student Cancellation returned the Class Credit");

    // Audit. Both authenticated mutations are in the immutable history, under
    // the correlation identifier this run carried throughout.
    const auditLog = fieldOf<{
      __typename: string;
      entries?: { operation: string; outcome: string; correlationId: string }[];
      code?: string;
    }>(
      "audit.entriesRecorded",
      await graphql(
        "administrator",
        `query SmokeAudit($filter: AuditLogFilterInput) {
          auditLog(filter: $filter) {
            __typename
            ... on AuditLog { entries { operation outcome correlationId } }
            ... on AuditLogError { code }
          }
        }`,
        { filter: { correlationId } },
      ),
      "auditLog",
    );
    if (auditLog.__typename !== "AuditLog") {
      fail("audit.entriesRecorded", `the Audit Log answered ${auditLog.code ?? auditLog.__typename}`);
    }
    const audited = new Set(
      auditLog
        .entries!.filter((entry) => entry.outcome === "SUCCEEDED")
        .map((entry) => entry.operation),
    );
    const missing = ["booking.created", "booking.cancelled"].filter(
      (operation) => !audited.has(operation),
    );
    if (missing.length > 0) {
      fail("audit.entriesRecorded", `no Audit Entry for ${missing.join(", ")}`);
    }
    record(
      "audit.entriesRecorded",
      `${auditLog.entries!.length} correlated Audit Entries, including both mutations`,
    );
  } catch (error) {
    if (!(error instanceof SmokeFailure)) {
      checks.push({
        name: "smoke.completed",
        outcome: "FAILED",
        // The message may carry transport detail, so only its class is kept.
        detail: `the journey stopped on an unexpected ${error instanceof Error ? error.name : "failure"}`,
      });
    }
  }

  return {
    correlationId,
    checks,
    passed: checks.length > 0 && checks.every((check) => check.outcome === "PASSED"),
  };
}
