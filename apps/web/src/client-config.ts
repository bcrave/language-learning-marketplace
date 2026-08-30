import { z } from "zod";

const graphqlUrlSchema = z.union([z.url(), z.literal("/graphql")]);

export type ClientConfig =
  | {
      authMode: "fake";
      demoUserId: string;
      graphqlUrl: string;
    }
  | {
      authMode: "auth0";
      auth0Audience: string;
      auth0ClientId: string;
      auth0Domain: string;
      graphqlUrl: string;
      /**
       * ADR 0022's browser telemetry destination. ADR 0039 keeps public client
       * configuration separate from secrets, and a Sentry DSN is a write-only
       * ingestion identifier the bundle publishes anyway — the operator guide
       * says outright that it is not an exposure. It stays optional so a
       * deployment without Sentry configured still starts.
       */
      sentryDsn?: string;
      /**
       * The build the browser is running, so a Sentry event can be attributed
       * to a release and the guide's first-hour-after-deployment rule means
       * something. Railway sets it per service from the released commit.
       */
      appRelease?: string;
    };

export function parseClientConfig(
  environment: Record<string, string | boolean | undefined>,
  development: boolean,
): ClientConfig {
  if (development) {
    const result = z
      .object({
        VITE_DEMO_USER_ID: z.uuid(),
        VITE_GRAPHQL_URL: graphqlUrlSchema.default("/graphql"),
      })
      .safeParse(environment);
    if (!result.success) {
      throw new Error("Local browser authentication requires VITE_DEMO_USER_ID");
    }
    return {
      authMode: "fake",
      demoUserId: result.data.VITE_DEMO_USER_ID,
      graphqlUrl: result.data.VITE_GRAPHQL_URL,
    };
  }

  const result = z
    .object({
      VITE_AUTH0_AUDIENCE: z.string().min(1),
      VITE_AUTH0_CLIENT_ID: z.string().min(1),
      VITE_AUTH0_DOMAIN: z.string().min(1).max(255),
      VITE_GRAPHQL_URL: graphqlUrlSchema.default("/graphql"),
      VITE_SENTRY_DSN: z.url().optional(),
      VITE_APP_RELEASE: z.string().min(1).max(255).optional(),
    })
    .safeParse(environment);
  if (!result.success) {
    throw new Error("Production browser authentication requires Auth0 configuration");
  }
  return {
    authMode: "auth0",
    auth0Audience: result.data.VITE_AUTH0_AUDIENCE,
    auth0ClientId: result.data.VITE_AUTH0_CLIENT_ID,
    auth0Domain: result.data.VITE_AUTH0_DOMAIN,
    graphqlUrl: result.data.VITE_GRAPHQL_URL,
    ...(result.data.VITE_SENTRY_DSN ? { sentryDsn: result.data.VITE_SENTRY_DSN } : {}),
    ...(result.data.VITE_APP_RELEASE ? { appRelease: result.data.VITE_APP_RELEASE } : {}),
  };
}
