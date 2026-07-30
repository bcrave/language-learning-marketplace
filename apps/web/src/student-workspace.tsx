import {
  interfaceMessages,
  namedRegionalTimeZones,
  type InterfaceLocale,
} from "@marketplace/core";
import { Temporal } from "@js-temporal/polyfill";
import { useMutation, useQuery } from "@apollo/client/react";
import { useEffect, useState } from "react";
import { FormattedMessage, IntlProvider, useIntl } from "react-intl";

import {
  SaveUserPreferencesDocument,
  StudentWorkspaceDocument,
} from "./generated/graphql.js";
import type { InterfaceLocale as GraphQLInterfaceLocale } from "./generated/graphql.js";
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
}: {
  displayName: string;
  displayTimeZone: string;
  hasSavedPreferences: boolean;
  locale: InterfaceLocale;
  onPreferencesSaved: (preferences: {
    displayTimeZone: string;
    locale: InterfaceLocale;
  }) => void;
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
            actingRole: "STUDENT",
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

  return (
    <div className="app-shell">
      <aside className="context-rail" aria-label={intl.formatMessage({ id: "workspace.eyebrow" })}>
        <p className="brand">Lingua</p>
        <p className="role-badge">{intl.formatMessage({ id: "workspace.eyebrow" })}</p>
        <nav aria-label={intl.formatMessage({ id: "workspace.navigation" })}>
          <a href="#home" aria-current="page">
            {intl.formatMessage({ id: "workspace.eyebrow" })}
          </a>
          <a href="#settings">{intl.formatMessage({ id: "workspace.settings" })}</a>
        </nav>
      </aside>
      <main id="home">
        <p className="eyebrow">{intl.formatMessage({ id: "workspace.eyebrow" })}</p>
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
            {intl.formatMessage({ id: "workspace.nextStep" })}
          </h2>
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
    </div>
  );
}

function LoadedStudentWorkspace({
  user,
}: {
  user: {
    displayName: string;
    displayTimeZone: string | null;
    interfaceLocale: GraphQLInterfaceLocale | null;
  };
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
