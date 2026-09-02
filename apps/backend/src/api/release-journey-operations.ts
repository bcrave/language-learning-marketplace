/**
 * The GraphQL documents the deployed release journey executes.
 *
 * ADR 0024 lets production execute only the documents the build produced, and
 * the browser client's manifest is generated from the client's own documents.
 * The release journey of ADR 0038 is not the browser client: it reads and books
 * as a shared reviewer identity from a release job, so its documents have to be
 * declared somewhere the build can see them too. They live beside the manifest
 * they join rather than beside the journey, because what production accepts is
 * the API boundary's decision, not the journey's.
 *
 * Every document here is an ordinary reviewer-reachable operation. None of them
 * grants authority the shared identities do not already have; they are executed
 * under the same authentication, authorization, and Audit paths.
 *
 * The role-scoped documents are deliberately parameterised by acting role
 * rather than duplicated per role. The security verification policy asks the
 * deployed smoke to replay "identifiers and requests from each journey under
 * the wrong role", and a document that hard-codes its role cannot be replayed
 * under another one — the journey would be proving the denial with a different
 * request than the one it made.
 */
export const RELEASE_JOURNEY_OPERATIONS = {
  SmokeWorkspace: `query SmokeWorkspace($actingRole: UserRole!) {
  roleWorkspace(actingRole: $actingRole) {
    actingRole
    relationshipScope
    user { id interfaceLocale displayTimeZone }
  }
}`,
  SmokeDiscoveryOptions:
    "query SmokeDiscoveryOptions { classSessionDiscoveryOptions { targetLanguages } }",
  SmokeDiscovery: `query SmokeDiscovery($input: ClassSessionDiscoveryInput!) {
  discoverClassSessions(input: $input) {
    nodes {
      id
      startsAt
      seatCapacity
      occupiedSeats
      teacherProfile { id }
    }
  }
}`,
  SmokeTeacherProfile: `query SmokeTeacherProfile($teacherUserId: ID!, $locale: InterfaceLocale!) {
  publicTeacherProfile(teacherUserId: $teacherUserId, locale: $locale) {
    teachingTopics { key label labelEn labelEs }
  }
}`,
  SmokeCredits: "query SmokeCredits { studentClassCredits { availableBalance } }",
  SmokeBook: `mutation SmokeBook($input: BookClassSessionInput!) {
  bookClassSession(input: $input) {
    __typename
    ... on BookClassSessionSuccess {
      booking { id state }
      account { availableBalance }
    }
    ... on BookingError { code }
  }
}`,
  SmokeCancel: `mutation SmokeCancel($input: CancelBookingInput!) {
  cancelBooking(input: $input) {
    __typename
    ... on CancelBookingSuccess {
      booking { state terminalReason classCreditRefunded }
      account { availableBalance }
    }
    ... on BookingError { code }
  }
}`,
  SmokeTeacherSessions: `query SmokeTeacherSessions {
  teacherClassSessions { id teacherUserId startsAt state }
}`,
  SmokeRoster: `query SmokeRoster($classSessionId: ID!, $actingRole: UserRole!) {
  classRoster(classSessionId: $classSessionId, actingRole: $actingRole) {
    classSession { id teacherUserId }
    students { bookingId }
  }
}`,
  SmokeTeacherAvailability: `query SmokeTeacherAvailability {
  teacherAvailability { timeZone exceptions { id } }
}`,
  SmokeAddAvailabilityException: `mutation SmokeAddAvailabilityException($input: AddAvailabilityExceptionInput!) {
  addAvailabilityException(input: $input) {
    __typename
    ... on AddAvailabilityExceptionSuccess { exception { id } }
    ... on TeacherAvailabilityValidationError { code }
    ... on AvailabilityExceptionSessionConflict { code }
  }
}`,
  SmokeRemoveAvailabilityException: `mutation SmokeRemoveAvailabilityException($input: RemoveAvailabilityExceptionInput!) {
  removeAvailabilityException(input: $input) {
    __typename
    ... on RemoveAvailabilityExceptionSuccess { exceptionId }
    ... on TeacherAvailabilityValidationError { code }
  }
}`,
  SmokeOrganizationCohorts: `query SmokeOrganizationCohorts {
  organizationCohorts { id organization { id } }
}`,
  SmokeOrganizationReport: `query SmokeOrganizationReport($cohortId: ID) {
  organizationAttendanceAndProgressReport(cohortId: $cohortId) {
    organization { id }
    attendance { recordedCount excludedUnrecordedCount }
    cohorts { cohortId sponsoredStudentCount }
  }
}`,
  // The two refusal shapes alias their `code`: one is a
  // `ClassCreditAdjustmentErrorCode` and the other a `String`, and selecting
  // both under one response name is a document GraphQL refuses to validate.
  SmokeAdjustCredits: `mutation SmokeAdjustCredits($input: AdjustClassCreditsInput!) {
  adjustClassCredits(input: $input) {
    __typename
    ... on AdjustClassCreditsSuccess { account { studentUserId availableBalance } }
    ... on ClassCreditAdjustmentError { adjustmentCode: code }
    ... on CurriculumConflict { conflictCode: code }
  }
}`,
  SmokeMarketplaceReport: `query SmokeMarketplaceReport {
  marketplaceOperationalReport { generatedAt attendance { recordedCount } }
}`,
  SmokeAudit: `query SmokeAudit($filter: AuditLogFilterInput) {
  auditLog(filter: $filter) {
    __typename
    ... on AuditLog { entries { operation outcome correlationId } }
    ... on AuditLogError { code }
  }
}`,
} as const;

export type ReleaseJourneyOperationName = keyof typeof RELEASE_JOURNEY_OPERATIONS;
