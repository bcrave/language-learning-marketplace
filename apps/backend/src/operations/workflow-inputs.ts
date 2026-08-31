/**
 * The one adapter between GitHub Actions inputs and zod schemas.
 *
 * A `workflow_dispatch` input declared `required: false` and left empty does
 * not arrive as an absent environment variable. GitHub exports it as the empty
 * string, and zod's `.optional()` admits only `undefined` — so a schema that
 * reads naturally as "this field is optional" rejects the very case it was
 * written for, and the job dies at startup before doing anything.
 *
 * That failure mode is invisible in review and total at runtime: the ordinary
 * path, where the owner simply had no limitation to record and no preview to
 * ask for, is the path that breaks. Normalising once here keeps every operation
 * entry point's schema honest about what optional means.
 */
export function absentWhenBlank(
  environment: Record<string, string | undefined>,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(environment).map(
      ([name, value]) => [name, value?.trim() === "" ? undefined : value] as const,
    ),
  );
}
