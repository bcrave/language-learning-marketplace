import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { StrictMode } from "react";
import type { Root } from "react-dom/client";

import { App } from "./app.js";
import { parseClientConfig } from "./client-config.js";

export function renderDevelopmentApp(root: Root) {
  const config = parseClientConfig(import.meta.env, true);
  if (config.authMode !== "fake") {
    throw new Error("The development browser requires fake authentication");
  }
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: config.graphqlUrl,
      headers: { "x-demo-user-id": config.demoUserId },
    }),
  });
  root.render(
    <StrictMode>
      <App client={client} />
    </StrictMode>,
  );
}
