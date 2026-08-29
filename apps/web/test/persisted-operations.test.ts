import { describe, expect, it } from "vitest";

import { StudentWorkspaceDocument } from "../src/generated/graphql.js";
import {
  persistedDocumentId,
  persistedOperationLink,
} from "../src/persisted-operations.js";

type LinkOperation = Parameters<
  ReturnType<typeof persistedOperationLink>["request"]
>[0];

/** A stand-in for the operation Apollo hands a link, with only what the link reads. */
function operationFor(query: unknown, operationName = "StudentWorkspace") {
  let context: Record<string, unknown> = {};
  const operation = {
    query,
    operationName,
    extensions: {} as Record<string, unknown>,
    setContext: (update: (previous: Record<string, unknown>) => Record<string, unknown>) => {
      context = { ...context, ...update(context) };
    },
  };
  return { operation, contextNow: () => context };
}

describe("naming a persisted operation instead of sending a document", () => {
  it("reads the identifier the build stamped onto a generated document", () => {
    expect(persistedDocumentId(StudentWorkspaceDocument)).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("sends the identifier and asks the transport to omit the document", () => {
    const { operation, contextNow } = operationFor(StudentWorkspaceDocument);
    let forwarded = false;

    persistedOperationLink().request(operation as unknown as LinkOperation, () => {
      forwarded = true;
      return null as never;
    });

    expect(operation.extensions["documentId"]).toBe(
      persistedDocumentId(StudentWorkspaceDocument),
    );
    expect(contextNow()["http"]).toEqual({ includeQuery: false, includeExtensions: true });
    expect(forwarded).toBe(true);
  });

  it("refuses a document the build did not produce", () => {
    // A document without an identifier would be rejected by the deployment
    // anyway. Failing in the browser names the build problem instead.
    const { operation } = operationFor({ kind: "Document", definitions: [] }, "Handwritten");

    expect(() =>
      persistedOperationLink().request(
        operation as unknown as LinkOperation,
        () => null as never,
      ),
    ).toThrow(/Handwritten is not a persisted GraphQL operation/);
  });
});
