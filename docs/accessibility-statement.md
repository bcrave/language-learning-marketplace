# Accessibility statement

**Last reviewed: 2026-08-31.** This statement describes the public portfolio demonstration of the language learning marketplace. It records what was tested, how, and what is known not to work. It is not a certification, an audit report, or a claim of conformance with any standard.

## What this is, and what it is not

This is a synthetic demonstration built by one person to show how a production-shaped marketplace is put together. Accessibility was treated as part of building it rather than as a pass at the end, and the automated checks below run on every change.

That is the honest limit of the claim. Nobody has audited this application. No disabled person has been paid to test it. Automated tooling finds a minority of real barriers — the rules it can decide mechanically — and the manual review below was performed by its author, who is not a daily screen-reader user. Where this statement says a combination was tested, it means the checks named here ran against it and passed. It does not mean the experience is good, and it does not mean an assistive-technology user will get through every journey.

The interface itself makes no accessibility claim. This statement is published with the source rather than asserted inside the product, so that what a reviewer reads here can be checked against the tests that produced it.

## Design goals

The interface aims at WCAG 2.2 Level AA as a design target, and in particular:

- every journey is reachable and completable with a keyboard alone;
- the focus indicator is always drawn, contrasts with whichever ground it sits on, and is never covered by the sticky header or the fixed bottom navigation;
- content reflows to a single column at 320 CSS pixels and survives text resized to 200% without clipping or sideways scrolling;
- nothing animates or transitions, and a reduced-motion preference is honoured;
- refusals and errors are announced, explain what happened, and offer a way back that does not require the browser's back button;
- both interface languages, English and Spanish, are covered by the same checks, and the page's `lang` follows the User's chosen Interface Locale.

## Tested combinations

Every role journey runs against each engine below, in English and in Spanish, on every change. Testing an engine is evidence about the browsers that share it; it is not evidence about a specific browser version, operating system, or assistive technology.

| Engine and browsers | How it is exercised |
| --- | --- |
| Chromium engine, as shipped by Google Chrome and Microsoft Edge on macOS and Windows | Automated role journeys and accessibility scans |
| Gecko engine, as shipped by Mozilla Firefox on macOS and Windows | Automated role journeys and accessibility scans |
| WebKit engine, as shipped by Safari on macOS and iOS | Automated role journeys and accessibility scans |

Journeys run at a desktop viewport and at 390 and 320 CSS pixels wide. The list of engines is held in `apps/web/test/e2e/support/browser-matrix.ts`, and a test fails if this table and that list disagree — so this section cannot quietly claim a combination nothing runs against.

## How it is checked

**Automated, on every change:**

- `eslint-plugin-jsx-a11y` over the whole interface source.
- axe-core scans of every panel in the state it reaches when its data never arrives, in both languages.
- axe-core scans of all nine role workspaces — Student discovery and learning, Teacher schedule and availability, Organization Manager students and reports, and Platform Administrator operations, people, and reports — in both languages, in all three engines.
- Role journeys for Student, Teacher, Organization Manager, Platform Administrator, multi-role switching, Attendance correction, Report Export, and the privacy boundary, each scanned as it goes.
- Keyboard-only reachability, focus visibility, focus not obscured by the sticky bars, 320-pixel reflow, 200% text resize, reduced motion, and error recovery.

Serious and critical axe findings fail the build. Moderate and minor findings do not, and nothing collects them: they are left to the manual review, because acting on them mechanically produces markup that satisfies a rule and helps nobody. That is a deliberate choice and also a gap — a moderate finding introduced between manual reviews will not be noticed.

**Manual, by the author:** the cases in [the manual review record](accessibility-review.md), which is where the results and their dates live.

## Known limitations

- **No independent audit and no assistive-technology user testing.** This is the limitation that matters most, and no amount of automated coverage substitutes for it.
- **Screen readers other than VoiceOver are untested.** NVDA and JAWS on Windows, TalkBack on Android, and Orca on Linux have not been exercised at all.
- **Automated coverage is engine-level.** A bug specific to one browser version or one operating system's accessibility bridge would not be caught.
- **Two regions can share an accessible name.** On the Student discovery place, the place summary and the discovery panel are both called "Discover Class Sessions", which makes a screen reader's region list ambiguous.
- **The Audit Log's acting-role filter shares its name with the workspace role control.** Both are called "Acting role" on the reports places, which is ambiguous when a screen reader lists form controls out of context.
- **Deep links render in the browser's language first.** Following a link into a workspace before any workspace has loaded shows the role-change prompt in the language the browser suggests, not the User's saved Interface Locale.
- **Curriculum content is not translated.** Lesson Units, Lesson Materials, feedback, and Teacher biographies stay in the language they were authored in, whatever the Interface Locale, and are not marked up with a per-element `lang`. A screen reader will pronounce them with the wrong voice.
- **Date fields use the browser's native date control.** Its keyboard behaviour, format, and screen-reader announcements are the browser's, and vary across the engines above.
- **No reduced-transparency, forced-colors, or high-contrast-mode testing.** The interface has one theme.

## Reporting a problem

Accessibility problems can be reported as issues on the project's GitHub repository. This is a portfolio demonstration operated by one person with no support commitment, so there is no response-time undertaking. Reports about real barriers are welcome regardless.
