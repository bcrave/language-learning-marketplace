import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { build } from "esbuild";

const outputDirectory = resolve("dist");
const isTestBuild = globalThis.process.env.BUILD_TARGET === "test";
await rm(outputDirectory, { force: true, recursive: true });

await build({
  bundle: true,
  define: {
    "process.env.BUNDLED_TEST_API": isTestBuild ? '"true"' : '"false"',
    "process.env.NODE_ENV": isTestBuild ? '"test"' : '"production"',
  },
  entryNames: "[dir]/[name]",
  entryPoints: isTestBuild
    ? ["src/api/test-main.ts"]
    : [
        "src/api/main.ts",
        "src/database/migrate.ts",
        "src/database/seed.ts",
        // The release's own entry points: the shared identity binding and the
        // readiness gates run inside Railway as pre-deploy steps, and the
        // browser policy and deployed smoke journey run from the release job
        // after them. The artifact evidence is deliberately absent: it inspects
        // this output, so building it into the output would make it inspect
        // its own list of forbidden markers.
        "src/operations/bind-identities-main.ts",
        "src/operations/browser-policy-main.ts",
        "src/operations/canonical-data-rebuild-main.ts",
        "src/operations/canonical-data-recovery-main.ts",
        "src/operations/deployed-maintenance-smoke-main.ts",
        "src/operations/deployed-smoke-main.ts",
        "src/operations/release-gate-main.ts",
        "src/worker/main.ts",
      ],
  format: "esm",
  minifySyntax: true,
  outbase: "src",
  outdir: outputDirectory,
  packages: "external",
  platform: "node",
  plugins: isTestBuild
    ? []
    : [
        {
          name: "production-authenticator",
          setup(context) {
            context.onResolve(
              { filter: /auth\/create-authenticator\.js$/ },
              () => ({
                path: resolve("src/auth/create-authenticator.production.ts"),
              }),
            );
          },
        },
      ],
  sourcemap: false,
  target: "node24",
  treeShaking: true,
});

await mkdir(resolve(outputDirectory, "api"), { recursive: true });
await cp("src/api/schema.graphql", resolve(outputDirectory, "api/schema.graphql"));
// ADR 0024's persisted-operation manifest travels with the API, beside the
// schema: the API service builds without the browser client, so the generated
// file has to be part of this build's own output.
await cp(
  "../web/src/generated/persisted-documents.json",
  resolve(outputDirectory, "api/persisted-documents.json"),
);
await cp("migrations", resolve(outputDirectory, "migrations"), { recursive: true });
