import { z } from "zod";

import {
  bearerHeaders,
  requestDemonstrationAccessToken,
} from "./demonstration-access-token.js";
import { type SmokeRole } from "./deployed-smoke.js";

/**
 * The four shared demonstration credentials the deployed smoke journey signs in
 * with, in the one place both callers of that journey read them.
 *
 * The release runs the journey as its last stage, and a change-triggered
 * recovery drill runs the same journey to prove return to service. Two copies
 * of this schema would mean a role added to the journey silently kept working
 * in one of them and started failing at run time in the other — and the one
 * that fails at run time is the drill, in the middle of an incident.
 *
 * Nothing here logs, returns, or stores a credential: the environment values go
 * straight to Auth0 and only bearer headers come back (ADR 0020, ADR 0039).
 */
export const smokeCredentialEnvironmentSchema = z.object({
  AUTH0_ISSUER: z.url(),
  AUTH0_AUDIENCE: z.string().min(1),
  SMOKE_CLIENT_ID: z.string().min(1),
  SMOKE_CLIENT_SECRET: z.string().min(1),
  SMOKE_STUDENT_USERNAME: z.string().min(1),
  SMOKE_STUDENT_PASSWORD: z.string().min(1),
  SMOKE_TEACHER_USERNAME: z.string().min(1),
  SMOKE_TEACHER_PASSWORD: z.string().min(1),
  SMOKE_ORGANIZATION_MANAGER_USERNAME: z.string().min(1),
  SMOKE_ORGANIZATION_MANAGER_PASSWORD: z.string().min(1),
  SMOKE_ADMINISTRATOR_USERNAME: z.string().min(1),
  SMOKE_ADMINISTRATOR_PASSWORD: z.string().min(1),
});

export type SmokeCredentialEnvironment = z.infer<typeof smokeCredentialEnvironmentSchema>;

/**
 * Which environment values carry which role's credential, written out rather
 * than derived from the role name. A role added to `SMOKE_ROLES` fails to
 * compile until its credential is named here, which is the point: a journey
 * that added a role and silently reused another role's token would report a
 * cross-role denial it never actually attempted.
 */
function credentialFor(
  environment: SmokeCredentialEnvironment,
  role: SmokeRole,
): { username: string; password: string } {
  const credentials: Record<SmokeRole, { username: string; password: string }> = {
    student: {
      username: environment.SMOKE_STUDENT_USERNAME,
      password: environment.SMOKE_STUDENT_PASSWORD,
    },
    teacher: {
      username: environment.SMOKE_TEACHER_USERNAME,
      password: environment.SMOKE_TEACHER_PASSWORD,
    },
    organizationManager: {
      username: environment.SMOKE_ORGANIZATION_MANAGER_USERNAME,
      password: environment.SMOKE_ORGANIZATION_MANAGER_PASSWORD,
    },
    administrator: {
      username: environment.SMOKE_ADMINISTRATOR_USERNAME,
      password: environment.SMOKE_ADMINISTRATOR_PASSWORD,
    },
  };
  return credentials[role];
}

/** Authenticates every shared identity and returns the journey's headers. */
export async function smokeAuthorizationHeaders(
  environment: SmokeCredentialEnvironment,
): Promise<Record<SmokeRole, Record<string, string>>> {
  const tenant = {
    issuer: environment.AUTH0_ISSUER,
    audience: environment.AUTH0_AUDIENCE,
    clientId: environment.SMOKE_CLIENT_ID,
    clientSecret: environment.SMOKE_CLIENT_SECRET,
  };
  const headersFor = async (role: SmokeRole) =>
    bearerHeaders(
      await requestDemonstrationAccessToken({
        ...tenant,
        credential: credentialFor(environment, role),
      }),
    );

  const [student, teacher, organizationManager, administrator] = await Promise.all([
    headersFor("student"),
    headersFor("teacher"),
    headersFor("organizationManager"),
    headersFor("administrator"),
  ]);
  return { student, teacher, organizationManager, administrator };
}
