# Screen journeys and cross-role navigation prototype

**Question:** How should the selected journey-map workspace become screen-level routes, responsive navigation, and explicit acting-role transitions—including per-role place memory and role-incompatible deep links?

This is a deliberately rough, read-only, dependency-free prototype. It compares three structural variants on one route, switchable with `?variant=A`, `?variant=B`, or `?variant=C`.

## Outcome

Variant A, **Context rail**, was selected from the User's direct reaction.

- Each acting-role workspace lands on its journey map and uses nested journey and task-detail routes.
- Desktop keeps the role's journeys in a persistent context rail while the selected route opens in the main stage with a short breadcrumb.
- Small screens replace the rail with a journey drawer and compact bottom navigation; the task itself remains the primary surface.
- The acting-role control stays pinned and explicit. Each role remembers its own last compatible route, while first use lands on that role's journey map.
- A route owned by another role never opens under the current authority. It offers an explicit acting-role change or a safe return, preserving both roles' prior places.
- User-wide settings remain outside the role-specific route tree, and relationship scope stays visible inside the active journey.

- **A — Context rail:** journey routes stay visible in a compact desktop rail and mobile bottom bar; details open alongside the journey.
- **B — Focused trail:** each journey becomes a full-width sequence with a breadcrumb/back trail; role and route controls stay in the header.
- **C — Route canvas:** the journey map remains the stable workspace surface while a route canvas opens as an overlay/sheet.

Every variant uses the same behavioral contract so the comparison stays focused on navigation shape:

- the acting role is explicit at all times;
- each role remembers its last compatible route;
- a role change restores that role's prior place, or its journey map on first use;
- a deep link owned by another role never silently broadens authority; it offers an explicit role change or a safe return;
- User-wide settings remain outside role-specific routes.

Run from the repository root:

```sh
python3 -m http.server 4174 --directory prototypes/screen-journeys-prototype
```

Then open <http://localhost:4174/?variant=A>.

Use **Open sample journey** to move into a detail route, **Acting as** to test remembered places, and **Try incompatible deep link** to inspect the guarded transition. Resize below 720px to compare the mobile navigation patterns.
