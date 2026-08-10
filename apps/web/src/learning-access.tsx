import { useLazyQuery, useMutation, useQuery } from "@apollo/client/react";
import { useState } from "react";
import { useIntl } from "react-intl";

import {
  EnterClassroomDocument,
  LearningAccessClassSessionsDocument,
  LessonMaterialsDocument,
  type LessonMaterialsQuery,
  type UserRole,
} from "./generated/graphql.js";

type LessonMaterial = NonNullable<LessonMaterialsQuery["lessonMaterials"]>[number];
type StructuredTextBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "emphasis"; text: string }
  | { type: "list"; items: string[] };

function structuredTextBlocks(serialized: string | null | undefined): StructuredTextBlock[] {
  if (!serialized) return [];
  try {
    const value: unknown = JSON.parse(serialized);
    if (!Array.isArray(value)) return [];
    return value.flatMap((block): StructuredTextBlock[] => {
      if (!block || typeof block !== "object" || !("type" in block)) return [];
      const record = block as Record<string, unknown>;
      if ((record.type === "heading" || record.type === "paragraph" || record.type === "emphasis") && typeof record.text === "string") {
        return [{ type: record.type, text: record.text }];
      }
      if (record.type === "list" && Array.isArray(record.items) && record.items.every((item: unknown) => typeof item === "string")) {
        return [{ type: "list", items: record.items as string[] }];
      }
      return [];
    });
  } catch {
    return [];
  }
}

function Material({ material }: { material: LessonMaterial }) {
  if (material.kind === "HTTPS_REFERENCE" && material.httpsUrl) {
    return <li>
      <a href={material.httpsUrl} target="_blank" rel="noreferrer noopener">{material.title}{material.publisher ? ` — ${material.publisher}` : ""}</a>
    </li>;
  }
  return <li>
    <article>
      <h3>{material.title}</h3>
      {structuredTextBlocks(material.structuredContent).map((block, index) => {
        if (block.type === "heading") return <h4 key={index}>{block.text}</h4>;
        if (block.type === "paragraph") return <p key={index}>{block.text}</p>;
        if (block.type === "emphasis") return <p key={index}><em>{block.text}</em></p>;
        return <ul key={index}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
      })}
    </article>
  </li>;
}

export function LearningAccessPanel({ actingRole }: { actingRole: Extract<UserRole, "STUDENT" | "TEACHER"> }) {
  const intl = useIntl();
  const { data, loading, error } = useQuery(LearningAccessClassSessionsDocument, { variables: { actingRole } });
  const [loadMaterials, { loading: loadingMaterials }] = useLazyQuery(LessonMaterialsDocument);
  const [enterClassroom, { loading: entering }] = useMutation(EnterClassroomDocument);
  const [selectedLessonUnitId, setSelectedLessonUnitId] = useState<string | null>(null);
  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [failure, setFailure] = useState(false);

  if (loading) return <p role="status">{intl.formatMessage({ id: "learningAccess.loading" })}</p>;
  if (error || !data) return <p role="alert">{intl.formatMessage({ id: "learningAccess.loadError" })}</p>;

  async function openMaterials(lessonUnitId: string) {
    setFailure(false);
    setStatus(null);
    try {
      const result = await loadMaterials({ variables: { lessonUnitId, actingRole } });
      if (!result.data?.lessonMaterials) throw new Error("Lesson Materials unavailable");
      setSelectedLessonUnitId(lessonUnitId);
      setMaterials([...result.data.lessonMaterials]);
    } catch {
      setFailure(true);
    }
  }

  async function enter(classSessionId: string) {
    setFailure(false);
    setStatus(null);
    try {
      const result = await enterClassroom({ variables: { input: { classSessionId, actingRole } } });
      if (result.data?.enterClassroom.__typename !== "EnterClassroomSuccess") {
        setFailure(true);
        return;
      }
      setStatus(intl.formatMessage({ id: "learningAccess.classroomReady" }));
    } catch {
      setFailure(true);
    }
  }

  return <section className="workspace-card" aria-labelledby="learning-access-title">
    <h2 id="learning-access-title">{intl.formatMessage({ id: "learningAccess.title" })}</h2>
    <p>{intl.formatMessage({ id: "learningAccess.help" })}</p>
    {status && <p role="status">{status}</p>}
    {failure && <p role="alert">{intl.formatMessage({ id: "learningAccess.error" })}</p>}
    <h3>{intl.formatMessage({ id: "learningAccess.materials" })}</h3>
    {data.learningAccessLessonUnits.length === 0 ? <p>{intl.formatMessage({ id: "learningAccess.noMaterials" })}</p> : <ul>
      {data.learningAccessLessonUnits.map((lessonUnit) => <li key={lessonUnit.id}>
        <h4>{lessonUnit.title}</h4>
        <button type="button" disabled={loadingMaterials} onClick={() => void openMaterials(lessonUnit.id)}>{intl.formatMessage({ id: "learningAccess.openMaterials" })}</button>
        {selectedLessonUnitId === lessonUnit.id && (materials.length === 0 ? <p>{intl.formatMessage({ id: "learningAccess.noMaterials" })}</p> : <ul>{materials.map((material) => <Material key={material.id} material={material} />)}</ul>)}
      </li>)}
    </ul>}
    <h3>{intl.formatMessage({ id: "learningAccess.classroom" })}</h3>
    {data.learningAccessClassSessions.length === 0 ? <p>{intl.formatMessage({ id: "learningAccess.none" })}</p> : <ul>
      {data.learningAccessClassSessions.map((session) => <li key={session.id}>
        <article>
          <h4>{intl.formatDate(new Date(session.startsAt), { dateStyle: "long", timeStyle: "short", timeZone: session.schedulingTimeZone })}</h4>
          <div className="button-row">
            <button type="button" disabled={entering} onClick={() => void enter(session.id)}>{intl.formatMessage({ id: "learningAccess.enterClassroom" })}</button>
          </div>
        </article>
      </li>)}
    </ul>}
  </section>;
}
