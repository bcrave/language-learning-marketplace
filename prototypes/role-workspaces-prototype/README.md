# Role workspaces and navigation prototype

**Question:** What information architecture should organize each role's primary workspace, task queues, dashboards, and high-frequency journeys, and how should a multi-role User move between them?

This is a deliberately rough, read-only, dependency-free prototype. It compares three structural variants on one route, switchable with `?variant=A`, `?variant=B`, or `?variant=C`.

## Outcome

Variant C, **Journey map + detail pane**, was selected as the cleanest structural direction. Each acting-role workspace should lead with a small set of high-frequency journeys, keep the selected journey's context and next action in a focused pane, and make acting-role changes explicit. The detailed route hierarchy, screen-level journeys, responsive navigation, and cross-role transition behavior remain a follow-up design decision.

Run it from the repository root:

```sh
python3 -m http.server 4173 --directory prototypes/role-workspaces-prototype
```

Then open <http://localhost:4173/?variant=A>.

The prototype uses synthetic data and makes no real mutations. Role changes are explicit acting-role changes; each role only reveals relationship-scoped information appropriate to that workspace.
