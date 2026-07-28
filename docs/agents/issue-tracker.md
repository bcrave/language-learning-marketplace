# Issue tracker: GitHub

Issues and planning maps for this repository live in GitHub Issues at `bcrave/language-learning-marketplace`.

## Operations

- Prefer the connected GitHub app for ordinary issue reads and writes: create, list, update, comment, label, assign, and close.
- Use the GitHub CLI or API when available for native relationships not exposed by the connector.
- Infer the repository from `origin` when using local GitHub tooling.
- Pull requests are not a triage request surface.

## When a skill says "publish to the issue tracker"

Create a GitHub issue in `bcrave/language-learning-marketplace`.

## When a skill says "fetch the relevant ticket"

Read the GitHub issue, including its labels, assignees, and comments.

## Wayfinding operations

- **Map:** one issue labelled `wayfinder:map`, containing Destination, Notes, Decisions so far, Not yet specified, and Out of scope.
- **Child ticket:** an issue labelled `wayfinder:<type>` and linked to the map as a native sub-issue. If native sub-issues cannot be created, list it in the map task list and put `Part of #<map>` at the top of the ticket.
- **Blocking:** use GitHub's native issue dependencies when available. If they cannot be created, put `Blocked by: #<number>, #<number>` near the top of the blocked ticket.
- **Frontier:** the map's open, unassigned children with no open blockers; first in map order wins.
- **Claim:** assign the ticket to the developer driving the map before doing any work.
- **Resolve:** post the answer as a resolution comment, close the ticket, and append a linked one-line gist to the map's Decisions-so-far section.

Use names rather than bare issue numbers in user-facing narration; links may carry the issue number.
