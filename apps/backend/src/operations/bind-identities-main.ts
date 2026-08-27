import {
  bindDemonstrationIdentities,
  parseDemonstrationIdentityBinding,
} from "../auth/demonstration-identities.js";
import { createDatabase } from "../database/database.js";

/**
 * Points ADR 0019's shared reviewer identities at the deployment's Auth0
 * tenant. It runs as the API service's pre-deploy step, inside Railway's
 * private network and against the service's own database reference variable,
 * so no database credential is stored outside Railway.
 *
 * This is deliberately not a Canonical Data Rebuild. Binding writes only the
 * external identity columns, so it is safe on every release: a reviewer's
 * mutable activity survives it, and returning the marketplace to its fixture
 * baseline remains its own separate, quiesced workflow (ADR 0020).
 *
 * A deployment with no binding configured is left alone rather than failed —
 * local development and the Playwright suite authenticate through the fake
 * adapter of ADR 0037 and have no Auth0 tenant to point at.
 */
const binding = parseDemonstrationIdentityBinding(process.env);
if (!binding) {
  process.stdout.write(
    `${JSON.stringify({ event: "release.identity-binding", outcome: "SKIPPED" })}\n`,
  );
} else {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Binding shared demonstration identities requires DATABASE_URL");
  const db = createDatabase(databaseUrl);
  try {
    await bindDemonstrationIdentities(db, binding);
    process.stdout.write(
      `${JSON.stringify({
        event: "release.identity-binding",
        outcome: "BOUND",
        // Counts and the issuer only: the subjects are public identifiers, but
        // a release log is not where a reviewer's sign-in name belongs.
        identities: Object.keys(binding.subjects).length,
        issuer: binding.issuer,
      })}\n`,
    );
  } finally {
    await db.destroy();
  }
}
