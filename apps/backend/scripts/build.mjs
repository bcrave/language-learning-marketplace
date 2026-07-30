import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { build } from "esbuild";

const outputDirectory = resolve("dist");
await rm(outputDirectory, { force: true, recursive: true });

await build({
  bundle: true,
  define: { "process.env.NODE_ENV": '"production"' },
  entryNames: "[dir]/[name]",
  entryPoints: [
    "src/api/main.ts",
    "src/database/migrate.ts",
    "src/database/seed.ts",
    "src/worker/main.ts",
  ],
  format: "esm",
  minifySyntax: true,
  outbase: "src",
  outdir: outputDirectory,
  packages: "external",
  platform: "node",
  plugins: [
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
