import { configDefaults, defineConfig } from "vitest/config";

// Sibling git worktrees under `.claude/worktrees/` hold full checkouts whose test
// files match these globs but resolve no workspace dependencies. Excluding them
// keeps a bare `pnpm test` scoped to this checkout.
const exclude = [...configDefaults.exclude, "**/.claude/worktrees/**"];

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["apps/**/*.test.ts", "packages/core/test/**/*.test.ts"],
          exclude: [
            ...exclude,
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
          exclude,
        },
      },
      {
        test: {
          name: "component",
          environment: "jsdom",
          include: ["**/*.component.test.tsx"],
          setupFiles: ["./apps/web/test/setup.ts"],
          exclude,
        },
      },
    ],
  },
});
