import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";

import { z } from "zod";

const PROXY_AUTHORIZATION_HEADER = "x-proxy-authorization";
const VERIFIED_SOURCE_HEADER = "x-verified-source";

/**
 * How the transport hands the source it verified to the GraphQL layer, which
 * needs it for ADR 0025's denied-authorization budget. `createMarketplaceServer`
 * overwrites this header on every request it forwards, so a caller cannot
 * present one: whatever arrived under this name is replaced before the API
 * sees it.
 */
export const VERIFIED_SOURCE_CONTEXT_HEADER = "x-marketplace-verified-source";

/**
 * Caddy sends exactly the one address it verified. A chain, a name, or a
 * repeated header means something else produced the value, so the request
 * fails closed rather than letting a caller choose which entry counts.
 */
const verifiedSourceSchema = z.union([z.ipv4(), z.ipv6()]);

function presentsTheSharedSecret(secret: Buffer, presented: string | string[] | undefined) {
  if (typeof presented !== "string") return false;
  const presentedBytes = Buffer.from(presented);
  return (
    presentedBytes.length === secret.length && timingSafeEqual(presentedBytes, secret)
  );
}

/** The peer that opened the connection, which behind Caddy is Caddy itself. */
export function connectionSourceFor(request: IncomingMessage) {
  return request.socket.remoteAddress ?? null;
}

/**
 * ADR-0028 makes Caddy the sole public origin, so the API's socket peer is
 * Caddy rather than the person making the request. Reading the source Caddy
 * verified keeps ADR-0025's per-source budget per person.
 */
export function createVerifiedSourceReader(trustedProxySecret: string | undefined) {
  const secret =
    trustedProxySecret === undefined ? null : Buffer.from(trustedProxySecret);

  return function verifiedSourceFor(request: IncomingMessage) {
    if (secret === null) return connectionSourceFor(request);

    if (!presentsTheSharedSecret(secret, request.headers[PROXY_AUTHORIZATION_HEADER])) {
      return null;
    }

    const source = verifiedSourceSchema.safeParse(request.headers[VERIFIED_SOURCE_HEADER]);
    return source.success ? source.data : null;
  };
}
