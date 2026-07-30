import { describe, expect, it } from "vitest";

import { parseClientConfig } from "../src/client-config.js";

describe("browser authentication configuration", () => {
  it("requires Auth0 configuration for a production build", () => {
    expect(() =>
      parseClientConfig(
        {
          VITE_GRAPHQL_URL: "https://example.test/graphql",
          VITE_DEMO_USER_ID: "00000000-0000-4000-8000-000000000001",
        },
        false,
      ),
    ).toThrowError("Production browser authentication requires Auth0 configuration");
  });

  it("does not carry the fake identity into production configuration", () => {
    expect(
      parseClientConfig(
        {
          VITE_AUTH0_AUDIENCE: "https://api.example.test",
          VITE_AUTH0_CLIENT_ID: "public-client-id",
          VITE_AUTH0_DOMAIN: "login.example.test",
          VITE_DEMO_USER_ID: "00000000-0000-4000-8000-000000000001",
          VITE_GRAPHQL_URL: "https://example.test/graphql",
        },
        false,
      ),
    ).toEqual({
      authMode: "auth0",
      auth0Audience: "https://api.example.test",
      auth0ClientId: "public-client-id",
      auth0Domain: "login.example.test",
      graphqlUrl: "https://example.test/graphql",
    });
  });
});
