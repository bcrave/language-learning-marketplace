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

import { createAuthenticator } from "../auth/create-authenticator.js";
import type { AppConfig } from "../config.js";
import type { Database } from "../database/database.js";
import {
  InterfaceLocale,
  type Resolvers,
  UserRole as GraphQLUserRole,
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

const validDisplayTimeZones = new Set(namedRegionalTimeZones());

function graphQLInterfaceLocale(locale: "en" | "es" | null) {
  if (locale === null) return null;
  return locale === "es" ? InterfaceLocale.Es : InterfaceLocale.En;
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
      Query: {
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
