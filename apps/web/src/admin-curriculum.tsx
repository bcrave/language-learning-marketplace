import { useMutation, useQuery } from "@apollo/client/react";
import { useState } from "react";
import { useIntl } from "react-intl";

import {
  AdministrationCurriculumDocument,
  AddLessonMaterialDocument,
  CreateCourseDocument,
  CreateLessonUnitDocument,
  GrantTeacherQualificationDocument,
  RemoveTeacherQualificationDocument,
  ReviseLessonMaterialDocument,
  PlaceLessonUnitInCourseDocument,
  RetireLessonUnitDocument,
  SaveTeacherProfileDocument,
  SaveLocalizedTopicDocument,
  ReviseCourseDetailsDocument,
  ReviseLessonUnitIdentityDocument,
  type CurriculumLevel,
  type InterfaceLocale,
  type StructuredTextBlockInput,
} from "./generated/graphql.js";

export function AdminCurriculum({ locale }: { locale: "en" | "es" }) {
  const intl = useIntl();
  const graphQLLocale: InterfaceLocale = locale === "es" ? "ES" : "EN";
  const { data, error, loading, refetch } = useQuery(AdministrationCurriculumDocument, { variables: { locale: graphQLLocale } });
  const [createCourse] = useMutation(CreateCourseDocument);
  const [reviseCourseDetails] = useMutation(ReviseCourseDetailsDocument);
  const [createLessonUnit] = useMutation(CreateLessonUnitDocument);
  const [retireLessonUnit] = useMutation(RetireLessonUnitDocument);
  const [reviseLessonUnitIdentity] = useMutation(ReviseLessonUnitIdentityDocument);
  const [placeLessonUnitInCourse] = useMutation(PlaceLessonUnitInCourseDocument);
  const [saveLocalizedTopic] = useMutation(SaveLocalizedTopicDocument);
  const [addLessonMaterial] = useMutation(AddLessonMaterialDocument);
  const [reviseLessonMaterial] = useMutation(ReviseLessonMaterialDocument);
  const [saveTeacherProfile] = useMutation(SaveTeacherProfileDocument);
  const [grantQualification] = useMutation(GrantTeacherQualificationDocument);
  const [removeQualification] = useMutation(RemoveTeacherQualificationDocument);
  const [message, setMessage] = useState<string | null>(null);

  if (loading) return <p role="status">{intl.formatMessage({ id: "curriculum.loading" })}</p>;
  if (error || !data) return <p role="alert">{intl.formatMessage({ id: "curriculum.error" })}</p>;

  const courses = data.administrationCurriculum.courses;
  const topics = data.administrationCurriculum.topics;
  const teachers = data.administrationCurriculum.teachers;

  async function submitCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const result = await createCourse({ variables: { input: {
      idempotencyKey: crypto.randomUUID(),
      targetLanguage: String(values.get("targetLanguage")),
      curriculumLevel: String(values.get("curriculumLevel")) as CurriculumLevel,
      title: String(values.get("title")),
      summary: String(values.get("summary")),
    } } });
    const outcome = result.data?.createCourse;
    setMessage(intl.formatMessage({ id: outcome?.__typename === "CreateCourseSuccess" ? "curriculum.courseCreated" : "curriculum.error" }));
    if (outcome?.__typename === "CreateCourseSuccess") await refetch();
  }

  async function submitLessonUnit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const result = await createLessonUnit({ variables: { input: {
      idempotencyKey: crypto.randomUUID(),
      courseId: String(values.get("courseId")),
      title: String(values.get("unitTitle")),
      summary: String(values.get("unitSummary")),
      objectives: String(values.get("objectives")).split("\n").map((value) => value.trim()).filter(Boolean),
      topicKeys: values.getAll("topicKeys").map(String),
    } } });
    const outcome = result.data?.createLessonUnit;
    setMessage(intl.formatMessage({ id: outcome?.__typename === "CreateLessonUnitSuccess" ? "curriculum.unitCreated" : "curriculum.error" }));
    if (outcome?.__typename === "CreateLessonUnitSuccess") await refetch();
  }

  async function retire(id: string, replacementLessonUnitId?: string) {
    const result = await retireLessonUnit({ variables: { input: { idempotencyKey: crypto.randomUUID(), lessonUnitId: id, replacementLessonUnitId: replacementLessonUnitId || null } } });
    const outcome = result.data?.retireLessonUnit;
    setMessage(intl.formatMessage({ id: outcome?.__typename === "RetireLessonUnitSuccess" ? "curriculum.unitRetired" : "curriculum.error" }));
    if (outcome?.__typename === "RetireLessonUnitSuccess") await refetch();
  }

  async function submitCourseUpdate(event: React.FormEvent<HTMLFormElement>, courseId: string) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const result = await reviseCourseDetails({ variables: { input: { courseId, title: String(values.get("updatedCourseTitle")), summary: String(values.get("updatedCourseSummary")) } } });
    setMessage(intl.formatMessage({ id: result.data?.reviseCourseDetails.__typename === "UpdateCourseSuccess" ? "curriculum.courseUpdated" : "curriculum.error" }));
    if (result.data?.reviseCourseDetails.__typename === "UpdateCourseSuccess") await refetch();
  }

  async function submitLessonUnitUpdate(event: React.FormEvent<HTMLFormElement>, lessonUnitId: string) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const result = await reviseLessonUnitIdentity({ variables: { input: { lessonUnitId, title: String(values.get("updatedUnitTitle")), summary: String(values.get("updatedUnitSummary")), objectives: String(values.get("updatedObjectives")).split("\n").map((value) => value.trim()).filter(Boolean), topicKeys: values.getAll("updatedTopicKeys").map(String) } } });
    setMessage(intl.formatMessage({ id: result.data?.reviseLessonUnitIdentity.__typename === "UpdateLessonUnitSuccess" ? "curriculum.unitUpdated" : result.data?.reviseLessonUnitIdentity.__typename === "InstructionalIdentityLocked" ? "curriculum.identityLocked" : "curriculum.error" }));
    if (result.data?.reviseLessonUnitIdentity.__typename === "UpdateLessonUnitSuccess") await refetch();
  }

  async function reorder(id: string, order: number) {
    const result = await placeLessonUnitInCourse({ variables: { input: { lessonUnitId: id, order } } });
    setMessage(intl.formatMessage({ id: result.data?.placeLessonUnitInCourse.__typename === "ReorderLessonUnitSuccess" ? "curriculum.unitReordered" : "curriculum.error" }));
    if (result.data?.placeLessonUnitInCourse.__typename === "ReorderLessonUnitSuccess") await refetch();
  }

  async function submitTopic(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await saveLocalizedTopic({ variables: { input: { idempotencyKey: crypto.randomUUID(), key: String(values.get("topicKey")).toUpperCase(), labelEn: String(values.get("labelEn")), labelEs: String(values.get("labelEs")) } } });
    setMessage(intl.formatMessage({ id: "curriculum.topicSaved" }));
    await refetch();
  }

  async function submitMaterial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const kind = String(values.get("materialKind"));
    const structuredContent: StructuredTextBlockInput[] = [];
    const heading = String(values.get("materialHeading")).trim();
    const paragraph = String(values.get("materialBody")).trim();
    const listItems = String(values.get("materialList")).split("\n").map((item) => item.trim()).filter(Boolean);
    const emphasis = String(values.get("materialEmphasis")).trim();
    if (heading) structuredContent.push({ type: "heading", level: 2, text: heading });
    if (paragraph) structuredContent.push({ type: "paragraph", text: paragraph });
    if (listItems.length) structuredContent.push({ type: "list", items: listItems });
    if (emphasis) structuredContent.push({ type: "emphasis", text: emphasis });
    const input = kind === "STRUCTURED_TEXT"
      ? { idempotencyKey: crypto.randomUUID(), lessonUnitId: String(values.get("materialUnitId")), kind: "STRUCTURED_TEXT" as const, title: String(values.get("materialTitle")), structuredContent }
      : { idempotencyKey: crypto.randomUUID(), lessonUnitId: String(values.get("materialUnitId")), kind: "HTTPS_REFERENCE" as const, title: String(values.get("materialTitle")), httpsUrl: String(values.get("materialUrl")), publisher: String(values.get("materialPublisher")) };
    const result = await addLessonMaterial({ variables: { input } });
    const outcome = result.data?.addLessonMaterial;
    setMessage(intl.formatMessage({ id: outcome?.__typename === "AddLessonMaterialSuccess" ? "curriculum.materialAdded" : "curriculum.error" }));
    if (outcome?.__typename === "AddLessonMaterialSuccess") await refetch();
  }

  async function submitTeacherProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await saveTeacherProfile({ variables: { input: { idempotencyKey: crypto.randomUUID(), teacherUserId: String(values.get("teacherUserId")), pronouns: String(values.get("pronouns")) || null, profileImageUrl: String(values.get("profileImageUrl")) || null, professionalBiography: String(values.get("biography")), topicKeys: values.getAll("teacherTopicKeys").map(String) } } });
    setMessage(intl.formatMessage({ id: "curriculum.profileSaved" }));
    await refetch();
  }

  async function submitMaterialRevision(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const kind = String(values.get("revisedMaterialKind"));
    const structuredContent: StructuredTextBlockInput[] = [];
    const heading = String(values.get("revisedMaterialHeading")).trim();
    const paragraph = String(values.get("revisedMaterialBody")).trim();
    const listItems = String(values.get("revisedMaterialList")).split("\n").map((item) => item.trim()).filter(Boolean);
    const emphasis = String(values.get("revisedMaterialEmphasis")).trim();
    if (heading) structuredContent.push({ type: "heading", level: 2, text: heading });
    if (paragraph) structuredContent.push({ type: "paragraph", text: paragraph });
    if (listItems.length) structuredContent.push({ type: "list", items: listItems });
    if (emphasis) structuredContent.push({ type: "emphasis", text: emphasis });
    const input = kind === "STRUCTURED_TEXT"
      ? { idempotencyKey: crypto.randomUUID(), materialId: String(values.get("materialId")), kind: "STRUCTURED_TEXT" as const, title: String(values.get("revisedMaterialTitle")), structuredContent }
      : { idempotencyKey: crypto.randomUUID(), materialId: String(values.get("materialId")), kind: "HTTPS_REFERENCE" as const, title: String(values.get("revisedMaterialTitle")), httpsUrl: String(values.get("revisedMaterialUrl")), publisher: String(values.get("revisedMaterialPublisher")) };
    const outcome = (await reviseLessonMaterial({ variables: { input } })).data?.reviseLessonMaterial;
    setMessage(intl.formatMessage({ id: outcome?.__typename === "ReviseLessonMaterialSuccess" ? "curriculum.materialRevised" : "curriculum.error" }));
    if (outcome?.__typename === "ReviseLessonMaterialSuccess") await refetch();
  }

  async function submitQualification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const input = { idempotencyKey: crypto.randomUUID(), teacherUserId: String(values.get("qualificationTeacherId")), targetLanguage: String(values.get("qualificationLanguage")), curriculumLevel: String(values.get("qualificationLevel")) as CurriculumLevel };
    const remove = values.get("qualificationAction") === "remove";
    const outcome = remove
      ? (await removeQualification({ variables: { input } })).data?.removeTeacherQualification
      : (await grantQualification({ variables: { input } })).data?.grantTeacherQualification;
    const failureMessage = intl.formatMessage({ id: outcome?.__typename === "TeacherQualificationRemovalBlocked" ? "curriculum.qualificationBlocked" : "curriculum.error" });
    setMessage(outcome?.__typename === "ChangeTeacherQualificationSuccess" ? intl.formatMessage({ id: remove ? "curriculum.qualificationRemoved" : "curriculum.qualificationGranted" }) : failureMessage);
    if (outcome?.__typename === "ChangeTeacherQualificationSuccess") await refetch();
  }

  const lessonUnits = courses.flatMap((course) => course.lessonUnits);

  return <section className="curriculum-admin" aria-labelledby="curriculum-title">
    <header>
      <div>
        <p className="sample-badge">{intl.formatMessage({ id: "curriculum.sampleBadge" })}</p>
        <h2 id="curriculum-title">{intl.formatMessage({ id: "curriculum.title" })}</h2>
      </div>
      <p>{intl.formatMessage({ id: "curriculum.notice" })}</p>
    </header>
    {message && <p role="status">{message}</p>}
    <div className="curriculum-grid">
      <div>
        <h3>{intl.formatMessage({ id: "curriculum.catalog" })}</h3>
        {courses.length === 0 && <p>{intl.formatMessage({ id: "curriculum.empty" })}</p>}
        {courses.map((course) => <article className="course-card" key={course.id}>
          <p className="course-meta">{course.targetLanguage.toUpperCase()} · {course.curriculumLevel}</p>
          <h4>{course.title}</h4><p>{course.summary}</p>
          <details><summary>{intl.formatMessage({ id: "curriculum.editCourse" })}</summary><form onSubmit={(event) => void submitCourseUpdate(event, course.id)}>
            <label>{intl.formatMessage({ id: "curriculum.courseTitle" })}<input name="updatedCourseTitle" defaultValue={course.title} required /></label>
            <label>{intl.formatMessage({ id: "curriculum.summary" })}<textarea name="updatedCourseSummary" defaultValue={course.summary} required /></label>
            <button type="submit">{intl.formatMessage({ id: "curriculum.saveCourse" })}</button>
          </form></details>
          <ol>{course.lessonUnits.map((unit) => <li key={unit.id}>
            <strong>{unit.title}</strong> <span className={`state-badge state-${unit.state.toLowerCase()}`}>{intl.formatMessage({ id: unit.state === "ACTIVE" ? "curriculum.active" : "curriculum.retired" })}</span>
            <p>{unit.summary}</p>
            <p>{unit.topics.map((topic) => topic.label).join(" · ")}</p>
            {unit.materials.map((material) => <details key={material.id}><summary>{material.title} · {material.kind}</summary>{material.structuredContent && <pre>{material.structuredContent}</pre>}{material.httpsUrl && <p><a href={material.httpsUrl} target="_blank" rel="noreferrer noopener">{material.publisher ?? material.httpsUrl}</a></p>}</details>)}
            <div className="unit-actions"><button className="text-button" disabled={unit.order === 1} type="button" onClick={() => void reorder(unit.id, unit.order - 1)}>{intl.formatMessage({ id: "curriculum.moveUp" })}</button><button className="text-button" disabled={unit.order === course.lessonUnits.length} type="button" onClick={() => void reorder(unit.id, unit.order + 1)}>{intl.formatMessage({ id: "curriculum.moveDown" })}</button></div>
            <details><summary>{intl.formatMessage({ id: "curriculum.editUnit" })}</summary><form onSubmit={(event) => void submitLessonUnitUpdate(event, unit.id)}>
              <label>{intl.formatMessage({ id: "curriculum.unitTitle" })}<input name="updatedUnitTitle" defaultValue={unit.title} required /></label>
              <label>{intl.formatMessage({ id: "curriculum.summary" })}<textarea name="updatedUnitSummary" defaultValue={unit.summary} required /></label>
              <label>{intl.formatMessage({ id: "curriculum.objectives" })}<textarea name="updatedObjectives" defaultValue={unit.objectives.join("\n")} required /></label>
              <fieldset><legend>{intl.formatMessage({ id: "curriculum.topics" })}</legend>{topics.map((topic) => <label className="check-label" key={topic.key}><input defaultChecked={unit.topics.some(({ key }) => key === topic.key)} type="checkbox" name="updatedTopicKeys" value={topic.key} />{topic.label}</label>)}</fieldset>
              <button type="submit">{intl.formatMessage({ id: "curriculum.saveUnit" })}</button>
            </form></details>
            {unit.state === "ACTIVE" && <form onSubmit={(event) => { event.preventDefault(); void retire(unit.id, String(new FormData(event.currentTarget).get("replacementLessonUnitId") ?? "")); }}><label>{intl.formatMessage({ id: "curriculum.replacement" })}<select name="replacementLessonUnitId"><option value="">{intl.formatMessage({ id: "curriculum.noReplacement" })}</option>{course.lessonUnits.filter(({ id }) => id !== unit.id).map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.title}</option>)}</select></label><button className="text-button" type="submit">{intl.formatMessage({ id: "curriculum.retire" })}</button></form>}
          </li>)}</ol>
        </article>)}
        <h3>{intl.formatMessage({ id: "curriculum.teachers" })}</h3>
        {teachers.map((teacher) => <article className="course-card" key={teacher.id}>
          <h4>{teacher.displayName}</h4>
          {teacher.profileImageUrl && <img src={teacher.profileImageUrl} alt="" />}
          <p>{teacher.professionalBiography}</p>
          <p>{intl.formatMessage({ id: "curriculum.teacherId" })}: <code>{teacher.id}</code></p>
          <p>{teacher.taughtLanguages.join(", ")} · {teacher.qualifiedCurriculumLevels.join(", ")}</p>
          <p>{teacher.teachingTopics.map(({ label }) => label).join(" · ")}</p>
        </article>)}
      </div>
      <div className="admin-forms">
        <form onSubmit={(event) => void submitCourse(event)}>
          <h3>{intl.formatMessage({ id: "curriculum.newCourse" })}</h3>
          <label>{intl.formatMessage({ id: "curriculum.targetLanguage" })}<input name="targetLanguage" pattern="[a-z]{2}" required /></label>
          <label>{intl.formatMessage({ id: "curriculum.level" })}<select name="curriculumLevel">{["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => <option key={level}>{level}</option>)}</select></label>
          <label>{intl.formatMessage({ id: "curriculum.courseTitle" })}<input name="title" required maxLength={120} /></label>
          <label>{intl.formatMessage({ id: "curriculum.summary" })}<textarea name="summary" required maxLength={500} /></label>
          <button type="submit">{intl.formatMessage({ id: "curriculum.createCourse" })}</button>
        </form>
        {courses.length > 0 && <form onSubmit={(event) => void submitLessonUnit(event)}>
          <h3>{intl.formatMessage({ id: "curriculum.newUnit" })}</h3>
          <label>{intl.formatMessage({ id: "curriculum.course" })}<select name="courseId">{courses.map((course) => <option value={course.id} key={course.id}>{course.title}</option>)}</select></label>
          <label>{intl.formatMessage({ id: "curriculum.unitTitle" })}<input name="unitTitle" required maxLength={160} /></label>
          <label>{intl.formatMessage({ id: "curriculum.summary" })}<textarea name="unitSummary" required maxLength={500} /></label>
          <label>{intl.formatMessage({ id: "curriculum.objectives" })}<textarea name="objectives" required aria-describedby="objectives-help" /></label>
          <p id="objectives-help">{intl.formatMessage({ id: "curriculum.objectivesHelp" })}</p>
          <fieldset><legend>{intl.formatMessage({ id: "curriculum.topics" })}</legend>{topics.map((topic) => <label className="check-label" key={topic.key}><input type="checkbox" name="topicKeys" value={topic.key} />{topic.label}</label>)}</fieldset>
          <button type="submit">{intl.formatMessage({ id: "curriculum.createUnit" })}</button>
        </form>}
        {lessonUnits.some((unit) => unit.materials.length > 0) && <form onSubmit={(event) => void submitMaterialRevision(event)}>
          <h3>{intl.formatMessage({ id: "curriculum.reviseMaterial" })}</h3>
          <label>{intl.formatMessage({ id: "curriculum.materialTitle" })}<select name="materialId">{lessonUnits.flatMap((unit) => unit.materials).map((material) => <option value={material.id} key={material.id}>{material.title}</option>)}</select></label>
          <label>{intl.formatMessage({ id: "curriculum.materialKind" })}<select name="revisedMaterialKind"><option value="STRUCTURED_TEXT">{intl.formatMessage({ id: "curriculum.structuredText" })}</option><option value="HTTPS_REFERENCE">{intl.formatMessage({ id: "curriculum.httpsReference" })}</option></select></label>
          <label>{intl.formatMessage({ id: "curriculum.materialTitle" })}<input name="revisedMaterialTitle" required maxLength={160} /></label>
          <label>{intl.formatMessage({ id: "curriculum.materialHeading" })}<input name="revisedMaterialHeading" maxLength={160} /></label>
          <label>{intl.formatMessage({ id: "curriculum.materialBody" })}<textarea name="revisedMaterialBody" /></label>
          <label>{intl.formatMessage({ id: "curriculum.materialList" })}<textarea name="revisedMaterialList" /></label>
          <label>{intl.formatMessage({ id: "curriculum.materialEmphasis" })}<textarea name="revisedMaterialEmphasis" maxLength={500} /></label>
          <label>{intl.formatMessage({ id: "curriculum.httpsUrl" })}<input name="revisedMaterialUrl" type="url" /></label>
          <label>{intl.formatMessage({ id: "curriculum.publisher" })}<input name="revisedMaterialPublisher" /></label>
          <button type="submit">{intl.formatMessage({ id: "curriculum.reviseMaterialAction" })}</button>
        </form>}
        <form onSubmit={(event) => void submitTopic(event)}>
          <h3>{intl.formatMessage({ id: "curriculum.manageTopic" })}</h3>
          <label>{intl.formatMessage({ id: "curriculum.topicKey" })}<input name="topicKey" pattern="[A-Za-z]{2,8}" required /></label>
          <label>{intl.formatMessage({ id: "curriculum.labelEn" })}<input name="labelEn" required maxLength={80} /></label>
          <label>{intl.formatMessage({ id: "curriculum.labelEs" })}<input name="labelEs" required maxLength={80} /></label>
          <button type="submit">{intl.formatMessage({ id: "curriculum.saveTopic" })}</button>
        </form>
        {lessonUnits.length > 0 && <form onSubmit={(event) => void submitMaterial(event)}>
          <h3>{intl.formatMessage({ id: "curriculum.addMaterial" })}</h3>
          <label>{intl.formatMessage({ id: "curriculum.unit" })}<select name="materialUnitId">{lessonUnits.map((unit) => <option value={unit.id} key={unit.id}>{unit.title}</option>)}</select></label>
          <label>{intl.formatMessage({ id: "curriculum.materialKind" })}<select name="materialKind"><option value="STRUCTURED_TEXT">{intl.formatMessage({ id: "curriculum.structuredText" })}</option><option value="HTTPS_REFERENCE">{intl.formatMessage({ id: "curriculum.httpsReference" })}</option></select></label>
          <label>{intl.formatMessage({ id: "curriculum.materialTitle" })}<input name="materialTitle" required maxLength={160} /></label>
          <label>{intl.formatMessage({ id: "curriculum.materialHeading" })}<input name="materialHeading" maxLength={160} /></label>
          <label>{intl.formatMessage({ id: "curriculum.materialBody" })}<textarea name="materialBody" /></label>
          <label>{intl.formatMessage({ id: "curriculum.materialList" })}<textarea name="materialList" /></label>
          <label>{intl.formatMessage({ id: "curriculum.materialEmphasis" })}<textarea name="materialEmphasis" maxLength={500} /></label>
          <label>{intl.formatMessage({ id: "curriculum.httpsUrl" })}<input name="materialUrl" type="url" /></label>
          <label>{intl.formatMessage({ id: "curriculum.publisher" })}<input name="materialPublisher" /></label>
          <button type="submit">{intl.formatMessage({ id: "curriculum.addMaterialAction" })}</button>
        </form>}
        <form onSubmit={(event) => void submitTeacherProfile(event)}>
          <h3>{intl.formatMessage({ id: "curriculum.teacherProfile" })}</h3>
          <label>{intl.formatMessage({ id: "curriculum.teacherUserId" })}<input name="teacherUserId" required /></label>
          <label>{intl.formatMessage({ id: "curriculum.pronouns" })}<input name="pronouns" maxLength={40} /></label>
          <label>{intl.formatMessage({ id: "curriculum.profileImageUrl" })}<input name="profileImageUrl" type="url" /></label>
          <label>{intl.formatMessage({ id: "curriculum.biography" })}<textarea name="biography" required maxLength={1000} /></label>
          <fieldset><legend>{intl.formatMessage({ id: "curriculum.teachingTopics" })}</legend>{topics.map((topic) => <label className="check-label" key={topic.key}><input type="checkbox" name="teacherTopicKeys" value={topic.key} />{topic.label}</label>)}</fieldset>
          <button type="submit">{intl.formatMessage({ id: "curriculum.saveProfile" })}</button>
        </form>
        <form onSubmit={(event) => void submitQualification(event)}>
          <h3>{intl.formatMessage({ id: "curriculum.teacherQualification" })}</h3>
          <label>{intl.formatMessage({ id: "curriculum.action" })}<select name="qualificationAction"><option value="grant">{intl.formatMessage({ id: "curriculum.grant" })}</option><option value="remove">{intl.formatMessage({ id: "curriculum.remove" })}</option></select></label>
          <label>{intl.formatMessage({ id: "curriculum.teacherUserId" })}<input name="qualificationTeacherId" required /></label>
          <label>{intl.formatMessage({ id: "curriculum.targetLanguage" })}<input name="qualificationLanguage" pattern="[a-z]{2}" required /></label>
          <label>{intl.formatMessage({ id: "curriculum.level" })}<select name="qualificationLevel">{["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => <option key={level}>{level}</option>)}</select></label>
          <button type="submit">{intl.formatMessage({ id: "curriculum.applyQualification" })}</button>
        </form>
      </div>
    </div>
  </section>;
}
