import { run } from "graphile-worker";

import { parseAppConfig } from "../config.js";

const config = parseAppConfig(process.env);

const runner = await run({
  connectionString: config.DATABASE_URL,
  concurrency: 1,
  noHandleSignals: true,
  pollInterval: 10_000,
  taskList: {},
});

console.log(JSON.stringify({ event: "worker.started" }));

async function shutdown() {
  await runner.stop();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
