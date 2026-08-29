import { z } from "zod";

import { verifyDeployedBrowserPolicy } from "./browser-policy.js";

/**
 * The live browser-policy assertion the Security Release Gate makes against the
 * deployed public origin, run as its own release step after the browser client
 * has been transitioned.
 *
 * It is separate from the deployed smoke journey because the policy belongs to
 * Caddy rather than to the API: the maintenance-time smoke reaches the API
 * directly over loopback, where no public origin exists and no policy applies.
 *
 * Drift blocks the release. The output names headers and outcomes only, never a
 * secret, a source address, or a person.
 */
const environment = z
  .object({
    PUBLIC_ORIGIN: z.url(),
    /** The two provider origins the policy names, and nothing else. */
    AUTH0_TENANT_ORIGIN: z.url(),
    SENTRY_INGEST_ORIGIN: z.url(),
  })
  .parse(process.env);

const findings = await verifyDeployedBrowserPolicy({
  origin: environment.PUBLIC_ORIGIN,
  origins: {
    auth0Origin: new URL(environment.AUTH0_TENANT_ORIGIN).origin,
    sentryOrigin: new URL(environment.SENTRY_INGEST_ORIGIN).origin,
  },
});

process.stdout.write(
  `${JSON.stringify({ event: "release.browser-policy", findings })}\n`,
);
if (findings.some((finding) => finding.outcome === "FAILED")) process.exitCode = 1;
