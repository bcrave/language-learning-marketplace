import { useMutation, useQuery } from "@apollo/client/react";
import { useState } from "react";
import { useIntl } from "react-intl";

import {
  AcceptSponsorshipInvitationDocument,
  DeclineSponsorshipInvitationDocument,
  InviteToSponsorshipDocument,
  OrganizationSponsoredStudentsDocument,
  OrganizationSponsorshipInvitationsDocument,
  StudentSponsorshipDocument,
  StudentSponsorshipInvitationsDocument,
  type StudentSponsorshipInvitationsQuery,
  type StudentSponsorshipQuery,
} from "./generated/graphql.js";

type Sponsorship = NonNullable<StudentSponsorshipQuery["studentSponsorship"]>;
type SponsorshipInvitation = StudentSponsorshipInvitationsQuery["studentSponsorshipInvitations"][number];

const invitationStateMessageIds = {
  PENDING: "sponsorship.invitations.state.PENDING",
  ACCEPTED: "sponsorship.invitations.state.ACCEPTED",
  DECLINED: "sponsorship.invitations.state.DECLINED",
  EXPIRED: "sponsorship.invitations.state.EXPIRED",
} as const;

function SponsorshipSummary({ sponsorship }: { sponsorship: Sponsorship }) {
  const intl = useIntl();
  return (
    <div className="sponsorship-summary">
      <p>{intl.formatMessage({ id: "sponsorship.organization" }, { name: sponsorship.organization.name })}</p>
      <p>{intl.formatMessage({ id: "sponsorship.acceptedAt" }, {
        date: intl.formatDate(sponsorship.acceptedAt, { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }),
      })}</p>
      <p>{intl.formatMessage({ id: "sponsorship.nextAnniversary" }, {
        date: intl.formatDate(sponsorship.nextAnniversaryAt, { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }),
      })}</p>
    </div>
  );
}

function InvitationDisclosure({ invitation }: { invitation: SponsorshipInvitation }) {
  const intl = useIntl();
  return (
    <div className="sponsorship-disclosure">
      <h4>{intl.formatMessage({ id: "sponsorship.invitations.disclosure.title" }, { version: invitation.disclosure.version })}</h4>
      <ul>
        <li>{intl.formatMessage({ id: "sponsorship.invitations.disclosure.benefit" }, { description: invitation.disclosure.benefitDescription })}</li>
        <li>{intl.formatMessage({ id: "sponsorship.invitations.disclosure.visibleData" }, { description: invitation.disclosure.organizationVisibleDataDescription })}</li>
        <li>{intl.formatMessage({ id: "sponsorship.invitations.disclosure.excludedData" }, { description: invitation.disclosure.excludedPrivateDataDescription })}</li>
      </ul>
    </div>
  );
}

export function StudentSponsorshipPanel({
  idempotencyKeyFactory = () => crypto.randomUUID(),
}: {
  idempotencyKeyFactory?: () => string;
}) {
  const intl = useIntl();
  const sponsorshipQuery = useQuery(StudentSponsorshipDocument);
  const invitationsQuery = useQuery(StudentSponsorshipInvitationsDocument);
  const [accept, { loading: accepting }] = useMutation(AcceptSponsorshipInvitationDocument);
  const [decline, { loading: declining }] = useMutation(DeclineSponsorshipInvitationDocument);
  const [sponsorship, setSponsorship] = useState<Sponsorship | null>();
  const [invitations, setInvitations] = useState<SponsorshipInvitation[]>();
  const [announcement, setAnnouncement] = useState<"accepted" | "declined" | null>(null);
  const [failure, setFailure] = useState(false);
  const [pendingAttempt, setPendingAttempt] = useState<{ action: "accept" | "decline"; invitationId: string; key: string } | null>(null);

  const currentSponsorship = sponsorship === undefined ? sponsorshipQuery.data?.studentSponsorship ?? null : sponsorship;
  const currentInvitations = invitations ?? invitationsQuery.data?.studentSponsorshipInvitations ?? [];

  async function respond(action: "accept" | "decline", invitationId: string) {
    setAnnouncement(null);
    setFailure(false);
    const key = pendingAttempt?.action === action && pendingAttempt.invitationId === invitationId
      ? pendingAttempt.key
      : idempotencyKeyFactory();
    setPendingAttempt({ action, invitationId, key });
    try {
      if (action === "accept") {
        const result = await accept({ variables: { input: { idempotencyKey: key, invitationId } } });
        const outcome = result.data?.acceptSponsorshipInvitation;
        if (outcome && "sponsorship" in outcome) {
          setSponsorship(outcome.sponsorship);
          setInvitations(currentInvitations.map((invitation) => invitation.id === invitationId ? { ...invitation, state: "ACCEPTED" } : invitation));
          setAnnouncement("accepted");
          setPendingAttempt(null);
          return;
        }
      } else {
        const result = await decline({ variables: { input: { idempotencyKey: key, invitationId } } });
        const outcome = result.data?.declineSponsorshipInvitation;
        if (outcome && "invitation" in outcome) {
          setInvitations(currentInvitations.map((invitation) => invitation.id === invitationId ? outcome.invitation : invitation));
          setAnnouncement("declined");
          setPendingAttempt(null);
          return;
        }
      }
      setPendingAttempt(null);
      setFailure(true);
    } catch {
      setFailure(true);
    }
  }

  if (sponsorshipQuery.loading || invitationsQuery.loading) return <p role="status">{intl.formatMessage({ id: "sponsorship.loading" })}</p>;
  if (sponsorshipQuery.error || invitationsQuery.error) return <p role="alert">{intl.formatMessage({ id: "sponsorship.loadError" })}</p>;

  return (
    <section className="workspace-card" aria-labelledby="student-sponsorship-title">
      <h2 id="student-sponsorship-title">{intl.formatMessage({ id: "sponsorship.studentTitle" })}</h2>
      {currentSponsorship ? <SponsorshipSummary sponsorship={currentSponsorship} /> : <p>{intl.formatMessage({ id: "sponsorship.none" })}</p>}
      <h3>{intl.formatMessage({ id: "sponsorship.invitations.title" })}</h3>
      {currentInvitations.length === 0 ? (
        <p>{intl.formatMessage({ id: "sponsorship.invitations.empty" })}</p>
      ) : (
        <ul className="sponsorship-invitation-list">
          {currentInvitations.map((invitation) => (
            <li key={invitation.id}>
              <p>{intl.formatMessage({ id: "sponsorship.organization" }, { name: invitation.organization.name })}</p>
              <p><strong>{intl.formatMessage({ id: invitationStateMessageIds[invitation.state] })}</strong></p>
              {invitation.state === "PENDING" && <>
                <p>{intl.formatMessage({ id: "sponsorship.invitations.expiresAt" }, {
                  date: intl.formatDate(invitation.expiresAt, { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }),
                })}</p>
                <InvitationDisclosure invitation={invitation} />
                <button disabled={accepting || declining} type="button" onClick={() => void respond("accept", invitation.id)}>
                  {intl.formatMessage({ id: "sponsorship.invitations.accept" })}
                </button>
                <button disabled={accepting || declining} type="button" onClick={() => void respond("decline", invitation.id)}>
                  {intl.formatMessage({ id: "sponsorship.invitations.decline" })}
                </button>
              </>}
              {invitation.decidedAt && <p>{intl.formatMessage({ id: "sponsorship.invitations.decidedAt" }, {
                date: intl.formatDate(invitation.decidedAt, { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }),
              })}</p>}
            </li>
          ))}
        </ul>
      )}
      {announcement && <p role="status">{intl.formatMessage({ id: announcement === "accepted" ? "sponsorship.invitations.accepted" : "sponsorship.invitations.declined" })}</p>}
      {failure && <p role="alert">{intl.formatMessage({ id: "sponsorship.invitations.responseError" })}</p>}
    </section>
  );
}

const inviteErrorMessageIds: Record<string, string> = {
  STUDENT_NOT_FOUND: "sponsorship.invite.notFound",
  STUDENT_ALREADY_SPONSORED: "sponsorship.invite.alreadySponsored",
  INVITATION_ALREADY_PENDING: "sponsorship.invite.alreadyPending",
};

export function OrganizationSponsorshipPanel({
  idempotencyKeyFactory = () => crypto.randomUUID(),
}: {
  idempotencyKeyFactory?: () => string;
}) {
  const intl = useIntl();
  const invitationsQuery = useQuery(OrganizationSponsorshipInvitationsDocument);
  const sponsoredStudentsQuery = useQuery(OrganizationSponsoredStudentsDocument);
  const [invite, { loading: inviting }] = useMutation(InviteToSponsorshipDocument);
  const [studentUserId, setStudentUserId] = useState("");
  const [invitations, setInvitations] = useState<SponsorshipInvitation[]>();
  const [succeeded, setSucceeded] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pendingAttempt, setPendingAttempt] = useState<{ fingerprint: string; key: string } | null>(null);

  const currentInvitations = invitations ?? invitationsQuery.data?.organizationSponsorshipInvitations ?? [];
  const sponsoredStudents = sponsoredStudentsQuery.data?.organizationSponsoredStudents ?? [];

  async function submitInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSucceeded(false);
    setFailure(null);
    const fingerprint = JSON.stringify({ studentUserId });
    const idempotencyKey = pendingAttempt?.fingerprint === fingerprint ? pendingAttempt.key : idempotencyKeyFactory();
    setPendingAttempt({ fingerprint, key: idempotencyKey });
    try {
      const result = await invite({ variables: { input: { idempotencyKey, studentUserId } } });
      const outcome = result.data?.inviteToSponsorship;
      if (outcome && "invitation" in outcome) {
        setInvitations([outcome.invitation, ...currentInvitations]);
        setSucceeded(true);
        setPendingAttempt(null);
        setStudentUserId("");
        return;
      }
      setPendingAttempt(null);
      setFailure(outcome && "code" in outcome ? outcome.code : "UNEXPECTED");
    } catch {
      setFailure("UNEXPECTED");
    }
  }

  return (
    <>
      <section className="workspace-card admin-forms" aria-labelledby="organization-invite-title">
        <h2 id="organization-invite-title">{intl.formatMessage({ id: "sponsorship.invite.title" })}</h2>
        <form onSubmit={(event) => void submitInvite(event)}>
          <label htmlFor="sponsorship-student-user-id">{intl.formatMessage({ id: "sponsorship.invite.studentUserId" })}</label>
          <input id="sponsorship-student-user-id" required value={studentUserId} onChange={(event) => setStudentUserId(event.target.value)} />
          <button disabled={inviting} type="submit">{intl.formatMessage({ id: "sponsorship.invite.submit" })}</button>
        </form>
        {succeeded && <p role="status">{intl.formatMessage({ id: "sponsorship.invite.sent" })}</p>}
        {failure && <p role="alert">{intl.formatMessage({ id: inviteErrorMessageIds[failure] ?? "sponsorship.invite.error" })}</p>}
      </section>
      <section className="workspace-card" aria-labelledby="organization-sent-invitations-title">
        <h2 id="organization-sent-invitations-title">{intl.formatMessage({ id: "sponsorship.sentInvitations.title" })}</h2>
        {currentInvitations.length === 0 ? (
          <p>{intl.formatMessage({ id: "sponsorship.sentInvitations.empty" })}</p>
        ) : (
          <ul className="sponsorship-invitation-list">
            {currentInvitations.map((invitation) => (
              <li key={invitation.id}>
                <p>{intl.formatMessage({ id: "sponsorship.student" }, { name: invitation.studentDisplayName })}</p>
                <p><strong>{intl.formatMessage({ id: invitationStateMessageIds[invitation.state] })}</strong></p>
                <p>{intl.formatMessage({ id: "sponsorship.invitations.expiresAt" }, {
                  date: intl.formatDate(invitation.expiresAt, { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }),
                })}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="workspace-card" aria-labelledby="organization-sponsored-students-title">
        <h2 id="organization-sponsored-students-title">{intl.formatMessage({ id: "sponsorship.sponsoredStudents.title" })}</h2>
        {sponsoredStudents.length === 0 ? (
          <p>{intl.formatMessage({ id: "sponsorship.sponsoredStudents.empty" })}</p>
        ) : (
          <ul className="sponsorship-list">
            {sponsoredStudents.map((sponsorship) => (
              <li key={sponsorship.id}>
                <p>{intl.formatMessage({ id: "sponsorship.student" }, { name: sponsorship.studentDisplayName })}</p>
                <p>{intl.formatMessage({ id: "sponsorship.acceptedAt" }, {
                  date: intl.formatDate(sponsorship.acceptedAt, { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }),
                })}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
