import { z } from "zod";

import {
  awaitApiReadiness,
  awaitWorkerReadiness,
  type ReadinessObservation,
} from "./release-gates.js";

/**
 * The gate ADR 0038 puts between the API and the browser client, run as the
 * Caddy service's pre-deploy step so it executes inside Railway's private
 * network. The API has no public address (ADR 0028) and its health probes are
 * internal, so this is the only place they can be reached; nothing here needs
 * a database credential, and no secret is stored in GitHub to make it work.
 *
 * A failed gate fails the pre-deploy, which stops the browser client from
 * moving to a release whose API or worker is not actually serving it.
 */
const environmentSchema = z.object({
  APP_RELEASE: z.string().min(1),
  /** e.g. http://api.railway.internal:4000 */
  API_PRIVATE_ORIGIN: z.url(),
});

const environment = environmentSchema.parse(process.env);

function probe(path: string): () => Promise<ReadinessObservation> {
  return async () => {
    const response = await fetch(new URL(path, environment.API_PRIVATE_ORIGIN));
    if (!response.ok) return { ready: false };
    const body = (await response.json()) as {
      status?: string;
      release?: string;
      observedAt?: string;
    };
    return {
      ready: body.status === "ready",
      ...(body.release ? { release: body.release } : {}),
      ...(body.observedAt ? { observedAt: new Date(body.observedAt) } : {}),
    };
  };
}

const clock = {
  now: () => new Date(),
  sleep: (milliseconds: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, milliseconds)),
};

const api = await awaitApiReadiness({ probe: probe("/health/ready"), ...clock });
process.stdout.write(`${JSON.stringify({ event: "release.gate", ...api })}\n`);
if (api.outcome !== "READY") {
  process.exit(1);
}

const worker = await awaitWorkerReadiness({
  release: environment.APP_RELEASE,
  probe: probe("/health/worker"),
  ...clock,
});
process.stdout.write(`${JSON.stringify({ event: "release.gate", ...worker })}\n`);
if (worker.outcome !== "READY") process.exitCode = 1;
