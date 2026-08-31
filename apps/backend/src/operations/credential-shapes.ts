/**
 * The shapes a credential takes, in the one place both checks that look for
 * them can read.
 *
 * Two release-blocking checks need this list: the build-artifact evidence, which
 * proves a published bundle carries no secret, and the readiness record, which
 * proves a privacy-safe evidence artifact carries none either. They inspect
 * completely different material — machine-generated JavaScript and short
 * hand-written prose — but the question "is this a credential" has one answer,
 * and two copies of it drift the moment a new provider issues a new token
 * format.
 *
 * Shapes rather than names. A name like `API_TRUSTED_PROXY_SECRET` legitimately
 * appears in the server bundle and in an honest follow-up note, because reading
 * configuration means naming it, and rotating one means saying which.
 *
 * Each pattern requires the value as well as the label. A library that checks
 * whether its input begins `-----BEGIN PRIVATE KEY-----` carries that text
 * without carrying a key, and a check that flagged it would fail every honest
 * release until someone learned to ignore it.
 */
export const CREDENTIAL_VALUE_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  // The character classes exclude quotes and backticks so the pattern stops at
  // the end of a string literal in a bundle rather than running past it. Prose
  // never contains them mid-URL either, so the same bound holds for both.
  ["a PostgreSQL URL carrying credentials", /postgres(?:ql)?:\/\/[^\s"'`]*:[^\s"'`@]+@/i],
  [
    "private key material",
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\\rn"'`]*[A-Za-z0-9+/]{40}/,
  ],
  ["a signed token", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["a Railway API token", /\brailway_[A-Za-z0-9]{16,}/],
];

/**
 * Names the first credential shape in `content`, or nothing. Callers report the
 * name; the value that matched is never returned, because a finding that quoted
 * the credential would be the disclosure it exists to prevent.
 */
export function firstCredentialShape(content: string): string | undefined {
  return CREDENTIAL_VALUE_PATTERNS.find(([, pattern]) => pattern.test(content))?.[0];
}
