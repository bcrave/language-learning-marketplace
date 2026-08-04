import type { ApolloClient } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { interfaceMessages, type InterfaceLocale } from "@marketplace/core";
import { useCallback, useState } from "react";
import { createIntl } from "react-intl";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  type RouteObject,
  useLocation,
  useNavigate,
} from "react-router-dom";

import type { UserRole, WorkspacePlace } from "./generated/graphql.js";
import { suggestedInterfaceLocale } from "./interface-locale.js";
import {
  RoleWorkspaceScreen,
  workspacePlacePresentation,
} from "./student-workspace.js";

const roleLabelMessageIds: Record<UserRole, string> = {
  STUDENT: "role.student",
  TEACHER: "role.teacher",
  ORGANIZATION_MANAGER: "role.organizationManager",
  PLATFORM_ADMINISTRATOR: "role.platformAdministrator",
};

const defaultPlaces: Record<UserRole, WorkspacePlace> = {
  STUDENT: "STUDENT_DISCOVERY",
  TEACHER: "TEACHER_SCHEDULE",
  ORGANIZATION_MANAGER: "ORGANIZATION_STUDENTS",
  PLATFORM_ADMINISTRATOR: "ADMINISTRATION_OPERATIONS",
};

function defaultPath(role: UserRole) {
  return workspacePlacePresentation[defaultPlaces[role]].path;
}

function rememberedPath(role: UserRole) {
  try {
    const places = JSON.parse(
      window.sessionStorage.getItem("marketplace.rolePaths") ?? "{}",
    ) as Partial<Record<UserRole, string>>;
    return places[role] ?? defaultPath(role);
  } catch {
    return defaultPath(role);
  }
}

function GuardedWorkspaceRoute({
  allowInitialDefault = false,
  actingRole,
  place,
  preferRememberedPlace = false,
}: {
  allowInitialDefault?: boolean;
  actingRole: UserRole;
  place: WorkspacePlace;
  preferRememberedPlace?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const savedLocale = window.sessionStorage.getItem("marketplace.locale");
  const locale: InterfaceLocale = savedLocale === "en" || savedLocale === "es"
    ? savedLocale
    : suggestedInterfaceLocale();
  const intl = createIntl({ locale, messages: interfaceMessages[locale] });
  const storedRole = window.sessionStorage.getItem(
    "marketplace.actingRole",
  ) as UserRole | null;
  const explicitRole = (location.state as { explicitRole?: UserRole } | null)
    ?.explicitRole;
  const [confirmedRole, setConfirmedRole] = useState<UserRole | null>(
    storedRole === actingRole ||
      explicitRole === actingRole ||
      (allowInitialDefault && storedRole === null)
      ? actingRole
      : null,
  );
  const confirmed =
    confirmedRole === actingRole ||
    explicitRole === actingRole ||
    storedRole === actingRole;
  const consumeExplicitRole = useCallback(() => {
    if (explicitRole !== actingRole) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [actingRole, explicitRole, location.pathname, navigate]);

  if (!confirmed && storedRole !== actingRole) {
    const returnRole = storedRole ?? "STUDENT";
    return (
      <main className="deep-link-guard">
        <p className="eyebrow">
          {intl.formatMessage({ id: "workspace.deepLink.eyebrow" })}
        </p>
        <h1>
          {intl.formatMessage(
            { id: "workspace.deepLink.heading" },
            { role: intl.formatMessage({ id: roleLabelMessageIds[actingRole] }) },
          )}
        </h1>
        <p>{intl.formatMessage({ id: "workspace.deepLink.explanation" })}</p>
        <div className="guard-actions">
          <button
            type="button"
            onClick={() => setConfirmedRole(actingRole)}
          >
            {intl.formatMessage(
              { id: "workspace.deepLink.change" },
              { role: intl.formatMessage({ id: roleLabelMessageIds[actingRole] }) },
            )}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() =>
              navigate(
                storedRole ? rememberedPath(storedRole) : "/student",
                storedRole
                  ? { replace: true }
                  : { replace: true, state: { explicitRole: "STUDENT" } },
              )
            }
          >
            {intl.formatMessage(
              { id: "workspace.deepLink.return" },
              { role: intl.formatMessage({ id: roleLabelMessageIds[returnRole] }) },
            )}
          </button>
        </div>
      </main>
    );
  }

  return (
    <RoleWorkspaceScreen
      actingRole={actingRole}
      currentPlace={place}
      onRoleAuthorized={consumeExplicitRole}
      preferRememberedPlace={preferRememberedPlace}
      onAccessDenied={() =>
        navigate(storedRole ? rememberedPath(storedRole) : "/student", {
          replace: true,
          state: storedRole ? undefined : { explicitRole: "STUDENT" },
        })
      }
    />
  );
}

function SafeReturnRoute() {
  const storedRole = window.sessionStorage.getItem(
    "marketplace.actingRole",
  ) as UserRole | null;
  return storedRole ? (
    <Navigate replace to={rememberedPath(storedRole)} />
  ) : (
    <Navigate replace state={{ explicitRole: "STUDENT" }} to="/student" />
  );
}

function StudentLandingRoute() {
  const storedRole = window.sessionStorage.getItem(
    "marketplace.actingRole",
  ) as UserRole | null;
  return (
    <GuardedWorkspaceRoute
      actingRole="STUDENT"
      allowInitialDefault={storedRole === null}
      place="STUDENT_DISCOVERY"
      preferRememberedPlace
    />
  );
}

export const workspaceRouteObjects: RouteObject[] = [
  {
    path: "/student",
    element: <StudentLandingRoute />,
  },
  ...Object.entries(workspacePlacePresentation).map(
    ([place, presentation]): RouteObject => ({
      path: presentation.path,
      element: (
        <GuardedWorkspaceRoute
          actingRole={presentation.role}
          place={place as WorkspacePlace}
        />
      ),
    }),
  ),
  { path: "*", element: <SafeReturnRoute /> },
];

const browserRouter = createBrowserRouter(workspaceRouteObjects);

export function App({ client }: { client: ApolloClient }) {
  return (
    <ApolloProvider client={client}>
      <RouterProvider router={browserRouter} />
    </ApolloProvider>
  );
}
