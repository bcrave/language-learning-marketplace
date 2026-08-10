import { useMutation, useQuery } from "@apollo/client/react";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";

import { ReportAbsenceDocument, TeacherScheduleDocument, type TeacherScheduleQuery } from "./generated/graphql.js";

type ClassSession = TeacherScheduleQuery["teacherClassSessions"][number];

export function TeacherSchedulePanel() {
  const intl = useIntl();
  const { data, loading, error } = useQuery(TeacherScheduleDocument);
  const [reportAbsence, { loading: reporting }] = useMutation(ReportAbsenceDocument);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);
  const [failure, setFailure] = useState(false);

  useEffect(() => {
    if (data) setSessions(data.teacherClassSessions);
  }, [data]);

  if (loading) return <p role="status">{intl.formatMessage({ id: "teacherSchedule.loading" })}</p>;
  if (error || !data) return <p role="alert">{intl.formatMessage({ id: "teacherSchedule.loadError" })}</p>;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (selected.size === 0) return;
    setStatus(null);
    setFailure(false);
    try {
      const result = await reportAbsence({ variables: { input: { idempotencyKey: crypto.randomUUID(), classSessionIds: [...selected] } } });
      if (result.data?.reportAbsence.__typename !== "ReportAbsenceSuccess") {
        setFailure(true);
        return;
      }
      setSelected(new Set());
      setStatus(intl.formatMessage({ id: "teacherSchedule.absenceReported" }));
    } catch {
      setFailure(true);
    }
  }

  return <section className="workspace-card" aria-labelledby="teacher-schedule-title">
    <h2 id="teacher-schedule-title">{intl.formatMessage({ id: "teacherSchedule.title" })}</h2>
    <p>{intl.formatMessage({ id: "teacherSchedule.help" })}</p>
    {status && <p role="status">{status}</p>}
    {failure && <p role="alert">{intl.formatMessage({ id: "teacherSchedule.error" })}</p>}
    {sessions.length === 0 ? <p>{intl.formatMessage({ id: "teacherSchedule.none" })}</p> : <form onSubmit={(event) => void submit(event)}>
      <fieldset>
        <legend>{intl.formatMessage({ id: "teacherSchedule.choose" })}</legend>
        {sessions.map((session) => {
          const label = intl.formatDate(new Date(session.startsAt), { dateStyle: "long", timeStyle: "short", timeZone: session.schedulingTimeZone });
          return <label key={session.id}><input type="checkbox" checked={selected.has(session.id)} onChange={(event) => setSelected((current) => {
            const next = new Set(current);
            if (event.target.checked) next.add(session.id); else next.delete(session.id);
            return next;
          })} />{label}</label>;
        })}
      </fieldset>
      <button type="submit" disabled={reporting || selected.size === 0}>{intl.formatMessage({ id: "teacherSchedule.report" })}</button>
    </form>}
    <h3>{intl.formatMessage({ id: "teacherSchedule.requests" })}</h3>
    {data.teacherAbsenceRequests.length === 0 ? <p>{intl.formatMessage({ id: "teacherSchedule.noRequests" })}</p> : <ul>{data.teacherAbsenceRequests.map((request) => <li key={request.id}>{intl.formatMessage({ id: request.state === "OPEN" ? "teacherSchedule.requestOpen" : "teacherSchedule.requestResolved" }, { count: request.classSessions.length })}</li>)}</ul>}
  </section>;
}
