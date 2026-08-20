import { z } from "zod";

/**
 * ADR-0025 bounds public API resource consumption at 120 requests per minute
 * per source address. Automated suites drive every browser through loopback,
 * so one source legitimately carries the traffic of many people; they raise
 * this outside production rather than share a single person's budget.
 */
export const PRODUCTION_SOURCE_REQUEST_LIMIT = 120;

/**
 * ADR-0028 reaches the API only through Railway private networking, so the
 * shared secret Caddy presents is what distinguishes it from anything else on
 * that network. Below this length it would be guessable.
 */
const MINIMUM_TRUSTED_PROXY_SECRET_LENGTH = 32;

const baseConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_MODE: z.enum(["fake", "auth0"]).default("fake"),
  DATABASE_URL: z.url(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_SOURCE_REQUEST_LIMIT: z.coerce
    .number()
    .int()
    .positive()
    .default(PRODUCTION_SOURCE_REQUEST_LIMIT),
  API_TRUSTED_PROXY_SECRET: z
    .string()
    .min(MINIMUM_TRUSTED_PROXY_SECRET_LENGTH)
    .optional(),
  AUTH0_ISSUER: z.url().optional(),
  AUTH0_AUDIENCE: z.string().min(1).optional(),
  AUTH0_MANAGEMENT_CLIENT_ID: z.string().min(1).optional(),
  AUTH0_MANAGEMENT_CLIENT_SECRET: z.string().min(1).optional(),
});

export type AppConfig = z.infer<typeof baseConfigSchema>;

export function parseAppConfig(environment: Record<string, string | undefined>): AppConfig {
  const config = baseConfigSchema.parse(environment);

  if (config.NODE_ENV === "production" && config.AUTH_MODE === "fake") {
    throw new Error("Fake authentication is unavailable in production");
  }

  if (
    config.AUTH_MODE === "auth0" &&
    (!config.AUTH0_ISSUER || !config.AUTH0_AUDIENCE)
  ) {
    throw new Error("Auth0 authentication requires AUTH0_ISSUER and AUTH0_AUDIENCE");
  }

  if (Boolean(config.AUTH0_MANAGEMENT_CLIENT_ID) !== Boolean(config.AUTH0_MANAGEMENT_CLIENT_SECRET)) {
    throw new Error("Auth0 identity administration requires both AUTH0_MANAGEMENT_CLIENT_ID and AUTH0_MANAGEMENT_CLIENT_SECRET");
  }

  if (config.NODE_ENV === "production" && !config.API_TRUSTED_PROXY_SECRET) {
    throw new Error(
      "Verified source context requires API_TRUSTED_PROXY_SECRET in production",
    );
  }

  if (
    config.NODE_ENV === "production" &&
    config.API_SOURCE_REQUEST_LIMIT > PRODUCTION_SOURCE_REQUEST_LIMIT
  ) {
    throw new Error(
      `The per-source request limit cannot be raised above ${PRODUCTION_SOURCE_REQUEST_LIMIT} in production`,
    );
  }

  return config;
}
