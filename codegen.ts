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
    },
  },
};

export default config;
