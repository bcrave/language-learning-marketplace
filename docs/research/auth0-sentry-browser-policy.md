# Auth0 and Sentry browser policy requirements

Research completed 2026-07-28 against primary vendor documentation and browser specifications. This evidence note separates current provider facts from the deployment decisions recorded in the threat model and ADRs.

## Scope and selected configuration

This note defines the narrowest browser policy for the public single-origin Caddy deployment when the React SPA:

- bundles the Auth0 and Sentry browser SDKs into first-party JavaScript;
- uses Auth0 Authorization Code with PKCE, rotating refresh tokens, in-memory token storage, and no silent-authorization fallback;
- serves the Auth0 token worker from the application origin;
- calls `/graphql` on the application origin; and
- sends browser errors directly to the exact ingestion host encoded in the public Sentry DSN.

The policy is deliberately tied to those choices. Popup authentication, silent authentication in an iframe, externally hosted assets, Sentry Replay, and other browser integrations require a fresh review rather than a broader standing allowance.

## Official-source findings

### Auth0

Authorization Code with PKCE is the appropriate Auth0 flow for a SPA. The browser redirects to Auth0 for authorization, then the SDK exchanges the returned authorization code and PKCE verifier at Auth0's `/oauth/token` endpoint. Requesting `offline_access` allows a refresh token to be returned when offline access is enabled for the application.[^auth0-pkce][^auth0-pkce-api]

For refresh-token rotation, the Auth0 SPA application must have rotation enabled and the React SDK must use `useRefreshTokens: true`. Auth0 invalidates each rotating refresh token after exchange; reuse detection invalidates the affected token family.[^auth0-rrt-config][^auth0-rrt]

Auth0 recommends in-memory storage for SPA tokens, and memory is the SPA SDK default. Memory does not persist tokens across page reloads or browser tabs.[^auth0-token-storage]

The SDK can isolate refresh-token work in a Web Worker. Its current option contract says that worker is used only when refresh tokens are enabled, cache location is memory, and no custom cache is supplied. By default the worker is created from a `blob:` URL; setting `workerUrl` to a same-origin copy of the distributed worker avoids granting `worker-src blob:`.[^auth0-options]

`useRefreshTokensFallback` defaults to `false`. Enabling it allows hidden-iframe silent authorization when a refresh token is unavailable; the SDK also uses a hidden iframe for silent authentication when refresh tokens are not enabled. With rotating refresh tokens enabled and fallback left false, the selected design does not require an Auth0 `frame-src` allowance.[^auth0-options]

Auth0 application configuration must use exact production Allowed Callback URLs, Allowed Logout URLs, Allowed Web Origins, and, where applicable, Allowed Origins (CORS). Production wildcards and localhost entries should not be used.[^auth0-settings][^auth0-react]

Auth0 logout is a top-level navigation to `/v2/logout`, and its `returnTo` target must be allowlisted. A top-level redirect does not itself require an Auth0 `frame-src`, `form-action`, or `connect-src` allowance.[^auth0-logout]

### Sentry

The current Sentry JavaScript SDK uses `fetch` for its browser transport. Direct event delivery therefore requires `connect-src` access to the exact ingestion host contained in the project's public DSN, not a wildcard for all Sentry hosts.[^sentry-v8][^sentry-client-key]

If Sentry receives browser CSP violation reports, the reporting endpoint must also be allowed by `connect-src` (or the applicable fallback directive) and configured as the project's exact reporting endpoint.[^sentry-csp]

Sentry browser tracing propagates `sentry-trace` and `baggage` to same-origin requests by default in SDK v8 and later. `tracePropagationTargets` can narrow propagation to `/graphql`; adding a cross-origin target would additionally require that service's CORS policy to accept those headers.[^sentry-v8][^sentry-cors]

Session Replay is optional and is not needed for error reporting. Although it masks text, images, and inputs by default, it still records DOM, interaction, network, and console context; it should remain disabled for this portfolio unless separately justified.[^sentry-replay]

A same-origin Sentry tunnel is supported, but would add a public forwarding endpoint and spend the application's own bandwidth and compute. Direct delivery to the one exact DSN host is narrower operationally for this deployment even though it adds one origin to `connect-src`.[^sentry-tunnel]

Source-map upload is a build/CI operation. Its Sentry authentication token belongs in CI, never in browser code; after upload, source maps should be deleted from public artifacts or denied by the server.[^sentry-sourcemaps]

Browser breadcrumbs may capture fetch/XHR, console calls, clicks, keypresses, and navigation. Sentry events can be modified or dropped before transport, so the integration must filter authorization values, GraphQL variables, URL query strings, and reviewer-entered content and must not enable PII collection.[^sentry-breadcrumbs][^sentry-events]

## Required policy

Substitute the exact production Auth0 tenant/custom domain and exact host from the Sentry DSN:

```http
Content-Security-Policy:
  default-src 'none';
  base-uri 'none';
  object-src 'none';
  script-src 'self';
  style-src 'self';
  img-src 'self';
  font-src 'self';
  connect-src 'self' https://AUTH0_EXACT_DOMAIN https://SENTRY_EXACT_DSN_HOST;
  worker-src 'self';
  frame-src 'none';
  frame-ancestors 'none';
  form-action 'self';
  manifest-src 'self'
```

`connect-src 'self'` covers same-origin GraphQL. The exact Auth0 domain covers token exchange and refresh. The exact Sentry DSN host covers browser telemetry. `worker-src 'self'` assumes the Auth0 worker is copied into and served from the first-party build, then selected with `workerUrl`. If the application submits no native forms, `form-action 'none'` is tighter than `'self'`.

This is a fail-closed baseline under CSP Level 3: a capability with no explicit allowance falls back to `default-src 'none'` and is blocked.[^csp3]

The companion response headers should be:

```http
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Strict-Transport-Security: max-age=31536000
```

Add HSTS `includeSubDomains` or `preload` only after verifying that every affected subdomain is permanently HTTPS. `Cross-Origin-Opener-Policy: same-origin` is compatible with redirect authentication; change it to `same-origin-allow-popups` only if popup authentication is intentionally introduced. Do not add COEP merely as a hardening label: cross-origin isolation is not required here and would create compatibility work without serving the selected design.

## Requirement classification

### Mandatory for the selected design

- Exact Auth0 production callback, logout, web-origin, and CORS settings, with no production wildcard or localhost entries.
- Auth0 rotation enabled; `useRefreshTokens: true`; memory cache; `useRefreshTokensFallback: false`.
- A self-hosted Auth0 worker with `workerUrl` and `worker-src 'self'`.
- Bundled SDKs under `script-src 'self'`.
- `connect-src 'self'` plus the exact Auth0 domain and exact Sentry DSN host.
- A public Auth0 client ID/domain/audience and public Sentry DSN only; neither an Auth0 Management API token nor a Sentry build/auth token may enter the browser.
- Sentry privacy filtering and narrow `tracePropagationTargets`, recommended as `/^\/graphql$/` for the current app.

### Configuration-dependent

- `worker-src blob:` only if the default Auth0 blob worker is retained. Self-hosting avoids it.
- `frame-src https://AUTH0_EXACT_DOMAIN` only if hidden-iframe fallback is enabled or refresh tokens are disabled.
- `script-src` for an Auth0 CDN only if the SDK is loaded remotely. Bundling avoids it.
- A Sentry CSP reporting endpoint only if CSP reports are intentionally sent to Sentry.
- `img-src data:`, `media-src`, external image/font/CDN origins, popup allowances, and Auth0 MFA-specific capabilities only when a demonstrated feature requires them.
- Sentry Replay, Feedback, Toolbar, attachments, or screenshots only after a separate privacy and policy decision.

### Unnecessary and rejected

- `'unsafe-eval'`, `'unsafe-inline'`, broad `https:`, `*.auth0.com`, or `*.sentry.io` source expressions.
- Auth0 iframe permission when rotating refresh tokens are used and fallback is disabled.
- `blob:` or `data:` worker permission when the worker is self-hosted.
- Token persistence in `localStorage` or `sessionStorage`.
- Cross-origin CORS on the public Caddy `/graphql` endpoint.
- A browser-side Auth0 Management API token or Sentry build/auth token.
- COEP/cross-origin isolation for the selected feature set.

## Validation gate

Ship the complete policy first as `Content-Security-Policy-Report-Only` in a production build and exercise login, callback, GraphQL, access-token refresh after expiry, logout, Sentry error delivery, Sentry trace delivery, and a hard reload. Confirm the self-hosted worker is used and that no hidden iframe or unexpected origin is requested. Then enforce the unchanged policy before public release.

The release check should also fail if built HTML requires inline scripts or styles, public source-map URLs are reachable, or any required flow produces a CSP violation. Future browser origins or capabilities are reviewed policy changes, not reasons to add wildcard allowances.

## Sources

[^auth0-pkce]: Auth0, [Authorization Code Flow with Proof Key for Code Exchange (PKCE)](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce).
[^auth0-pkce-api]: Auth0, [Authorization Code Flow with PKCE API details](https://auth0.com/docs/api/authentication/authorization-code-flow-with-pkce/authorize-with-pkce).
[^auth0-rrt-config]: Auth0, [Configure Refresh Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation).
[^auth0-rrt]: Auth0, [Refresh Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation).
[^auth0-token-storage]: Auth0, [Token Storage](https://auth0.com/docs/secure/security-guidance/data-security/token-storage).
[^auth0-options]: Auth0 SPA JS, [Auth0ClientOptions API](https://auth0.github.io/auth0-spa-js/interfaces/Auth0ClientOptions.html).
[^auth0-settings]: Auth0, [Application Settings](https://auth0.com/docs/get-started/applications/application-settings).
[^auth0-react]: Auth0, [React SDK Quickstart](https://auth0.com/docs/quickstart/spa/react).
[^auth0-logout]: Auth0, [Auth0 Logout Endpoint](https://auth0.com/docs/api/authentication/logout/auth-0-logout).
[^sentry-v8]: Sentry, [JavaScript SDK v7 to v8 migration](https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/migration/v7-to-v8/).
[^sentry-client-key]: Sentry, [Retrieve a Client Key](https://docs.sentry.io/api/projects/retrieve-a-client-key/).
[^sentry-csp]: Sentry, [Content Security Policy reporting](https://docs.sentry.io/platforms/javascript/guides/cloudflare/security-policy-reporting/).
[^sentry-cors]: Sentry, [Trace propagation and CORS](https://docs.sentry.io/platforms/javascript/guides/cloudflare/tracing/trace-propagation/dealing-with-cors-issues/).
[^sentry-replay]: Sentry, [Session Replay](https://docs.sentry.io/platforms/javascript/session-replay/).
[^sentry-tunnel]: Sentry, [Route traffic to a custom domain](https://sentry.zendesk.com/hc/en-us/articles/35979625109275-How-can-we-route-traffic-to-a-custom-domain-instead-of-Sentry-io).
[^sentry-sourcemaps]: Sentry, [Upload source maps with esbuild](https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/sourcemaps/uploading/esbuild).
[^sentry-breadcrumbs]: Sentry, [Breadcrumbs](https://docs.sentry.io/platforms/javascript/guides/svelte/enriching-events/breadcrumbs/).
[^sentry-events]: Sentry, [Event enrichment and filtering](https://docs.sentry.io/platforms/javascript/enriching-events/attachments/).
[^csp3]: W3C, [Content Security Policy Level 3](https://www.w3.org/TR/CSP/).
