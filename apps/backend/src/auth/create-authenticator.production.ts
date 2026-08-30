import type { Authenticator } from "@marketplace/core";

import type { AppConfig } from "../config.js";
import { Auth0Authenticator } from "./auth0-authenticator.js";

export async function createAuthenticator(
  config: Pick<AppConfig, "AUTH_MODE" | "AUTH0_AUDIENCE" | "AUTH0_ISSUER" | "NODE_ENV">,
  options: { onBoundaryFailure?: (failure: { safeFailureCode: string }) => void } = {},
): Promise<Authenticator> {
  if (config.AUTH_MODE === "fake") {
    throw new Error("Fake authentication is unavailable in production");
  }
  return new Auth0Authenticator({
    audience: config.AUTH0_AUDIENCE!,
    issuer: config.AUTH0_ISSUER!,
    ...(options.onBoundaryFailure ? { onBoundaryFailure: options.onBoundaryFailure } : {}),
  });
}
