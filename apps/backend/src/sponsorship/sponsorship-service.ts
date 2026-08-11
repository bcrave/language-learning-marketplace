import { interfaceMessages } from "@marketplace/core";

import type { Database } from "../database/database.js";
import { projectClassCreditAccount } from "../class-credit/class-credit-service.js";
import { monthlySubscriptionAnniversary } from "../subscription/subscription-time.js";
import { notifySponsorshipUser } from "./sponsorship-notifications.js";

export const CURRENT_SPONSORSHIP_DISCLOSURE_VERSION = "1";

type OrganizationManagerActor = { id: string; organizationId: string; locale: "en" | "es" };
type StudentActor = { id: string };

type SponsorshipInvitationErrorCode =
  | "STUDENT_NOT_FOUND"
  | "STUDENT_ALREADY_SPONSORED"
  | "INVITATION_ALREADY_PENDING";

type SponsorshipInvitationResponseErrorCode =
  | "INVITATION_NOT_FOUND"
  | "INVITATION_NOT_PENDING"
  | "INVITATION_EXPIRED"
  | "SPONSORSHIP_ALREADY_ACTIVE";

function inviteConflict(code: SponsorshipInvitationErrorCode, message: string) {
  return { __typename: "SponsorshipInvitationError" as const, code, message };
}

function responseConflict(code: SponsorshipInvitationResponseErrorCode, message: string) {
  return { __typename: "SponsorshipInvitationResponseError" as const, code, message };
}

export function sponsorshipDisclosure(locale: "en" | "es", version = CURRENT_SPONSORSHIP_DISCLOSURE_VERSION) {
  const messages = interfaceMessages[locale];
  return {
    version,
    benefitDescription: messages["sponsorship.disclosure.benefit"],
    organizationVisibleDataDescription: messages["sponsorship.disclosure.visibleData"],
    excludedPrivateDataDescription: messages["sponsorship.disclosure.excludedData"],
  };
}

export function sponsorshipPeriodReference(sponsorshipId: string, at: Date) {
  return `sponsorship:${sponsorshipId}:${at.toISOString()}`;
}

const invitationColumns = [
  "sponsorship_invitations.id",
  "sponsorship_invitations.organization_id",
  "organizations.name as organization_name",
  "sponsorship_invitations.student_user_id",
  "users.display_name as student_display_name",
  "sponsorship_invitations.state",
  "sponsorship_invitations.disclosure_text_version",
  "sponsorship_invitations.expires_at",
  "sponsorship_invitations.created_at",
  "sponsorship_invitations.decided_at",
] as const;

function baseInvitationQuery(db: Database) {
  return db.selectFrom("sponsorship_invitations")
    .innerJoin("organizations", "organizations.id", "sponsorship_invitations.organization_id")
    .innerJoin("users", "users.id", "sponsorship_invitations.student_user_id")
    .select(invitationColumns);
}

type InvitationRow = Awaited<ReturnType<ReturnType<typeof baseInvitationQuery>["execute"]>>[number];

function projectInvitation(row: InvitationRow, locale: "en" | "es") {
  return {
    id: row.id,
    organization: { id: row.organization_id, name: row.organization_name },
    studentUserId: row.student_user_id,
    studentDisplayName: row.student_display_name,
    state: row.state,
    disclosure: sponsorshipDisclosure(locale, row.disclosure_text_version),
    expiresAt: row.expires_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    decidedAt: row.decided_at?.toISOString() ?? null,
  };
}

export async function sponsorshipInvitationsForStudent(db: Database, student: StudentActor) {
  const viewer = await db.selectFrom("users").select("interface_locale").where("id", "=", student.id).executeTakeFirst();
  const locale = viewer?.interface_locale ?? "en";
  const rows = await baseInvitationQuery(db)
    .where("sponsorship_invitations.student_user_id", "=", student.id)
    .orderBy("sponsorship_invitations.created_at", "desc")
    .execute();
  return rows.map((row) => projectInvitation(row, locale));
}

export async function sponsorshipInvitationsForOrganization(db: Database, organizationManager: OrganizationManagerActor) {
  const rows = await baseInvitationQuery(db)
    .where("sponsorship_invitations.organization_id", "=", organizationManager.organizationId)
    .orderBy("sponsorship_invitations.created_at", "desc")
    .execute();
  return rows.map((row) => projectInvitation(row, organizationManager.locale));
}

const sponsorshipColumns = [
  "sponsorships.id",
  "sponsorships.organization_id",
  "organizations.name as organization_name",
  "sponsorships.student_user_id",
  "users.display_name as student_display_name",
  "sponsorships.accepted_at",
  "sponsorships.next_anniversary_at",
] as const;

function baseSponsorshipQuery(db: Database) {
  return db.selectFrom("sponsorships")
    .innerJoin("organizations", "organizations.id", "sponsorships.organization_id")
    .innerJoin("users", "users.id", "sponsorships.student_user_id")
    .select(sponsorshipColumns);
}

type SponsorshipRow = Awaited<ReturnType<ReturnType<typeof baseSponsorshipQuery>["execute"]>>[number];

function projectSponsorship(row: SponsorshipRow) {
  return {
    id: row.id,
    organization: { id: row.organization_id, name: row.organization_name },
    studentUserId: row.student_user_id,
    studentDisplayName: row.student_display_name,
    acceptedAt: row.accepted_at.toISOString(),
    nextAnniversaryAt: row.next_anniversary_at.toISOString(),
  };
}

export async function sponsorshipForStudent(db: Database, studentId: string) {
  const row = await baseSponsorshipQuery(db).where("sponsorships.student_user_id", "=", studentId).executeTakeFirst();
  return row ? projectSponsorship(row) : null;
}

export async function sponsorshipsForOrganization(db: Database, organizationManager: { organizationId: string }) {
  const rows = await baseSponsorshipQuery(db)
    .where("sponsorships.organization_id", "=", organizationManager.organizationId)
    .orderBy("sponsorships.accepted_at", "desc")
    .execute();
  return rows.map(projectSponsorship);
}

async function auditedInviteConflict(
  db: Database,
  organizationManager: OrganizationManagerActor,
  correlationId: string,
  code: SponsorshipInvitationErrorCode,
  message: string,
) {
  await db.insertInto("audit_entries").values({
    actor_user_id: organizationManager.id,
    acting_role: "ORGANIZATION_MANAGER",
    operation: "sponsorship-invitation.created",
    target_type: "SponsorshipInvitation",
    target_id: organizationManager.id,
    outcome: "DENIED",
    reason_code: code,
    correlation_id: correlationId,
  }).execute();
  return inviteConflict(code, message);
}

export async function inviteToSponsorship(
  transaction: Database,
  organizationManager: OrganizationManagerActor,
  input: { studentUserId: string },
  correlationId: string,
  now: Date,
) {
  const student = await transaction.selectFrom("users")
    .innerJoin("role_assignments", "role_assignments.user_id", "users.id")
    .select(["users.id", "users.display_name"])
    .where("users.id", "=", input.studentUserId)
    .where("role_assignments.role", "=", "STUDENT")
    .executeTakeFirst();
  if (!student) {
    return auditedInviteConflict(transaction, organizationManager, correlationId, "STUDENT_NOT_FOUND", "Choose a User with a Student Role Assignment.");
  }
  const existingSponsorship = await transaction.selectFrom("sponsorships")
    .select("id")
    .where("student_user_id", "=", student.id)
    .executeTakeFirst();
  if (existingSponsorship) {
    return auditedInviteConflict(transaction, organizationManager, correlationId, "STUDENT_ALREADY_SPONSORED", "The Student already has a Sponsorship.");
  }
  const existingPending = await transaction.selectFrom("sponsorship_invitations")
    .select("id")
    .where("student_user_id", "=", student.id)
    .where("organization_id", "=", organizationManager.organizationId)
    .where("state", "=", "PENDING")
    .executeTakeFirst();
  if (existingPending) {
    return auditedInviteConflict(transaction, organizationManager, correlationId, "INVITATION_ALREADY_PENDING", "The Student already has a pending Sponsorship Invitation from your Organization.");
  }

  const organization = await transaction.selectFrom("organizations").select("name")
    .where("id", "=", organizationManager.organizationId).executeTakeFirstOrThrow();
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60_000);
  const inserted = await transaction.insertInto("sponsorship_invitations").values({
    organization_id: organizationManager.organizationId,
    student_user_id: student.id,
    invited_by_user_id: organizationManager.id,
    state: "PENDING",
    disclosure_text_version: CURRENT_SPONSORSHIP_DISCLOSURE_VERSION,
    expires_at: expiresAt,
  }).returning(["id", "created_at"]).executeTakeFirstOrThrow();

  await notifySponsorshipUser(transaction, {
    recipientUserId: student.id,
    messageId: "sponsorship-invitation.created.student",
    organizationName: organization.name,
    expiresAt,
    sourceReference: `sponsorship-invitation.created:${inserted.id}`,
  });
  await notifySponsorshipUser(transaction, {
    recipientUserId: organizationManager.id,
    messageId: "sponsorship-invitation.created.manager",
    studentDisplayName: student.display_name,
    expiresAt,
    sourceReference: `sponsorship-invitation.created:${inserted.id}`,
  });
  await transaction.insertInto("audit_entries").values({
    actor_user_id: organizationManager.id,
    acting_role: "ORGANIZATION_MANAGER",
    operation: "sponsorship-invitation.created",
    target_type: "SponsorshipInvitation",
    target_id: inserted.id,
    outcome: "SUCCEEDED",
    reason_code: "SPONSORSHIP_INVITATION_CREATED",
    correlation_id: correlationId,
  }).execute();

  return {
    __typename: "InviteToSponsorshipSuccess" as const,
    invitation: projectInvitation({
      id: inserted.id,
      organization_id: organizationManager.organizationId,
      organization_name: organization.name,
      student_user_id: student.id,
      student_display_name: student.display_name,
      state: "PENDING",
      disclosure_text_version: CURRENT_SPONSORSHIP_DISCLOSURE_VERSION,
      expires_at: expiresAt,
      created_at: inserted.created_at,
      decided_at: null,
    }, organizationManager.locale),
  };
}

// Transitions one still-PENDING invitation to EXPIRED, notifying both parties.
// Shared by the lazy check inside a Student's response and the worker's due scan.
export async function expireInvitation(
  db: Database,
  invitation: { id: string; organization_id: string; student_user_id: string; invited_by_user_id: string },
  now: Date,
  correlationId: string,
) {
  await db.updateTable("sponsorship_invitations")
    .set({ state: "EXPIRED", decided_at: now })
    .where("id", "=", invitation.id)
    .executeTakeFirstOrThrow();
  const [organization, student] = await Promise.all([
    db.selectFrom("organizations").select("name").where("id", "=", invitation.organization_id).executeTakeFirstOrThrow(),
    db.selectFrom("users").select("display_name").where("id", "=", invitation.student_user_id).executeTakeFirstOrThrow(),
  ]);
  await notifySponsorshipUser(db, {
    recipientUserId: invitation.student_user_id,
    messageId: "sponsorship-invitation.expired.student",
    organizationName: organization.name,
    sourceReference: `sponsorship-invitation.expired:${invitation.id}`,
  });
  await notifySponsorshipUser(db, {
    recipientUserId: invitation.invited_by_user_id,
    messageId: "sponsorship-invitation.expired.manager",
    studentDisplayName: student.display_name,
    sourceReference: `sponsorship-invitation.expired:${invitation.id}`,
  });
  await db.insertInto("audit_entries").values({
    actor_user_id: null,
    system_identity: "SPONSORSHIP_INVITATION_WORKER",
    acting_role: null,
    operation: "sponsorship-invitation.expired",
    target_type: "SponsorshipInvitation",
    target_id: invitation.id,
    outcome: "SUCCEEDED",
    reason_code: "SPONSORSHIP_INVITATION_EXPIRED",
    correlation_id: correlationId,
  }).execute();
}

async function auditedResponseConflict(
  db: Database,
  student: StudentActor,
  operation: "sponsorship-invitation.accepted" | "sponsorship-invitation.declined",
  targetId: string,
  correlationId: string,
  code: SponsorshipInvitationResponseErrorCode,
  message: string,
) {
  await db.insertInto("audit_entries").values({
    actor_user_id: student.id,
    acting_role: "STUDENT",
    operation,
    target_type: "SponsorshipInvitation",
    target_id: targetId,
    outcome: "DENIED",
    reason_code: code,
    correlation_id: correlationId,
  }).execute();
  return responseConflict(code, message);
}

async function lockedPendingInvitation(
  transaction: Database,
  student: StudentActor,
  operation: "sponsorship-invitation.accepted" | "sponsorship-invitation.declined",
  invitationId: string,
  correlationId: string,
  now: Date,
) {
  const invitation = await transaction.selectFrom("sponsorship_invitations")
    .selectAll()
    .where("id", "=", invitationId)
    .forUpdate()
    .executeTakeFirst();
  if (!invitation || invitation.student_user_id !== student.id) {
    return { status: "CONFLICT" as const, conflict: await auditedResponseConflict(transaction, student, operation, invitationId, correlationId, "INVITATION_NOT_FOUND", "The Sponsorship Invitation was not found.") };
  }
  if (invitation.state !== "PENDING") {
    return { status: "CONFLICT" as const, conflict: await auditedResponseConflict(transaction, student, operation, invitation.id, correlationId, "INVITATION_NOT_PENDING", "The Sponsorship Invitation already has a decision.") };
  }
  if (invitation.expires_at.getTime() <= now.getTime()) {
    await expireInvitation(transaction, invitation, now, correlationId);
    return { status: "CONFLICT" as const, conflict: responseConflict("INVITATION_EXPIRED", "The Sponsorship Invitation expired before a decision was recorded.") };
  }
  return { status: "OK" as const, invitation };
}

export async function acceptSponsorshipInvitation(
  transaction: Database,
  student: StudentActor,
  input: { invitationId: string },
  correlationId: string,
  now: Date,
) {
  const located = await lockedPendingInvitation(transaction, student, "sponsorship-invitation.accepted", input.invitationId, correlationId, now);
  if (located.status === "CONFLICT") return located.conflict;
  const invitation = located.invitation;

  const existingSponsorship = await transaction.selectFrom("sponsorships")
    .select("id")
    .where("student_user_id", "=", student.id)
    .forUpdate()
    .executeTakeFirst();
  if (existingSponsorship) {
    return auditedResponseConflict(transaction, student, "sponsorship-invitation.accepted", invitation.id, correlationId, "SPONSORSHIP_ALREADY_ACTIVE", "The Student already has a Sponsorship.");
  }

  const nextAnniversaryAt = monthlySubscriptionAnniversary(now, 1);
  const sponsorship = await transaction.insertInto("sponsorships").values({
    organization_id: invitation.organization_id,
    student_user_id: student.id,
    invitation_id: invitation.id,
    accepted_at: now,
    grant_count: 0,
    next_anniversary_at: nextAnniversaryAt,
  }).returning("id").executeTakeFirstOrThrow();

  await transaction.insertInto("class_credit_accounts").values({ student_user_id: student.id })
    .onConflict((conflict) => conflict.column("student_user_id").doNothing()).execute();
  const account = await transaction.selectFrom("class_credit_accounts").select("available_balance")
    .where("student_user_id", "=", student.id).forUpdate().executeTakeFirstOrThrow();
  const availableBalance = account.available_balance + 8;
  await transaction.insertInto("class_credit_ledger_entries").values({
    student_user_id: student.id,
    amount: 8,
    source: "ORGANIZATION_CREDIT_GRANT",
    source_reference: sponsorshipPeriodReference(sponsorship.id, now),
    reason: null,
  }).execute();
  await transaction.updateTable("class_credit_accounts")
    .set({ available_balance: availableBalance, updated_at: now })
    .where("student_user_id", "=", student.id)
    .executeTakeFirstOrThrow();

  await transaction.updateTable("sponsorship_invitations")
    .set({ state: "ACCEPTED", decided_at: now })
    .where("id", "=", invitation.id)
    .executeTakeFirstOrThrow();

  const [organization, studentRow] = await Promise.all([
    transaction.selectFrom("organizations").select("name").where("id", "=", invitation.organization_id).executeTakeFirstOrThrow(),
    transaction.selectFrom("users").select("display_name").where("id", "=", student.id).executeTakeFirstOrThrow(),
  ]);

  await notifySponsorshipUser(transaction, {
    recipientUserId: student.id,
    messageId: "sponsorship-invitation.accepted.student",
    organizationName: organization.name,
    amount: 8,
    availableBalance,
    nextAnniversaryAt,
    sourceReference: `sponsorship-invitation.accepted:${invitation.id}`,
  });
  await notifySponsorshipUser(transaction, {
    recipientUserId: invitation.invited_by_user_id,
    messageId: "sponsorship-invitation.accepted.manager",
    studentDisplayName: studentRow.display_name,
    acceptedAt: now,
    sourceReference: `sponsorship-invitation.accepted:${invitation.id}`,
  });
  await transaction.insertInto("audit_entries").values({
    actor_user_id: student.id,
    acting_role: "STUDENT",
    operation: "sponsorship-invitation.accepted",
    target_type: "Sponsorship",
    target_id: sponsorship.id,
    outcome: "SUCCEEDED",
    reason_code: "SPONSORSHIP_INVITATION_ACCEPTED",
    correlation_id: correlationId,
  }).execute();

  return {
    __typename: "AcceptSponsorshipInvitationSuccess" as const,
    sponsorship: (await sponsorshipForStudent(transaction, student.id))!,
    account: await projectClassCreditAccount(transaction, student.id, availableBalance),
  };
}

export async function declineSponsorshipInvitation(
  transaction: Database,
  student: StudentActor,
  input: { invitationId: string },
  correlationId: string,
  now: Date,
) {
  const located = await lockedPendingInvitation(transaction, student, "sponsorship-invitation.declined", input.invitationId, correlationId, now);
  if (located.status === "CONFLICT") return located.conflict;
  const invitation = located.invitation;

  await transaction.updateTable("sponsorship_invitations")
    .set({ state: "DECLINED", decided_at: now })
    .where("id", "=", invitation.id)
    .executeTakeFirstOrThrow();

  const [organization, studentRow] = await Promise.all([
    transaction.selectFrom("organizations").select("name").where("id", "=", invitation.organization_id).executeTakeFirstOrThrow(),
    transaction.selectFrom("users").select(["display_name", "interface_locale"]).where("id", "=", student.id).executeTakeFirstOrThrow(),
  ]);

  await notifySponsorshipUser(transaction, {
    recipientUserId: student.id,
    messageId: "sponsorship-invitation.declined.student",
    sourceReference: `sponsorship-invitation.declined:${invitation.id}`,
  });
  await notifySponsorshipUser(transaction, {
    recipientUserId: invitation.invited_by_user_id,
    messageId: "sponsorship-invitation.declined.manager",
    studentDisplayName: studentRow.display_name,
    sourceReference: `sponsorship-invitation.declined:${invitation.id}`,
  });
  await transaction.insertInto("audit_entries").values({
    actor_user_id: student.id,
    acting_role: "STUDENT",
    operation: "sponsorship-invitation.declined",
    target_type: "SponsorshipInvitation",
    target_id: invitation.id,
    outcome: "SUCCEEDED",
    reason_code: "SPONSORSHIP_INVITATION_DECLINED",
    correlation_id: correlationId,
  }).execute();

  return {
    __typename: "DeclineSponsorshipInvitationSuccess" as const,
    invitation: projectInvitation({
      id: invitation.id,
      organization_id: invitation.organization_id,
      organization_name: organization.name,
      student_user_id: invitation.student_user_id,
      student_display_name: studentRow.display_name,
      state: "DECLINED",
      disclosure_text_version: invitation.disclosure_text_version,
      expires_at: invitation.expires_at,
      created_at: invitation.created_at,
      decided_at: now,
    }, studentRow.interface_locale ?? "en"),
  };
}
