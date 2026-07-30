import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

export type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

const POSTGRES_IMAGE =
  "postgres:18@sha256:3a82e1f56c8f0f5616a11103ac3d47e632c3938698946a7ad26da0df1334744a";

export async function startPostgreSqlTemplate(): Promise<StartedPostgreSqlContainer> {
  return new PostgreSqlContainer(POSTGRES_IMAGE)
    .withDatabase("marketplace_template")
    .withUsername("marketplace")
    .withPassword("marketplace")
    .start();
}

export async function clonePostgreSqlTemplate(
  container: StartedPostgreSqlContainer,
  databaseName: string,
) {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(databaseName)) {
    throw new Error("Test database name is invalid");
  }
  const result = await container.exec([
    "createdb",
    "--username=marketplace",
    "--template=marketplace_template",
    databaseName,
  ]);
  if (result.exitCode !== 0) throw new Error("PostgreSQL template clone failed");

  const connectionUrl = new URL(container.getConnectionUri());
  connectionUrl.pathname = `/${databaseName}`;
  return connectionUrl.toString();
}
