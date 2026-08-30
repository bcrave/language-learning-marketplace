import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { useAuth0, Auth0Provider } from "@auth0/auth0-react";
import auth0WorkerUrl from "@auth0/auth0-spa-js/dist/auth0-spa-js.worker.production.js?url";
import { interfaceMessages } from "@marketplace/core";
import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { FormattedMessage, IntlProvider } from "react-intl";

import { App } from "./app.js";
import { parseClientConfig, type ClientConfig } from "./client-config.js";
import { suggestedInterfaceLocale } from "./interface-locale.js";
import { MaintenanceStatus, maintenanceAwareFetch } from "./maintenance-status.js";
import { persistedOperationLink } from "./persisted-operations.js";
import { productionAuth0Options } from "./production-auth.js";
import { startBrowserTelemetry } from "./telemetry.js";
import "./styles.css";

function AuthenticationStatus({
  messageId,
  onSignIn,
}: {
  messageId: "auth.error" | "auth.loading" | "auth.signIn";
  onSignIn?: () => void;
}) {
  const locale = suggestedInterfaceLocale();
  return (
    <IntlProvider locale={locale} messages={interfaceMessages[locale]}>
      <main className="authentication-status">
        {onSignIn ? (
          <button type="button" onClick={onSignIn}>
            <FormattedMessage id={messageId} />
          </button>
        ) : (
          <p role={messageId === "auth.error" ? "alert" : "status"}>
            <FormattedMessage id={messageId} />
          </p>
        )}
      </main>
    </IntlProvider>
  );
}

function AuthenticatedApp({
  config,
}: {
  config: Extract<ClientConfig, { authMode: "auth0" }>;
}) {
  const [maintenance, setMaintenance] = useState(false);
  const {
    error,
    getAccessTokenSilently,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
  } = useAuth0();
  const client = useMemo(() => {
    const authorizationLink = setContext(async (_, context) => {
      const accessToken = await getAccessTokenSilently();
      return {
        headers: {
          ...context.headers,
          authorization: `Bearer ${accessToken}`,
        },
      };
    });
    return new ApolloClient({
      cache: new InMemoryCache(),
      link: ApolloLink.from([
        // ADR 0024: the deployed API executes only the documents the build
        // produced, so the browser names one instead of sending a document.
        persistedOperationLink(),
        authorizationLink,
        new HttpLink({
          uri: config.graphqlUrl,
          fetch: maintenanceAwareFetch(
            window.fetch.bind(window),
            () => setMaintenance(true),
          ),
        }),
      ]),
    });
  }, [config.graphqlUrl, getAccessTokenSilently]);

  if (isLoading) return <AuthenticationStatus messageId="auth.loading" />;
  if (error) return <AuthenticationStatus messageId="auth.error" />;
  if (!isAuthenticated) {
    return (
      <AuthenticationStatus
        messageId="auth.signIn"
        onSignIn={() => void loginWithRedirect()}
      />
    );
  }
  if (maintenance) return <MaintenanceStatus />;
  return <App client={client} />;
}

const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing");

if (import.meta.env.DEV || import.meta.env.MODE === "test") {
  void import("./development-main.js").then(({ renderDevelopmentApp }) => {
    renderDevelopmentApp(createRoot(root));
  });
} else {
  const config = parseClientConfig(import.meta.env, false);
  if (config.authMode !== "auth0") {
    throw new Error("The production browser requires Auth0 authentication");
  }
  // Started before the application renders, so a failure in the first paint is
  // reported rather than lost. Local development reports nothing at all.
  startBrowserTelemetry({
    environment: "production",
    ...(config.sentryDsn ? { dsn: config.sentryDsn } : {}),
    ...(config.appRelease ? { release: config.appRelease } : {}),
  });
  const application = (
    <Auth0Provider
      {...productionAuth0Options({
        config,
        origin: window.location.origin,
        workerUrl: auth0WorkerUrl,
        onAuthenticated: (path) => window.history.replaceState({}, "", path),
      })}
    >
      <AuthenticatedApp config={config} />
    </Auth0Provider>
  );
  createRoot(root).render(<StrictMode>{application}</StrictMode>);
}
