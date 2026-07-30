import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { useAuth0, Auth0Provider } from "@auth0/auth0-react";
import auth0WorkerUrl from "@auth0/auth0-spa-js/dist/auth0-spa-js.worker.production.js?url";
import { interfaceMessages } from "@marketplace/core";
import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { FormattedMessage, IntlProvider } from "react-intl";

import { App } from "./app.js";
import { parseClientConfig, type ClientConfig } from "./client-config.js";
import { suggestedInterfaceLocale } from "./interface-locale.js";
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
      link: authorizationLink.concat(new HttpLink({ uri: config.graphqlUrl })),
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
  return <App client={client} />;
}

const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing");

if (import.meta.env.DEV) {
  void import("./development-main.js").then(({ renderDevelopmentApp }) => {
    renderDevelopmentApp(createRoot(root));
  });
} else {
  const config = parseClientConfig(import.meta.env, false);
  if (config.authMode !== "auth0") {
    throw new Error("The production browser requires Auth0 authentication");
  }
  const application = (
    <Auth0Provider
      authorizationParams={{
        audience: config.auth0Audience,
        redirect_uri: `${window.location.origin}/student`,
      }}
      cacheLocation="memory"
      clientId={config.auth0ClientId}
      domain={config.auth0Domain}
      useRefreshTokens
      useRefreshTokensFallback={false}
      workerUrl={auth0WorkerUrl}
    >
      <AuthenticatedApp config={config} />
    </Auth0Provider>
  );
  createRoot(root).render(<StrictMode>{application}</StrictMode>);
}
