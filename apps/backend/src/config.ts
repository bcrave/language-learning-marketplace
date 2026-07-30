import { z } from "zod";

const baseConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_MODE: z.enum(["fake", "auth0"]).default("fake"),
  DATABASE_URL: z.url(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  AUTH0_ISSUER: z.url().optional(),
  AUTH0_AUDIENCE: z.string().min(1).optional(),
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

  return config;
}
