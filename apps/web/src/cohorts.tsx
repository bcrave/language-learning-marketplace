import { useMutation, useQuery } from "@apollo/client/react";
import { useState } from "react";
import { useIntl } from "react-intl";

import {
  AddCohortMembershipDocument,
  CohortDetailsFragmentDoc,
  CreateCohortDocument,
  EndCohortMembershipDocument,
  OrganizationCohortsDocument,
  OrganizationSponsoredStudentsDocument,
  type CohortDetailsFragment,
} from "./generated/graphql.js";
import { useFragment as readFragment } from "./generated/fragment-masking.js";

const cohortErrorMessageIds: Record<string, string> = {
  COHORT_NAME_TAKEN: "cohorts.error.COHORT_NAME_TAKEN",
  COHORT_NOT_FOUND: "cohorts.error.COHORT_NOT_FOUND",
  SPONSORSHIP_NOT_ACTIVE: "cohorts.error.SPONSORSHIP_NOT_ACTIVE",
  MEMBERSHIP_WINDOW_OVERLAPS: "cohorts.error.MEMBERSHIP_WINDOW_OVERLAPS",
  MEMBERSHIP_NOT_PROSPECTIVE: "cohorts.error.MEMBERSHIP_NOT_PROSPECTIVE",
};

type Announcement = "created" | "added" | "ended";

export function OrganizationCohortsPanel({
  idempotencyKeyFactory = () => crypto.randomUUID(),
}: {
  idempotencyKeyFactory?: () => string;
}) {
  const intl = useIntl();
  const cohortsQuery = useQuery(OrganizationCohortsDocument);
  const sponsoredStudentsQuery = useQuery(OrganizationSponsoredStudentsDocument);
  const [createCohort, { loading: creating }] = useMutation(CreateCohortDocument);
  const [addMembership, { loading: adding }] = useMutation(AddCohortMembershipDocument);
  const [endMembership, { loading: ending }] = useMutation(EndCohortMembershipDocument);
  const [name, setName] = useState("");
  const [membershipCohortId, setMembershipCohortId] = useState("");
  const [membershipSponsorshipId, setMembershipSponsorshipId] = useState("");
  const [changedCohorts, setChangedCohorts] = useState<Map<string, CohortDetailsFragment>>(new Map());
  const [createdCohorts, setCreatedCohorts] = useState<CohortDetailsFragment[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pendingAttempt, setPendingAttempt] = useState<{ fingerprint: string; key: string } | null>(null);

  const loadedCohorts = readFragment(CohortDetailsFragmentDoc, cohortsQuery.data?.organizationCohorts ?? []);
  const cohorts = [...loadedCohorts, ...createdCohorts]
    .map((cohort) => changedCohorts.get(cohort.id) ?? cohort)
    .sort((first, second) => first.name.localeCompare(second.name));
  const activeSponsorships = (sponsoredStudentsQuery.data?.organizationSponsoredStudents ?? [])
    .filter((sponsorship) => sponsorship.state === "ACTIVE");

  function idempotencyKeyFor(fingerprint: string) {
    const key = pendingAttempt?.fingerprint === fingerprint ? pendingAttempt.key : idempotencyKeyFactory();
    setPendingAttempt({ fingerprint, key });
    return key;
  }

  function recordCohort(cohort: CohortDetailsFragment, isNew: boolean) {
    if (isNew) setCreatedCohorts((current) => [...current, cohort]);
    else setChangedCohorts((current) => new Map(current).set(cohort.id, cohort));
  }

  async function submitCohort(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAnnouncement(null);
    setFailure(null);
    const fingerprint = JSON.stringify({ createCohort: name });
    try {
      const result = await createCohort({ variables: { input: { idempotencyKey: idempotencyKeyFor(fingerprint), name } } });
      const outcome = result.data?.createCohort;
      if (outcome && "cohort" in outcome) {
        recordCohort(readFragment(CohortDetailsFragmentDoc, outcome.cohort), true);
        setAnnouncement("created");
        setPendingAttempt(null);
        setName("");
        return;
      }
      setPendingAttempt(null);
      setFailure(outcome && "code" in outcome ? outcome.code : "UNEXPECTED");
    } catch {
      setFailure("UNEXPECTED");
    }
  }

  async function submitMembership(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAnnouncement(null);
    setFailure(null);
    const fingerprint = JSON.stringify({ addMembership: membershipCohortId, membershipSponsorshipId });
    try {
      const result = await addMembership({ variables: { input: {
        idempotencyKey: idempotencyKeyFor(fingerprint),
        cohortId: membershipCohortId,
        sponsorshipId: membershipSponsorshipId,
      } } });
      const outcome = result.data?.addCohortMembership;
      if (outcome && "cohort" in outcome) {
        recordCohort(readFragment(CohortDetailsFragmentDoc, outcome.cohort), false);
        setAnnouncement("added");
        setPendingAttempt(null);
        return;
      }
      setPendingAttempt(null);
      setFailure(outcome && "code" in outcome ? outcome.code : "UNEXPECTED");
    } catch {
      setFailure("UNEXPECTED");
    }
  }

  async function endCohortMembership(cohortMembershipId: string) {
    setAnnouncement(null);
    setFailure(null);
    const fingerprint = JSON.stringify({ endMembership: cohortMembershipId });
    try {
      const result = await endMembership({ variables: { input: { idempotencyKey: idempotencyKeyFor(fingerprint), cohortMembershipId } } });
      const outcome = result.data?.endCohortMembership;
      if (outcome && "cohort" in outcome) {
        recordCohort(readFragment(CohortDetailsFragmentDoc, outcome.cohort), false);
        setAnnouncement("ended");
        setPendingAttempt(null);
        return;
      }
      setPendingAttempt(null);
      setFailure(outcome && "code" in outcome ? outcome.code : "UNEXPECTED");
    } catch {
      setFailure("UNEXPECTED");
    }
  }

  if (cohortsQuery.loading || sponsoredStudentsQuery.loading) {
    return <p role="status">{intl.formatMessage({ id: "cohorts.loading" })}</p>;
  }
  if (cohortsQuery.error || sponsoredStudentsQuery.error) {
    return <p role="alert">{intl.formatMessage({ id: "cohorts.loadError" })}</p>;
  }

  return (
    <>
      <section className="workspace-card admin-forms" aria-labelledby="cohorts-create-title">
        <h2 id="cohorts-create-title">{intl.formatMessage({ id: "cohorts.create.title" })}</h2>
        <p>{intl.formatMessage({ id: "cohorts.notice" })}</p>
        <form onSubmit={(event) => void submitCohort(event)}>
          <label htmlFor="cohort-name">{intl.formatMessage({ id: "cohorts.create.name" })}</label>
          <input id="cohort-name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
          <button disabled={creating} type="submit">{intl.formatMessage({ id: "cohorts.create.submit" })}</button>
        </form>
        {cohorts.length > 0 && activeSponsorships.length > 0 && (
          <form onSubmit={(event) => void submitMembership(event)}>
            <h3>{intl.formatMessage({ id: "cohorts.memberships.add.title" })}</h3>
            <label htmlFor="cohort-membership-cohort">{intl.formatMessage({ id: "cohorts.memberships.add.cohort" })}</label>
            <select
              id="cohort-membership-cohort"
              required
              value={membershipCohortId}
              onChange={(event) => setMembershipCohortId(event.target.value)}
            >
              <option value="">—</option>
              {cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}
            </select>
            <label htmlFor="cohort-membership-sponsorship">{intl.formatMessage({ id: "cohorts.memberships.add.sponsorship" })}</label>
            <select
              id="cohort-membership-sponsorship"
              required
              value={membershipSponsorshipId}
              onChange={(event) => setMembershipSponsorshipId(event.target.value)}
            >
              <option value="">—</option>
              {activeSponsorships.map((sponsorship) => (
                <option key={sponsorship.id} value={sponsorship.id}>{sponsorship.studentDisplayName}</option>
              ))}
            </select>
            <button disabled={adding} type="submit">{intl.formatMessage({ id: "cohorts.memberships.add.submit" })}</button>
          </form>
        )}
        {announcement && <p role="status">{intl.formatMessage({
          id: announcement === "created"
            ? "cohorts.create.created"
            : announcement === "added" ? "cohorts.memberships.add.added" : "cohorts.memberships.ended",
        })}</p>}
        {failure && <p role="alert">{intl.formatMessage({ id: cohortErrorMessageIds[failure] ?? "cohorts.error" })}</p>}
      </section>
      <section className="workspace-card" aria-labelledby="cohorts-title">
        <h2 id="cohorts-title">{intl.formatMessage({ id: "cohorts.title" })}</h2>
        {cohorts.length === 0 ? (
          <p>{intl.formatMessage({ id: "cohorts.empty" })}</p>
        ) : (
          <ul className="cohort-list">
            {cohorts.map((cohort) => (
              <li key={cohort.id}>
                <h3>{cohort.name}</h3>
                <p>{intl.formatMessage({ id: "cohorts.attributedActivity" }, {
                  attended: cohort.attributedActivity.attendedCount,
                  noShow: cohort.attributedActivity.noShowCount,
                })}</p>
                <h4>{intl.formatMessage({ id: "cohorts.memberships.title" })}</h4>
                {cohort.memberships.length === 0 ? (
                  <p>{intl.formatMessage({ id: "cohorts.memberships.empty" })}</p>
                ) : (
                  <ul className="cohort-membership-list">
                    {cohort.memberships.map((membership) => (
                      <li key={membership.id}>
                        <p>{intl.formatMessage({ id: "sponsorship.student" }, { name: membership.studentDisplayName })}</p>
                        <p>{membership.effectiveUntil
                          ? intl.formatMessage({ id: "cohorts.memberships.window.bounded" }, {
                            from: intl.formatDate(membership.effectiveFrom, { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }),
                            until: intl.formatDate(membership.effectiveUntil, { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }),
                          })
                          : intl.formatMessage({ id: "cohorts.memberships.window.open" }, {
                            from: intl.formatDate(membership.effectiveFrom, { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }),
                          })}</p>
                        <p>{intl.formatMessage({ id: "cohorts.attributedActivity" }, {
                          attended: membership.attributedActivity.attendedCount,
                          noShow: membership.attributedActivity.noShowCount,
                        })}</p>
                        {!membership.effectiveUntil && (
                          <button
                            disabled={ending}
                            type="button"
                            onClick={() => void endCohortMembership(membership.id)}
                          >
                            {intl.formatMessage({ id: "cohorts.memberships.end" })}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
