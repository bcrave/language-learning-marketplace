/**
 * Runs the role journeys once per supported browser, each in its own Playwright
 * invocation.
 *
 * Playwright would happily run all three projects in one invocation, and that is
 * the wrong shape here. The projects share one API server and therefore one
 * seeded database, and the journeys mutate it: a Student consents to
 * preferences for the first and only time, a requester holds the one Report
 * Export allowed in flight at a time, an administrator grants a Role
 * Assignment. Whichever engine ran first would consume that state and the other
 * two would fail describing a product that works — the most expensive kind of
 * false failure, because it reads exactly like a browser incompatibility.
 *
 * A separate invocation per project restarts the servers, and `webServer`
 * rebuilds the database from the canonical fixtures on every start. So each
 * engine sees the same first use, the same empty export list, and the same
 * fixture state. This is also precisely what CI does, one job per browser; the
 * script is what makes a local run agree with it.
 */
import { spawnSync } from "node:child_process";

import { SUPPORTED_BROWSERS } from "../apps/web/test/e2e/support/browser-matrix.js";

const forwarded = process.argv.slice(2);

function runPlaywright(args: readonly string[]) {
  return spawnSync("pnpm", ["exec", "playwright", "test", ...args], {
    stdio: "inherit",
  }).status ?? 1;
}

// A caller who named a project is asking for exactly that run — a single engine
// to reproduce one failure — and looping over the matrix would defeat them.
if (forwarded.some((argument) => argument.startsWith("--project"))) {
  process.exit(runPlaywright(forwarded));
}

const failed = SUPPORTED_BROWSERS.filter(({ project }) => {
  console.log(`\n=== ${project} ===\n`);
  return runPlaywright([`--project=${project}`, ...forwarded]) !== 0;
}).map(({ project }) => project);

// Every engine runs even after one fails. A cross-browser suite exists to say
// *which* browsers are affected, and stopping at the first failure answers that
// question with the one browser that happened to be listed first.
if (failed.length > 0) {
  console.error(`\nRole journeys failed on: ${failed.join(", ")}`);
  process.exit(1);
}
