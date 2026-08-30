import { ApolloLink } from "@apollo/client";
import type { DocumentNode } from "graphql";

/**
 * The browser half of ADR 0024. GraphQL Code Generator hashes every client
 * operation into the manifest the deployed API accepts and stamps the same hash
 * onto the generated document, so the client can name an operation the build
 * produced instead of sending a document the deployment would have to trust.
 *
 * This is not a bandwidth optimisation dressed up as a control: the deployed
 * API refuses a request that carries a document at all, so a client that stops
 * sending the identifier stops working rather than quietly falling back.
 */

/** The identifier codegen stamped onto a generated document, where it has one. */
export function persistedDocumentId(document: DocumentNode) {
  const meta = (document as { __meta__?: { hash?: unknown } }).__meta__;
  return typeof meta?.hash === "string" ? meta.hash : undefined;
}

export function persistedOperationLink() {
  return new ApolloLink((operation, forward) => {
    const documentId = persistedDocumentId(operation.query);
    if (!documentId) {
      // A document without a hash never came from the build, so no deployment
      // will execute it. Failing here names the build problem; letting it
      // through would surface as an opaque rejection from the API.
      throw new Error(
        `${operation.operationName ?? "An anonymous operation"} is not a persisted GraphQL operation`,
      );
    }

    operation.extensions = { ...operation.extensions, documentId };
    operation.setContext(
      (previous: { http?: Record<string, unknown> }) => ({
        http: { ...previous.http, includeQuery: false, includeExtensions: true },
      }),
    );
    return forward(operation);
  });
}
