import { describe, expect, it } from "vitest";

import { parseAppConfig } from "../src/config.js";

describe("authentication configuration", () => {
  it("refuses fake authentication in production", () => {
    expect(() =>
      parseAppConfig({
        NODE_ENV: "production",
        AUTH_MODE: "fake",
        DATABASE_URL: "postgres://example.invalid/marketplace",
      }),
    ).toThrowError("Fake authentication is unavailable in production");
  });
});
