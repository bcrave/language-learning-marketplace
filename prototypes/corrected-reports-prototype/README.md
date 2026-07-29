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

## Outcome

The User selected **Variant A — Exception-first ledger** for both Organization Manager
and Platform Administrator reporting. Both roles therefore share summary metrics,
prominent corrected-fact callouts, and a scannable current-effective table while keeping
their authority, relationship scope, report content, and navigation distinct.

The shared presentation contract also retains:

- visible correction count and latest-correction time on ordinary reports;
- separately authorized prior/current correction history without actor or reason;
- the Queued, Running, Completed, Failed, and Expired export lifecycle; and
- versioned, locale-independent ordinary and correction-history CSV schemas with the
  privacy exclusions demonstrated in the schema explorer.
