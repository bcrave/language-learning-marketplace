import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

async function javaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return javaScriptFiles(path);
      return extname(path) === ".js" ? [path] : [];
    }),
  );
  return nested.flat();
}

const productionFiles = [
  ...(await javaScriptFiles("apps/backend/dist")),
  ...(await javaScriptFiles("apps/web/dist")),
];
const forbiddenMarkers = [
  "x-demo-user-id",
  "FakeAuthenticator",
  "fake-authenticator",
];

for (const path of productionFiles) {
  const content = await readFile(path, "utf8");
  const marker = forbiddenMarkers.find((candidate) => content.includes(candidate));
  if (marker) throw new Error(`${path} contains production-forbidden marker ${marker}`);
}
