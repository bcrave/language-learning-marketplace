/**
 * Auth0 issues tokens with a trailing-slash issuer, and every comparison
 * against one has to agree on that slash: a JWKS URL, an `iss` claim check, a
 * Management API path, and a `users.identity_issuer` row are all the same
 * string or none of them match. Configuration is written both ways, so
 * normalising once is what keeps the four in step.
 */
export function normalizedIssuer(issuer: string) {
  return issuer.endsWith("/") ? issuer : `${issuer}/`;
}
