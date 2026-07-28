# Domain docs

This is a single-context repository. Engineering skills consume the domain documentation as follows.

## Before exploring

- Read root `CONTEXT.md` for the canonical domain vocabulary.
- Read the ADRs under `docs/adr/` that touch the area being explored.
- Proceed silently if an expected artifact does not yet exist; domain-modeling creates artifacts lazily when decisions require them.

## Use the glossary's vocabulary

Use terms exactly as defined in `CONTEXT.md`, including in issue titles, plans, tests, and implementation language. Avoid synonyms that the glossary explicitly rejects. Treat a genuinely missing concept as a domain-modeling question rather than inventing competing terminology.

## Flag ADR conflicts

Surface any conflict with an existing ADR explicitly. Amend the original artifact when an accepted decision changes it rather than leaving contradictory records.

Keep `CONTEXT.md` free of implementation details. Add or amend ADRs only for hard-to-reverse, surprising decisions reached through a real tradeoff.
