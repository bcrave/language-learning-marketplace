import { randomUUID } from "node:crypto";

import type { Database } from "../database/database.js";
import type { CurriculumLevel } from "../database/types.js";
import { CURRENT_SPONSORSHIP_DISCLOSURE_VERSION } from "../sponsorship/sponsorship-service.js";
import { monthlySubscriptionAnniversary } from "../subscription/subscription-time.js";
import { validateCanonicalFixtures, type FixtureInvariantViolation } from "./canonical-fixture-invariants.js";
import {
  CANONICAL_IDENTITY_ISSUER,
  canonicalFixtureManifest,
  type CanonicalFixtureManifest,
} from "./canonical-fixture-manifest.js";

const DAY_MILLISECONDS = 24 * 60 * 60_000;
const CLASS_SESSION_MINUTES = 60;

/** The background identity every canonical fixture Audit Entry is attributed to. */
export const CANONICAL_FIXTURE_SYSTEM_IDENTITY = "CANONICAL_FIXTURE_LOADER";

export class CanonicalFixtureValidationError extends Error {
  constructor(readonly violations: FixtureInvariantViolation[]) {
    // Every violation detail is privacy-safe, so the operator sees what actually
    // failed rather than only which rule refused.
    super(`Canonical fixtures failed validation:\n${violations.map((violation) => `  ${violation.invariant}: ${violation.detail}`).join("\n")}`);
    this.name = "CanonicalFixtureValidationError";
  }
}

/**
 * Showcase instants are expressed as whole-day offsets from the load instant and then
 * snapped to the hour, so a rebuilt demonstration keeps the same shape relative to
 * today's clock without inheriting the minute it happened to run at.
 */
function atOffsetDays(now: Date, offsetDays: number) {
  const instant = new Date(now.getTime() + offsetDays * DAY_MILLISECONDS);
  instant.setUTCMinutes(0, 0, 0);
  return instant;
}

/**
 * Every step defaults to the accepted manifest at the current instant; a test or a
 * rebuild drill overrides one or both without depending on argument order.
 */
export interface CanonicalLoadOptions {
  manifest?: CanonicalFixtureManifest;
  now?: Date;
}

function resolve(options: CanonicalLoadOptions) {
  return { manifest: options.manifest ?? canonicalFixtureManifest, now: options.now ?? new Date() };
}

async function inTransaction<T>(db: Database, perform: (transaction: Database) => Promise<T>): Promise<T> {
  if (db.isTransaction) return perform(db);
  return db.transaction().execute((transaction) => perform(transaction as Database));
}

export async function applyCanonicalIdentities(db: Database, options: CanonicalLoadOptions = {}) {
  const { manifest, now } = resolve(options);
  for (const identity of manifest.identities) {
    const values = {
      id: identity.id,
      identity_issuer: CANONICAL_IDENTITY_ISSUER,
      identity_subject: identity.id,
      display_name: identity.displayName,
      interface_locale: identity.interfaceLocale,
      display_time_zone: identity.displayTimeZone,
    };
    await db.insertInto("users").values(values)
      .onConflict((conflict) => conflict.column("id").doUpdateSet(values)).execute();
  }
  await db.insertInto("role_assignments")
    .values(manifest.identities.flatMap((identity) => identity.roles.map((role) => ({ user_id: identity.id, role }))))
    .onConflict((conflict) => conflict.columns(["user_id", "role"]).doNothing()).execute();

  const placements = manifest.identities.flatMap((identity) => identity.placements.map((placement) => ({
    student_user_id: identity.id,
    target_language: placement.targetLanguage,
    curriculum_level: placement.curriculumLevel,
  })));
  if (placements.length > 0) {
    await db.insertInto("student_placements").values(placements)
      .onConflict((conflict) => conflict.columns(["student_user_id", "target_language"])
        .doUpdateSet((eb) => ({ curriculum_level: eb.ref("excluded.curriculum_level") }))).execute();
  }

  // Suspension is applied after every identity exists, because the suspending
  // administrator is one of them.
  for (const identity of manifest.identities) {
    if (!identity.suspension) continue;
    const suspendedAt = atOffsetDays(now, identity.suspension.offsetDays);
    await db.updateTable("users").set({
      access_status: "SUSPENDED",
      suspension_reason: identity.suspension.reason,
      suspended_at: suspendedAt,
      suspended_by_user_id: identity.suspension.byUserId,
    }).where("id", "=", identity.id).execute();
    const recorded = await db.selectFrom("user_access_changes").select("id")
      .where("user_id", "=", identity.id).where("action", "=", "SUSPENDED").executeTakeFirst();
    if (!recorded) {
      await db.insertInto("user_access_changes").values({
        user_id: identity.id,
        action: "SUSPENDED",
        reason: identity.suspension.reason,
        changed_by_user_id: identity.suspension.byUserId,
        changed_at: suspendedAt,
      }).execute();
    }
  }
}

function lessonGuide(title: string, objectives: string[], authoredInSpanish: boolean) {
  return [
    { type: "heading", level: 2, text: authoredInSpanish ? `Guía de la unidad: ${title}` : `Lesson guide: ${title}` },
    { type: "paragraph", text: authoredInSpanish ? "Guía original para una sesión de clase de 60 minutos." : "Original guide for a teacher-led 60-minute Class Session." },
    { type: "list", items: objectives },
    { type: "heading", level: 3, text: authoredInSpanish ? "Lenguaje clave" : "Key language" },
    { type: "paragraph", text: authoredInSpanish ? `Expresiones prácticas para ${title.toLocaleLowerCase("es")}.` : `Practical expressions for ${title.toLocaleLowerCase("en")}.` },
    { type: "heading", level: 3, text: authoredInSpanish ? "Ejemplo original" : "Original example" },
    { type: "paragraph", text: authoredInSpanish ? "A: ¿Practicamos juntos? B: Sí, empecemos con un ejemplo." : "A: Shall we practise together? B: Yes, let's begin with an example." },
    { type: "heading", level: 3, text: authoredInSpanish ? "Propuestas para la sesión" : "Session prompts" },
    { type: "list", items: authoredInSpanish ? ["Activación y modelo.", "Práctica guiada en parejas.", "Comprobación y reflexión final."] : ["Warm-up and model.", "Guided pair practice.", "Final check and reflection."] },
    { type: "emphasis", text: authoredInSpanish ? "Practica, comprueba y reflexiona." : "Practice, check, and reflect." },
  ];
}

export async function applyCanonicalCurriculum(db: Database, options: CanonicalLoadOptions = {}) {
  const { manifest, now } = resolve(options);
  return inTransaction(db, async (transaction) => {
    const courseIds = new Map<string, string>();
    for (const fixture of manifest.courses) {
      const stable_key = fixture.stableKey;
      const [target_language, level] = stable_key.split("-") as [string, string];
      const curriculum_level = level.toUpperCase() as CurriculumLevel;
      const { title, summary } = fixture;
      const course = await transaction.insertInto("courses")
        .values({ stable_key, target_language, curriculum_level, title, summary })
        .onConflict((conflict) => conflict.column("stable_key").doUpdateSet({ title, summary }))
        .returning("id").executeTakeFirstOrThrow();
      courseIds.set(stable_key, course.id);
    }

    const referencesByUnit = new Map(manifest.references.map((reference) => [reference.unitKey, reference]));
    const unitIds = new Map<string, string>();
    for (const courseFixture of manifest.courses) {
      for (const unitFixture of courseFixture.units) {
        const { stableKey: stable_key, title, summary, objectives, topicKeys, order, state } = unitFixture;
        const retired = state === "RETIRED";
        const authoredInSpanish = stable_key.startsWith("es-");
        const unit = await transaction.insertInto("lesson_units").values({
          stable_key,
          course_id: courseIds.get(courseFixture.stableKey)!,
          title,
          summary,
          objectives: JSON.stringify(objectives),
          sort_order: order,
          state,
          replacement_lesson_unit_id: null,
          retired_at: retired ? new Date("2025-01-01T00:00:00Z") : null,
        }).onConflict((conflict) => conflict.column("stable_key")
          .doUpdateSet({ title, summary, objectives: JSON.stringify(objectives), sort_order: order, state }))
          .returning("id").executeTakeFirstOrThrow();
        unitIds.set(stable_key, unit.id);

        await transaction.deleteFrom("lesson_unit_topics").where("lesson_unit_id", "=", unit.id).execute();
        await transaction.insertInto("lesson_unit_topics")
          .values(topicKeys.map((topic_key) => ({ lesson_unit_id: unit.id, topic_key }))).execute();

        const guideTitle = authoredInSpanish ? `Guía de la unidad: ${title}` : `Lesson guide: ${title}`;
        const structured_content = JSON.stringify(lessonGuide(title, objectives, authoredInSpanish));
        // Materials are read in `created_at` order, and a transaction's `now()` is one
        // instant for every row it writes. Stamping the original guide ahead of its
        // supplemental reference keeps the reading order stable across reloads
        // instead of leaving it to the tie-break on a random identifier.
        await transaction.insertInto("lesson_materials").values({
          lesson_unit_id: unit.id, kind: "STRUCTURED_TEXT", title: guideTitle,
          structured_content, https_url: null, publisher: null, created_at: now,
        }).onConflict((conflict) => conflict.columns(["lesson_unit_id", "title"]).doUpdateSet({ structured_content })).execute();

        const reference = referencesByUnit.get(stable_key);
        if (reference) {
          const publisher = new URL(reference.url).hostname;
          await transaction.insertInto("lesson_materials").values({
            lesson_unit_id: unit.id, kind: "HTTPS_REFERENCE", title: reference.title,
            structured_content: null, https_url: reference.url, publisher,
            created_at: new Date(now.getTime() + 1_000),
          }).onConflict((conflict) => conflict.columns(["lesson_unit_id", "title"])
            .doUpdateSet({ https_url: reference.url, publisher })).execute();
        }
      }
    }

    await transaction.updateTable("lesson_units")
      .set({ replacement_lesson_unit_id: unitIds.get(manifest.retirement.replacementUnitKey)! })
      .where("stable_key", "=", manifest.retirement.retiredUnitKey).execute();

    for (const teacher of manifest.teachers) {
      const profile = {
        pronouns: teacher.pronouns,
        profile_image_url: null,
        professional_bio: teacher.professionalBiography,
      };
      await transaction.insertInto("teacher_profiles").values({ teacher_user_id: teacher.teacherUserId, ...profile })
        .onConflict((conflict) => conflict.column("teacher_user_id").doUpdateSet(profile)).execute();
      await transaction.insertInto("teacher_profile_topics")
        .values(teacher.topicKeys.map((topic_key) => ({ teacher_user_id: teacher.teacherUserId, topic_key })))
        .onConflict((conflict) => conflict.doNothing()).execute();
      await transaction.insertInto("teacher_qualifications")
        .values(teacher.qualifications.map((qualification) => ({
          teacher_user_id: teacher.teacherUserId,
          target_language: qualification.targetLanguage,
          curriculum_level: qualification.curriculumLevel,
          granted_by_user_id: teacher.teacherUserId,
        }))).onConflict((conflict) => conflict.doNothing()).execute();
    }
  });
}

export async function applyCanonicalSubscription(db: Database, options: CanonicalLoadOptions = {}) {
  const { manifest, now } = resolve(options);
  return inTransaction(db, async (transaction) => {
    const studentUserId = manifest.subscription.studentUserId;
    const activatedAt = new Date(now.getTime() - DAY_MILLISECONDS);
    activatedAt.setUTCMilliseconds(0);
    const nextAnniversaryAt = monthlySubscriptionAnniversary(activatedAt, 1);
    await transaction.insertInto("class_credit_accounts").values({ student_user_id: studentUserId })
      .onConflict((conflict) => conflict.column("student_user_id").doNothing()).execute();
    await transaction.insertInto("class_credit_ledger_entries").values({
      student_user_id: studentUserId,
      amount: 8,
      source: "SUBSCRIPTION_GRANT",
      source_reference: "canonical-subscription:initial",
      reason: null,
    }).onConflict((conflict) => conflict.columns(["source", "source_reference"]).doNothing()).execute();

    const accountingTimeUtc = [activatedAt.getUTCHours(), activatedAt.getUTCMinutes(), activatedAt.getUTCSeconds()]
      .map((part) => String(part).padStart(2, "0")).join(":");
    const subscription = {
      state: "ACTIVE" as const,
      activated_at: activatedAt,
      anchor_day: activatedAt.getUTCDate(),
      accounting_time_utc: accountingTimeUtc,
      next_anniversary_at: nextAnniversaryAt,
      cancellation_effective_at: null,
    };
    await transaction.insertInto("subscriptions")
      .values({ id: manifest.subscription.id, student_user_id: studentUserId, ...subscription })
      .onConflict((conflict) => conflict.column("student_user_id")
        .doUpdateSet({ ...subscription, renewal_count: 0, updated_at: now })).execute();

    await settleBalancesFromLedger(transaction, now);
  });
}

/**
 * The available balance is a derived fact, so every step that moves the ledger
 * settles it again from the ledger itself. Deriving rather than incrementing keeps
 * each step self-consistent on its own and idempotent when the load is re-run.
 */
async function settleBalancesFromLedger(transaction: Database, now: Date) {
  const accounts = await transaction.selectFrom("class_credit_accounts").select("student_user_id").execute();
  for (const { student_user_id } of accounts) {
    const balance = (await transaction.selectFrom("class_credit_ledger_entries").select("amount")
      .where("student_user_id", "=", student_user_id).execute())
      .reduce((sum, entry) => sum + entry.amount, 0);
    await transaction.updateTable("class_credit_accounts")
      .set({ available_balance: balance, updated_at: now })
      .where("student_user_id", "=", student_user_id).execute();
  }
}

export async function applyCanonicalOrganizations(db: Database, options: CanonicalLoadOptions = {}) {
  const { manifest } = resolve(options);
  await db.insertInto("organizations")
    .values(manifest.organizations.map(({ id, name }) => ({ id, name })))
    .onConflict((conflict) => conflict.column("id").doUpdateSet((eb) => ({ name: eb.ref("excluded.name") }))).execute();
  await db.insertInto("organization_managers")
    .values(manifest.organizations.flatMap((organization) => organization.managerUserIds
      .map((user_id) => ({ user_id, organization_id: organization.id }))))
    .onConflict((conflict) => conflict.column("user_id")
      .doUpdateSet((eb) => ({ organization_id: eb.ref("excluded.organization_id") }))).execute();
  await db.insertInto("cohorts")
    .values(manifest.cohorts.map((cohort) => ({
      id: cohort.id,
      organization_id: cohort.organizationId,
      name: cohort.name,
      created_by_user_id: cohort.createdByUserId,
    })))
    .onConflict((conflict) => conflict.column("id").doUpdateSet((eb) => ({ name: eb.ref("excluded.name") }))).execute();
}

export async function applyCanonicalPendingInvitation(db: Database, options: CanonicalLoadOptions = {}) {
  const { manifest, now } = resolve(options);
  const invitation = manifest.pendingInvitation;
  const expiresAt = new Date(now.getTime() + 14 * DAY_MILLISECONDS);
  await db.insertInto("sponsorship_invitations").values({
    id: invitation.id,
    organization_id: invitation.organizationId,
    student_user_id: invitation.studentUserId,
    invited_by_user_id: invitation.invitedByUserId,
    state: "PENDING",
    disclosure_text_version: CURRENT_SPONSORSHIP_DISCLOSURE_VERSION,
    expires_at: expiresAt,
    decided_at: null,
  }).onConflict((conflict) => conflict.column("id")
    .doUpdateSet({ state: "PENDING", expires_at: expiresAt, decided_at: null })).execute();
}

/**
 * The accepted demonstration states: the Class Sessions that carry the learning
 * history, the Bookings and Class Credit movements behind them, the Attendance
 * correction that withdraws a Completion, and the ended Sponsorship whose frozen
 * boundary snapshots are all an Organization ever sees.
 */
export async function applyCanonicalShowcase(db: Database, options: CanonicalLoadOptions = {}) {
  const { manifest, now } = resolve(options);
  return inTransaction(db, async (transaction) => {
    const { classSessions, bookings, creditEntries, sponsorship } = manifest.showcase;
    const units = await transaction.selectFrom("lesson_units").select(["id", "stable_key", "course_id", "state"]).execute();
    const unitByKey = new Map(units.map((unit) => [unit.stable_key, unit]));
    const courses = await transaction.selectFrom("courses").select(["id", "stable_key"]).execute();
    const courseByKey = new Map(courses.map((course) => [course.stable_key, course]));

    for (const session of classSessions) {
      await transaction.insertInto("class_sessions").values({
        id: session.id,
        lesson_unit_id: unitByKey.get(session.unitKey)!.id,
        teacher_user_id: session.teacherUserId,
        starts_at: atOffsetDays(now, session.offsetDays),
        scheduling_time_zone: session.schedulingTimeZone,
        seat_capacity: session.seatCapacity,
        state: "PUBLISHED",
      // A published start instant is immutable, so an already-loaded Class Session
      // keeps the one it was published with.
      }).onConflict((conflict) => conflict.column("id").doNothing()).execute();
    }
    const sessionById = new Map((await transaction.selectFrom("class_sessions")
      .select(["id", "lesson_unit_id", "teacher_user_id", "starts_at"]).execute())
      .map((session) => [session.id, session]));

    const studentUserIds = [...new Set([
      ...bookings.map((booking) => booking.studentUserId),
      ...creditEntries.map((entry) => entry.studentUserId),
    ])];
    await transaction.insertInto("class_credit_accounts")
      .values(studentUserIds.map((student_user_id) => ({ student_user_id })))
      .onConflict((conflict) => conflict.column("student_user_id").doNothing()).execute();

    for (const booking of bookings) {
      const session = sessionById.get(booking.classSessionId)!;
      const endsAt = new Date(session.starts_at.getTime() + CLASS_SESSION_MINUTES * 60_000);
      await transaction.insertInto("bookings").values({
        id: booking.id,
        student_user_id: booking.studentUserId,
        class_session_id: booking.classSessionId,
        teacher_user_id_at_booking: session.teacher_user_id,
        state: booking.state,
        terminal_reason: booking.terminalReason ?? null,
        class_credit_refunded: booking.classCreditRefunded,
        late_cancellation_refund_until: null,
        rescheduled_from_booking_id: null,
        booked_at: new Date(session.starts_at.getTime() - 7 * DAY_MILLISECONDS),
        ended_at: booking.state === "ENDED" ? new Date(session.starts_at.getTime() - 2 * DAY_MILLISECONDS) : null,
      }).onConflict((conflict) => conflict.column("id").doNothing()).execute();

      const commitment = {
        starts_at: session.starts_at,
        ends_at: endsAt,
        active: booking.state === "ACTIVE",
      };
      await transaction.insertInto("schedule_commitments").values({
        user_id: booking.studentUserId,
        class_session_id: booking.classSessionId,
        commitment_role: "STUDENT",
        ...commitment,
      }).onConflict((conflict) => conflict.columns(["class_session_id", "user_id", "commitment_role"])
        .doUpdateSet(commitment)).execute();

      await transaction.insertInto("class_credit_ledger_entries").values({
        student_user_id: booking.studentUserId,
        amount: -1,
        source: "BOOKING_DEDUCTION",
        source_reference: booking.id,
        reason: null,
      }).onConflict((conflict) => conflict.columns(["source", "source_reference"]).doNothing()).execute();
      if (booking.classCreditRefunded) {
        await transaction.insertInto("class_credit_ledger_entries").values({
          student_user_id: booking.studentUserId,
          amount: 1,
          source: "BOOKING_REFUND",
          source_reference: booking.id,
          reason: null,
        }).onConflict((conflict) => conflict.columns(["source", "source_reference"]).doNothing()).execute();
      }
    }

    for (const entry of creditEntries) {
      await transaction.insertInto("class_credit_ledger_entries").values({
        student_user_id: entry.studentUserId,
        amount: entry.amount,
        source: entry.source,
        source_reference: entry.sourceReference,
        reason: entry.reason,
      }).onConflict((conflict) => conflict.columns(["source", "source_reference"]).doNothing()).execute();
    }

    // Attendance, corrections, and the Completions that only an effective Attended
    // outcome supports.
    for (const booking of bookings) {
      if (!booking.attendance) continue;
      const session = sessionById.get(booking.classSessionId)!;
      const submittedAt = new Date(session.starts_at.getTime() + 2 * 60 * 60_000);
      await transaction.insertInto("attendance_records").values({
        booking_id: booking.id,
        outcome: booking.attendance,
        submitted_by_user_id: session.teacher_user_id,
        submitted_at: submittedAt,
        updated_at: submittedAt,
      }).onConflict((conflict) => conflict.column("booking_id")
        .doUpdateSet({ outcome: booking.attendance, updated_at: submittedAt })).execute();

      if (booking.correctedFrom) {
        const correctedAt = new Date(session.starts_at.getTime() + 3 * DAY_MILLISECONDS);
        const recorded = await transaction.selectFrom("attendance_record_corrections").select("id")
          .where("booking_id", "=", booking.id).executeTakeFirst();
        if (!recorded) {
          await transaction.insertInto("attendance_record_corrections").values({
            booking_id: booking.id,
            prior_outcome: booking.correctedFrom.outcome,
            corrected_outcome: booking.attendance,
            corrected_by_user_id: booking.correctedFrom.byUserId,
            reason: booking.correctedFrom.reason,
            corrected_at: correctedAt,
          }).execute();
        }
      }

      if (booking.attendance === "ATTENDED") {
        await transaction.insertInto("lesson_unit_completions").values({
          student_user_id: booking.studentUserId,
          lesson_unit_id: session.lesson_unit_id,
          established_by_booking_id: booking.id,
          earned_at: submittedAt,
        }).onConflict((conflict) => conflict.columns(["student_user_id", "lesson_unit_id"]).doNothing()).execute();
      } else {
        // A correction away from Attended withdraws the Completion it established.
        await transaction.deleteFrom("lesson_unit_completions")
          .where("student_user_id", "=", booking.studentUserId)
          .where("lesson_unit_id", "=", session.lesson_unit_id)
          .where("established_by_booking_id", "=", booking.id).execute();
      }
    }

    const acceptedAt = atOffsetDays(now, sponsorship.acceptedOffsetDays);
    const endedAt = atOffsetDays(now, sponsorship.endedOffsetDays);
    await transaction.insertInto("sponsorship_invitations").values({
      id: sponsorship.invitationId,
      organization_id: sponsorship.organizationId,
      student_user_id: sponsorship.studentUserId,
      invited_by_user_id: sponsorship.invitedByUserId,
      state: "ACCEPTED",
      disclosure_text_version: CURRENT_SPONSORSHIP_DISCLOSURE_VERSION,
      expires_at: new Date(acceptedAt.getTime() + 14 * DAY_MILLISECONDS),
      decided_at: acceptedAt,
    }).onConflict((conflict) => conflict.column("id").doUpdateSet({ state: "ACCEPTED", decided_at: acceptedAt })).execute();

    const sponsorshipValues = {
      state: "ENDED" as const,
      accepted_at: acceptedAt,
      grant_count: 1,
      next_anniversary_at: monthlySubscriptionAnniversary(acceptedAt, 1),
      ended_at: endedAt,
      ended_by_party: sponsorship.endedByParty,
      ended_by_user_id: sponsorship.endedByUserId,
    };
    await transaction.insertInto("sponsorships").values({
      id: sponsorship.id,
      organization_id: sponsorship.organizationId,
      student_user_id: sponsorship.studentUserId,
      invitation_id: sponsorship.invitationId,
      ...sponsorshipValues,
    }).onConflict((conflict) => conflict.column("id").doUpdateSet(sponsorshipValues)).execute();

    const membershipValues = { effective_from: acceptedAt, effective_until: endedAt };
    await transaction.insertInto("cohort_memberships").values({
      id: sponsorship.cohortMembershipId,
      cohort_id: sponsorship.cohortId,
      sponsorship_id: sponsorship.id,
      ...membershipValues,
    }).onConflict((conflict) => conflict.column("id").doUpdateSet(membershipValues)).execute();

    for (const snapshot of sponsorship.snapshots) {
      const courseId = courseByKey.get(snapshot.courseKey)!.id;
      const capturedAt = snapshot.boundary === "SPONSORSHIP_START" ? acceptedAt : endedAt;
      const inserted = await transaction.insertInto("course_progress_snapshots").values({
        sponsorship_id: sponsorship.id,
        boundary: snapshot.boundary,
        course_id: courseId,
        completed_active_lesson_unit_count: snapshot.completedActiveLessonUnitCount,
        active_lesson_unit_count: snapshot.activeLessonUnitCount,
        captured_at: capturedAt,
      }).onConflict((conflict) => conflict.columns(["sponsorship_id", "boundary", "course_id"]).doNothing())
        .returning("id").executeTakeFirst();
      if (!inserted) continue;
      // The frozen denominator is a set of units, not just a count: a unit retired
      // after this boundary stays in it, and one activated later never joins.
      await transaction.insertInto("course_progress_snapshot_units")
        .values(units.filter((unit) => unit.course_id === courseId && unit.state === "ACTIVE")
          .map((unit) => ({ snapshot_id: inserted.id, lesson_unit_id: unit.id }))).execute();
    }

    // The balance and the occupied seat count are both derived facts. Recomputing
    // them from the ledger and the Booking history leaves no room for a partially
    // applied load to publish a number nothing supports.
    await settleBalancesFromLedger(transaction, now);
    for (const session of classSessions) {
      const occupied = bookings.filter((booking) => booking.classSessionId === session.id && booking.state === "ACTIVE").length;
      await transaction.updateTable("class_sessions").set({ occupied_seats: occupied })
        .where("id", "=", session.id).execute();
    }
  });
}

async function recordFixtureAudit(db: Database, values: {
  manifestVersion: string;
  operation: string;
  outcome: "SUCCEEDED" | "FAILED";
  reasonCode: string;
  correlationId: string;
  occurredAt: Date;
}) {
  await db.insertInto("audit_entries").values({
    actor_user_id: null,
    system_identity: CANONICAL_FIXTURE_SYSTEM_IDENTITY,
    acting_role: null,
    operation: values.operation,
    target_type: "CanonicalFixtureManifest",
    target_id: values.manifestVersion,
    outcome: values.outcome,
    reason_code: values.reasonCode,
    correlation_id: values.correlationId,
    occurred_at: values.occurredAt,
  }).execute();
}

/**
 * Loads the versioned canonical synthetic fixture manifest and publishes it only if
 * the loaded state validates. Everything is applied in one transaction and validated
 * inside it, so a failed invariant leaves the previous state untouched rather than a
 * half-built demonstration reachable by reviewers.
 *
 * The load is a background action, so it records its own start and terminal Audit
 * Entries: opaque system identity, manifest version as target, and a safe reason
 * code, with no fixture content in the entry.
 */
export async function loadCanonicalFixtures(db: Database, options: {
  now?: Date;
  correlationId?: string;
  manifest?: CanonicalFixtureManifest;
} = {}) {
  const now = options.now ?? new Date();
  const manifest = options.manifest ?? canonicalFixtureManifest;
  const correlationId = options.correlationId ?? `canonical-fixtures-${randomUUID()}`;

  await recordFixtureAudit(db, {
    manifestVersion: manifest.version,
    operation: "canonical-fixtures.load-started",
    outcome: "SUCCEEDED",
    reasonCode: "CANONICAL_FIXTURE_LOAD_STARTED",
    correlationId,
    occurredAt: now,
  });

  let violations: FixtureInvariantViolation[] = [];
  try {
    await inTransaction(db, async (transaction) => {
      const step = { manifest, now };
      await applyCanonicalIdentities(transaction, step);
      await applyCanonicalCurriculum(transaction, step);
      await applyCanonicalSubscription(transaction, step);
      await applyCanonicalOrganizations(transaction, step);
      await applyCanonicalPendingInvitation(transaction, step);
      await applyCanonicalShowcase(transaction, step);

      violations = await validateCanonicalFixtures(transaction, manifest, now);
      if (violations.length > 0) throw new CanonicalFixtureValidationError(violations);
    });
  } catch (error) {
    await recordFixtureAudit(db, {
      manifestVersion: manifest.version,
      operation: "canonical-fixtures.load-failed",
      outcome: "FAILED",
      reasonCode: error instanceof CanonicalFixtureValidationError
        ? "CANONICAL_FIXTURE_VALIDATION_FAILED"
        : "CANONICAL_FIXTURE_LOAD_FAILED",
      correlationId,
      occurredAt: new Date(),
    });
    throw error;
  }

  await recordFixtureAudit(db, {
    manifestVersion: manifest.version,
    operation: "canonical-fixtures.load-completed",
    outcome: "SUCCEEDED",
    reasonCode: "CANONICAL_FIXTURE_LOAD_COMPLETED",
    correlationId,
    occurredAt: new Date(),
  });

  return { manifestVersion: manifest.version, correlationId };
}
