import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { generateKeyPair, SignJWT } from "jose";
import { sql } from "kysely";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApi } from "../src/api/app.js";
import { createMarketplaceServer } from "../src/api/server.js";
import { createDatabase, type Database } from "../src/database/database.js";
import { latestMigrationName, migrateDatabase } from "../src/database/migrate.js";
import {
  createOperationalCounters,
  type OperationalCounters,
} from "../src/observability/operational-counters.js";
import {
  clearOperationalIncident,
  clearOperationalIncidentsForFamily,
  openOperationalIncidents,
  type AlertDispatch,
} from "../src/observability/operational-incidents.js";
import {
  readOwnerDiagnostics,
  renderOwnerDiagnosticsSummary,
} from "../src/observability/owner-diagnostics.js";
import { createOperationalWatch } from "../src/observability/operational-watch.js";
import type { TelemetryReporter } from "../src/observability/telemetry.js";
import {
  MARKETPLACE_WORKER_NAME,
  writeWorkerHeartbeat,
} from "../src/worker/worker-heartbeat.js";

const RELEASE = "abc1234";
const SCHEMA_VERSION = await latestMigrationName();

/**
 * One PostgreSQL container for the file, cloned per suite. Three containers
 * cost three pulls and three shutdowns to prove the same schema three times.
 */
let postgres: StartedPostgreSqlContainer;

beforeAll(async () => {
  postgres = await startPostgreSqlTemplate();
  const template = createDatabase(postgres.getConnectionUri());
  await migrateDatabase(template);
  await template.destroy();
}, 180_000);

afterAll(async () => {
  await postgres.stop();
});

async function cloneDatabase(prefix: string) {
  return createDatabase(
    await clonePostgreSqlTemplate(postgres, `${prefix}_${randomUUID().replaceAll("-", "")}`),
  );
}

/**
 * The alert lifecycle exercised the way it actually runs: a real database, the
 * real observation queries, and the real incident table. The reporter is the
 * only stand-in, because the alternative is asserting against a third party's
 * inbox — and what matters is which alerts were sent, and how many.
 */
function recordingReporter() {
  const sent: AlertDispatch[] = [];
  const reporter: TelemetryReporter = {
    reportAlert: (dispatch) => sent.push(dispatch),
    reportFailure: () => undefined,
    flush: async () => true,
  };
  return { reporter, sent };
}

describe("operational alerting", () => {
  let db: Database;
  let connectionUrl: (databaseName: string) => string;
  const observedAt = new Date("2026-08-29T12:00:00.000Z");
  const at = (minutes: number) => new Date(observedAt.getTime() + minutes * 60_000);

  /** A deployment nothing is wrong with, which every case starts from. */
  async function makeHealthy(now: Date) {
    await writeWorkerHeartbeat(db, { release: RELEASE, observedAt: now });
    await db.deleteFrom("canonical_data_rebuilds").execute();
    await db
      .insertInto("canonical_data_rebuilds")
      .values({
        dispatch_id: `github-rebuild:${randomUUID()}`,
        correlation_id: `canonical-rebuild-${randomUUID()}`,
        fixture_manifest_version: "synthetic-curriculum.v1",
        fixture_generation: 1,
        schema_version: SCHEMA_VERSION,
        initiator: "SCHEDULED_SYSTEM",
        owner_reason: "Nightly canonical baseline replacement.",
        validation_evidence: JSON.stringify({}),
        state: "COMPLETED",
        started_at: new Date(now.getTime() - 60 * 60_000),
        completed_at: new Date(now.getTime() - 59 * 60_000),
      })
      .execute();
    await db.deleteFrom("rolling_fixture_reconciliations").execute();
    await db
      .insertInto("rolling_fixture_reconciliations")
      .values({
        correlation_id: `rolling-fixtures-${randomUUID()}`,
        reconciled_for: now,
        advanced_fixture_count: 4,
        completed_at: new Date(now.getTime() - 10 * 60_000),
      })
      .execute();
  }

  /** Writes a fresh heartbeat and observes, which is what a healthy minute is. */
  async function beat(watch: { observe: (now?: Date) => Promise<unknown> }, now: Date) {
    await writeWorkerHeartbeat(db, { release: RELEASE, observedAt: now });
    await watch.observe(now);
  }

  function watchFor(database: Database) {
    const { reporter, sent } = recordingReporter();
    return {
      sent,
      watch: createOperationalWatch({
        db: database,
        release: RELEASE,
        counters: createOperationalCounters(),
        reporter,
      }),
    };
  }

  beforeAll(async () => {
    connectionUrl = (databaseName) => {
      const url = new URL(postgres.getConnectionUri());
      url.pathname = `/${databaseName}`;
      return url.toString();
    };
    db = await cloneDatabase("alerting");
    // The worker installs this schema on its first run. The observation reads
    // the queue exactly as Graphile publishes it, so the shape is reproduced
    // here rather than starting a real worker to obtain four columns.
    await sql`create schema graphile_worker`.execute(db);
    await sql`
      create table graphile_worker.jobs (
        id bigserial primary key,
        task_identifier text not null,
        run_at timestamptz not null,
        attempts integer not null default 0,
        max_attempts integer not null default 4,
        locked_at timestamptz
      )
    `.execute(db);
  }, 180_000);

  afterAll(async () => {
    await db.destroy();
  });

  beforeEach(async () => {
    await db.deleteFrom("operational_incidents").execute();
    await db.deleteFrom("worker_heartbeats").execute();
    await db.deleteFrom("audit_entries").execute();
    await db.deleteFrom("notification_delivery_attempts").execute();
    await db.deleteFrom("email_notification_intents").execute();
    await db.deleteFrom("in_app_notifications").execute();
    await sql`delete from graphile_worker.jobs`.execute(db);
    await makeHealthy(observedAt);
  });

  it("raises nothing while the deployment is healthy", async () => {
    const { watch, sent } = watchFor(db);
    await watch.observe(observedAt);
    await watch.observe(at(1));
    expect(sent).toEqual([]);
    expect(await openOperationalIncidents(db)).toEqual([]);
  });

  it("sends one alert for a stale worker heartbeat and never repeats it", async () => {
    const { watch, sent } = watchFor(db);
    await watch.observe(at(4));
    await watch.observe(at(5));
    await watch.observe(at(6));
    expect(sent.map((dispatch) => [dispatch.kind, dispatch.conditionId])).toEqual([
      ["CONFIRMED", "worker.heartbeat-stale"],
    ]);
    expect(sent[0]!.severity).toBe("OWNER_ATTENTION");
    expect(sent[0]!.route).toBe("SENTRY_EMAIL");
    expect(sent[0]!.evidence).toMatchObject({
      workerName: MARKETPLACE_WORKER_NAME,
      release: RELEASE,
    });
  });

  it("sends one recovery notification once the worker has been healthy for three minutes", async () => {
    const { watch, sent } = watchFor(db);
    await watch.observe(at(4));
    await beat(watch, at(5));
    expect(sent).toHaveLength(1);

    await beat(watch, at(8));
    expect(sent.map((dispatch) => dispatch.kind)).toEqual(["CONFIRMED", "RECOVERED"]);
    // The same incident throughout, which is what joins the two messages.
    expect(sent[1]!.incidentCorrelationId).toBe(sent[0]!.incidentCorrelationId);
    expect(await openOperationalIncidents(db)).toEqual([]);
  });

  it("opens a new correlated incident when the same condition recurs after clearing", async () => {
    const { watch, sent } = watchFor(db);
    await watch.observe(at(4));
    await beat(watch, at(5));
    await beat(watch, at(8));
    expect(sent.map((dispatch) => dispatch.kind)).toEqual(["CONFIRMED", "RECOVERED"]);

    await watch.observe(at(20));
    expect(sent.map((dispatch) => dispatch.kind)).toEqual([
      "CONFIRMED",
      "RECOVERED",
      "CONFIRMED",
    ]);
    expect(sent[2]!.incidentCorrelationId).not.toBe(sent[0]!.incidentCorrelationId);
  });

  it("escalates once when a rolled-back rebuild becomes an indeterminate one", async () => {
    const { watch, sent } = watchFor(db);
    const correlationId = `canonical-rebuild-${randomUUID()}`;
    const rebuild = {
      dispatch_id: `github-rebuild:${randomUUID()}`,
      correlation_id: correlationId,
      fixture_manifest_version: "synthetic-curriculum.v1",
      fixture_generation: 2,
      schema_version: SCHEMA_VERSION,
      initiator: "SCHEDULED_SYSTEM" as const,
      owner_reason: "Nightly canonical baseline replacement.",
      validation_evidence: JSON.stringify({}),
      started_at: observedAt,
      completed_at: observedAt,
    };
    await db
      .insertInto("canonical_data_rebuilds")
      .values({ ...rebuild, state: "ROLLED_BACK", safe_failure_code: "FIXTURE_INVARIANT_VIOLATED" })
      .execute();
    await beat(watch, at(1));
    expect(sent.map((dispatch) => [dispatch.kind, dispatch.severity])).toEqual([
      ["CONFIRMED", "OWNER_ATTENTION"],
    ]);

    await db
      .updateTable("canonical_data_rebuilds")
      .set({ state: "INDETERMINATE" })
      .where("correlation_id", "=", correlationId)
      .execute();
    await db
      .updateTable("maintenance_state")
      .set({
        state: "INDETERMINATE",
        holder_id: rebuild.dispatch_id,
        correlation_id: correlationId,
      })
      .where("singleton", "=", true)
      .execute();
    await beat(watch, at(2));
    await beat(watch, at(3));

    expect(sent.map((dispatch) => [dispatch.kind, dispatch.severity])).toEqual([
      ["CONFIRMED", "OWNER_ATTENTION"],
      ["ESCALATED", "IMMEDIATE"],
    ]);
    expect(sent[1]!.incidentCorrelationId).toBe(sent[0]!.incidentCorrelationId);

    // Elapsed time never clears it; the owner's verified recovery does.
    await db
      .updateTable("maintenance_state")
      .set({ state: "AVAILABLE", holder_id: null, correlation_id: null })
      .where("singleton", "=", true)
      .execute();
    await db
      .updateTable("canonical_data_rebuilds")
      .set({ state: "COMPLETED", safe_failure_code: null })
      .where("correlation_id", "=", correlationId)
      .execute();
    await beat(watch, at(4));
    await beat(watch, at(30));
    expect(await openOperationalIncidents(db)).toHaveLength(1);

    // The owner's verified recovery closes it, and answers with the single
    // recovery notification the workflow sends on their behalf.
    const recovered = await clearOperationalIncidentsForFamily(db, {
      family: "canonical-rebuild-fixture-reconciliation",
    });
    expect(recovered.map((alert) => [alert.kind, alert.conditionId])).toEqual([
      ["RECOVERED", "fixtures.rebuild-indeterminate"],
    ]);
    expect(recovered[0]!.incidentCorrelationId).toBe(sent[0]!.incidentCorrelationId);
    expect(await openOperationalIncidents(db)).toEqual([]);
  });

  it("groups exhausted Notification Intents and clears them on their safe disposition", async () => {
    const student = await db
      .insertInto("users")
      .values({
        id: randomUUID(),
        identity_issuer: "https://tenant.example.test/",
        identity_subject: `auth0|${randomUUID()}`,
        display_name: "Reviewer Student",
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    const intent = await db
      .insertInto("email_notification_intents")
      .values({
        recipient_user_id: student.id,
        message_id: "notification.classSession.reminder",
        locale: "en",
        variables: JSON.stringify({}),
        rendered_content: "reminder",
        source_reference: `class-session-reminder:${randomUUID()}`,
        state: "EXHAUSTED",
        attempt_count: 4,
        completed_at: observedAt,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    await db
      .insertInto("notification_delivery_attempts")
      .values({
        notification_intent_id: intent.id,
        attempt_number: 4,
        outcome: "PERMANENT_FAILURE",
        safe_failure_code: "EMAIL_ADAPTER_FAILURE",
        attempted_at: observedAt,
      })
      .execute();

    const { watch, sent } = watchFor(db);
    await beat(watch, at(1));
    await beat(watch, at(2));
    expect(sent).toHaveLength(1);
    expect(sent[0]!.conditionId).toBe("notifications.delivery-exhausted");
    expect(sent[0]!.evidence).toMatchObject({
      channel: "EMAIL",
      safeFailureCode: "EMAIL_ADAPTER_FAILURE",
      eventCount: 1,
      attemptCount: 4,
    });

    // Reconciling the administrator task moves the intent out of EXHAUSTED,
    // which is exactly the safe disposition the clearing rule asks for.
    await db
      .updateTable("email_notification_intents")
      .set({ state: "SUPPRESSED" })
      .where("id", "=", intent.id)
      .execute();
    await beat(watch, at(3));
    expect(sent.map((dispatch) => dispatch.kind)).toEqual(["CONFIRMED", "RECOVERED"]);
  });

  it("records only evidence the telemetry filter is allowed to carry", async () => {
    const { watch, sent } = watchFor(db);
    await watch.observe(at(4));
    const stored = await openOperationalIncidents(db);
    expect(stored).toHaveLength(1);
    const serialized = JSON.stringify([sent, stored]);
    for (const disclosure of ["password", "authorization", "Bearer ", "@example.test"]) {
      expect(serialized).not.toContain(disclosure);
    }
  });

  it("holds a sustained backlog for five minutes before it becomes an alert", async () => {
    const { watch, sent } = watchFor(db);
    await sql`
      insert into graphile_worker.jobs (task_identifier, run_at)
      select 'deliver_notification_intents', ${at(-30)} from generate_series(1, 101)
    `.execute(db);

    await beat(watch, at(1));
    await beat(watch, at(4));
    expect(sent).toEqual([]);

    await beat(watch, at(6));
    expect(sent.map((dispatch) => [dispatch.kind, dispatch.conditionId])).toEqual([
      ["CONFIRMED", "worker.queue-backlog"],
    ]);
    expect(sent[0]!.evidence).toMatchObject({ runnableJobCount: 101 });
  });

  it("restarts a confirmation window that a healthy reading interrupted", async () => {
    const { watch, sent } = watchFor(db);
    const backlog = async () => {
      await sql`
        insert into graphile_worker.jobs (task_identifier, run_at)
        select 'deliver_notification_intents', ${at(-30)} from generate_series(1, 101)
      `.execute(db);
    };
    await backlog();
    await beat(watch, at(1));
    await beat(watch, at(4));

    // Drained just before the window closed: the five minutes start again.
    await sql`delete from graphile_worker.jobs`.execute(db);
    await beat(watch, at(5));
    await backlog();
    await beat(watch, at(6));
    await beat(watch, at(9));
    expect(sent).toEqual([]);

    await beat(watch, at(11));
    expect(sent.map((dispatch) => dispatch.conditionId)).toEqual(["worker.queue-backlog"]);
  });

  it("forgets a transient that recovered before it was ever confirmed", async () => {
    const { watch, sent } = watchFor(db);
    const backlog = async () => {
      await sql`
        insert into graphile_worker.jobs (task_identifier, run_at)
        select 'deliver_notification_intents', ${at(-30)} from generate_series(1, 101)
      `.execute(db);
    };
    await backlog();
    await beat(watch, at(1));
    expect(await openOperationalIncidents(db)).toHaveLength(1);

    // Drained inside the five-minute window, so nothing was ever announced.
    // The guide leaves an automatically recovered transient "only in
    // privacy-filtered telemetry and owner diagnostics", so the incident is
    // forgotten rather than recorded as one that happened and cleared.
    await sql`delete from graphile_worker.jobs`.execute(db);
    await beat(watch, at(2));
    await beat(watch, at(6));
    expect(sent).toEqual([]);
    expect(await openOperationalIncidents(db)).toEqual([]);
    expect(await db.selectFrom("operational_incidents").select("id").execute()).toEqual([]);
  });

  it("closes an owner-verified incident once and answers with its recovery notification", async () => {
    const { watch, sent } = watchFor(db);
    await watch.observe(at(4));
    const [open] = await openOperationalIncidents(db);
    expect(open).toBeDefined();

    const recovered = await clearOperationalIncident(db, {
      correlationId: open!.correlation_id,
      now: at(5),
    });
    expect(recovered).toMatchObject({
      kind: "RECOVERED",
      conditionId: "worker.heartbeat-stale",
      incidentCorrelationId: open!.correlation_id,
    });
    expect(await openOperationalIncidents(db)).toEqual([]);
    // A second attempt closes nothing, so the owner cannot send two recoveries.
    expect(await clearOperationalIncident(db, { correlationId: open!.correlation_id })).toBeNull();
    expect(sent).toHaveLength(1);
  });

  it("raises a reported condition once, however often the fact is detected", async () => {
    const { watch, sent } = watchFor(db);
    await beat(watch, at(1));
    await watch.report("security.internal-endpoint-reached-publicly", { operation: "/health/ready" }, at(1));
    await watch.report("security.internal-endpoint-reached-publicly", { operation: "/health/ready" }, at(1));
    expect(sent.map((alert) => [alert.kind, alert.conditionId, alert.severity])).toEqual([
      ["CONFIRMED", "security.internal-endpoint-reached-publicly", "IMMEDIATE"],
    ]);
    expect(sent[0]!.evidence).toMatchObject({ operation: "/health/ready", release: RELEASE });
  });

  it("leaves the observed incidents untouched when a reported condition arrives between readings", async () => {
    const { watch, sent } = watchFor(db);
    await watch.observe(at(4));
    const [heartbeat] = await openOperationalIncidents(db);
    await watch.report("security.internal-endpoint-reached-publicly", { operation: "/health/live" }, at(4));

    const open = await openOperationalIncidents(db);
    expect(open).toHaveLength(2);
    // The heartbeat incident keeps the evidence its own reading gave it: a
    // reported fact is no observation of anything else.
    expect(open.find((incident) => incident.condition_id === "worker.heartbeat-stale")?.evidence)
      .toEqual(heartbeat!.evidence);
    expect(sent).toHaveLength(2);
  });

  it("names each exhausted job by type without carrying the error it failed with", async () => {
    const { watch, sent } = watchFor(db);
    await sql`
      insert into graphile_worker.jobs (task_identifier, run_at, attempts, max_attempts)
      values ('deliver_notification_intents', ${at(-30)}, 4, 4)
    `.execute(db);
    await beat(watch, at(1));
    expect(sent.map((dispatch) => dispatch.conditionId)).toEqual(["worker.jobs-exhausted"]);
    expect(sent[0]!.evidence).toMatchObject({
      jobType: "deliver_notification_intents",
      safeFailureCode: "WORKER_JOB_ATTEMPTS_EXHAUSTED",
      exhaustedJobCount: 1,
    });
  });

  it("does not call a deployment overdue for a rebuild it has not been running long enough to have", async () => {
    await db.deleteFrom("canonical_data_rebuilds").execute();
    await db.deleteFrom("rolling_fixture_reconciliations").execute();
    const { watch, sent } = watchFor(db);
    await beat(watch, at(1));
    expect(sent).toEqual([]);
  });

  it("writes no Audit Entry and sends no User notification, because alerting changes nothing", async () => {
    const { watch, sent } = watchFor(db);
    await watch.observe(at(4));
    expect(sent).toHaveLength(1);
    expect(await db.selectFrom("audit_entries").select("id").execute()).toEqual([]);
    expect(await db.selectFrom("email_notification_intents").select("id").execute()).toEqual([]);
    expect(await db.selectFrom("in_app_notifications").select("id").execute()).toEqual([]);
  });

  it("confirms an unreachable database over three probes and recovers once, without a store to write to", async () => {
    const databaseName = `alerting_outage_${randomUUID().replaceAll("-", "")}`;
    const outageDb = createDatabase(connectionUrl(databaseName));
    try {
      const { watch, sent } = watchFor(outageDb);
      // A reachable clone of the template has no heartbeat of its own, which
      // raises its own incident; this case is about the readiness one.
      const readiness = () =>
        sent
          .filter((alert) => alert.conditionId === "readiness.database-unreachable")
          .map((alert) => alert.kind);

      await watch.observe(at(0));
      await watch.observe(at(1));
      expect(readiness()).toEqual([]);

      // A reachable probe between failures restarts the window rather than
      // letting two separate blips add up to a confirmed outage.
      await clonePostgreSqlTemplate(postgres, databaseName);
      await watch.observe(at(2));
      expect(readiness()).toEqual([]);
      await postgres.exec(["dropdb", "--username=marketplace", "--force", databaseName]);
      await watch.observe(at(3));
      await watch.observe(at(4));
      expect(readiness()).toEqual([]);

      await watch.observe(at(5));
      await watch.observe(at(6));
      expect(readiness()).toEqual(["CONFIRMED"]);

      await clonePostgreSqlTemplate(postgres, databaseName);
      await watch.observe(at(7));
      await watch.observe(at(8));
      await watch.observe(at(9));
      expect(readiness()).toEqual(["CONFIRMED", "RECOVERED"]);
    } finally {
      await outageDb.destroy();
    }
  }, 60_000);
});

/**
 * The two facts the transport decides for itself. Both are exercised over real
 * HTTP with a trusted-proxy secret configured, because that is the only shape
 * in which they can be told apart: without one, every request looks internal.
 */
describe("what the transport reports and what it declines to call abuse", () => {
  let db: Database;
  let baseUrl: string;
  let counters: OperationalCounters;
  let sent: AlertDispatch[];
  let closeServer: () => void;
  const PROXY_SECRET = "a-trusted-proxy-secret-of-sufficient-length";
  const observedAt = new Date("2026-08-29T12:00:00.000Z");

  beforeAll(async () => {
    db = await cloneDatabase("transport");
    counters = createOperationalCounters();
    const recording = recordingReporter();
    sent = recording.sent;
    const server = createMarketplaceServer({
      api: createApi({ db, authMode: "fake", nodeEnv: "test" }),
      counters,
      currentSchemaMigration: SCHEMA_VERSION,
      db,
      incidents: createOperationalWatch({
        db,
        release: RELEASE,
        counters,
        reporter: recording.reporter,
      }),
      logger: { warn: () => undefined } as never,
      now: () => observedAt,
      sourceRequestLimit: 3,
      trustedProxySecret: PROXY_SECRET,
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    closeServer = () => server.close();
  }, 180_000);

  afterAll(async () => {
    closeServer();
    await db.destroy();
  });

  it("answers an internal probe reached over private networking", async () => {
    const response = await fetch(`${baseUrl}/health/live`);
    expect(response.status).toBe(200);
    expect(sent).toEqual([]);
  });

  it("refuses an internal probe that arrived through the public origin, and raises it once", async () => {
    const probe = () =>
      fetch(`${baseUrl}/health/ready`, {
        headers: {
          "x-proxy-authorization": PROXY_SECRET,
          "x-verified-source": "203.0.113.7",
        },
      });
    expect((await probe()).status).toBe(403);
    expect((await probe()).status).toBe(403);

    // The transport refuses without waiting on the incident write: a request
    // must not be held open while an alert is recorded.
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent.map((alert) => [alert.kind, alert.conditionId, alert.severity])).toEqual([
      ["CONFIRMED", "security.internal-endpoint-reached-publicly", "IMMEDIATE"],
    ]);
    expect(sent[0]!.evidence).toMatchObject({ operation: "/health/ready" });
    expect(JSON.stringify(sent)).not.toContain("203.0.113.7");
  });

  it("counts a run of unverifiable refusals as a trusted-proxy fault, not as abuse", async () => {
    const before = counters.read(observedAt.getTime()).abuse;
    // Past the per-source limit, with nothing Caddy could have verified.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await fetch(`${baseUrl}/graphql`, { method: "POST" });
      expect([403, 429]).toContain(response.status);
    }
    const after = counters.read(observedAt.getTime()).abuse;
    expect(after.unverifiedSourceRefusalCount).toBeGreaterThan(
      before.unverifiedSourceRefusalCount,
    );
    // The guide is explicit that this is a misconfiguration failing closed and
    // "not abuse"; charging it to the abuse aggregate would send the owner to
    // the containment the guide warns against.
    expect(after.refusedRequestCount).toBe(before.refusedRequestCount);
    expect(after.sourcesAtLimitConsecutiveWindows).toBe(
      before.sourcesAtLimitConsecutiveWindows,
    );
  });
});

describe("owner diagnostics summary", () => {
  let db: Database;
  const observedAt = new Date("2026-08-29T12:00:00.000Z");

  beforeAll(async () => {
    db = await cloneDatabase("diagnostics");
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("reports current state and the open incidents, and changes nothing", async () => {
    await writeWorkerHeartbeat(db, { release: RELEASE, observedAt });
    const { reporter } = recordingReporter();
    const watch = createOperationalWatch({
      db,
      release: RELEASE,
      counters: createOperationalCounters(),
      reporter,
    });
    // Four minutes on: the heartbeat has gone stale, so there is an incident
    // for the summary to carry as well as current readings.
    await watch.observe(new Date(observedAt.getTime() + 4 * 60_000));
    const before = await db
      .selectFrom("operational_incidents")
      .select(["id", "observation_count"])
      .execute();

    const diagnostics = await readOwnerDiagnostics(db, { release: RELEASE, now: observedAt });
    expect(diagnostics.readiness).toMatchObject({
      databaseReachable: true,
      schemaCompatible: true,
      expectedSchemaVersion: SCHEMA_VERSION,
    });
    expect(diagnostics.worker).toMatchObject({
      name: MARKETPLACE_WORKER_NAME,
      heartbeatAgeSeconds: 0,
      runnableJobCount: 0,
      exhaustedJobCount: 0,
    });
    expect(diagnostics.openIncidents.map((incident) => incident.conditionId))
      .toEqual(["worker.heartbeat-stale"]);

    expect(await db.selectFrom("operational_incidents").select(["id", "observation_count"]).execute())
      .toEqual(before);
  });

  // The family column carries no `check` constraint, so a row written by a
  // build that named the families differently is possible. The owner still has
  // to act on it, so it must reach their table saying what it is rather than
  // reading `undefined`.
  it("still shows an open incident whose family this build cannot name", async () => {
    await db
      .insertInto("operational_incidents")
      .values({
        condition_id: "worker.heartbeat-stale",
        incident_family: "a-family-a-later-build-renamed",
        fingerprint: "a-family-a-later-build-renamed:worker.heartbeat-stale",
        severity: "OWNER_ATTENTION",
        route: "SENTRY_EMAIL",
        correlation_id: "incident-from-a-later-build",
        first_observed_at: observedAt,
        last_observed_at: observedAt,
      })
      .execute();

    const summary = renderOwnerDiagnosticsSummary(
      await readOwnerDiagnostics(db, { release: RELEASE, now: observedAt }),
    );
    expect(summary).toContain("a-family-a-later-build-renamed");
    expect(summary).not.toContain("undefined");

    await db
      .deleteFrom("operational_incidents")
      .where("correlation_id", "=", "incident-from-a-later-build")
      .execute();
  });

  it("renders a summary carrying evidence and links rather than private detail", async () => {
    const summary = renderOwnerDiagnosticsSummary(
      await readOwnerDiagnostics(db, { release: RELEASE, now: observedAt }),
    );
    expect(summary).toContain("# Public demonstration diagnostics");
    expect(summary).toContain("Canonical fixtures");
    expect(summary).toContain(SCHEMA_VERSION);
    expect(summary).not.toMatch(/postgres(ql)?:\/\//);
  });
});

/**
 * The guide's third-party-integration threshold has two legs: how many
 * failures, and how many operations they span. The second is what separates one
 * reviewer's operation retrying from Auth0 being down for everyone, so it is
 * checked here through the API rather than against the counters directly — the
 * identifier only means anything if the request the failure happened in is the
 * one that supplies it.
 */
describe("how many operations a run of Auth0 failures spans", () => {
  let db: Database;
  let api: ReturnType<typeof createApi>;
  let counters: OperationalCounters;
  let accessToken: string;
  const observedAt = new Date("2026-08-29T12:00:00.000Z");
  // A port nothing listens on, so the JWKS fetch fails rather than the token:
  // an unreachable Auth0, which is what the threshold counts.
  const UNREACHABLE_ISSUER = "http://127.0.0.1:1/";
  const AUDIENCE = "https://api.example.test";

  beforeAll(async () => {
    db = await cloneDatabase("integration_correlations");
    counters = createOperationalCounters();
    api = createApi({
      db,
      authMode: "auth0",
      auth0Audience: AUDIENCE,
      auth0Issuer: UNREACHABLE_ISSUER,
      nodeEnv: "test",
      operationalCounters: counters,
      now: () => observedAt,
    });
    const { privateKey } = await generateKeyPair("RS256");
    accessToken = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "unreachable-key" })
      .setIssuer(UNREACHABLE_ISSUER)
      .setAudience(AUDIENCE)
      .setSubject("auth0|student-123")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
  }, 180_000);

  afterAll(async () => {
    await db.destroy();
  });

  async function askForProgress(correlationId: string) {
    return api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
        "x-correlation-id": correlationId,
      },
      body: JSON.stringify({ query: "query { studentCourseProgress { __typename } }" }),
    });
  }

  it("counts one operation retried as one correlation, and separate operations separately", async () => {
    // The same operation, tried twice: the guide reads this as one operation
    // affected, whatever the failure count reaches.
    await askForProgress("operation-1");
    await askForProgress("operation-1");
    expect(counters.read(observedAt.getTime()).integrations[0]).toMatchObject({
      integration: "auth0",
      failureCount: 2,
      correlationCount: 1,
    });

    // A second operation is a second correlation, which is what tells the owner
    // the boundary is failing for more than one caller.
    await askForProgress("operation-2");
    expect(counters.read(observedAt.getTime()).integrations[0]).toMatchObject({
      failureCount: 3,
      correlationCount: 2,
    });
  });
});
