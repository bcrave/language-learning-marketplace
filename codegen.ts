import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "apps/backend/src/api/schema.graphql",
  documents: "apps/web/src/**/*.graphql",
  generates: {
    "apps/backend/src/api/generated/resolvers.ts": {
      plugins: ["typescript", "typescript-resolvers"],
    },
    "apps/web/src/generated/": {
      preset: "client",
      // ADR 0024: the build is what decides which GraphQL documents production
      // will execute. The preset hashes every client operation into
      // `persisted-documents.json` and stamps the same hash onto the document
      // the browser sends, so the deployed API can accept the manifest and
      // nothing else.
      presetConfig: { persistedDocuments: true },
    },
  },
};

export default config;
