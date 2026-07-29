# PROTOTYPE — corrected reports and export schemas

Throwaway UI prototype for **Prototype corrected report layouts and export schemas**.

Three variants of the reporting journey, switchable with `?variant=A`, `?variant=B`, or
`?variant=C`, on a standalone prototype page because the application shell does not yet
exist.

Run from the repository root:

```sh
python3 -m http.server 4173 --directory prototypes/corrected-reports-prototype
```

Then open <http://localhost:4173/?variant=A>.

Nothing in this directory is production code. Data and interactions are deliberately
static and exist only to make the reporting-policy decisions concrete enough to review.
