# Implementation roadmap

Every milestone includes proportional domain tests, PostgreSQL integration tests, React component tests, accessibility checks, authorization, audit behavior, and English/Spanish coverage. These concerns are not final-stage cleanup.

## 1. Foundation

- pnpm monorepo with Vite, GraphQL Yoga, PostgreSQL, Kysely, SQL migrations, and GraphQL Code Generator
- React Router, shadcn/ui, Tailwind CSS, Radix Primitives, FormatJS, and Temporal
- fake local authentication, explicit active-role context, and server policy foundation
- GitHub Actions quality gate

## 2. Safe booking

- curriculum and Class Session administration
- Class Session Discovery, credits, Booking, Student Cancellation, and upcoming/history views
- Display Time Zone behavior and DST-safe calendar filtering
- final-seat concurrency, cross-role Schedule Conflicts, idempotency, and Audit Log
- private Railway deployment for early integration validation

## 3. Marketplace operations

- Reschedule, Waitlist Entry, automatic promotion, and expiry
- Teacher Availability, Availability Exceptions, Absence Requests, and Teacher Substitutions
- durable Graphile Worker jobs, Notification Intents, reminders, retry, and delivery recording

## 4. Learning

- Attendance Records, Learning Feedback, Session Ratings, and Course Progress
- Lesson Materials and simulated Classroom Access
- complete Student and Teacher dashboards

## 5. Sponsored learning

- Organizations, Sponsorships, Cohorts, and time-bounded attribution
- attendance and progress reporting plus CSV exports
- Role Assignment removal, User Suspension, and User Anonymization

## 6. Public portfolio hardening

- Auth0 shared demo identities plus canonical and rolling synthetic fixtures
- persisted GraphQL operations, resource limits, and browser security headers
- Pino logs, Sentry, health checks, and worker diagnostics
- backup/restore drill, accessibility audit, and complete Playwright journeys
- public Railway deployment within the documented operating ceiling

Each milestone ends in a working end-to-end slice. Early deployments remain private; the public release follows the final hardening milestone.
