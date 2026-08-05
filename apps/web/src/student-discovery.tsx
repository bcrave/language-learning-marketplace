import { skipToken, useMutation, useQuery } from "@apollo/client/react";
import { useEffect, useState } from "react";
import { FormattedDate, FormattedMessage, FormattedTime, useIntl } from "react-intl";

import {
  ClassSessionDiscoveryOptionsDocument,
  DiscoverClassSessionsDocument,
  SetStudentPlacementDocument,
  StudentPlacementsDocument,
  type ClassSessionDiscoveryInput,
  type CurriculumLevel,
  type DiscoverClassSessionsQuery,
} from "./generated/graphql.js";

const curriculumLevels: CurriculumLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

type DiscoveryConnection = DiscoverClassSessionsQuery["discoverClassSessions"];

export function StudentDiscoveryPanel({ displayTimeZone }: { displayTimeZone: string }) {
  const intl = useIntl();
  const placements = useQuery(StudentPlacementsDocument);
  const options = useQuery(ClassSessionDiscoveryOptionsDocument);
  const [initialized, setInitialized] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("");
  const [curriculumLevel, setCurriculumLevel] = useState<CurriculumLevel | "">("");
  const [teacherUserId, setTeacherUserId] = useState("");
  const [topicKeys, setTopicKeys] = useState<string[]>([]);
  const [localDate, setLocalDate] = useState("");
  const [appliedFilter, setAppliedFilter] = useState<ClassSessionDiscoveryInput | null>(null);
  const [placementSaved, setPlacementSaved] = useState(false);
  const [setStudentPlacement, placementMutation] = useMutation(SetStudentPlacementDocument);

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
      {!discovery.loading && !discovery.error && nodes.length === 0 && <p><FormattedMessage id="discovery.none" /></p>}
      {nodes.length > 0 && (
        <section aria-labelledby="student-discovery-results">
          <h3 id="student-discovery-results"><FormattedMessage id="discovery.results" /></h3>
          <ul>
            {nodes.map((session) => (
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
                      id={session.occupiedSeats === session.seatCapacity ? "discovery.waitlistOpen" : "discovery.seatsAvailable"}
                      values={{ occupied: session.occupiedSeats, total: session.seatCapacity }}
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
                </article>
              </li>
            ))}
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
