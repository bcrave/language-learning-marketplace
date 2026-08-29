import type { Database } from "../database/database.js";
import {
  persistedOperationManifest,
  type PersistedOperationManifest,
} from "./persisted-operations.js";

/**
 * The rollout window of ADR 0038, for ADR 0024's persisted operations.
 *
 * The release job deploys the API before the browser client, so for the length
 * of the rollout the previous bundle is still being served while the new API is
 * already answering. An API that knew only its own manifest would refuse every
 * reviewer in exactly that window. So the manifest a release accepts outlives
 * the process that built it: each API records its own as it starts, and accepts
 * the documents of the current and immediately previous releases.
 *
 * Two generations is the whole window. A third would keep an operation
 * executable long after the client that sent it was replaced, which is the
 * surface ADR 0024 removes; ADR 0038 makes GraphQL removals wait one release
 * rather than forever.
 */
export const ACCEPTED_RELEASE_GENERATIONS = 2;

/**
 * Records this release's manifest and returns the documents production will
 * execute: this build's, plus whatever the release before it still sends.
 *
 * Recording is idempotent, so a restarted or redeployed API re-records the same
 * release rather than consuming a generation. A rollback re-records the older
 * release as the current one, which is what makes the release it rolled back
 * from the "previous" one it still accepts.
 */
export async function acceptedPersistedOperations(
  db: Database,
  options: { release: string; documents: Record<string, string> },
): Promise<PersistedOperationManifest> {
  const manifest = persistedOperationManifest(options.documents);

  const accepted = await db.transaction().execute(async (transaction) => {
    await transaction
      .insertInto("persisted_operation_manifests")
      .values({ release: options.release, version: manifest.version })
      .onConflict((conflict) =>
        conflict.column("release").doUpdateSet({
          version: manifest.version,
          recorded_at: new Date(),
        }),
      )
      .execute();

    const documents = Object.entries(options.documents).map(([id, document]) => ({
      document_id: id,
      release: options.release,
      document,
    }));
    if (documents.length > 0) {
      await transaction
        .insertInto("persisted_operations")
        .values(documents)
        .onConflict((conflict) => conflict.columns(["document_id", "release"]).doNothing())
        .execute();
    }

    const retained = await transaction
      .selectFrom("persisted_operation_manifests")
      .select("release")
      .orderBy("recorded_at", "desc")
      .orderBy("release", "desc")
      .limit(ACCEPTED_RELEASE_GENERATIONS)
      .execute();
    const retainedReleases = retained.map((row) => row.release);

    // Older generations go with their documents, so the table holds exactly
    // what production will execute and nothing a reader has to filter.
    await transaction
      .deleteFrom("persisted_operation_manifests")
      .where("release", "not in", retainedReleases)
      .execute();

    return transaction
      .selectFrom("persisted_operations")
      .select(["document_id", "document"])
      .where("release", "in", retainedReleases)
      .execute();
  });

  return persistedOperationManifest(
    Object.fromEntries(accepted.map((row) => [row.document_id, row.document])),
  );
}
