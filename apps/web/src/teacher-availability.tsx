import { useMutation, useQuery } from "@apollo/client/react";
import { useEffect, useState } from "react";
import { useIntl, type IntlShape } from "react-intl";

import {
  AddAvailabilityExceptionDocument,
  EndTeacherAvailabilityRangeDocument,
  RemoveAvailabilityExceptionDocument,
  SaveTeacherAvailabilityRangeDocument,
  TeacherAvailabilityDocument,
  type LocalTimeDisambiguation,
  type TeacherAvailabilityQuery,
  type Weekday,
} from "./generated/graphql.js";

const weekdays: Weekday[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
type TeacherAvailabilityRange = TeacherAvailabilityQuery["teacherAvailability"]["weeklyRanges"][number];
type AvailabilityException = TeacherAvailabilityQuery["teacherAvailability"]["exceptions"][number];

export function TeacherAvailabilityPanel({
  idempotencyKeyFactory = () => crypto.randomUUID(),
}: {
  idempotencyKeyFactory?: (kind: "range" | "exception") => string;
}) {
  const intl = useIntl();
  const { data, error, loading } = useQuery(TeacherAvailabilityDocument);
  const [saveRange, { loading: savingRange }] = useMutation(SaveTeacherAvailabilityRangeDocument);
  const [addException, { loading: savingException }] = useMutation(AddAvailabilityExceptionDocument);
  const [endRange] = useMutation(EndTeacherAvailabilityRangeDocument);
  const [removeException] = useMutation(RemoveAvailabilityExceptionDocument);
  const [ranges, setRanges] = useState<TeacherAvailabilityRange[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [weekday, setWeekday] = useState<Weekday>("MONDAY");
  const [startLocalTime, setStartLocalTime] = useState("09:00");
  const [endLocalTime, setEndLocalTime] = useState("12:00");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [endsAtLocal, setEndsAtLocal] = useState("");
  const [startDisambiguation, setStartDisambiguation] = useState<LocalTimeDisambiguation>("REJECT");
  const [endDisambiguation, setEndDisambiguation] = useState<LocalTimeDisambiguation>("REJECT");
  const [rangeMessage, setRangeMessage] = useState<string | null>(null);
  const [exceptionMessage, setExceptionMessage] = useState<{ message: string; path?: string } | null>(null);
  const [effectiveUntilByRange, setEffectiveUntilByRange] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    setRanges(data.teacherAvailability.weeklyRanges);
    setExceptions(data.teacherAvailability.exceptions);
  }, [data]);

  if (loading) return <p role="status">{intl.formatMessage({ id: "availability.loading" })}</p>;
  if (error || !data) return <p role="alert">{intl.formatMessage({ id: "availability.loadError" })}</p>;

  const timeZone = data.teacherAvailability.timeZone;

  async function submitRange(event: React.FormEvent) {
    event.preventDefault();
    setRangeMessage(null);
    try {
      const result = await saveRange({ variables: { input: {
        idempotencyKey: idempotencyKeyFactory("range"), weekday, startLocalTime,
        endLocalTime, effectiveFrom, timeZone,
      } } });
      const outcome = result.data?.saveTeacherAvailabilityRange;
      if (outcome && "range" in outcome) {
        setRanges((current) => [...current.filter((range) => range.id !== outcome.range.id), outcome.range]);
        setRangeMessage(intl.formatMessage({ id: "availability.rangeSaved" }));
      } else if (outcome && "code" in outcome) setRangeMessage(localizedError(outcome.code, intl));
    } catch {
      setRangeMessage(intl.formatMessage({ id: "availability.saveError" }));
    }
  }

  async function submitException(event: React.FormEvent) {
    event.preventDefault();
    setExceptionMessage(null);
    try {
      const result = await addException({ variables: { input: {
        idempotencyKey: idempotencyKeyFactory("exception"), startsAtLocal, endsAtLocal,
        startDisambiguation, endDisambiguation,
      } } });
      const outcome = result.data?.addAvailabilityException;
      if (outcome && "exception" in outcome) {
        setExceptions((current) => [...current, outcome.exception]);
        setExceptionMessage({ message: intl.formatMessage({ id: "availability.exceptionSaved" }) });
      } else if (outcome && "code" in outcome) {
        setExceptionMessage({ message: localizedError(outcome.code, intl), ...( "absenceRequestPath" in outcome ? { path: outcome.absenceRequestPath } : {}) });
      }
    } catch {
      setExceptionMessage({ message: intl.formatMessage({ id: "availability.saveError" }) });
    }
  }

  async function submitRangeEnd(event: React.FormEvent, range: TeacherAvailabilityRange) {
    event.preventDefault();
    const effectiveUntil = effectiveUntilByRange[range.id];
    if (!effectiveUntil) return;
    const result = await endRange({ variables: { input: { idempotencyKey: idempotencyKeyFactory("range"), rangeId: range.id, effectiveUntil } } });
    const outcome = result.data?.endTeacherAvailabilityRange;
    if (outcome && "range" in outcome) setRanges((current) => current.map((item) => item.id === range.id ? outcome.range : item));
    else if (outcome && "code" in outcome) setRangeMessage(localizedError(outcome.code, intl));
  }

  async function removeSavedException(exceptionId: string) {
    const result = await removeException({ variables: { input: { idempotencyKey: idempotencyKeyFactory("exception"), exceptionId } } });
    const outcome = result.data?.removeAvailabilityException;
    if (outcome && "exceptionId" in outcome) setExceptions((current) => current.filter((item) => item.id !== outcome.exceptionId));
    else if (outcome && "code" in outcome) setExceptionMessage({ message: localizedError(outcome.code, intl) });
  }

  return (
    <section className="workspace-card availability-panel" aria-labelledby="teacher-availability-title">
      <h2 id="teacher-availability-title">{intl.formatMessage({ id: "availability.title" })}</h2>
      <p>{intl.formatMessage({ id: "availability.timeZone" }, { timeZone })}</p>
      <p className="field-help">{intl.formatMessage({ id: "availability.dstHelp" })}</p>

      <form className="preferences-form" onSubmit={(event) => void submitRange(event)}>
        <label htmlFor="availability-weekday">{intl.formatMessage({ id: "availability.weekday" })}</label>
        <select id="availability-weekday" value={weekday} onChange={(event) => setWeekday(event.target.value as Weekday)}>
          {weekdays.map((day) => <option key={day} value={day}>{weekdayName(day, intl)}</option>)}
        </select>
        <label htmlFor="availability-start">{intl.formatMessage({ id: "availability.startTime" })}</label>
        <input id="availability-start" type="time" required value={startLocalTime} onChange={(event) => setStartLocalTime(event.target.value)} />
        <label htmlFor="availability-end">{intl.formatMessage({ id: "availability.endTime" })}</label>
        <input id="availability-end" type="time" required value={endLocalTime} onChange={(event) => setEndLocalTime(event.target.value)} />
        <label htmlFor="availability-effective">{intl.formatMessage({ id: "availability.effectiveFrom" })}</label>
        <input id="availability-effective" type="date" required value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} />
        <button disabled={savingRange} type="submit">{intl.formatMessage({ id: "availability.addRange" })}</button>
      </form>
      {rangeMessage && <p role="status">{rangeMessage}</p>}
      <ul aria-label={intl.formatMessage({ id: "availability.ranges" })}>
        {ranges.map((range) => <li key={range.id}>
          <span>{formatRange(range, intl)}</span>
          {!range.effectiveUntil && <form className="inline-form" onSubmit={(event) => void submitRangeEnd(event, range)}>
            <label htmlFor={`range-end-${range.id}`}>{intl.formatMessage({ id: "availability.effectiveUntil" })}</label>
            <input id={`range-end-${range.id}`} type="date" required value={effectiveUntilByRange[range.id] ?? ""} onChange={(event) => setEffectiveUntilByRange((current) => ({ ...current, [range.id]: event.target.value }))} />
            <button type="submit">{intl.formatMessage({ id: "availability.endRange" })}</button>
          </form>}
        </li>)}
      </ul>

      <h3>{intl.formatMessage({ id: "availability.exceptions" })}</h3>
      <form className="preferences-form" onSubmit={(event) => void submitException(event)}>
        <label htmlFor="exception-start">{intl.formatMessage({ id: "availability.unavailableFrom" })}</label>
        <input id="exception-start" type="datetime-local" required value={startsAtLocal} onChange={(event) => setStartsAtLocal(event.target.value)} />
        <label htmlFor="exception-start-choice">{intl.formatMessage({ id: "availability.repeatedStart" })}</label>
        <select id="exception-start-choice" value={startDisambiguation} onChange={(event) => setStartDisambiguation(event.target.value as LocalTimeDisambiguation)}>{disambiguationOptions(intl)}</select>
        <label htmlFor="exception-end">{intl.formatMessage({ id: "availability.unavailableUntil" })}</label>
        <input id="exception-end" type="datetime-local" required value={endsAtLocal} onChange={(event) => setEndsAtLocal(event.target.value)} />
        <label htmlFor="exception-end-choice">{intl.formatMessage({ id: "availability.repeatedEnd" })}</label>
        <select id="exception-end-choice" value={endDisambiguation} onChange={(event) => setEndDisambiguation(event.target.value as LocalTimeDisambiguation)}>{disambiguationOptions(intl)}</select>
        <button disabled={savingException} type="submit">{intl.formatMessage({ id: "availability.addException" })}</button>
      </form>
      {exceptionMessage && <p role={exceptionMessage.path ? "alert" : "status"}>
        {exceptionMessage.message}{exceptionMessage.path && <> <a href={exceptionMessage.path}>{intl.formatMessage({ id: "availability.createAbsenceRequest" })}</a></>}
      </p>}
      <ul aria-label={intl.formatMessage({ id: "availability.savedExceptions" })}>
        {exceptions.map((exception) => <li key={exception.id}>{formatException(exception, intl)} <button type="button" onClick={() => void removeSavedException(exception.id)}>{intl.formatMessage({ id: "availability.removeException" })}</button></li>)}
      </ul>
    </section>
  );
}

function weekdayName(weekday: Weekday, intl: IntlShape) {
  const dates: Record<Weekday, string> = { MONDAY: "2026-08-03", TUESDAY: "2026-08-04", WEDNESDAY: "2026-08-05", THURSDAY: "2026-08-06", FRIDAY: "2026-08-07", SATURDAY: "2026-08-08", SUNDAY: "2026-08-09" };
  return intl.formatDate(new Date(`${dates[weekday]}T12:00:00Z`), { weekday: "long", timeZone: "UTC" });
}

function formatRange(range: TeacherAvailabilityRange, intl: IntlShape) {
  const time = (value: string) => intl.formatTime(new Date(`2026-01-01T${value}:00Z`), { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  const date = (value: string) => intl.formatDate(new Date(`${value}T12:00:00Z`), { dateStyle: "long", timeZone: "UTC" });
  return intl.formatMessage(
    { id: range.effectiveUntil ? "availability.rangeDescriptionEnded" : "availability.rangeDescription" },
    { weekday: weekdayName(range.weekday, intl), start: time(range.startLocalTime), end: time(range.endLocalTime), from: date(range.effectiveFrom), until: range.effectiveUntil ? date(range.effectiveUntil) : "" },
  );
}

function formatException(exception: AvailabilityException, intl: IntlShape) {
  const format = (value: string) => intl.formatDate(new Date(value), { dateStyle: "medium", timeStyle: "short", timeZone: exception.timeZone });
  return intl.formatMessage({ id: "availability.exceptionDescription" }, { start: format(exception.startsAt), end: format(exception.endsAt) });
}

function disambiguationOptions(intl: IntlShape) {
  const messageIds = ["availability.disambiguation.reject", "availability.disambiguation.earlier", "availability.disambiguation.later"];
  return ["REJECT", "EARLIER", "LATER"].map((value, index) => <option key={value} value={value}>{intl.formatMessage({ id: messageIds[index]! })}</option>);
}

function localizedError(code: string, intl: IntlShape) {
  const messageIds: Record<string, string> = {
    AVAILABILITY_EXCEPTION_NOT_FOUND: "availability.error.exceptionNotFound",
    IDEMPOTENCY_KEY_REUSED: "availability.error.idempotencyKeyReused",
    INVALID_AVAILABILITY_RANGE: "availability.error.invalidRange",
    INVALID_EFFECTIVE_DATE: "availability.error.invalidEffectiveDate",
    INVALID_LOCAL_DATE_TIME: "availability.error.invalidLocalDateTime",
    INVALID_TIME_RANGE: "availability.error.invalidTimeRange",
    INVALID_TIME_ZONE: "availability.error.invalidTimeZone",
    LOCAL_TIME_FOLD: "availability.error.fold",
    LOCAL_TIME_GAP: "availability.error.gap",
    PUBLISHED_CLASS_SESSION_OVERLAP: "availability.error.sessionOverlap",
  };
  return intl.formatMessage({ id: messageIds[code] ?? "availability.saveError" });
}
