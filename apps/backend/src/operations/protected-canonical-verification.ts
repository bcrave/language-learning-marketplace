import { spawn } from "node:child_process";

import { z } from "zod";

const protectedVerificationEnvironment = z.object({
  RAILWAY_API_SERVICE: z.string().min(1).default("API"),
  AUTH0_ISSUER: z.url(),
  AUTH0_AUDIENCE: z.string().min(1),
  SMOKE_CLIENT_ID: z.string().min(1),
  SMOKE_CLIENT_SECRET: z.string().min(1),
  SMOKE_STUDENT_USERNAME: z.string().min(1),
  SMOKE_STUDENT_PASSWORD: z.string().min(1),
  SMOKE_ADMINISTRATOR_USERNAME: z.string().min(1),
  SMOKE_ADMINISTRATOR_PASSWORD: z.string().min(1),
});

/** Runs verification inside the active Railway API deployment while public traffic remains closed. */
export async function runProtectedCanonicalVerification(options: {
  environment?: Record<string, string | undefined>;
}) {
  const environment = protectedVerificationEnvironment.parse(options.environment ?? process.env);
  const payload = Buffer.from(JSON.stringify({
    AUTH0_ISSUER: environment.AUTH0_ISSUER,
    AUTH0_AUDIENCE: environment.AUTH0_AUDIENCE,
    SMOKE_CLIENT_ID: environment.SMOKE_CLIENT_ID,
    SMOKE_CLIENT_SECRET: environment.SMOKE_CLIENT_SECRET,
    SMOKE_STUDENT_USERNAME: environment.SMOKE_STUDENT_USERNAME,
    SMOKE_STUDENT_PASSWORD: environment.SMOKE_STUDENT_PASSWORD,
    SMOKE_ADMINISTRATOR_USERNAME: environment.SMOKE_ADMINISTRATOR_USERNAME,
    SMOKE_ADMINISTRATOR_PASSWORD: environment.SMOKE_ADMINISTRATOR_PASSWORD,
  })).toString("base64url");
  await new Promise<void>((resolve, reject) => {
    const child = spawn("railway", [
      "ssh", "--service", environment.RAILWAY_API_SERVICE, "--",
      "node", "apps/backend/dist/operations/deployed-maintenance-smoke-main.js", payload,
    ], { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Deployed maintenance smoke failed (${signal ?? `exit ${code}`})`));
    });
  });
}
