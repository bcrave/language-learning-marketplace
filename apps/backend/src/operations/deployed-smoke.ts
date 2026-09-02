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
 * Interface Locale, Class Session Discovery, Booking, Student Cancellation, the
 * Teacher, Organization Manager and Platform Administrator journeys, the
 * cross-role denials that bound them, and the Audit Entries every mutation must
 * leave behind.
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
 *
 * Every state-changing step is a matched pair — book and cancel, add and remove
 * an Availability Exception, credit and debit the same Class Credit — and each
 * pair asserts the reading it started from. The security verification policy
 * asks the suite not to depend on mutable reviewer state, and a journey that
 * left its own changes behind would depend on its previous run's.
 */
export const SMOKE_ROLES = [
  "student",
  "teacher",
  "organizationManager",
  "administrator",
] as const;

export type SmokeRole = (typeof SMOKE_ROLES)[number];

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

/**
 * How far ahead the Teacher's Availability Exception is placed.
 *
 * The exception has to fall where no Class Session is scheduled, or the
 * deployment correctly refuses it with an `AvailabilityExceptionSessionConflict`
 * and the journey would be reporting a failure that is really the fixture doing
 * its job. The canonical fixtures roll a window of weeks; a year and a bit
 * clears all of them without depending on the day the release runs.
 */
const AVAILABILITY_EXCEPTION_DAYS_AHEAD = 400;

class SmokeFailure extends Error {}

interface GraphQLResponse {
  data?: Record<string, unknown> | null;
  errors?: { message: string; extensions?: { code?: string } }[];
}

/**
 * The codes an unexpected GraphQL answer carried, for the report's detail.
 *
 * Codes rather than messages: a code is a closed vocabulary the schema already
 * publishes, while a message can carry a Class Session title, a person's name,
 * or the identifier that was asked about. A release job's evidence has to be
 * safe to read in a public workflow log (ADR 0039), and "the API answered
 * 1 error(s)" tells whoever is holding the release nothing they can act on.
 */
function errorCodes(response: GraphQLResponse) {
  const codes = (response.errors ?? []).map((error) => error.extensions?.code ?? "UNKNOWN");
  return codes.length === 0 ? "no error" : codes.join(", ");
}

/** A local `YYYY-MM-DDTHH:mm`, which is the shape the availability inputs take. */
function localDateTime(at: Date, hour: number) {
  return `${at.toISOString().slice(0, 10)}T${String(hour).padStart(2, "0")}:00`;
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
      return fail(name, `${field} answered ${errorCodes(response)}`);
    }
    const value = response.data?.[field];
    if (value === undefined || value === null) return fail(name, `${field} was absent`);
    return value as T;
  }

  /**
   * The shape of every cross-role replay: the same document, the same
   * identifier, a role that must not reach it.
   *
   * A denial is only evidence if it discloses nothing, so both halves are
   * asserted — the field is refused, and the refusal does not repeat the
   * identifier it was asked about. An error quoting the Class Session would
   * confirm its existence to exactly the caller who may not see it.
   */
  async function deniedTo(
    name: string,
    role: SmokeRole,
    operation: ReleaseJourneyOperationName,
    field: string,
    variables: Record<string, unknown>,
    subject?: string,
  ): Promise<void> {
    const answer = await graphql(role, operation, variables);
    if (answer.data?.[field]) {
      fail(name, `${field} answered a role that must not reach it`);
    }
    if (!answer.errors?.length) {
      fail(name, `${field} was refused without saying so`);
    }
    if (subject && answer.errors!.some((error) => error.message.includes(subject))) {
      fail(name, `the denial of ${field} repeated the identifier it was asked about`);
    }
  }

  try {
    // Anonymous. An unauthenticated caller reaches nothing private, and a
    // document the build did not produce is refused before authentication is
    // even considered (ADR 0024).
    const anonymous = await graphql(null, "SmokeCredits");
    if (!anonymous.errors?.length || anonymous.data?.["studentClassCredits"]) {
      fail("authentication.anonymousDenied", "an unauthenticated request was answered");
    }
    record("authentication.anonymousDenied", "an unauthenticated request was refused");

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
      await graphql("student", "SmokeWorkspace", { actingRole: "STUDENT" }),
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
    const studentUserId = workspace.user.id;

    // Discovery. The journey needs a still-actionable Class Session with a free
    // seat far enough ahead that its Student Cancellation refunds, so it looks
    // for one rather than assuming a fixture identifier.
    const discoveryOptions = fieldOf<{ targetLanguages: string[] }>(
      "discovery.results",
      await graphql("student", "SmokeDiscoveryOptions"),
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
        await graphql("student", "SmokeDiscovery", { input: { targetLanguage } }),
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
        await graphql("student", "SmokeTeacherProfile", {
          teacherUserId: bookableSession.teacherProfile.id,
          locale,
        }),
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

    // The anonymous public surface. A reviewer who has not signed in reaches
    // the deliberately public Teacher Profile and nothing else — which needs a
    // Teacher to ask about, so it runs here rather than before discovery.
    //
    // Both halves matter. A deployment that refused the profile would have
    // broken the one thing the threat model publishes; one that answered
    // Class Session Discovery would be handing out a Student's view of the
    // marketplace to the internet.
    const anonymousProfile = fieldOf<{ teachingTopics: { key: string }[] }>(
      "anonymous.publicSurface",
      await graphql(null, "SmokeTeacherProfile", {
        teacherUserId: bookableSession.teacherProfile.id,
        locale: "EN",
      }),
      "publicTeacherProfile",
    );
    const anonymousDiscovery = await graphql(null, "SmokeDiscoveryOptions");
    if (!anonymousDiscovery.errors?.length || anonymousDiscovery.data?.["classSessionDiscoveryOptions"]) {
      fail("anonymous.publicSurface", "Class Session Discovery answered an anonymous caller");
    }
    record(
      "anonymous.publicSurface",
      `the public Teacher Profile answered anonymously with ${anonymousProfile.teachingTopics.length} Topics while Discovery did not`,
    );

    const balanceBefore = fieldOf<{ availableBalance: number }>(
      "booking.created",
      await graphql("student", "SmokeCredits"),
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
      await graphql("student", "SmokeBook", {
        input: { idempotencyKey: randomUUID(), classSessionId: bookableSession.id },
      }),
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
      await graphql("student", "SmokeCancel", {
        input: { idempotencyKey: randomUUID(), bookingId: booked.booking!.id },
      }),
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

    // Teacher. The assigned Class Sessions, and the Class Roster of one of
    // them, which has to be the Teacher's own: the relationship window is what
    // opens a roster, never the Teacher role by itself.
    const teacher = fieldOf<{ actingRole: string; user: { id: string } }>(
      "teacher.assignedRoster",
      await graphql("teacher", "SmokeWorkspace", { actingRole: "TEACHER" }),
      "roleWorkspace",
    );
    const assigned = fieldOf<{ id: string; teacherUserId: string; state: string }[]>(
      "teacher.assignedRoster",
      await graphql("teacher", "SmokeTeacherSessions"),
      "teacherClassSessions",
    );
    const foreign = assigned.filter((session) => session.teacherUserId !== teacher.user.id);
    if (foreign.length > 0) {
      fail(
        "teacher.assignedRoster",
        `${foreign.length} of ${assigned.length} Class Sessions belong to another Teacher`,
      );
    }
    const assignedSession = assigned[0];
    if (!assignedSession) {
      fail("teacher.assignedRoster", "the shared Teacher has no assigned Class Session");
    }
    const roster = fieldOf<{
      classSession: { id: string; teacherUserId: string };
      students: { bookingId: string }[];
    }>(
      "teacher.assignedRoster",
      await graphql("teacher", "SmokeRoster", {
        classSessionId: assignedSession.id,
        actingRole: "TEACHER",
      }),
      "classRoster",
    );
    if (roster.classSession.teacherUserId !== teacher.user.id) {
      fail("teacher.assignedRoster", "the Class Roster named another Teacher's Class Session");
    }
    record(
      "teacher.assignedRoster",
      `${assigned.length} assigned Class Sessions, one roster of ${roster.students.length} Student(s)`,
    );

    // One permitted Teacher action, and its undo. An Availability Exception is
    // the smallest state-changing thing a Teacher owns outright: it needs no
    // Student, touches no learning record, and removing it restores exactly
    // what was there.
    const availabilityBefore = fieldOf<{ exceptions: { id: string }[] }>(
      "teacher.permittedAction",
      await graphql("teacher", "SmokeTeacherAvailability"),
      "teacherAvailability",
    ).exceptions.length;
    const exceptionDay = new Date(
      now().getTime() + AVAILABILITY_EXCEPTION_DAYS_AHEAD * 24 * 60 * 60_000,
    );
    const added = fieldOf<{ __typename: string; exception?: { id: string }; code?: string }>(
      "teacher.permittedAction",
      await graphql("teacher", "SmokeAddAvailabilityException", {
        input: {
          idempotencyKey: randomUUID(),
          startsAtLocal: localDateTime(exceptionDay, 9),
          endsAtLocal: localDateTime(exceptionDay, 11),
          startDisambiguation: "REJECT",
          endDisambiguation: "REJECT",
        },
      }),
      "addAvailabilityException",
    );
    if (added.__typename !== "AddAvailabilityExceptionSuccess") {
      fail(
        "teacher.permittedAction",
        `the Availability Exception was refused with ${added.code ?? added.__typename}`,
      );
    }
    const removed = fieldOf<{ __typename: string; code?: string }>(
      "teacher.permittedAction",
      await graphql("teacher", "SmokeRemoveAvailabilityException", {
        input: { idempotencyKey: randomUUID(), exceptionId: added.exception!.id },
      }),
      "removeAvailabilityException",
    );
    if (removed.__typename !== "RemoveAvailabilityExceptionSuccess") {
      fail(
        "teacher.permittedAction",
        `removing the Availability Exception was refused with ${removed.code ?? removed.__typename}`,
      );
    }
    const availabilityAfter = fieldOf<{ exceptions: { id: string }[] }>(
      "teacher.permittedAction",
      await graphql("teacher", "SmokeTeacherAvailability"),
      "teacherAvailability",
    ).exceptions.length;
    if (availabilityAfter !== availabilityBefore) {
      fail(
        "teacher.permittedAction",
        `Teacher Availability carries ${availabilityAfter} exception(s), started with ${availabilityBefore}`,
      );
    }
    record(
      "teacher.permittedAction",
      "one Availability Exception was added and removed, leaving availability unchanged",
    );

    // Organization Manager. Reporting arrives for exactly one Organization, and
    // every Cohort in it is one this manager can also reach directly: the
    // Sponsorship boundary made observable from outside.
    const cohorts = fieldOf<{ id: string; organization: { id: string } }[]>(
      "organization.scopedReport",
      await graphql("organizationManager", "SmokeOrganizationCohorts"),
      "organizationCohorts",
    );
    const report = fieldOf<{
      organization: { id: string };
      attendance: { recordedCount: number; excludedUnrecordedCount: number };
      cohorts: { cohortId: string; sponsoredStudentCount: number }[];
    }>(
      "organization.scopedReport",
      await graphql("organizationManager", "SmokeOrganizationReport", { cohortId: null }),
      "organizationAttendanceAndProgressReport",
    );
    const outsideScope = cohorts.filter(
      (cohort) => cohort.organization.id !== report.organization.id,
    );
    if (outsideScope.length > 0) {
      fail(
        "organization.scopedReport",
        `${outsideScope.length} Cohort(s) belong to an Organization this report does not cover`,
      );
    }
    const unknownCohorts = report.cohorts.filter(
      (reported) => !cohorts.some((cohort) => cohort.id === reported.cohortId),
    );
    if (unknownCohorts.length > 0) {
      fail(
        "organization.scopedReport",
        `the report named ${unknownCohorts.length} Cohort(s) this Organization Manager cannot reach`,
      );
    }
    record(
      "organization.scopedReport",
      `one Organization's report covering ${report.cohorts.length} Cohort(s) and ${report.attendance.recordedCount} recorded attendance(s)`,
    );

    // Platform Administrator. One representative operation against synthetic
    // data — a Credit Adjustment, the administrator's canonical marketplace act
    // — and its reversal, so the shared Student's balance ends where it began.
    // Project Owner and deployment operations are not demonstrated here because
    // the application has none to demonstrate.
    const marketplace = fieldOf<{ generatedAt: string; attendance: { recordedCount: number } }>(
      "administrator.representativeOperation",
      await graphql("administrator", "SmokeMarketplaceReport"),
      "marketplaceOperationalReport",
    );
    const granted = fieldOf<{
      __typename: string;
      account?: { studentUserId: string; availableBalance: number };
      adjustmentCode?: string;
      conflictCode?: string;
    }>(
      "administrator.representativeOperation",
      await graphql("administrator", "SmokeAdjustCredits", {
        input: {
          idempotencyKey: randomUUID(),
          studentUserId,
          amount: 1,
          reason: "Deployed smoke Credit Adjustment",
        },
      }),
      "adjustClassCredits",
    );
    if (granted.__typename !== "AdjustClassCreditsSuccess") {
      fail(
        "administrator.representativeOperation",
        `the Credit Adjustment was refused with ${granted.adjustmentCode ?? granted.conflictCode ?? granted.__typename}`,
      );
    }
    if (granted.account!.availableBalance !== balanceBefore + 1) {
      fail(
        "administrator.representativeOperation",
        `the Credit Adjustment left ${granted.account!.availableBalance} Class Credits, expected ${balanceBefore + 1}`,
      );
    }
    const reversed = fieldOf<{
      __typename: string;
      account?: { availableBalance: number };
    }>(
      "administrator.representativeOperation",
      await graphql("administrator", "SmokeAdjustCredits", {
        input: {
          idempotencyKey: randomUUID(),
          studentUserId,
          amount: -1,
          reason: "Deployed smoke Credit Adjustment reversal",
        },
      }),
      "adjustClassCredits",
    );
    if (
      reversed.__typename !== "AdjustClassCreditsSuccess" ||
      reversed.account!.availableBalance !== balanceBefore
    ) {
      fail(
        "administrator.representativeOperation",
        `the reversal left ${reversed.account?.availableBalance ?? "no"} Class Credits, expected ${balanceBefore}`,
      );
    }
    record(
      "administrator.representativeOperation",
      `a marketplace report as of ${marketplace.generatedAt} and a Credit Adjustment that reversed cleanly`,
    );

    // Cross-role denial. Each replay reuses an identifier and a document from a
    // journey above under a role that must not reach it, which is the case a
    // per-role journey can never make on its own: every one of these requests
    // is known to succeed for somebody.
    await deniedTo(
      "crossRole.denied",
      "student",
      "SmokeRoster",
      "classRoster",
      { classSessionId: assignedSession.id, actingRole: "TEACHER" },
      assignedSession.id,
    );
    await deniedTo(
      "crossRole.denied",
      "organizationManager",
      "SmokeRoster",
      "classRoster",
      { classSessionId: assignedSession.id, actingRole: "TEACHER" },
      assignedSession.id,
    );
    await deniedTo(
      "crossRole.denied",
      "student",
      "SmokeMarketplaceReport",
      "marketplaceOperationalReport",
      {},
    );
    record(
      "crossRole.denied",
      "three replayed requests were refused under the wrong role without disclosing their subject",
    );

    // Audit. Every authenticated mutation the journey performed is in the
    // immutable history, under the correlation identifier this run carried
    // throughout.
    const auditLog = fieldOf<{
      __typename: string;
      entries?: { operation: string; outcome: string; correlationId: string }[];
      code?: string;
    }>(
      "audit.entriesRecorded",
      await graphql("administrator", "SmokeAudit", { filter: { correlationId } }),
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
    const missing = ["booking.created", "booking.cancelled", "class-credit.adjusted"].filter(
      (operation) => !audited.has(operation),
    );
    if (missing.length > 0) {
      fail("audit.entriesRecorded", `no Audit Entry for ${missing.join(", ")}`);
    }
    record(
      "audit.entriesRecorded",
      `${auditLog.entries!.length} correlated Audit Entries, including every mutation the journey made`,
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
