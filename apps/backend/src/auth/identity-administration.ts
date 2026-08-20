import type { UserIdentity } from "@marketplace/core";

export interface IdentityAdministration {
  /** Implementations must treat an already-missing identity as a successful deletion. */
  deleteIdentity(identity: UserIdentity): Promise<void>;
}

export function createSimulatedIdentityAdministration(): IdentityAdministration {
  return { deleteIdentity: async () => undefined };
}

export function createUnavailableIdentityAdministration(): IdentityAdministration {
  return { deleteIdentity: async () => { throw new Error("Auth0 identity administration is not configured"); } };
}
