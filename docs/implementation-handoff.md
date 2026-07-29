# Implementation handoff

This index is the discovery-complete implementation handoff. It points to each decision in its canonical artifact rather than duplicating the decision. Application implementation, module seams, GraphQL operation design, and database schemas remain outside this handoff.

## Artifact boundaries

| Kind | Canonical artifact | What belongs there |
| --- | --- | --- |
| Ubiquitous language | [`CONTEXT.md`](../CONTEXT.md) | Stable domain terms and product meanings, without implementation detail |
| Architectural decisions | [`docs/adr/`](adr/) | Hard-to-reverse or surprising tradeoffs |
| Mutable product policy | [Notification policy](notification-policy.md) | Event-recipient-channel behavior and suppression |
| Mutable operational policy | [Operator guide](operations/operator-guide.md) | Alert thresholds, runbooks, containment, recovery, and clearing rules |
| Candidate evidence contract | [Operational readiness evidence](operations/readiness-evidence.md) and [Security Release Gate](security-verification.md) | Required proof and record shapes, not raw private evidence |
| Threat and browser policy | [Public portfolio threat model](threat-model.md) | Trust boundaries, prohibited outcomes, accepted residual risks, and browser policy |
| Research evidence | [Auth0 and Sentry browser-policy requirements](research/auth0-sentry-browser-policy.md) | Time-stamped provider facts and sources supporting accepted decisions |
| Fixture specification | [Synthetic curriculum fixture manifest](fixtures/synthetic-curriculum-manifest.md) | Exact sample curriculum identities, content outline, showcase states, and invariants |
| Prototype evidence | [Discovery prototypes](prototypes.md) | Rough alternatives and immutable accepted-prototype pointers |
| Delivery plan | [Implementation roadmap](implementation-roadmap.md) | The milestone that first owns each accepted capability end to end |

## Implementation entry points

- Start with the glossary and applicable ADRs; preserve their exact domain vocabulary in code, tests, UI, and schema names.
- Use the roadmap's six end-to-end milestones as capability ownership. Cross-cutting authorization, Audit Log behavior, accessibility, tests, and English/Spanish coverage apply in every milestone.
- Treat the fixture manifest as a specification to validate, not as a preselected persistence format. Full Lesson Material guide prose remains editorial implementation work.
- Implement mutable notification and operational behavior from their policy documents, not from historical issue comments.
- Treat the prototype index as visual evidence only. The accepted behavior is the decision recorded in canonical artifacts and resolutions.
- Generate candidate-specific readiness and Security Gate Records during implementation and release; never commit raw secrets or private provider evidence.

## Scope boundary

This handoff covers the production-shaped, non-commercial public portfolio demonstration. It excludes real payment processing, real classroom media, production email-provider integration, commercial launch planning, universal compliance claims, real personal data, proprietary curriculum, and any promise of SLA or 24/7 support.
