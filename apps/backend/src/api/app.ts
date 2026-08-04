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

import {
  loadRoleWorkspace,
  rememberRoleWorkspacePlace,
} from "../authorization/role-workspace-service.js";
import { createAuthenticator } from "../auth/create-authenticator.js";
import type { AppConfig } from "../config.js";
import type { Database } from "../database/database.js";
import type { WorkspacePlace } from "../database/types.js";
import {
  addLessonMaterial,
  administrationCurriculum,
  administratorFor,
  changeTeacherQualification,
  createCourse,
  createLessonUnit,
  publicTeacherProfile,
  recordCurriculumAudit,
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
}) {
  const authenticatorPromise = createAuthenticator({
    AUTH_MODE: options.authMode,
    AUTH0_AUDIENCE: options.auth0Audience,
    AUTH0_ISSUER: options.auth0Issuer,
    NODE_ENV: options.nodeEnv,
  });

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
      Query: {
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

  async function authenticateAdministrator(context: ApiContext, operation: string) {
    const identity = await context.authenticator.authenticate(context.request);
    if (!identity) {
      throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
    }
    const result = await administratorFor(context.db, identity);
    if (result.status === "UNKNOWN_USER") {
      throw createGraphQLError("Authentication is required", { extensions: { code: "UNAUTHENTICATED" } });
    }
    if (result.status === "ROLE_REQUIRED") {
      await recordCurriculumAudit(context.db, {
        administratorId: result.userId!,
        correlationId: context.correlationId,
        operation,
        targetType: "CurriculumAdministration",
        targetId: result.userId,
        outcome: "DENIED",
        reasonCode: "PLATFORM_ADMINISTRATOR_ROLE_REQUIRED",
      });
      throw createGraphQLError("The Platform Administrator Role Assignment is required", { extensions: { code: "FORBIDDEN" } });
    }
    return result.administrator;
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

  async function idempotentAdministrationMutation<T>(context: ApiContext, administrator: { id: string }, operation: string, idempotencyKey: string, input: object, perform: (transaction: Database) => Promise<T>): Promise<T | { __typename: "CurriculumConflict"; code: string; message: string }> {
    const inputFingerprint = JSON.stringify(input);
    try {
      return await context.db.transaction().execute(async (transaction) => {
        await sql`select pg_advisory_xact_lock(hashtextextended(${`${administrator.id}:${operation}:${idempotencyKey}`}, 0))`.execute(transaction);
        await transaction.deleteFrom("mutation_idempotency_records").where("actor_user_id", "=", administrator.id).where("operation", "=", operation).where("idempotency_key", "=", idempotencyKey).where("created_at", "<=", sql<Date>`now() - interval '7 days'`).execute();
        const existing = await transaction.selectFrom("mutation_idempotency_records").select(["input_fingerprint", "outcome"]).where("actor_user_id", "=", administrator.id).where("operation", "=", operation).where("idempotency_key", "=", idempotencyKey).executeTakeFirst();
        if (existing) {
          if (existing.input_fingerprint !== inputFingerprint) {
            await recordCurriculumAudit(transaction, { administratorId: administrator.id, correlationId: context.correlationId, operation, targetType: "IdempotencyKey", targetId: administrator.id, outcome: "DENIED", reasonCode: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT" });
            return { __typename: "CurriculumConflict", code: "IDEMPOTENCY_KEY_REUSED", message: "The Idempotency Key was already used with different input." };
          }
          return existing.outcome as T;
        }
        const outcome = await perform(transaction as Database);
        await transaction.insertInto("mutation_idempotency_records").values({ actor_user_id: administrator.id, operation, idempotency_key: idempotencyKey, input_fingerprint: inputFingerprint, outcome: JSON.stringify(outcome as Record<string, unknown>) }).execute();
        return outcome;
      });
    } catch (error) {
      await recordCurriculumAudit(context.db, { administratorId: administrator.id, correlationId: context.correlationId, operation, targetType: "CurriculumAdministration", targetId: administrator.id, outcome: "FAILED", reasonCode: "UNEXPECTED_MUTATION_FAILURE" });
      throw error;
    }
  }

  async function auditedAdministrationMutation<T>(context: ApiContext, administrator: { id: string }, operation: string, perform: () => Promise<T>): Promise<T> {
    try {
      return await perform();
    } catch (error) {
      await recordCurriculumAudit(context.db, { administratorId: administrator.id, correlationId: context.correlationId, operation, targetType: "CurriculumAdministration", targetId: administrator.id, outcome: "FAILED", reasonCode: "UNEXPECTED_MUTATION_FAILURE" });
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
