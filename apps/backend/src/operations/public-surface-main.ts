import { z } from "zod";

import { verifyDeployedBrowserPolicy } from "./browser-policy.js";
import { probeDeployedSourceMaps } from "./public-artifact-evidence.js";

/**
 * What the deployed public origin discloses to a browser, checked from outside
 * it as a release step after the browser client has been transitioned.
 *
 * Two things the Security Release Gate can only observe against the running
 * deployment: the browser policy Caddy writes, and whether the source maps this
 * build produced are reachable at the paths they would occupy. Both belong here
 * rather than in the deployed smoke journey, because both belong to Caddy — the
 * maintenance-time smoke reaches the API directly over loopback, where no public
 * origin exists and neither check applies.
 *
 * Any finding blocks the release. The output names checks, headers, paths, and
 * outcomes only: never a secret, a source address, or a person.
 */
const environment = z
  .object({
    PUBLIC_ORIGIN: z.url(),
    /** The two provider origins the policy names, and nothing else. */
    AUTH0_TENANT_ORIGIN: z.url(),
    SENTRY_INGEST_ORIGIN: z.url(),
  })
  .parse(process.env);

const [policy, sourceMaps] = await Promise.all([
  verifyDeployedBrowserPolicy({
    origin: environment.PUBLIC_ORIGIN,
    origins: {
      auth0Origin: new URL(environment.AUTH0_TENANT_ORIGIN).origin,
      sentryOrigin: new URL(environment.SENTRY_INGEST_ORIGIN).origin,
    },
  }),
  probeDeployedSourceMaps({ origin: environment.PUBLIC_ORIGIN }),
]);

process.stdout.write(
  `${JSON.stringify({ event: "release.public-surface", policy, sourceMaps })}\n`,
);
if (policy.some((finding) => finding.outcome === "FAILED") || sourceMaps.length > 0) {
  process.exitCode = 1;
}
