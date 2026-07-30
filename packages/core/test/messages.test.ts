import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { interfaceMessages } from "../src/index.js";

async function sourceText(directory: string): Promise<string> {
  const entries = await readdir(directory, { withFileTypes: true });
  const contents = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return sourceText(path);
      return /\.(ts|tsx)$/.test(entry.name) ? readFile(path, "utf8") : "";
    }),
  );
  return contents.join("\n");
}

describe("Interface Locale catalogs", () => {
  it("keeps English and Spanish keys complete and used", async () => {
    const englishKeys = Object.keys(interfaceMessages.en).sort();
    expect(Object.keys(interfaceMessages.es).sort()).toEqual(englishKeys);

    const webSource = await sourceText("apps/web/src");
    expect(englishKeys.filter((key) => !webSource.includes(`"${key}"`))).toEqual([]);
  });
});
