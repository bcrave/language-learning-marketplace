import { useMutation, useQuery } from "@apollo/client/react";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";

import {
  AdministrationClassSessionsDocument,
  CancelClassSessionDocument,
  ChangeClassSessionSeatCapacityDocument,
  type AdministrationClassSessionsQuery,
  PublishClassSessionDocument,
  SubstituteTeacherDocument,
} from "./generated/graphql.js";

type ClassSession = AdministrationClassSessionsQuery["administrationClassSessions"][number];

const classSessionErrorMessageIds: Record<string, string> = {
  INVALID_SEAT_CAPACITY: "classSession.error.invalidSeatCapacity",
  INVALID_SCHEDULING_TIME_ZONE: "classSession.error.invalidTimeZone",
  LOCAL_TIME_FOLD: "classSession.error.fold",
  LOCAL_TIME_GAP: "classSession.error.gap",
  INVALID_LOCAL_DATE_TIME: "classSession.error.invalidLocalDateTime",
  INVALID_LESSON_UNIT: "classSession.error.invalidLessonUnit",
  TEACHER_QUALIFICATION_REQUIRED: "classSession.error.qualificationRequired",
  TEACHER_AVAILABILITY_REQUIRED: "classSession.error.availabilityRequired",
  AVAILABILITY_EXCEPTION_CONFLICT: "classSession.error.availabilityException",
  TEACHER_SCHEDULE_CONFLICT: "classSession.error.scheduleConflict",
  CLASS_SESSION_NOT_FOUND: "classSession.error.notFound",
  SEAT_CAPACITY_BELOW_OCCUPIED_SEATS: "classSession.error.capacityBelowOccupied",
  IDEMPOTENCY_KEY_REUSED: "classSession.error.idempotencyKeyReused",
  ATTENDANCE_ALREADY_SUBMITTED: "classSession.error.attendanceSubmitted",
  DISRUPTION_ALREADY_RESOLVED: "classSession.error.disruptionResolved",
  INVALID_REASON: "classSession.error.invalidReason",
  REPLACEMENT_TEACHER_REQUIRED: "classSession.error.replacementRequired",
  CLASS_SESSION_ALREADY_STARTED: "classSession.error.alreadyStarted",
};

export function AdminClassSessions({ locale }: { locale: "en" | "es" }) {
  const intl = useIntl();
  const graphQLLocale = locale === "es" ? "ES" as const : "EN" as const;
  const { data, error, loading } = useQuery(AdministrationClassSessionsDocument, { variables: { locale: graphQLLocale } });
  const [publishClassSession, { loading: publishing }] = useMutation(PublishClassSessionDocument);
  const [changeSeatCapacity] = useMutation(ChangeClassSessionSeatCapacityDocument);
  const [substituteTeacher] = useMutation(SubstituteTeacherDocument);
  const [cancelClassSession] = useMutation(CancelClassSessionDocument);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [absenceRequests, setAbsenceRequests] = useState(data?.administrationAbsenceRequests ?? []);
  const [status, setStatus] = useState<string | null>(null);
  const [failureCode, setFailureCode] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setSessions(data.administrationClassSessions);
      setAbsenceRequests(data.administrationAbsenceRequests);
    }
  }, [data]);

  if (loading) return <p role="status">{intl.formatMessage({ id: "classSession.loading" })}</p>;
  if (error || !data) return <p role="alert">{intl.formatMessage({ id: "classSession.loadError" })}</p>;

  const lessonUnits = data.administrationCurriculum.courses.flatMap((course) => course.lessonUnits.filter((unit) => unit.state === "ACTIVE").map((unit) => ({ ...unit, courseTitle: course.title })));
  const teachers = data.administrationCurriculum.teachers;

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setFailureCode(null);
    const values = new FormData(event.currentTarget);
    try {
      const result = await publishClassSession({ variables: { input: {
        idempotencyKey: crypto.randomUUID(),
        lessonUnitId: String(values.get("lessonUnitId")),
        teacherUserId: String(values.get("teacherUserId")),
        startsAtLocal: String(values.get("startsAtLocal")),
        schedulingTimeZone: String(values.get("schedulingTimeZone")),
        timeDisambiguation: String(values.get("timeDisambiguation")) as "REJECT" | "EARLIER" | "LATER",
        seatCapacity: Number(values.get("seatCapacity")),
      } } });
      const outcome = result.data?.publishClassSession;
      if (outcome?.__typename !== "PublishClassSessionSuccess") {
        setFailureCode(outcome?.__typename === "ClassSessionPublicationError" ? outcome.code : outcome?.__typename === "CurriculumConflict" ? outcome.conflictCode : "UNEXPECTED");
        return;
      }
      setSessions((current) => [...current, outcome.classSession].sort((left, right) => left.startsAt.localeCompare(right.startsAt)));
      setStatus(intl.formatMessage({ id: "classSession.published" }, { seatCapacity: outcome.classSession.seatCapacity }));
    } catch {
      setFailureCode("UNEXPECTED");
    }
  }

  async function changeCapacity(event: React.FormEvent<HTMLFormElement>, session: ClassSession) {
    event.preventDefault();
    setStatus(null);
    setFailureCode(null);
    const seatCapacity = Number(new FormData(event.currentTarget).get("seatCapacity"));
    try {
      const result = await changeSeatCapacity({ variables: { input: { idempotencyKey: crypto.randomUUID(), classSessionId: session.id, seatCapacity } } });
      const outcome = result.data?.changeClassSessionSeatCapacity;
      if (outcome?.__typename !== "ChangeClassSessionSeatCapacitySuccess") {
        setFailureCode(outcome?.__typename === "ClassSessionSeatCapacityError" ? outcome.code : outcome?.__typename === "CurriculumConflict" ? outcome.conflictCode : "UNEXPECTED");
        return;
      }
      setSessions((current) => current.map((candidate) => candidate.id === outcome.classSession.id ? outcome.classSession : candidate));
      setStatus(intl.formatMessage({ id: "classSession.capacityChanged" }, { seatCapacity: outcome.classSession.seatCapacity }));
    } catch {
      setFailureCode("UNEXPECTED");
    }
  }

  async function cancelSession(event: React.FormEvent<HTMLFormElement>, absenceRequestId: string, classSessionId: string) {
    event.preventDefault();
    setStatus(null);
    setFailureCode(null);
    const reason = String(new FormData(event.currentTarget).get("reason"));
    try {
      const outcome = (await cancelClassSession({ variables: { input: { idempotencyKey: crypto.randomUUID(), absenceRequestId, classSessionId, reason } } })).data?.cancelClassSession;
      if (outcome?.__typename !== "CancelClassSessionSuccess") {
        setFailureCode(outcome?.__typename === "ClassSessionDisruptionError" ? outcome.code : "UNEXPECTED");
        return;
      }
      setAbsenceRequests((current) => outcome.absenceRequest.state === "RESOLVED"
        ? current.filter((request) => request.id !== absenceRequestId)
        : current.map((request) => request.id === absenceRequestId ? { ...request, classSessions: request.classSessions.filter((session) => session.id !== classSessionId) } : request));
      setSessions((current) => current.filter((session) => session.id !== classSessionId));
      setStatus(intl.formatMessage({ id: "classSession.cancelled" }, { bookings: outcome.refundedBookingCount, waitlist: outcome.removedWaitlistEntryCount }));
    } catch {
      setFailureCode("UNEXPECTED");
    }
  }

  async function substitute(event: React.FormEvent<HTMLFormElement>, absenceRequestId: string, classSessionId: string) {
    event.preventDefault();
    setStatus(null);
    setFailureCode(null);
    const replacementTeacherUserId = String(new FormData(event.currentTarget).get("replacementTeacherUserId"));
    try {
      const outcome = (await substituteTeacher({ variables: { input: { idempotencyKey: crypto.randomUUID(), absenceRequestId, classSessionId, replacementTeacherUserId } } })).data?.substituteTeacher;
      if (outcome?.__typename !== "SubstituteTeacherSuccess") {
        setFailureCode(outcome?.__typename === "ClassSessionDisruptionError" ? outcome.code : "UNEXPECTED");
        return;
      }
      setAbsenceRequests((current) => outcome.absenceRequest.state === "RESOLVED"
        ? current.filter((request) => request.id !== absenceRequestId)
        : current.map((request) => request.id === absenceRequestId ? { ...request, classSessions: request.classSessions.filter((session) => session.id !== classSessionId) } : request));
      setSessions((current) => current.map((session) => session.id === classSessionId ? { ...session, teacherUserId: outcome.classSession.teacherUserId } : session));
      setStatus(intl.formatMessage({ id: "classSession.substituted" }));
    } catch {
      setFailureCode("UNEXPECTED");
    }
  }

  return (
    <section className="workspace-card" aria-labelledby="class-session-administration-title">
      <h2 id="class-session-administration-title">{intl.formatMessage({ id: "classSession.title" })}</h2>
      {status && <p role="status">{status}</p>}
      {failureCode && <p role="alert">{intl.formatMessage({ id: classSessionErrorMessageIds[failureCode] ?? "classSession.error" })}</p>}
      <form className="curriculum-form" onSubmit={(event) => void publish(event)}>
        <h3>{intl.formatMessage({ id: "classSession.publish" })}</h3>
        <label>{intl.formatMessage({ id: "classSession.lessonUnit" })}<select name="lessonUnitId" required defaultValue=""><option value="" disabled>—</option>{lessonUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.courseTitle} · {unit.title}</option>)}</select></label>
        <label>{intl.formatMessage({ id: "classSession.teacher" })}<select name="teacherUserId" required defaultValue=""><option value="" disabled>—</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.displayName}</option>)}</select></label>
        <label>{intl.formatMessage({ id: "classSession.localStart" })}<input name="startsAtLocal" required type="datetime-local" /></label>
        <label>{intl.formatMessage({ id: "classSession.schedulingTimeZone" })}<input name="schedulingTimeZone" required /></label>
        <label>{intl.formatMessage({ id: "classSession.disambiguation" })}<select name="timeDisambiguation" defaultValue="REJECT"><option value="REJECT">{intl.formatMessage({ id: "classSession.disambiguation.reject" })}</option><option value="EARLIER">{intl.formatMessage({ id: "classSession.disambiguation.earlier" })}</option><option value="LATER">{intl.formatMessage({ id: "classSession.disambiguation.later" })}</option></select></label>
        <label>{intl.formatMessage({ id: "classSession.seatCapacity" })}<input name="seatCapacity" type="number" min={2} max={8} defaultValue={5} required /></label>
        <button disabled={publishing} type="submit">{intl.formatMessage({ id: "classSession.publishAction" })}</button>
      </form>
      <section aria-labelledby="class-session-absence-resolution-title">
      <h3 id="class-session-absence-resolution-title">{intl.formatMessage({ id: "classSession.resolveAbsences" })}</h3>
      {absenceRequests.length === 0 && <p>{intl.formatMessage({ id: "classSession.noAbsences" })}</p>}
      {absenceRequests.map((request) => <section key={request.id} aria-label={intl.formatMessage({ id: "classSession.absenceRequest" })}>
        {request.classSessions.map((session) => <div key={session.id}>
          <p>{intl.formatDate(new Date(session.startsAt), { dateStyle: "long", timeStyle: "short", timeZone: session.schedulingTimeZone })}</p>
          <form onSubmit={(event) => void cancelSession(event, request.id, session.id)}>
            <label>{intl.formatMessage({ id: "classSession.cancellationReason" })}<input name="reason" minLength={10} maxLength={500} required /></label>
            <button type="submit">{intl.formatMessage({ id: "classSession.cancelAction" })}</button>
          </form>
          <form onSubmit={(event) => void substitute(event, request.id, session.id)}>
            <label>{intl.formatMessage({ id: "classSession.replacementTeacher" })}<select name="replacementTeacherUserId" required defaultValue=""><option value="" disabled>—</option>{teachers.filter((teacher) => teacher.id !== session.teacherUserId).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.displayName}</option>)}</select></label>
            <button type="submit">{intl.formatMessage({ id: "classSession.substituteAction" })}</button>
          </form>
        </div>)}
      </section>)}
      </section>
      <h3>{intl.formatMessage({ id: "classSession.current" })}</h3>
      {sessions.length === 0 && <p>{intl.formatMessage({ id: "classSession.none" })}</p>}
      <ul>{sessions.map((session) => <li key={session.id}>
        <p>{intl.formatDate(new Date(session.startsAt), { dateStyle: "long", timeStyle: "short", timeZone: session.schedulingTimeZone })} · {session.schedulingTimeZone} · {session.seatCapacity}</p>
        <form onSubmit={(event) => void changeCapacity(event, session)}>
          <label>{intl.formatMessage({ id: "classSession.seatCapacity" })}<input name="seatCapacity" type="number" min={Math.max(2, session.occupiedSeats)} max={8} defaultValue={session.seatCapacity} required /></label>
          <button type="submit">{intl.formatMessage({ id: "classSession.capacityAction" })}</button>
        </form>
      </li>)}</ul>
    </section>
  );
}
