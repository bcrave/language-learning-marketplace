import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";

import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createApi } from "../src/api/app.js";
import { persistedOperationId } from "../src/api/persisted-operations.js";
import { RELEASE_JOURNEY_OPERATIONS } from "../src/api/release-journey-operations.js";
import { createResourceBudgets } from "../src/api/resource-budget.js";
import { createMarketplaceServer } from "../src/api/server.js";
import { createDatabase, type Database } from "../src/database/database.js";
import { latestMigrationName, migrateDatabase } from "../src/database/migrate.js";
import { loadCanonicalFixtures } from "../src/fixtures/canonical-fixture-loader.js";
import { canonicalFixtureManifest } from "../src/fixtures/canonical-fixture-manifest.js";

/**
 * The public API boundary, exercised the way the internet reaches it: real HTTP,
 * behind the verified-source context the single public origin establishes, with
 * only build-produced persisted operations accepted and ADR 0025's budgets
 * charged. Everything here is externally observable behaviour, because that is
 * the only thing an attacker and the Security Release Gate both see.
 */
const TRUSTED_PROXY_SECRET = "caddy-shared-secret-for-the-public-api-boundary";
const PUBLIC_ORIGIN = "https://marketplace.example.test";
const REVIEWER_SOURCE = "203.0.113.4";

const ADMINISTRATOR = canonicalFixtureManifest.identities[0]!.id;
const STUDENT = canonicalFixtureManifest.identities.find(
  (identity) => identity.displayName === "Casey Nguyen",
)!.id;

const clientDocuments = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, "../../web/src/generated/persisted-documents.json"),
    "utf8",
  ),
) as Record<string, string>;

/** The identifier the browser client would send for one of its own operations. */
function clientOperation(operationName: string) {
  const entry = Object.entries(clientDocuments).find(([, document]) =>
    new RegExp(`^(query|mutation) ${operationName}[( ]`).test(document),
  );
  if (!entry) throw new Error(`The client manifest has no ${operationName} operation`);
  return entry[0];
}

function releaseOperation(name: keyof typeof RELEASE_JOURNEY_OPERATIONS) {
  return persistedOperationId(RELEASE_JOURNEY_OPERATIONS[name]);
}

interface Answer {
  status: number;
  headers: Headers;
  body: {
    data?: Record<string, unknown> | null;
    errors?: { message: string; extensions?: { code?: string } }[];
  };
}

describe("the public API boundary", () => {
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  let schemaMigration: string;
  let lessonUnitId: string;
  const runningServers: { close: () => void }[] = [];

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    db = createDatabase(
      await clonePostgreSqlTemplate(postgres, `boundary_${randomUUID().replaceAll("-", "")}`),
    );
    await loadCanonicalFixtures(db, { correlationId: "public-api-boundary-fixtures" });
    schemaMigration = await latestMigrationName();
    lessonUnitId = (
      await db.selectFrom("lesson_units").select("id").orderBy("id").executeTakeFirstOrThrow()
    ).id;
  }, 240_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  afterEach(() => {
    for (const server of runningServers.splice(0)) server.close();
  });

  /**
   * A boundary of its own per test: in-memory budgets are process state, and a
   * shared one would make each test depend on what the previous one spent.
   */
  async function startBoundary(
    limits: {
      userMutationLimit?: number;
      userReportLimit?: number;
      sourceDeniedAuthorizationLimit?: number;
    } = {},
  ) {
    const server = createMarketplaceServer({
      api: createApi({
        db,
        authMode: "fake",
        nodeEnv: "test",
        enforcesPublicBoundary: true,
        resourceBudgets: createResourceBudgets(limits),
      }),
      currentSchemaMigration: schemaMigration,
      db,
      logger: { warn: () => undefined } as never,
      publicOrigin: PUBLIC_ORIGIN,
      sourceRequestLimit: 10_000,
      trustedProxySecret: TRUSTED_PROXY_SECRET,
    });
    runningServers.push(server);
    await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
    const { port } = server.address() as AddressInfo;

    async function post(
      body: Record<string, unknown>,
      options: {
        userId?: string;
        source?: string;
        origin?: string | null;
        correlationId?: string;
      } = {},
    ): Promise<Answer> {
      const response = await fetch(`http://127.0.0.1:${port}/graphql`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-proxy-authorization": TRUSTED_PROXY_SECRET,
          "x-verified-source": options.source ?? REVIEWER_SOURCE,
          ...(options.origin === null ? {} : { origin: options.origin ?? PUBLIC_ORIGIN }),
          ...(options.userId ? { "x-demo-user-id": options.userId } : {}),
          ...(options.correlationId ? { "x-correlation-id": options.correlationId } : {}),
        },
        body: JSON.stringify(body),
      });
      return {
        status: response.status,
        headers: response.headers,
        body: (await response.json()) as Answer["body"],
      };
    }

    /** What a browser gets by simply visiting `/graphql`. */
    async function visit() {
      const response = await fetch(`http://127.0.0.1:${port}/graphql`, {
        headers: {
          "x-proxy-authorization": TRUSTED_PROXY_SECRET,
          "x-verified-source": REVIEWER_SOURCE,
          accept: "text/html",
        },
      });
      return { status: response.status, body: await response.text() };
    }

    return { post, visit };
  }

  function codesOf(answer: Answer) {
    return (answer.body.errors ?? []).map((error) => error.extensions?.code);
  }

  async function auditEntriesFor(correlationId: string) {
    return db
      .selectFrom("audit_entries")
      .select(["operation", "outcome", "reason_code"])
      .where("correlation_id", "=", correlationId)
      .execute();
  }

  describe("only build-produced persisted operations", () => {
    it("executes an operation the build produced", async () => {
      const { post } = await startBoundary();

      const answer = await post(
        { extensions: { documentId: releaseOperation("SmokeCredits") } },
        { userId: STUDENT },
      );

      expect(answer.status).toBe(200);
      expect(answer.body.data?.["studentClassCredits"]).toBeTruthy();
    });

    it("refuses a GraphQL document, however ordinary it looks", async () => {
      const { post } = await startBoundary();

      const answer = await post(
        { query: "query Probe { studentClassCredits { availableBalance } }" },
        { userId: STUDENT },
      );

      expect(answer.status).toBe(400);
      expect(codesOf(answer)).toEqual(["PERSISTED_OPERATION_REQUIRED"]);
      expect(answer.body.data).toBeUndefined();
    });

    it("refuses an identifier the build never produced", async () => {
      const { post } = await startBoundary();

      const answer = await post(
        { extensions: { documentId: persistedOperationId("query Probe { __typename }") } },
        { userId: STUDENT },
      );

      expect(answer.status).toBe(400);
      expect(codesOf(answer)).toEqual(["UNKNOWN_PERSISTED_OPERATION"]);
    });

    it("refuses a known identifier carrying a document of its own", async () => {
      // A caller that sends both must not be able to have the document win.
      const { post } = await startBoundary();

      const answer = await post(
        {
          query: "mutation Steal { __typename }",
          extensions: { documentId: releaseOperation("SmokeCredits") },
        },
        { userId: STUDENT },
      );

      expect(answer.status).toBe(200);
      expect(answer.body.data?.["studentClassCredits"]).toBeTruthy();
    });

    it("exposes neither GraphiQL nor a landing page", async () => {
      const { visit } = await startBoundary();

      const visited = await visit();

      expect(visited.status).not.toBe(200);
      expect(visited.body).not.toContain("graphiql");
      expect(visited.body.toLowerCase()).not.toContain("<!doctype html");
    });

    it("offers no cross-origin policy for anyone to use", async () => {
      // ADR 0028 gives the deployment one origin, so a cross-origin policy
      // would only ever describe a caller the browser client never is.
      const { post } = await startBoundary();

      const answer = await post({
        extensions: { documentId: releaseOperation("SmokeCredits") },
      });

      expect(answer.headers.get("access-control-allow-origin")).toBeNull();
      expect(answer.headers.get("access-control-allow-credentials")).toBeNull();
    });
  });

  describe("bounded resource consumption", () => {
    it("refuses oversized variables before parsing a document", async () => {
      const { post } = await startBoundary();

      const answer = await post(
        {
          extensions: { documentId: releaseOperation("SmokeCredits") },
          variables: { padding: "x".repeat(200_000) },
        },
        { userId: STUDENT },
      );

      expect(answer.status).toBe(413);
      expect(codesOf(answer)).toEqual(["VARIABLES_TOO_LARGE"]);
    });

    it("refuses mutations beyond the User's allowance and audits that once", async () => {
      const { post } = await startBoundary({ userMutationLimit: 1 });
      const correlationId = `boundary-mutation-budget-${randomUUID()}`;
      const topic = {
        extensions: { documentId: clientOperation("SaveLocalizedTopic") },
        variables: {
          input: {
            idempotencyKey: randomUUID(),
            key: "BDG",
            labelEn: "Boundary",
            labelEs: "Límite",
          },
        },
      };

      const accepted = await post(topic, { userId: ADMINISTRATOR, correlationId });
      const refused = await post(topic, { userId: ADMINISTRATOR, correlationId });
      const refusedAgain = await post(topic, { userId: ADMINISTRATOR, correlationId });

      expect(accepted.body.data?.["saveLocalizedTopic"]).toBeTruthy();
      expect(refused.status).toBe(429);
      expect(codesOf(refused)).toEqual(["REQUEST_LIMIT_EXCEEDED"]);
      expect(refusedAgain.status).toBe(429);
      // Retry guidance, and nothing about counters or identities.
      expect(refused.headers.get("retry-after")).toBe("60");
      expect(JSON.stringify(refused.body)).not.toContain(ADMINISTRATOR);

      const audited = await auditEntriesFor(correlationId);
      expect(
        audited.filter((entry) => entry.reason_code === "RESOURCE_LIMIT_EXCEEDED"),
      ).toEqual([
        {
          operation: "authenticated-operation.rate-limited",
          outcome: "DENIED",
          reason_code: "RESOURCE_LIMIT_EXCEEDED",
        },
      ]);
    });

    it("spends a report's stricter allowance without spending the mutation allowance", async () => {
      const { post } = await startBoundary({ userMutationLimit: 1, userReportLimit: 1 });
      const auditLog = { extensions: { documentId: releaseOperation("SmokeAudit") } };

      const firstReport = await post(auditLog, { userId: ADMINISTRATOR });
      const secondReport = await post(auditLog, { userId: ADMINISTRATOR });
      const mutation = await post(
        {
          extensions: { documentId: clientOperation("SaveLocalizedTopic") },
          variables: {
            input: {
              idempotencyKey: randomUUID(),
              key: "RPT",
              labelEn: "Reports",
              labelEs: "Informes",
            },
          },
        },
        { userId: ADMINISTRATOR },
      );

      expect(firstReport.status).toBe(200);
      expect(secondReport.status).toBe(429);
      expect(mutation.status).toBe(200);
    });

    it("leaves ordinary reads to the per-source request limit", async () => {
      const { post } = await startBoundary({ userMutationLimit: 1, userReportLimit: 1 });
      const credits = { extensions: { documentId: releaseOperation("SmokeCredits") } };

      for (let attempt = 0; attempt < 5; attempt += 1) {
        expect((await post(credits, { userId: STUDENT })).status).toBe(200);
      }
    });

    it("stops answering a source that keeps being denied", async () => {
      const { post } = await startBoundary({ sourceDeniedAuthorizationLimit: 2 });
      const abusive = "198.51.100.7";
      const enumerating = {
        extensions: { documentId: clientOperation("ClassRoster") },
        variables: { classSessionId: randomUUID() },
      };

      for (let attempt = 0; attempt < 3; attempt += 1) {
        await post(enumerating, { userId: STUDENT, source: abusive });
      }

      const refused = await post(
        { extensions: { documentId: releaseOperation("SmokeCredits") } },
        { userId: STUDENT, source: abusive },
      );
      const unaffected = await post(
        { extensions: { documentId: releaseOperation("SmokeCredits") } },
        { userId: STUDENT, source: "203.0.113.9" },
      );

      expect(refused.status).toBe(429);
      expect(codesOf(refused)).toEqual(["REQUEST_LIMIT_EXCEEDED"]);
      expect(unaffected.status).toBe(200);
    });
  });

  describe("the single public origin", () => {
    it("refuses a request that names no origin", async () => {
      const { post } = await startBoundary();

      const answer = await post(
        { extensions: { documentId: releaseOperation("SmokeCredits") } },
        { userId: STUDENT, origin: null },
      );

      expect(answer.status).toBe(403);
    });

    it("refuses a request that names a foreign origin", async () => {
      const { post } = await startBoundary();

      const answer = await post(
        { extensions: { documentId: releaseOperation("SmokeCredits") } },
        { userId: STUDENT, origin: "https://attacker.example" },
      );

      expect(answer.status).toBe(403);
      expect(JSON.stringify(answer.body)).not.toContain("attacker.example");
    });
  });

  describe("hostile content and out-of-relationship access", () => {
    it("refuses structured Lesson Material that is not headings, text, lists, or emphasis", async () => {
      const { post } = await startBoundary();
      const correlationId = `boundary-hostile-content-${randomUUID()}`;

      const answer = await post(
        {
          extensions: { documentId: clientOperation("AddLessonMaterial") },
          variables: {
            input: {
              idempotencyKey: randomUUID(),
              lessonUnitId,
              kind: "STRUCTURED_TEXT",
              title: "Hostile guide",
              structuredContent: [
                { type: "paragraph", text: "<script>fetch('https://attacker.example')</script>" },
                { type: "html", text: "<img src=x onerror=alert(1)>" },
              ],
            },
          },
        },
        { userId: ADMINISTRATOR, correlationId },
      );

      expect(answer.body.data?.["addLessonMaterial"]).toMatchObject({
        __typename: "InvalidLessonMaterial",
        code: "INVALID_LESSON_MATERIAL",
      });
      expect(await auditEntriesFor(correlationId)).toEqual([
        {
          operation: "lesson-material.created",
          outcome: "DENIED",
          reason_code: "INVALID_LESSON_MATERIAL",
        },
      ]);
    });

    it("stores an HTTPS reference only as an HTTPS reference", async () => {
      const { post } = await startBoundary();

      const answer = await post(
        {
          extensions: { documentId: clientOperation("AddLessonMaterial") },
          variables: {
            input: {
              idempotencyKey: randomUUID(),
              lessonUnitId,
              kind: "HTTPS_REFERENCE",
              title: "Hostile reference",
              httpsUrl: "javascript:alert(1)",
              publisher: "Attacker",
            },
          },
        },
        { userId: ADMINISTRATOR },
      );

      expect(answer.body.data?.["addLessonMaterial"]).toMatchObject({
        __typename: "InvalidLessonMaterial",
      });
    });

    it("denies a Lesson Unit the viewer has no relationship with, and audits the denial", async () => {
      const { post } = await startBoundary();
      const correlationId = `boundary-direct-object-${randomUUID()}`;

      const answer = await post(
        {
          extensions: { documentId: clientOperation("LessonMaterials") },
          variables: { lessonUnitId, actingRole: "STUDENT" },
        },
        { userId: STUDENT, correlationId },
      );

      // The denial says nothing about whether the Lesson Unit exists.
      expect(codesOf(answer)).toEqual(["NOT_FOUND"]);
      expect(answer.body.data?.["lessonMaterials"]).toBeNull();
      expect(await auditEntriesFor(correlationId)).toEqual([
        {
          operation: "lesson-materials.read",
          outcome: "DENIED",
          reason_code: "LESSON_MATERIALS_NOT_FOUND",
        },
      ]);
    });

    it("denies a role the caller does not hold", async () => {
      const { post } = await startBoundary();

      const answer = await post(
        {
          extensions: { documentId: clientOperation("ClassRoster") },
          variables: { classSessionId: randomUUID() },
        },
        { userId: STUDENT },
      );

      // The denial names no Class Session, so it discloses nothing about
      // whether the identifier corresponds to one.
      expect(["FORBIDDEN", "NOT_FOUND"]).toContain(codesOf(answer)[0]);
      expect(answer.body.data?.["classRoster"]).toBeFalsy();
    });

    it("denies a marketplace-wide report to a Student", async () => {
      const { post } = await startBoundary();

      const answer = await post(
        {
          extensions: { documentId: clientOperation("MarketplaceOperationalReport") },
          variables: {},
        },
        { userId: STUDENT },
      );

      expect(answer.body.errors?.length).toBeGreaterThan(0);
      expect(answer.body.data?.["marketplaceOperationalReport"]).toBeFalsy();
    });
  });
});
