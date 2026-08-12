import { useMutation, useQuery } from "@apollo/client/react";
import { useState } from "react";
import { useIntl } from "react-intl";

import {
  AdministrationAttendanceReviewRequestsDocument,
  DecideAttendanceReviewDocument,
  RequestAttendanceReviewDocument,
  StudentAttendanceRecordsDocument,
  type AdministrationAttendanceReviewRequestsQuery,
  type StudentAttendanceRecordsQuery,
} from "./generated/graphql.js";

type StudentAttendanceRecord = StudentAttendanceRecordsQuery["studentAttendanceRecords"][number];
type AttendanceReviewRequest = AdministrationAttendanceReviewRequestsQuery["administrationAttendanceReviewRequests"][number];

function ReviewRequestForm({ record }: { record: StudentAttendanceRecord }) {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [typedError, setTypedError] = useState(false);
  const [request, mutation] = useMutation(RequestAttendanceReviewDocument);

  if (submitted) return <p role="status">{intl.formatMessage({ id: "attendanceReview.submitted" })}</p>;
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)}>{intl.formatMessage({ id: "attendanceReview.request" })}</button>;
  }

  async function persist(event: React.FormEvent) {
    event.preventDefault();
    setTypedError(false);
    const result = await request({ variables: { input: { idempotencyKey: crypto.randomUUID(), bookingId: record.bookingId, explanation } } });
    if (result.data?.requestAttendanceReview.__typename === "RequestAttendanceReviewSuccess") setSubmitted(true);
    else setTypedError(true);
  }

  return <form onSubmit={(event) => void persist(event)}>
    <label>
      {intl.formatMessage({ id: "attendanceReview.explanation" })}
      <textarea maxLength={500} value={explanation} onChange={(event) => setExplanation(event.target.value)} />
    </label>
    <p>{intl.formatMessage({ id: "attendanceReview.creditNotice" })}</p>
    <button type="submit" disabled={mutation.loading}>{intl.formatMessage({ id: "attendanceReview.submit" })}</button>
    {(typedError || mutation.error) && <p role="alert">{intl.formatMessage({ id: "attendanceReview.error" })}</p>}
  </form>;
}

export function StudentAttendanceReviewPanel() {
  const intl = useIntl();
  const query = useQuery(StudentAttendanceRecordsDocument);
  if (query.loading) return <p role="status">{intl.formatMessage({ id: "attendanceReview.loading" })}</p>;
  if (query.error || !query.data) return <p role="alert">{intl.formatMessage({ id: "attendanceReview.loadError" })}</p>;

  return <section className="workspace-card" aria-labelledby="attendance-review-title">
    <h2 id="attendance-review-title">{intl.formatMessage({ id: "attendanceReview.title" })}</h2>
    {query.data.studentAttendanceRecords.length === 0
      ? <p>{intl.formatMessage({ id: "attendanceReview.empty" })}</p>
      : query.data.studentAttendanceRecords.map((record) => <article key={record.bookingId}>
        <h3>{record.teacherDisplayName}</h3>
        <p>{intl.formatMessage({ id: "attendanceReview.outcome" }, { outcome: record.outcome })}</p>
        <p>{intl.formatMessage({ id: "attendanceReview.published" }, { publishedAt: intl.formatDate(new Date(record.publishedAt), { dateStyle: "long", timeStyle: "short" }) })}</p>
        {record.correctedAt && <p>{intl.formatMessage({ id: "attendanceReview.corrected" }, {
          correctedAt: intl.formatDate(new Date(record.correctedAt), { dateStyle: "long", timeStyle: "short" }),
          correctionCount: record.correctionCount,
        })}</p>}
        {record.reviewRequest
          ? <div>
            <p>{intl.formatMessage({ id: "attendanceReview.state" }, { state: record.reviewRequest.state })}</p>
            {record.reviewRequest.studentVisibleRationale && <p>{intl.formatMessage({ id: "attendanceReview.rationale" }, { rationale: record.reviewRequest.studentVisibleRationale })}</p>}
          </div>
          : <>
            <p>{intl.formatMessage({ id: "attendanceReview.deadline" }, { deadline: intl.formatDate(new Date(record.reviewDeadline), { dateStyle: "long", timeStyle: "short" }) })}</p>
            {record.reviewRequestOpen
              ? <ReviewRequestForm record={record} />
              : <p>{intl.formatMessage({ id: "attendanceReview.closed" })}</p>}
          </>}
      </article>)}
  </section>;
}

function DecisionForm({ request }: { request: AttendanceReviewRequest }) {
  const intl = useIntl();
  const [studentVisibleRationale, setStudentVisibleRationale] = useState("");
  const [privateAdministratorNote, setPrivateAdministratorNote] = useState("");
  const [decided, setDecided] = useState(false);
  const [typedError, setTypedError] = useState(false);
  const [decide, mutation] = useMutation(DecideAttendanceReviewDocument);

  if (decided) return <p role="status">{intl.formatMessage({ id: "attendanceReviewQueue.decided" })}</p>;

  async function persist(decision: "UPHOLD" | "CORRECT") {
    setTypedError(false);
    const result = await decide({ variables: { input: {
      idempotencyKey: crypto.randomUUID(),
      attendanceReviewRequestId: request.id,
      decision,
      studentVisibleRationale,
      privateAdministratorNote,
    } } });
    if (result.data?.decideAttendanceReview.__typename === "DecideAttendanceReviewSuccess") setDecided(true);
    else setTypedError(true);
  }

  return <form onSubmit={(event) => { event.preventDefault(); void persist("UPHOLD"); }}>
    <label>
      {intl.formatMessage({ id: "attendanceReviewQueue.rationale" })}
      <textarea minLength={10} maxLength={500} value={studentVisibleRationale} onChange={(event) => setStudentVisibleRationale(event.target.value)} />
    </label>
    <label>
      {intl.formatMessage({ id: "attendanceReviewQueue.note" })}
      <textarea maxLength={500} value={privateAdministratorNote} onChange={(event) => setPrivateAdministratorNote(event.target.value)} />
    </label>
    <div className="guard-actions">
      <button type="submit" disabled={mutation.loading || studentVisibleRationale.trim().length < 10}>{intl.formatMessage({ id: "attendanceReviewQueue.uphold" })}</button>
      <button type="button" disabled={mutation.loading || studentVisibleRationale.trim().length < 10} onClick={() => void persist("CORRECT")}>{intl.formatMessage({ id: "attendanceReviewQueue.correct" })}</button>
    </div>
    {(typedError || mutation.error) && <p role="alert">{intl.formatMessage({ id: "attendanceReviewQueue.decideError" })}</p>}
  </form>;
}

export function AdministratorAttendanceReviewPanel() {
  const intl = useIntl();
  const query = useQuery(AdministrationAttendanceReviewRequestsDocument);
  if (query.loading) return <p role="status">{intl.formatMessage({ id: "attendanceReviewQueue.loading" })}</p>;
  if (query.error || !query.data) return <p role="alert">{intl.formatMessage({ id: "attendanceReviewQueue.error" })}</p>;

  return <section className="workspace-card" aria-labelledby="attendance-review-queue-title">
    <h2 id="attendance-review-queue-title">{intl.formatMessage({ id: "attendanceReviewQueue.title" })}</h2>
    {query.data.administrationAttendanceReviewRequests.length === 0
      ? <p>{intl.formatMessage({ id: "attendanceReviewQueue.empty" })}</p>
      : <ul>{query.data.administrationAttendanceReviewRequests.map((request) => <li key={request.id}>
        <h3>{intl.formatMessage({ id: "attendanceReviewQueue.summary" }, { studentDisplayName: request.studentDisplayName, outcome: request.effectiveOutcome })}</h3>
        {request.explanation && <p>{intl.formatMessage({ id: "attendanceReviewQueue.explanation" }, { explanation: request.explanation })}</p>}
        {request.state === "PENDING"
          ? <DecisionForm request={request} />
          : <>
            <p>{intl.formatMessage({ id: "attendanceReview.state" }, { state: request.state })}</p>
            {request.studentVisibleRationale && <p>{intl.formatMessage({ id: "attendanceReview.rationale" }, { rationale: request.studentVisibleRationale })}</p>}
          </>}
      </li>)}</ul>}
  </section>;
}
