import { randomUUID } from "node:crypto";

import type { TaskList } from "graphile-worker";
import { sql } from "kysely";

import type { Database } from "../database/database.js";
import { monthlySubscriptionAnniversary } from "../subscription/subscription-time.js";
import { expireInvitation, sponsorshipPeriodReference } from "./sponsorship-service.js";
import { notifySponsorshipUser } from "./sponsorship-notifications.js";

export function sponsorshipTasks(
  db: Database,
  options: { now?: () => Date; correlationId?: () => string } = {},
): TaskList {
  return {
    expire_sponsorship_invitations: async () => {
      await expireDueSponsorshipInvitations(
        db,
        options.now?.() ?? new Date(),
        options.correlationId?.() ?? `sponsorship-invitation-expiry-${randomUUID()}`,
      );
    },
    grant_sponsorship_credits: async () => {
      await grantDueSponsorshipCredits(
        db,
        options.now?.() ?? new Date(),
        options.correlationId?.() ?? `sponsorship-credit-grant-${randomUUID()}`,
      );
    },
  };
}

export async function expireDueSponsorshipInvitations(db: Database, now: Date, correlationId: string) {
  const dueInvitations = await db.selectFrom("sponsorship_invitations")
    .select("id")
    .where("state", "=", "PENDING")
    .where("expires_at", "<=", now)
    .orderBy("expires_at")
    .orderBy("id")
    .execute();
  let processedCount = 0;

  for (const dueInvitation of dueInvitations) {
    try {
      const processed = await db.transaction().execute(async (transaction) => {
        const invitation = await transaction.selectFrom("sponsorship_invitations")
          .selectAll()
          .where("id", "=", dueInvitation.id)
          .where("state", "=", "PENDING")
          .forUpdate()
          .skipLocked()
          .executeTakeFirst();
        if (!invitation || invitation.expires_at.getTime() > now.getTime()) return false;
        await expireInvitation(transaction as Database, invitation, now, correlationId);
        return true;
      });
      if (processed) processedCount += 1;
    } catch (error) {
      await recordSponsorshipWorkerFailure(db, "SPONSORSHIP_INVITATION_WORKER", "sponsorship-invitation.expired", "SponsorshipInvitation", dueInvitation.id, correlationId);
      throw error;
    }
  }

  return processedCount;
}

async function recordSponsorshipWorkerFailure(
  db: Database,
  systemIdentity: "SPONSORSHIP_INVITATION_WORKER" | "SPONSORSHIP_CREDIT_WORKER",
  operation: string,
  targetType: string,
  targetId: string,
  correlationId: string,
) {
  await db.insertInto("audit_entries").values({
    actor_user_id: null,
    system_identity: systemIdentity,
    acting_role: null,
    operation,
    target_type: targetType,
    target_id: targetId,
    outcome: "FAILED",
    reason_code: `${systemIdentity}_FAILED`,
    correlation_id: correlationId,
  }).execute();
}

export async function grantDueSponsorshipCredits(db: Database, now: Date, correlationId: string) {
  const dueSponsorships = await db.selectFrom("sponsorships")
    .select("id")
    .where("next_anniversary_at", "<=", now)
    .where("state", "=", "ACTIVE")
    .orderBy("next_anniversary_at")
    .orderBy("id")
    .execute();
  let processedCount = 0;

  for (const dueSponsorship of dueSponsorships) {
    try {
      const processed = await db.transaction().execute(async (transaction) => {
        const sponsorshipStudent = await transaction.selectFrom("sponsorships").select("student_user_id").where("id", "=", dueSponsorship.id).executeTakeFirst();
        if (!sponsorshipStudent) return false;
        await sql`select pg_advisory_xact_lock(hashtextextended(${sponsorshipStudent.student_user_id}, 28))`.execute(transaction);
        const sponsorship = await transaction.selectFrom("sponsorships")
          .selectAll()
          .where("id", "=", dueSponsorship.id)
          .where("state", "=", "ACTIVE")
          .forUpdate()
          .skipLocked()
          .executeTakeFirst();
        if (!sponsorship || sponsorship.next_anniversary_at.getTime() > now.getTime()) return false;

        const reference = sponsorshipPeriodReference(sponsorship.id, sponsorship.next_anniversary_at);
        const priorGrant = await transaction.selectFrom("class_credit_ledger_entries")
          .select("id")
          .where("source", "=", "ORGANIZATION_CREDIT_GRANT")
          .where("source_reference", "=", reference)
          .executeTakeFirst();
        const nextAnniversaryAt = monthlySubscriptionAnniversary(sponsorship.accepted_at, sponsorship.grant_count + 2);
        if (priorGrant) {
          // A prior attempt committed the grant but was interrupted before advancing
          // the anniversary pointer; catch the pointer up without granting again.
          await transaction.updateTable("sponsorships")
            .set({ grant_count: sponsorship.grant_count + 1, next_anniversary_at: nextAnniversaryAt, updated_at: now })
            .where("id", "=", sponsorship.id)
            .executeTakeFirstOrThrow();
          return false;
        }

        const student = await transaction.selectFrom("users")
          .select("access_status")
          .where("id", "=", sponsorship.student_user_id)
          .forUpdate()
          .executeTakeFirstOrThrow();
        if (student.access_status === "SUSPENDED") {
          await transaction.updateTable("sponsorships")
            .set({ grant_count: sponsorship.grant_count + 1, next_anniversary_at: nextAnniversaryAt, updated_at: now })
            .where("id", "=", sponsorship.id)
            .executeTakeFirstOrThrow();
          await transaction.insertInto("audit_entries").values({
            actor_user_id: null,
            system_identity: "SPONSORSHIP_CREDIT_WORKER",
            acting_role: null,
            operation: "organization-credit.skipped",
            target_type: "Sponsorship",
            target_id: sponsorship.id,
            outcome: "SUCCEEDED",
            reason_code: "ORGANIZATION_CREDIT_SKIPPED_USER_SUSPENDED",
            correlation_id: correlationId,
          }).execute();
          return true;
        }

        await transaction.insertInto("class_credit_accounts").values({ student_user_id: sponsorship.student_user_id })
          .onConflict((conflict) => conflict.column("student_user_id").doNothing()).execute();
        const account = await transaction.selectFrom("class_credit_accounts").select("available_balance")
          .where("student_user_id", "=", sponsorship.student_user_id).forUpdate().executeTakeFirstOrThrow();
        const availableBalance = account.available_balance + 8;
        await transaction.insertInto("class_credit_ledger_entries").values({
          student_user_id: sponsorship.student_user_id,
          amount: 8,
          source: "ORGANIZATION_CREDIT_GRANT",
          source_reference: reference,
          reason: null,
        }).execute();
        await transaction.updateTable("class_credit_accounts")
          .set({ available_balance: availableBalance, updated_at: now })
          .where("student_user_id", "=", sponsorship.student_user_id)
          .executeTakeFirstOrThrow();
        await transaction.updateTable("sponsorships")
          .set({ grant_count: sponsorship.grant_count + 1, next_anniversary_at: nextAnniversaryAt, updated_at: now })
          .where("id", "=", sponsorship.id)
          .executeTakeFirstOrThrow();

        await notifySponsorshipUser(transaction as Database, {
          recipientUserId: sponsorship.student_user_id,
          messageId: "organization-credit.granted.student",
          amount: 8,
          availableBalance,
          nextAnniversaryAt,
          sourceReference: `organization-credit.granted:${reference}`,
        });
        await transaction.insertInto("audit_entries").values({
          actor_user_id: null,
          system_identity: "SPONSORSHIP_CREDIT_WORKER",
          acting_role: null,
          operation: "organization-credit.granted",
          target_type: "Sponsorship",
          target_id: sponsorship.id,
          outcome: "SUCCEEDED",
          reason_code: "ORGANIZATION_CREDIT_GRANTED",
          correlation_id: correlationId,
        }).execute();
        return true;
      });
      if (processed) processedCount += 1;
    } catch (error) {
      await recordSponsorshipWorkerFailure(db, "SPONSORSHIP_CREDIT_WORKER", "organization-credit.granted", "Sponsorship", dueSponsorship.id, correlationId);
      throw error;
    }
  }

  return processedCount;
}
