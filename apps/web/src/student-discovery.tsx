import { skipToken, useMutation, useQuery } from "@apollo/client/react";
import { useEffect, useState } from "react";
import { FormattedDate, FormattedMessage, FormattedTime, useIntl } from "react-intl";

import {
  BookClassSessionDocument,
  BookingFieldsFragmentDoc,
  CancelBookingDocument,
  ClassSessionDiscoveryOptionsDocument,
  DiscoverClassSessionsDocument,
  JoinWaitlistDocument,
  RescheduleBookingDocument,
  SetStudentPlacementDocument,
  StudentBookingsDocument,
  StudentWaitlistEntriesDocument,
  StudentPlacementsDocument,
  WaitlistEntryFieldsFragmentDoc,
  WithdrawWaitlistDocument,
  type ClassSessionDiscoveryInput,
  type CurriculumLevel,
  type DiscoverClassSessionsQuery,
} from "./generated/graphql.js";
import { useFragment as readFragment } from "./generated/fragment-masking.js";

const curriculumLevels: CurriculumLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const bookingErrorMessages: Record<string, string> = {
  ALREADY_BOOKED: "booking.error.ALREADY_BOOKED",
  BOOKING_NOT_ACTIVE: "booking.error.BOOKING_NOT_ACTIVE",
  BOOKING_NOT_FOUND: "booking.error.BOOKING_NOT_FOUND",
  BOOKING_WINDOW_CLOSED: "booking.error.BOOKING_WINDOW_CLOSED",
  CANCELLATION_WINDOW_CLOSED: "booking.error.CANCELLATION_WINDOW_CLOSED",
  CLASS_SESSION_NOT_FOUND: "booking.error.CLASS_SESSION_NOT_FOUND",
  IDEMPOTENCY_KEY_REUSED: "booking.error.IDEMPOTENCY_KEY_REUSED",
  INSUFFICIENT_CLASS_CREDITS: "booking.error.INSUFFICIENT_CLASS_CREDITS",
  LESSON_UNIT_MISMATCH: "booking.error.LESSON_UNIT_MISMATCH",
  SCHEDULE_CONFLICT: "booking.error.SCHEDULE_CONFLICT",
  SESSION_FULL: "booking.error.SESSION_FULL",
};

const waitlistErrorMessages: Record<string, string> = {
  ALREADY_BOOKED: "waitlist.error.ALREADY_BOOKED",
  ALREADY_WAITLISTED: "waitlist.error.ALREADY_WAITLISTED",
  CLASS_SESSION_NOT_FOUND: "waitlist.error.CLASS_SESSION_NOT_FOUND",
  IDEMPOTENCY_KEY_REUSED: "waitlist.error.IDEMPOTENCY_KEY_REUSED",
  INSUFFICIENT_CLASS_CREDITS: "waitlist.error.INSUFFICIENT_CLASS_CREDITS",
  SCHEDULE_CONFLICT: "waitlist.error.SCHEDULE_CONFLICT",
  SESSION_NOT_FULL: "waitlist.error.SESSION_NOT_FULL",
  WAITLIST_ENTRY_NOT_ACTIVE: "waitlist.error.WAITLIST_ENTRY_NOT_ACTIVE",
  WAITLIST_ENTRY_NOT_FOUND: "waitlist.error.WAITLIST_ENTRY_NOT_FOUND",
  WAITLIST_NOT_OPEN: "waitlist.error.WAITLIST_NOT_OPEN",
};

type DiscoveryConnection = DiscoverClassSessionsQuery["discoverClassSessions"];

export function StudentDiscoveryPanel({
  displayTimeZone,
  idempotencyKeyFactory = () => crypto.randomUUID(),
}: {
  displayTimeZone: string;
  idempotencyKeyFactory?: () => string;
}) {
  const intl = useIntl();
  const placements = useQuery(StudentPlacementsDocument);
  const options = useQuery(ClassSessionDiscoveryOptionsDocument);
  const bookings = useQuery(StudentBookingsDocument);
  const waitlistEntries = useQuery(StudentWaitlistEntriesDocument);
  const [initialized, setInitialized] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("");
  const [curriculumLevel, setCurriculumLevel] = useState<CurriculumLevel | "">("");
  const [teacherUserId, setTeacherUserId] = useState("");
  const [topicKeys, setTopicKeys] = useState<string[]>([]);
  const [localDate, setLocalDate] = useState("");
  const [appliedFilter, setAppliedFilter] = useState<ClassSessionDiscoveryInput | null>(null);
  const [placementSaved, setPlacementSaved] = useState(false);
  const [setStudentPlacement, placementMutation] = useMutation(SetStudentPlacementDocument);
  const [bookClassSession, bookingMutation] = useMutation(BookClassSessionDocument);
  const [cancelBooking, cancellationMutation] = useMutation(CancelBookingDocument);
  const [rescheduleBooking, rescheduleMutation] = useMutation(RescheduleBookingDocument);
  const [joinWaitlist, joinWaitlistMutation] = useMutation(JoinWaitlistDocument);
  const [withdrawWaitlist, withdrawWaitlistMutation] = useMutation(WithdrawWaitlistDocument);
  const [bookingStatus, setBookingStatus] = useState<"created" | "refunded" | "forfeited" | "rescheduled" | null>(null);
  const [bookingErrorCode, setBookingErrorCode] = useState<string | null>(null);
  const [waitlistStatus, setWaitlistStatus] = useState<"joined" | "withdrawn" | "promotionWon" | null>(null);
  const [waitlistErrorCode, setWaitlistErrorCode] = useState<string | null>(null);
  const [occupiedSeats, setOccupiedSeats] = useState<Record<string, number>>({});
  const [pendingAttempt, setPendingAttempt] = useState<{ action: "book" | "cancel" | "reschedule" | "joinWaitlist" | "withdrawWaitlist"; targetId: string; key: string } | null>(null);

  useEffect(() => {
    if (initialized || !placements.data || !options.data) return;
    const placement = placements.data.studentPlacements[0];
    const language = placement?.targetLanguage ?? options.data.classSessionDiscoveryOptions.targetLanguages[0] ?? "";
    const level = placement?.targetLanguage === language ? placement.curriculumLevel : "";
    setTargetLanguage(language);
    setCurriculumLevel(level);
    if (language) setAppliedFilter({
      targetLanguage: language,
      topicKeys: [],
      ...(level ? { curriculumLevel: level } : {}),
    });
    setInitialized(true);
  }, [initialized, options.data, placements.data]);

  const discovery = useQuery(
    DiscoverClassSessionsDocument,
    appliedFilter ? { variables: { input: appliedFilter } } : skipToken,
  );

  if (placements.error || options.error || !placements.data || !options.data) {
    if (placements.loading || options.loading) return <p role="status"><FormattedMessage id="discovery.loading" /></p>;
    return <p role="alert"><FormattedMessage id="discovery.error" /></p>;
  }
  if (!initialized) return <p role="status"><FormattedMessage id="discovery.loading" /></p>;

  const discoveryOptions = options.data.classSessionDiscoveryOptions;
  const connection = discovery.data?.discoverClassSessions as DiscoveryConnection | undefined;
  const nodes = connection?.nodes ?? [];
  const activeBookingList = readFragment(BookingFieldsFragmentDoc, bookings.data?.studentBookings ?? [])
    .filter((booking) => booking.state === "ACTIVE");
  const activeBookings = new Map(activeBookingList
    .map((booking) => [booking.classSession.id, booking]));
  const activeWaitlistList = readFragment(
    WaitlistEntryFieldsFragmentDoc,
    waitlistEntries.data?.studentWaitlistEntries ?? [],
  ).filter((entry) => entry.state === "ACTIVE");
  const activeWaitlists = new Map(activeWaitlistList.map((entry) => [entry.classSession.id, entry]));
  const bookingBusy = bookingMutation.loading || cancellationMutation.loading || rescheduleMutation.loading;
  const waitlistBusy = joinWaitlistMutation.loading || withdrawWaitlistMutation.loading;

  async function book(sessionId: string) {
    setBookingStatus(null);
    setBookingErrorCode(null);
    const attempt = pendingAttempt?.action === "book" && pendingAttempt.targetId === sessionId
      ? pendingAttempt
      : { action: "book" as const, targetId: sessionId, key: idempotencyKeyFactory() };
    setPendingAttempt(attempt);
    try {
      const result = (await bookClassSession({
        variables: { input: { idempotencyKey: attempt.key, classSessionId: sessionId } },
        refetchQueries: [StudentBookingsDocument],
        awaitRefetchQueries: true,
      })).data?.bookClassSession;
      if (result?.__typename === "BookClassSessionSuccess") {
        const booking = readFragment(BookingFieldsFragmentDoc, result.booking);
        setOccupiedSeats((current) => ({ ...current, [sessionId]: booking.classSession.occupiedSeats }));
        setBookingStatus("created");
      } else if (result?.__typename === "BookingError") {
        setBookingErrorCode(result.code);
      }
      setPendingAttempt(null);
    } catch {
      setBookingErrorCode("UNEXPECTED");
    }
  }

  async function cancel(bookingId: string, sessionId: string) {
    setBookingStatus(null);
    setBookingErrorCode(null);
    const attempt = pendingAttempt?.action === "cancel" && pendingAttempt.targetId === bookingId
      ? pendingAttempt
      : { action: "cancel" as const, targetId: bookingId, key: idempotencyKeyFactory() };
    setPendingAttempt(attempt);
    try {
      const result = (await cancelBooking({
        variables: { input: { idempotencyKey: attempt.key, bookingId } },
        refetchQueries: [StudentBookingsDocument],
        awaitRefetchQueries: true,
      })).data?.cancelBooking;
      if (result?.__typename === "CancelBookingSuccess") {
        const booking = readFragment(BookingFieldsFragmentDoc, result.booking);
        setOccupiedSeats((current) => ({ ...current, [sessionId]: booking.classSession.occupiedSeats }));
        setBookingStatus(booking.classCreditRefunded ? "refunded" : "forfeited");
      } else if (result?.__typename === "BookingError") {
        setBookingErrorCode(result.code);
      }
      setPendingAttempt(null);
    } catch {
      setBookingErrorCode("UNEXPECTED");
    }
  }

  async function reschedule(bookingId: string, replacementClassSessionId: string) {
    setBookingStatus(null);
    setBookingErrorCode(null);
    const attemptTarget = `${bookingId}:${replacementClassSessionId}`;
    const attempt = pendingAttempt?.action === "reschedule" && pendingAttempt.targetId === attemptTarget
      ? pendingAttempt
      : { action: "reschedule" as const, targetId: attemptTarget, key: idempotencyKeyFactory() };
    setPendingAttempt(attempt);
    try {
      const result = (await rescheduleBooking({
        variables: { input: { idempotencyKey: attempt.key, bookingId, replacementClassSessionId } },
        refetchQueries: [StudentBookingsDocument],
        awaitRefetchQueries: true,
      })).data?.rescheduleBooking;
      if (result?.__typename === "RescheduleBookingSuccess") {
        const original = readFragment(BookingFieldsFragmentDoc, result.originalBooking);
        const replacement = readFragment(BookingFieldsFragmentDoc, result.replacementBooking);
        setOccupiedSeats((current) => ({
          ...current,
          [original.classSession.id]: original.classSession.occupiedSeats,
          [replacement.classSession.id]: replacement.classSession.occupiedSeats,
        }));
        setBookingStatus("rescheduled");
      } else if (result?.__typename === "BookingError") {
        setBookingErrorCode(result.code);
      }
      setPendingAttempt(null);
    } catch {
      setBookingErrorCode("UNEXPECTED");
    }
  }

  async function join(sessionId: string) {
    setWaitlistStatus(null);
    setWaitlistErrorCode(null);
    const attempt = pendingAttempt?.action === "joinWaitlist" && pendingAttempt.targetId === sessionId
      ? pendingAttempt
      : { action: "joinWaitlist" as const, targetId: sessionId, key: idempotencyKeyFactory() };
    setPendingAttempt(attempt);
    try {
      const result = (await joinWaitlist({
        variables: { input: { idempotencyKey: attempt.key, classSessionId: sessionId } },
        refetchQueries: [StudentWaitlistEntriesDocument],
        awaitRefetchQueries: true,
      })).data?.joinWaitlist;
      if (result?.__typename === "JoinWaitlistSuccess") setWaitlistStatus("joined");
      else if (result?.__typename === "WaitlistError") setWaitlistErrorCode(result.code);
      setPendingAttempt(null);
    } catch {
      setWaitlistErrorCode("UNEXPECTED");
    }
  }

  async function withdraw(entryId: string) {
    setWaitlistStatus(null);
    setWaitlistErrorCode(null);
    const attempt = pendingAttempt?.action === "withdrawWaitlist" && pendingAttempt.targetId === entryId
      ? pendingAttempt
      : { action: "withdrawWaitlist" as const, targetId: entryId, key: idempotencyKeyFactory() };
    setPendingAttempt(attempt);
    try {
      const result = (await withdrawWaitlist({
        variables: { input: { idempotencyKey: attempt.key, waitlistEntryId: entryId } },
        refetchQueries: [StudentWaitlistEntriesDocument, StudentBookingsDocument],
        awaitRefetchQueries: true,
      })).data?.withdrawWaitlist;
      if (result?.__typename === "WithdrawWaitlistSuccess") setWaitlistStatus("withdrawn");
      else if (result?.__typename === "WaitlistPromotionWon") setWaitlistStatus("promotionWon");
      else if (result?.__typename === "WaitlistError") setWaitlistErrorCode(result.code);
      setPendingAttempt(null);
    } catch {
      setWaitlistErrorCode("UNEXPECTED");
    }
  }

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!targetLanguage) return;
    setAppliedFilter({
      targetLanguage,
      topicKeys,
      ...(curriculumLevel ? { curriculumLevel } : {}),
      ...(teacherUserId ? { teacherUserId } : {}),
      ...(localDate ? { localDate } : {}),
    });
  }

  async function savePlacement() {
    if (!targetLanguage || !curriculumLevel) return;
    setPlacementSaved(false);
    try {
      await setStudentPlacement({
        variables: { input: { targetLanguage, curriculumLevel } },
        refetchQueries: [StudentPlacementsDocument],
      });
      setAppliedFilter((current) => ({
        ...(current ?? { topicKeys: [] }),
        targetLanguage,
        curriculumLevel,
      }));
      setPlacementSaved(true);
    } catch {
      // Apollo exposes the localized-safe error state below.
    }
  }

  return (
    <section className="student-discovery" aria-labelledby="student-discovery-title">
      <h2 id="student-discovery-title"><FormattedMessage id="discovery.title" /></h2>
      <form onSubmit={search}>
        <fieldset>
          <legend><FormattedMessage id="discovery.filters" /></legend>
          <label>
            <FormattedMessage id="discovery.targetLanguage" />
            <select value={targetLanguage} onChange={(event) => {
              const language = event.target.value;
              setTargetLanguage(language);
              const placement = placements.data?.studentPlacements.find((candidate) => candidate.targetLanguage === language);
              setCurriculumLevel(placement?.curriculumLevel ?? "");
            }} required>
              {discoveryOptions.targetLanguages.map((language) => <option key={language} value={language}>{language}</option>)}
            </select>
          </label>
          <label>
            <FormattedMessage id="discovery.curriculumLevel" />
            <select value={curriculumLevel} onChange={(event) => setCurriculumLevel(event.target.value as CurriculumLevel | "")}>
              <option value=""><FormattedMessage id="discovery.anyLevel" /></option>
              {curriculumLevels.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </label>
          <button type="button" disabled={!curriculumLevel || placementMutation.loading} onClick={() => void savePlacement()}>
            <FormattedMessage id="discovery.savePlacement" />
          </button>
          {placementSaved && <p role="status"><FormattedMessage id="discovery.placementSaved" /></p>}
          {placementMutation.error && <p role="alert"><FormattedMessage id="discovery.error" /></p>}
          <label>
            <FormattedMessage id="discovery.teacher" />
            <select value={teacherUserId} onChange={(event) => setTeacherUserId(event.target.value)}>
              <option value=""><FormattedMessage id="discovery.anyTeacher" /></option>
              {discoveryOptions.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.displayName}</option>)}
            </select>
          </label>
          <fieldset>
            <legend><FormattedMessage id="discovery.topics" /></legend>
            {discoveryOptions.topics.map((topic) => (
              <label key={topic.key}>
                <input
                  type="checkbox"
                  checked={topicKeys.includes(topic.key)}
                  onChange={(event) => setTopicKeys((selected) => event.target.checked
                    ? [...selected, topic.key]
                    : selected.filter((key) => key !== topic.key))}
                />
                {topic.label}
              </label>
            ))}
          </fieldset>
          <label>
            <FormattedMessage id="discovery.localDate" />
            <input type="date" value={localDate} onChange={(event) => setLocalDate(event.target.value)} aria-describedby="discovery-local-date-help" />
          </label>
          <p id="discovery-local-date-help"><FormattedMessage id="discovery.localDateHelp" values={{ timeZone: displayTimeZone }} /></p>
          <button type="submit"><FormattedMessage id="discovery.search" /></button>
        </fieldset>
      </form>

      {discovery.loading && <p role="status"><FormattedMessage id="discovery.loading" /></p>}
      {discovery.error && <p role="alert"><FormattedMessage id="discovery.error" /></p>}
      {bookingStatus && <p role="status"><FormattedMessage id={bookingStatus === "created" ? "booking.created" : bookingStatus === "refunded" ? "booking.cancelled.refunded" : bookingStatus === "forfeited" ? "booking.cancelled.forfeited" : "booking.rescheduled"} /></p>}
      {bookingErrorCode && <p role="alert"><FormattedMessage id={bookingErrorMessages[bookingErrorCode] ?? "booking.error"} /></p>}
      {waitlistStatus && <p role="status"><FormattedMessage id={
        waitlistStatus === "joined"
          ? "waitlist.joined"
          : waitlistStatus === "withdrawn"
            ? "waitlist.withdrawn"
            : "waitlist.promotionWon"
      } /></p>}
      {waitlistErrorCode && <p role="alert"><FormattedMessage id={waitlistErrorMessages[waitlistErrorCode] ?? "waitlist.error"} /></p>}
      {waitlistEntries.error && <p role="alert"><FormattedMessage id="waitlist.error" /></p>}
      {activeBookingList.length > 0 && (
        <section aria-labelledby="student-active-bookings">
          <h3 id="student-active-bookings"><FormattedMessage id="booking.activeTitle" /></h3>
          <ul>{activeBookingList.map((booking) => (
            <li key={booking.id}>
              <FormattedDate value={booking.classSession.startsAt} timeZone={displayTimeZone} dateStyle="long" />{" "}
              <FormattedTime value={booking.classSession.startsAt} timeZone={displayTimeZone} />
              <button
                type="button"
                disabled={bookingBusy}
                aria-label={intl.formatMessage(
                  { id: "booking.cancelFor" },
                  { startsAt: new Date(booking.classSession.startsAt) },
                )}
                onClick={() => void cancel(booking.id, booking.classSession.id)}
              >
                <FormattedMessage id={cancellationMutation.loading ? "booking.cancelling" : "booking.cancelAction"} />
              </button>
            </li>
          ))}</ul>
        </section>
      )}
      {!discovery.loading && !discovery.error && nodes.length === 0 && <p><FormattedMessage id="discovery.none" /></p>}
      {nodes.length > 0 && (
        <section aria-labelledby="student-discovery-results">
          <h3 id="student-discovery-results"><FormattedMessage id="discovery.results" /></h3>
          <ul>
            {nodes.map((session) => {
              const activeBooking = activeBookings.get(session.id);
              const activeWaitlist = activeWaitlists.get(session.id);
              const reschedulableBookings = activeBookingList.filter((booking) =>
                booking.classSession.lessonUnitId === session.lessonUnit.id
                && booking.classSession.id !== session.id);
              const displayedOccupiedSeats = occupiedSeats[session.id] ?? session.occupiedSeats;
              return (
              <li key={session.id} className="discovery-card">
                <article>
                  <h4>{session.lessonUnit.title}</h4>
                  <p>
                    <FormattedDate value={session.startsAt} timeZone={displayTimeZone} dateStyle="long" />{" "}
                    <FormattedTime value={session.startsAt} timeZone={displayTimeZone} />–<FormattedTime value={session.endsAt} timeZone={displayTimeZone} />
                  </p>
                  <p>{session.lessonUnit.summary}</p>
                  <p>
                    <FormattedMessage
                      id={displayedOccupiedSeats === session.seatCapacity ? "discovery.waitlistOpen" : "discovery.seatsAvailable"}
                      values={{ occupied: displayedOccupiedSeats, total: session.seatCapacity }}
                    />
                  </p>
                  <p>{session.lessonUnit.topics.map(({ label }) => label).join(", ")}</p>
                  <h5><FormattedMessage id="discovery.objectives" /></h5>
                  <ul>{session.lessonUnit.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul>
                  <section aria-label={intl.formatMessage({ id: "discovery.teacherProfile" })}>
                    <h5>{session.teacherProfile.displayName}</h5>
                    {session.teacherProfile.pronouns && <p>{session.teacherProfile.pronouns}</p>}
                    {session.teacherProfile.profileImageUrl && <img src={session.teacherProfile.profileImageUrl} alt={session.teacherProfile.displayName} />}
                    <p>{session.teacherProfile.professionalBiography}</p>
                    <p><FormattedMessage id="discovery.taughtLanguages" values={{ languages: session.teacherProfile.taughtLanguages.join(", ") }} /></p>
                    <p><FormattedMessage id="discovery.qualifiedLevels" values={{ levels: session.teacherProfile.qualifiedCurriculumLevels.join(", ") }} /></p>
                    <p><FormattedMessage id="discovery.teachingTopics" values={{ topics: session.teacherProfile.teachingTopics.map(({ label }) => label).join(", ") }} /></p>
                    <p><FormattedMessage id="discovery.completedSessions" values={{ count: session.teacherProfile.completedSessionCount }} /></p>
                  </section>
                  {activeBooking ? (
                    <p><FormattedMessage id="booking.active" /></p>
                  ) : activeWaitlist ? (
                    <div>
                      <p><FormattedMessage id="waitlist.active" /></p>
                      <button
                        type="button"
                        disabled={waitlistBusy}
                        aria-label={intl.formatMessage(
                          { id: "waitlist.withdrawFor" },
                          { startsAt: new Date(session.startsAt) },
                        )}
                        onClick={() => void withdraw(activeWaitlist.id)}
                      >
                        <FormattedMessage id={withdrawWaitlistMutation.loading ? "waitlist.withdrawing" : "waitlist.withdrawAction"} />
                      </button>
                    </div>
                  ) : reschedulableBookings.length > 0 && displayedOccupiedSeats < session.seatCapacity ? (
                    <div>{reschedulableBookings.map((booking) => (
                      <button
                        key={booking.id}
                        type="button"
                        disabled={bookingBusy || bookings.loading || Boolean(bookings.error)}
                        aria-label={intl.formatMessage(
                          { id: "booking.rescheduleFromTo" },
                          {
                            originalStartsAt: new Date(booking.classSession.startsAt),
                            replacementStartsAt: new Date(session.startsAt),
                          },
                        )}
                        onClick={() => void reschedule(booking.id, session.id)}
                      >
                        <FormattedMessage id={rescheduleMutation.loading ? "booking.rescheduling" : "booking.rescheduleAction"} />
                      </button>
                    ))}</div>
                  ) : displayedOccupiedSeats < session.seatCapacity ? (
                    <button type="button" disabled={bookingBusy || bookings.loading || Boolean(bookings.error)} onClick={() => void book(session.id)}>
                      <FormattedMessage id={bookingMutation.loading ? "booking.booking" : "booking.bookAction"} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={waitlistBusy || waitlistEntries.loading || Boolean(waitlistEntries.error)}
                      onClick={() => void join(session.id)}
                    >
                      <FormattedMessage id={joinWaitlistMutation.loading ? "waitlist.joining" : "waitlist.joinAction"} />
                    </button>
                  )}
                </article>
              </li>
              );
            })}
          </ul>
          {connection?.pageInfo.hasNextPage && (
            <button type="button" onClick={() => void discovery.fetchMore({
              variables: { input: { ...appliedFilter!, after: connection.pageInfo.endCursor } },
              updateQuery: (previous, { fetchMoreResult }) => ({
                discoverClassSessions: {
                  ...fetchMoreResult.discoverClassSessions,
                  nodes: [...previous.discoverClassSessions.nodes, ...fetchMoreResult.discoverClassSessions.nodes],
                },
              }),
            })}><FormattedMessage id="discovery.loadMore" /></button>
          )}
        </section>
      )}
    </section>
  );
}
