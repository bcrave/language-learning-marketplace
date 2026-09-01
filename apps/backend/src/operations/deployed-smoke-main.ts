import { z } from "zod";

import { runDeployedSmoke } from "./deployed-smoke.js";
import {
  smokeAuthorizationHeaders,
  smokeCredentialEnvironmentSchema,
} from "./smoke-credentials.js";

/**
 * The final release stage of ADR 0038, run against the public origin after the
 * browser client has been transitioned. It authenticates as each of ADR 0019's
 * four shared identities — Student, Teacher, Organization Manager, Platform
 * Administrator — and walks their journeys plus the cross-role denials between
 * them.
 *
 * Only the report reaches the release log: check names, outcomes, and
 * privacy-safe details. Credentials come from the protected `production`
 * environment for that run only and are never printed (ADR 0020, ADR 0039).
 */
const environment = smokeCredentialEnvironmentSchema
  .extend({ PUBLIC_ORIGIN: z.url() })
  .parse(process.env);

const report = await runDeployedSmoke({
  origin: environment.PUBLIC_ORIGIN,
  authorizationFor: await smokeAuthorizationHeaders(environment),
});

process.stdout.write(`${JSON.stringify({ event: "release.deployed-smoke", ...report })}\n`);
if (!report.passed) process.exitCode = 1;
