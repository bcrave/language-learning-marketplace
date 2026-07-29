# Implementation roadmap

A milestone owns a capability when it first delivers that capability end to end. Later milestones may extend or exercise it without sharing ownership.

Every milestone includes proportional domain tests, PostgreSQL integration tests, React component tests, accessibility checks, authorization, Audit behavior, and English/Spanish coverage. These concerns are not final-stage cleanup. Each milestone ends in a working end-to-end slice; early deployments remain private, and the public release follows the final milestone.

## 1. Authenticated foundation

**Outcome:** a User can sign in, establish their preferences, enter an explicitly selected acting-role workspace, and navigate a usable localized application shell.

- pnpm monorepo with Vite, GraphQL Yoga, PostgreSQL, Kysely, SQL migrations, and GraphQL Code Generator
- React Router, shadcn/ui, Tailwind CSS, Radix Primitives, FormatJS, and Temporal
- fake local authentication and the server policy foundation
- User preferences for Interface Locale and Display Time Zone, including browser suggestions that never overwrite a saved choice without consent
- explicit active-role entry, a journey-map landing place for each role, and remembered compatible place per role
- persistent desktop context rail, mobile journey drawer and compact bottom navigation, plus guarded incompatible deep links that require an explicit role change or safe return
- User-wide settings outside role-specific route trees, with acting role and relationship scope kept visible
- GitHub Actions quality gate

## 2. Safe booking

**Outcome:** a Student can obtain Class Credits, find an appropriate published Class Session, understand its Teacher and curriculum context, book safely, and cancel under the accepted rules.

- curriculum administration for Courses, Curriculum Levels, Lesson Units, Topics, and Class Sessions
- Teacher Profiles, Teacher Qualifications, and qualification enforcement for publication and assignment
- Student Placements and placement-informed Class Session Discovery
- Subscription activation, monthly renewal grants, scheduled cancellation, cancellation reversal, provider-event idempotency, and retained owned credits after cancellation
- Class Credit ledger, balances, administrator Credit Adjustments, Booking, Student Cancellation, and upcoming/history views
- Teacher-profile-aware Class Session Discovery, exact filters, seat visibility, pagination, and Display Time Zone behavior with DST-safe calendar filtering
- final-seat concurrency, cross-role Schedule Conflicts, idempotency, and immutable Audit Entries
- private Railway deployment for early integration validation

## 3. Marketplace operations

**Outcome:** Students and Teachers can handle changing marketplace commitments, while durable background work communicates outcomes and exposes actionable failures.

- Reschedule, Waitlist Entry, Waitlist Withdrawal, automatic promotion, expiry, and retry-safe eligibility rechecks
- Teacher Availability, Availability Exceptions, Absence Requests, Teacher Substitutions, and resolution of qualification removal blocked by future assignments
- durable Graphile Worker jobs for reminders, time-based transitions, and reconciliation work
- notification policy execution through Notification Intents, in-app inbox and read state, email delivery, retry, and localized content
- compact permanent Delivery Receipts that prevent redelivery after visible notification and attempt cleanup
- administrator task-queue items for exhausted work that needs business reconciliation, with safe correlation context rather than generic failure notifications

## 4. Learning

**Outcome:** a completed Class Session produces reviewable learning records and relationship-scoped learning experiences whose dependent state remains consistent after correction.

- Class Rosters and the Teacher attendance workspace
- Attendance Records, correction windows, and Attendance Review Requests with reasoned uphold or correction decisions
- atomic correction reconciliation for Lesson Unit Completion, Course Progress, Lesson Material access, reporting facts, Sponsorship snapshots, and feedback or rating eligibility
- Learning Feedback, Session Ratings, and Course Progress
- Lesson Materials and simulated Classroom Access
- complete Student and Teacher role journeys and dashboards

## 5. Sponsored learning

**Outcome:** an Organization can sponsor consenting Students and receive only its authorized, time-bounded reporting, while administrators can manage User lifecycles safely.

- Organizations, Sponsorship Invitations, accepted Sponsorships, Organization Credit Benefits, Cohorts, and time-bounded attribution
- current-effective attendance and progress reports with visible correction markers, correction history, and frozen Sponsorship boundaries
- the Report Export lifecycle: authorized request, consistent snapshot generation, status, download, expiry, stable locale-independent CSV schemas, bounded ranges and row counts, and separately authorized correction-history exports
- Organization Manager and Platform Administrator report journeys, including exception-first review and correction visibility appropriate to each role
- Role Assignment grant and removal, User Suspension and reactivation, and User Anonymization with their required commitment and history handling

## 6. Operationally ready public portfolio

**Outcome:** the Project Owner can operate and release a production-shaped public demonstration through private, evidence-backed controls, while reviewers encounter only bounded synthetic product behavior.

- Auth0 shared demo identities with no Project Owner elevation path
- [versioned canonical fixture manifest](fixtures/synthetic-curriculum-manifest.md) covering the accepted bilingual curriculum and demonstration states, with inventory, relationship, ledger, progress, lifecycle, and provenance validation
- hourly rolling synthetic fixtures plus serialized, quiesced, transactional Canonical Data Rebuilds with rollback, maintenance messaging, and post-rebuild reconciliation
- protected GitHub Actions workflows for deployment, manual Canonical Data Rebuild, recovery drills, and recovery; sanitized owner-only diagnostics with private Railway and Sentry evidence links
- persisted GraphQL operations, resource limits, enforced browser security policy, secret and source-map checks, and other threat-model controls
- Pino logs, privacy-filtered Sentry telemetry, liveness and readiness checks, worker heartbeat, and correlated operational evidence
- private actionable alert configuration for readiness, workers, fixtures, notifications, releases, recovery, integrations, security patterns, abuse, and the operating-cost ceiling
- [compact public-safe runbooks](operations/operator-guide.md) for deployment, alerts, Canonical Data Rebuild, recovery, provider failure, credential exposure, and break-glass return to the normal workflow path
- successful Canonical Data Rebuild, backup restoration, and change-triggered recovery drills with validated return-to-service evidence
- complete fail-closed Security Release Gate: automated threat-traceable checks, manual abuse cases, live configuration and CSP verification, deployed role and cross-role smokes, and applicable security drills
- final accessibility audit and complete Playwright role journeys
- dated [operational readiness evidence](operations/readiness-evidence.md) and a Security Gate Record tied to the exact candidate, fixture manifest, configuration fingerprints, required results, accepted residual risks, and Project Owner sign-off
- public Railway deployment within the documented operating ceiling only after all release evidence passes
