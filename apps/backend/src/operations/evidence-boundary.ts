import { firstCredentialShape } from "./credential-shapes.js";

/**
 * The boundary every release-evidence artifact is written inside, in the one
 * place all of them read.
 *
 * Two records publish privacy-safe evidence for a candidate: the [operational
 * readiness record](../../../../docs/operations/readiness-evidence.md) and the
 * [Security Gate Record](../../../../docs/security-verification.md). Both draw
 * the same line — safe names, fingerprints, counts, correlations and provider
 * links in; credentials, tokens, private configuration, raw source addresses
 * and personal data out — and both render it into Markdown tables a release
 * decision is read from.
 *
 * One line, one implementation. Two copies would drift the first time a new
 * provider issues a new token format, and the copy that did not learn about it
 * is the one that publishes the token.
 */

/**
 * The personal data the boundary excludes, on top of the credential shapes
 * shared with the build-artifact check.
 *
 * These two are specific to evidence written by hand. A follow-up owner is
 * typed by a person, and "the owner" is the obvious thing to type an address
 * for; a limitation or an abuse-case observation describing an incident is the
 * obvious place to write down the address that caused it. Both are named in the
 * operator guide's evidence boundary as things a record must never retain.
 *
 * Like the credential shapes, these look for values rather than names: a
 * limitation saying `RAILWAY_TOKEN needs rotating` is exactly the follow-up the
 * record exists to carry, while one carrying the token is the disclosure it
 * exists to prevent.
 */
const PERSONAL_DATA_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ["an email address", /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/],
  ["a source address", /\b(?:\d{1,3}\.){3}\d{1,3}\b/],
];

/**
 * Names the first thing in `text` that belongs only with its provider, or
 * nothing. Callers report the name; the value that matched is never returned,
 * because a finding that quoted it would be the disclosure it exists to
 * prevent.
 */
export function rawEvidenceShape(text: string): string | undefined {
  return (
    firstCredentialShape(text)
    ?? PERSONAL_DATA_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0]
  );
}

/**
 * Where private operational evidence is allowed to live.
 *
 * The threat model puts the raw evidence in GitHub Actions, Railway, and
 * Sentry, and a record's job is to point at it rather than copy it. A link
 * anywhere else is either evidence smuggled into a public artifact — a paste
 * site, an object store with the dump in it — or a link nobody can follow.
 */
const PRIVATE_EVIDENCE_HOSTS = [
  "github.com",
  "railway.com",
  "railway.app",
  "sentry.io",
];

/**
 * Whether a link points at private provider evidence and carries nothing but
 * the pointer. A query string is refused outright: signed provider links put
 * their credential there, and a record that published one would have leaked the
 * access it was trying to avoid copying.
 */
export function isPrivateEvidenceLink(link: string): boolean {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.search !== "" || url.username !== "" || url.password !== "") return false;
  return PRIVATE_EVIDENCE_HOSTS.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
  );
}

/**
 * One Markdown table cell.
 *
 * Every record has fields a person typed into a workflow input — a limitation,
 * a follow-up owner, an observation, a reason a check was not repeated — and a
 * single `|` in one of them would split the row and shift every later column,
 * silently reattributing a result in the artifact the release decision is read
 * from.
 */
export function evidenceCell(value: string | null | undefined): string {
  return value === null || value === undefined || value === ""
    ? "—"
    : value.replaceAll("|", "\\|").replaceAll(/\r?\n/g, " ");
}
