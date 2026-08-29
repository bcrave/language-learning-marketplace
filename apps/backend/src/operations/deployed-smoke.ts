import { randomUUID } from "node:crypto";

import { persistedOperationId } from "../api/persisted-operations.js";
import {
  RELEASE_JOURNEY_OPERATIONS,
  type ReleaseJourneyOperationName,
} from "../api/release-journey-operations.js";

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
 *
 * The journey speaks the public boundary's own dialect (ADR 0024): it names a
 * persisted operation and sends the public origin in `Origin`, exactly as the
 * browser client does, so a deployment that has stopped accepting either fails
 * here rather than after a reviewer arrives.
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

  async function post(
    role: SmokeRole | null,
    body: Record<string, unknown>,
  ): Promise<Response> {
    return call(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
        // ADR 0028 lets the deployment refuse a state-changing request that
        // does not name the single public origin.
        origin: new URL(options.origin).origin,
        ...(role ? options.authorizationFor[role] : {}),
      },
      body: JSON.stringify(body),
    });
  }

  async function graphql(
    role: SmokeRole | null,
    operation: ReleaseJourneyOperationName,
    variables: Record<string, unknown> = {},
  ): Promise<GraphQLResponse> {
    const response = await post(role, {
      extensions: { documentId: persistedOperationId(RELEASE_JOURNEY_OPERATIONS[operation]) },
      variables,
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
      "SmokeAnonymous",
    );
    if (!anonymous.errors?.length || anonymous.data?.studentClassCredits) {
      fail("authentication.anonymousDenied", "an unauthenticated request was answered");
    }
    record("authentication.anonymousDenied", "an unauthenticated request was refused");

    // Deployment boundary. A document the build did not produce is refused
    // before authentication is even considered (ADR 0024).
    const arbitrary = await post(null, {
      query: "query DeployedSmokeArbitraryDocument { __typename }",
    });
    const arbitraryBody = (await arbitrary.json()) as GraphQLResponse;
    if (
      arbitrary.ok ||
      arbitraryBody.data ||
      !arbitraryBody.errors?.some((error) => error.message.includes("persisted"))
    ) {
      fail(
        "boundary.persistedOperationsOnly",
        `an arbitrary GraphQL document answered with status ${arbitrary.status}`,
      );
    }
    record("boundary.persistedOperationsOnly", "an arbitrary GraphQL document was refused");

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
        "SmokeWorkspace",
      ),
      "roleWorkspace",
    );
    if (workspace.actingRole !== "STUDENT" || workspace.relationshipScope !== "SELF") {
      fail(
        "authentication.studentIdentified",
        `the Student workspace opened as ${workspace.actingRole}/${workspace.relationshipScope}`,
      );
    }
    if (!workspace.user.interfaceLocale || !workspace.user.displayTimeZone) {
      fail(
        "authentication.studentIdentified",
        "the shared Student identity has no saved Interface Locale and Display Time Zone",
      );
    }
    record("authentication.studentIdentified", "the shared Student reached its own workspace");

    // Discovery. The journey needs a still-actionable Class Session with a free
    // seat far enough ahead that its Student Cancellation refunds, so it looks
    // for one rather than assuming a fixture identifier.
    const discoveryOptions = fieldOf<{ targetLanguages: string[] }>(
      "discovery.results",
      await graphql(
        "student",
        "SmokeDiscoveryOptions",
      ),
      "classSessionDiscoveryOptions",
    );
    const bookableFrom = new Date(now().getTime() + REFUNDABLE_CANCELLATION_MILLISECONDS);
    let bookable:
      | {
          id: string;
          startsAt: string;
          seatCapacity: number;
          occupiedSeats: number;
          teacherProfile: { id: string };
        }
      | undefined;
    for (const targetLanguage of discoveryOptions.targetLanguages) {
      const connection = fieldOf<{
        nodes: {
          id: string;
          startsAt: string;
          seatCapacity: number;
          occupiedSeats: number;
          teacherProfile: { id: string };
        }[];
      }>(
        "discovery.results",
        await graphql(
          "student",
          "SmokeDiscovery",
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
    const bookableSession = bookable;
    record("discovery.results", "Class Session Discovery offered a bookable seat");

    // Localization. The discovered Teacher Profile answers in whichever
    // Interface Locale is asked for. It is read with an explicit locale rather
    // than by changing anyone's saved preference: CONTEXT.md lets a User's
    // Interface Locale be "changed only by the User", and a release is not a
    // User.
    async function teachingTopicsIn(locale: "EN" | "ES") {
      return fieldOf<{
        teachingTopics: { key: string; label: string; labelEn: string; labelEs: string }[];
      }>(
        "localization.teacherProfileLocalized",
        await graphql(
          "student",
          "SmokeTeacherProfile",
          { teacherUserId: bookableSession.teacherProfile.id, locale },
        ),
        "publicTeacherProfile",
      ).teachingTopics;
    }

    const spanish = await teachingTopicsIn("ES");
    // A catalog whose two languages happen to be identical would pass a label
    // comparison without localizing anything.
    if (!spanish.some((topic) => topic.labelEs !== topic.labelEn)) {
      fail("localization.teacherProfileLocalized", "no Topic distinguishes its two locales");
    }
    if (!spanish.every((topic) => topic.label === topic.labelEs)) {
      fail("localization.teacherProfileLocalized", "a Topic did not answer in Spanish");
    }
    const english = await teachingTopicsIn("EN");
    if (!english.every((topic) => topic.label === topic.labelEn)) {
      fail("localization.teacherProfileLocalized", "a Topic did not answer in English");
    }
    record(
      "localization.teacherProfileLocalized",
      `${spanish.length} Topics answered in both Interface Locales`,
    );

    const balanceBefore = fieldOf<{ availableBalance: number }>(
      "booking.created",
      await graphql(
        "student",
        "SmokeCredits",
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
        "SmokeBook",
        { input: { idempotencyKey: randomUUID(), classSessionId: bookableSession.id } },
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
        "SmokeCancel",
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
        "SmokeAudit",
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
