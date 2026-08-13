import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { isIP } from "node:net";

const PROXY_AUTHORIZATION_HEADER = "x-proxy-authorization";
const VERIFIED_SOURCE_HEADER = "x-verified-source";

function presentsTheSharedSecret(secret: Buffer, presented: string | string[] | undefined) {
  if (typeof presented !== "string") return false;
  const presentedBytes = Buffer.from(presented);
  return (
    presentedBytes.length === secret.length && timingSafeEqual(presentedBytes, secret)
  );
}

/**
 * ADR-0028 makes Caddy the sole public origin, so the API's socket peer is
 * Caddy rather than the person making the request. Reading the source Caddy
 * verified keeps ADR-0025's per-source budget per person.
 */
export function createVerifiedSourceReader(options: { trustedProxySecret?: string }) {
  const secret =
    options.trustedProxySecret === undefined
      ? null
      : Buffer.from(options.trustedProxySecret);

  return function verifiedSourceFor(request: IncomingMessage) {
    if (secret === null) return request.socket.remoteAddress ?? null;

    if (!presentsTheSharedSecret(secret, request.headers[PROXY_AUTHORIZATION_HEADER])) {
      return null;
    }

    // Caddy sends exactly the one address it verified. A chain, a name, or a
    // repeated header means something else produced the value, so it fails
    // closed rather than letting a caller choose which entry counts.
    const source = request.headers[VERIFIED_SOURCE_HEADER];
    return typeof source === "string" && isIP(source) !== 0 ? source : null;
  };
}
