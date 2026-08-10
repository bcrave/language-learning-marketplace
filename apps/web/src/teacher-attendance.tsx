import { useLazyQuery, useMutation, useQuery } from "@apollo/client/react";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";

import { ClassRosterDocument, RecordAttendanceDocument, TeacherAttendanceSessionsDocument, type AttendanceErrorCode, type AttendanceOutcome } from "./generated/graphql.js";

const attendanceErrorMessageIds: Record<AttendanceErrorCode, string> = {
  ATTENDANCE_CORRECTION_REASON_REQUIRED: "attendance.error.correctionReason",
  ATTENDANCE_RECORDING_NOT_OPEN: "attendance.error.notOpen",
  ATTENDANCE_RECORDING_WINDOW_CLOSED: "attendance.error.windowClosed",
  ATTENDANCE_ROSTER_MISMATCH: "attendance.error.rosterMismatch",
  CLASS_SESSION_NOT_FOUND: "attendance.error.notFound",
  IDEMPOTENCY_KEY_REUSED: "attendance.error.idempotency",
};

export function TeacherAttendancePanel() {
  const intl = useIntl();
  const sessions = useQuery(TeacherAttendanceSessionsDocument);
  const [loadRoster, roster] = useLazyQuery(ClassRosterDocument);
  const [recordAttendance, mutation] = useMutation(RecordAttendanceDocument);
  const [outcomes, setOutcomes] = useState<Record<string, AttendanceOutcome>>({});
  const [correctionReasons, setCorrectionReasons] = useState<Record<string, string>>({});
  const [status, setStatus] = useState(false);
  const [typedFailure, setTypedFailure] = useState<AttendanceErrorCode | null>(null);

  useEffect(() => {
    const students = roster.data?.classRoster?.students;
    if (students) setOutcomes(Object.fromEntries(students.flatMap((student) => student.attendance ? [[student.bookingId, student.attendance.outcome]] : [])));
  }, [roster.data]);

  if (sessions.loading) return <p role="status">{intl.formatMessage({ id: "attendance.loading" })}</p>;
  if (sessions.error || !sessions.data) return <p role="alert">{intl.formatMessage({ id: "attendance.loadError" })}</p>;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const classRoster = roster.data?.classRoster;
    if (!classRoster || classRoster.students.some(({ bookingId }) => !outcomes[bookingId])) return;
    setStatus(false);
    setTypedFailure(null);
    const records = classRoster.students.map(({ bookingId, attendance }) => ({
      bookingId,
      outcome: outcomes[bookingId]!,
      ...(attendance && attendance.outcome !== outcomes[bookingId]
        ? { correctionReason: correctionReasons[bookingId]?.trim() }
        : {}),
    }));
    const result = await recordAttendance({ variables: { input: { idempotencyKey: crypto.randomUUID(), classSessionId: classRoster.classSession.id, records } } });
    if (result.data?.recordAttendance.__typename === "RecordAttendanceSuccess") setStatus(true);
    else if (result.data?.recordAttendance.__typename === "AttendanceError") setTypedFailure(result.data.recordAttendance.code);
  }

  const hasInvalidRecord = roster.data?.classRoster?.students.some(({ bookingId, attendance }) => {
    if (!outcomes[bookingId]) return true;
    return Boolean(attendance && attendance.outcome !== outcomes[bookingId] && (correctionReasons[bookingId]?.trim().length ?? 0) < 10);
  }) ?? true;

  return <section className="workspace-card" aria-labelledby="attendance-title">
    <h2 id="attendance-title">{intl.formatMessage({ id: "attendance.title" })}</h2>
    {status && <p role="status">{intl.formatMessage({ id: "attendance.published" })}</p>}
    {typedFailure && <p role="alert">{intl.formatMessage({ id: attendanceErrorMessageIds[typedFailure] })}</p>}
    {mutation.error && <p role="alert">{intl.formatMessage({ id: "attendance.error" })}</p>}
    {sessions.data.teacherAttendanceClassSessions.length === 0
      ? <p>{intl.formatMessage({ id: "attendance.none" })}</p>
      : <ul>{sessions.data.teacherAttendanceClassSessions.map((session) => <li key={session.id}><button type="button" onClick={() => { setStatus(false); setTypedFailure(null); setOutcomes({}); setCorrectionReasons({}); void loadRoster({ variables: { classSessionId: session.id } }); }}>
        {intl.formatMessage({ id: "attendance.openRoster" }, { startsAt: intl.formatDate(new Date(session.startsAt), { dateStyle: "long", timeStyle: "short", timeZone: session.schedulingTimeZone }) })}
      </button></li>)}</ul>}
    {roster.loading && <p role="status">{intl.formatMessage({ id: "attendance.rosterLoading" })}</p>}
    {roster.error && <p role="alert">{intl.formatMessage({ id: "attendance.loadError" })}</p>}
    {roster.data?.classRoster && <form onSubmit={(event) => void submit(event)}>
      {roster.data.classRoster.students.map((student) => <fieldset key={student.bookingId}>
        <legend>{student.displayName}{student.placement ? ` — ${student.placement.targetLanguage.toUpperCase()} ${student.placement.curriculumLevel}` : ""}</legend>
        <label><input type="radio" name={`attendance-${student.bookingId}`} checked={outcomes[student.bookingId] === "ATTENDED"} onChange={() => setOutcomes((current) => ({ ...current, [student.bookingId]: "ATTENDED" }))} />{intl.formatMessage({ id: "attendance.attended" })}</label>
        <label><input type="radio" name={`attendance-${student.bookingId}`} checked={outcomes[student.bookingId] === "NO_SHOW"} onChange={() => setOutcomes((current) => ({ ...current, [student.bookingId]: "NO_SHOW" }))} />{intl.formatMessage({ id: "attendance.noShow" })}</label>
        {student.attendance && outcomes[student.bookingId] && student.attendance.outcome !== outcomes[student.bookingId] && <label>{intl.formatMessage({ id: "attendance.correctionReason" })}<textarea value={correctionReasons[student.bookingId] ?? ""} onChange={(event) => setCorrectionReasons((current) => ({ ...current, [student.bookingId]: event.target.value }))} /></label>}
      </fieldset>)}
      <button type="submit" disabled={mutation.loading || hasInvalidRecord}>{intl.formatMessage({ id: "attendance.submit" })}</button>
    </form>}
  </section>;
}
