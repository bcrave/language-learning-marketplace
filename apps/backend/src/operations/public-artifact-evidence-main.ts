import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

import {
  inspectPublicArtifacts,
  PUBLIC_ARTIFACT_CHECKS,
  type ArtifactFile,
} from "./public-artifact-evidence.js";

/**
 * Runs the build-evidence checks over this build's own output, as a quality gate
 * step after `pnpm build`. A finding fails the run; the output names checks,
 * paths, and what was found, never the value that was found.
 */
const BROWSER_DIRECTORY = "apps/web/dist";
const SERVER_DIRECTORY = "apps/backend/dist";

/** Text the checks can read. Fonts, images, and other binaries carry none. */
const INSPECTED_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".map", ".mjs", ".txt"]);

async function artifactFiles(directory: string): Promise<ArtifactFile[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return artifactFiles(path);
      if (!INSPECTED_EXTENSIONS.has(extname(path))) return [];
      return [{ path, content: await readFile(path, "utf8") }];
    }),
  );
  return nested.flat();
}

const findings = inspectPublicArtifacts({
  browser: await artifactFiles(BROWSER_DIRECTORY),
  server: await artifactFiles(SERVER_DIRECTORY),
});

process.stdout.write(
  `${JSON.stringify({
    event: "release.public-artifact-evidence",
    checks: PUBLIC_ARTIFACT_CHECKS,
    findings,
  })}\n`,
);
if (findings.length > 0) process.exitCode = 1;
