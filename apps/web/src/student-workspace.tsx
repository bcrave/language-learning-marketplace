import { interfaceMessages, type InterfaceLocale } from "@marketplace/core";
import { useQuery } from "@apollo/client/react";
import { useEffect } from "react";
import { FormattedMessage, IntlProvider, useIntl } from "react-intl";

import { StudentWorkspaceDocument } from "./generated/graphql.js";
import { suggestedInterfaceLocale } from "./interface-locale.js";

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

function WorkspaceContent({
  displayName,
  displayTimeZone,
  locale,
}: {
  displayName: string;
  displayTimeZone: string;
  locale: InterfaceLocale;
}) {
  const intl = useIntl();

  useEffect(() => {
    const previousLanguage = document.documentElement.getAttribute("lang");
    document.documentElement.lang = locale;
    return () => {
      if (previousLanguage) document.documentElement.lang = previousLanguage;
      else document.documentElement.removeAttribute("lang");
    };
  }, [locale]);

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
        </section>
      </main>
    </div>
  );
}

export function StudentWorkspaceScreen() {
  const { data, error, loading } = useQuery(StudentWorkspaceDocument);

  if (loading) return <WorkspaceStatus messageId="workspace.loading" role="status" />;
  if (error || !data) return <WorkspaceStatus messageId="workspace.error" role="alert" />;

  const locale = data.studentWorkspace.user.interfaceLocale.toLowerCase() as InterfaceLocale;
  const user = data.studentWorkspace.user;

  return (
    <IntlProvider locale={locale} messages={interfaceMessages[locale]}>
      <WorkspaceContent
        displayName={user.displayName}
        displayTimeZone={user.displayTimeZone}
        locale={locale}
      />
    </IntlProvider>
  );
}
