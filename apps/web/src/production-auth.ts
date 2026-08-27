import type { Auth0ProviderWithConfigOptions } from "@auth0/auth0-react";

import type { ClientConfig } from "./client-config.js";

/** Where an authenticated reviewer lands, and the one Auth0 callback origin path. */
export const AUTHENTICATED_LANDING_PATH = "/student";

/**
 * ADR 0027's browser authentication policy, in one place so it can be asserted
 * rather than assumed: the redirect-based Authorization Code Flow with PKCE,
 * short-lived access tokens and rotating refresh tokens held only in memory,
 * refresh-token iframe fallback disabled, and the SDK token worker served from
 * the application origin instead of a `blob:` URL.
 *
 * `cacheLocation: "memory"` is what keeps tokens out of `localStorage` and
 * `sessionStorage`; `useRefreshTokensFallback: false` is what keeps the SDK
 * from silently falling back to the hidden iframe when a rotating refresh
 * token cannot be used. Losing either would be invisible at runtime until a
 * reviewer's token outlived the tab, which is exactly the persistent exposure
 * the ADR trades an occasional redirect to avoid.
 */
export function productionAuth0Options(options: {
  config: Extract<ClientConfig, { authMode: "auth0" }>;
  origin: string;
  workerUrl: string;
  onAuthenticated: (path: string) => void;
}): Auth0ProviderWithConfigOptions {
  if (options.workerUrl.startsWith("blob:")) {
    throw new Error("The Auth0 token worker must be served from the application origin");
  }

  return {
    domain: options.config.auth0Domain,
    clientId: options.config.auth0ClientId,
    authorizationParams: {
      audience: options.config.auth0Audience,
      // ADR 0028 gives Auth0 exactly one application callback origin.
      redirect_uri: `${options.origin}${AUTHENTICATED_LANDING_PATH}`,
    },
    cacheLocation: "memory",
    useRefreshTokens: true,
    useRefreshTokensFallback: false,
    workerUrl: options.workerUrl,
    // The authorization code and state stay in the address bar otherwise,
    // where a reviewer can copy or reload them.
    onRedirectCallback: (appState) =>
      options.onAuthenticated(
        typeof appState?.returnTo === "string" ? appState.returnTo : AUTHENTICATED_LANDING_PATH,
      ),
  };
}
