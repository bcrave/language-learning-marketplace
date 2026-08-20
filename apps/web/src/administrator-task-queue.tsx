import { useMutation, useQuery } from "@apollo/client/react";
import { useState } from "react";
import { FormattedMessage } from "react-intl";

import { AdministratorTasksDocument, ResolveAdministratorTaskDocument } from "./generated/graphql.js";

export function AdministratorTaskQueue({ createIdempotencyKey = () => crypto.randomUUID() }: { createIdempotencyKey?: () => string }) {
  const { data, error, loading } = useQuery(AdministratorTasksDocument);
  const [resolveTask] = useMutation(ResolveAdministratorTaskDocument);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(() => new Set());
  const [resolutionReasons, setResolutionReasons] = useState<Record<string, string>>({});
  if (loading) return <p role="status"><FormattedMessage id="administratorTasks.loading" /></p>;
  if (error) return <p role="alert"><FormattedMessage id="administratorTasks.error" /></p>;
  const tasks = (data?.administratorTasks ?? []).filter((task) => !resolvedIds.has(task.id));

  return (
    <section className="workspace-card" aria-labelledby="administrator-task-title">
      <h2 id="administrator-task-title"><FormattedMessage id="administratorTasks.title" /></h2>
      {tasks.length === 0 && <p><FormattedMessage id="administratorTasks.empty" /></p>}
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            <p><FormattedMessage id={task.kind === "USER_SUSPENSION_TEACHER_ASSIGNMENT" ? "administratorTasks.userSuspensionTeacherAssignment" : "administratorTasks.notificationDelivery"} /></p>
            <dl>
              <dt><FormattedMessage id="administratorTasks.correlation" /></dt><dd>{task.correlationReference}</dd>
              {task.kind === "USER_SUSPENSION_TEACHER_ASSIGNMENT" ? <>
                <dt><FormattedMessage id="administratorTasks.classSession" /></dt><dd>{task.safeContext.classSessionId}</dd>
              </> : <>
                <dt><FormattedMessage id="administratorTasks.channel" /></dt><dd>{task.safeContext.channel}</dd>
                <dt><FormattedMessage id="administratorTasks.message" /></dt><dd>{task.safeContext.messageId}</dd>
              </>}
            </dl>
            <label htmlFor={`task-reason-${task.id}`}><FormattedMessage id="administratorTasks.reason" /></label>
            <input id={`task-reason-${task.id}`} value={resolutionReasons[task.id] ?? ""} onChange={(event) => setResolutionReasons((current) => ({ ...current, [task.id]: event.target.value }))} />
            <button type="button" onClick={async () => {
              const result = await resolveTask({ variables: { input: { idempotencyKey: createIdempotencyKey(), taskId: task.id, reason: resolutionReasons[task.id]! } } });
              if (result.data?.resolveAdministratorTask.__typename !== "ResolveAdministratorTaskSuccess") return;
              setResolvedIds((current) => new Set(current).add(task.id));
            }} disabled={(resolutionReasons[task.id]?.trim().length ?? 0) < 10}><FormattedMessage id="administratorTasks.resolve" /></button>
          </li>
        ))}
      </ul>
      {resolvedIds.size > 0 && <p role="status"><FormattedMessage id="administratorTasks.resolved" /></p>}
    </section>
  );
}
