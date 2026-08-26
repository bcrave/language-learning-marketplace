import type { UserRole } from "@marketplace/core";

import { courseProgressForStudent } from "../attendance/course-progress-service.js";
import type { Database } from "../database/database.js";
import { accessibleLessonUnits } from "../learning-access/learning-access-service.js";
import {
  CANONICAL_IDENTITY_ISSUER,
  type CanonicalFixtureManifest,
} from "./canonical-fixture-manifest.js";

/**
 * One way the loaded state failed to be publishable. `invariant` names the rule and
 * `detail` says what was actually found — both privacy-safe, because everything the
 * canonical fixtures contain is synthetic by construction.
 */
export interface FixtureInvariantViolation {
  invariant: string;
  detail: string;
}

const ALL_ROLES: UserRole[] = ["STUDENT", "TEACHER", "ORGANIZATION_MANAGER", "PLATFORM_ADMINISTRATOR"];

/**
 * Validates the loaded canonical state against the manifest and against the domain
 * invariants the demonstration must never publish without. It reads only; the loader
 * decides that a non-empty result means nothing is published.
 *
 * The checks are deliberately re-derived from persisted state rather than from what
 * the loader believes it wrote: a loader that silently skipped a step has to fail
 * here, not on a reviewer's screen.
 */
export async function validateCanonicalFixtures(
  db: Database,
  manifest: CanonicalFixtureManifest,
  now: Date,
): Promise<FixtureInvariantViolation[]> {
  const violations: FixtureInvariantViolation[] = [];
  const fail = (invariant: string, detail: string) => violations.push({ invariant, detail });
  const expect = (invariant: string, actual: number, expected: number, subject: string) => {
    if (actual !== expected) fail(invariant, `${subject}: expected ${expected}, found ${actual}`);
  };

  const [courses, units, materials, topics] = await Promise.all([
    db.selectFrom("courses").select(["id", "stable_key"]).execute(),
    db.selectFrom("lesson_units").select(["id", "stable_key", "course_id", "title", "state", "replacement_lesson_unit_id"]).execute(),
    db.selectFrom("lesson_materials").select(["id", "lesson_unit_id", "kind", "title", "https_url", "publisher"]).execute(),
    db.selectFrom("topics").select("key").execute(),
  ]);
  const unitByKey = new Map(units.map((unit) => [unit.stable_key, unit]));
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const courseByKey = new Map(courses.map((course) => [course.stable_key, course]));

  // Inventory: the accepted catalog is complete and nothing extra rode in with it.
  const { inventory } = manifest.expectations;
  expect("inventory.courses", courses.length, inventory.courses, "Courses");
  expect("inventory.lessonUnits", units.length, inventory.lessonUnits, "Lesson Units");
  expect("inventory.activeLessonUnits", units.filter((unit) => unit.state === "ACTIVE").length, inventory.activeLessonUnits, "active Lesson Units");
  expect("inventory.lessonMaterials", materials.length, inventory.lessonMaterials, "Lesson Materials");
  expect("inventory.httpsReferences", materials.filter((material) => material.kind === "HTTPS_REFERENCE").length, inventory.httpsReferences, "HTTPS references");
  expect("inventory.topics", topics.length, inventory.topics, "Topics");

  const topicUse = await db.selectFrom("lesson_unit_topics").select(["topic_key", "lesson_unit_id"]).execute();
  for (const { key } of topics) {
    if (!topicUse.some((use) => use.topic_key === key)) fail("topics.allUsed", `Topic ${key} labels no Lesson Unit`);
  }
  for (const unit of units) {
    const count = topicUse.filter((use) => use.lesson_unit_id === unit.id).length;
    if (count < 1 || count > 2) fail("topics.cardinality", `${unit.stable_key} carries ${count} Topics`);
  }

  // Retirement lifecycle: the retired unit keeps its identity and points forward.
  const retired = unitByKey.get(manifest.retirement.retiredUnitKey);
  const replacement = unitByKey.get(manifest.retirement.replacementUnitKey);
  if (!retired || retired.state !== "RETIRED") {
    fail("lifecycle.retirement", `${manifest.retirement.retiredUnitKey} is not retired`);
  } else if (!replacement || retired.replacement_lesson_unit_id !== replacement.id) {
    fail("lifecycle.retirement", `${manifest.retirement.retiredUnitKey} does not name ${manifest.retirement.replacementUnitKey} as its replacement`);
  }

  // Provenance: authored guides stay in their target language, linked references stay
  // attributed to their publisher, and no real identity is introduced.
  for (const unit of units) {
    const guide = materials.find((material) => material.lesson_unit_id === unit.id && material.kind === "STRUCTURED_TEXT");
    if (!guide) {
      fail("provenance.guide", `${unit.stable_key} has no original structured guide`);
      continue;
    }
    const expectedPrefix = unit.stable_key.startsWith("es-") ? "Guía de la unidad: " : "Lesson guide: ";
    if (guide.title !== `${expectedPrefix}${unit.title}`) {
      fail("provenance.guide", `${unit.stable_key} guide title is not authored in its target language`);
    }
  }
  for (const reference of manifest.references) {
    const unit = unitByKey.get(reference.unitKey);
    const material = unit && materials.find((candidate) => candidate.lesson_unit_id === unit.id && candidate.kind === "HTTPS_REFERENCE");
    if (!material) {
      fail("provenance.reference", `${reference.unitKey} is missing its supplemental HTTPS reference`);
      continue;
    }
    if (material.https_url !== reference.url || material.publisher !== new URL(reference.url).hostname) {
      fail("provenance.reference", `${reference.unitKey} reference does not retain its publisher and target`);
    }
  }
  for (const material of materials.filter((candidate) => candidate.kind === "HTTPS_REFERENCE")) {
    if (!material.https_url?.startsWith("https://")) fail("provenance.reference", `${material.title} is not an HTTPS resource link`);
  }

  // Identities: every application role is exercised, and every identity is synthetic.
  const [users, roleAssignments] = await Promise.all([
    db.selectFrom("users").select(["id", "identity_issuer", "access_status", "suspension_reason"]).execute(),
    db.selectFrom("role_assignments").select(["user_id", "role"]).execute(),
  ]);
  for (const role of ALL_ROLES) {
    if (!roleAssignments.some((assignment) => assignment.role === role)) {
      fail("identities.roleCoverage", `no synthetic identity acts as ${role}`);
    }
  }
  for (const user of users) {
    if (user.identity_issuer !== null && user.identity_issuer !== CANONICAL_IDENTITY_ISSUER) {
      fail("identities.synthetic", `a User maps to the non-synthetic issuer ${user.identity_issuer}`);
    }
  }
  for (const identity of manifest.identities) {
    const user = users.find((candidate) => candidate.id === identity.id);
    if (!user) {
      fail("identities.present", `${identity.displayName} is missing`);
      continue;
    }
    if (user.access_status !== identity.accessStatus) {
      fail("identities.accessStatus", `${identity.displayName} is ${user.access_status}, expected ${identity.accessStatus}`);
    }
    if (identity.accessStatus === "SUSPENDED" && !user.suspension_reason) {
      fail("identities.accessStatus", `${identity.displayName} is suspended without a User-visible reason`);
    }
    const assigned = roleAssignments.filter((assignment) => assignment.user_id === identity.id).map(({ role }) => role).sort();
    if (assigned.join(",") !== [...identity.roles].sort().join(",")) {
      fail("identities.roles", `${identity.displayName} holds ${assigned.join("/") || "no roles"}`);
    }
  }

  // Class Credit ledger: the balance is the ledger, never a number beside it.
  const [accounts, ledger] = await Promise.all([
    db.selectFrom("class_credit_accounts").select(["student_user_id", "available_balance"]).execute(),
    db.selectFrom("class_credit_ledger_entries").select(["student_user_id", "amount", "source", "source_reference"]).execute(),
  ]);
  for (const account of accounts) {
    const total = ledger
      .filter((entry) => entry.student_user_id === account.student_user_id)
      .reduce((sum, entry) => sum + entry.amount, 0);
    if (account.available_balance !== total) {
      fail("ledger.balanceMatchesLedger", `an account holds ${account.available_balance} against a ledger total of ${total}`);
    }
    if (account.available_balance < 0) fail("ledger.nonNegative", "an available balance is negative");
  }
  for (const expected of manifest.expectations.creditBalances) {
    const account = accounts.find((candidate) => candidate.student_user_id === expected.studentUserId);
    expect("ledger.expectedBalance", account?.available_balance ?? -1, expected.availableBalance, `balance for ${expected.studentUserId}`);
  }

  // Seat Capacity and Booking: occupied seats are exactly the active Bookings.
  const [sessions, bookings, commitments] = await Promise.all([
    db.selectFrom("class_sessions").select(["id", "lesson_unit_id", "teacher_user_id", "starts_at", "seat_capacity", "occupied_seats", "state"]).execute(),
    db.selectFrom("bookings").select(["id", "student_user_id", "class_session_id", "state", "terminal_reason", "ended_at", "class_credit_refunded"]).execute(),
    db.selectFrom("schedule_commitments").select(["user_id", "class_session_id", "commitment_role", "active"]).execute(),
  ]);
  for (const session of sessions) {
    if (session.seat_capacity < 2 || session.seat_capacity > 8) {
      fail("seatCapacity.range", `a Class Session offers ${session.seat_capacity} seats`);
    }
    const active = bookings.filter((booking) => booking.class_session_id === session.id && booking.state === "ACTIVE").length;
    if (session.occupied_seats !== active) {
      fail("seatCapacity.occupancy", `a Class Session records ${session.occupied_seats} occupied seats against ${active} active Bookings`);
    }
    if (session.occupied_seats > session.seat_capacity) {
      fail("seatCapacity.occupancy", "a Class Session is overbooked");
    }
  }
  for (const booking of bookings) {
    const commitment = commitments.find((candidate) => candidate.class_session_id === booking.class_session_id
      && candidate.user_id === booking.student_user_id
      && candidate.commitment_role === "STUDENT");
    if (!commitment) {
      fail("booking.commitment", "a Booking has no Student schedule commitment");
    } else if (commitment.active !== (booking.state === "ACTIVE")) {
      fail("booking.commitment", "a Booking's schedule commitment disagrees with its state");
    }
    if (booking.state === "ENDED" && (!booking.terminal_reason || !booking.ended_at)) {
      fail("booking.terminalReason", "an ended Booking carries no explicit terminal reason");
    }
    if (booking.state === "ACTIVE" && (booking.terminal_reason || booking.ended_at || booking.class_credit_refunded)) {
      fail("booking.terminalReason", "an active Booking carries terminal state");
    }
  }
  for (const session of sessions) {
    const perStudent = new Set<string>();
    for (const booking of bookings.filter((candidate) => candidate.class_session_id === session.id && candidate.state === "ACTIVE")) {
      if (perStudent.has(booking.student_user_id)) fail("booking.singleActive", "a Student holds two active Bookings for one Class Session");
      perStudent.add(booking.student_user_id);
    }
  }
  const teacherCommitments = commitments.filter((commitment) => commitment.commitment_role === "TEACHER" && commitment.active);
  for (const session of sessions.filter((candidate) => candidate.state === "PUBLISHED")) {
    if (!teacherCommitments.some((commitment) => commitment.class_session_id === session.id && commitment.user_id === session.teacher_user_id)) {
      fail("booking.commitment", "a published Class Session has no active Teacher commitment");
    }
  }

  // Attendance and Completion: only a recorded, still-effective Attended outcome
  // establishes a Lesson Unit Completion, and a correction takes it away again.
  const [records, corrections, completions] = await Promise.all([
    db.selectFrom("attendance_records").select(["id", "booking_id", "outcome"]).execute(),
    db.selectFrom("attendance_record_corrections").select(["booking_id", "prior_outcome", "corrected_outcome", "corrected_at"]).execute(),
    db.selectFrom("lesson_unit_completions").select(["student_user_id", "lesson_unit_id", "established_by_booking_id", "earned_at"]).execute(),
  ]);
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  for (const record of records) {
    const booking = bookingById.get(record.booking_id);
    const session = booking && sessionById.get(booking.class_session_id);
    if (!session) {
      fail("attendance.booking", "an Attendance Record has no Class Session");
      continue;
    }
    if (new Date(session.starts_at.getTime() + 60 * 60_000) > now) {
      fail("attendance.afterSession", "an Attendance Record precedes the end of its Class Session");
    }
    const latest = corrections
      .filter((correction) => correction.booking_id === record.booking_id)
      .sort((left, right) => left.corrected_at.getTime() - right.corrected_at.getTime())
      .at(-1);
    if (latest && latest.corrected_outcome !== record.outcome) {
      fail("attendance.correction", "an Attendance Record disagrees with its latest correction");
    }
    if (latest && latest.prior_outcome === latest.corrected_outcome) {
      fail("attendance.correction", "a correction records no change of outcome");
    }
  }
  const attendedUnits = new Set(records
    .filter((record) => record.outcome === "ATTENDED")
    .map((record) => {
      const booking = bookingById.get(record.booking_id);
      const session = booking && sessionById.get(booking.class_session_id);
      return booking && session ? `${booking.student_user_id}:${session.lesson_unit_id}` : "";
    })
    .filter(Boolean));
  for (const completion of completions) {
    if (!attendedUnits.has(`${completion.student_user_id}:${completion.lesson_unit_id}`)) {
      fail("completion.requiresAttended", "a Lesson Unit Completion rests on no Attended outcome");
    }
  }
  for (const key of attendedUnits) {
    const [studentUserId, lessonUnitId] = key.split(":") as [string, string];
    if (!completions.some((completion) => completion.student_user_id === studentUserId && completion.lesson_unit_id === lessonUnitId)) {
      fail("completion.requiresAttended", "an Attended outcome established no Lesson Unit Completion");
    }
  }
  for (const expected of manifest.expectations.completions) {
    const earned = completions
      .filter((completion) => completion.student_user_id === expected.studentUserId)
      .map((completion) => unitById.get(completion.lesson_unit_id)?.stable_key ?? completion.lesson_unit_id)
      .sort();
    if (earned.join(",") !== [...expected.unitKeys].sort().join(",")) {
      fail("completion.expected", `${expected.studentUserId} completed ${earned.join("/") || "nothing"}`);
    }
  }

  // Course Progress: read back through the same projection the Student is shown.
  for (const expected of manifest.expectations.courseProgress) {
    const course = courseByKey.get(expected.courseKey);
    const progress = (await courseProgressForStudent(db, expected.studentUserId))
      .find((entry) => entry.courseId === course?.id);
    if (!progress) {
      fail("courseProgress.expected", `${expected.courseKey} is absent from a Student's Course Progress`);
      continue;
    }
    expect("courseProgress.expected", progress.completedActiveLessonUnitCount, expected.completedActiveLessonUnitCount, `${expected.courseKey} completed active units`);
    expect("courseProgress.expected", progress.activeLessonUnitCount, expected.activeLessonUnitCount, `${expected.courseKey} active units`);
  }

  // Sponsorship and Cohort: one relationship, ended prospectively, with frozen
  // boundary snapshots and memberships that never outlive it.
  const [sponsorships, snapshots, snapshotUnits, memberships, cohorts] = await Promise.all([
    db.selectFrom("sponsorships").select(["id", "organization_id", "student_user_id", "state", "accepted_at", "ended_at", "ended_by_party"]).execute(),
    db.selectFrom("course_progress_snapshots").select(["id", "sponsorship_id", "boundary", "course_id", "completed_active_lesson_unit_count", "active_lesson_unit_count", "captured_at"]).execute(),
    db.selectFrom("course_progress_snapshot_units").select(["snapshot_id", "lesson_unit_id"]).execute(),
    db.selectFrom("cohort_memberships").select(["id", "cohort_id", "sponsorship_id", "effective_from", "effective_until"]).execute(),
    db.selectFrom("cohorts").select(["id", "organization_id"]).execute(),
  ]);
  const activePerStudent = new Map<string, number>();
  for (const sponsorship of sponsorships) {
    if (sponsorship.state === "ACTIVE") {
      activePerStudent.set(sponsorship.student_user_id, (activePerStudent.get(sponsorship.student_user_id) ?? 0) + 1);
    }
    if ((sponsorship.state === "ENDED") !== (sponsorship.ended_at !== null)) {
      fail("sponsorship.ending", "a Sponsorship's state disagrees with its ending");
    }
    if (sponsorship.state === "ENDED" && !sponsorship.ended_by_party) {
      fail("sponsorship.ending", "an ended Sponsorship names no ending party");
    }
  }
  for (const [, count] of activePerStudent) {
    if (count > 1) fail("sponsorship.noOverlap", "a Student holds overlapping active Sponsorships");
  }
  const expectedSponsorship = manifest.showcase.sponsorship;
  const sponsorship = sponsorships.find((candidate) => candidate.id === expectedSponsorship.id);
  if (!sponsorship) {
    fail("sponsorship.present", "the canonical Sponsorship is missing");
  } else {
    for (const expectedSnapshot of expectedSponsorship.snapshots) {
      const course = courseByKey.get(expectedSnapshot.courseKey);
      const snapshot = snapshots.find((candidate) => candidate.sponsorship_id === sponsorship.id
        && candidate.boundary === expectedSnapshot.boundary
        && candidate.course_id === course?.id);
      if (!snapshot) {
        fail("sponsorship.snapshot", `${expectedSnapshot.boundary} snapshot for ${expectedSnapshot.courseKey} is missing`);
        continue;
      }
      expect("sponsorship.snapshot", snapshot.completed_active_lesson_unit_count, expectedSnapshot.completedActiveLessonUnitCount, `${expectedSnapshot.boundary} ${expectedSnapshot.courseKey} completed`);
      expect("sponsorship.snapshot", snapshot.active_lesson_unit_count, expectedSnapshot.activeLessonUnitCount, `${expectedSnapshot.boundary} ${expectedSnapshot.courseKey} denominator`);
      const frozen = snapshotUnits.filter((unit) => unit.snapshot_id === snapshot.id).length;
      expect("sponsorship.snapshot", frozen, snapshot.active_lesson_unit_count, `${expectedSnapshot.boundary} ${expectedSnapshot.courseKey} frozen unit set`);
    }
    const grants = ledger.filter((entry) => entry.source === "ORGANIZATION_CREDIT_GRANT");
    for (const grant of grants) {
      if (!grant.source_reference.startsWith(sponsorship.id)) {
        fail("sponsorship.creditProvenance", "an Organization Credit Benefit grant names no Sponsorship");
      }
      if (grant.student_user_id !== sponsorship.student_user_id) {
        fail("sponsorship.creditProvenance", "an Organization Credit Benefit grant reached a Student outside the Sponsorship");
      }
    }
  }
  for (const membership of memberships) {
    const cohort = cohorts.find((candidate) => candidate.id === membership.cohort_id);
    const owning = sponsorships.find((candidate) => candidate.id === membership.sponsorship_id);
    if (!cohort || !owning) {
      fail("cohort.membership", "a Cohort membership has no Cohort or Sponsorship");
      continue;
    }
    if (cohort.organization_id !== owning.organization_id) {
      fail("cohort.membership", "a Cohort membership crosses Organizations");
    }
    if (membership.effective_until && membership.effective_until < membership.effective_from) {
      fail("cohort.membership", "a Cohort membership ends before it begins");
    }
    if (owning.ended_at && (!membership.effective_until || membership.effective_until > owning.ended_at)) {
      fail("cohort.membership", "a Cohort membership outlives its Sponsorship");
    }
  }

  // Lesson Material access: the accepted relationship scope, asked of the same rule
  // the reader uses.
  for (const expected of manifest.expectations.materialAccess) {
    const unit = unitByKey.get(expected.unitKey);
    if (!unit) {
      fail("materialAccess.expected", `${expected.unitKey} is missing`);
      continue;
    }
    const granted = (await accessibleLessonUnits(db, { id: expected.userId, actingRole: expected.actingRole }, now))
      .some((candidate) => candidate.id === unit.id);
    if (granted !== expected.granted) {
      fail(
        "materialAccess.expected",
        `${expected.actingRole} access to ${expected.unitKey} is ${granted ? "open" : "closed"}, expected ${expected.granted ? "open" : "closed"}`,
      );
    }
  }

  return violations;
}
