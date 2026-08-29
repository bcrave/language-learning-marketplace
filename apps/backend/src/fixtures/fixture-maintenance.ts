import { sql } from "kysely";
import type { TaskList } from "graphile-worker";

import type { DemonstrationIdentityBinding } from "../auth/demonstration-identities.js";
import type { Database } from "../database/database.js";
import { latestMigrationName } from "../database/migrate.js";
import { readWorkerHeartbeat, workerHeartbeatIsFresh } from "../worker/worker-heartbeat.js";
import { validateCanonicalFixtures } from "./canonical-fixture-invariants.js";
import {
  applyCanonicalCurriculum,
  applyCanonicalIdentities,
  applyCanonicalOrganizations,
  applyCanonicalPendingInvitation,
  applyCanonicalShowcase,
  applyCanonicalSubscription,
  CanonicalFixtureValidationError,
} from "./canonical-fixture-loader.js";
import {
  canonicalFixtureManifest,
  type CanonicalFixtureManifest,
} from "./canonical-fixture-manifest.js";

const CLASS_SESSION_MILLISECONDS = 60 * 60_000;
const CANONICAL_REBUILD_LOCK = 5_203_003_052;

function terminalInstant(startedAt: Date) {
  const observed = new Date();
  return observed > startedAt ? observed : new Date(startedAt.getTime() + 1);
}

export const FIXTURE_MAINTENANCE_SYSTEM_IDENTITY = "FIXTURE_MAINTENANCE_WORKER";
export const CANONICAL_DATA_REBUILD_SYSTEM_IDENTITY = "CANONICAL_DATA_REBUILD";

export function fixtureMaintenanceTasks(
  db: Database,
  options: { now?: () => Date } = {},
): TaskList {
  return {
    reconcile_rolling_fixtures: async () => {
      const now = options.now?.() ?? new Date();
      const hour = now.toISOString().slice(0, 13);
      await reconcileRollingFixtures(db, {
        now,
        correlationId: `rolling-fixtures-${hour}`,
      });
    },
  };
}

function rollingTarget(now: Date, offsetHours: number) {
  const target = new Date(now);
  target.setUTCMinutes(0, 0, 0);
  target.setUTCHours(target.getUTCHours() + offsetHours);
  return target;
}

async function recordAudit(db: Database, values: {
  systemIdentity: typeof FIXTURE_MAINTENANCE_SYSTEM_IDENTITY | typeof CANONICAL_DATA_REBUILD_SYSTEM_IDENTITY;
  operation: string;
  outcome: "SUCCEEDED" | "FAILED";
  reasonCode: string;
  correlationId: string;
  targetId: string;
  occurredAt: Date;
  evidence?: Record<string, unknown>;
}) {
  await db.insertInto("audit_entries").values({
    actor_user_id: null,
    system_identity: values.systemIdentity,
    acting_role: null,
    operation: values.operation,
    target_type: values.systemIdentity === CANONICAL_DATA_REBUILD_SYSTEM_IDENTITY
      ? "CanonicalDataRebuild"
      : "CanonicalFixtureManifest",
    target_id: values.targetId,
    outcome: values.outcome,
    reason_code: values.reasonCode,
    correlation_id: values.correlationId,
    occurred_at: values.occurredAt,
    evidence: JSON.stringify(values.evidence ?? {}),
  }).execute();
}

/**
 * Advances the manifest-designated rolling Class Session to the same whole-hour
 * position relative to the real clock. The durable correlation receipt makes a
 * Graphile Worker retry observationally identical to the original run.
 */
export async function reconcileRollingFixtures(db: Database, options: {
  now?: Date;
  correlationId: string;
}) {
  const now = options.now ?? new Date();
  return db.transaction().execute((transaction) =>
    reconcileRollingFixturesInTransaction(transaction as Database, {
      now,
      correlationId: options.correlationId,
    }));
}

async function reconcileRollingFixturesInTransaction(transaction: Database, options: {
  now: Date;
  correlationId: string;
}) {
    const { now } = options;
    await sql`select set_config('marketplace.fixture_maintenance', 'on', true)`.execute(transaction);
    const receipt = await transaction.insertInto("rolling_fixture_reconciliations")
      .values({
        correlation_id: options.correlationId,
        reconciled_for: now,
        advanced_fixture_count: 0,
        completed_at: now,
      })
      .onConflict((conflict) => conflict.column("correlation_id").doNothing())
      .returning("correlation_id")
      .executeTakeFirst();
    if (!receipt) {
      return { outcome: "ALREADY_RECONCILED" as const, advancedFixtureCount: 0 };
    }

    const rolling = await transaction.selectFrom("class_sessions")
      .select(["id", "starts_at", "rolling_offset_hours"])
      .where("is_rolling_fixture", "=", true)
      .where("state", "=", "PUBLISHED")
      .forUpdate()
      .execute();
    const rollingIds = rolling.map((session) => session.id);
    // Every rolling commitment is parked before any of them moves, because the
    // overlap constraint covers only active rows and an intermediate hour would
    // otherwise collide with a commitment still sitting on it. Which rows earned
    // their way back is remembered here: a Student Cancellation, a User Suspension,
    // and a role removal each deactivate the commitment in place rather than
    // deleting it, and reactivating those would rebuild a settled Schedule Conflict
    // and hand the reminder worker a cancelled Booking.
    const parked = rollingIds.length > 0
      ? await transaction.selectFrom("schedule_commitments")
        .select(["id", "active"])
        .where("class_session_id", "in", rollingIds)
        .forUpdate()
        .execute()
      : [];
    if (rollingIds.length > 0) {
      await transaction.updateTable("schedule_commitments").set({ active: false })
        .where("class_session_id", "in", rollingIds).execute();
    }
    let advancedFixtureCount = 0;
    for (const session of rolling) {
      if (session.rolling_offset_hours === null) throw new Error("Rolling fixture offset is missing");
      const target = rollingTarget(now, session.rolling_offset_hours);
      if (session.starts_at.getTime() !== target.getTime()) {
        await transaction.updateTable("class_sessions")
          .set({ starts_at: target })
          .where("id", "=", session.id)
          .execute();
        advancedFixtureCount += 1;
      }
      await transaction.updateTable("schedule_commitments")
        .set({
          starts_at: target,
          ends_at: new Date(target.getTime() + CLASS_SESSION_MILLISECONDS),
        })
        .where("class_session_id", "=", session.id)
        .execute();
    }
    const restored = parked.filter(({ active }) => active).map(({ id }) => id);
    if (restored.length > 0) {
      await transaction.updateTable("schedule_commitments").set({ active: true })
        .where("id", "in", restored).execute();
    }

    await transaction.updateTable("rolling_fixture_reconciliations")
      .set({ advanced_fixture_count: advancedFixtureCount })
      .where("correlation_id", "=", options.correlationId)
      .execute();
    await recordAudit(transaction as Database, {
      systemIdentity: FIXTURE_MAINTENANCE_SYSTEM_IDENTITY,
      operation: "canonical-fixtures.rolling-reconciled",
      outcome: "SUCCEEDED",
      reasonCode: advancedFixtureCount > 0
        ? "ROLLING_FIXTURES_ADVANCED"
        : "ROLLING_FIXTURES_ALREADY_CURRENT",
      correlationId: options.correlationId,
      targetId: canonicalFixtureManifest.version,
      occurredAt: now,
      evidence: { advancedFixtureCount, reconciledFor: now.toISOString() },
    });
    return { outcome: "ADVANCED" as const, advancedFixtureCount };
}

const MUTABLE_TABLES = [
  "user_anonymization_requests", "user_access_changes", "role_assignments",
  "role_assignment_changes", "role_workspace_places", "curriculum_levels",
  "student_placements", "courses", "topics", "lesson_units",
  "lesson_unit_topics", "lesson_materials", "teacher_profiles",
  "teacher_profile_topics", "teacher_qualifications", "class_sessions",
  "schedule_commitments", "bookings", "waitlist_entries",
  "waitlist_promotion_requests", "class_session_reminders", "in_app_notifications",
  "email_notification_intents", "notification_delivery_attempts", "delivery_receipts",
  "recorded_email_deliveries", "administrator_task_items",
  "mutation_idempotency_records", "class_credit_accounts",
  "class_credit_ledger_entries", "subscriptions", "subscription_provider_events",
  "teacher_availability_settings", "teacher_availability_ranges",
  "availability_exceptions", "absence_requests", "absence_request_sessions",
  "attendance_records", "lesson_unit_completions", "attendance_record_corrections",
  "attendance_review_requests", "learning_feedback", "session_ratings",
  "learning_feedback_redactions", "session_rating_redactions", "organizations",
  "organization_managers", "sponsorship_invitations", "sponsorships", "cohorts",
  "cohort_memberships", "course_progress_snapshots", "course_progress_snapshot_units",
  "course_progress_snapshot_revisions", "report_exports",
] as const;

async function replaceMutableState(transaction: Database, options: {
  manifest: CanonicalFixtureManifest;
  now: Date;
  identityBinding?: DemonstrationIdentityBinding;
}) {
  await sql.raw(`truncate table ${MUTABLE_TABLES.map((table) => `"${table}"`).join(", ")} restart identity`).execute(transaction);

  await transaction.insertInto("curriculum_levels").values([
    { code: "A1", sort_order: 1 }, { code: "A2", sort_order: 2 },
    { code: "B1", sort_order: 3 }, { code: "B2", sort_order: 4 },
    { code: "C1", sort_order: 5 }, { code: "C2", sort_order: 6 },
  ]).onConflict((conflict) => conflict.column("code")
    .doUpdateSet((eb) => ({ sort_order: eb.ref("excluded.sort_order") }))).execute();
  const topics = [
    ["EC", "Everyday Conversation", "Conversación cotidiana"],
    ["TN", "Travel & Navigation", "Viajes y orientación"],
    ["FC", "Food & Culture", "Comida y cultura"],
    ["WS", "Work & Study", "Trabajo y estudios"],
    ["CS", "Community & Society", "Comunidad y sociedad"],
    ["GS", "Grammar & Structure", "Gramática y estructura"],
    ["PL", "Pronunciation & Listening", "Pronunciación y comprensión auditiva"],
    ["RW", "Reading & Writing", "Lectura y escritura"],
  ] as const;
  for (const [key, label_en, label_es] of topics) {
    await transaction.insertInto("topics").values({ key, label_en, label_es })
      .onConflict((conflict) => conflict.column("key").doUpdateSet({ label_en, label_es }))
      .execute();
  }

  const canonicalIds = options.manifest.identities.map((identity) => identity.id);
  await transaction.updateTable("users").set({
    display_name: "Former User",
    interface_locale: null,
    display_time_zone: null,
    access_status: "FIXTURE_REMOVED",
    suspension_reason: null,
    suspended_at: null,
    suspended_by_user_id: null,
    anonymized_at: null,
    anonymized_by_user_id: null,
    fixture_removed_at: options.now,
  }).where("id", "not in", canonicalIds)
    .execute();

  // Canonical Users cannot be truncated because retained Audit Entries reference
  // them. Restore their lifecycle columns first; the ordinary fixture loader then
  // restores identity, preferences, roles, and the designated suspended example.
  for (const identity of options.manifest.identities) {
    await transaction.updateTable("users").set({
      identity_issuer: "https://demo.local/",
      identity_subject: identity.id,
      display_name: identity.displayName,
      interface_locale: identity.interfaceLocale,
      display_time_zone: identity.displayTimeZone,
      access_status: "ACTIVE",
      suspension_reason: null,
      suspended_at: null,
      suspended_by_user_id: null,
      anonymized_at: null,
      anonymized_by_user_id: null,
      fixture_removed_at: null,
    }).where("id", "=", identity.id).execute();
  }

  const step = { manifest: options.manifest, now: options.now };
  await applyCanonicalIdentities(transaction, step);
  await applyCanonicalCurriculum(transaction, step);
  await applyCanonicalSubscription(transaction, step);
  await applyCanonicalOrganizations(transaction, step);
  await applyCanonicalPendingInvitation(transaction, step);
  await applyCanonicalShowcase(transaction, step);
  if (options.identityBinding) {
    const { bindDemonstrationIdentities } = await import("../auth/demonstration-identities.js");
    await bindDemonstrationIdentities(transaction, options.identityBinding, options.manifest);
  }
  const violations = await validateCanonicalFixtures(transaction, options.manifest, options.now, {
    ...(options.identityBinding ? { identityIssuer: options.identityBinding.issuer } : {}),
  });
  if (violations.length > 0) throw new CanonicalFixtureValidationError(violations);
}

async function rollbackIsSafe(db: Database, dispatchId: string) {
  const state = await db.selectFrom("maintenance_state")
    .select(["state", "holder_id"]).where("singleton", "=", true).executeTakeFirst();
  if (state?.state !== "REBUILDING" || state.holder_id !== dispatchId) return false;
  return aggregateStateIsSafe(db);
}

async function aggregateStateIsSafe(db: Database) {
  const ledger = await sql<{ unsafe_count: number }>`
    select count(*)::integer as unsafe_count
    from class_credit_accounts account
    where account.available_balance < 0
       or account.available_balance <> (
         select coalesce(sum(entry.amount), 0)::integer
         from class_credit_ledger_entries entry
         where entry.student_user_id = account.student_user_id
       )
  `.execute(db);
  const seats = await sql<{ unsafe_count: number }>`
    select count(*)::integer as unsafe_count
    from class_sessions session
    where session.occupied_seats <> (
      select count(*)::integer from bookings booking
      where booking.class_session_id = session.id and booking.state = 'ACTIVE'
    )
  `.execute(db);
  return ledger.rows[0]?.unsafe_count === 0 && seats.rows[0]?.unsafe_count === 0;
}

export async function assessCanonicalDataRecovery(db: Database, now = new Date()) {
  const state = await db.selectFrom("maintenance_state").selectAll()
    .where("singleton", "=", true).executeTakeFirstOrThrow();
  const expectedSchemaVersion = await latestMigrationName();
  const schema = await db.selectFrom("schema_migrations").select("name")
    .orderBy("name", "desc").executeTakeFirst();
  const rebuild = state.holder_id
    ? await db.selectFrom("canonical_data_rebuilds")
      .select(["state", "correlation_id"])
      .where("dispatch_id", "=", state.holder_id).executeTakeFirst()
    : undefined;
  const auditEvidence = state.correlation_id
    ? await db.selectFrom("audit_entries").select("operation")
      .where("correlation_id", "=", state.correlation_id)
      .where("operation", "in", [
        "canonical-data-rebuild.started",
        "canonical-data-rebuild.rolled-back",
        "canonical-data-rebuild.indeterminate",
        "canonical-data-rebuild.completed",
      ]).execute()
    : [];
  const leaseOwned = state.state === "AVAILABLE" || Boolean(
    state.holder_id && rebuild && rebuild.correlation_id === state.correlation_id,
  );
  const auditEvidenceComplete = state.state === "AVAILABLE" || (
    auditEvidence.some((entry) => entry.operation === "canonical-data-rebuild.started")
    && auditEvidence.some((entry) => entry.operation !== "canonical-data-rebuild.started")
  );
  const fixtureViolations = await validateCanonicalFixtures(db, canonicalFixtureManifest, now);
  const aggregatesSafe = await aggregateStateIsSafe(db);
  const heartbeatFresh = workerHeartbeatIsFresh(await readWorkerHeartbeat(db), new Date());
  const currentStateVerified = schema?.name === expectedSchemaVersion
    && leaseOwned
    && auditEvidenceComplete
    && fixtureViolations.length === 0
    && aggregatesSafe
    && heartbeatFresh;
  return {
    state: state.state,
    holderId: state.holder_id,
    correlationId: state.correlation_id,
    schemaVersion: schema?.name ?? null,
    expectedSchemaVersion,
    leaseOwned,
    auditEvidenceComplete,
    fixtureGeneration: state.fixture_generation,
    fixtureViolationCount: fixtureViolations.length,
    aggregatesSafe,
    heartbeatFresh,
    recommendation: state.state !== "INDETERMINATE"
      ? "NO_RECOVERY_REQUIRED" as const
      : currentStateVerified
        ? "VERIFY_AND_REOPEN" as const
        : schema
          ? "CLEAN_CANONICAL_DATA_REBUILD" as const
          : "BACKUP_RESTORATION" as const,
  };
}

export async function verifyAndReopenCanonicalData(db: Database, options: {
  correlationId: string;
  reason: string;
  now?: Date;
  beforeReopen?: (holderId: string) => Promise<void>;
}) {
  const now = options.now ?? new Date();
  if (options.reason.trim().length < 10 || options.reason.length > 500) {
    throw new Error("A concise non-secret recovery reason between 10 and 500 characters is required");
  }
  const state = await db.selectFrom("maintenance_state").selectAll()
    .where("singleton", "=", true).executeTakeFirstOrThrow();
  if (state.state !== "INDETERMINATE" || !state.holder_id) {
    throw new Error("Verify-and-reopen requires an indeterminate Canonical Data Rebuild");
  }
  const expectedSchemaVersion = await latestMigrationName();
  const appliedSchema = await db.selectFrom("schema_migrations").select("name")
    .orderBy("name", "desc").executeTakeFirstOrThrow();
  if (appliedSchema.name !== expectedSchemaVersion) {
    throw new Error("Verify-and-reopen requires the schema shipped by this build");
  }
  await options.beforeReopen?.(state.holder_id);
  return db.transaction().execute(async (transaction) => {
    const state = await transaction.selectFrom("maintenance_state").selectAll()
      .where("singleton", "=", true).forUpdate().executeTakeFirstOrThrow();
    if (state.state !== "INDETERMINATE" || !state.holder_id) {
      throw new Error("Verify-and-reopen requires an indeterminate Canonical Data Rebuild");
    }
    await sql`select set_config('marketplace.maintenance_holder', ${state.holder_id}, true)`.execute(transaction);
    await reconcileRollingFixturesInTransaction(transaction as Database, {
      now,
      correlationId: `${options.correlationId}:reconciliation`,
    });
    const violations = await validateCanonicalFixtures(transaction as Database, canonicalFixtureManifest, now);
    if (
      violations.length > 0
      || !await aggregateStateIsSafe(transaction as Database)
      || !workerHeartbeatIsFresh(await readWorkerHeartbeat(transaction as Database), new Date())
    ) {
      throw new Error("Current state did not pass verify-and-reopen checks");
    }
    await transaction.updateTable("maintenance_state").set({
      state: "AVAILABLE",
      holder_id: null,
      correlation_id: null,
      changed_at: now,
    }).where("singleton", "=", true).execute();
    await recordAudit(transaction as Database, {
      systemIdentity: CANONICAL_DATA_REBUILD_SYSTEM_IDENTITY,
      operation: "canonical-data-recovery.verified-and-reopened",
      outcome: "SUCCEEDED",
      reasonCode: "CANONICAL_DATA_RECOVERY_VERIFIED_AND_REOPENED",
      correlationId: options.correlationId,
      targetId: state.holder_id,
      occurredAt: now,
      evidence: {
        ownerReason: options.reason,
        incidentCorrelationId: state.correlation_id,
        fixtureGeneration: state.fixture_generation,
        aggregateValidation: "PASSED",
        schemaVersion: expectedSchemaVersion,
        protectedRoleSmoke: options.beforeReopen ? "PASSED" : "NOT_REQUESTED",
      },
    });
    return { outcome: "REOPENED" as const };
  });
}

export async function containFailedPostRebuildSmoke(db: Database, options: {
  correlationId: string;
  dispatchId: string;
  now?: Date;
}) {
  const now = options.now ?? new Date();
  await db.transaction().execute(async (transaction) => {
    const state = await transaction.selectFrom("maintenance_state").select("state")
      .where("singleton", "=", true).forUpdate().executeTakeFirstOrThrow();
    if (state.state !== "AVAILABLE") return;
    await transaction.updateTable("maintenance_state").set({
      state: "INDETERMINATE",
      holder_id: `post-rebuild-smoke:${options.dispatchId}`,
      correlation_id: options.correlationId,
      changed_at: now,
    }).where("singleton", "=", true).execute();
    await recordAudit(transaction as Database, {
      systemIdentity: CANONICAL_DATA_REBUILD_SYSTEM_IDENTITY,
      operation: "canonical-data-recovery.post-rebuild-smoke-contained",
      outcome: "FAILED",
      reasonCode: "POST_REBUILD_SMOKE_FAILED",
      correlationId: options.correlationId,
      targetId: options.dispatchId,
      occurredAt: now,
      evidence: { safeFailureCode: "POST_REBUILD_SMOKE_FAILED" },
    });
  });
}

async function verifyOperationalReadiness(db: Database, options: {
  expectedSchemaVersion: string;
  manifest: CanonicalFixtureManifest;
  now: Date;
  observationIntervalMilliseconds: number;
}) {
  let previousHeartbeat = await readWorkerHeartbeat(db);
  let heartbeatAdvanced = false;
  for (let observation = 0; observation < 3; observation += 1) {
    await sql`select 1`.execute(db);
    await db.selectFrom("schema_migrations").select("name")
      .where("name", "=", options.expectedSchemaVersion).executeTakeFirstOrThrow();
    const violations = await validateCanonicalFixtures(db, options.manifest, options.now);
    if (violations.length > 0) throw new CanonicalFixtureValidationError(violations);
    const heartbeat = await readWorkerHeartbeat(db);
    if (!workerHeartbeatIsFresh(heartbeat, new Date())) {
      throw new Error("Worker heartbeat is not fresh after Canonical Data Rebuild");
    }
    if (previousHeartbeat && heartbeat.observedAt > previousHeartbeat.observedAt) {
      heartbeatAdvanced = true;
    }
    previousHeartbeat = heartbeat;
    if (observation < 2) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, options.observationIntervalMilliseconds));
    }
  }
  if (!heartbeatAdvanced) throw new Error("Worker heartbeat did not advance after Canonical Data Rebuild");
}

/**
 * Executes one protected Canonical Data Rebuild attempt. The state transition is
 * committed before replacement starts so readiness fails closed for the complete
 * transactional reset. A failed transaction leaves the prior state untouched.
 */
export async function runCanonicalDataRebuild(db: Database, options: {
  correlationId: string;
  dispatchId: string;
  reason: string;
  now?: Date;
  manifest?: CanonicalFixtureManifest;
  identityBinding?: DemonstrationIdentityBinding;
  initiator?: "PROJECT_OWNER" | "SCHEDULED_SYSTEM";
  verifyOperationalReadiness?: boolean;
  readinessObservationIntervalMilliseconds?: number;
  recoverIndeterminate?: boolean;
  incidentCorrelationId?: string;
  beforeReopen?: (holderId: string) => Promise<void>;
  shouldAbortBeforeReopen?: () => boolean;
}) {
  const now = options.now ?? new Date();
  const manifest = options.manifest ?? canonicalFixtureManifest;
  const initiator = options.initiator ?? "PROJECT_OWNER";
  let schemaVersion = "";
  let fixtureGeneration = 0;
  let replacementCommitted = false;
  if (options.reason.trim().length < 10 || options.reason.length > 500) {
    throw new Error("A concise non-secret rebuild reason between 10 and 500 characters is required");
  }

  await db.transaction().execute(async (transaction) => {
    const state = await transaction.selectFrom("maintenance_state")
      .select(["state", "fixture_generation", "correlation_id"]).where("singleton", "=", true).forUpdate().executeTakeFirstOrThrow();
    const expectedState = options.recoverIndeterminate ? "INDETERMINATE" : "AVAILABLE";
    if (state.state !== expectedState) {
      throw new Error(options.recoverIndeterminate
        ? "Clean recovery rebuild requires indeterminate maintenance"
        : "Canonical Data Rebuild is unavailable while maintenance is active");
    }
    if (options.recoverIndeterminate && options.incidentCorrelationId !== state.correlation_id) {
      throw new Error("Clean recovery rebuild requires the incident correlation identifier");
    }
    const schema = await transaction.selectFrom("schema_migrations").select("name")
      .orderBy("name", "desc").executeTakeFirstOrThrow();
    if (schema.name !== await latestMigrationName()) {
      throw new Error("Canonical Data Rebuild requires the schema shipped by this build");
    }
    schemaVersion = schema.name;
    fixtureGeneration = state.fixture_generation + 1;
    await transaction.insertInto("canonical_data_rebuilds").values({
      dispatch_id: options.dispatchId,
      correlation_id: options.correlationId,
      fixture_manifest_version: manifest.version,
      fixture_generation: fixtureGeneration,
      schema_version: schema.name,
      initiator,
      owner_reason: options.reason,
      validation_evidence: JSON.stringify({}),
      state: "STARTED",
      safe_failure_code: null,
      started_at: now,
      completed_at: null,
    }).execute();
    await transaction.updateTable("maintenance_state").set({
      state: "REBUILDING",
      holder_id: options.dispatchId,
      correlation_id: options.correlationId,
      fixture_manifest_version: manifest.version,
      changed_at: now,
    }).where("singleton", "=", true).execute();
    await recordAudit(transaction as Database, {
      systemIdentity: CANONICAL_DATA_REBUILD_SYSTEM_IDENTITY,
      operation: "canonical-data-rebuild.started",
      outcome: "SUCCEEDED",
      reasonCode: "CANONICAL_DATA_REBUILD_STARTED",
      correlationId: options.correlationId,
      targetId: options.dispatchId,
      occurredAt: now,
      evidence: {
        initiator,
        ownerReason: options.reason,
        fixtureGeneration,
        manifestVersion: manifest.version,
        schemaVersion: schema.name,
        startedAt: now.toISOString(),
      },
    });
    if (options.recoverIndeterminate) {
      await recordAudit(transaction as Database, {
        systemIdentity: CANONICAL_DATA_REBUILD_SYSTEM_IDENTITY,
        operation: "canonical-data-recovery.clean-rebuild-authorized",
        outcome: "SUCCEEDED",
        reasonCode: "CANONICAL_DATA_RECOVERY_CLEAN_REBUILD_AUTHORIZED",
        correlationId: options.correlationId,
        targetId: options.dispatchId,
        occurredAt: now,
        evidence: {
          ownerReason: options.reason,
          incidentCorrelationId: options.incidentCorrelationId,
        },
      });
    }
  });

  // Yield after maintenance becomes durable so probes and already-admitted work see
  // the fail-closed state before the replacement transaction takes the write lease.
  await new Promise<void>((resolve) => setImmediate(resolve));

  try {
    await db.transaction().execute(async (transaction) => {
      await sql`select pg_advisory_xact_lock(${CANONICAL_REBUILD_LOCK})`.execute(transaction);
      await sql`select set_config('marketplace.maintenance_holder', ${options.dispatchId}, true)`.execute(transaction);
      await replaceMutableState(transaction as Database, {
        manifest,
        now,
        ...(options.identityBinding ? { identityBinding: options.identityBinding } : {}),
      });
      await reconcileRollingFixturesInTransaction(transaction as Database, {
        now,
        correlationId: `${options.correlationId}:post-rebuild-reconciliation`,
      });
    });
    replacementCommitted = true;
    if (options.verifyOperationalReadiness) {
      await verifyOperationalReadiness(db, {
        expectedSchemaVersion: schemaVersion,
        manifest,
        now,
        observationIntervalMilliseconds: options.readinessObservationIntervalMilliseconds ?? 30_000,
      });
    }
    await options.beforeReopen?.(options.dispatchId);
    const terminalAt = terminalInstant(now);
    await db.transaction().execute(async (transaction) => {
      if (options.shouldAbortBeforeReopen?.()) {
        throw new Error("Canonical Data Rebuild was cancelled before reopen");
      }
      await transaction.updateTable("canonical_data_rebuilds").set({
        state: "COMPLETED",
        completed_at: terminalAt,
        validation_evidence: JSON.stringify({
          canonicalFixtureInvariants: "PASSED",
          ledgerAndSeatAggregates: "PASSED",
          rollingFixtureReconciliation: "PASSED",
        }),
      }).where("dispatch_id", "=", options.dispatchId).execute();
      await transaction.updateTable("maintenance_state").set((eb) => ({
        state: "AVAILABLE",
        holder_id: null,
        correlation_id: null,
        fixture_manifest_version: manifest.version,
        fixture_generation: eb("fixture_generation", "+", 1),
        changed_at: terminalAt,
      })).where("singleton", "=", true).execute();
      await recordAudit(transaction as Database, {
        systemIdentity: CANONICAL_DATA_REBUILD_SYSTEM_IDENTITY,
        operation: "canonical-data-rebuild.completed",
        outcome: "SUCCEEDED",
        reasonCode: "CANONICAL_DATA_REBUILD_COMPLETED",
        correlationId: options.correlationId,
        targetId: options.dispatchId,
        occurredAt: terminalAt,
        evidence: {
          initiator,
          fixtureGeneration,
          manifestVersion: manifest.version,
          schemaVersion,
          completedAt: terminalAt.toISOString(),
          durationMilliseconds: terminalAt.getTime() - now.getTime(),
          aggregateValidation: "PASSED",
          rollingFixtureReconciliation: "PASSED",
          protectedRoleSmoke: options.beforeReopen ? "PASSED" : "NOT_REQUESTED",
        },
      });
    });
    return { outcome: "COMPLETED" as const, manifestVersion: manifest.version };
  } catch (error) {
    const terminalAt = terminalInstant(now);
    let safeRollback = false;
    if (!replacementCommitted) {
      try {
        safeRollback = await rollbackIsSafe(db, options.dispatchId);
      } catch {
        // Database reachability and ownership are themselves required evidence. If
        // either cannot be established, maintenance must remain fail-closed.
      }
    }
    const failureCode = error instanceof CanonicalFixtureValidationError
      ? "CANONICAL_FIXTURE_VALIDATION_FAILED"
      : "CANONICAL_DATA_REBUILD_FAILED";
    // An unverified rollback says nothing about what failed, only that the prior
    // state could not be established, so that is what the terminal evidence records.
    const terminalCode = safeRollback ? failureCode : "CANONICAL_DATA_REBUILD_INDETERMINATE";
    await db.transaction().execute(async (transaction) => {
      await transaction.updateTable("canonical_data_rebuilds").set({
        state: safeRollback ? "ROLLED_BACK" : "INDETERMINATE",
        safe_failure_code: failureCode,
        completed_at: terminalAt,
      }).where("dispatch_id", "=", options.dispatchId).execute();
      await transaction.updateTable("maintenance_state").set({
        state: safeRollback ? "AVAILABLE" : "INDETERMINATE",
        holder_id: safeRollback ? null : options.dispatchId,
        correlation_id: safeRollback ? null : options.correlationId,
        changed_at: terminalAt,
      }).where("singleton", "=", true).execute();
      await recordAudit(transaction as Database, {
        systemIdentity: CANONICAL_DATA_REBUILD_SYSTEM_IDENTITY,
        operation: safeRollback
          ? "canonical-data-rebuild.rolled-back"
          : "canonical-data-rebuild.indeterminate",
        outcome: "FAILED",
        reasonCode: terminalCode,
        correlationId: options.correlationId,
        targetId: options.dispatchId,
        occurredAt: terminalAt,
        evidence: {
          initiator,
          fixtureGeneration,
          manifestVersion: manifest.version,
          schemaVersion,
          completedAt: terminalAt.toISOString(),
          durationMilliseconds: terminalAt.getTime() - now.getTime(),
          safeFailureCode: terminalCode,
          rollbackSafety: safeRollback ? "PASSED" : "UNVERIFIED",
        },
      });
    });
    throw error;
  }
}
