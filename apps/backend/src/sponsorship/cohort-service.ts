import {
  attributedCohortIds,
  cohortMembershipWindowsOverlap,
  sponsorshipReportingIncludes,
  type CohortMembershipWindow,
} from "@marketplace/core";
import { sql } from "kysely";

import type { Database } from "../database/database.js";

type OrganizationManagerActor = { id: string; organizationId: string; locale: "en" | "es" };

type CohortErrorCode =
  | "COHORT_NOT_FOUND"
  | "COHORT_NAME_TAKEN"
  | "SPONSORSHIP_NOT_FOUND"
  | "SPONSORSHIP_NOT_ACTIVE"
  | "MEMBERSHIP_NOT_FOUND"
  | "MEMBERSHIP_ALREADY_ENDED"
  | "MEMBERSHIP_NOT_PROSPECTIVE"
  | "MEMBERSHIP_WINDOW_INVALID"
  | "MEMBERSHIP_WINDOW_OVERLAPS";

type CohortOperation =
  | "cohort.created"
  | "cohort.renamed"
  | "cohort-membership.created"
  | "cohort-membership.ended";

const targetTypesByOperation: Record<CohortOperation, string> = {
  "cohort.created": "Cohort",
  "cohort.renamed": "Cohort",
  "cohort-membership.created": "CohortMembership",
  "cohort-membership.ended": "CohortMembership",
};

async function auditedCohortConflict(
  db: Database,
  organizationManager: OrganizationManagerActor,
  operation: CohortOperation,
  targetId: string,
  correlationId: string,
  code: CohortErrorCode,
  message: string,
) {
  await db.insertInto("audit_entries").values({
    actor_user_id: organizationManager.id,
    acting_role: "ORGANIZATION_MANAGER",
    operation,
    target_type: targetTypesByOperation[operation],
    target_id: targetId,
    outcome: "DENIED",
    reason_code: code,
    correlation_id: correlationId,
  }).execute();
  return { __typename: "CohortError" as const, code, message };
}

async function recordCohortAudit(
  db: Database,
  organizationManager: OrganizationManagerActor,
  operation: CohortOperation,
  targetId: string,
  correlationId: string,
  reasonCode: string,
) {
  await db.insertInto("audit_entries").values({
    actor_user_id: organizationManager.id,
    acting_role: "ORGANIZATION_MANAGER",
    operation,
    target_type: targetTypesByOperation[operation],
    target_id: targetId,
    outcome: "SUCCEEDED",
    reason_code: reasonCode,
    correlation_id: correlationId,
  }).execute();
}

type MembershipRow = {
  id: string;
  cohort_id: string;
  sponsorship_id: string;
  effective_from: Date;
  effective_until: Date | null;
};

type SponsoredStudent = {
  sponsorshipId: string;
  studentUserId: string;
  studentDisplayName: string;
  acceptedAt: Date;
  endedAt: Date | null;
};

type Occurrence = { studentUserId: string; occurredAt: Date; outcome: "ATTENDED" | "NO_SHOW" };

function membershipWindow(row: MembershipRow): CohortMembershipWindow {
  return { cohortId: row.cohort_id, effectiveFrom: row.effective_from, effectiveUntil: row.effective_until };
}

// Attribution is a reporting question, so it reads the Organization's whole
// sponsored population once and resolves each Attendance outcome against the
// Cohort membership and Sponsorship window effective when the Class Session
// occurred, rather than against today's memberships.
async function organizationReportingFacts(db: Database, organizationId: string) {
  const sponsorships = await db.selectFrom("sponsorships")
    .innerJoin("users", "users.id", "sponsorships.student_user_id")
    .select([
      "sponsorships.id as sponsorship_id",
      "sponsorships.student_user_id",
      "users.display_name as student_display_name",
      "sponsorships.accepted_at",
      "sponsorships.ended_at",
    ])
    .where("sponsorships.organization_id", "=", organizationId)
    .execute();
  const sponsoredStudents = new Map<string, SponsoredStudent>(sponsorships.map((row) => [row.sponsorship_id, {
    sponsorshipId: row.sponsorship_id,
    studentUserId: row.student_user_id,
    studentDisplayName: row.student_display_name,
    acceptedAt: row.accepted_at,
    endedAt: row.ended_at,
  }]));

  const studentUserIds = [...new Set(sponsorships.map((row) => row.student_user_id))];
  const occurrences: Occurrence[] = studentUserIds.length === 0 ? [] : (await db.selectFrom("attendance_records")
    .innerJoin("bookings", "bookings.id", "attendance_records.booking_id")
    .innerJoin("class_sessions", "class_sessions.id", "bookings.class_session_id")
    .select(["bookings.student_user_id", "class_sessions.starts_at", "attendance_records.outcome"])
    .where("bookings.student_user_id", "in", studentUserIds)
    .where("class_sessions.state", "=", "PUBLISHED")
    .execute()).map((row) => ({ studentUserId: row.student_user_id, occurredAt: row.starts_at, outcome: row.outcome }));

  return { sponsoredStudents, occurrences };
}

function attributeActivity(
  memberships: readonly MembershipRow[],
  sponsoredStudents: Map<string, SponsoredStudent>,
  occurrences: readonly Occurrence[],
) {
  const attended = new Map<string, number>();
  const noShow = new Map<string, number>();
  const membershipsBySponsorship = new Map<string, MembershipRow[]>();
  for (const membership of memberships) {
    const existing = membershipsBySponsorship.get(membership.sponsorship_id) ?? [];
    existing.push(membership);
    membershipsBySponsorship.set(membership.sponsorship_id, existing);
  }

  for (const [sponsorshipId, sponsorshipMemberships] of membershipsBySponsorship) {
    const sponsored = sponsoredStudents.get(sponsorshipId);
    if (!sponsored) continue;
    const windows = sponsorshipMemberships.map((membership) => ({
      // The membership identity carries the row, so attribution can credit the
      // exact membership rather than only its Cohort.
      ...membershipWindow(membership),
      cohortId: membership.id,
    }));
    for (const occurrence of occurrences) {
      if (occurrence.studentUserId !== sponsored.studentUserId) continue;
      if (!sponsorshipReportingIncludes(sponsored, occurrence.occurredAt)) continue;
      const counts = occurrence.outcome === "ATTENDED" ? attended : noShow;
      for (const membershipId of attributedCohortIds(windows, occurrence.occurredAt)) {
        counts.set(membershipId, (counts.get(membershipId) ?? 0) + 1);
      }
    }
  }

  return { attended, noShow };
}

async function projectCohorts(db: Database, organizationId: string, cohortIds?: readonly string[]) {
  const organization = await db.selectFrom("organizations").select(["id", "name"]).where("id", "=", organizationId).executeTakeFirstOrThrow();
  let cohortQuery = db.selectFrom("cohorts")
    .select(["id", "name", "created_at"])
    .where("organization_id", "=", organizationId);
  if (cohortIds) cohortQuery = cohortQuery.where("id", "in", [...cohortIds]);
  const cohorts = await cohortQuery.orderBy("name").execute();
  if (cohorts.length === 0) return [];

  const memberships = await db.selectFrom("cohort_memberships")
    .innerJoin("cohorts", "cohorts.id", "cohort_memberships.cohort_id")
    .select([
      "cohort_memberships.id",
      "cohort_memberships.cohort_id",
      "cohort_memberships.sponsorship_id",
      "cohort_memberships.effective_from",
      "cohort_memberships.effective_until",
    ])
    .where("cohorts.organization_id", "=", organizationId)
    .orderBy("cohort_memberships.effective_from")
    .orderBy("cohort_memberships.id")
    .execute();
  const { sponsoredStudents, occurrences } = await organizationReportingFacts(db, organizationId);
  const { attended, noShow } = attributeActivity(memberships, sponsoredStudents, occurrences);

  return cohorts.map((cohort) => {
    const cohortMemberships = memberships
      .filter((membership) => membership.cohort_id === cohort.id)
      .flatMap((membership) => {
        const sponsored = sponsoredStudents.get(membership.sponsorship_id);
        if (!sponsored) return [];
        return [{
          id: membership.id,
          cohortId: cohort.id,
          cohortName: cohort.name,
          sponsorshipId: membership.sponsorship_id,
          studentUserId: sponsored.studentUserId,
          studentDisplayName: sponsored.studentDisplayName,
          effectiveFrom: membership.effective_from.toISOString(),
          effectiveUntil: membership.effective_until?.toISOString() ?? null,
          attributedActivity: {
            attendedCount: attended.get(membership.id) ?? 0,
            noShowCount: noShow.get(membership.id) ?? 0,
          },
        }];
      });
    return {
      id: cohort.id,
      organization: { id: organization.id, name: organization.name },
      name: cohort.name,
      createdAt: cohort.created_at.toISOString(),
      memberships: cohortMemberships,
      attributedActivity: {
        attendedCount: cohortMemberships.reduce((total, membership) => total + membership.attributedActivity.attendedCount, 0),
        noShowCount: cohortMemberships.reduce((total, membership) => total + membership.attributedActivity.noShowCount, 0),
      },
    };
  });
}

export async function cohortsForOrganization(db: Database, organizationManager: { organizationId: string }) {
  return projectCohorts(db, organizationManager.organizationId);
}

async function cohortResult(db: Database, organizationId: string, cohortId: string) {
  const [cohort] = await projectCohorts(db, organizationId, [cohortId]);
  return cohort!;
}

async function nameIsTaken(db: Database, organizationId: string, name: string, exceptCohortId?: string) {
  let query = db.selectFrom("cohorts")
    .select("id")
    .where("organization_id", "=", organizationId)
    .where(sql<string>`lower(cohorts.name)`, "=", name.trim().toLowerCase());
  if (exceptCohortId) query = query.where("id", "<>", exceptCohortId);
  return Boolean(await query.executeTakeFirst());
}

export async function createCohort(
  transaction: Database,
  organizationManager: OrganizationManagerActor,
  input: { name: string },
  correlationId: string,
  now: Date,
) {
  const name = input.name.trim();
  if (await nameIsTaken(transaction, organizationManager.organizationId, name)) {
    return auditedCohortConflict(transaction, organizationManager, "cohort.created", organizationManager.organizationId, correlationId, "COHORT_NAME_TAKEN", "Your Organization already has a Cohort with that name.");
  }
  const inserted = await transaction.insertInto("cohorts").values({
    organization_id: organizationManager.organizationId,
    name,
    created_by_user_id: organizationManager.id,
    created_at: now,
    updated_at: now,
  }).returning("id").executeTakeFirstOrThrow();
  await recordCohortAudit(transaction, organizationManager, "cohort.created", inserted.id, correlationId, "COHORT_CREATED");
  return {
    __typename: "CohortSuccess" as const,
    cohort: await cohortResult(transaction, organizationManager.organizationId, inserted.id),
  };
}

export async function renameCohort(
  transaction: Database,
  organizationManager: OrganizationManagerActor,
  input: { cohortId: string; name: string },
  correlationId: string,
  now: Date,
) {
  const name = input.name.trim();
  const cohort = await transaction.selectFrom("cohorts")
    .select("id")
    .where("id", "=", input.cohortId)
    .where("organization_id", "=", organizationManager.organizationId)
    .executeTakeFirst();
  if (!cohort) {
    return auditedCohortConflict(transaction, organizationManager, "cohort.renamed", input.cohortId, correlationId, "COHORT_NOT_FOUND", "The Cohort was not found in your Organization.");
  }
  if (await nameIsTaken(transaction, organizationManager.organizationId, name, cohort.id)) {
    return auditedCohortConflict(transaction, organizationManager, "cohort.renamed", cohort.id, correlationId, "COHORT_NAME_TAKEN", "Your Organization already has a Cohort with that name.");
  }
  await transaction.updateTable("cohorts")
    .set({ name, updated_at: now })
    .where("id", "=", cohort.id)
    .executeTakeFirstOrThrow();
  await recordCohortAudit(transaction, organizationManager, "cohort.renamed", cohort.id, correlationId, "COHORT_RENAMED");
  return {
    __typename: "CohortSuccess" as const,
    cohort: await cohortResult(transaction, organizationManager.organizationId, cohort.id),
  };
}

export async function addCohortMembership(
  transaction: Database,
  organizationManager: OrganizationManagerActor,
  input: { cohortId: string; sponsorshipId: string; effectiveFrom?: string | null | undefined; effectiveUntil?: string | null | undefined },
  correlationId: string,
  now: Date,
) {
  const operation = "cohort-membership.created" as const;
  const cohort = await transaction.selectFrom("cohorts")
    .select("id")
    .where("id", "=", input.cohortId)
    .where("organization_id", "=", organizationManager.organizationId)
    .executeTakeFirst();
  if (!cohort) {
    return auditedCohortConflict(transaction, organizationManager, operation, input.cohortId, correlationId, "COHORT_NOT_FOUND", "The Cohort was not found in your Organization.");
  }
  // Locking the Sponsorship serializes every membership change for that
  // sponsored Student, so two managers cannot commit overlapping windows.
  const sponsorship = await transaction.selectFrom("sponsorships")
    .select(["id", "state"])
    .where("id", "=", input.sponsorshipId)
    .where("organization_id", "=", organizationManager.organizationId)
    .forUpdate()
    .executeTakeFirst();
  if (!sponsorship) {
    return auditedCohortConflict(transaction, organizationManager, operation, input.sponsorshipId, correlationId, "SPONSORSHIP_NOT_FOUND", "The Sponsorship was not found in your Organization.");
  }
  if (sponsorship.state !== "ACTIVE") {
    return auditedCohortConflict(transaction, organizationManager, operation, sponsorship.id, correlationId, "SPONSORSHIP_NOT_ACTIVE", "The Sponsorship has ended, so its Cohort membership cannot change.");
  }

  const effectiveFrom = input.effectiveFrom ? new Date(input.effectiveFrom) : now;
  const effectiveUntil = input.effectiveUntil ? new Date(input.effectiveUntil) : null;
  if (effectiveFrom.getTime() < now.getTime()) {
    return auditedCohortConflict(transaction, organizationManager, operation, cohort.id, correlationId, "MEMBERSHIP_NOT_PROSPECTIVE", "Cohort membership starts now or later so it cannot rewrite past reporting.");
  }
  if (effectiveUntil && effectiveUntil.getTime() <= effectiveFrom.getTime()) {
    return auditedCohortConflict(transaction, organizationManager, operation, cohort.id, correlationId, "MEMBERSHIP_WINDOW_INVALID", "Cohort membership must end after it starts.");
  }

  const existing = await transaction.selectFrom("cohort_memberships")
    .select(["id", "cohort_id", "sponsorship_id", "effective_from", "effective_until"])
    .where("cohort_id", "=", cohort.id)
    .where("sponsorship_id", "=", sponsorship.id)
    .execute();
  const proposed: CohortMembershipWindow = { cohortId: cohort.id, effectiveFrom, effectiveUntil };
  if (existing.some((membership) => cohortMembershipWindowsOverlap(membershipWindow(membership), proposed))) {
    return auditedCohortConflict(transaction, organizationManager, operation, cohort.id, correlationId, "MEMBERSHIP_WINDOW_OVERLAPS", "The Student already has an overlapping membership in that Cohort.");
  }

  const inserted = await transaction.insertInto("cohort_memberships").values({
    cohort_id: cohort.id,
    sponsorship_id: sponsorship.id,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    created_at: now,
    updated_at: now,
  }).returning("id").executeTakeFirstOrThrow();
  await recordCohortAudit(transaction, organizationManager, operation, inserted.id, correlationId, "COHORT_MEMBERSHIP_CREATED");
  return membershipResult(transaction, organizationManager.organizationId, cohort.id, inserted.id);
}

export async function endCohortMembership(
  transaction: Database,
  organizationManager: OrganizationManagerActor,
  input: { cohortMembershipId: string; effectiveUntil?: string | null | undefined },
  correlationId: string,
  now: Date,
) {
  const operation = "cohort-membership.ended" as const;
  const membership = await transaction.selectFrom("cohort_memberships")
    .innerJoin("cohorts", "cohorts.id", "cohort_memberships.cohort_id")
    .select([
      "cohort_memberships.id",
      "cohort_memberships.cohort_id",
      "cohort_memberships.sponsorship_id",
      "cohort_memberships.effective_from",
      "cohort_memberships.effective_until",
    ])
    .where("cohort_memberships.id", "=", input.cohortMembershipId)
    .where("cohorts.organization_id", "=", organizationManager.organizationId)
    .executeTakeFirst();
  if (!membership) {
    return auditedCohortConflict(transaction, organizationManager, operation, input.cohortMembershipId, correlationId, "MEMBERSHIP_NOT_FOUND", "The Cohort membership was not found in your Organization.");
  }
  if (membership.effective_until && membership.effective_until.getTime() <= now.getTime()) {
    return auditedCohortConflict(transaction, organizationManager, operation, membership.id, correlationId, "MEMBERSHIP_ALREADY_ENDED", "The Cohort membership already ended.");
  }

  const effectiveUntil = input.effectiveUntil ? new Date(input.effectiveUntil) : now;
  if (effectiveUntil.getTime() < now.getTime()) {
    return auditedCohortConflict(transaction, organizationManager, operation, membership.id, correlationId, "MEMBERSHIP_NOT_PROSPECTIVE", "Cohort membership ends now or later so earlier attribution stays intact.");
  }
  if (effectiveUntil.getTime() <= membership.effective_from.getTime()) {
    return auditedCohortConflict(transaction, organizationManager, operation, membership.id, correlationId, "MEMBERSHIP_WINDOW_INVALID", "Cohort membership must end after it starts.");
  }

  await transaction.updateTable("cohort_memberships")
    .set({ effective_until: effectiveUntil, updated_at: now })
    .where("id", "=", membership.id)
    .executeTakeFirstOrThrow();
  await recordCohortAudit(transaction, organizationManager, operation, membership.id, correlationId, "COHORT_MEMBERSHIP_ENDED");
  return membershipResult(transaction, organizationManager.organizationId, membership.cohort_id, membership.id);
}

async function membershipResult(db: Database, organizationId: string, cohortId: string, membershipId: string) {
  const cohort = await cohortResult(db, organizationId, cohortId);
  return {
    __typename: "CohortMembershipSuccess" as const,
    cohort,
    membership: cohort.memberships.find((candidate) => candidate.id === membershipId)!,
  };
}

// Ending a Sponsorship closes its still-open Cohort memberships at the same
// instant: a Cohort only organizes reporting the Sponsorship authorizes.
export async function closeCohortMembershipsAtSponsorshipEnd(
  transaction: Database,
  sponsorshipId: string,
  endedAt: Date,
) {
  // A membership scheduled to begin at or after the end instant never covers
  // any activity, so it is discarded rather than closed before it starts.
  await transaction.deleteFrom("cohort_memberships")
    .where("sponsorship_id", "=", sponsorshipId)
    .where("effective_from", ">=", endedAt)
    .execute();
  await transaction.updateTable("cohort_memberships")
    .set({ effective_until: endedAt, updated_at: endedAt })
    .where("sponsorship_id", "=", sponsorshipId)
    .where((builder) => builder.or([
      builder("effective_until", "is", null),
      builder("effective_until", ">", endedAt),
    ]))
    .execute();
}
