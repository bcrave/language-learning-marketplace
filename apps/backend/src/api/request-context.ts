import { randomUUID } from "node:crypto";

import { z } from "zod";

const correlationIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);

export function correlationIdForRequest(headers: Headers) {
  const candidate = correlationIdSchema.safeParse(headers.get("x-correlation-id"));
  return candidate.success ? candidate.data : randomUUID();
}
