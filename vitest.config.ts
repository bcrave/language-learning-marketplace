import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["apps/**/*.test.ts", "packages/core/test/**/*.test.ts"],
          exclude: [
            "**/node_modules/**",
            "**/*.integration.test.ts",
            "**/*.component.test.tsx",
          ],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          include: ["**/*.integration.test.ts"],
        },
      },
      {
        test: {
          name: "component",
          environment: "jsdom",
          include: ["**/*.component.test.tsx"],
          setupFiles: ["./apps/web/test/setup.ts"],
        },
      },
    ],
  },
});
