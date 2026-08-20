import { randomUUID } from "node:crypto";

import {
  clonePostgreSqlTemplate,
  startPostgreSqlTemplate,
  type StartedPostgreSqlContainer,
} from "@marketplace/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApi } from "../src/api/app.js";
import { createDatabase, type Database } from "../src/database/database.js";
import { migrateDatabase } from "../src/database/migrate.js";
import { DEMO_LIMITED_STUDENT_ID, DEMO_STUDENT_ID, seedDemoOrganizations, seedDemoSponsorship, seedDemoStudents } from "../src/database/seed.js";
import { expireDueSponsorshipInvitations, grantDueSponsorshipCredits } from "../src/sponsorship/sponsorship-worker.js";

describe("Sponsorship Invitation GraphQL API", () => {
  let api: ReturnType<typeof createApi>;
  let db: Database;
  let postgres: StartedPostgreSqlContainer;
  const organizationManagerId = randomUUID();
  const organizationManagerSubject = randomUUID();
  const secondOrganizationManagerId = randomUUID();
  const secondOrganizationManagerSubject = randomUUID();
  const studentId = randomUUID();
  const studentSubject = randomUUID();
  const otherStudentId = randomUUID();
  const otherStudentSubject = randomUUID();
  const organizationId = randomUUID();
  const secondOrganizationId = randomUUID();

  beforeAll(async () => {
    postgres = await startPostgreSqlTemplate();
    const templateDb = createDatabase(postgres.getConnectionUri());
    await migrateDatabase(templateDb);
    await templateDb.destroy();
    const databaseUrl = await clonePostgreSqlTemplate(
      postgres,
      `sponsorship_${randomUUID().replaceAll("-", "")}`,
    );
    db = createDatabase(databaseUrl);
    api = createApi({ db, authMode: "fake", nodeEnv: "test" });
    await db.insertInto("users").values([
      { id: organizationManagerId, identity_issuer: "https://fake.local/", identity_subject: organizationManagerSubject, display_name: "Morgan Manager", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: secondOrganizationManagerId, identity_issuer: "https://fake.local/", identity_subject: secondOrganizationManagerSubject, display_name: "Riley Second", interface_locale: "en", display_time_zone: "America/Denver" },
      { id: studentId, identity_issuer: "https://fake.local/", identity_subject: studentSubject, display_name: "Sofía Rivera", interface_locale: "es", display_time_zone: "America/Denver" },
      { id: otherStudentId, identity_issuer: "https://fake.local/", identity_subject: otherStudentSubject, display_name: "Other Student", interface_locale: "en", display_time_zone: "America/Denver" },
    ]).execute();
    await db.insertInto("role_assignments").values([
      { user_id: organizationManagerId, role: "ORGANIZATION_MANAGER" },
      { user_id: secondOrganizationManagerId, role: "ORGANIZATION_MANAGER" },
      { user_id: studentId, role: "STUDENT" },
      { user_id: otherStudentId, role: "STUDENT" },
    ]).execute();
    await db.insertInto("organizations").values([
      { id: organizationId, name: "Nimbus Logistics" },
      { id: secondOrganizationId, name: "Riverside Health" },
    ]).execute();
    await db.insertInto("organization_managers").values([
      { user_id: organizationManagerId, organization_id: organizationId },
      { user_id: secondOrganizationManagerId, organization_id: secondOrganizationId },
    ]).execute();
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it("invites, discloses, and lets a Student accept into a Sponsorship with an initial credit grant", async () => {
    const invited = await inviteStudent(studentId);
    const invitation = (invited.data?.inviteToSponsorship as { invitation: { id: string; expiresAt: string; disclosure: { version: string; benefitDescription: string } } }).invitation;

    expect(invitation).toMatchObject({
      organization: { id: organizationId, name: "Nimbus Logistics" },
      studentUserId: studentId,
      state: "PENDING",
      disclosure: { version: "1" },
    });
    expect(invitation.disclosure.benefitDescription).toMatch(/eight/i);
    expect(new Date(invitation.expiresAt).getTime() - Date.now()).toBeGreaterThan(13 * 24 * 60 * 60_000);

    const seenByStudent = await graphql(`
      query { studentSponsorshipInvitations { id state studentDisplayName organization { name } } }
    `, undefined, studentSubject);
    expect(seenByStudent).toEqual({ data: { studentSponsorshipInvitations: [
      { id: invitation.id, state: "PENDING", studentDisplayName: "Sofía Rivera", organization: { name: "Nimbus Logistics" } },
    ] } });

    const accepted = await acceptInvitation(invitation.id);
    expect(accepted).toMatchObject({ data: { acceptSponsorshipInvitation: {
      sponsorship: { organization: { id: organizationId, name: "Nimbus Logistics" }, studentUserId: studentId },
      account: { availableBalance: 8 },
    } } });

    const account = await graphql(`query { studentClassCredits { availableBalance ledger { amount source sourceReference } } }`, undefined, studentSubject);
    expect(account).toEqual({ data: { studentClassCredits: {
      availableBalance: 8,
      ledger: [{ amount: 8, source: "ORGANIZATION_CREDIT_GRANT", sourceReference: expect.stringContaining(`sponsorship:${(accepted.data!.acceptSponsorshipInvitation as { sponsorship: { id: string } }).sponsorship.id}`) }],
    } } });

    const notifications = await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", studentId).execute();
    expect(notifications.map((n) => n.message_id)).toEqual(expect.arrayContaining(["sponsorship-invitation.created.student", "sponsorship-invitation.accepted.student"]));
    const managerNotifications = await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", organizationManagerId).execute();
    expect(managerNotifications.map((n) => n.message_id)).toEqual(expect.arrayContaining(["sponsorship-invitation.created.manager", "sponsorship-invitation.accepted.manager"]));

    const secondInviteAttempt = await inviteStudent(studentId);
    expect(secondInviteAttempt).toEqual({ data: { inviteToSponsorship: { code: "STUDENT_ALREADY_SPONSORED" } } });

    const sponsoredList = await graphql(`query { organizationSponsoredStudents { studentUserId studentDisplayName organization { name } } }`, undefined, organizationManagerSubject);
    expect(sponsoredList).toEqual({ data: { organizationSponsoredStudents: [{ studentUserId: studentId, studentDisplayName: "Sofía Rivera", organization: { name: "Nimbus Logistics" } }] } });
  });

  it("lets a Student decline and prevents a second decision on the same invitation", async () => {
    const invited = await inviteStudent(otherStudentId);
    const invitation = (invited.data?.inviteToSponsorship as { invitation: { id: string } }).invitation;

    const declined = await declineInvitation(invitation.id, otherStudentSubject);
    expect(declined).toMatchObject({ data: { declineSponsorshipInvitation: { invitation: { id: invitation.id, state: "DECLINED" } } } });

    const secondDecision = await acceptInvitation(invitation.id, otherStudentSubject);
    expect(secondDecision).toEqual({ data: { acceptSponsorshipInvitation: { code: "INVITATION_NOT_PENDING" } } });

    const sponsorship = await graphql(`query { studentSponsorship { id } }`, undefined, otherStudentSubject);
    expect(sponsorship).toEqual({ data: { studentSponsorship: null } });
  });

  it("expires a Pending Sponsorship Invitation and blocks a late acceptance", async () => {
    const thirdStudentId = randomUUID();
    const thirdStudentSubject = randomUUID();
    await db.insertInto("users").values({ id: thirdStudentId, identity_issuer: "https://fake.local/", identity_subject: thirdStudentSubject, display_name: "Late Decider", interface_locale: "en", display_time_zone: "America/Denver" }).execute();
    await db.insertInto("role_assignments").values({ user_id: thirdStudentId, role: "STUDENT" }).execute();

    const invited = await inviteStudent(thirdStudentId);
    const invitation = (invited.data?.inviteToSponsorship as { invitation: { id: string } }).invitation;
    await db.updateTable("sponsorship_invitations").set({ expires_at: new Date(Date.now() - 60_000) }).where("id", "=", invitation.id).execute();

    const processedCount = await expireDueSponsorshipInvitations(db, new Date(), randomUUID());
    expect(processedCount).toBe(1);

    const state = await db.selectFrom("sponsorship_invitations").select("state").where("id", "=", invitation.id).executeTakeFirstOrThrow();
    expect(state).toEqual({ state: "EXPIRED" });

    const lateAccept = await acceptInvitation(invitation.id, thirdStudentSubject);
    expect(lateAccept).toEqual({ data: { acceptSponsorshipInvitation: { code: "INVITATION_NOT_PENDING" } } });

    const notifications = await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", thirdStudentId).execute();
    expect(notifications.map((n) => n.message_id)).toEqual(expect.arrayContaining(["sponsorship-invitation.expired.student"]));
  });

  it("grants eight Class Credits on each due monthly anniversary without duplicating a grant", async () => {
    const fourthStudentId = randomUUID();
    const fourthStudentSubject = randomUUID();
    await db.insertInto("users").values({ id: fourthStudentId, identity_issuer: "https://fake.local/", identity_subject: fourthStudentSubject, display_name: "Monthly Grantee", interface_locale: "en", display_time_zone: "America/Denver" }).execute();
    await db.insertInto("role_assignments").values({ user_id: fourthStudentId, role: "STUDENT" }).execute();

    const invited = await inviteStudent(fourthStudentId);
    const invitation = (invited.data?.inviteToSponsorship as { invitation: { id: string } }).invitation;
    const accepted = await acceptInvitation(invitation.id, fourthStudentSubject);
    const sponsorshipId = (accepted.data!.acceptSponsorshipInvitation as { sponsorship: { id: string } }).sponsorship.id;

    const dueInstant = new Date();
    await db.updateTable("sponsorships").set({ next_anniversary_at: dueInstant }).where("id", "=", sponsorshipId).execute();

    const firstRun = await grantDueSponsorshipCredits(db, new Date(), randomUUID());
    const secondRunSameInstant = await grantDueSponsorshipCredits(db, new Date(), randomUUID());
    expect(firstRun).toBe(1);
    expect(secondRunSameInstant).toBe(0);

    const account = await graphql(`query { studentClassCredits { availableBalance ledger { amount source } } }`, undefined, fourthStudentSubject);
    expect(account).toMatchObject({ data: { studentClassCredits: {
      availableBalance: 16,
      ledger: expect.arrayContaining([
        { amount: 8, source: "ORGANIZATION_CREDIT_GRANT" },
        { amount: 8, source: "ORGANIZATION_CREDIT_GRANT" },
      ]),
    } } });
    const sponsorshipRow = await db.selectFrom("sponsorships").select(["grant_count", "next_anniversary_at"]).where("id", "=", sponsorshipId).executeTakeFirstOrThrow();
    expect(sponsorshipRow.grant_count).toBe(1);
    expect(sponsorshipRow.next_anniversary_at.getTime()).toBeGreaterThan(dueInstant.getTime() + 27 * 24 * 60 * 60_000);

    const notifications = await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", fourthStudentId).execute();
    expect(notifications.map((n) => n.message_id)).toEqual(expect.arrayContaining(["organization-credit.granted.student"]));
    const managerNotifications = await db.selectFrom("in_app_notifications").select("message_id").where("recipient_user_id", "=", organizationManagerId).where("message_id", "=", "organization-credit.granted.manager").execute();
    expect(managerNotifications).toHaveLength(0);
  });

  it("skips a suspended Student's due Organization Credit Benefit without backfill", async () => {
    const suspendedStudentId = randomUUID();
    const suspendedStudentSubject = randomUUID();
    await db.insertInto("users").values({ id: suspendedStudentId, identity_issuer: "https://fake.local/", identity_subject: suspendedStudentSubject, display_name: "Suspended Student", interface_locale: "en", display_time_zone: "America/Denver" }).execute();
    await db.insertInto("role_assignments").values({ user_id: suspendedStudentId, role: "STUDENT" }).execute();
    const invited = await inviteStudent(suspendedStudentId);
    const invitationId = (invited.data?.inviteToSponsorship as { invitation: { id: string } }).invitation.id;
    const accepted = await acceptInvitation(invitationId, suspendedStudentSubject);
    const sponsorshipId = (accepted.data!.acceptSponsorshipInvitation as { sponsorship: { id: string } }).sponsorship.id;
    const firstDue = new Date("2026-09-19T18:00:00.000Z");
    await db.updateTable("sponsorships").set({ next_anniversary_at: firstDue }).where("id", "=", sponsorshipId).execute();
    await db.updateTable("users").set({ access_status: "SUSPENDED", suspension_reason: "Security review", suspended_at: new Date("2026-09-18T18:00:00.000Z"), suspended_by_user_id: organizationManagerId }).where("id", "=", suspendedStudentId).execute();

    expect(await grantDueSponsorshipCredits(db, firstDue, "skip-suspended-grant")).toBe(1);
    expect(await db.selectFrom("class_credit_accounts").select("available_balance").where("student_user_id", "=", suspendedStudentId).executeTakeFirstOrThrow()).toEqual({ available_balance: 8 });
    const afterSkip = await db.selectFrom("sponsorships").select(["grant_count", "next_anniversary_at"]).where("id", "=", sponsorshipId).executeTakeFirstOrThrow();
    expect(afterSkip.grant_count).toBe(1);
    expect(afterSkip.next_anniversary_at.getTime()).toBeGreaterThan(firstDue.getTime());
    expect(await db.selectFrom("audit_entries").select(["outcome", "reason_code"]).where("correlation_id", "=", "skip-suspended-grant").executeTakeFirstOrThrow()).toEqual({ outcome: "SUCCEEDED", reason_code: "ORGANIZATION_CREDIT_SKIPPED_USER_SUSPENDED" });

    await db.updateTable("users").set({ access_status: "ACTIVE", suspension_reason: null, suspended_at: null, suspended_by_user_id: null }).where("id", "=", suspendedStudentId).execute();
    expect(await grantDueSponsorshipCredits(db, afterSkip.next_anniversary_at, "grant-after-reactivation")).toBeGreaterThanOrEqual(1);
    expect(await db.selectFrom("class_credit_accounts").select("available_balance").where("student_user_id", "=", suspendedStudentId).executeTakeFirstOrThrow()).toEqual({ available_balance: 16 });
  });

  it("authorizes Organization Manager and Student operations and records privacy-safe Audit Entries", async () => {
    const deniedInviteCorrelation = randomUUID();
    const deniedInvite = await inviteStudent(studentId, studentSubject, deniedInviteCorrelation);
    const deniedResponseCorrelation = randomUUID();
    const deniedResponse = await declineInvitation(randomUUID(), organizationManagerSubject, deniedResponseCorrelation);

    expect(deniedInvite.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
    expect(deniedResponse.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
    expect(await db.selectFrom("audit_entries").select(["operation", "outcome", "reason_code"]).where("correlation_id", "in", [deniedInviteCorrelation, deniedResponseCorrelation]).orderBy("correlation_id").execute()).toEqual(expect.arrayContaining([
      { operation: "sponsorship-invitation.created", outcome: "DENIED", reason_code: "ORGANIZATION_MANAGER_ROLE_REQUIRED" },
      { operation: "sponsorship-invitation.declined", outcome: "DENIED", reason_code: "STUDENT_ROLE_REQUIRED" },
    ]));
  });

  it("does not let a second Organization see another Organization's invitations or Students", async () => {
    const invisibleToSecond = await graphql(`query { organizationSponsorshipInvitations { id } organizationSponsoredStudents { studentUserId } }`, undefined, secondOrganizationManagerSubject);
    expect((invisibleToSecond.data!.organizationSponsorshipInvitations as unknown[]).length).toBe(0);
    expect((invisibleToSecond.data!.organizationSponsoredStudents as unknown[]).length).toBe(0);
  });

  it("seeds a canonical Organization Manager with a pending Sponsorship Invitation to the shared limited Student", async () => {
    await seedDemoStudents(db);
    await seedDemoOrganizations(db);
    await seedDemoSponsorship(db);
    await seedDemoSponsorship(db);

    const invitation = await db.selectFrom("sponsorship_invitations")
      .select(["state", "student_user_id", "invited_by_user_id"])
      .where("student_user_id", "=", DEMO_LIMITED_STUDENT_ID)
      .executeTakeFirstOrThrow();
    expect(invitation).toEqual({ state: "PENDING", student_user_id: DEMO_LIMITED_STUDENT_ID, invited_by_user_id: DEMO_STUDENT_ID });
    const manager = await db.selectFrom("organization_managers").select("organization_id").where("user_id", "=", DEMO_STUDENT_ID).executeTakeFirstOrThrow();
    expect(manager.organization_id).toBeTruthy();
  });

  async function inviteStudent(targetStudentId: string, subject = organizationManagerSubject, correlationId = randomUUID()) {
    return graphql(`
      mutation Invite($input: InviteToSponsorshipInput!) {
        inviteToSponsorship(input: $input) {
          ... on InviteToSponsorshipSuccess { invitation { id organization { id name } studentUserId state disclosure { version benefitDescription } expiresAt } }
          ... on SponsorshipInvitationError { code }
        }
      }
    `, { input: { idempotencyKey: randomUUID(), studentUserId: targetStudentId } }, subject, correlationId);
  }

  async function acceptInvitation(
    invitationId: string,
    subject = studentSubject,
    correlationId = randomUUID(),
    idempotencyKey = randomUUID(),
  ) {
    return graphql(`
      mutation Accept($input: SponsorshipInvitationResponseInput!) {
        acceptSponsorshipInvitation(input: $input) {
          ... on AcceptSponsorshipInvitationSuccess { sponsorship { id organization { id name } studentUserId acceptedAt nextAnniversaryAt } account { availableBalance } }
          ... on SponsorshipInvitationResponseError { code }
        }
      }
    `, { input: { idempotencyKey, invitationId } }, subject, correlationId);
  }

  async function declineInvitation(
    invitationId: string,
    subject = studentSubject,
    correlationId = randomUUID(),
    idempotencyKey = randomUUID(),
  ) {
    return graphql(`
      mutation Decline($input: SponsorshipInvitationResponseInput!) {
        declineSponsorshipInvitation(input: $input) {
          ... on DeclineSponsorshipInvitationSuccess { invitation { id state } }
          ... on SponsorshipInvitationResponseError { code }
        }
      }
    `, { input: { idempotencyKey, invitationId } }, subject, correlationId);
  }

  async function graphql(
    query: string,
    variables?: Record<string, unknown>,
    subject = organizationManagerSubject,
    correlationId = randomUUID(),
  ) {
    const response = await api.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
        "x-demo-user-id": subject,
      },
      body: JSON.stringify({ query, variables }),
    });
    return await response.json() as {
      data?: Record<string, unknown>;
      errors?: Array<{ extensions: { code: string } }>;
    };
  }
});
