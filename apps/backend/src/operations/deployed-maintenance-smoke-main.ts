import { z } from "zod";

const environment = z.object({
  AUTH0_ISSUER: z.url(),
  AUTH0_AUDIENCE: z.string().min(1),
  SMOKE_CLIENT_ID: z.string().min(1),
  SMOKE_CLIENT_SECRET: z.string().min(1),
  SMOKE_STUDENT_USERNAME: z.string().min(1),
  SMOKE_STUDENT_PASSWORD: z.string().min(1),
  SMOKE_ADMINISTRATOR_USERNAME: z.string().min(1),
  SMOKE_ADMINISTRATOR_PASSWORD: z.string().min(1),
}).parse(JSON.parse(Buffer.from(process.argv[2] ?? "", "base64url").toString("utf8")));

for (let observation = 0; observation < 3; observation += 1) {
  const response = await fetch("http://127.0.0.1:4000/health/ready");
  if (!response.ok) throw new Error(`Deployed readiness observation failed with status ${response.status}`);
}
Object.assign(process.env, environment, { PUBLIC_ORIGIN: "http://127.0.0.1:4000" });
await import("./deployed-smoke-main.js");
