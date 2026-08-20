import { useMutation, useQuery } from "@apollo/client/react";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";

import {
  GrantRoleAssignmentDocument,
  RemoveRoleAssignmentDocument,
  ReactivateUserDocument,
  RoleAssignmentAdministrationDocument,
  SuspendUserDocument,
  type RoleAssignmentAdministrationQuery,
  type UserRole,
} from "./generated/graphql.js";

type AdministrationUser = RoleAssignmentAdministrationQuery["roleAssignmentAdministration"]["users"][number];

const roles: UserRole[] = ["STUDENT", "TEACHER", "ORGANIZATION_MANAGER", "PLATFORM_ADMINISTRATOR"];
const roleMessageIds: Record<UserRole, string> = {
  STUDENT: "role.student",
  TEACHER: "role.teacher",
  ORGANIZATION_MANAGER: "role.organizationManager",
  PLATFORM_ADMINISTRATOR: "role.platformAdministrator",
};

const errorMessageIds: Record<string, string> = {
  INVALID_REASON: "roleAssignments.error.INVALID_REASON",
  USER_NOT_FOUND: "roleAssignments.error.USER_NOT_FOUND",
  ROLE_ALREADY_ASSIGNED: "roleAssignments.error.ROLE_ALREADY_ASSIGNED",
  ROLE_NOT_ASSIGNED: "roleAssignments.error.ROLE_NOT_ASSIGNED",
  ORGANIZATION_REQUIRED: "roleAssignments.error.ORGANIZATION_REQUIRED",
  ORGANIZATION_NOT_FOUND: "roleAssignments.error.ORGANIZATION_NOT_FOUND",
  FINAL_PLATFORM_ADMINISTRATOR: "roleAssignments.error.FINAL_PLATFORM_ADMINISTRATOR",
  SELF_PLATFORM_ADMINISTRATOR_REMOVAL: "roleAssignments.error.SELF_PLATFORM_ADMINISTRATOR_REMOVAL",
  TEACHER_ASSIGNMENTS_REQUIRE_RESOLUTION: "roleAssignments.error.TEACHER_ASSIGNMENTS_REQUIRE_RESOLUTION",
  IDEMPOTENCY_KEY_REUSED: "roleAssignments.error.IDEMPOTENCY_KEY_REUSED",
  USER_ALREADY_SUSPENDED: "roleAssignments.error.USER_ALREADY_SUSPENDED",
  USER_NOT_SUSPENDED: "roleAssignments.error.USER_NOT_SUSPENDED",
  SELF_SUSPENSION: "roleAssignments.error.SELF_SUSPENSION",
  FINAL_ACTIVE_PLATFORM_ADMINISTRATOR: "roleAssignments.error.FINAL_ACTIVE_PLATFORM_ADMINISTRATOR",
  PUBLIC_DEMONSTRATION_PROTECTED: "roleAssignments.error.PUBLIC_DEMONSTRATION_PROTECTED",
};

type AdministrationAction = "GRANT" | "REMOVE" | "SUSPEND" | "REACTIVATE";

export function RoleAssignmentAdministrationPanel({
  idempotencyKeyFactory = () => crypto.randomUUID(),
}: {
  idempotencyKeyFactory?: () => string;
}) {
  const intl = useIntl();
  const { data, error, loading } = useQuery(RoleAssignmentAdministrationDocument);
  const [grant, { loading: granting }] = useMutation(GrantRoleAssignmentDocument);
  const [remove, { loading: removing }] = useMutation(RemoveRoleAssignmentDocument);
  const [suspend, { loading: suspending }] = useMutation(SuspendUserDocument);
  const [reactivate, { loading: reactivating }] = useMutation(ReactivateUserDocument);
  const [users, setUsers] = useState<AdministrationUser[]>([]);
  const [action, setAction] = useState<AdministrationAction>("GRANT");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<UserRole>("STUDENT");
  const [organizationId, setOrganizationId] = useState("");
  const [reason, setReason] = useState("");
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ message: string; classSessionIds: string[] } | null>(null);

  useEffect(() => {
    if (!data) return;
    setUsers(data.roleAssignmentAdministration.users);
    setUserId((current) => current || data.roleAssignmentAdministration.users[0]?.id || "");
  }, [data]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAnnouncement(null);
    setFailure(null);
    const roleInput = {
      idempotencyKey: idempotencyKeyFactory(),
      userId,
      role,
      reason,
      organizationId: role === "ORGANIZATION_MANAGER" && action === "GRANT" ? organizationId || null : null,
    };
    const accessInput = { idempotencyKey: roleInput.idempotencyKey, userId, reason };
    try {
      const result = action === "GRANT"
        ? (await grant({ variables: { input: roleInput } })).data?.grantRoleAssignment
        : action === "REMOVE"
          ? (await remove({ variables: { input: roleInput } })).data?.removeRoleAssignment
          : action === "SUSPEND"
            ? (await suspend({ variables: { input: accessInput } })).data?.suspendUser
            : (await reactivate({ variables: { input: { idempotencyKey: accessInput.idempotencyKey, userId } } })).data?.reactivateUser;
      if (result && "user" in result) {
        setUsers((current) => current.map((candidate) => candidate.id === result.user.id ? result.user : candidate));
        setReason("");
        const announcementId = {
          GRANT: "roleAssignments.granted",
          REMOVE: "roleAssignments.removed",
          SUSPEND: "roleAssignments.suspended",
          REACTIVATE: "roleAssignments.reactivated",
        }[action];
        setAnnouncement(intl.formatMessage({ id: announcementId }));
        return;
      }
      if (result && "message" in result) {
        setFailure({
          message: intl.formatMessage({ id: errorMessageIds[result.code] ?? "roleAssignments.changeError" }),
          classSessionIds: "classSessionIds" in result && Array.isArray(result.classSessionIds) ? result.classSessionIds : [],
        });
        return;
      }
      setFailure({ message: intl.formatMessage({ id: "roleAssignments.changeError" }), classSessionIds: [] });
    } catch {
      setFailure({ message: intl.formatMessage({ id: "roleAssignments.changeError" }), classSessionIds: [] });
    }
  }

  if (loading) return <p role="status">{intl.formatMessage({ id: "roleAssignments.loading" })}</p>;
  if (error || !data) return <p role="alert">{intl.formatMessage({ id: "roleAssignments.loadError" })}</p>;

  return (
    <section className="workspace-card admin-forms" aria-labelledby="role-assignments-title">
      <h2 id="role-assignments-title">{intl.formatMessage({ id: "roleAssignments.title" })}</h2>
      <p>{intl.formatMessage({ id: "roleAssignments.help" })}</p>
      <form onSubmit={(event) => void submit(event)}>
        <label htmlFor="role-assignment-user">{intl.formatMessage({ id: "roleAssignments.user" })}</label>
        <select id="role-assignment-user" required value={userId} onChange={(event) => setUserId(event.target.value)}>
          {users.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.displayName}</option>)}
        </select>
        <label htmlFor="role-assignment-action">{intl.formatMessage({ id: "roleAssignments.action" })}</label>
        <select id="role-assignment-action" value={action} onChange={(event) => setAction(event.target.value as AdministrationAction)}>
          <option value="GRANT">{intl.formatMessage({ id: "roleAssignments.action.grant" })}</option>
          <option value="REMOVE">{intl.formatMessage({ id: "roleAssignments.action.remove" })}</option>
          <option value="SUSPEND">{intl.formatMessage({ id: "roleAssignments.action.suspend" })}</option>
          <option value="REACTIVATE">{intl.formatMessage({ id: "roleAssignments.action.reactivate" })}</option>
        </select>
        {(action === "GRANT" || action === "REMOVE") && <>
          <label htmlFor="role-assignment-role">{intl.formatMessage({ id: "roleAssignments.role" })}</label>
          <select id="role-assignment-role" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
            {roles.map((candidate) => <option key={candidate} value={candidate}>{intl.formatMessage({ id: roleMessageIds[candidate] })}</option>)}
          </select>
        </>}
        {action === "GRANT" && role === "ORGANIZATION_MANAGER" && <>
          <label htmlFor="role-assignment-organization">{intl.formatMessage({ id: "roleAssignments.organization" })}</label>
          <select id="role-assignment-organization" required value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
            <option value="">{intl.formatMessage({ id: "roleAssignments.chooseOrganization" })}</option>
            {data.roleAssignmentAdministration.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </select>
        </>}
        {action !== "REACTIVATE" && <>
          <label htmlFor="role-assignment-reason">{intl.formatMessage({ id: "roleAssignments.reason" })}</label>
          <input id="role-assignment-reason" minLength={3} maxLength={200} required value={reason} onChange={(event) => setReason(event.target.value)} />
        </>}
        <button disabled={granting || removing || suspending || reactivating || !userId} type="submit">
          {intl.formatMessage({ id: {
            GRANT: "roleAssignments.grant",
            REMOVE: "roleAssignments.remove",
            SUSPEND: "roleAssignments.suspend",
            REACTIVATE: "roleAssignments.reactivate",
          }[action] })}
        </button>
      </form>
      {announcement && <p role="status">{announcement}</p>}
      {failure && <div role="alert">
        <p>{failure.message}</p>
        {failure.classSessionIds.length > 0 && <><p>{intl.formatMessage({ id: "roleAssignments.futureAssignments" })}</p><ul>{failure.classSessionIds.map((id) => <li key={id}>{id}</li>)}</ul></>}
      </div>}
      <div className="role-assignment-users">
        {users.map((candidate) => <article key={candidate.id} aria-labelledby={`role-user-${candidate.id}`}>
          <h3 id={`role-user-${candidate.id}`}>{candidate.displayName}</h3>
          <p>{candidate.id}</p>
          <p>{candidate.accessStatus === "SUSPENDED"
            ? intl.formatMessage({ id: "roleAssignments.access.suspended" }, { reason: candidate.suspensionReason })
            : intl.formatMessage({ id: "roleAssignments.access.active" })}</p>
          <h4>{intl.formatMessage({ id: "roleAssignments.activeRoles" })}</h4>
          {candidate.roles.length === 0 ? <p>{intl.formatMessage({ id: "roleAssignments.noRoles" })}</p> : <ul>{candidate.roles.map((assignedRole) => <li key={assignedRole}>{intl.formatMessage({ id: roleMessageIds[assignedRole] })}</li>)}</ul>}
          <h4>{intl.formatMessage({ id: "roleAssignments.history" })}</h4>
          {candidate.roleAssignmentHistory.length === 0 ? <p>{intl.formatMessage({ id: "roleAssignments.noHistory" })}</p> : <ol>{candidate.roleAssignmentHistory.map((change) => <li key={change.id}>
            {intl.formatMessage({ id: change.action === "GRANTED" ? "roleAssignments.history.granted" : "roleAssignments.history.removed" }, { role: intl.formatMessage({ id: roleMessageIds[change.role] }), reason: change.reason, changedAt: intl.formatDate(change.changedAt, { dateStyle: "medium", timeStyle: "short" }) })}
          </li>)}</ol>}
        </article>)}
      </div>
    </section>
  );
}
