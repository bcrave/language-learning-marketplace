import { z } from "zod";

import { normalizedIssuer } from "../auth/issuer.js";

/**
 * Obtains an access token for one shared demonstration identity so the release
 * job can drive the deployed smoke journey (ADR 0038) as a real reviewer would.
 *
 * The browser never takes this path: ADR 0027 keeps a reviewer's own session on
 * the redirect-based Authorization Code Flow with PKCE, with rotating refresh
 * tokens in memory. This is the release job's own principal, and its
 * credentials come from the protected `production` environment for that run
 * only (ADR 0020). Nothing here logs, returns, or stores a credential, and a
 * failure carries only the provider's status code — never its response body,
 * which ADR 0039 keeps in the provider console.
 */
const tokenResponseSchema = z.object({ access_token: z.string().min(1) });

export interface DemonstrationCredential {
  username: string;
  password: string;
}

export async function requestDemonstrationAccessToken(options: {
  issuer: string;
  audience: string;
  clientId: string;
  clientSecret: string;
  credential: DemonstrationCredential;
  fetch?: typeof fetch;
}): Promise<string> {
  const issuer = normalizedIssuer(options.issuer);
  const call = options.fetch ?? fetch;
  const response = await call(`${issuer}oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "password",
      username: options.credential.username,
      password: options.credential.password,
      audience: options.audience,
      client_id: options.clientId,
      client_secret: options.clientSecret,
      scope: "openid",
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Shared demonstration authentication failed with status ${response.status}`,
    );
  }
  const token = tokenResponseSchema.safeParse(await response.json());
  if (!token.success) {
    throw new Error("Shared demonstration authentication returned no access token");
  }
  return token.data.access_token;
}

/** Bearer headers, kept in one place so no caller assembles them by hand. */
export function bearerHeaders(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}
