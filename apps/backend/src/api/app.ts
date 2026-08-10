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
import { studentFor } from "../authorization/student-policy.js";
import { recordAdministrationAudit } from "../audit/administration-audit.js";
import { administerAttendance, classRosterForViewer, recordAttendance } from "../attendance/attendance-service.js";
import { courseProgressForStudent } from "../attendance/course-progress-service.js";
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
import { correlationIdForRequest } from "./request-context.js";

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
}) {
  const authenticatorPromise = createAuthenticator({
    AUTH_MODE: options.authMode,
    AUTH0_AUDIENCE: options.auth0Audience,
    AUTH0_ISSUER: options.auth0Issuer,
    NODE_ENV: options.nodeEnv,
  });
  const classroomProvider = options.classroomProvider ?? createSimulatedClassroomProvider();

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
      RecordAttendanceResult: { __resolveType: (value) => value.__typename! },
      EnterClassroomResult: { __resolveType: (value) => value.__typename! },
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
        teacherClassSessions: async (_parent, _arguments, context) => {
          const teacher = await authenticateTeacher(context, "teacher-class-sessions.read");
          return graphQLResult(await teacherClassSessions(context.db, teacher, options.now?.() ?? new Date()));
        },
        teacherAttendanceClassSessions: async (_parent, _arguments, context) => {
          const teacher = await authenticateTeacher(context, "attendance-class-sessions.read");
          return graphQLResult(await teacherAttendanceClassSessions(context.db, teacher, options.now?.() ?? new Date()));
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
          const access = await enterClassroom(
            context.db,
            classroomProvider,
            identity,
            userRolesByGraphQL[input.actingRole],
            input.classSessionId,
            context.correlationId,
            options.now?.() ?? new Date(),
          );
          if (access.status === "UNKNOWN_USER") throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
          if (access.status === "ROLE_REQUIRED") throw createGraphQLError("The selected Role Assignment is required", { extensions: { code: "FORBIDDEN" } });
          return graphQLResult(access.result);
        },
        markNotificationRead: async (_parent, { id }, context) => {
          const user = await authenticateNotificationUser(context);
          const updated = await updateNotificationState(context.db, { notificationId: id, userId: user.id, action: "READ", correlationId: context.correlationId, now: options.now?.() ?? new Date() });
          if (!updated) throw createGraphQLError("The notification is unavailable", { extensions: { code: "FORBIDDEN" } });
          return graphQLResult((await notificationsForUser(context.db, user)).find((notification) => notification.id === id)!);
        },
        archiveNotification: async (_parent, { id }, context) => {
          const user = await authenticateNotificationUser(context);
          const updated = await updateNotificationState(context.db, { notificationId: id, userId: user.id, action: "ARCHIVE", correlationId: context.correlationId, now: options.now?.() ?? new Date() });
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
        saveTeacherAvailabilityRange: async (_parent, { input }, context) => {
          const teacher = await authenticateTeacher(context, "teacher-availability.changed");
          return graphQLResult(await auditedTeacherMutation(context, teacher, "teacher-availability.changed", () =>
            saveTeacherAvailabilityRange(context.db, teacher, { ...input, weekday: input.weekday as Weekday }, context.correlationId)));
        },
        addAvailabilityException: async (_parent, { input }, context) => {
          const teacher = await authenticateTeacher(context, "availability-exception.changed");
          return graphQLResult(await auditedTeacherMutation(context, teacher, "availability-exception.changed", () =>
            addAvailabilityException(context.db, teacher, input, context.correlationId)));
        },
        endTeacherAvailabilityRange: async (_parent, { input }, context) => {
          const teacher = await authenticateTeacher(context, "teacher-availability.ended");
          return graphQLResult(await auditedTeacherMutation(context, teacher, "teacher-availability.ended", () =>
            endTeacherAvailabilityRange(context.db, teacher, input, context.correlationId)));
        },
        removeAvailabilityException: async (_parent, { input }, context) => {
          const teacher = await authenticateTeacher(context, "availability-exception.removed");
          return graphQLResult(await auditedTeacherMutation(context, teacher, "availability-exception.removed", () =>
            removeAvailabilityException(context.db, teacher, input, context.correlationId)));
        },
        createCourse: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "course.created");
          return graphQLResult(await idempotentAdministrationMutation(context, administrator, "course.created", input.idempotencyKey, input, (transaction) => createCourse(transaction, administrator, input as unknown as Parameters<typeof createCourse>[2], context.correlationId)));
        },
        reviseCourseDetails: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "course.updated");
          return graphQLResult(await auditedAdministrationMutation(context, administrator, "course.updated", () => reviseCourseDetails(context.db, administrator, input, context.correlationId)));
        },
        createLessonUnit: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "lesson-unit.created");
          return graphQLResult(await idempotentAdministrationMutation(context, administrator, "lesson-unit.created", input.idempotencyKey, input, (transaction) => createLessonUnit(transaction, administrator, input as unknown as Parameters<typeof createLessonUnit>[2], context.correlationId)));
        },
        reviseLessonUnitIdentity: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "lesson-unit.updated");
          return graphQLResult(await auditedAdministrationMutation(context, administrator, "lesson-unit.updated", () => reviseLessonUnitIdentity(context.db, administrator, input as unknown as Parameters<typeof reviseLessonUnitIdentity>[2], context.correlationId)));
        },
        placeLessonUnitInCourse: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "lesson-unit.reordered");
          return graphQLResult(await auditedAdministrationMutation(context, administrator, "lesson-unit.reordered", () => placeLessonUnitInCourse(context.db, administrator, input, context.correlationId)));
        },
        retireLessonUnit: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "lesson-unit.retired");
          return graphQLResult(await idempotentAdministrationMutation(context, administrator, "lesson-unit.retired", input.idempotencyKey, input, (transaction) => retireLessonUnit(transaction, administrator, input as unknown as Parameters<typeof retireLessonUnit>[2], context.correlationId)));
        },
        saveLocalizedTopic: async (_parent, { input }, context) => {
          const administrator = await authenticateAdministrator(context, "topic.saved");
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
    perform: () => Promise<T>,
  ) {
    try {
      return await perform();
    } catch (error) {
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
      await context.db.insertInto("audit_entries").values({ actor_user_id: teacher.id, acting_role: "TEACHER", operation, target_type: targetType, target_id: teacher.id, outcome: "FAILED", reason_code: "UNEXPECTED_MUTATION_FAILURE", correlation_id: context.correlationId }).execute();
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
      await recordAdministrationAudit(context.db, { administratorId: administrator.id, correlationId: context.correlationId, operation, targetType, targetId: administrator.id, outcome: "FAILED", reasonCode: "UNEXPECTED_MUTATION_FAILURE" });
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
      await recordStudentMutationAudit(context.db, student.id, operation, targetType, context.correlationId, "FAILED", "UNEXPECTED_MUTATION_FAILURE");
      throw error;
    }
  }

  async function recordStudentMutationAudit(db: Database, studentId: string, operation: string, targetType: string, correlationId: string, outcome: "SUCCEEDED" | "DENIED" | "FAILED", reasonCode: string) {
    await db.insertInto("audit_entries").values({ actor_user_id: studentId, acting_role: "STUDENT", operation, target_type: targetType, target_id: studentId, outcome, reason_code: reasonCode, correlation_id: correlationId }).execute();
  }

  async function auditedAdministrationMutation<T>(context: ApiContext, administrator: { id: string }, operation: string, perform: () => Promise<T>): Promise<T> {
    try {
      return await perform();
    } catch (error) {
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
    context: async ({ request }) => ({
      authenticator: await authenticatorPromise,
      correlationId: correlationIdForRequest(request.headers),
      db: options.db,
      request,
    }),
  });
}
