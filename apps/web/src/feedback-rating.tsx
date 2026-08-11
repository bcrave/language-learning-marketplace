import { useMutation, useQuery } from "@apollo/client/react";
import { useState } from "react";
import { useIntl } from "react-intl";
import { FEEDBACK_SKILLS, SESSION_RATING_IMPROVEMENT_TAGS, SESSION_RATING_POSITIVE_TAGS } from "@marketplace/core";

import {
  AdministratorFeedbackAndRatingsDocument,
  RedactLearningFeedbackDocument,
  RedactSessionRatingCommentDocument,
  SaveLearningFeedbackDocument,
  SaveSessionRatingDocument,
  StudentFeedbackAndRatingsDocument,
  TeacherFeedbackWorkDocument,
  type FeedbackSkill,
  type SessionRatingImprovementTag,
  type SessionRatingPositiveTag,
  type StudentFeedbackAndRatingsQuery,
  type TeacherFeedbackWorkQuery,
} from "./generated/graphql.js";

const feedbackSkills = FEEDBACK_SKILLS as readonly FeedbackSkill[];
const positiveTags = SESSION_RATING_POSITIVE_TAGS as readonly SessionRatingPositiveTag[];
const improvementTags = SESSION_RATING_IMPROVEMENT_TAGS as readonly SessionRatingImprovementTag[];

const skillMessageIds: Record<FeedbackSkill, string> = {
  LISTENING: "feedback.skill.LISTENING",
  READING: "feedback.skill.READING",
  SPOKEN_INTERACTION: "feedback.skill.SPOKEN_INTERACTION",
  SPOKEN_PRODUCTION: "feedback.skill.SPOKEN_PRODUCTION",
  WRITING: "feedback.skill.WRITING",
  VOCABULARY: "feedback.skill.VOCABULARY",
  GRAMMAR: "feedback.skill.GRAMMAR",
  PRONUNCIATION: "feedback.skill.PRONUNCIATION",
};
const positiveTagMessageIds: Record<SessionRatingPositiveTag, string> = {
  CLEAR_EXPLANATIONS: "rating.tag.CLEAR_EXPLANATIONS",
  SUPPORTIVE: "rating.tag.SUPPORTIVE",
  ENGAGING: "rating.tag.ENGAGING",
  USEFUL_PRACTICE: "rating.tag.USEFUL_PRACTICE",
};
const improvementTagMessageIds: Record<SessionRatingImprovementTag, string> = {
  PACING: "rating.tag.PACING",
  AUDIO_QUALITY: "rating.tag.AUDIO_QUALITY",
  MORE_CORRECTION: "rating.tag.MORE_CORRECTION",
  MORE_SPEAKING_TIME: "rating.tag.MORE_SPEAKING_TIME",
};

function toggle<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((candidate) => candidate !== value) : [...values, value];
}

function FeedbackForm({ item }: { item: TeacherFeedbackWorkQuery["teacherFeedbackWork"][number] }) {
  const intl = useIntl();
  const existing = item.learningFeedback;
  const [strengths, setStrengths] = useState<FeedbackSkill[]>(existing?.observedStrengths ?? []);
  const [focuses, setFocuses] = useState<FeedbackSkill[]>(existing?.suggestedFocuses ?? []);
  const [observations, setObservations] = useState(existing?.observations ?? "");
  const [nextPractice, setNextPractice] = useState(existing?.nextPractice ?? "");
  const [saved, setSaved] = useState(false);
  const [typedError, setTypedError] = useState(false);
  const [save, mutation] = useMutation(SaveLearningFeedbackDocument);

  async function persist(submit: boolean) {
    setSaved(false);
    setTypedError(false);
    const result = await save({ variables: { input: { idempotencyKey: crypto.randomUUID(), bookingId: item.bookingId, observedStrengths: strengths, suggestedFocuses: focuses, observations, nextPractice, submit } } });
    if (result.data?.saveLearningFeedback.__typename === "SaveLearningFeedbackSuccess") setSaved(true);
    else setTypedError(true);
  }

  return <form className="feedback-form" onSubmit={(event) => { event.preventDefault(); void persist(true); }}>
    <h3>{item.studentDisplayName}</h3>
    <p>{intl.formatMessage({ id: "feedback.deadline" }, { deadline: intl.formatDate(new Date(item.feedbackDeadline), { dateStyle: "long", timeStyle: "short" }) })}</p>
    {existing?.redactedAt && <p role="alert">{intl.formatMessage({ id: "feedback.redacted" }, { reason: existing.redactionReason ?? "" })}</p>}
    <fieldset>
      <legend>{intl.formatMessage({ id: "feedback.strengths" })}</legend>
      {feedbackSkills.map((skill) => <label key={`strength-${skill}`}>
        <input type="checkbox" checked={strengths.includes(skill)} disabled={!strengths.includes(skill) && strengths.length >= 3} onChange={() => setStrengths(toggle(strengths, skill))} />
        {intl.formatMessage({ id: skillMessageIds[skill] })}
      </label>)}
    </fieldset>
    <fieldset>
      <legend>{intl.formatMessage({ id: "feedback.focuses" })}</legend>
      {feedbackSkills.map((skill) => <label key={`focus-${skill}`}>
        <input type="checkbox" checked={focuses.includes(skill)} disabled={!focuses.includes(skill) && focuses.length >= 3} onChange={() => setFocuses(toggle(focuses, skill))} />
        {intl.formatMessage({ id: skillMessageIds[skill] })}
      </label>)}
    </fieldset>
    <label>{intl.formatMessage({ id: "feedback.observations" })}<textarea maxLength={500} value={observations} onChange={(event) => setObservations(event.target.value)} /></label>
    <label>{intl.formatMessage({ id: "feedback.nextPractice" })}<textarea maxLength={500} value={nextPractice} onChange={(event) => setNextPractice(event.target.value)} /></label>
    <div className="guard-actions">
      <button type="button" disabled={mutation.loading} onClick={() => void persist(false)}>{intl.formatMessage({ id: "feedback.saveDraft" })}</button>
      <button type="submit" disabled={mutation.loading || strengths.length + focuses.length + observations.trim().length + nextPractice.trim().length === 0}>{intl.formatMessage({ id: existing?.state === "SUBMITTED" ? "feedback.revise" : "feedback.submit" })}</button>
    </div>
    {saved && <p role="status">{intl.formatMessage({ id: "feedback.saved" })}</p>}
    {(typedError || mutation.error) && <p role="alert">{intl.formatMessage({ id: "feedback.error" })}</p>}
  </form>;
}

export function TeacherFeedbackPanel() {
  const intl = useIntl();
  const query = useQuery(TeacherFeedbackWorkDocument);
  if (query.loading) return <p role="status">{intl.formatMessage({ id: "feedback.loading" })}</p>;
  if (query.error || !query.data) return <p role="alert">{intl.formatMessage({ id: "feedback.loadError" })}</p>;
  return <section className="workspace-card" aria-labelledby="teacher-feedback-title">
    <h2 id="teacher-feedback-title">{intl.formatMessage({ id: "feedback.title" })}</h2>
    {query.data.teacherFeedbackWork.length === 0
      ? <p>{intl.formatMessage({ id: "feedback.empty" })}</p>
      : query.data.teacherFeedbackWork.map((item) => <FeedbackForm key={item.bookingId} item={item} />)}
  </section>;
}

function RatingForm({ item }: { item: StudentFeedbackAndRatingsQuery["studentFeedbackAndRatings"][number] }) {
  const intl = useIntl();
  const existing = item.sessionRating;
  const [overallRating, setOverallRating] = useState(existing?.overallRating ?? 0);
  const [selectedPositiveTags, setPositiveTags] = useState<SessionRatingPositiveTag[]>(existing?.positiveTags ?? []);
  const [selectedImprovementTags, setImprovementTags] = useState<SessionRatingImprovementTag[]>(existing?.improvementTags ?? []);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [saved, setSaved] = useState(false);
  const [typedError, setTypedError] = useState(false);
  const [save, mutation] = useMutation(SaveSessionRatingDocument);

  async function persist(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    setTypedError(false);
    const result = await save({ variables: { input: { idempotencyKey: crypto.randomUUID(), bookingId: item.bookingId, overallRating, positiveTags: selectedPositiveTags, improvementTags: selectedImprovementTags, comment } } });
    if (result.data?.saveSessionRating.__typename === "SaveSessionRatingSuccess") setSaved(true);
    else setTypedError(true);
  }

  return <form onSubmit={(event) => void persist(event)}>
    {existing?.redactedAt && <p role="alert">{intl.formatMessage({ id: "rating.commentRedacted" }, { reason: existing.redactionReason ?? "" })}</p>}
    <fieldset>
      <legend>{intl.formatMessage({ id: "rating.overall" })}</legend>
      {[1, 2, 3, 4, 5].map((value) => <label key={value}>
        <input type="radio" name={`rating-${item.bookingId}`} checked={overallRating === value} onChange={() => setOverallRating(value)} />
        {value}
      </label>)}
    </fieldset>
    <fieldset>
      <legend>{intl.formatMessage({ id: "rating.positiveTags" })}</legend>
      {positiveTags.map((tag) => <label key={tag}>
        <input type="checkbox" checked={selectedPositiveTags.includes(tag)} onChange={() => setPositiveTags(toggle(selectedPositiveTags, tag))} />
        {intl.formatMessage({ id: positiveTagMessageIds[tag] })}
      </label>)}
    </fieldset>
    <fieldset>
      <legend>{intl.formatMessage({ id: "rating.improvementTags" })}</legend>
      {improvementTags.map((tag) => <label key={tag}>
        <input type="checkbox" checked={selectedImprovementTags.includes(tag)} onChange={() => setImprovementTags(toggle(selectedImprovementTags, tag))} />
        {intl.formatMessage({ id: improvementTagMessageIds[tag] })}
      </label>)}
    </fieldset>
    <label>{intl.formatMessage({ id: "rating.comment" })}<textarea maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} /></label>
    <button type="submit" disabled={mutation.loading || overallRating === 0}>{intl.formatMessage({ id: existing ? "rating.edit" : "rating.submit" })}</button>
    {saved && <p role="status">{intl.formatMessage({ id: "rating.saved" })}</p>}
    {(typedError || mutation.error) && <p role="alert">{intl.formatMessage({ id: "rating.error" })}</p>}
  </form>;
}

export function StudentFeedbackRatingsPanel() {
  const intl = useIntl();
  const query = useQuery(StudentFeedbackAndRatingsDocument);
  if (query.loading) return <p role="status">{intl.formatMessage({ id: "feedback.loading" })}</p>;
  if (query.error || !query.data) return <p role="alert">{intl.formatMessage({ id: "feedback.loadError" })}</p>;
  return <section className="workspace-card" aria-labelledby="student-feedback-title">
    <h2 id="student-feedback-title">{intl.formatMessage({ id: "feedback.studentTitle" })}</h2>
    {query.data.studentFeedbackAndRatings.length === 0
      ? <p>{intl.formatMessage({ id: "feedback.studentEmpty" })}</p>
      : query.data.studentFeedbackAndRatings.map((item) => <article key={item.bookingId}>
        <h3>{item.teacherDisplayName}</h3>
        {item.learningFeedback
          ? <div>
            {item.learningFeedback.redactedAt && <p role="alert">{intl.formatMessage({ id: "feedback.redacted" }, { reason: item.learningFeedback.redactionReason ?? "" })}</p>}
            <p>{item.learningFeedback.observations}</p>
            <p>{item.learningFeedback.nextPractice}</p>
          </div>
          : <p>{intl.formatMessage({ id: "feedback.notSubmitted" })}</p>}
        <p>{intl.formatMessage({ id: "rating.deadline" }, { deadline: intl.formatDate(new Date(item.ratingDeadline), { dateStyle: "long", timeStyle: "short" }) })}</p>
        {Date.now() <= new Date(item.ratingDeadline).getTime() ? <RatingForm item={item} /> : <p>{intl.formatMessage({ id: "rating.closed" })}</p>}
      </article>)}
  </section>;
}

function RedactAction({ label, onRedact }: { label: string; onRedact: (reason: string) => Promise<boolean> }) {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [typedError, setTypedError] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return <p role="status">{intl.formatMessage({ id: "quality.redacted" })}</p>;
  if (!open) return <button type="button" onClick={() => setOpen(true)}>{label}</button>;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setTypedError(false);
    const succeeded = await onRedact(reason.trim());
    setPending(false);
    if (succeeded) setDone(true);
    else setTypedError(true);
  }

  return <form onSubmit={(event) => void submit(event)}>
    <label>{intl.formatMessage({ id: "quality.redactReason" })}<textarea minLength={10} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
    <button type="submit" disabled={pending || reason.trim().length < 10}>{intl.formatMessage({ id: pending ? "quality.redacting" : "quality.redact" })}</button>
    {typedError && <p role="alert">{intl.formatMessage({ id: "quality.redactError" })}</p>}
  </form>;
}

export function AdministratorQualityPanel() {
  const intl = useIntl();
  const query = useQuery(AdministratorFeedbackAndRatingsDocument);
  const [redactFeedback] = useMutation(RedactLearningFeedbackDocument);
  const [redactRatingComment] = useMutation(RedactSessionRatingCommentDocument);

  if (query.loading) return <p role="status">{intl.formatMessage({ id: "quality.loading" })}</p>;
  if (query.error || !query.data) return <p role="alert">{intl.formatMessage({ id: "quality.error" })}</p>;

  async function submitFeedbackRedaction(bookingId: string, reason: string) {
    const result = await redactFeedback({ variables: { input: { idempotencyKey: crypto.randomUUID(), bookingId, reason } } });
    return result.data?.redactLearningFeedback.__typename === "RedactLearningFeedbackSuccess";
  }

  async function submitRatingRedaction(bookingId: string, reason: string) {
    const result = await redactRatingComment({ variables: { input: { idempotencyKey: crypto.randomUUID(), bookingId, reason } } });
    return result.data?.redactSessionRatingComment.__typename === "RedactSessionRatingCommentSuccess";
  }

  return <section className="workspace-card" aria-labelledby="quality-title">
    <h2 id="quality-title">{intl.formatMessage({ id: "quality.title" })}</h2>
    {query.data.administratorFeedbackAndRatings.length === 0
      ? <p>{intl.formatMessage({ id: "quality.empty" })}</p>
      : <ul>{query.data.administratorFeedbackAndRatings.map((item) => <li key={item.bookingId}>
        <strong>{item.studentDisplayName} — {item.teacherDisplayName}</strong>
        {item.learningFeedback && <p>
          {intl.formatMessage({ id: "quality.feedbackState" }, { state: intl.formatMessage({ id: item.learningFeedback.state === "DRAFT" ? "quality.feedbackState.DRAFT" : "quality.feedbackState.SUBMITTED" }) })}
          {item.learningFeedback.redactedAt
            ? ` ${intl.formatMessage({ id: "feedback.redacted" }, { reason: item.learningFeedback.redactionReason ?? "" })}`
            : <RedactAction label={intl.formatMessage({ id: "quality.redact" })} onRedact={(reason) => submitFeedbackRedaction(item.bookingId, reason)} />}
        </p>}
        {item.sessionRating && <p>
          {intl.formatMessage({ id: "quality.rating" }, { rating: item.sessionRating.overallRating })} {item.sessionRating.comment}
          {item.sessionRating.redactedAt
            ? ` ${intl.formatMessage({ id: "rating.commentRedacted" }, { reason: item.sessionRating.redactionReason ?? "" })}`
            : <RedactAction label={intl.formatMessage({ id: "quality.redact" })} onRedact={(reason) => submitRatingRedaction(item.bookingId, reason)} />}
        </p>}
      </li>)}</ul>}
  </section>;
}
