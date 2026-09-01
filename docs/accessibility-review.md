# Manual accessibility review record

The cases a person has to perform, and where their results are recorded. The [public accessibility statement](accessibility-statement.md) links here and must not claim a case passed that has no signed row below.

## Why this exists separately from the automated checks

Automated scanning decides the rules it can decide mechanically. It cannot tell you whether a focus order makes sense, whether an announcement arrives at a useful moment, or whether a Class Session's time is comprehensible when read aloud in a language the reader did not choose. Those are the cases here.

Several cases below now have automated evidence as well. That does not retire them: an automated check proves a property held on a synthetic page, and the manual case asks whether a person could actually get through. Where both exist, the automated check is what catches a regression between reviews, and the manual case is what decides whether the design was right in the first place.

## Recording rule

A row is complete only with a result, the date it was performed, the exact candidate, and the reviewer. An empty row is an unperformed case, not a passing one — the same rule the [operational readiness evidence](operations/readiness-evidence.md) applies to its drills, and for the same reason: a record that reads as complete while nobody did the work is worse than no record.

Findings are recorded as privacy-safe observations. A review never records personal data, credentials, or private configuration.

The review repeats before public launch and after any change to navigation, focus management, announcements, error handling, the role-change prompts, or the scheduling controls.

## Environment

Performed on the current release candidate, in the combinations the accessibility statement names, with the operating system's own assistive technology at default settings.

## Cases

| Case | What it asks | Automated evidence | Result | Date | Reviewer |
| --- | --- | --- | --- | --- | --- |
| `a11y.keyboardOnly` | Every role journey completes with the keyboard alone: no trap, no control reachable only by pointer, and a focus order that follows the reading order. | Reachability and link activation, all engines | | | |
| `a11y.voiceOverSafari` | VoiceOver with Safari on macOS reads each role workspace usefully: landmarks and headings navigate, the role control and journey menu announce their state, tables and lists are traversable, and live regions announce once rather than repeatedly. | None — this case is the reason the record exists | | | |
| `a11y.focusVisible` | The focus indicator is visible on both the parchment main area and the dark rail, at default zoom and at 200%. | Computed outline on a focused control | | | |
| `a11y.focusNotObscured` | No focused control is hidden behind the sticky header or the fixed bottom navigation while tabbing or after scrolling. | Tab sweep at 390 pixels wide | | | |
| `a11y.contrast` | Text, controls, focus indicators, and status colours are legible, including the amber-on-green rail and the disabled and error states. | axe `color-contrast` on all nine workspaces, both languages | | | |
| `a11y.reducedMotion` | Nothing moves, scrolls, or transitions under a reduced-motion preference. | No non-zero transition or animation on any element | | | |
| `a11y.textResize` | Text at 200% neither clips, overlaps, nor forces sideways scrolling, in Spanish as well as English. | Root font size doubled, overflow measured | | | |
| `a11y.reflow` | Content reflows to a single column at 320 CSS pixels and at 400% zoom, with no horizontal scrolling and nothing cut off. | Overflow measured at 320 pixels | | | |
| `a11y.errorRecovery` | Refusals and validation errors are announced, say what happened, and offer a way back that leaves the acting role and any entered data intact. | Denied deep link announces and returns safely | | | |
| `a11y.schedulingInteractions` | The critical scheduling interactions are usable and comprehensible with assistive technology: choosing a calendar date, reading a Class Session time in a Display Time Zone, the ambiguous-date refusal, booking and cancelling, joining a Waitlist, editing Teacher Availability and its exceptions, and reporting an absence. | Partial — the panels are scanned, the interactions are not driven | | | |
| `a11y.authoredLanguage` | Curriculum, Lesson Materials, feedback, and Teacher biographies are comprehensible when the interface language differs from the language they were authored in. | None | | | |

## Findings

Record each finding with its case identifier, a privacy-safe description, the decision taken, and where it is tracked. A finding accepted rather than fixed belongs in the accessibility statement's known limitations before launch.

| Case | Finding | Decision | Tracked as |
| --- | --- | --- | --- |
| | | | |
