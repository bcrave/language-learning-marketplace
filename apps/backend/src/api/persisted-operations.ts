import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Kind, OperationTypeNode, parse } from "graphql";

import { RELEASE_JOURNEY_OPERATIONS } from "./release-journey-operations.js";

/**
 * ADR 0024's persisted-operation manifest: the exact set of GraphQL documents
 * the build produced, keyed by the hash the client sends instead of a document.
 *
 * The manifest is not an authorization control. It removes the ability to
 * compose arbitrary documents against the public schema; token validation,
 * relationship-scoped authorization, input validation, pagination bounds, and
 * the resource budgets all still run for every accepted operation.
 *
 * Reading is deliberately fail-closed. A manifest whose identifier does not
 * match its document, or whose document is not one executable operation, is a
 * build that cannot be trusted to say what production runs, so loading throws
 * rather than serving a partially trusted manifest.
 */

/** GraphQL Code Generator's rule, reproduced so both halves agree by construction. */
export function persistedOperationId(document: string) {
  return `sha256:${createHash("sha256").update(document).digest("hex")}`;
}

/**
 * The budget class an operation is charged against. ADR 0025 gives reports and
 * exports a much smaller allowance than ordinary mutations because one of them
 * can scan a reporting range, and ordinary reads are left to the per-source
 * request limit.
 */
export type OperationBudgetClass = "QUERY" | "MUTATION" | "REPORT";

/**
 * The root fields whose cost is a reporting range rather than a record. Both
 * queries and mutations appear here: requesting a Report Export queues the same
 * work that reading a report performs inline.
 */
export const REPORTING_ROOT_FIELDS: ReadonlySet<string> = new Set([
  "auditLog",
  "auditLogExport",
  "marketplaceOperationalReport",
  "organizationAttendanceAndProgressReport",
  "reportExportArtifact",
  "reportExports",
  "requestReportExport",
]);

export function classifyOperationBudget(
  document: string,
  operationName?: string | null,
): OperationBudgetClass {
  let parsed;
  try {
    parsed = parse(document);
  } catch {
    // An unparseable document never executes. Charging it as a mutation keeps
    // the cheapest class from being the one an invalid document falls into.
    return "MUTATION";
  }

  const operations = parsed.definitions.filter(
    (definition) => definition.kind === Kind.OPERATION_DEFINITION,
  );
  const operation = operationName
    ? operations.find((candidate) => candidate.name?.value === operationName) ?? operations[0]
    : operations[0];
  if (!operation) return "QUERY";

  const reachesReporting = operation.selectionSet.selections.some(
    (selection) =>
      selection.kind === Kind.FIELD && REPORTING_ROOT_FIELDS.has(selection.name.value),
  );
  if (reachesReporting) return "REPORT";
  return operation.operation === OperationTypeNode.MUTATION ? "MUTATION" : "QUERY";
}

export interface PersistedOperationManifest {
  /**
   * The manifest's fingerprint: a stable identifier for exactly this set of
   * operations, which the Security Gate Record names for a release candidate.
   */
  version: string;
  size: number;
  /** The document a client identifier stands for, or `undefined` when unknown. */
  documentFor(id: string): string | undefined;
  /**
   * The budget class of a document already in the manifest, falling back to
   * classifying an arbitrary document outside production.
   */
  budgetClassFor(document: string, operationName?: string | null): OperationBudgetClass;
}

export function persistedOperationManifest(
  documents: Record<string, string>,
): PersistedOperationManifest {
  const byId = new Map<string, string>();
  const budgetByDocument = new Map<string, OperationBudgetClass>();

  for (const [id, document] of Object.entries(documents)) {
    if (id !== persistedOperationId(document)) {
      throw new Error("A persisted operation identifier does not match its document");
    }
    const operations = parse(document).definitions.filter(
      (definition) => definition.kind === Kind.OPERATION_DEFINITION,
    );
    if (operations.length !== 1) {
      throw new Error("A persisted operation must contain exactly one operation");
    }
    byId.set(id, document);
    budgetByDocument.set(document, classifyOperationBudget(document));
  }

  const version = `sha256:${createHash("sha256")
    .update([...byId.keys()].sort().join("\n"))
    .digest("hex")}`;

  return {
    version,
    size: byId.size,
    documentFor: (id) => byId.get(id),
    budgetClassFor: (document, operationName) =>
      budgetByDocument.get(document) ?? classifyOperationBudget(document, operationName),
  };
}

const CLIENT_MANIFEST_PATHS = [
  // The deployed bundle, where the build copies the manifest beside the schema.
  "persisted-documents.json",
  // The source tree, where GraphQL Code Generator writes it for the client.
  "../../../web/src/generated/persisted-documents.json",
];

let loaded: PersistedOperationManifest | undefined;

/**
 * The manifest this build serves: the browser client's generated documents plus
 * the release journey's own. Both halves are produced by the build and neither
 * can be extended by a request.
 *
 * The result is memoized because it describes build output, which cannot change
 * while the process runs, and every API instance in a suite would otherwise
 * reparse the same hundred documents.
 */
export function loadPersistedOperationManifest(): PersistedOperationManifest {
  if (loaded) return loaded;
  const here = dirname(fileURLToPath(import.meta.url));
  const manifestPath = CLIENT_MANIFEST_PATHS.map((candidate) =>
    resolve(here, candidate),
  ).find((candidate) => existsSync(candidate));
  if (!manifestPath) {
    throw new Error("The persisted GraphQL operation manifest is missing from this build");
  }

  const clientDocuments = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
    string,
    string
  >;
  const releaseDocuments = Object.fromEntries(
    Object.values(RELEASE_JOURNEY_OPERATIONS).map((document) => [
      persistedOperationId(document),
      document,
    ]),
  );
  loaded = persistedOperationManifest({ ...clientDocuments, ...releaseDocuments });
  return loaded;
}
