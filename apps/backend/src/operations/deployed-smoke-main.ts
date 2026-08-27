import { z } from "zod";

import {
  bearerHeaders,
  requestDemonstrationAccessToken,
} from "./demonstration-access-token.js";
import { runDeployedSmoke } from "./deployed-smoke.js";

/**
 * The final release stage of ADR 0038, run against the public origin after the
 * browser client has been transitioned. It authenticates as ADR 0019's shared
 * Student and Platform Administrator and walks the reviewer journey.
 *
 * Only the report reaches the release log: check names, outcomes, and
 * privacy-safe details. Credentials come from the protected `production`
 * environment for that run only and are never printed (ADR 0020, ADR 0039).
 */
const environmentSchema = z.object({
  PUBLIC_ORIGIN: z.url(),
  AUTH0_ISSUER: z.url(),
  AUTH0_AUDIENCE: z.string().min(1),
  SMOKE_CLIENT_ID: z.string().min(1),
  SMOKE_CLIENT_SECRET: z.string().min(1),
  SMOKE_STUDENT_USERNAME: z.string().min(1),
  SMOKE_STUDENT_PASSWORD: z.string().min(1),
  SMOKE_ADMINISTRATOR_USERNAME: z.string().min(1),
  SMOKE_ADMINISTRATOR_PASSWORD: z.string().min(1),
});

const environment = environmentSchema.parse(process.env);
const tenant = {
  issuer: environment.AUTH0_ISSUER,
  audience: environment.AUTH0_AUDIENCE,
  clientId: environment.SMOKE_CLIENT_ID,
  clientSecret: environment.SMOKE_CLIENT_SECRET,
};

const [student, administrator] = await Promise.all([
  requestDemonstrationAccessToken({
    ...tenant,
    credential: {
      username: environment.SMOKE_STUDENT_USERNAME,
      password: environment.SMOKE_STUDENT_PASSWORD,
    },
  }),
  requestDemonstrationAccessToken({
    ...tenant,
    credential: {
      username: environment.SMOKE_ADMINISTRATOR_USERNAME,
      password: environment.SMOKE_ADMINISTRATOR_PASSWORD,
    },
  }),
]);

const report = await runDeployedSmoke({
  origin: environment.PUBLIC_ORIGIN,
  authorizationFor: {
    student: bearerHeaders(student),
    administrator: bearerHeaders(administrator),
  },
});

process.stdout.write(`${JSON.stringify({ event: "release.deployed-smoke", ...report })}\n`);
if (!report.passed) process.exitCode = 1;
