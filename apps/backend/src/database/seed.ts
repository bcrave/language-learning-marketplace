import { pathToFileURL } from "node:url";

import { parseDemonstrationIdentityBinding } from "../auth/demonstration-identities.js";
import { parseAppConfig } from "../config.js";
import { loadCanonicalFixtures } from "../fixtures/canonical-fixture-loader.js";
import { createDatabase } from "./database.js";
import { migrateDatabase } from "./migrate.js";

/**
 * Seeding a database means loading the versioned canonical synthetic fixture
 * manifest. The manifest, the loader, and the invariants that gate publication all
 * live in `src/fixtures/`; this entry point only supplies a migrated database.
 */
async function main() {
  const config = parseAppConfig(process.env);
  const db = createDatabase(config.DATABASE_URL);
  try {
    await migrateDatabase(db);
    const identityBinding = parseDemonstrationIdentityBinding(process.env);
    const { manifestVersion } = await loadCanonicalFixtures(db, {
      ...(identityBinding ? { identityBinding } : {}),
    });
    process.stdout.write(`Loaded canonical fixture manifest ${manifestVersion}\n`);
  } finally {
    await db.destroy();
  }
}

const invokedPath = process.argv[1];
if (
  process.env.BUNDLED_TEST_API !== "true" &&
  invokedPath &&
  import.meta.url === pathToFileURL(invokedPath).href
) {
  await main();
}
