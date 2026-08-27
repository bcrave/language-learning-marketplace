import { randomUUID } from "node:crypto";

import { USER_ROLES } from "@marketplace/core";
import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApi } from "../src/api/app.js";
import {
  bindDemonstrationIdentities,
  parseDemonstrationIdentityBinding,
  validateDemonstrationIdentityBinding,
} from "../src/auth/demonstration-identities.js";
import { createDatabase, type Database } from "../src/database/database.js";
import { migrateDatabase } from "../src/database/migrate.js";
import { loadCanonicalFixtures } from "../src/fixtures/canonical-fixture-loader.js";
import { canonicalFixtureManifest } from "../src/fixtures/canonical-fixture-manifest.js";

const AUTH0_ISSUER = "https://demonstration.us.auth0.com/";
const SOFIA = canonicalFixtureManifest.identities[0]!.id;
const ALEX = canonicalFixtureManifest.identities[1]!.id;

function boundSubjects() {
  return Object.fromEntries(
    canonicalFixtureManifest.identities.map((identity, index) => [
      identity.id,
      `auth0|demonstration-${index}`,
    ]),
  );
}

// ADR 0019 hands reviewers shared Auth0 identities. What each of them may do is
// settled by the canonical fixture manifest; binding only says which Auth0
// subject signs in as which of those synthetic people. These tests hold that
// line: the binding grants nothing, and no application surface reaches past the
// four roles into the Project Owner authority CONTEXT.md keeps outside the app.
describe("shared demonstration identities", () => {
  let postgres: StartedPostgreSqlContainer;
  let boundDb: Database;
  let localDb: Database;
  let boundApi: ReturnType<typeof createApi>;
  let localApi: ReturnType<typeof createApi>;
  const loadedAt = new Date("2026-08-27T12:00:00.000Z");

  async function clone(prefix: string) {
    return createDatabase(
      await clonePostgreSqlTemplate(postgres, `${prefix}_${randomUUID().replaceAll("-", "")}`),
    );
  }

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();

    boundDb = await clone("bound_identities");
    localDb = await clone("local_identities");
    boundApi = createApi({ db: boundDb, authMode: "fake", nodeEnv: "test", now: () => loadedAt });
    localApi = createApi({ db: localDb, authMode: "fake", nodeEnv: "test", now: () => loadedAt });

    await loadCanonicalFixtures(boundDb, {
      now: loadedAt,
      correlationId: "bound-identities",
      identityBinding: { issuer: AUTH0_ISSUER, subjects: boundSubjects() },
    });
    await loadCanonicalFixtures(localDb, {
      now: loadedAt,
      correlationId: "local-identities",
    });
  }, 240_000);

  afterAll(async () => {
    await boundDb?.destroy();
    await localDb?.destroy();
    await postgres?.stop();
  });

  async function graphql(
    api: ReturnType<typeof createApi>,
    subject: string,
    query: string,
    variables: Record<string, unknown> = {},
  ) {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // The fake adapter establishes identity only (ADR 0037); roles and
        // relationship permissions still load from PostgreSQL, which is what
        // makes this a real check of what a shared identity may do.
        "x-demo-user-id": subject,
      },
      body: JSON.stringify({ query, variables }),
    });
    return response.json();
  }

  it("points every shared identity at the demonstration Auth0 tenant", async () => {
    const users = await boundDb
      .selectFrom("users")
      .select(["id", "identity_issuer", "identity_subject"])
      .execute();

    expect(users.every((user) => user.identity_issuer === AUTH0_ISSUER)).toBe(true);
    expect(new Set(users.map((user) => user.identity_subject)).size).toBe(users.length);
  });

  it("leaves the fake adapter unable to reach a bound identity", async () => {
    // ADR 0037 isolates fake authentication from the deployed tenant. Once the
    // identities are bound, the fake issuer matches nobody, so a stray
    // development header resolves to no User at all.
    const result = await graphql(
      boundApi,
      SOFIA,
      `query Workspace($actingRole: UserRole!) {
        roleWorkspace(actingRole: $actingRole) { actingRole }
      }`,
      { actingRole: "STUDENT" },
    );

    expect(result.errors?.length ?? 0).toBeGreaterThan(0);
  });

  it("grants no Role Assignment of its own", async () => {
    const assignments = await boundDb
      .selectFrom("role_assignments")
      .select(["user_id", "role"])
      .execute();

    for (const identity of canonicalFixtureManifest.identities) {
      const held = assignments
        .filter((assignment) => assignment.user_id === identity.id)
        .map(({ role }) => role)
        .sort();
      expect(held).toEqual([...identity.roles].sort());
    }
  });

  it("bounds every granted role to the application role vocabulary", async () => {
    const granted = await boundDb
      .selectFrom("role_assignments")
      .select("role")
      .distinct()
      .execute();

    expect(granted.every(({ role }) => USER_ROLES.includes(role))).toBe(true);
    // Every application role is reachable, so no reviewer needs an elevation.
    expect(granted.map(({ role }) => role).sort()).toEqual([...USER_ROLES].sort());
  });

  it("refuses a role outside the application vocabulary", async () => {
    const result = await graphql(
      localApi,
      SOFIA,
      `mutation Grant($input: ChangeRoleAssignmentInput!) {
        grantRoleAssignment(input: $input) { __typename }
      }`,
      {
        input: {
          idempotencyKey: randomUUID(),
          userId: ALEX,
          role: "PROJECT_OWNER",
          reason: "Attempted elevation beyond the application.",
        },
      },
    );

    expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    expect(result.data?.grantRoleAssignment).toBeUndefined();
    const changes = await localDb
      .selectFrom("role_assignment_changes")
      .selectAll()
      .execute();
    expect(changes).toEqual([]);
  });

  it("keeps the widest reachable scope the one the application defines", async () => {
    const result = await graphql(
      localApi,
      SOFIA,
      `query Workspace($actingRole: UserRole!) {
        roleWorkspace(actingRole: $actingRole) { actingRole relationshipScope }
      }`,
      { actingRole: "PLATFORM_ADMINISTRATOR" },
    );

    expect(result.data.roleWorkspace).toEqual({
      actingRole: "PLATFORM_ADMINISTRATOR",
      // MARKETPLACE_WIDE is the widest scope the application defines. There is
      // no wider one for an elevation to climb into.
      relationshipScope: "MARKETPLACE_WIDE",
    });
  });

  it("refuses to bind an identity the manifest does not describe", () => {
    expect(() =>
      validateDemonstrationIdentityBinding({
        issuer: AUTH0_ISSUER,
        subjects: { ...boundSubjects(), [randomUUID()]: "auth0|stranger" },
      }),
    ).toThrow(/canonical fixture identity/);
  });

  it("refuses to let one Auth0 subject sign in as two people", () => {
    const subjects = boundSubjects();
    expect(() =>
      validateDemonstrationIdentityBinding({
        issuer: AUTH0_ISSUER,
        subjects: { ...subjects, [ALEX]: subjects[SOFIA]! },
      }),
    ).toThrow(/its own Auth0 subject/);
  });

  it("refuses a binding that leaves an application role undemonstrated", () => {
    const subjects = boundSubjects();
    for (const identity of canonicalFixtureManifest.identities) {
      if (identity.roles.includes("PLATFORM_ADMINISTRATOR")) delete subjects[identity.id];
    }

    expect(() =>
      validateDemonstrationIdentityBinding({ issuer: AUTH0_ISSUER, subjects }),
    ).toThrow(/PLATFORM_ADMINISTRATOR/);
  });

  it("reads the binding from configuration and normalises the issuer", () => {
    const binding = parseDemonstrationIdentityBinding({
      AUTH0_ISSUER: "https://demonstration.us.auth0.com",
      DEMONSTRATION_IDENTITY_SUBJECTS: JSON.stringify(boundSubjects()),
    });

    expect(binding?.issuer).toBe(AUTH0_ISSUER);
  });

  it("leaves a deployment without shared identities unbound rather than half bound", () => {
    expect(parseDemonstrationIdentityBinding({})).toBeNull();
    expect(() =>
      parseDemonstrationIdentityBinding({
        DEMONSTRATION_IDENTITY_SUBJECTS: JSON.stringify(boundSubjects()),
      }),
    ).toThrow(/AUTH0_ISSUER/);
  });

  it("rotates a subject in place without disturbing roles", async () => {
    const before = await boundDb.selectFrom("role_assignments").selectAll().execute();
    const rotated = Object.fromEntries(
      Object.entries(boundSubjects()).map(([userId, subject]) => [userId, `${subject}-rotated`]),
    );

    await bindDemonstrationIdentities(boundDb, { issuer: AUTH0_ISSUER, subjects: rotated });

    expect(await boundDb.selectFrom("role_assignments").selectAll().execute()).toEqual(before);
    const sofia = await boundDb
      .selectFrom("users")
      .select("identity_subject")
      .where("id", "=", SOFIA)
      .executeTakeFirstOrThrow();
    expect(sofia.identity_subject).toBe(rotated[SOFIA]);
  });
});
