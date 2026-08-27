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
        // The release job's own entry points: the worker gate between the API
        // and the browser client, and the deployed smoke journey after it.
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
await cp("migrations", resolve(outputDirectory, "migrations"), { recursive: true });
