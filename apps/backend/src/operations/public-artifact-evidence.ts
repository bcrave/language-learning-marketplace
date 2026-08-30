/**
 * The build-evidence half of the Security Release Gate: proof that the artifacts
 * a release publishes carry no secret, no private diagnostic surface, and no
 * prohibited source map.
 *
 * The two artifacts are inspected against different rules because they are
 * public in different ways. The browser bundle is served byte for byte to anyone
 * who visits, so an operational identifier in it is disclosure. The server
 * bundle is never served, so what matters there is a credential value that
 * should only ever have lived in a provider's secret store.
 *
 * Deliberately public values — the Auth0 domain, client identifier and audience,
 * and the Sentry DSN — are not secrets and are expected in the browser bundle.
 * The checks therefore look for the shapes of credentials and the names of
 * private surfaces, not for anything that merely resembles a configured value.
 */
export interface ArtifactFile {
  path: string;
  content: string;
}

export interface ArtifactFinding {
  /** A stable check identifier the Security Gate Record can carry. */
  check: string;
  path: string;
  /** Privacy-safe: names what was found, never the value that was found. */
  detail: string;
}

export const PUBLIC_ARTIFACT_CHECKS = [
  "artifact.fakeAuthenticationAbsent",
  "artifact.sourceMapsAbsent",
  "artifact.secretsAbsent",
  "artifact.privateSurfacesAbsent",
] as const;

/**
 * ADR 0037 keeps fake authentication out of production entirely, so its markers
 * must not survive into either artifact.
 */
const FAKE_AUTHENTICATION_MARKERS = [
  "x-demo-user-id",
  "FakeAuthenticator",
  "fake-authenticator",
];

/**
 * Credential shapes rather than credential names: a PostgreSQL URL carrying a
 * password, private key material, and a signed token. A name like
 * `API_TRUSTED_PROXY_SECRET` legitimately appears in the server bundle, because
 * reading configuration means naming it.
 *
 * Each pattern requires the value as well as the label. A library that checks
 * whether its input begins `-----BEGIN PRIVATE KEY-----` carries that text
 * without carrying a key, and a check that flagged it would fail every honest
 * release until someone learned to ignore it.
 */
const SECRET_VALUE_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ["a PostgreSQL URL carrying credentials", /postgres(?:ql)?:\/\/[^\s"'`]*:[^\s"'`@]+@/],
  [
    "private key material",
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\\rn"'`]*[A-Za-z0-9+/]{40}/,
  ],
  ["a signed token", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["a Railway API token", /\brailway_[A-Za-z0-9]{16,}/],
];

/**
 * An inline source map is the map itself, served with the code. A reference to
 * a map file is not: the build uploads maps privately to Sentry and discards
 * them from the deployment, so the reference dangles and the published `.map`
 * check below is what proves the map is genuinely absent.
 *
 * The comment must begin a line. The same text appears inside library code that
 * composes a source-map comment for a worker it builds at runtime.
 */
const INLINE_SOURCE_MAP = /^\/\/#\s*sourceMappingURL=data:/m;

/**
 * Names that must not reach a browser. The health probes, the trusted-proxy
 * headers, the maintenance lease, and the owner-only release surfaces all live
 * behind Railway private networking or GitHub Actions; a reviewer's bundle
 * naming one of them would advertise a surface the threat model says is absent.
 */
const PRIVATE_SURFACE_MARKERS = [
  "/health/live",
  "/health/ready",
  "/health/worker",
  "x-proxy-authorization",
  "x-verified-source",
  "maintenance_state",
  "RAILWAY_TOKEN",
  "AUTH0_MANAGEMENT_CLIENT_SECRET",
  "API_TRUSTED_PROXY_SECRET",
];

function findingsFor(
  files: readonly ArtifactFile[],
  check: string,
  detect: (content: string) => string | undefined,
): ArtifactFinding[] {
  return files.flatMap((file) => {
    const detail = detect(file.content);
    return detail ? [{ check, path: file.path, detail }] : [];
  });
}

function firstMarker(content: string, markers: readonly string[]) {
  return markers.find((marker) => content.includes(marker));
}

function firstSecretShape(content: string) {
  return SECRET_VALUE_PATTERNS.find(([, pattern]) => pattern.test(content))?.[0];
}

/**
 * Inspects one release's artifacts. An empty result is the evidence; anything
 * returned blocks the release, because the gate cannot waive a required check.
 */
export function inspectPublicArtifacts(artifacts: {
  /** Everything served from the public origin as the browser client. */
  browser: readonly ArtifactFile[];
  /** Everything the API and worker services run, which is never served. */
  server: readonly ArtifactFile[];
}): ArtifactFinding[] {
  const everything = [...artifacts.browser, ...artifacts.server];

  return [
    ...findingsFor(everything, "artifact.fakeAuthenticationAbsent", (content) => {
      const marker = firstMarker(content, FAKE_AUTHENTICATION_MARKERS);
      return marker && `production-forbidden marker ${marker}`;
    }),
    ...findingsFor(everything, "artifact.sourceMapsAbsent", (content) =>
      INLINE_SOURCE_MAP.test(content) ? "an inline source map" : undefined,
    ),
    ...everything
      .filter((file) => file.path.endsWith(".map"))
      .map((file) => ({
        check: "artifact.sourceMapsAbsent",
        path: file.path,
        detail: "a published source map",
      })),
    ...findingsFor(everything, "artifact.secretsAbsent", (content) => {
      const shape = firstSecretShape(content);
      return shape && `${shape}, which belongs only in a provider secret store`;
    }),
    ...findingsFor(artifacts.browser, "artifact.privateSurfacesAbsent", (content) => {
      const marker = firstMarker(content, PRIVATE_SURFACE_MARKERS);
      return marker && `the private surface ${marker}`;
    }),
  ];
}

/** Where the entry document's first-party assets are served from. */
const FIRST_PARTY_ASSET = /["'](\/assets\/[A-Za-z0-9._-]+\.(?:js|css))["']/g;

/**
 * Proves the deployment does not serve the source maps its build produced.
 *
 * Scanning the local artifact proves the maps are not *in* the build. This
 * proves the other half the release gate asks for: that requesting the path a
 * map would occupy returns nothing. A map uploaded privately to Sentry and
 * discarded from the deployment is the intended state; one still reachable at
 * its expected path is a disclosure of the whole source tree.
 *
 * Finding no asset to probe is itself a finding. A check that silently probed
 * nothing would pass every release while proving nothing.
 */
export async function probeDeployedSourceMaps(options: {
  origin: string;
  fetch?: typeof fetch;
}): Promise<ArtifactFinding[]> {
  const call = options.fetch ?? fetch;
  const check = "artifact.sourceMapsNotServed";

  let entryDocument: string;
  try {
    const response = await call(new URL("/", options.origin));
    entryDocument = await response.text();
  } catch {
    return [
      { check, path: "/", detail: "the public origin did not answer an asset probe" },
    ];
  }

  const assets = [...entryDocument.matchAll(FIRST_PARTY_ASSET)].map((match) => match[1]!);
  if (assets.length === 0) {
    return [
      { check, path: "/", detail: "the entry document referenced no first-party asset" },
    ];
  }

  const probes = await Promise.all(
    [...new Set(assets)].map(async (asset) => {
      const mapPath = `${asset}.map`;
      try {
        const response = await call(new URL(mapPath, options.origin));
        return response.ok ? { check, path: mapPath, detail: "a publicly served source map" } : null;
      } catch {
        // A request that cannot complete is not evidence that a map is served.
        return null;
      }
    }),
  );
  return probes.filter((finding) => finding !== null);
}
