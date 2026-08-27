import { USER_ROLES, type UserRole } from "@marketplace/core";
import { z } from "zod";

import type { Database } from "../database/database.js";
import {
  canonicalFixtureManifest,
  type CanonicalFixtureManifest,
} from "../fixtures/canonical-fixture-manifest.js";

/**
 * ADR 0019 presents shared Auth0 identities to reviewers. Who those people are,
 * and which roles each of them holds, is settled once by the canonical fixture
 * manifest; this binding only says which Auth0 `sub` signs in as which of them.
 *
 * That separation is what makes ADR 0019's "no Project Owner elevation path"
 * enforceable rather than asserted. A binding can never widen anyone: it grants
 * no Role Assignment, and the only authority a bound identity can reach is the
 * one the manifest already gave that synthetic person. Project Owner is not an
 * application role at all — CONTEXT.md places it outside the application — so
 * there is nothing here, or anywhere in `USER_ROLES`, that could grant it.
 *
 * Auth0 subjects are public identifiers, not credentials (ADR 0039 classifies
 * the tenant's public client configuration as public), so they are ordinary
 * configuration rather than secrets.
 */
export interface DemonstrationIdentityBinding {
  issuer: string;
  /** Canonical fixture User id to the Auth0 `sub` that signs in as them. */
  subjects: Record<string, string>;
}

const subjectsSchema = z.record(z.uuid(), z.string().min(1).max(255));

/**
 * Reads the binding from environment configuration, returning null when this
 * deployment has none. A malformed or partial binding throws rather than
 * silently leaving a role unreachable in a deployment that claims to
 * demonstrate it.
 */
export function parseDemonstrationIdentityBinding(
  environment: Record<string, string | undefined>,
  manifest: CanonicalFixtureManifest = canonicalFixtureManifest,
): DemonstrationIdentityBinding | null {
  const raw = environment.DEMONSTRATION_IDENTITY_SUBJECTS;
  if (!raw) return null;
  const issuer = environment.AUTH0_ISSUER;
  if (!issuer) {
    throw new Error("Shared demonstration identities require AUTH0_ISSUER");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("DEMONSTRATION_IDENTITY_SUBJECTS is not valid JSON");
  }
  const subjects = subjectsSchema.safeParse(parsed);
  if (!subjects.success) {
    throw new Error(
      "DEMONSTRATION_IDENTITY_SUBJECTS must map canonical User identifiers to Auth0 subjects",
    );
  }

  return validateDemonstrationIdentityBinding(
    { issuer: issuer.endsWith("/") ? issuer : `${issuer}/`, subjects: subjects.data },
    manifest,
  );
}

export function validateDemonstrationIdentityBinding(
  binding: DemonstrationIdentityBinding,
  manifest: CanonicalFixtureManifest = canonicalFixtureManifest,
): DemonstrationIdentityBinding {
  const boundUserIds = Object.keys(binding.subjects);
  const unknown = boundUserIds.filter(
    (userId) => !manifest.identities.some((identity) => identity.id === userId),
  );
  if (unknown.length > 0) {
    // A binding for someone the manifest does not describe would create an
    // authenticated identity whose roles and history nobody has reviewed.
    throw new Error(
      "A shared demonstration identity must be a canonical fixture identity",
    );
  }

  const subjects = Object.values(binding.subjects);
  if (new Set(subjects).size !== subjects.length) {
    // One Auth0 subject signing in as two people would hand whoever holds it
    // the union of both sets of roles.
    throw new Error("Each shared demonstration identity requires its own Auth0 subject");
  }

  const demonstratedRoles = new Set(
    manifest.identities
      .filter((identity) => boundUserIds.includes(identity.id))
      .flatMap((identity) => identity.roles),
  );
  const missing = USER_ROLES.filter((role) => !demonstratedRoles.has(role));
  if (missing.length > 0) {
    throw new Error(
      `Shared demonstration identities must cover every application role; missing ${missing.join(", ")}`,
    );
  }

  return binding;
}

/**
 * Points the bound canonical identities at the Auth0 tenant. It writes only the
 * external identity columns: Role Assignments, access status, and history stay
 * exactly as the canonical load left them.
 */
export async function bindDemonstrationIdentities(
  db: Database,
  binding: DemonstrationIdentityBinding,
  manifest: CanonicalFixtureManifest = canonicalFixtureManifest,
): Promise<void> {
  validateDemonstrationIdentityBinding(binding, manifest);
  for (const [userId, subject] of Object.entries(binding.subjects)) {
    await db
      .updateTable("users")
      .set({ identity_issuer: binding.issuer, identity_subject: subject })
      .where("id", "=", userId)
      .execute();
  }
}

/** The roles a bound identity may act in, taken only from the manifest. */
export function rolesForDemonstrationIdentity(
  userId: string,
  manifest: CanonicalFixtureManifest = canonicalFixtureManifest,
): UserRole[] {
  const identity = manifest.identities.find((candidate) => candidate.id === userId);
  return identity ? [...identity.roles] : [];
}
