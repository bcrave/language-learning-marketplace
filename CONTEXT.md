# Language Learning Marketplace

This context describes a marketplace where students reserve seats in scheduled, teacher-led group language classes.

## Language

### People

**User**:
An authenticated person who may act in one or more marketplace roles.
_Avoid_: Account, actor, login

**User Suspension**:
A Platform Administrator action with a concise User-visible reason that immediately blocks a User from every authenticated operation across all roles while preserving history and owned Class Credits. It removes future Student commitments with platform refunds, stops credit grants while suspended, removes Organization Manager access, and creates urgent resolution work for future Teacher assignments. Reactivation restores access and assigned roles but not removed commitments or grants skipped during suspension.
_Avoid_: Role removal, account deletion, Teacher Absence Request

**Role Assignment**:
A Platform Administrator grant allowing a User to act as Student, Teacher, Organization Manager, or Platform Administrator. Removing one Role Assignment requires a concise User-visible reason, preserves the User and history, and performs that role's required cleanup: Student commitments and subscription end, Teacher removal waits for future assignments to be resolved, Organization reporting ends immediately, and the final active Platform Administrator cannot be removed.
_Avoid_: User Suspension, active role context, Teacher Qualification

**User Anonymization**:
An irreversible Platform Administrator operation performed only after future commitments are resolved. It destroys the Auth0 identity and identifying profile data, removes public identity, redacts the anonymized Student's private feedback content, and leaves an opaque Former User identity for bookings, attendance, credits, progress, reports, and immutable audits. A returning person receives a new User.
_Avoid_: User Suspension, role removal, hard deletion

**Fixture-Removed User**:
A noncanonical synthetic User retained only for immutable history after a Canonical Data Rebuild. The Project Owner removes its public profile and all marketplace access while preserving its external identity binding for explicit later cleanup.
_Avoid_: User Suspension, User Anonymization, hard deletion

**Display Time Zone**:
A User's saved named regional time zone for presenting Class Session times and interpreting calendar-date filters, initially suggested from their browser and changed only with their consent. It affects display and discovery boundaries, not the scheduled session itself.
_Avoid_: UTC offset, Teacher Availability time zone, browser time zone

**Interface Locale**:
A User's saved choice of English or Spanish for application-authored interface and notification messages, initially suggested from the browser and changed only by the User. It is independent of Display Time Zone and does not translate curriculum, Lesson Materials, or feedback from their authored language.
_Avoid_: Target language, browser language, content translation

**Student**:
A User who discovers Class Sessions, holds Class Credits, and makes Bookings for themselves.
_Avoid_: Attendee, learner account, customer

**Teacher**:
A User assigned to lead Class Sessions and record outcomes for their booked students.
_Avoid_: Tutor, instructor account, host

**Teacher Profile**:
The deliberately public teaching identity visible to Students: display name, optional pronouns, profile image, professional biography, taught languages, qualified Curriculum Levels, teaching Topics, and completed-session count. It excludes contact details, availability and absence history, account or Organization data, operational rates, and private Session Ratings.
_Avoid_: Teacher account, Teacher Qualification, roster record

**Teacher Qualification**:
A Platform Administrator's grant allowing a Teacher to lead Lesson Units for a specified target language and one or more Curriculum Levels. Class Session publication and Teacher Substitution require a matching qualification, and the grant cannot be removed while it supports a future assignment.
_Avoid_: Teacher claim, profile language, role

**Platform Administrator**:
A User with marketplace-wide operational authority over curriculum, sessions, people, credits, and reports.
_Avoid_: Organization Manager, admin

**Project Owner**:
The human maintainer who holds deployment, recovery, private-diagnostics, and secret-management authority outside the public application. A Project Owner is not a User role, and no Platform Administrator can elevate into this authority.
_Avoid_: Platform Administrator, owner role, super administrator

### Learning and Scheduling

**Class Session Discovery**:
The Student's search across published, still-actionable Class Sessions, initially covering the next seven dates in their Display Time Zone and defaulting to their Student Placement when available. Language is exact, Curriculum Level and Teacher are optional exact filters, selected Topics match any, and a specific local date may replace the seven-day window. Results include full sessions while their Waitlist remains open and are ordered by start instant then stable session identity in cursor-paginated groups of 20.
_Avoid_: Course enrollment, Teacher Availability search, personalized eligibility guarantee

**Class Roster**:
The identities and relevant Student Placements attached to active Bookings for one Class Session, visible only to its assigned Teacher during the relationship-scoped access window and to Platform Administrators. Students may see occupied and total seat counts but not other Students or Waitlist identities, and Organization Managers do not receive Class Rosters.
_Avoid_: Seat count, Cohort, public attendee list

**Class Session**:
A fixed-time, 60-minute, independently administrator-published occurrence of a teacher-led group class with a limited number of student seats and no minimum enrollment. Each Class Session delivers one Lesson Unit from the managed curriculum, its start time cannot change after publication, and it is treated as completed after its scheduled end even when attendance remains Unrecorded. Class Sessions do not belong to recurring publication series.
_Avoid_: Class, lesson, appointment

**Seat Capacity**:
The maximum number of active Bookings a Class Session may have, from 2 through 8 and defaulting to 5. After publication it may increase within that range, but it cannot be reduced below the number of already occupied seats.
_Avoid_: Availability, open seats, roster size

**Lesson Unit**:
An administrator-defined part of exactly one Course that can be delivered in one or more Class Sessions. Its instructional identity becomes immutable once a delivering session is published; it may later be retired from future scheduling and replaced, without changing historical sessions or completions.
_Avoid_: Lesson, class, teacher offering

**Lesson Unit Completion**:
Recognition that a student attended at least one Class Session delivering a particular Lesson Unit. Completion records participation, not mastery, and is earned at most once per student and Lesson Unit.
_Avoid_: Pass, mastery, certification

**Attendance Record**:
The teacher-recorded outcome for a Booking after its Class Session: either Attended or No-show. In-session work remains a draft; until an outcome is submitted after the scheduled end, attendance is Unrecorded. Only Attended establishes Lesson Unit Completion. A Teacher may submit or correct it until 24 hours after the session ends; later entry or correction requires a Platform Administrator, and every correction retains its actor and reason.
_Avoid_: Cancellation, completion, enrollment status

**Attendance Review Request**:
A Student's request within seven days of publication for a Platform Administrator to review one Attendance Record. The original outcome remains effective until a reasoned decision upholds or corrects it; correction preserves history and recalculates completion, reports, and Sponsorship snapshots without automatically refunding a Class Credit.
_Avoid_: Attendance correction, Credit Adjustment, complaint about teaching quality

**Attendance Rate**:
Attended outcomes divided by all recorded attendance outcomes. Student and Class Session cancellations, future sessions, and Unrecorded attendance are excluded, and reports disclose the excluded Unrecorded count.
_Avoid_: Booking completion rate, participation score

**Curriculum Level**:
A CEFR-style stage describing the intended difficulty of Lesson Units and the current placement of students. It guides discovery but does not determine booking eligibility.
_Avoid_: Prerequisite, permission tier

**Student Placement**:
A Student's current self-selected Curriculum Level for one target language, which a Platform Administrator may correct. It guides discovery and does not change automatically from attendance, Course Progress, or Learning Feedback.
_Avoid_: Assessment result, mastery, prerequisite

**Course**:
The ordered curriculum for one target language at one Curriculum Level. Students do not enroll in a Course; their progress reflects which of its Lesson Units they have completed, and its order is advisory.
_Avoid_: Class Session, cohort, enrollment

**Course Progress**:
The share of a Course's active Lesson Units that a student has completed. Retired units remain in learning history but are excluded, and replacement units require their own completion.
_Avoid_: Mastery score, grade, certification

**Course Progress Snapshot**:
A time-stamped aggregate of one Student's completed and active Lesson Unit counts and resulting percentage for one Course at a Sponsorship boundary. Its time scope and active-unit denominator freeze at that boundary, while later Attendance corrections may revise completion facts attributed to the period; Organizations see the baseline, gains during Sponsorship, and the frozen ending snapshot without receiving pre-Sponsorship unit identities or later progress.
_Avoid_: Live Course Progress, mastery assessment, transcript

**Topic**:
A Platform Administrator-managed, localized label assigned to Lesson Units for discovery and reporting. Class Sessions inherit the Topics of the Lesson Unit they deliver.
_Avoid_: Free-form tag, Teacher Qualification, Curriculum Level

**Lesson Material**:
Administrator-authored restricted structured text or HTTPS resource links attached to a Lesson Unit for its assigned Teachers and Students with an active Booking or Lesson Unit Completion. It supports headings, paragraphs, lists, and emphasis but not raw HTML, scripts, embedded media, custom styling, or file uploads. Student Cancellation removes access unless completion was earned elsewhere, and the material is not publicly discoverable.
_Avoid_: Class Session description, public resource, file upload

**Teacher Availability**:
One or more weekly, effective-dated teacher-local time ranges when a Teacher is generally willing to lead Class Sessions, anchored to the Teacher's named regional time zone so wall-clock times remain stable across daylight-saving changes. It constrains scheduling but is not itself visible or bookable by Students.
_Avoid_: Class Session, bookable slot, inventory

**Availability Exception**:
A teacher-local date or time range removed from recurring Teacher Availability before any Class Session occupies it. An overlap with a published session requires an Absence Request instead.
_Avoid_: Absence Request, Class Session Cancellation, recurring availability

**Absence Request**:
A teacher's declaration that they cannot lead one or more already-published Class Sessions. It leaves those sessions and their bookings intact until an administrator assigns a replacement teacher or cancels them.
_Avoid_: Availability edit, date block, session cancellation

**Teacher Substitution**:
The replacement of a Class Session's originally published teacher while preserving the session itself. Booked students may cancel after a substitution without forfeiting credit.
_Avoid_: New Class Session, session cancellation

**Classroom Access**:
A time-bounded authorization for the assigned Teacher or a Student with an active Booking to enter a Class Session's live meeting destination. Teachers receive access from 15 minutes before the session through its end, Students from 10 minutes before through its end, and cancelled Bookings lose access immediately. Entry does not establish Attendance.
_Avoid_: Booking, Attendance Record, Lesson Material access, public meeting link

**Class Credit**:
A non-expiring, non-cash entitlement owned by the student who receives it and exchanged for one seat in a Class Session. Class Credits are granted through a subscription, an Organization-funded benefit, or an administrator adjustment rather than purchased during booking, and their available balance cannot be negative.
_Avoid_: Payment, money, point, token

**Organization Credit Benefit**:
The Sponsorship allowance of eight Student-owned Class Credits at acceptance and eight on each monthly anniversary using the original-day/short-month rule. It stops prospectively with Sponsorship, skips without backfill during User Suspension, and remains distinct in ledger provenance while credits themselves are fungible. Organization reporting shows its grants but not the Student's total balance or attribution of individual Bookings.
_Avoid_: Credit Adjustment, Subscription, Organization-owned balance

**Credit Adjustment**:
A Platform Administrator-issued increase or decrease in a Student's Class Credits with a concise Student-visible reason. It changes the balance without replacing or obscuring prior grants, deductions, or refunds, and a decrease cannot exceed the available balance.
_Avoid_: Balance overwrite, payment, refund

**Subscription**:
A provider-activated recurring plan granting eight Class Credits at first activation and on each successful monthly renewal at a fixed UTC accounting time. The original day-of-month remains the anchor, using a shorter month's final day when necessary; a Student may schedule cancellation for the next anniversary or undo it before then without another grant, and owned credits remain after cancellation.
_Avoid_: Credit balance, card payment, individual Booking purchase

**Schedule Conflict**:
An overlap between any two active Class Session commitments held by the same User, including across Student and Teacher roles. Adjacent sessions whose time boundaries only meet do not conflict.
_Avoid_: Same-start collision, duplicate booking

**Booking**:
A Student's confirmed claim to one seat in a Class Session, obtained by exchanging one Class Credit at least 30 minutes before the session begins. There is no provisional or pending Booking; an ended Booking remains in history with an explicit terminal reason, while only active Bookings occupy seats or create Schedule Conflicts.
_Avoid_: Seat hold, tentative reservation, appointment

**Waitlist Entry**:
A Student's explicitly requested position in the join-time-ordered queue for a full Class Session and authorization to be booked automatically. Joining requires a currently available Class Credit, no Schedule Conflict, and no existing Booking or Waitlist Entry for that session; neither the seat nor credit is reserved, all eligibility is checked again for promotion, and the entry expires two hours before the session begins. A promotion attempt closes the entry when a changed business condition makes the Student ineligible, but a temporary system failure preserves its position for retry.
_Avoid_: Booking, seat hold, credit reservation

**Waitlist Withdrawal**:
A Student's immediate termination of their Waitlist Entry before promotion or expiry. It does not change Class Credits; if promotion commits first during a concurrent attempt, the resulting Booking must instead be ended through Student Cancellation.
_Avoid_: Student Cancellation, Waitlist Entry expiry, promotion failure

**Student Cancellation**:
A Student's termination of their Booking. It returns the Class Credit when made at least 24 hours before the Class Session, after a Teacher Substitution, or within 30 minutes of automatic waitlist promotion; otherwise the credit is forfeited.
_Avoid_: Class Session cancellation, teacher absence

**Student Cancellation Rate**:
Student Cancellations divided by Student Cancellations plus Attended and No-show outcomes, grouped by the Class Session's scheduled date. It excludes Class Session Cancellations and Reschedules and distinguishes timely from late cancellations.
_Avoid_: Class Session cancellation rate, refund rate

**Class Session Cancellation**:
An irreversible, reasoned administrator action that stops a Class Session before any Attendance Record has been submitted. It returns every affected Class Credit, removes remaining Waitlist Entries, and prevents attendance and completion from being recorded.
_Avoid_: Student Cancellation, Absence Request, time change

**Reschedule**:
An all-or-nothing action that ends the original refundable Booking as Rescheduled and creates a linked active Booking in another eligible Class Session delivering the same Lesson Unit while retaining the same Class Credit. If the replacement cannot be made, the original Booking remains active and unchanged.
_Avoid_: Late cancellation, separate cancellation and booking

## Feedback

**Learning Feedback**:
One optional record of teacher guidance for an Attended Booking, containing up to three observed-strength skills, up to three suggested-focus skills, and length-bounded plain-text observations and next practice. A private draft may be submitted and revised within 48 hours; only submitted content is visible to the Student and Platform Administrators, and it does not score mastery or change Student Placement.
_Avoid_: Session Rating, public review, employer report

**Session Rating**:
A Student's administrator-visible quality assessment of an Attended Class Session: a required one-to-five overall rating, optional positive and improvement tags, and an optional length-bounded plain-text comment. One may be submitted per Booking and edited for seven days; it is not anonymous to Platform Administrators and is hidden from Teachers, other Students, Organization Managers, and public profiles in the initial product.
_Avoid_: Learning Feedback, public review, teacher testimonial

## Operations

**Canonical Data Rebuild**:
The scheduled-system or Project Owner operation that returns the public demonstration's mutable synthetic marketplace state to its versioned canonical fixture baseline while leaving the deployed application, infrastructure, and provider identities in place.
_Avoid_: Demo rebuild, application rebuild, deployment, backup restoration

**Security Release Gate**:
The fail-closed body of required evidence that must pass before public launch and after a security-relevant change. A failed, missing, flaky, or unexplained result blocks release; only a finding wholly within an already accepted residual risk may proceed with dated Project Owner sign-off.
_Avoid_: Security checklist, best-effort scan, optional hardening

**Security-Relevant Change**:
A change to a trust boundary, authorization or identity rule, attacker-controlled rendering path, browser or provider policy, public or private network surface, secret or build-artifact handling, resource or concurrency control, Audit or telemetry redaction, dependency, deployment path, or recovery control. Every production candidate reruns the automated security baseline; this classification additionally selects all mapped manual, report-only, and drill evidence that must be repeated.
_Avoid_: Every content edit, only known vulnerability fixes, developer discretion without evidence

**Security Gate Record**:
The dated, privacy-safe evidence that one exact production candidate satisfied its applicable Security Release Gate. It identifies the release and relevant manifests and configuration fingerprints, records each required result and any accepted residual-risk finding, links to private provider evidence where needed, and carries Project Owner sign-off without containing secrets or raw sensitive evidence.
_Avoid_: CI log, raw scan output, reusable approval for later commits

**Audit Entry**:
An append-only record of an authenticated mutation, denied sensitive-data read, or background action, containing opaque actor and target identities, acting role, outcome, reason, time, and correlation information without secrets or sensitive content. Entries cannot be edited or selectively removed; the public demonstration expires complete monthly partitions after 90 days.
_Avoid_: Operational log, domain event, notification history

**Audit Log**:
The authorized, filtered collection and export surface for immutable Audit Entries. It preserves append-only history while applying the viewer's role and relationship scope; it is not an operational log, telemetry stream, or Report Export.
_Avoid_: Audit Entry, application log, Sentry event, Report Export

**Report Export**:
An immutable, short-lived extract of authorized reporting facts captured at one consistent instant. It contains current effective values and visible correction metadata, while prior values belong to a separately authorized correction-history extract and investigative actors or reasons remain in the Audit Log.
_Avoid_: Historical report reconstruction, data backup, Audit Log

**Idempotency Key**:
A client-generated identifier for one mutation attempt, scoped to the authenticated User and operation. For seven days, reuse with the same input returns the original domain outcome while reuse with different input is rejected; permanent ledger and event references separately prevent business duplication after that transport window.
_Avoid_: Correlation identifier, Booking identifier, permanent business reference

**Delivery Receipt**:
The compact permanent proof that one Domain Event reached a terminal notification outcome for one opaque recipient and channel. It retains the unique event-recipient-channel identity, outcome, completion time, and optional provider message identifier after visible notifications and detailed attempts expire, preventing cleanup from permitting redelivery.
_Avoid_: Notification content, Notification Intent, Audit Entry, read status

## Sponsored Learning

**Organization**:
An employer that sponsors language learning for designated students and receives reporting limited to those students' attendance and curriculum completion.
_Avoid_: Tenant, customer account, administrator

**Organization Manager**:
A person authorized to manage an Organization and view its permitted sponsored-student reporting. They cannot view private teacher feedback, teacher records, unrelated students, or other Organizations.
_Avoid_: Platform administrator, teacher, employer administrator

**Sponsorship**:
The Student-accepted, time-bounded relationship in which an Organization funds learning and receives the disclosed attendance and progress reporting. It begins only when the Student accepts a 14-day invitation, cannot overlap another active Sponsorship or be backdated, and may be ended prospectively by either party. After it ends, reporting freezes to activity within the Sponsorship and the Student's account and owned Class Credits continue independently.
_Avoid_: Employment, account ownership, Organization membership

**Sponsorship Invitation**:
An Organization's 14-day proposal to an existing Student stating the offered credit benefit, Organization-visible attendance and progress data, excluded private data, and disclosure-text version. Acceptance creates a Sponsorship at that instant; decline or expiry creates none.
_Avoid_: Sponsorship, Organization membership, automatic enrollment

**Cohort**:
A named reporting group within one Organization. A sponsored student may belong to multiple time-bounded Cohort memberships, and reports attribute activity according to membership when it occurred. Cohorts organize reports without granting credits, changing authorization, or restricting Booking.
_Avoid_: Course, class group, role, access group
