import {
  interfaceMessages,
  namedRegionalTimeZones,
  type InterfaceLocale,
} from "@marketplace/core";
import { Temporal } from "@js-temporal/polyfill";
import { useMutation, useQuery } from "@apollo/client/react";
import { useEffect, useRef, useState } from "react";
import { FormattedMessage, IntlProvider, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import {
  RememberRoleWorkspacePlaceDocument,
  RoleWorkspaceDocument,
  SaveUserPreferencesDocument,
  StudentWorkspaceDocument,
} from "./generated/graphql.js";
import type {
  InterfaceLocale as GraphQLInterfaceLocale,
  UserRole,
  WorkspacePlace,
  WorkspaceRelationshipScope,
} from "./generated/graphql.js";
import {
  suggestedDisplayTimeZone,
  suggestedInterfaceLocale,
} from "./interface-locale.js";

const graphQLInterfaceLocales: Record<InterfaceLocale, GraphQLInterfaceLocale> = {
  en: "EN",
  es: "ES",
};

const interfaceLocalesByGraphQL: Record<GraphQLInterfaceLocale, InterfaceLocale> = {
  EN: "en",
  ES: "es",
};

const rolePresentation: Record<
  UserRole,
  { labelId: string }
> = {
  STUDENT: {
    labelId: "workspace.student",
  },
  TEACHER: {
    labelId: "workspace.teacher",
  },
  ORGANIZATION_MANAGER: {
    labelId: "workspace.organizationManager",
  },
  PLATFORM_ADMINISTRATOR: {
    labelId: "workspace.platformAdministrator",
  },
};

const relationshipScopeMessageIds: Record<WorkspaceRelationshipScope, string> = {
  SELF: "workspace.scope.student",
  ASSIGNED_CLASS_SESSIONS: "workspace.scope.teacher",
  ASSIGNED_ORGANIZATION: "workspace.scope.organizationManager",
  MARKETPLACE_WIDE: "workspace.scope.platformAdministrator",
};

export const workspacePlacePresentation: Record<
  WorkspacePlace,
  { labelId: string; path: string; role: UserRole; summaryId: string }
> = {
  STUDENT_DISCOVERY: {
    labelId: "workspace.journey.student.discovery",
    path: "/student/discover",
    role: "STUDENT",
    summaryId: "workspace.place.student.discovery",
  },
  STUDENT_LEARNING: {
    labelId: "workspace.journey.student.learning",
    path: "/student/learning",
    role: "STUDENT",
    summaryId: "workspace.place.student.learning",
  },
  TEACHER_SCHEDULE: {
    labelId: "workspace.journey.teacher.schedule",
    path: "/teacher/schedule",
    role: "TEACHER",
    summaryId: "workspace.place.teacher.schedule",
  },
  TEACHER_AVAILABILITY: {
    labelId: "workspace.journey.teacher.availability",
    path: "/teacher/availability",
    role: "TEACHER",
    summaryId: "workspace.place.teacher.availability",
  },
  ORGANIZATION_STUDENTS: {
    labelId: "workspace.journey.organization.students",
    path: "/organization/students",
    role: "ORGANIZATION_MANAGER",
    summaryId: "workspace.place.organization.students",
  },
  ORGANIZATION_REPORTS: {
    labelId: "workspace.journey.organization.reports",
    path: "/organization/reports",
    role: "ORGANIZATION_MANAGER",
    summaryId: "workspace.place.organization.reports",
  },
  ADMINISTRATION_OPERATIONS: {
    labelId: "workspace.journey.administration.operations",
    path: "/administration/operations",
    role: "PLATFORM_ADMINISTRATOR",
    summaryId: "workspace.place.administration.operations",
  },
  ADMINISTRATION_PEOPLE: {
    labelId: "workspace.journey.administration.people",
    path: "/administration/people",
    role: "PLATFORM_ADMINISTRATOR",
    summaryId: "workspace.place.administration.people",
  },
};

type WorkspaceContext = {
  actingRole: UserRole;
  currentPlace: WorkspacePlace;
  onPlaceSelected: (place: WorkspacePlace) => void;
  onRoleSelected: (role: UserRole) => void;
  relationshipScope: WorkspaceRelationshipScope;
  rolePlaces: Array<{ place: WorkspacePlace; role: UserRole }>;
};

function WorkspaceStatus({
  messageId,
  role,
}: {
  messageId: "workspace.error" | "workspace.loading";
  role: "alert" | "status";
}) {
  const locale = suggestedInterfaceLocale();
  return (
    <IntlProvider locale={locale} messages={interfaceMessages[locale]}>
      <p role={role}>
        <FormattedMessage id={messageId} />
      </p>
    </IntlProvider>
  );
}

function WorkspaceAccessError({ onSafeReturn }: { onSafeReturn: () => void }) {
  const savedLocale = window.sessionStorage.getItem("marketplace.locale");
  const locale = savedLocale === "en" || savedLocale === "es"
    ? savedLocale
    : suggestedInterfaceLocale();
  return (
    <IntlProvider locale={locale} messages={interfaceMessages[locale]}>
      <main className="deep-link-guard">
        <p role="alert">
          <FormattedMessage id="workspace.error" />
        </p>
        <button type="button" onClick={onSafeReturn}>
          <FormattedMessage id="workspace.safeReturn" />
        </button>
      </main>
    </IntlProvider>
  );
}

function localDateStartInstant(localDate: string, timeZone: string) {
  try {
    return Temporal.PlainDate.from(localDate)
      .toPlainDateTime("00:00")
      .toZonedDateTime(timeZone, { disambiguation: "reject" })
      .toInstant();
  } catch {
    return null;
  }
}

function WorkspaceContent({
  displayName,
  displayTimeZone,
  hasSavedPreferences,
  locale,
  onPreferencesSaved,
  workspaceContext,
}: {
  displayName: string;
  displayTimeZone: string;
  hasSavedPreferences: boolean;
  locale: InterfaceLocale;
  onPreferencesSaved: (preferences: {
    displayTimeZone: string;
    locale: InterfaceLocale;
  }) => void;
  workspaceContext?: WorkspaceContext;
}) {
  const intl = useIntl();
  const [selectedLocale, setSelectedLocale] = useState(locale);
  const [selectedTimeZone, setSelectedTimeZone] = useState(displayTimeZone);
  const [previewInstant] = useState(() => Temporal.Now.instant());
  const [selectedLocalDate, setSelectedLocalDate] = useState(() =>
    Temporal.Now.plainDateISO(displayTimeZone).toString(),
  );
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const [saveUserPreferences, { error: saveError, loading: saving }] = useMutation(
    SaveUserPreferencesDocument,
  );
  const selectedLocalDateStart = localDateStartInstant(
    selectedLocalDate,
    displayTimeZone,
  );
  const actingRole = workspaceContext?.actingRole ?? "STUDENT";
  const currentPlace = workspaceContext?.currentPlace ?? "STUDENT_DISCOVERY";
  const role = rolePresentation[actingRole];
  const relationshipScopeId = workspaceContext
    ? relationshipScopeMessageIds[workspaceContext.relationshipScope]
    : "workspace.scope.student";
  const place = workspacePlacePresentation[currentPlace];
  const roleJourneys = Object.entries(workspacePlacePresentation).filter(
    ([, candidate]) => candidate.role === actingRole,
  ) as Array<[WorkspacePlace, (typeof workspacePlacePresentation)[WorkspacePlace]]>;

  useEffect(() => {
    const previousLanguage = document.documentElement.getAttribute("lang");
    document.documentElement.lang = locale;
    return () => {
      if (previousLanguage) document.documentElement.lang = previousLanguage;
      else document.documentElement.removeAttribute("lang");
    };
  }, [locale]);

  async function savePreferences(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveSucceeded(false);
    try {
      const result = await saveUserPreferences({
        variables: {
          input: {
            actingRole,
            displayTimeZone: selectedTimeZone,
            interfaceLocale: graphQLInterfaceLocales[selectedLocale],
          },
        },
      });
      const saved = result.data?.saveUserPreferences.user;
      if (saved?.displayTimeZone && saved.interfaceLocale) {
        setSaveSucceeded(true);
        onPreferencesSaved({
          displayTimeZone: saved.displayTimeZone,
          locale: interfaceLocalesByGraphQL[saved.interfaceLocale],
        });
      }
    } catch {
      // Apollo exposes the localized-safe error state below.
    }
  }

  const journeyLinks = () =>
    roleJourneys.map(([journeyPlace, journey]) => (
      <a
        aria-current={journeyPlace === currentPlace ? "page" : undefined}
        href={journey.path}
        key={journeyPlace}
        onClick={(event) => {
          if (!workspaceContext) return;
          event.preventDefault();
          workspaceContext.onPlaceSelected(journeyPlace);
        }}
      >
        {intl.formatMessage({ id: journey.labelId })}
      </a>
    ));

  const actingRoleSelect = workspaceContext && (
    <label className="role-select">
      <span>{intl.formatMessage({ id: "workspace.actingRole" })}</span>
      <select
        aria-label={intl.formatMessage({ id: "workspace.actingRole" })}
        value={actingRole}
        onChange={(event) =>
          workspaceContext.onRoleSelected(event.target.value as UserRole)
        }
      >
        {workspaceContext.rolePlaces.map(({ role: assignedRole }) => (
          <option key={assignedRole} value={assignedRole}>
            {intl.formatMessage({ id: rolePresentation[assignedRole].labelId })}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="app-shell">
      <aside className="context-rail" aria-label={intl.formatMessage({ id: role.labelId })}>
        <p className="brand">Lingua</p>
        <p className="role-badge">{intl.formatMessage({ id: role.labelId })}</p>
        <p className="relationship-scope">
          {intl.formatMessage(
            { id: "workspace.relationshipScope" },
            { scope: intl.formatMessage({ id: relationshipScopeId }) },
          )}
        </p>
        {actingRoleSelect}
        <nav aria-label={intl.formatMessage({ id: "workspace.navigation" })}>
          {workspaceContext ? journeyLinks() : <a href="#home" aria-current="page">
            {intl.formatMessage({ id: "workspace.eyebrow" })}
          </a>}
          <a href="#settings">{intl.formatMessage({ id: "workspace.settings" })}</a>
        </nav>
      </aside>
      {workspaceContext && (
        <header className="mobile-context">
          <div className="mobile-context-summary">
            <strong>{intl.formatMessage({ id: role.labelId })}</strong>
            <span>
              {intl.formatMessage(
                { id: "workspace.relationshipScope" },
                { scope: intl.formatMessage({ id: relationshipScopeId }) },
              )}
            </span>
          </div>
          <details>
            <summary>{intl.formatMessage({ id: "workspace.mobileDrawer" })}</summary>
            {actingRoleSelect}
            <nav aria-label={intl.formatMessage({ id: "workspace.navigation" })}>
              {journeyLinks()}
            </nav>
          </details>
        </header>
      )}
      <main id="home">
        <p className="eyebrow">{intl.formatMessage({ id: role.labelId })}</p>
        <h1>
          {intl.formatMessage(
            { id: "workspace.greeting" },
            { name: displayName },
          )}
        </h1>
        <p className="lede">
          {intl.formatMessage({ id: "workspace.introduction" })}
        </p>
        <section className="workspace-card" aria-labelledby="next-step-title">
          <h2 id="next-step-title">
            {intl.formatMessage({ id: place.labelId })}
          </h2>
          <p>{intl.formatMessage({ id: place.summaryId })}</p>
          <p>
            {intl.formatMessage(
              { id: "workspace.timeZone" },
              { timeZone: displayTimeZone },
            )}
          </p>
          <h3>{intl.formatMessage({ id: "workspace.timeZonePreview" })}</h3>
          <p>
            {intl.formatMessage(
              { id: "workspace.currentInstant" },
              {
                instant: intl.formatDate(Number(previewInstant.epochMilliseconds), {
                  dateStyle: "long",
                  timeStyle: "short",
                  timeZone: displayTimeZone,
                }),
              },
            )}
          </p>
          <label htmlFor="calendar-date">
            {intl.formatMessage({ id: "workspace.localDate" })}
          </label>
          <input
            id="calendar-date"
            aria-invalid={selectedLocalDateStart ? undefined : true}
            required
            type="date"
            value={selectedLocalDate}
            onChange={(event) => setSelectedLocalDate(event.target.value)}
          />
          {selectedLocalDateStart && <p>
            {intl.formatMessage(
              { id: "workspace.localDateHelp" },
              {
                instant: intl.formatDate(
                  Number(
                    selectedLocalDateStart.epochMilliseconds,
                  ),
                  {
                    dateStyle: "long",
                    timeStyle: "short",
                    timeZone: "UTC",
                  },
                ),
              },
            )}
          </p>}
          {!selectedLocalDateStart && (
            <p role="alert">
              {intl.formatMessage({ id: "workspace.localDateInvalid" })}
            </p>
          )}
        </section>
        <section className="workspace-card" id="settings" aria-labelledby="preferences-title">
          <h2 id="preferences-title">
            {intl.formatMessage({
              id: hasSavedPreferences
                ? "preferences.savedTitle"
                : "preferences.title",
            })}
          </h2>
          {!hasSavedPreferences && (
            <p>{intl.formatMessage({ id: "preferences.suggestion" })}</p>
          )}
          <form className="preferences-form" onSubmit={(event) => void savePreferences(event)}>
            <label htmlFor="interface-locale">
              {intl.formatMessage({ id: "preferences.locale" })}
            </label>
            <select
              id="interface-locale"
              value={selectedLocale}
              onChange={(event) =>
                setSelectedLocale(event.target.value as InterfaceLocale)
              }
            >
              <option value="en">
                {intl.formatMessage({ id: "preferences.locale.en" })}
              </option>
              <option value="es">
                {intl.formatMessage({ id: "preferences.locale.es" })}
              </option>
            </select>
            <label htmlFor="display-time-zone">
              {intl.formatMessage({ id: "preferences.timeZone" })}
            </label>
            <input
              aria-describedby="display-time-zone-help"
              id="display-time-zone"
              list="regional-time-zones"
              value={selectedTimeZone}
              onChange={(event) => setSelectedTimeZone(event.target.value)}
            />
            <datalist id="regional-time-zones">
              {namedRegionalTimeZones().map((timeZone) => (
                <option key={timeZone} value={timeZone}>
                  {timeZone.replaceAll("_", " ")}
                </option>
              ))}
            </datalist>
            <p id="display-time-zone-help" className="field-help">
              {intl.formatMessage({ id: "preferences.timeZoneHelp" })}
            </p>
            <button type="submit" disabled={saving}>
              {intl.formatMessage({
                id: saving ? "preferences.saving" : "preferences.save",
              })}
            </button>
          </form>
          {saveSucceeded && (
            <p role="status">{intl.formatMessage({ id: "preferences.saved" })}</p>
          )}
          {saveError && (
            <p role="alert">{intl.formatMessage({ id: "preferences.error" })}</p>
          )}
        </section>
      </main>
      {workspaceContext && (
        <nav
          aria-label={intl.formatMessage({ id: "workspace.mobileDrawer" })}
          className="mobile-bottom-nav"
        >
          {journeyLinks()}
        </nav>
      )}
    </div>
  );
}

function LoadedStudentWorkspace({
  user,
  workspaceContext,
}: {
  user: {
    displayName: string;
    displayTimeZone: string | null;
    interfaceLocale: GraphQLInterfaceLocale | null;
  };
  workspaceContext?: WorkspaceContext;
}) {
  const [savedPreferences, setSavedPreferences] = useState(() => ({
    displayTimeZone: user.displayTimeZone,
    locale: user.interfaceLocale
      ? interfaceLocalesByGraphQL[user.interfaceLocale]
      : undefined,
  }));
  const hasSavedPreferences = Boolean(
    savedPreferences.locale && savedPreferences.displayTimeZone,
  );
  const locale = savedPreferences.locale ?? suggestedInterfaceLocale();
  const displayTimeZone =
    savedPreferences.displayTimeZone ?? suggestedDisplayTimeZone();

  return (
    <IntlProvider locale={locale} messages={interfaceMessages[locale]}>
      <WorkspaceContent
        displayName={user.displayName}
        displayTimeZone={displayTimeZone}
        hasSavedPreferences={hasSavedPreferences}
        locale={locale}
        onPreferencesSaved={setSavedPreferences}
        {...(workspaceContext ? { workspaceContext } : {})}
      />
    </IntlProvider>
  );
}

export function StudentWorkspaceScreen() {
  const { data, error, loading } = useQuery(StudentWorkspaceDocument);

  if (loading) return <WorkspaceStatus messageId="workspace.loading" role="status" />;
  if (error || !data) return <WorkspaceStatus messageId="workspace.error" role="alert" />;

  const user = data.studentWorkspace.user;
  return <LoadedStudentWorkspace user={user} />;
}

export function RoleWorkspaceScreen({
  actingRole,
  currentPlace,
  onAccessDenied,
}: {
  actingRole: UserRole;
  currentPlace: WorkspacePlace;
  onAccessDenied: () => void;
}) {
  const navigate = useNavigate();
  const { data, error, loading } = useQuery(RoleWorkspaceDocument, {
    fetchPolicy: "no-cache",
    variables: { actingRole },
  });
  const [rememberPlace] = useMutation(RememberRoleWorkspacePlaceDocument);
  const rememberingPlace = useRef<WorkspacePlace | null>(null);

  useEffect(() => {
    if (!data) return;
    const workspace = data.roleWorkspace;
    window.sessionStorage.setItem("marketplace.actingRole", actingRole);
    if (workspace.user.interfaceLocale) {
      window.sessionStorage.setItem(
        "marketplace.locale",
        interfaceLocalesByGraphQL[workspace.user.interfaceLocale],
      );
    }
    window.sessionStorage.setItem(
      "marketplace.rolePaths",
      JSON.stringify(
        Object.fromEntries(
          workspace.rolePlaces.map(({ place, role }) => [
            role,
            workspacePlacePresentation[place].path,
          ]),
        ),
      ),
    );
    const rememberedPlace = workspace.rolePlaces.find(
      ({ role }) => role === actingRole,
    )?.place;
    const currentPath = workspacePlacePresentation[currentPlace].path;
    if (
      rememberedPlace !== currentPlace &&
      rememberingPlace.current !== currentPlace
    ) {
      rememberingPlace.current = currentPlace;
      void rememberPlace({
        variables: { input: { actingRole, place: currentPlace } },
      }).then(() => {
        const rolePaths = JSON.parse(
          window.sessionStorage.getItem("marketplace.rolePaths") ?? "{}",
        ) as Record<string, string>;
        rolePaths[actingRole] = currentPath;
        window.sessionStorage.setItem(
          "marketplace.rolePaths",
          JSON.stringify(rolePaths),
        );
      });
    }
  }, [actingRole, currentPlace, data, rememberPlace]);

  if (loading) return <WorkspaceStatus messageId="workspace.loading" role="status" />;
  if (error || !data) return <WorkspaceAccessError onSafeReturn={onAccessDenied} />;

  const workspace = data.roleWorkspace;
  const rolePlaces = workspace.rolePlaces;
  return (
    <LoadedStudentWorkspace
      user={workspace.user}
      workspaceContext={{
        actingRole,
        currentPlace,
        relationshipScope: workspace.relationshipScope,
        rolePlaces,
        onPlaceSelected: (place) => {
          rememberingPlace.current = place;
          void rememberPlace({
            variables: { input: { actingRole, place } },
          }).then(() => {
            const rolePaths = JSON.parse(
              window.sessionStorage.getItem("marketplace.rolePaths") ?? "{}",
            ) as Record<string, string>;
            rolePaths[actingRole] = workspacePlacePresentation[place].path;
            window.sessionStorage.setItem(
              "marketplace.rolePaths",
              JSON.stringify(rolePaths),
            );
            navigate(workspacePlacePresentation[place].path);
          });
        },
        onRoleSelected: (selectedRole) => {
          const remembered = rolePlaces.find(({ role }) => role === selectedRole);
          if (!remembered) return;
          navigate(workspacePlacePresentation[remembered.place].path, {
            state: { explicitRole: selectedRole },
          });
        },
      }}
    />
  );
}
