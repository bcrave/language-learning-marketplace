import { randomUUID } from "node:crypto";

import { z } from "zod";

import { createDatabase } from "../database/database.js";
import { recordSecurityCheckResult } from "./security-gate.js";
import {
  SECURITY_GATE_SUITES,
  SECURITY_VERIFICATION_CATALOG,
  securityCheck,
  type SecurityGateSuite,
} from "./security-verification-catalog.js";
import { absentWhenBlank } from "./workflow-inputs.js";

/**
 * Records what one Security Release Gate check saw, as the step that ran it.
 *
 * Two callers, one entry point. A CI job records a whole suite the moment it
 * finishes — one outcome for every catalog check that suite proves — and the
 * Project Owner records a single manual abuse case, live configuration
 * assertion, or CSP journey after performing it. Both are the same act: a
 * dated, privacy-safe result attached to an exact candidate.
 *
 * It refuses rather than repairs. An unknown check identifier, a link that is
 * not private provider evidence, an observation carrying a credential, or a
 * residual risk the threat model does not accept all fail here, where the
 * person or job that produced them is still watching — not at render time,
 * where the record would already exist.
 */
const environment = z
  .object({
    DATABASE_URL: z.url(),
    APP_RELEASE: z.string().min(1).max(255),
    /** One catalog check, or one suite standing for every check it proves. */
    SECURITY_CHECK: z.string().min(1).max(120).optional(),
    SECURITY_SUITE: z
      .enum(Object.keys(SECURITY_GATE_SUITES) as [SecurityGateSuite, ...SecurityGateSuite[]])
      .optional(),
    SECURITY_OUTCOME: z.enum(["PASSED", "FAILED", "NOT_RUN"]),
    SECURITY_OBSERVATION: z.string().trim().min(1).max(500),
    SECURITY_EVIDENCE_LINK: z.url(),
    SECURITY_OBSERVED_AT: z.iso.datetime().optional(),
    SECURITY_CORRELATION_ID: z.string().min(1).max(120).optional(),
    SECURITY_RESIDUAL_RISK: z.string().min(1).max(120).optional(),
    SECURITY_SIGN_OFF: z.string().trim().min(1).max(120).optional(),
  })
  .refine(
    (parsed) => Boolean(parsed.SECURITY_CHECK) !== Boolean(parsed.SECURITY_SUITE),
    "Record exactly one of SECURITY_CHECK or SECURITY_SUITE",
  )
  .parse(absentWhenBlank(process.env));

const checks = environment.SECURITY_SUITE
  ? SECURITY_VERIFICATION_CATALOG.filter((check) => check.suite === environment.SECURITY_SUITE)
  : [securityCheck(environment.SECURITY_CHECK!)].filter((check) => check !== undefined);

if (checks.length === 0) {
  // A suite that proves nothing, or a check identifier this build cannot name.
  // Exiting quietly would record a pass for a candidate nobody verified.
  throw new Error(
    environment.SECURITY_SUITE
      ? `No verification-catalog check names the ${environment.SECURITY_SUITE} suite`
      : "The verification catalog defines no such check",
  );
}

const observedAt = environment.SECURITY_OBSERVED_AT
  ? new Date(environment.SECURITY_OBSERVED_AT)
  : new Date();
const correlationId = environment.SECURITY_CORRELATION_ID ?? `security-gate-${randomUUID()}`;
const signedOff = environment.SECURITY_SIGN_OFF ?? null;

const db = createDatabase(environment.DATABASE_URL);
try {
  for (const check of checks) {
    await recordSecurityCheckResult(db, {
      check: check.id,
      release: environment.APP_RELEASE,
      evidenceKind: check.evidence,
      outcome: environment.SECURITY_OUTCOME,
      observedAt,
      evidenceLink: environment.SECURITY_EVIDENCE_LINK,
      observation: environment.SECURITY_OBSERVATION,
      residualRisk: environment.SECURITY_RESIDUAL_RISK ?? null,
      correlationId,
      signedOffBy: signedOff,
      signedOffAt: signedOff ? observedAt : null,
    });
  }
  process.stdout.write(
    `${JSON.stringify({
      event: "security-gate.recorded",
      release: environment.APP_RELEASE,
      outcome: environment.SECURITY_OUTCOME,
      checks: checks.map((check) => check.id),
    })}\n`,
  );
} finally {
  await db.destroy();
}
