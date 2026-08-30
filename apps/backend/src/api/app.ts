import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  namedRegionalTimeZones,
  type Authenticator,
  type UserRole,
} from "@marketplace/core";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { createGraphQLError, createYoga } from "graphql-yoga";
import { sql } from "kysely";
import { z } from "zod";

import {
  loadRoleWorkspace,
  rememberRoleWorkspacePlace,
} from "../authorization/role-workspace-service.js";
import { administratorFor } from "../authorization/administrator-policy.js";
import { grantRoleAssignment, removeRoleAssignment, roleAssignmentAdministration } from "../authorization/role-assignment-service.js";
import { reactivateUser, suspendUser } from "../authorization/user-suspension-service.js";
import { anonymizeUser } from "../authorization/user-anonymization-service.js";
import { organizationManagerFor } from "../authorization/organization-manager-policy.js";
import { studentFor } from "../authorization/student-policy.js";
import { recordAdministrationAudit } from "../audit/administration-audit.js";
import {
  auditLogError,
  auditLogViewerFor,
  exportAuditLog,
  readAuditLog,
  recordAuditLogExportRefusal,
  type AuditLogViewer,
} from "../audit/audit-log-service.js";
import { administerAttendance, classRosterForViewer, recordAttendance } from "../attendance/attendance-service.js";
import { administrationAttendanceReviewRequests, decideAttendanceReview, requestAttendanceReview, studentAttendanceRecords } from "../attendance/attendance-review-service.js";
import { courseProgressForStudent } from "../attendance/course-progress-service.js";
import { administratorFeedbackAndRatings, redactLearningFeedback, redactSessionRatingComment, saveLearningFeedback, saveSessionRating, studentFeedbackAndRatings, teacherFeedbackWork } from "../feedback/feedback-service.js";
import { AUTH0_INTEGRATION } from "../auth/auth0-authenticator.js";
import { createAuthenticator } from "../auth/create-authenticator.js";
import { bookClassSession, bookingsForStudent, cancelBooking, rescheduleBooking } from "../booking/booking-service.js";
import {
  adjustClassCredits,
  administrationClassCredits,
  classCreditsForStudent,
} from "../class-credit/class-credit-service.js";
import { administrationClassSessions, changeClassSessionSeatCapacity, publishClassSession } from "../class-session/class-session-service.js";
import { administrationAbsenceRequests, cancelClassSession, reportAbsence, substituteTeacher, teacherAbsenceRequests, teacherAttendanceClassSessions, teacherClassSessions } from "../class-session/class-session-disruption-service.js";
import type { AppConfig } from "../config.js";
import type { Database } from "../database/database.js";
import type { WorkspacePlace } from "../database/types.js";
import {
  addLessonMaterial,
  administrationCurriculum,
  changeTeacherQualification,
  createCourse,
  createLessonUnit,
  publicTeacherProfile,
  reviseLessonMaterial,
  retireLessonUnit,
  placeLessonUnitInCourse,
  saveTeacherProfile,
  reviseLessonUnitIdentity,
  reviseCourseDetails,
  saveLocalizedTopic,
} from "../curriculum/curriculum-service.js";
import {
  addAvailabilityException,
  endTeacherAvailabilityRange,
  loadTeacherAvailability,
  previewTeacherAvailability,
  removeAvailabilityException,
  saveTeacherAvailabilityRange,
  teacherFor,
  type Weekday,
} from "../teacher-availability/teacher-availability-service.js";
import { classSessionDiscoveryOptions, discoverClassSessions, InvalidDiscoveryInput, InvalidStudentPlacement, setStudentPlacement, studentPlacements } from "../student-discovery/student-discovery-service.js";
import {
  processSubscriptionProviderEvent,
  scheduleSubscriptionCancellation,
  subscriptionForStudent,
  undoSubscriptionCancellation,
} from "../subscription/subscription-service.js";
import {
  acceptSponsorshipInvitation,
  declineSponsorshipInvitation,
  endSponsorshipAsOrganization,
  endSponsorshipAsStudent,
  inviteToSponsorship,
  sponsorshipForStudent,
  sponsorshipInvitationsForOrganization,
  sponsorshipInvitationsForStudent,
  sponsorshipsForOrganization,
} from "../sponsorship/sponsorship-service.js";
import { courseProgressSnapshotsForSponsorship } from "../sponsorship/course-progress-snapshot.js";
import { organizationAttendanceAndProgressReport, UnknownCohort } from "../sponsorship/organization-report-service.js";
import { marketplaceOperationalReport } from "../reporting/marketplace-report-service.js";
import {
  reportExportArtifact,
  reportExportError,
  reportExportsForRequester,
  requestReportExport,
  ReportExportUnavailable,
} from "../reporting/report-export-service.js";
import {
  reportingAuthorityFor,
  type ReportingAuthority,
} from "../authorization/reporting-authority.js";
import { InvalidReportRange, MissingDisplayTimeZone } from "../reporting/report-range.js";
import {
  addCohortMembership,
  cohortsForOrganization,
  createCohort,
  endCohortMembership,
  renameCohort,
} from "../sponsorship/cohort-service.js";
import { joinWaitlist, waitlistEntriesForStudent, withdrawWaitlist } from "../waitlist/waitlist-service.js";
import { notificationsForUser, openAdministratorTasks, resolveAdministratorTask, updateNotificationState, userForNotificationAccess } from "../notification/notification-service.js";
import { createSimulatedClassroomProvider, enterClassroom, learningAccessClassSessionsForViewer, learningAccessLessonUnitsForViewer, lessonMaterialsForViewer, type ClassroomProvider } from "../learning-access/learning-access-service.js";
import {
  InterfaceLocale,
  type Resolvers,
  UserRole as GraphQLUserRole,
  WorkspacePlace as GraphQLWorkspacePlace,
  WorkspaceRelationshipScope,
} from "./generated/resolvers.js";
import {
  loadPersistedOperationManifest,
  type PersistedOperationManifest,
} from "./persisted-operations.js";
import { createPublicBoundaryPlugin, refusal } from "./public-boundary.js";
import {
  correlationIdForRequest,
  currentCorrelationId,
  UNCORRELATED_OPERATION,
  withCorrelationId,
} from "./request-context.js";
import type { OperationalCounters } from "../observability/operational-counters.js";
import { createResourceBudgets, type ResourceBudgets } from "./resource-budget.js";

const typeDefs = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "schema.graphql"),
  "utf8",
);

const graphQLUserRoles: Record<UserRole, GraphQLUserRole> = {
  STUDENT: GraphQLUserRole.Student,
  TEACHER: GraphQLUserRole.Teacher,
  ORGANIZATION_MANAGER: GraphQLUserRole.OrganizationManager,
  PLATFORM_ADMINISTRATOR: GraphQLUserRole.PlatformAdministrator,
};

const userRolesByGraphQL: Record<GraphQLUserRole, UserRole> = {
  [GraphQLUserRole.Student]: "STUDENT",
  [GraphQLUserRole.Teacher]: "TEACHER",
  [GraphQLUserRole.OrganizationManager]: "ORGANIZATION_MANAGER",
  [GraphQLUserRole.PlatformAdministrator]: "PLATFORM_ADMINISTRATOR",
};

const defaultWorkspacePlaces: Record<UserRole, WorkspacePlace> = {
  STUDENT: "STUDENT_DISCOVERY",
  TEACHER: "TEACHER_SCHEDULE",
  ORGANIZATION_MANAGER: "ORGANIZATION_STUDENTS",
  PLATFORM_ADMINISTRATOR: "ADMINISTRATION_OPERATIONS",
};

const graphQLWorkspacePlaces: Record<WorkspacePlace, GraphQLWorkspacePlace> = {
  STUDENT_DISCOVERY: GraphQLWorkspacePlace.StudentDiscovery,
  STUDENT_LEARNING: GraphQLWorkspacePlace.StudentLearning,
  TEACHER_SCHEDULE: GraphQLWorkspacePlace.TeacherSchedule,
  TEACHER_AVAILABILITY: GraphQLWorkspacePlace.TeacherAvailability,
  ORGANIZATION_STUDENTS: GraphQLWorkspacePlace.OrganizationStudents,
  ORGANIZATION_REPORTS: GraphQLWorkspacePlace.OrganizationReports,
  ADMINISTRATION_OPERATIONS: GraphQLWorkspacePlace.AdministrationOperations,
  ADMINISTRATION_PEOPLE: GraphQLWorkspacePlace.AdministrationPeople,
  ADMINISTRATION_REPORTS: GraphQLWorkspacePlace.AdministrationReports,
};

const workspacePlacesByGraphQL: Record<GraphQLWorkspacePlace, WorkspacePlace> = {
  [GraphQLWorkspacePlace.StudentDiscovery]: "STUDENT_DISCOVERY",
  [GraphQLWorkspacePlace.StudentLearning]: "STUDENT_LEARNING",
  [GraphQLWorkspacePlace.TeacherSchedule]: "TEACHER_SCHEDULE",
  [GraphQLWorkspacePlace.TeacherAvailability]: "TEACHER_AVAILABILITY",
  [GraphQLWorkspacePlace.OrganizationStudents]: "ORGANIZATION_STUDENTS",
  [GraphQLWorkspacePlace.OrganizationReports]: "ORGANIZATION_REPORTS",
  [GraphQLWorkspacePlace.AdministrationOperations]: "ADMINISTRATION_OPERATIONS",
  [GraphQLWorkspacePlace.AdministrationPeople]: "ADMINISTRATION_PEOPLE",
  [GraphQLWorkspacePlace.AdministrationReports]: "ADMINISTRATION_REPORTS",
};

const relationshipScopesByRole: Record<UserRole, WorkspaceRelationshipScope> = {
  STUDENT: WorkspaceRelationshipScope.Self,
  TEACHER: WorkspaceRelationshipScope.AssignedClassSessions,
  ORGANIZATION_MANAGER: WorkspaceRelationshipScope.AssignedOrganization,
  PLATFORM_ADMINISTRATOR: WorkspaceRelationshipScope.MarketplaceWide,
};

const validDisplayTimeZones = new Set(namedRegionalTimeZones());
const rescheduleBookingInputSchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  bookingId: z.uuid(),
  replacementClassSessionId: z.uuid(),
});
const joinWaitlistInputSchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  classSessionId: z.uuid(),
});
const withdrawWaitlistInputSchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  waitlistEntryId: z.uuid(),
});

/**
 * A Topic's identity and its two labels, bounded here rather than only by the
 * database check behind them: an administrator-supplied key that reached
 * PostgreSQL malformed would come back as an unexplained internal failure
 * instead of a statement of what the input has to be (ADR 0016).
 */
const localizedTopicInputSchema = z.object({
  key: z.string().regex(/^[A-Z]{2,8}$/),
  labelEn: z.string().trim().min(1).max(80),
  labelEs: z.string().trim().min(1).max(80),
});

const cohortNameSchema = z.string().trim().min(1).max(120);
const createCohortInputSchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  name: cohortNameSchema,
});
const renameCohortInputSchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  cohortId: z.uuid(),
  name: cohortNameSchema,
});
const addCohortMembershipInputSchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  cohortId: z.uuid(),
  sponsorshipId: z.uuid(),
  effectiveFrom: z.iso.datetime().nullish(),
  effectiveUntil: z.iso.datetime().nullish(),
});
const endCohortMembershipInputSchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  cohortMembershipId: z.uuid(),
  effectiveUntil: z.iso.datetime().nullish(),
});
const auditLogFilterInputSchema = z.object({
  fromLocalDate: z.iso.date().nullish(),
  toLocalDate: z.iso.date().nullish(),
  outcome: z.enum(["SUCCEEDED", "DENIED", "FAILED"]).nullish(),
  actingRole: z.enum(["STUDENT", "TEACHER", "ORGANIZATION_MANAGER", "PLATFORM_ADMINISTRATOR"]).nullish(),
  operation: z.string().trim().max(200).nullish(),
  actorUserId: z.uuid().nullish(),
  correlationId: z.string().trim().max(200).nullish(),
  after: z.string().min(1).max(500).nullish(),
}).strict();

const requestReportExportInputSchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  kind: z.enum(["ORDINARY", "CORRECTION_HISTORY"]),
  fromLocalDate: z.iso.date(),
  toLocalDate: z.iso.date(),
});
const endSponsorshipAsOrganizationInputSchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  sponsorshipId: z.uuid(),
});

function graphQLInterfaceLocale(locale: "en" | "es" | null) {
  if (locale === null) return null;
  return locale === "es" ? InterfaceLocale.Es : InterfaceLocale.En;
}

function graphQLResult<T>(value: unknown): T {
  return value as T;
}

export interface ApiContext {
  authenticator: Authenticator;
  correlationId: string;
  db: Database;
  request: Request;
}

export function createApi(options: {
  authMode: AppConfig["AUTH_MODE"];
  db: Database;
  nodeEnv: AppConfig["NODE_ENV"];
  auth0Audience?: string;
  auth0Issuer?: string;
  now?: () => Date;
  classroomProvider?: ClassroomProvider;
  /**
   * Whether this API is the public boundary of ADR 0024, ADR 0025, and ADR
   * 0028: only build-produced persisted operations execute, ADR 0025's per-User
   * budgets are charged, and no cross-origin CORS policy is offered. Production
   * always is; a suite proving the boundary asks for it explicitly, because
   * production also refuses the fake authenticator those suites depend on.
   */
  enforcesPublicBoundary?: boolean;
  /** ADR 0025's thresholds, which a suite narrows to reach them deliberately. */
  resourceBudgets?: ResourceBudgets;
  /**
   * The operations this API executes. A deployment passes the manifest widened
   * by ADR 0038's rollout window; anything else runs this build's own.
   */
  persistedOperations?: PersistedOperationManifest;
  /** Where a denied authorization is counted for the operator guide's abuse threshold. */
  operationalCounters?: OperationalCounters;
}) {
  const clock = options.now ?? (() => new Date());
  const counters = options.operationalCounters;
  const authenticatorPromise = createAuthenticator(
    {
      AUTH_MODE: options.authMode,
      AUTH0_AUDIENCE: options.auth0Audience,
      AUTH0_ISSUER: options.auth0Issuer,
      NODE_ENV: options.nodeEnv,
    },
    // The operator guide evaluates a third-party integration on actual calls
    // rather than by polling the provider, and this is where the deployment
    // actually calls Auth0.
    counters
      ? {
          onBoundaryFailure: ({ safeFailureCode }) =>
            counters.recordIntegrationFailure(
              {
                integration: AUTH0_INTEGRATION,
                safeFailureCode,
                // The operation in flight, never a fresh identifier: the guide
                // reads how many correlations a run of failures spans to tell
                // one retried operation from a boundary that is down, and a
                // unique value per failure would make every run look like the
                // latter. A failure reached from no operation says so once,
                // under one bucket, rather than inflating that count.
                correlationId: currentCorrelationId() ?? UNCORRELATED_OPERATION,
              },
              clock().getTime(),
            ),
        }
      : {},
  );
  const classroomProvider = options.classroomProvider ?? createSimulatedClassroomProvider();
  const enforcesPublicBoundary =
    options.enforcesPublicBoundary ?? options.nodeEnv === "production";
  const budgets = options.resourceBudgets ?? createResourceBudgets();
  // Resolved regardless of enforcement so a persisted identifier means the same
  // thing everywhere: the deployed release journey sends one against every
  // environment it runs in, including a local server.
  const persistedOperations = options.persistedOperations ?? loadPersistedOperationManifest();

  const resolvers: Resolvers<ApiContext> = {
      CreateCourseResult: { __resolveType: (value) => value.__typename! },
      UpdateCourseResult: { __resolveType: (value) => value.__typename! },
      CreateLessonUnitResult: { __resolveType: (value) => value.__typename! },
      UpdateLessonUnitResult: { __resolveType: (value) => value.__typename! },
      ReorderLessonUnitResult: { __resolveType: (value) => value.__typename! },
      RetireLessonUnitResult: { __resolveType: (value) => value.__typename! },
      AddLessonMaterialResult: { __resolveType: (value) => value.__typename! },
      ReviseLessonMaterialResult: { __resolveType: (value) => value.__typename! },
      GrantTeacherQualificationResult: { __resolveType: (value) => value.__typename! },
      RemoveTeacherQualificationResult: { __resolveType: (value) => value.__typename! },
      SaveTeacherAvailabilityRangeResult: { __resolveType: (value) => value.__typename! },
      AddAvailabilityExceptionResult: { __resolveType: (value) => value.__typename! },
      EndTeacherAvailabilityRangeResult: { __resolveType: (value) => value.__typename! },
      RemoveAvailabilityExceptionResult: { __resolveType: (value) => value.__typename! },
      PublishClassSessionResult: { __resolveType: (value) => value.__typename! },
      ChangeClassSessionSeatCapacityResult: { __resolveType: (value) => value.__typename! },
      AdjustClassCreditsResult: { __resolveType: (value) => value.__typename! },
      ProcessSubscriptionProviderEventResult: { __resolveType: (value) => value.__typename! },
      ScheduleSubscriptionCancellationResult: { __resolveType: (value) => value.__typename! },
      UndoSubscriptionCancellationResult: { __resolveType: (value) => value.__typename! },
      BookClassSessionResult: { __resolveType: (value) => value.__typename! },
      CancelBookingResult: { __resolveType: (value) => value.__typename! },
      RescheduleBookingResult: { __resolveType: (value) => value.__typename! },
      JoinWaitlistResult: { __resolveType: (value) => value.__typename! },
      WithdrawWaitlistResult: { __resolveType: (value) => value.__typename! },
      ResolveAdministratorTaskResult: { __resolveType: (value) => value.__typename! },
      AnonymizeUserResult: { __resolveType: (value) => value.__typename! },
      RecordAttendanceResult: { __resolveType: (value) => value.__typename! },
      RequestAttendanceReviewResult: { __resolveType: (value) => value.__typename! },
      DecideAttendanceReviewResult: { __resolveType: (value) => value.__typename! },
      SaveLearningFeedbackResult: { __resolveType: (value) => value.__typename! },
      RedactLearningFeedbackResult: { __resolveType: (value) => value.__typename! },
      SaveSessionRatingResult: { __resolveType: (value) => value.__typename! },
      RedactSessionRatingCommentResult: { __resolveType: (value) => value.__typename! },
      EnterClassroomResult: { __resolveType: (value) => value.__typename! },
      InviteToSponsorshipResult: { __resolveType: (value) => value.__typename! },
      AcceptSponsorshipInvitationResult: { __resolveType: (value) => value.__typename! },
      DeclineSponsorshipInvitationResult: { __resolveType: (value) => value.__typename! },
      EndSponsorshipAsOrganizationResult: { __resolveType: (value) => value.__typename! },
      EndSponsorshipAsStudentResult: { __resolveType: (value) => value.__typename! },
      CreateCohortResult: { __resolveType: (value) => value.__typename! },
      RenameCohortResult: { __resolveType: (value) => value.__typename! },
      AddCohortMembershipResult: { __resolveType: (value) => value.__typename! },
      EndCohortMembershipResult: { __resolveType: (value) => value.__typename! },
      RequestReportExportResult: { __resolveType: (value) => value.__typename! },
      AuditLogResult: { __resolveType: (value) => value.__typename! },
      AuditLogExportResult: { __resolveType: (value) => value.__typename! },
      GrantRoleAssignmentResult: { __resolveType: (value) => value.__typename! },
      RemoveRoleAssignmentResult: { __resolveType: (value) => value.__typename! },
      SuspendUserResult: { __resolveType: (value) => value.__typename! },
      ReactivateUserResult: { __resolveType: (value) => value.__typename! },
      Sponsorship: {
        progressSnapshots: async (parent, _arguments, context) =>
          graphQLResult(await courseProgressSnapshotsForSponsorship(context.db, parent.id)),
      },
      Query: {
        notifications: async (_parent, _arguments, context) => {
          const user = await authenticateNotificationUser(context);
          return graphQLResult(await notificationsForUser(context.db, user));
        },
        administratorTasks: async (_parent, _arguments, context) => {
          await authenticateAdministrator(context, "administrator-task.read", "AdministratorTaskItem");
          const tasks = await openAdministratorTasks(context.db);
          return graphQLResult(tasks.map((task) => ({
            id: task.id,
            requiredRole: GraphQLUserRole.PlatformAdministrator,
            kind: task.kind,
            state: task.state,
            correlationReference: task.correlation_reference,
            safeContext: task.safe_context,
            createdAt: task.created_at.toISOString(),
            resolvedAt: task.resolved_at?.toISOString() ?? null,
          })));
        },
        roleAssignmentAdministration: async (_parent, _arguments, context) => {
          await authenticateAdministrator(context, "role-assignment-administration.read", "User");
          return graphQLResult(await roleAssignmentAdministration(context.db));
        },
        studentWaitlistEntries: async (_parent, _arguments, context) => {
          const student = await authenticateStudent(context, "waitlist-entry.read", "WaitlistEntry");
          return graphQLResult(await waitlistEntriesForStudent(context.db, student.id));
        },
        studentPlacements: async (_parent, _arguments, context) => {
          const student = await authenticateStudent(context, "student-placement.read", "StudentPlacement");
          return graphQLResult(await studentPlacements(context.db, student));
        },
        classSessionDiscoveryOptions: async (_parent, _arguments, context) => {
          const student = await authenticateStudent(context, "class-session-discovery-options.read", "ClassSessionDiscovery");
          return graphQLResult(await classSessionDiscoveryOptions(context.db, student));
        },
        studentSubscription: async (_parent, _arguments, context) => {
          const student = await authenticateStudent(context, "subscription.read", "Subscription");
          return graphQLResult(await subscriptionForStudent(context.db, student.id));
        },
        studentSponsorship: async (_parent, _arguments, context) => {
          const student = await authenticateStudent(context, "sponsorship.read", "Sponsorship");
          return graphQLResult(await sponsorshipForStudent(context.db, student.id));
        },
        studentSponsorshipInvitations: async (_parent, _arguments, context) => {
          const student = await authenticateStudent(context, "sponsorship-invitation.read", "SponsorshipInvitation");
          return graphQLResult(await sponsorshipInvitationsForStudent(context.db, student));
        },
        organizationSponsorshipInvitations: async (_parent, _arguments, context) => {
          const organizationManager = await authenticateOrganizationManager(context, "sponsorship-invitation.read");
          return graphQLResult(await sponsorshipInvitationsForOrganization(context.db, organizationManager));
        },
        organizationSponsoredStudents: async (_parent, _arguments, context) => {
          const organizationManager = await authenticateOrganizationManager(context, "sponsorship.read");
          return graphQLResult(await sponsorshipsForOrganization(context.db, organizationManager));
        },
        organizationCohorts: async (_parent, _arguments, context) => {
          const organizationManager = await authenticateOrganizationManager(context, "cohort.read", "Cohort");
          return graphQLResult(await cohortsForOrganization(context.db, organizationManager));
        },
        organizationAttendanceAndProgressReport: async (_parent, { cohortId }, context) => {
          const operation = "organization-report.read";
          const organizationManager = await authenticateOrganizationManager(context, operation, "OrganizationReport");
          try {
            return graphQLResult(await organizationAttendanceAndProgressReport(
              context.db,
              organizationManager,
              { cohortId },
              options.now?.() ?? new Date(),
            ));
          } catch (error) {
            if (!(error instanceof UnknownCohort)) throw error;
            // A Cohort outside the caller's Organization must not be confirmed by the
            // shape of the denial, so this reads as Not Found while the Audit Entry
            // keeps the real reason.
            await context.db.insertInto("audit_entries").values({
              actor_user_id: organizationManager.id,
              acting_role: "ORGANIZATION_MANAGER",
              operation,
              target_type: "Cohort",
              target_id: cohortId!,
              outcome: "DENIED",
              reason_code: "COHORT_OUTSIDE_ORGANIZATION",
              correlation_id: context.correlationId,
            }).execute();
            throw createGraphQLError("The Cohort was not found", { extensions: { code: "NOT_FOUND" } });
          }
        },
        marketplaceOperationalReport: async (_parent, { input }, context) => {
          const operation = "marketplace-report.read";
          const administrator = await authenticateAdministrator(context, operation, "MarketplaceReport");
          try {
            return graphQLResult(await marketplaceOperationalReport(
              context.db,
              administrator,
              input ?? {},
              options.now?.() ?? new Date(),
            ));
          } catch (error) {
            const reasonCode = error instanceof InvalidReportRange
              ? "INVALID_REPORT_RANGE"
              : error instanceof MissingDisplayTimeZone ? "DISPLAY_TIME_ZONE_REQUIRED" : null;
            if (!reasonCode) throw error;
            // A refused read of marketplace-wide reporting leaves the same
            // privacy-safe evidence a role denial does, naming which of the two
            // reasons refused it.
            await recordAdministrationAudit(context.db, {
              administratorId: administrator.id,
              correlationId: context.correlationId,
              operation,
              targetType: "MarketplaceReport",
              targetId: administrator.id,
              outcome: "DENIED",
              reasonCode,
            });
            throw createGraphQLError((error as Error).message, { extensions: { code: "BAD_USER_INPUT" } });
          }
        },
        reportExports: async (_parent, _arguments, context) => {
          const requester = await authenticateReportExportRequester(context, "report-export.read");
          return graphQLResult(await reportExportsForRequester(context.db, requester, options.now?.() ?? new Date()));
        },
        reportExportArtifact: async (_parent, { id }, context) => {
          const requester = await authenticateReportExportRequester(context, "report-export.downloaded");
          try {
            return graphQLResult(await reportExportArtifact(
              context.db,
              requester,
              id,
              context.correlationId,
              options.now?.() ?? new Date(),
            ));
          } catch (error) {
            if (!(error instanceof ReportExportUnavailable)) throw error;
            // The refusal reason is already audited; the caller learns only that the
            // artifact is unavailable, never whose export the identifier named.
            throw createGraphQLError(error.message, {
              extensions: { code: error.code === "REPORT_EXPORT_NOT_FOUND" ? "NOT_FOUND" : "BAD_USER_INPUT" },
            });
          }
        },
        auditLog: async (_parent, { filter }, context) => {
          const viewer = await authenticateAuditLogViewer(context, "audit-log.read");
          const validatedFilter = auditLogFilterInputSchema.safeParse(filter ?? {});
          if (!validatedFilter.success) {
            return graphQLResult(auditLogError("INVALID_AUDIT_LOG_FILTER", "Choose valid Audit Log filters."));
          }
          return graphQLResult(await readAuditLog(
            context.db,
            viewer,
            validatedFilter.data,
            options.now?.() ?? new Date(),
          ));
        },
        auditLogExport: async (_parent, { filter }, context) => {
          const viewer = await authenticateAuditLogViewer(context, "audit-log.exported");
          const validatedFilter = auditLogFilterInputSchema.safeParse(filter ?? {});
          if (!validatedFilter.success) {
            await recordAuditLogExportRefusal(context.db, viewer, "INVALID_AUDIT_LOG_FILTER", context.correlationId);
            return graphQLResult(auditLogError("INVALID_AUDIT_LOG_FILTER", "Choose valid Audit Log filters."));
          }
          return graphQLResult(await exportAuditLog(
            context.db,
            viewer,
            validatedFilter.data,
            context.correlationId,
            options.now?.() ?? new Date(),
          ));
        },
        discoverClassSessions: async (_parent, { input }, context) => {
          const student = await authenticateStudent(context, "class-session-discovery.read", "ClassSessionDiscovery");
          try {
            return graphQLResult(await discoverClassSessions(
              context.db,
              student,
              input,
              options.now?.() ?? new Date(),
            ));
          } catch (error) {
            if (error instanceof InvalidDiscoveryInput) {
              throw createGraphQLError(error.message, { extensions: { code: "BAD_USER_INPUT" } });
            }
            throw error;
          }
        },
        studentClassCredits: async (_parent, _arguments, context) => {
          const student = await authenticateStudent(context, "class-credit.read");
          return graphQLResult(await classCreditsForStudent(context.db, student.id));
        },
        studentBookings: async (_parent, _arguments, context) => {
          const student = await authenticateStudent(context, "booking-history.read", "Booking");
          return graphQLResult(await bookingsForStudent(context.db, student.id));
        },
        studentCourseProgress: async (_parent, _arguments, context) => {
          const student = await authenticateStudent(context, "course-progress.read", "CourseProgress");
          return graphQLResult(await courseProgressForStudent(context.db, student.id));
        },
        lessonMaterials: async (_parent, { lessonUnitId, actingRole: requestedRole }, context) => {
          const identity = await context.authenticator.authenticate(context.request);
          if (!identity) throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
          const result = await lessonMaterialsForViewer(context.db, identity, userRolesByGraphQL[requestedRole], lessonUnitId, context.correlationId, options.now?.() ?? new Date());
          if (result.status === "UNKNOWN_USER") throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
          if (result.status === "ROLE_REQUIRED") throw createGraphQLError("The selected Role Assignment is required", { extensions: { code: "FORBIDDEN" } });
          if (result.status === "NOT_FOUND") throw createGraphQLError("The Lesson Materials were not found", { extensions: { code: "NOT_FOUND" } });
          return graphQLResult(result.materials);
        },
        learningAccessClassSessions: async (_parent, { actingRole: requestedRole }, context) => {
          const identity = await context.authenticator.authenticate(context.request);
          if (!identity) throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
          const result = await learningAccessClassSessionsForViewer(context.db, identity, userRolesByGraphQL[requestedRole], context.correlationId, options.now?.() ?? new Date());
          if (result.status === "UNKNOWN_USER") throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
          if (result.status === "ROLE_REQUIRED") throw createGraphQLError("The selected Role Assignment is required", { extensions: { code: "FORBIDDEN" } });
          return graphQLResult(result.sessions);
        },
        learningAccessLessonUnits: async (_parent, { actingRole: requestedRole }, context) => {
          const identity = await context.authenticator.authenticate(context.request);
          if (!identity) throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
          const result = await learningAccessLessonUnitsForViewer(context.db, identity, userRolesByGraphQL[requestedRole], context.correlationId, options.now?.() ?? new Date());
          if (result.status === "UNKNOWN_USER") throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
          if (result.status === "ROLE_REQUIRED") throw createGraphQLError("The selected Role Assignment is required", { extensions: { code: "FORBIDDEN" } });
          return graphQLResult(result.lessonUnits);
        },
        administrationClassCredits: async (_parent, { studentUserId }, context) => {
          await authenticateAdministrator(context, "class-credit-administration.read");
          return graphQLResult(await administrationClassCredits(context.db, studentUserId));
        },
        administrationClassSessions: async (_parent, _arguments, context) => {
          await authenticateAdministrator(context, "class-session-administration.read");
          return graphQLResult(await administrationClassSessions(context.db));
        },
        classRoster: async (_parent, { classSessionId, actingRole: requestedRole }, context) => {
          const identity = await context.authenticator.authenticate(context.request);
          if (!identity) throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
          const result = await classRosterForViewer(
            context.db,
            identity,
            userRolesByGraphQL[requestedRole],
            classSessionId,
            context.correlationId,
            options.now?.() ?? new Date(),
          );
          if (result.status === "UNKNOWN_USER") throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
          if (result.status === "NOT_FOUND") throw createGraphQLError("The Class Roster was not found", { extensions: { code: "NOT_FOUND" } });
          return graphQLResult(result.roster);
        },
        studentAttendanceRecords: async (_parent, _arguments, context) => {
          const student = await authenticateStudent(context, "attendance-record.read", "AttendanceRecord");
          return graphQLResult(await studentAttendanceRecords(context.db, student, options.now?.() ?? new Date()));
        },
        administrationAttendanceReviewRequests: async (_parent, _arguments, context) => {
          await authenticateAdministrator(context, "attendance-review.read", "AttendanceReviewRequest");
          return graphQLResult(await administrationAttendanceReviewRequests(context.db));
        },
        teacherClassSessions: async (_parent, _arguments, context) => {
          const teacher = await authenticateTeacher(context, "teacher-class-sessions.read");
          return graphQLResult(await teacherClassSessions(context.db, teacher, options.now?.() ?? new Date()));
        },
        teacherAttendanceClassSessions: async (_parent, _arguments, context) => {
          const teacher = await authenticateTeacher(context, "attendance-class-sessions.read");
          return graphQLResult(await teacherAttendanceClassSessions(context.db, teacher, options.now?.() ?? new Date()));
        },
        teacherFeedbackWork: async (_parent, _arguments, context) => {
          const teacher = await authenticateTeacher(context, "learning-feedback.read");
          return graphQLResult(await teacherFeedbackWork(context.db, teacher, options.now?.() ?? new Date()));
        },
        studentFeedbackAndRatings: async (_parent, _arguments, context) => {
          const student = await authenticateStudent(context, "learning-feedback-and-session-rating.read", "LearningFeedback");
          return graphQLResult(await studentFeedbackAndRatings(context.db, student));
        },
        administratorFeedbackAndRatings: async (_parent, _arguments, context) => {
          await authenticateAdministrator(context, "learning-feedback-and-session-rating.read", "LearningFeedback");
          return graphQLResult(await administratorFeedbackAndRatings(context.db));
        },
        teacherAbsenceRequests: async (_parent, _arguments, context) => {
          const teacher = await authenticateTeacher(context, "absence-request.read");
          return graphQLResult(await teacherAbsenceRequests(context.db, teacher));
        },
        administrationAbsenceRequests: async (_parent, _arguments, context) => {
          await authenticateAdministrator(context, "absence-request-administration.read");
          return graphQLResult(await administrationAbsenceRequests(context.db));
        },
        teacherAvailability: async (_parent, _arguments, context) => {
          const teacher = await authenticateTeacher(context, "teacher-availability.read");
          return graphQLResult(await loadTeacherAvailability(context.db, teacher));
        },
        teacherAvailabilityPreview: async (_parent, { localDates }, context) => {
          const teacher = await authenticateTeacher(context, "teacher-availability.read");
          if (localDates.length > 31) {
            throw createGraphQLError("At most 31 local dates may be previewed", { extensions: { code: "BAD_USER_INPUT" } });
          }
          try {
            return graphQLResult(await previewTeacherAvailability(context.db, teacher, localDates));
          } catch {
            throw createGraphQLError("Every preview date must be a valid calendar date", { extensions: { code: "BAD_USER_INPUT" } });
          }
        },
        administrationCurriculum: async (_parent, { locale }, context) => {
          const administrator = await authenticateAdministrator(context, "curriculum.read");
          void administrator;
          return graphQLResult(await administrationCurriculum(context.db, locale === InterfaceLocale.Es ? "es" : "en"));
        },
        publicTeacherProfile: async (_parent, { teacherUserId, locale }, context) =>
          graphQLResult(await publicTeacherProfile(context.db, teacherUserId, locale === InterfaceLocale.Es ? "es" : "en")),
        roleWorkspace: async (
          _parent,
          { actingRole: requestedGraphQLRole },
          context: ApiContext,
        ) => {
          const identity = await context.authenticator.authenticate(context.request);
          if (!identity) {
            throw createGraphQLError("Authentication is required", {
              extensions: { code: "UNAUTHENTICATED" },
            });
          }

          const actingRole = userRolesByGraphQL[requestedGraphQLRole];
          const result = await loadRoleWorkspace(
            context.db,
            identity,
            actingRole,
            context.correlationId,
          );

          if (result.status === "UNKNOWN_USER") {
            throw createGraphQLError("Authentication is required", {
              extensions: { code: "UNAUTHENTICATED" },
            });
          }
          if (result.status === "ROLE_ASSIGNMENT_REQUIRED") {
            throw createGraphQLError("The selected Role Assignment is required", {
              extensions: { code: "FORBIDDEN" },
            });
          }

          const rememberedByRole = new Map(
            result.rememberedPlaces.map(({ place, role }) => [role, place]),
          );
          return {
            actingRole: requestedGraphQLRole,
            relationshipScope: relationshipScopesByRole[actingRole],
            user: {
              id: result.user.id,
              displayName: result.user.displayName,
              displayTimeZone: result.user.displayTimeZone,
              interfaceLocale: graphQLInterfaceLocale(result.user.interfaceLocale),
            },
            rolePlaces: result.roles.map((role) => ({
              role: graphQLUserRoles[role],
              place:
                graphQLWorkspacePlaces[
                  rememberedByRole.get(role) ?? defaultWorkspacePlaces[role]
                ],
            })),
          };
        },
        studentWorkspace: async (_parent, _arguments, context: ApiContext) => {
          const identity = await context.authenticator.authenticate(context.request);
          if (!identity) {
            throw createGraphQLError("Authentication is required", {
              extensions: { code: "UNAUTHENTICATED" },
            });
          }

          const result = await context.db.transaction().execute(async (transaction) => {
            const user = await transaction
              .selectFrom("users")
              .select(["id", "display_name", "display_time_zone", "interface_locale"])
              .where("identity_issuer", "=", identity.issuer)
              .where("identity_subject", "=", identity.subject)
              .executeTakeFirst();
            if (!user) return null;

            const roles = await transaction
              .selectFrom("role_assignments")
              .select("role")
              .where("user_id", "=", user.id)
              .orderBy("role")
              .execute();
            const hasStudentRole = roles.some(({ role }) => role === "STUDENT");

            await transaction
              .insertInto("audit_entries")
              .values({
                actor_user_id: user.id,
                acting_role: hasStudentRole ? "STUDENT" : null,
                operation: "student-workspace.opened",
                target_type: "User",
                target_id: user.id,
                outcome: hasStudentRole ? "SUCCEEDED" : "DENIED",
                reason_code: hasStudentRole
                  ? "WORKSPACE_OPENED"
                  : "STUDENT_ROLE_REQUIRED",
                correlation_id: context.correlationId,
              })
              .execute();

            return { hasStudentRole, roles, user };
          });

          if (!result) {
            throw createGraphQLError("Authentication is required", {
              extensions: { code: "UNAUTHENTICATED" },
            });
          }

          if (!result.hasStudentRole) {
            throw createGraphQLError("The Student Role Assignment is required", {
              extensions: { code: "FORBIDDEN" },
            });
          }

          return {
            user: {
              id: result.user.id,
              displayName: result.user.display_name,
              displayTimeZone: result.user.display_time_zone,
              interfaceLocale: graphQLInterfaceLocale(result.user.interface_locale),
            },
            roles: result.roles.map(({ role }) => graphQLUserRoles[role]),
          };
        },
      },
      Mutation: {
        enterClassroom: async (_parent, { input }, context) => {
          const identity = await context.authenticator.authenticate(context.request);
          if (!identity) throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
          const user = await userForNotificationAccess(context.db, identity);
          if (!user) throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
          const actingRole = userRolesByGraphQL[input.actingRole];
          const access = await activeActorMutation(context, user.id, actingRole, "classroom.entered", "ClassSession", (transaction) =>
            enterClassroom(
              transaction,
              classroomProvider,
              identity,
              actingRole,
              input.classSessionId,
              context.correlationId,
              options.now?.() ?? new Date(),
            ));
          if (access.status === "UNKNOWN_USER") throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
          if (access.status === "ROLE_REQUIRED") throw createGraphQLError("The selected Role Assignment is required", { extensions: { code: "FORBIDDEN" } });
          return graphQLResult(access.result);
        },
        markNotificationRead: async (_parent, { id }, context) => {
          const user = await authenticateNotificationUser(context);
          const updated = await activeActorMutation(context, user.id, null, "notification.mark-read", "Notification", (transaction) =>
            updateNotificationState(transaction, { notificationId: id, userId: user.id, action: "READ", correlationId: context.correlationId, now: options.now?.() ?? new Date() }));
          if (!updated) throw createGraphQLError("The notification is unavailable", { extensions: { code: "FORBIDDEN" } });
          return graphQLResult((await notificationsForUser(context.db, user)).find((notification) => notification.id === id)!);
        },
        archiveNotification: async (_parent, { id }, context) => {
          const user = await authenticateNotificationUser(context);
          const updated = await activeActorMutation(context, user.id, null, "notification.archive", "Notification", (transaction) =>
            updateNotificationState(transaction, { notificationId: id, userId: user.id, action: "ARCHIVE", correlationId: context.correlationId, now: options.now?.() ?? new Date() }));
          if (!updated) throw createGraphQLError("The notification is unavailable", { extensions: { code: "FORBIDDEN" } });
          return graphQLResult({ id: updated.id, messageId: updated.message_id, renderedContent: "", readAt: updated.read_at?.toISOString() ?? null, archivedAt: updated.archived_at?.toISOString() ?? null, createdAt: updated.created_at.toISOString() });
        },
        resolveAdministratorTask: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "administrator-task.resolve", "AdministratorTaskItem");
          return graphQLResult(await idempotentAdministrationMutation(
            context,
            administrator,
            "administrator-task.resolve",
            input.idempotencyKey,
            input,
            async (transaction) => {
              if (input.reason.trim().length < 10 || input.reason.length > 500) return { __typename: "AdministratorTaskError", code: "INVALID_REASON", message: "Give a concise resolution reason between 10 and 500 characters." };
              const task = await resolveAdministratorTask(transaction, administrator.id, input.taskId, input.reason.trim(), context.correlationId, options.now?.() ?? new Date());
              if (!task) return { __typename: "AdministratorTaskError", code: "TASK_NOT_OPEN", message: "The administrator task is not open." };
              return { __typename: "ResolveAdministratorTaskSuccess", task: { id: task.id, requiredRole: GraphQLUserRole.PlatformAdministrator, kind: task.kind, state: task.state, correlationReference: task.correlation_reference, safeContext: task.safe_context, createdAt: task.created_at.toISOString(), resolvedAt: task.resolved_at?.toISOString() ?? null } };
            },
            { __typename: "AdministratorTaskError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
          ));
        },
        grantRoleAssignment: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "role-assignment.granted", "User");
          return graphQLResult(await idempotentAdministrationMutation(
            context,
            administrator,
            "role-assignment.granted",
            input.idempotencyKey,
            input,
            (transaction) => grantRoleAssignment(transaction, administrator, {
              userId: input.userId,
              role: userRolesByGraphQL[input.role],
              reason: input.reason,
              organizationId: input.organizationId ?? null,
            }, context.correlationId),
            { __typename: "RoleAssignmentError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input.", classSessionIds: [] },
            "User",
          ));
        },
        removeRoleAssignment: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "role-assignment.removed", "User");
          return graphQLResult(await idempotentAdministrationMutation(
            context,
            administrator,
            "role-assignment.removed",
            input.idempotencyKey,
            input,
            (transaction) => removeRoleAssignment(transaction, administrator, {
              userId: input.userId,
              role: userRolesByGraphQL[input.role],
              reason: input.reason,
              organizationId: input.organizationId ?? null,
            }, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "RoleAssignmentError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input.", classSessionIds: [] },
            "User",
          ));
        },
        suspendUser: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "user.suspended", "User");
          if (options.nodeEnv === "production") {
            await recordAdministrationAudit(context.db, { administratorId: administrator.id, correlationId: context.correlationId, operation: "user.suspended", targetType: "User", targetId: input.userId, outcome: "DENIED", reasonCode: "PUBLIC_DEMONSTRATION_PROTECTED" });
            return graphQLResult({ __typename: "UserAccessError", code: "PUBLIC_DEMONSTRATION_PROTECTED", message: "User Suspension is unavailable in the public demonstration." });
          }
          return graphQLResult(await idempotentAdministrationMutation(
            context,
            administrator,
            "user.suspended",
            input.idempotencyKey,
            input,
            (transaction) => suspendUser(transaction, administrator, { userId: input.userId, reason: input.reason }, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "UserAccessError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "User",
          ));
        },
        reactivateUser: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "user.reactivated", "User");
          if (options.nodeEnv === "production") {
            await recordAdministrationAudit(context.db, { administratorId: administrator.id, correlationId: context.correlationId, operation: "user.reactivated", targetType: "User", targetId: input.userId, outcome: "DENIED", reasonCode: "PUBLIC_DEMONSTRATION_PROTECTED" });
            return graphQLResult({ __typename: "UserAccessError", code: "PUBLIC_DEMONSTRATION_PROTECTED", message: "User reactivation is unavailable in the public demonstration." });
          }
          return graphQLResult(await idempotentAdministrationMutation(
            context,
            administrator,
            "user.reactivated",
            input.idempotencyKey,
            input,
            (transaction) => reactivateUser(transaction, administrator, { userId: input.userId }, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "UserAccessError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "User",
          ));
        },
        anonymizeUser: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "user.anonymized", "User");
          if (options.nodeEnv === "production") {
            await recordAdministrationAudit(context.db, { administratorId: administrator.id, correlationId: context.correlationId, operation: "user.anonymized", targetType: "User", targetId: input.userId, outcome: "DENIED", reasonCode: "PUBLIC_DEMONSTRATION_PROTECTED" });
            return graphQLResult({ __typename: "AnonymizeUserError", code: "PUBLIC_DEMONSTRATION_PROTECTED", message: "User Anonymization is unavailable in the public demonstration.", classSessionIds: [] });
          }
          return graphQLResult(await idempotentAdministrationMutation(
            context,
            administrator,
            "user.anonymized",
            input.idempotencyKey,
            input,
            (transaction) => anonymizeUser(transaction, administrator, { userId: input.userId, reason: input.reason, confirmation: input.confirmation }, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "AnonymizeUserError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input.", classSessionIds: [] },
            "User",
          ));
        },
        processSubscriptionProviderEvent: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "subscription.provider-event.processed");
          if (options.nodeEnv === "production") {
            await recordAdministrationAudit(context.db, { administratorId: administrator.id, correlationId: context.correlationId, operation: "subscription.provider-event.processed", targetType: "Subscription", targetId: input.studentUserId, outcome: "DENIED", reasonCode: "PROVIDER_EVENT_COMMAND_DISABLED_IN_PUBLIC_DEMO" });
            throw createGraphQLError("Subscription Provider Event simulation is unavailable in the public demonstration", { extensions: { code: "FORBIDDEN" } });
          }
          return graphQLResult(await idempotentAdministrationMutation(
            context,
            administrator,
            "subscription.provider-event.processed",
            input.idempotencyKey,
            input,
            (transaction) => processSubscriptionProviderEvent(transaction, administrator, input, context.correlationId),
            { __typename: "SubscriptionConflict", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
          ));
        },
        scheduleSubscriptionCancellation: async (_parent, { input }, context) => {
          const student = await authenticateStudent(context, "subscription.cancellation-scheduled");
          return graphQLResult(await idempotentStudentMutation(
            context,
            student,
            "subscription.cancellation-scheduled",
            input.idempotencyKey,
            input,
            (transaction) => scheduleSubscriptionCancellation(transaction, student, context.correlationId),
          ));
        },
        undoSubscriptionCancellation: async (_parent, { input }, context) => {
          const student = await authenticateStudent(context, "subscription.cancellation-undone");
          return graphQLResult(await idempotentStudentMutation(
            context,
            student,
            "subscription.cancellation-undone",
            input.idempotencyKey,
            input,
            (transaction) => undoSubscriptionCancellation(transaction, student, context.correlationId),
          ));
        },
        inviteToSponsorship: async (_parent, { input }, context) => {
          const organizationManager = await authenticateOrganizationManager(context, "sponsorship-invitation.created");
          return graphQLResult(await idempotentOrganizationManagerMutation(
            context,
            organizationManager,
            "sponsorship-invitation.created",
            input.idempotencyKey,
            input,
            (transaction) => inviteToSponsorship(transaction, organizationManager, input, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "SponsorshipInvitationError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
          ));
        },
        acceptSponsorshipInvitation: async (_parent, { input }, context) => {
          const student = await authenticateStudent(context, "sponsorship-invitation.accepted", "SponsorshipInvitation");
          return graphQLResult(await idempotentStudentMutation(
            context,
            student,
            "sponsorship-invitation.accepted",
            input.idempotencyKey,
            input,
            (transaction) => acceptSponsorshipInvitation(transaction, student, input, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "SponsorshipInvitationResponseError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "SponsorshipInvitation",
          ));
        },
        declineSponsorshipInvitation: async (_parent, { input }, context) => {
          const student = await authenticateStudent(context, "sponsorship-invitation.declined", "SponsorshipInvitation");
          return graphQLResult(await idempotentStudentMutation(
            context,
            student,
            "sponsorship-invitation.declined",
            input.idempotencyKey,
            input,
            (transaction) => declineSponsorshipInvitation(transaction, student, input, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "SponsorshipInvitationResponseError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "SponsorshipInvitation",
          ));
        },
        endSponsorshipAsOrganization: async (_parent, { input }, context) => {
          const organizationManager = await authenticateOrganizationManager(context, "sponsorship.terminated", "Sponsorship");
          const validatedInput = endSponsorshipAsOrganizationInputSchema.safeParse(input);
          if (!validatedInput.success) {
            throw createGraphQLError("Provide a valid Sponsorship identifier", { extensions: { code: "BAD_USER_INPUT" } });
          }
          return graphQLResult(await idempotentOrganizationManagerMutation(
            context,
            organizationManager,
            "sponsorship.terminated",
            validatedInput.data.idempotencyKey,
            validatedInput.data,
            (transaction) => endSponsorshipAsOrganization(transaction, organizationManager, validatedInput.data, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "SponsorshipBoundaryError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "Sponsorship",
          ));
        },
        endSponsorshipAsStudent: async (_parent, { input }, context) => {
          const student = await authenticateStudent(context, "sponsorship.terminated", "Sponsorship");
          return graphQLResult(await idempotentStudentMutation(
            context,
            student,
            "sponsorship.terminated",
            input.idempotencyKey,
            input,
            (transaction) => endSponsorshipAsStudent(transaction, student, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "SponsorshipBoundaryError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "Sponsorship",
          ));
        },
        createCohort: async (_parent, { input }, context) => {
          const organizationManager = await authenticateOrganizationManager(context, "cohort.created", "Cohort");
          const validatedInput = createCohortInputSchema.safeParse(input);
          if (!validatedInput.success) {
            throw createGraphQLError("Provide a Cohort name of 1 to 120 characters", { extensions: { code: "BAD_USER_INPUT" } });
          }
          return graphQLResult(await idempotentOrganizationManagerMutation(
            context,
            organizationManager,
            "cohort.created",
            validatedInput.data.idempotencyKey,
            validatedInput.data,
            (transaction) => createCohort(transaction, organizationManager, validatedInput.data, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "CohortError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "Cohort",
          ));
        },
        renameCohort: async (_parent, { input }, context) => {
          const organizationManager = await authenticateOrganizationManager(context, "cohort.renamed", "Cohort");
          const validatedInput = renameCohortInputSchema.safeParse(input);
          if (!validatedInput.success) {
            throw createGraphQLError("Provide a Cohort identifier and a name of 1 to 120 characters", { extensions: { code: "BAD_USER_INPUT" } });
          }
          return graphQLResult(await idempotentOrganizationManagerMutation(
            context,
            organizationManager,
            "cohort.renamed",
            validatedInput.data.idempotencyKey,
            validatedInput.data,
            (transaction) => renameCohort(transaction, organizationManager, validatedInput.data, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "CohortError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "Cohort",
          ));
        },
        addCohortMembership: async (_parent, { input }, context) => {
          const organizationManager = await authenticateOrganizationManager(context, "cohort-membership.created", "CohortMembership");
          const validatedInput = addCohortMembershipInputSchema.safeParse(input);
          if (!validatedInput.success) {
            throw createGraphQLError("Provide a Cohort, a Sponsorship, and valid membership instants", { extensions: { code: "BAD_USER_INPUT" } });
          }
          return graphQLResult(await idempotentOrganizationManagerMutation(
            context,
            organizationManager,
            "cohort-membership.created",
            validatedInput.data.idempotencyKey,
            validatedInput.data,
            (transaction) => addCohortMembership(transaction, organizationManager, validatedInput.data, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "CohortError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "CohortMembership",
          ));
        },
        requestReportExport: async (_parent, { input }, context) => {
          const operation = "report-export.requested";
          const requester = await authenticateReportExportRequester(context, operation);
          const validatedInput = requestReportExportInputSchema.safeParse(input);
          if (!validatedInput.success) {
            throw createGraphQLError("Provide an extract kind and a valid local date range", { extensions: { code: "BAD_USER_INPUT" } });
          }
          return graphQLResult(await idempotentActorMutation(
            context,
            requester,
            operation,
            validatedInput.data.idempotencyKey,
            validatedInput.data,
            (transaction) => requestReportExport(
              transaction,
              requester,
              validatedInput.data,
              context.correlationId,
              options.now?.() ?? new Date(),
            ),
            reportExportError("IDEMPOTENCY_KEY_REUSED", "The Idempotency Key was already used with different input."),
          ));
        },
        endCohortMembership: async (_parent, { input }, context) => {
          const organizationManager = await authenticateOrganizationManager(context, "cohort-membership.ended", "CohortMembership");
          const validatedInput = endCohortMembershipInputSchema.safeParse(input);
          if (!validatedInput.success) {
            throw createGraphQLError("Provide a Cohort membership identifier and a valid end instant", { extensions: { code: "BAD_USER_INPUT" } });
          }
          return graphQLResult(await idempotentOrganizationManagerMutation(
            context,
            organizationManager,
            "cohort-membership.ended",
            validatedInput.data.idempotencyKey,
            validatedInput.data,
            (transaction) => endCohortMembership(transaction, organizationManager, validatedInput.data, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "CohortError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "CohortMembership",
          ));
        },
        setStudentPlacement: async (_parent, { input }, context) => {
          const student = await authenticateStudent(context, "student-placement.changed", "StudentPlacement");
          try {
            return graphQLResult(await setStudentPlacement(
              context.db,
              student,
              input,
              context.correlationId,
            ));
          } catch (error) {
            if (error instanceof InvalidStudentPlacement) {
              throw createGraphQLError(error.message, { extensions: { code: "BAD_USER_INPUT" } });
            }
            throw error;
          }
        },
        adjustClassCredits: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "class-credit.adjusted");
          return graphQLResult(await idempotentAdministrationMutation(
            context,
            administrator,
            "class-credit.adjusted",
            input.idempotencyKey,
            input,
            (transaction) => adjustClassCredits(transaction, administrator, input, context.correlationId),
          ));
        },
        bookClassSession: async (_parent, { input }, context) => {
          const student = await authenticateStudent(context, "booking.created", "Booking");
          return graphQLResult(await idempotentStudentMutation(
            context,
            student,
            "booking.created",
            input.idempotencyKey,
            input,
            (transaction) => bookClassSession(transaction, student, input, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "BookingError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "Booking",
          ));
        },
        cancelBooking: async (_parent, { input }, context) => {
          const student = await authenticateStudent(context, "booking.cancelled", "Booking");
          return graphQLResult(await idempotentStudentMutation(
            context,
            student,
            "booking.cancelled",
            input.idempotencyKey,
            input,
            (transaction) => cancelBooking(transaction, student, input, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "BookingError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "Booking",
          ));
        },
        rescheduleBooking: async (_parent, { input }, context) => {
          const student = await authenticateStudent(context, "booking.rescheduled", "Booking");
          const validatedInput = rescheduleBookingInputSchema.safeParse(input);
          if (!validatedInput.success) {
            await recordStudentMutationAudit(context.db, student.id, "booking.rescheduled", "Booking", context.correlationId, "DENIED", "INVALID_RESCHEDULE_BOOKING_INPUT");
            throw createGraphQLError("Provide valid Booking and replacement Class Session identifiers", {
              extensions: { code: "BAD_USER_INPUT" },
            });
          }
          return graphQLResult(await idempotentStudentMutation(
            context,
            student,
            "booking.rescheduled",
            validatedInput.data.idempotencyKey,
            validatedInput.data,
            (transaction) => rescheduleBooking(transaction, student, validatedInput.data, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "BookingError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "Booking",
          ));
        },
        joinWaitlist: async (_parent, { input }, context) => {
          const student = await authenticateStudent(context, "waitlist-entry.created", "WaitlistEntry");
          const validatedInput = joinWaitlistInputSchema.safeParse(input);
          if (!validatedInput.success) {
            await recordStudentMutationAudit(context.db, student.id, "waitlist-entry.created", "WaitlistEntry", context.correlationId, "DENIED", "INVALID_JOIN_WAITLIST_INPUT");
            throw createGraphQLError("Provide a valid Class Session identifier", { extensions: { code: "BAD_USER_INPUT" } });
          }
          return graphQLResult(await idempotentStudentMutation(
            context,
            student,
            "waitlist-entry.created",
            validatedInput.data.idempotencyKey,
            validatedInput.data,
            (transaction) => joinWaitlist(transaction, student, validatedInput.data, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "WaitlistError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "WaitlistEntry",
          ));
        },
        withdrawWaitlist: async (_parent, { input }, context) => {
          const student = await authenticateStudent(context, "waitlist-entry.withdrawn", "WaitlistEntry");
          const validatedInput = withdrawWaitlistInputSchema.safeParse(input);
          if (!validatedInput.success) {
            await recordStudentMutationAudit(context.db, student.id, "waitlist-entry.withdrawn", "WaitlistEntry", context.correlationId, "DENIED", "INVALID_WITHDRAW_WAITLIST_INPUT");
            throw createGraphQLError("Provide a valid Waitlist Entry identifier", { extensions: { code: "BAD_USER_INPUT" } });
          }
          return graphQLResult(await idempotentStudentMutation(
            context,
            student,
            "waitlist-entry.withdrawn",
            validatedInput.data.idempotencyKey,
            validatedInput.data,
            (transaction) => withdrawWaitlist(transaction, student, validatedInput.data, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "WaitlistError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "WaitlistEntry",
          ));
        },
        publishClassSession: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "class-session.published");
          return idempotentAdministrationMutation(context, administrator, "class-session.published", input.idempotencyKey, input, (transaction) => publishClassSession(transaction, administrator, input, context.correlationId));
        },
        changeClassSessionSeatCapacity: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "class-session.seat-capacity-changed");
          return idempotentAdministrationMutation(context, administrator, "class-session.seat-capacity-changed", input.idempotencyKey, input, (transaction) => changeClassSessionSeatCapacity(transaction, administrator, input, context.correlationId));
        },
        reportAbsence: async (_parent, { input }, context) => {
          const teacher = await authenticateTeacher(context, "absence-request.created");
          return graphQLResult(await idempotentTeacherMutation(
            context,
            teacher,
            "absence-request.created",
            input.idempotencyKey,
            input,
            (transaction) => reportAbsence(transaction, teacher, input, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "ClassSessionDisruptionError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
          ));
        },
        substituteTeacher: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "class-session.teacher-substituted");
          return graphQLResult(await idempotentAdministrationMutation(
            context,
            administrator,
            "class-session.teacher-substituted",
            input.idempotencyKey,
            input,
            (transaction) => substituteTeacher(transaction, administrator, input, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "ClassSessionDisruptionError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
          ));
        },
        cancelClassSession: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "class-session.cancelled");
          return graphQLResult(await idempotentAdministrationMutation(
            context,
            administrator,
            "class-session.cancelled",
            input.idempotencyKey,
            input,
            (transaction) => cancelClassSession(transaction, administrator, input, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "ClassSessionDisruptionError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
          ));
        },
        recordAttendance: async (_parent, { input }, context) => {
          const teacher = await authenticateTeacher(context, "attendance.recorded");
          return graphQLResult(await idempotentTeacherMutation(
            context,
            teacher,
            "attendance.recorded",
            input.idempotencyKey,
            input,
            (transaction) => recordAttendance(transaction, teacher, input, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "AttendanceError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "AttendanceRecord",
          ));
        },
        administerAttendance: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "attendance.administered", "AttendanceRecord");
          return graphQLResult(await idempotentAdministrationMutation(
            context,
            administrator,
            "attendance.administered",
            input.idempotencyKey,
            input,
            (transaction) => administerAttendance(transaction, administrator, input, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "AttendanceError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "AttendanceRecord",
          ));
        },
        requestAttendanceReview: async (_parent, { input }, context) => {
          const student = await authenticateStudent(context, "attendance-review.created", "AttendanceReviewRequest");
          return graphQLResult(await idempotentStudentMutation(
            context,
            student,
            "attendance-review.created",
            input.idempotencyKey,
            input,
            (transaction) => requestAttendanceReview(transaction, student, input, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "AttendanceReviewError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "AttendanceReviewRequest",
          ));
        },
        decideAttendanceReview: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "attendance-review.resolved", "AttendanceReviewRequest");
          return graphQLResult(await idempotentAdministrationMutation(
            context,
            administrator,
            "attendance-review.resolved",
            input.idempotencyKey,
            input,
            (transaction) => decideAttendanceReview(transaction, administrator, input, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "AttendanceReviewError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "AttendanceReviewRequest",
          ));
        },
        saveLearningFeedback: async (_parent, { input }, context) => {
          const teacher = await authenticateTeacher(context, "learning-feedback.saved");
          return graphQLResult(await idempotentTeacherMutation(
            context,
            teacher,
            "learning-feedback.saved",
            input.idempotencyKey,
            input,
            (transaction) => saveLearningFeedback(transaction, teacher, input, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "LearningFeedbackError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "LearningFeedback",
          ));
        },
        redactLearningFeedback: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "learning-feedback.redacted", "LearningFeedback");
          return graphQLResult(await idempotentAdministrationMutation(
            context,
            administrator,
            "learning-feedback.redacted",
            input.idempotencyKey,
            input,
            (transaction) => redactLearningFeedback(transaction, administrator, input, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "LearningFeedbackError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "LearningFeedback",
          ));
        },
        saveSessionRating: async (_parent, { input }, context) => {
          const student = await authenticateStudent(context, "session-rating.saved", "SessionRating");
          return graphQLResult(await idempotentStudentMutation(
            context,
            student,
            "session-rating.saved",
            input.idempotencyKey,
            input,
            (transaction) => saveSessionRating(transaction, student, input, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "SessionRatingError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "SessionRating",
          ));
        },
        redactSessionRatingComment: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "session-rating.comment-redacted", "SessionRating");
          return graphQLResult(await idempotentAdministrationMutation(
            context,
            administrator,
            "session-rating.comment-redacted",
            input.idempotencyKey,
            input,
            (transaction) => redactSessionRatingComment(transaction, administrator, input, context.correlationId, options.now?.() ?? new Date()),
            { __typename: "SessionRatingError", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." },
            "SessionRating",
          ));
        },
        saveTeacherAvailabilityRange: async (_parent, { input }, context) => {
          const teacher = await authenticateTeacher(context, "teacher-availability.changed");
          return graphQLResult(await auditedTeacherMutation(context, teacher, "teacher-availability.changed", (transaction) =>
            saveTeacherAvailabilityRange(transaction, teacher, { ...input, weekday: input.weekday as Weekday }, context.correlationId)));
        },
        addAvailabilityException: async (_parent, { input }, context) => {
          const teacher = await authenticateTeacher(context, "availability-exception.changed");
          return graphQLResult(await auditedTeacherMutation(context, teacher, "availability-exception.changed", (transaction) =>
            addAvailabilityException(transaction, teacher, input, context.correlationId)));
        },
        endTeacherAvailabilityRange: async (_parent, { input }, context) => {
          const teacher = await authenticateTeacher(context, "teacher-availability.ended");
          return graphQLResult(await auditedTeacherMutation(context, teacher, "teacher-availability.ended", (transaction) =>
            endTeacherAvailabilityRange(transaction, teacher, input, context.correlationId)));
        },
        removeAvailabilityException: async (_parent, { input }, context) => {
          const teacher = await authenticateTeacher(context, "availability-exception.removed");
          return graphQLResult(await auditedTeacherMutation(context, teacher, "availability-exception.removed", (transaction) =>
            removeAvailabilityException(transaction, teacher, input, context.correlationId)));
        },
        createCourse: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "course.created");
          return graphQLResult(await idempotentAdministrationMutation(context, administrator, "course.created", input.idempotencyKey, input, (transaction) => createCourse(transaction, administrator, input as unknown as Parameters<typeof createCourse>[2], context.correlationId)));
        },
        reviseCourseDetails: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "course.updated");
          return graphQLResult(await auditedAdministrationMutation(context, administrator, "course.updated", (transaction) => reviseCourseDetails(transaction, administrator, input, context.correlationId)));
        },
        createLessonUnit: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "lesson-unit.created");
          return graphQLResult(await idempotentAdministrationMutation(context, administrator, "lesson-unit.created", input.idempotencyKey, input, (transaction) => createLessonUnit(transaction, administrator, input as unknown as Parameters<typeof createLessonUnit>[2], context.correlationId)));
        },
        reviseLessonUnitIdentity: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "lesson-unit.updated");
          return graphQLResult(await auditedAdministrationMutation(context, administrator, "lesson-unit.updated", (transaction) => reviseLessonUnitIdentity(transaction, administrator, input as unknown as Parameters<typeof reviseLessonUnitIdentity>[2], context.correlationId)));
        },
        placeLessonUnitInCourse: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "lesson-unit.reordered");
          return graphQLResult(await auditedAdministrationMutation(context, administrator, "lesson-unit.reordered", (transaction) => placeLessonUnitInCourse(transaction, administrator, input, context.correlationId)));
        },
        retireLessonUnit: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "lesson-unit.retired");
          return graphQLResult(await idempotentAdministrationMutation(context, administrator, "lesson-unit.retired", input.idempotencyKey, input, (transaction) => retireLessonUnit(transaction, administrator, input as unknown as Parameters<typeof retireLessonUnit>[2], context.correlationId)));
        },
        saveLocalizedTopic: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "topic.saved");
          if (!localizedTopicInputSchema.safeParse(input).success) {
            throw createGraphQLError(
              "Provide a Topic key of 2 to 8 capital letters and labels of 1 to 80 characters",
              { extensions: { code: "BAD_USER_INPUT" } },
            );
          }
          return graphQLResult(await idempotentAdministrationMutation(context, administrator, "topic.saved", input.idempotencyKey, input, (transaction) => saveLocalizedTopic(transaction, administrator, input, context.correlationId)));
        },
        addLessonMaterial: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "lesson-material.created");
          return graphQLResult(await idempotentAdministrationMutation(context, administrator, "lesson-material.created", input.idempotencyKey, input, (transaction) => addLessonMaterial(transaction, administrator, input as unknown as Parameters<typeof addLessonMaterial>[2], context.correlationId)));
        },
        reviseLessonMaterial: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "lesson-material.revised");
          return graphQLResult(await idempotentAdministrationMutation(context, administrator, "lesson-material.revised", input.idempotencyKey, input, (transaction) => reviseLessonMaterial(transaction, administrator, input as unknown as Parameters<typeof reviseLessonMaterial>[2], context.correlationId)));
        },
        saveTeacherProfile: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "teacher-profile.saved");
          return graphQLResult(await idempotentAdministrationMutation(context, administrator, "teacher-profile.saved", input.idempotencyKey, input, (transaction) => saveTeacherProfile(transaction, administrator, input as unknown as Parameters<typeof saveTeacherProfile>[2], context.correlationId)));
        },
        grantTeacherQualification: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "teacher-qualification.granted");
          return graphQLResult(await idempotentAdministrationMutation(context, administrator, "teacher-qualification.granted", input.idempotencyKey, input, (transaction) => changeTeacherQualification(transaction, administrator, input as unknown as Parameters<typeof changeTeacherQualification>[2], context.correlationId, "grant")));
        },
        removeTeacherQualification: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "teacher-qualification.removed");
          return graphQLResult(await idempotentAdministrationMutation(context, administrator, "teacher-qualification.removed", input.idempotencyKey, input, (transaction) => changeTeacherQualification(transaction, administrator, input as unknown as Parameters<typeof changeTeacherQualification>[2], context.correlationId, "remove")));
        },
        rememberRoleWorkspacePlace: async (
          _parent,
          { input },
          context: ApiContext,
        ) => {
          const identity = await context.authenticator.authenticate(context.request);
          if (!identity) {
            throw createGraphQLError("Authentication is required", {
              extensions: { code: "UNAUTHENTICATED" },
            });
          }

          const actingRole = userRolesByGraphQL[input.actingRole];
          const place = workspacePlacesByGraphQL[input.place];
          const result = await rememberRoleWorkspacePlace(
            context.db,
            identity,
            actingRole,
            place,
            context.correlationId,
          );
          if (result === "UNKNOWN_USER") {
            throw createGraphQLError("Authentication is required", {
              extensions: { code: "UNAUTHENTICATED" },
            });
          }
          if (result === "USER_SUSPENDED") {
            throw createGraphQLError("Your User is suspended", {
              extensions: { code: "USER_SUSPENDED" },
            });
          }
          if (result !== "SUCCEEDED") {
            throw createGraphQLError(
              result === "ROLE_ASSIGNMENT_REQUIRED"
                ? "The selected Role Assignment is required"
                : "The workspace place is not compatible with the acting role",
              {
                extensions: {
                  code:
                    result === "ROLE_ASSIGNMENT_REQUIRED"
                      ? "FORBIDDEN"
                      : "BAD_USER_INPUT",
                },
              },
            );
          }

          return { role: input.actingRole, place: input.place };
        },
        saveUserPreferences: async (_parent, { input }, context: ApiContext) => {
          const identity = await context.authenticator.authenticate(context.request);
          if (!identity) {
            throw createGraphQLError("Authentication is required", {
              extensions: { code: "UNAUTHENTICATED" },
            });
          }

          const savedLocale =
            input.interfaceLocale === InterfaceLocale.Es ? "es" : "en";
          const user = await context.db
            .selectFrom("users")
            .select(["id", "display_name"])
            .where("identity_issuer", "=", identity.issuer)
            .where("identity_subject", "=", identity.subject)
            .executeTakeFirst();
          if (!user) {
            throw createGraphQLError("Authentication is required", {
              extensions: { code: "UNAUTHENTICATED" },
            });
          }

          const actingRole = userRolesByGraphQL[input.actingRole];
          const hasActingRole = await context.db
            .selectFrom("role_assignments")
            .select("role")
            .where("user_id", "=", user.id)
            .where("role", "=", actingRole)
            .executeTakeFirst();
          if (!hasActingRole) {
            await context.db
              .insertInto("audit_entries")
              .values({
                actor_user_id: user.id,
                acting_role: actingRole,
                operation: "user-preferences.saved",
                target_type: "User",
                target_id: user.id,
                outcome: "DENIED",
                reason_code: "ROLE_ASSIGNMENT_REQUIRED",
                correlation_id: context.correlationId,
              })
              .execute();
            throw createGraphQLError("The selected Role Assignment is required", {
              extensions: { code: "FORBIDDEN" },
            });
          }

          if (!validDisplayTimeZones.has(input.displayTimeZone)) {
            await context.db
              .insertInto("audit_entries")
              .values({
                actor_user_id: user.id,
                acting_role: actingRole,
                operation: "user-preferences.saved",
                target_type: "User",
                target_id: user.id,
                outcome: "DENIED",
                reason_code: "INVALID_DISPLAY_TIME_ZONE",
                correlation_id: context.correlationId,
              })
              .execute();
            throw createGraphQLError("A named regional Display Time Zone is required", {
              extensions: { code: "BAD_USER_INPUT" },
            });
          }

          try {
            await context.db.transaction().execute(async (transaction) => {
              await lockActiveActor(transaction as Database, user.id);
              await transaction
                .updateTable("users")
                .set({
                  display_time_zone: input.displayTimeZone,
                  interface_locale: savedLocale,
                })
                .where("id", "=", user.id)
                .executeTakeFirstOrThrow();
              await transaction
                .insertInto("audit_entries")
                .values({
                  actor_user_id: user.id,
                  acting_role: actingRole,
                  operation: "user-preferences.saved",
                  target_type: "User",
                  target_id: user.id,
                  outcome: "SUCCEEDED",
                  reason_code: "USER_PREFERENCES_SAVED",
                  correlation_id: context.correlationId,
                })
                .execute();
            });
          } catch (error) {
            if (isUserSuspendedError(error)) {
              await recordSuspendedActorDenial(context.db, user.id, actingRole, "user-preferences.saved", "User", context.correlationId);
            } else {
              await context.db
                .insertInto("audit_entries")
                .values({
                  actor_user_id: user.id,
                  acting_role: actingRole,
                  operation: "user-preferences.saved",
                  target_type: "User",
                  target_id: user.id,
                  outcome: "FAILED",
                  reason_code: "USER_PREFERENCES_SAVE_FAILED",
                  correlation_id: context.correlationId,
                })
                .execute();
            }
            throw error;
          }

          return {
            user: {
              id: user.id,
              displayName: user.display_name,
              displayTimeZone: input.displayTimeZone,
              interfaceLocale: input.interfaceLocale,
            },
          };
        },
      },
  };

  async function authenticateAdministrator(context: ApiContext, operation: string, targetType = "CurriculumAdministration") {
    const identity = await context.authenticator.authenticate(context.request);
    if (!identity) {
      throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
    }
    const result = await administratorFor(context.db, identity);
    if (result.status === "UNKNOWN_USER") {
      throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
    }
    if (result.status === "ROLE_REQUIRED") {
      await recordAdministrationAudit(context.db, {
        administratorId: result.userId!,
        correlationId: context.correlationId,
        operation,
        targetType,
        targetId: result.userId,
        outcome: "DENIED",
        reasonCode: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED",
      });
      throw createGraphQLError("The Platform Administrator Role Assignment is required", { extensions: { code: "FORBIDDEN" } });
    }
    return result.administrator;
  }

  async function authenticateNotificationUser(context: ApiContext) {
    const identity = await context.authenticator.authenticate(context.request);
    if (!identity) throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
    const user = await userForNotificationAccess(context.db, identity);
    if (!user) throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
    return user;
  }

  async function authenticateTeacher(context: ApiContext, operation: string) {
    const identity = await context.authenticator.authenticate(context.request);
    if (!identity) {
      throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
    }
    const result = await teacherFor(context.db, identity, context.correlationId, operation);
    if (result.status === "UNKNOWN_USER") {
      throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
    }
    if (result.status === "ROLE_REQUIRED") {
      throw createGraphQLError("The Teacher Role Assignment is required", { extensions: { code: "FORBIDDEN" } });
    }
    return result.teacher;
  }

  /**
   * The authenticated User behind one request, or the refusal that there is none.
   * Every surface that resolves its own authority starts here.
   */
  async function authenticatedUserId(context: ApiContext) {
    const identity = await context.authenticator.authenticate(context.request);
    if (!identity) {
      throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
    }
    const user = await context.db.selectFrom("users")
      .select("id")
      .where("identity_issuer", "=", identity.issuer)
      .where("identity_subject", "=", identity.subject)
      .executeTakeFirst();
    if (!user) {
      throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
    }
    return user.id;
  }

  /** The refusal both reporting surfaces give a role that holds neither authority. */
  async function refuseReportingAuthority(
    context: ApiContext,
    userId: string,
    operation: string,
    targetType: string,
    reasonCode: string,
  ): Promise<never> {
    await context.db.insertInto("audit_entries").values({
      actor_user_id: userId,
      // Two roles could have opened this surface and the User holds neither, so
      // there is no attempted role to name.
      acting_role: null,
      operation,
      target_type: targetType,
      target_id: userId,
      outcome: "DENIED",
      reason_code: reasonCode,
      correlation_id: context.correlationId,
    }).execute();
    throw createGraphQLError(
      "An Organization Manager or Platform Administrator Role Assignment is required",
      { extensions: { code: "FORBIDDEN" } },
    );
  }

  /**
   * The Audit Log applies the viewer's own relationship scope (ADR 0059), so the
   * scope is resolved from current Role Assignments here and travels with the
   * request rather than being asserted by it.
   *
   * A role that may not read the Audit Log is refused, and that refusal is itself a
   * denied sensitive read: it is the one Audit Log access that always writes an
   * Audit Entry.
   */
  async function authenticateAuditLogViewer(context: ApiContext, operation: string): Promise<AuditLogViewer> {
    const userId = await authenticatedUserId(context);
    const viewer = await auditLogViewerFor(context.db, userId);
    if (!viewer) return refuseReportingAuthority(context, userId, operation, "AuditLog", "AUDIT_LOG_ROLE_REQUIRED");
    return viewer;
  }

  /**
   * Report Exports are the one surface both reporting roles reach through the same
   * operation, so the requester is authenticated once and the authority it resolved
   * to travels with the request.
   */
  async function authenticateReportExportRequester(context: ApiContext, operation: string): Promise<ReportingAuthority> {
    const userId = await authenticatedUserId(context);
    const requester = await reportingAuthorityFor(context.db, userId);
    if (!requester) return refuseReportingAuthority(context, userId, operation, "ReportExport", "REPORT_EXPORT_ROLE_REQUIRED");
    return requester;
  }

  /**
   * The role-agnostic idempotent mutation: the acting role travels as data rather
   * than being baked into a per-role copy. The four per-role helpers above predate
   * it and differ from it only in that constant, so they can collapse onto this one
   * when a change is already touching them.
   */
  async function idempotentActorMutation<T, C extends { __typename: string; code: string; message: string }>(
    context: ApiContext,
    requester: { id: string; actingRole: UserRole },
    operation: string,
    idempotencyKey: string,
    input: object,
    perform: (transaction: Database) => Promise<T>,
    idempotencyConflict: C,
  ): Promise<T | C> {
    const inputFingerprint = JSON.stringify(input);
    const audit = (transaction: Database, outcome: "SUCCEEDED" | "DENIED" | "FAILED", reasonCode: string, targetType: string) =>
      transaction.insertInto("audit_entries").values({
        actor_user_id: requester.id,
        acting_role: requester.actingRole,
        operation,
        target_type: targetType,
        target_id: requester.id,
        outcome,
        reason_code: reasonCode,
        correlation_id: context.correlationId,
      }).execute();
    try {
      return await context.db.transaction().execute(async (transaction) => {
        await lockActiveActor(transaction as Database, requester.id);
        await sql`select pg_advisory_xact_lock(hashtextextended(${`${requester.id}:${operation}:${idempotencyKey}`}, 0))`.execute(transaction);
        await transaction.deleteFrom("mutation_idempotency_records").where("actor_user_id", "=", requester.id).where("operation", "=", operation).where("idempotency_key", "=", idempotencyKey).where("created_at", "<=", sql<Date>`now() - interval '7 days'`).execute();
        const existing = await transaction.selectFrom("mutation_idempotency_records").select(["input_fingerprint", "outcome"]).where("actor_user_id", "=", requester.id).where("operation", "=", operation).where("idempotency_key", "=", idempotencyKey).executeTakeFirst();
        if (existing) {
          if (existing.input_fingerprint !== inputFingerprint) {
            await audit(transaction as Database, "DENIED", "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT", "IdempotencyKey");
            return idempotencyConflict;
          }
          const replaySucceeded = typeof existing.outcome === "object" && existing.outcome !== null && "__typename" in existing.outcome && typeof existing.outcome.__typename === "string" && existing.outcome.__typename.endsWith("Success");
          await audit(transaction as Database, replaySucceeded ? "SUCCEEDED" : "DENIED", replaySucceeded ? "IDEMPOTENT_REPLAY_SUCCEEDED" : "IDEMPOTENT_REPLAY_DENIED", "IdempotencyKey");
          return existing.outcome as T;
        }
        const outcome = await perform(transaction as Database);
        await transaction.insertInto("mutation_idempotency_records").values({ actor_user_id: requester.id, operation, idempotency_key: idempotencyKey, input_fingerprint: inputFingerprint, outcome: JSON.stringify(outcome as Record<string, unknown>) }).execute();
        return outcome;
      });
    } catch (error) {
      if (isUserSuspendedError(error)) await recordSuspendedActorDenial(context.db, requester.id, requester.actingRole, operation, "User", context.correlationId);
      else await audit(context.db, "FAILED", "UNEXPECTED_MUTATION_FAILURE", "ReportExport");
      throw error;
    }
  }

  async function authenticateOrganizationManager(context: ApiContext, operation: string, targetType?: string) {
    const identity = await context.authenticator.authenticate(context.request);
    if (!identity) {
      throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
    }
    const result = await organizationManagerFor(context.db, identity, context.correlationId, operation, targetType);
    if (result.status === "UNKNOWN_USER") {
      throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
    }
    if (result.status === "ROLE_REQUIRED") {
      throw createGraphQLError("The Organization Manager Role Assignment is required", { extensions: { code: "FORBIDDEN" } });
    }
    return result.organizationManager;
  }

  async function authenticateStudent(context: ApiContext, operation: string, targetType?: string) {
    const identity = await context.authenticator.authenticate(context.request);
    if (!identity) {
      throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
    }
    const result = await studentFor(context.db, identity, context.correlationId, operation, targetType);
    if (result.status === "UNKNOWN_USER") {
      throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
    }
    if (result.status === "ROLE_REQUIRED") {
      throw createGraphQLError("The Student Role Assignment is required", { extensions: { code: "FORBIDDEN" } });
    }
    return result.student;
  }

  async function auditedTeacherMutation<T>(
    context: ApiContext,
    teacher: { id: string },
    operation: string,
    perform: (transaction: Database) => Promise<T>,
  ) {
    try {
      return await context.db.transaction().execute(async (transaction) => {
        await lockActiveActor(transaction as Database, teacher.id);
        return perform(transaction as Database);
      });
    } catch (error) {
      if (isUserSuspendedError(error)) {
        await recordSuspendedActorDenial(context.db, teacher.id, "TEACHER", operation, "TeacherAvailability", context.correlationId);
        throw error;
      }
      await context.db.insertInto("audit_entries").values({
        actor_user_id: teacher.id,
        acting_role: "TEACHER",
        operation,
        target_type: "TeacherAvailability",
        target_id: teacher.id,
        outcome: "FAILED",
        reason_code: "UNEXPECTED_MUTATION_FAILURE",
        correlation_id: context.correlationId,
      }).execute();
      throw error;
    }
  }

  async function idempotentTeacherMutation<T, C extends { __typename: string; code: string; message: string }>(
    context: ApiContext,
    teacher: { id: string },
    operation: string,
    idempotencyKey: string,
    input: object,
    perform: (transaction: Database) => Promise<T>,
    idempotencyConflict: C,
    targetType = "AbsenceRequest",
  ): Promise<T | C> {
    const inputFingerprint = JSON.stringify(input);
    try {
      return await context.db.transaction().execute(async (transaction) => {
        await lockActiveActor(transaction as Database, teacher.id);
        await sql`select pg_advisory_xact_lock(hashtextextended(${`${teacher.id}:${operation}:${idempotencyKey}`}, 0))`.execute(transaction);
        await transaction.deleteFrom("mutation_idempotency_records").where("actor_user_id", "=", teacher.id).where("operation", "=", operation).where("idempotency_key", "=", idempotencyKey).where("created_at", "<=", sql<Date>`now() - interval '7 days'`).execute();
        const existing = await transaction.selectFrom("mutation_idempotency_records").select(["input_fingerprint", "outcome"]).where("actor_user_id", "=", teacher.id).where("operation", "=", operation).where("idempotency_key", "=", idempotencyKey).executeTakeFirst();
        if (existing) {
          if (existing.input_fingerprint !== inputFingerprint) {
            await transaction.insertInto("audit_entries").values({ actor_user_id: teacher.id, acting_role: "TEACHER", operation, target_type: "IdempotencyKey", target_id: teacher.id, outcome: "DENIED", reason_code: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT", correlation_id: context.correlationId }).execute();
            return idempotencyConflict;
          }
          const replaySucceeded = typeof existing.outcome === "object" && existing.outcome !== null && "__typename" in existing.outcome && typeof existing.outcome.__typename === "string" && existing.outcome.__typename.endsWith("Success");
          await transaction.insertInto("audit_entries").values({ actor_user_id: teacher.id, acting_role: "TEACHER", operation, target_type: "IdempotencyKey", target_id: teacher.id, outcome: replaySucceeded ? "SUCCEEDED" : "DENIED", reason_code: replaySucceeded ? "IDEMPOTENT_REPLAY_SUCCEEDED" : "IDEMPOTENT_REPLAY_DENIED", correlation_id: context.correlationId }).execute();
          return existing.outcome as T;
        }
        const outcome = await perform(transaction as Database);
        await transaction.insertInto("mutation_idempotency_records").values({ actor_user_id: teacher.id, operation, idempotency_key: idempotencyKey, input_fingerprint: inputFingerprint, outcome: JSON.stringify(outcome as Record<string, unknown>) }).execute();
        return outcome;
      });
    } catch (error) {
      if (isUserSuspendedError(error)) await recordSuspendedActorDenial(context.db, teacher.id, "TEACHER", operation, targetType, context.correlationId);
      else await context.db.insertInto("audit_entries").values({ actor_user_id: teacher.id, acting_role: "TEACHER", operation, target_type: targetType, target_id: teacher.id, outcome: "FAILED", reason_code: "UNEXPECTED_MUTATION_FAILURE", correlation_id: context.correlationId }).execute();
      throw error;
    }
  }

  async function idempotentOrganizationManagerMutation<T, C extends { __typename: string; code: string; message: string }>(
    context: ApiContext,
    organizationManager: { id: string },
    operation: string,
    idempotencyKey: string,
    input: object,
    perform: (transaction: Database) => Promise<T>,
    idempotencyConflict: C,
    targetType = "SponsorshipInvitation",
  ): Promise<T | C> {
    const inputFingerprint = JSON.stringify(input);
    try {
      return await context.db.transaction().execute(async (transaction) => {
        await lockActiveActor(transaction as Database, organizationManager.id);
        await sql`select pg_advisory_xact_lock(hashtextextended(${`${organizationManager.id}:${operation}:${idempotencyKey}`}, 0))`.execute(transaction);
        await transaction.deleteFrom("mutation_idempotency_records").where("actor_user_id", "=", organizationManager.id).where("operation", "=", operation).where("idempotency_key", "=", idempotencyKey).where("created_at", "<=", sql<Date>`now() - interval '7 days'`).execute();
        const existing = await transaction.selectFrom("mutation_idempotency_records").select(["input_fingerprint", "outcome"]).where("actor_user_id", "=", organizationManager.id).where("operation", "=", operation).where("idempotency_key", "=", idempotencyKey).executeTakeFirst();
        if (existing) {
          if (existing.input_fingerprint !== inputFingerprint) {
            await transaction.insertInto("audit_entries").values({ actor_user_id: organizationManager.id, acting_role: "ORGANIZATION_MANAGER", operation, target_type: "IdempotencyKey", target_id: organizationManager.id, outcome: "DENIED", reason_code: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT", correlation_id: context.correlationId }).execute();
            return idempotencyConflict;
          }
          const replaySucceeded = typeof existing.outcome === "object" && existing.outcome !== null && "__typename" in existing.outcome && typeof existing.outcome.__typename === "string" && existing.outcome.__typename.endsWith("Success");
          await transaction.insertInto("audit_entries").values({ actor_user_id: organizationManager.id, acting_role: "ORGANIZATION_MANAGER", operation, target_type: "IdempotencyKey", target_id: organizationManager.id, outcome: replaySucceeded ? "SUCCEEDED" : "DENIED", reason_code: replaySucceeded ? "IDEMPOTENT_REPLAY_SUCCEEDED" : "IDEMPOTENT_REPLAY_DENIED", correlation_id: context.correlationId }).execute();
          return existing.outcome as T;
        }
        const outcome = await perform(transaction as Database);
        await transaction.insertInto("mutation_idempotency_records").values({ actor_user_id: organizationManager.id, operation, idempotency_key: idempotencyKey, input_fingerprint: inputFingerprint, outcome: JSON.stringify(outcome as Record<string, unknown>) }).execute();
        return outcome;
      });
    } catch (error) {
      if (isUserSuspendedError(error)) await recordSuspendedActorDenial(context.db, organizationManager.id, "ORGANIZATION_MANAGER", operation, targetType, context.correlationId);
      else await context.db.insertInto("audit_entries").values({ actor_user_id: organizationManager.id, acting_role: "ORGANIZATION_MANAGER", operation, target_type: targetType, target_id: organizationManager.id, outcome: "FAILED", reason_code: "UNEXPECTED_MUTATION_FAILURE", correlation_id: context.correlationId }).execute();
      throw error;
    }
  }

  function idempotentAdministrationMutation<T>(context: ApiContext, administrator: { id: string }, operation: string, idempotencyKey: string, input: object, perform: (transaction: Database) => Promise<T>): Promise<T | { __typename: "CurriculumConflict"; code: string; message: string }>;
  function idempotentAdministrationMutation<T, C extends { __typename: string; code: string; message: string }>(context: ApiContext, administrator: { id: string }, operation: string, idempotencyKey: string, input: object, perform: (transaction: Database) => Promise<T>, idempotencyConflict: C): Promise<T | C>;
  function idempotentAdministrationMutation<T, C extends { __typename: string; code: string; message: string }>(context: ApiContext, administrator: { id: string }, operation: string, idempotencyKey: string, input: object, perform: (transaction: Database) => Promise<T>, idempotencyConflict: C, targetType: string): Promise<T | C>;
  async function idempotentAdministrationMutation<T, C extends { __typename: string; code: string; message: string }>(context: ApiContext, administrator: { id: string }, operation: string, idempotencyKey: string, input: object, perform: (transaction: Database) => Promise<T>, idempotencyConflict?: C, targetType = "CurriculumAdministration"): Promise<T | C | { __typename: "CurriculumConflict"; code: string; message: string }> {
    const inputFingerprint = JSON.stringify(input);
    try {
      return await context.db.transaction().execute(async (transaction) => {
        await lockActiveActor(transaction as Database, administrator.id);
        await sql`select pg_advisory_xact_lock(hashtextextended(${`${administrator.id}:${operation}:${idempotencyKey}`}, 0))`.execute(transaction);
        await transaction.deleteFrom("mutation_idempotency_records").where("actor_user_id", "=", administrator.id).where("operation", "=", operation).where("idempotency_key", "=", idempotencyKey).where("created_at", "<=", sql<Date>`now() - interval '7 days'`).execute();
        const existing = await transaction.selectFrom("mutation_idempotency_records").select(["input_fingerprint", "outcome"]).where("actor_user_id", "=", administrator.id).where("operation", "=", operation).where("idempotency_key", "=", idempotencyKey).executeTakeFirst();
        if (existing) {
          if (existing.input_fingerprint !== inputFingerprint) {
            await recordAdministrationAudit(transaction, { administratorId: administrator.id, correlationId: context.correlationId, operation, targetType: "IdempotencyKey", targetId: administrator.id, outcome: "DENIED", reasonCode: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT" });
            return idempotencyConflict ?? { __typename: "CurriculumConflict", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." };
          }
          const replaySucceeded = typeof existing.outcome === "object"
            && existing.outcome !== null
            && "__typename" in existing.outcome
            && typeof existing.outcome.__typename === "string"
            && existing.outcome.__typename.endsWith("Success");
          await recordAdministrationAudit(transaction as Database, { administratorId: administrator.id, correlationId: context.correlationId, operation, targetType: "IdempotencyKey", targetId: administrator.id, outcome: replaySucceeded ? "SUCCEEDED" : "DENIED", reasonCode: replaySucceeded ? "IDEMPOTENT_REPLAY_SUCCEEDED" : "IDEMPOTENT_REPLAY_DENIED" });
          return existing.outcome as T;
        }
        const outcome = await perform(transaction as Database);
        await transaction.insertInto("mutation_idempotency_records").values({ actor_user_id: administrator.id, operation, idempotency_key: idempotencyKey, input_fingerprint: inputFingerprint, outcome: JSON.stringify(outcome as Record<string, unknown>) }).execute();
        return outcome;
      });
    } catch (error) {
      if (isUserSuspendedError(error)) await recordSuspendedActorDenial(context.db, administrator.id, "PLATFORM_ADMINISTRATOR", operation, targetType, context.correlationId);
      else await recordAdministrationAudit(context.db, { administratorId: administrator.id, correlationId: context.correlationId, operation, targetType, targetId: administrator.id, outcome: "FAILED", reasonCode: "UNEXPECTED_MUTATION_FAILURE" });
      throw error;
    }
  }

  async function idempotentStudentMutation<T, C extends { __typename: string; code: string; message: string } = { __typename: "SubscriptionConflict"; code: string; message: string }>(
    context: ApiContext,
    student: { id: string },
    operation: string,
    idempotencyKey: string,
    input: object,
    perform: (transaction: Database) => Promise<T>,
    idempotencyConflict?: C,
    targetType = "Subscription",
  ): Promise<T | C | { __typename: "SubscriptionConflict"; code: string; message: string }> {
    const inputFingerprint = JSON.stringify(input);
    try {
      return await context.db.transaction().execute(async (transaction) => {
        await lockActiveActor(transaction as Database, student.id);
        await sql`select pg_advisory_xact_lock(hashtextextended(${`${student.id}:${operation}:${idempotencyKey}`}, 0))`.execute(transaction);
        await transaction.deleteFrom("mutation_idempotency_records").where("actor_user_id", "=", student.id).where("operation", "=", operation).where("idempotency_key", "=", idempotencyKey).where("created_at", "<=", sql<Date>`now() - interval '7 days'`).execute();
        const existing = await transaction.selectFrom("mutation_idempotency_records").select(["input_fingerprint", "outcome"]).where("actor_user_id", "=", student.id).where("operation", "=", operation).where("idempotency_key", "=", idempotencyKey).executeTakeFirst();
        if (existing) {
          if (existing.input_fingerprint !== inputFingerprint) {
            await recordStudentMutationAudit(transaction as Database, student.id, operation, targetType, context.correlationId, "DENIED", "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT");
            return idempotencyConflict ?? { __typename: "SubscriptionConflict", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." };
          }
          const replaySucceeded = typeof existing.outcome === "object"
            && existing.outcome !== null
            && "__typename" in existing.outcome
            && typeof existing.outcome.__typename === "string"
            && existing.outcome.__typename.endsWith("Success");
          await recordStudentMutationAudit(transaction as Database, student.id, operation, targetType, context.correlationId, replaySucceeded ? "SUCCEEDED" : "DENIED", replaySucceeded ? "IDEMPOTENT_REPLAY_SUCCEEDED" : "IDEMPOTENT_REPLAY_DENIED");
          return existing.outcome as T;
        }
        const outcome = await perform(transaction as Database);
        await transaction.insertInto("mutation_idempotency_records").values({ actor_user_id: student.id, operation, idempotency_key: idempotencyKey, input_fingerprint: inputFingerprint, outcome: JSON.stringify(outcome as Record<string, unknown>) }).execute();
        return outcome;
      });
    } catch (error) {
      if (isUserSuspendedError(error)) await recordSuspendedActorDenial(context.db, student.id, "STUDENT", operation, targetType, context.correlationId);
      else await recordStudentMutationAudit(context.db, student.id, operation, targetType, context.correlationId, "FAILED", "UNEXPECTED_MUTATION_FAILURE");
      throw error;
    }
  }

  async function recordStudentMutationAudit(db: Database, studentId: string, operation: string, targetType: string, correlationId: string, outcome: "SUCCEEDED" | "DENIED" | "FAILED", reasonCode: string) {
    await db.insertInto("audit_entries").values({ actor_user_id: studentId, acting_role: "STUDENT", operation, target_type: targetType, target_id: studentId, outcome, reason_code: reasonCode, correlation_id: correlationId }).execute();
  }

  async function lockActiveActor(transaction: Database, actorId: string) {
    await sql`select pg_advisory_xact_lock(hashtextextended(${actorId}, 28))`.execute(transaction);
    const user = await transaction.selectFrom("users").select(["access_status", "suspension_reason"]).where("id", "=", actorId).executeTakeFirstOrThrow();
    if (user.access_status === "ACTIVE") return;
    throw createGraphQLError(`Your User is suspended: ${user.suspension_reason}`, { extensions: { code: "USER_SUSPENDED" } });
  }

  async function activeActorMutation<T>(context: ApiContext, actorId: string, actingRole: UserRole | null, operation: string, targetType: string, perform: (transaction: Database) => Promise<T>) {
    try {
      return await context.db.transaction().execute(async (transaction) => {
        await lockActiveActor(transaction as Database, actorId);
        return perform(transaction as Database);
      });
    } catch (error) {
      if (isUserSuspendedError(error)) {
        await recordSuspendedActorDenial(context.db, actorId, actingRole, operation, targetType, context.correlationId);
      }
      throw error;
    }
  }

  async function recordSuspendedActorDenial(db: Database, actorId: string, actingRole: UserRole | null, operation: string, targetType: string, correlationId: string) {
    await db.insertInto("audit_entries").values({ actor_user_id: actorId, acting_role: actingRole, operation, target_type: targetType, target_id: actorId, outcome: "DENIED", reason_code: "USER_SUSPENDED", correlation_id: correlationId }).execute();
  }

  function isUserSuspendedError(error: unknown) {
    return typeof error === "object" && error !== null && "extensions" in error && (error as { extensions?: { code?: unknown } }).extensions?.code === "USER_SUSPENDED";
  }

  async function auditedAdministrationMutation<T>(context: ApiContext, administrator: { id: string }, operation: string, perform: (transaction: Database) => Promise<T>): Promise<T> {
    try {
      return await context.db.transaction().execute(async (transaction) => {
        await lockActiveActor(transaction as Database, administrator.id);
        return perform(transaction as Database);
      });
    } catch (error) {
      if (isUserSuspendedError(error)) {
        await recordSuspendedActorDenial(context.db, administrator.id, "PLATFORM_ADMINISTRATOR", operation, "CurriculumAdministration", context.correlationId);
        throw error;
      }
      await recordAdministrationAudit(context.db, { administratorId: administrator.id, correlationId: context.correlationId, operation, targetType: "CurriculumAdministration", targetId: administrator.id, outcome: "FAILED", reasonCode: "UNEXPECTED_MUTATION_FAILURE" });
      throw error;
    }
  }

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  return createYoga<ApiContext>({
    schema,
    graphqlEndpoint: "/graphql",
    logging: false,
    plugins: [
      createPublicBoundaryPlugin({
        enforced: enforcesPublicBoundary,
        budgets,
        persistedOperations,
        clock,
        ...(counters ? { counters } : {}),
      }),
    ],
    // ADR 0028 gives the deployment one public origin, so a cross-origin policy
    // would only describe callers the browser client never is. Yoga's default
    // reflects the requesting origin, which is exactly what must not ship.
    ...(enforcesPublicBoundary ? { cors: false as const } : {}),
    // The query language stays explorable where documents are arbitrary anyway.
    graphiql: options.nodeEnv === "development",
    landingPage: options.nodeEnv === "development",
    context: async ({ params, request }) => {
      const baseAuthenticator = await authenticatorPromise;
      const correlationId = correlationIdForRequest(request.headers);
      const budgetClass = persistedOperations.budgetClassFor(
        params.query ?? "",
        params.operationName,
      );
      // One request charges its budget once, however many resolvers ask who is
      // calling.
      let charged = false;
      const authenticator: Authenticator = {
        authenticate: async (authenticatedRequest) => {
          // The shared authenticator outlives this request, so the correlation
          // travels as ambient context rather than an argument the
          // `Authenticator` contract has no room for.
          const identity = await withCorrelationId(correlationId, () =>
            baseAuthenticator.authenticate(authenticatedRequest),
          );
          if (!identity) return null;
          const user = await options.db.selectFrom("users")
            .select(["id", "access_status", "suspension_reason"])
            .where("identity_issuer", "=", identity.issuer)
            .where("identity_subject", "=", identity.subject)
            .executeTakeFirst();
          if (user?.access_status === "SUSPENDED") {
            await options.db.insertInto("audit_entries").values({
              actor_user_id: user.id,
              acting_role: null,
              operation: "authenticated-operation.blocked",
              target_type: "User",
              target_id: user.id,
              outcome: "DENIED",
              reason_code: "USER_SUSPENDED",
              correlation_id: correlationId,
            }).execute();
            throw createGraphQLError(`Your User is suspended: ${user.suspension_reason}`, { extensions: { code: "USER_SUSPENDED" } });
          }
          if (user?.access_status === "ANONYMIZATION_PENDING") {
            await options.db.insertInto("audit_entries").values({ actor_user_id: user.id, acting_role: null, operation: "authenticated-operation.blocked", target_type: "User", target_id: user.id, outcome: "DENIED", reason_code: "USER_ANONYMIZATION_PENDING", correlation_id: correlationId }).execute();
            throw createGraphQLError("Your User Anonymization is pending identity deletion", { extensions: { code: "USER_ANONYMIZATION_PENDING" } });
          }
          if (user?.access_status === "FIXTURE_REMOVED") {
            await options.db.insertInto("audit_entries").values({ actor_user_id: user.id, acting_role: null, operation: "authenticated-operation.blocked", target_type: "User", target_id: user.id, outcome: "DENIED", reason_code: "USER_FIXTURE_REMOVED", correlation_id: correlationId }).execute();
            throw createGraphQLError("This synthetic User is no longer part of the canonical demonstration", { extensions: { code: "USER_FIXTURE_REMOVED" } });
          }

          // ADR 0025's per-User budget. It is charged here rather than at the
          // transport, because a shared credential is only a person once the
          // token has been validated and resolved to a User.
          // A token that resolves to no User is charged nothing: every operation
          // it attempts is refused by the resolver, and those refusals are what
          // the per-source denial budget counts.
          if (enforcesPublicBoundary && user && !charged) {
            charged = true;
            const outcome = budgets.chargeUserOperation(
              user.id,
              budgetClass,
              clock().getTime(),
            );
            if (outcome !== "ACCEPTED") {
              // Only the request that exhausted the budget is audited: every
              // later refusal would otherwise let a refused caller drive
              // unbounded Audit writes.
              if (outcome === "FIRST_REFUSAL") {
                await options.db.insertInto("audit_entries").values({ actor_user_id: user.id, acting_role: null, operation: "authenticated-operation.rate-limited", target_type: "User", target_id: user.id, outcome: "DENIED", reason_code: "RESOURCE_LIMIT_EXCEEDED", correlation_id: correlationId }).execute();
              }
              throw refusal(
                429,
                "REQUEST_LIMIT_EXCEEDED",
                "Too many requests. Try again in a minute.",
              );
            }
          }
          return identity;
        },
      };
      return { authenticator, correlationId, db: options.db, request };
    },
  });
}
