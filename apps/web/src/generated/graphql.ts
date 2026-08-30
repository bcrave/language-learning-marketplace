/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type AbsenceRequestState =
  | 'OPEN'
  | 'RESOLVED';

export type AddAvailabilityExceptionInput = {
  endDisambiguation: LocalTimeDisambiguation;
  endsAtLocal: string;
  idempotencyKey: string | number;
  startDisambiguation: LocalTimeDisambiguation;
  startsAtLocal: string;
};

export type AddCohortMembershipInput = {
  cohortId: string | number;
  effectiveFrom?: string | null | undefined;
  effectiveUntil?: string | null | undefined;
  idempotencyKey: string | number;
  sponsorshipId: string | number;
};

export type AddLessonMaterialInput = {
  httpsUrl?: string | null | undefined;
  idempotencyKey: string | number;
  kind: LessonMaterialKind;
  lessonUnitId: string | number;
  publisher?: string | null | undefined;
  structuredContent?: Array<StructuredTextBlockInput> | null | undefined;
  title: string;
};

export type AdjustClassCreditsInput = {
  amount: number;
  idempotencyKey: string | number;
  reason: string;
  studentUserId: string | number;
};

export type AdministratorTaskKind =
  | 'NOTIFICATION_DELIVERY_RECONCILIATION'
  | 'USER_ANONYMIZATION_RECONCILIATION'
  | 'USER_SUSPENSION_TEACHER_ASSIGNMENT';

export type AdministratorTaskState =
  | 'OPEN'
  | 'RESOLVED';

export type AnonymizeUserInput = {
  confirmation: string;
  idempotencyKey: string | number;
  reason: string;
  userId: string | number;
};

export type AttendanceErrorCode =
  | 'ATTENDANCE_CORRECTION_REASON_REQUIRED'
  | 'ATTENDANCE_RECORDING_NOT_OPEN'
  | 'ATTENDANCE_RECORDING_WINDOW_CLOSED'
  | 'ATTENDANCE_ROSTER_MISMATCH'
  | 'CLASS_SESSION_NOT_FOUND'
  | 'IDEMPOTENCY_KEY_REUSED';

export type AttendanceOutcome =
  | 'ATTENDED'
  | 'NO_SHOW';

export type AttendanceRecordInput = {
  bookingId: string | number;
  correctionReason?: string | null | undefined;
  outcome: AttendanceOutcome;
};

export type AttendanceReviewDecision =
  | 'CORRECT'
  | 'UPHOLD';

export type AttendanceReviewErrorCode =
  | 'ATTENDANCE_NOT_PUBLISHED'
  | 'BOOKING_NOT_FOUND'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'INVALID_EXPLANATION'
  | 'INVALID_REASON'
  | 'REVIEW_ALREADY_DECIDED'
  | 'REVIEW_ALREADY_REQUESTED'
  | 'REVIEW_REQUEST_NOT_FOUND'
  | 'REVIEW_WINDOW_CLOSED';

export type AttendanceReviewRequestState =
  | 'CORRECTED'
  | 'PENDING'
  | 'UPHELD';

export type AuditLogErrorCode =
  | 'AUDIT_LOG_ROW_LIMIT_EXCEEDED'
  | 'DISPLAY_TIME_ZONE_REQUIRED'
  | 'INVALID_AUDIT_LOG_CURSOR'
  | 'INVALID_AUDIT_LOG_FILTER'
  | 'INVALID_AUDIT_LOG_RANGE';

export type AuditLogFilterInput = {
  actingRole?: UserRole | null | undefined;
  actorUserId?: string | number | null | undefined;
  after?: string | null | undefined;
  correlationId?: string | null | undefined;
  fromLocalDate?: string | null | undefined;
  operation?: string | null | undefined;
  outcome?: AuditOutcome | null | undefined;
  toLocalDate?: string | null | undefined;
};

export type AuditLogScope =
  | 'ASSIGNED_ORGANIZATION'
  | 'MARKETPLACE_WIDE';

export type AuditOutcome =
  | 'DENIED'
  | 'FAILED'
  | 'SUCCEEDED';

export type BookClassSessionInput = {
  classSessionId: string | number;
  idempotencyKey: string | number;
};

export type BookingErrorCode =
  | 'ALREADY_BOOKED'
  | 'BOOKING_NOT_ACTIVE'
  | 'BOOKING_NOT_FOUND'
  | 'BOOKING_WINDOW_CLOSED'
  | 'CANCELLATION_WINDOW_CLOSED'
  | 'CLASS_SESSION_NOT_FOUND'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'INSUFFICIENT_CLASS_CREDITS'
  | 'LESSON_UNIT_MISMATCH'
  | 'SCHEDULE_CONFLICT'
  | 'SESSION_FULL';

export type BookingState =
  | 'ACTIVE'
  | 'ENDED';

export type BookingTerminalReason =
  | 'CLASS_SESSION_CANCELLATION'
  | 'RESCHEDULED'
  | 'ROLE_ASSIGNMENT_REMOVAL'
  | 'STUDENT_CANCELLATION';

export type CancelBookingInput = {
  bookingId: string | number;
  idempotencyKey: string | number;
};

export type CancelClassSessionInput = {
  absenceRequestId: string | number;
  classSessionId: string | number;
  idempotencyKey: string | number;
  reason: string;
};

export type ChangeClassSessionSeatCapacityInput = {
  classSessionId: string | number;
  idempotencyKey: string | number;
  seatCapacity: number;
};

export type ChangeRoleAssignmentInput = {
  idempotencyKey: string | number;
  organizationId?: string | number | null | undefined;
  reason: string;
  role: UserRole;
  userId: string | number;
};

export type ChangeTeacherQualificationInput = {
  curriculumLevel: CurriculumLevel;
  idempotencyKey: string | number;
  targetLanguage: string;
  teacherUserId: string | number;
};

export type ChangeUserAccessInput = {
  idempotencyKey: string | number;
  reason: string;
  userId: string | number;
};

export type ClassCreditAdjustmentErrorCode =
  | 'INSUFFICIENT_CLASS_CREDITS'
  | 'INVALID_ADJUSTMENT'
  | 'INVALID_REASON'
  | 'STUDENT_NOT_FOUND';

export type ClassCreditLedgerSource =
  | 'BOOKING_DEDUCTION'
  | 'BOOKING_REFUND'
  | 'CREDIT_ADJUSTMENT'
  | 'ORGANIZATION_CREDIT_GRANT'
  | 'SUBSCRIPTION_GRANT';

export type ClassSessionDiscoveryInput = {
  after?: string | null | undefined;
  curriculumLevel?: CurriculumLevel | null | undefined;
  localDate?: string | null | undefined;
  targetLanguage: string;
  teacherUserId?: string | number | null | undefined;
  topicKeys?: Array<string> | null | undefined;
};

export type ClassSessionDisruptionErrorCode =
  | 'ABSENCE_ALREADY_REPORTED'
  | 'ABSENCE_REQUEST_NOT_FOUND'
  | 'ATTENDANCE_ALREADY_SUBMITTED'
  | 'CLASS_SESSION_ALREADY_STARTED'
  | 'CLASS_SESSION_NOT_ASSIGNED'
  | 'CLASS_SESSION_NOT_FOUND'
  | 'DISRUPTION_ALREADY_RESOLVED'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'INVALID_CLASS_SESSIONS'
  | 'INVALID_REASON'
  | 'REPLACEMENT_TEACHER_REQUIRED'
  | 'TEACHER_QUALIFICATION_REQUIRED'
  | 'TEACHER_SCHEDULE_CONFLICT';

export type ClassSessionPublicationErrorCode =
  | 'AVAILABILITY_EXCEPTION_CONFLICT'
  | 'INVALID_LESSON_UNIT'
  | 'INVALID_LOCAL_DATE_TIME'
  | 'INVALID_SCHEDULING_TIME_ZONE'
  | 'INVALID_SEAT_CAPACITY'
  | 'LOCAL_TIME_FOLD'
  | 'LOCAL_TIME_GAP'
  | 'TEACHER_AVAILABILITY_REQUIRED'
  | 'TEACHER_QUALIFICATION_REQUIRED'
  | 'TEACHER_SCHEDULE_CONFLICT';

export type ClassSessionSeatCapacityErrorCode =
  | 'CLASS_SESSION_NOT_FOUND'
  | 'INVALID_SEAT_CAPACITY'
  | 'SEAT_CAPACITY_BELOW_OCCUPIED_SEATS';

export type ClassSessionState =
  | 'CANCELLED'
  | 'PUBLISHED';

export type ClassroomAccessErrorCode =
  | 'CLASSROOM_CLOSED'
  | 'CLASSROOM_NOT_OPEN'
  | 'CLASS_SESSION_NOT_FOUND';

export type ClassroomSimulationStatus =
  | 'SIMULATED';

export type CohortErrorCode =
  | 'COHORT_NAME_TAKEN'
  | 'COHORT_NOT_FOUND'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'MEMBERSHIP_ALREADY_ENDED'
  | 'MEMBERSHIP_NOT_FOUND'
  | 'MEMBERSHIP_NOT_PROSPECTIVE'
  | 'MEMBERSHIP_WINDOW_INVALID'
  | 'MEMBERSHIP_WINDOW_OVERLAPS'
  | 'SPONSORSHIP_NOT_ACTIVE'
  | 'SPONSORSHIP_NOT_FOUND';

export type CourseProgressSnapshotBoundary =
  | 'SPONSORSHIP_END'
  | 'SPONSORSHIP_START';

export type CreateCohortInput = {
  idempotencyKey: string | number;
  name: string;
};

export type CreateCourseInput = {
  curriculumLevel: CurriculumLevel;
  idempotencyKey: string | number;
  summary: string;
  targetLanguage: string;
  title: string;
};

export type CreateLessonUnitInput = {
  courseId: string | number;
  idempotencyKey: string | number;
  objectives: Array<string>;
  summary: string;
  title: string;
  topicKeys: Array<string>;
};

export type CurriculumLevel =
  | 'A1'
  | 'A2'
  | 'B1'
  | 'B2'
  | 'C1'
  | 'C2';

export type DecideAttendanceReviewInput = {
  attendanceReviewRequestId: string | number;
  decision: AttendanceReviewDecision;
  idempotencyKey: string | number;
  privateAdministratorNote?: string | null | undefined;
  studentVisibleRationale: string;
};

export type EndCohortMembershipInput = {
  cohortMembershipId: string | number;
  effectiveUntil?: string | null | undefined;
  idempotencyKey: string | number;
};

export type EndSponsorshipAsOrganizationInput = {
  idempotencyKey: string | number;
  sponsorshipId: string | number;
};

export type EndSponsorshipAsStudentInput = {
  idempotencyKey: string | number;
};

export type EndTeacherAvailabilityRangeInput = {
  effectiveUntil: string;
  idempotencyKey: string | number;
  rangeId: string | number;
};

export type EnterClassroomInput = {
  actingRole: UserRole;
  classSessionId: string | number;
};

export type FeedbackSkill =
  | 'GRAMMAR'
  | 'LISTENING'
  | 'PRONUNCIATION'
  | 'READING'
  | 'SPOKEN_INTERACTION'
  | 'SPOKEN_PRODUCTION'
  | 'VOCABULARY'
  | 'WRITING';

export type InterfaceLocale =
  | 'EN'
  | 'ES';

export type InviteToSponsorshipInput = {
  idempotencyKey: string | number;
  studentUserId: string | number;
};

export type JoinWaitlistInput = {
  classSessionId: string | number;
  idempotencyKey: string | number;
};

export type LearningFeedbackErrorCode =
  | 'BOOKING_NOT_FOUND'
  | 'FEEDBACK_NOT_FOUND'
  | 'FEEDBACK_WINDOW_CLOSED'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'INVALID_FEEDBACK'
  | 'INVALID_REASON';

export type LearningFeedbackState =
  | 'DRAFT'
  | 'SUBMITTED';

export type LessonMaterialKind =
  | 'HTTPS_REFERENCE'
  | 'STRUCTURED_TEXT';

export type LessonUnitState =
  | 'ACTIVE'
  | 'RETIRED';

export type LocalTimeDisambiguation =
  | 'EARLIER'
  | 'LATER'
  | 'REJECT';

export type MarketplaceExceptionKind =
  | 'PENDING_ATTENDANCE_REVIEW'
  | 'UNRECORDED_ATTENDANCE';

export type MarketplaceOperationalReportInput = {
  fromLocalDate?: string | null | undefined;
  toLocalDate?: string | null | undefined;
};

export type NotificationChannel =
  | 'EMAIL'
  | 'IN_APP';

export type PublishClassSessionInput = {
  idempotencyKey: string | number;
  lessonUnitId: string | number;
  schedulingTimeZone: string;
  seatCapacity?: number | null | undefined;
  startsAtLocal: string;
  teacherUserId: string | number;
  timeDisambiguation: LocalTimeDisambiguation;
};

export type ReactivateUserInput = {
  idempotencyKey: string | number;
  userId: string | number;
};

export type RecordAttendanceInput = {
  classSessionId: string | number;
  idempotencyKey: string | number;
  records: Array<AttendanceRecordInput>;
};

export type RedactLearningFeedbackInput = {
  bookingId: string | number;
  idempotencyKey: string | number;
  reason: string;
};

export type RedactSessionRatingCommentInput = {
  bookingId: string | number;
  idempotencyKey: string | number;
  reason: string;
};

export type RememberRoleWorkspacePlaceInput = {
  actingRole: UserRole;
  place: WorkspacePlace;
};

export type RemoveAvailabilityExceptionInput = {
  exceptionId: string | number;
  idempotencyKey: string | number;
};

export type ReorderLessonUnitInput = {
  lessonUnitId: string | number;
  order: number;
};

export type ReportAbsenceInput = {
  classSessionIds: Array<string | number>;
  idempotencyKey: string | number;
};

export type ReportExportErrorCode =
  | 'CORRECTION_HISTORY_NOT_AUTHORIZED'
  | 'DISPLAY_TIME_ZONE_REQUIRED'
  | 'EXPORT_ALREADY_IN_PROGRESS'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'INVALID_REPORT_RANGE'
  | 'REPORT_EXPORT_NOT_DOWNLOADABLE'
  | 'REPORT_EXPORT_NOT_FOUND';

export type ReportExportFailureReason =
  | 'AUTHORIZATION_REVOKED'
  | 'GENERATION_FAILED'
  | 'ROW_LIMIT_EXCEEDED';

export type ReportExportKind =
  | 'CORRECTION_HISTORY'
  | 'ORDINARY';

export type ReportExportState =
  | 'COMPLETED'
  | 'EXPIRED'
  | 'FAILED'
  | 'QUEUED'
  | 'RUNNING';

export type RequestAttendanceReviewInput = {
  bookingId: string | number;
  explanation?: string | null | undefined;
  idempotencyKey: string | number;
};

export type RequestReportExportInput = {
  fromLocalDate: string;
  idempotencyKey: string | number;
  kind: ReportExportKind;
  toLocalDate: string;
};

export type RescheduleBookingInput = {
  bookingId: string | number;
  idempotencyKey: string | number;
  replacementClassSessionId: string | number;
};

export type ResolveAdministratorTaskInput = {
  idempotencyKey: string;
  reason: string;
  taskId: string | number;
};

export type RetireLessonUnitInput = {
  idempotencyKey: string | number;
  lessonUnitId: string | number;
  replacementLessonUnitId?: string | number | null | undefined;
};

export type ReviseLessonMaterialInput = {
  httpsUrl?: string | null | undefined;
  idempotencyKey: string | number;
  kind: LessonMaterialKind;
  materialId: string | number;
  publisher?: string | null | undefined;
  structuredContent?: Array<StructuredTextBlockInput> | null | undefined;
  title: string;
};

export type RoleAssignmentChangeAction =
  | 'GRANTED'
  | 'REMOVED';

export type SaveLearningFeedbackInput = {
  bookingId: string | number;
  idempotencyKey: string | number;
  nextPractice?: string | null | undefined;
  observations?: string | null | undefined;
  observedStrengths: Array<FeedbackSkill>;
  submit: boolean;
  suggestedFocuses: Array<FeedbackSkill>;
};

export type SaveSessionRatingInput = {
  bookingId: string | number;
  comment?: string | null | undefined;
  idempotencyKey: string | number;
  improvementTags: Array<SessionRatingImprovementTag>;
  overallRating: number;
  positiveTags: Array<SessionRatingPositiveTag>;
};

export type SaveTeacherAvailabilityRangeInput = {
  effectiveFrom: string;
  endLocalTime: string;
  idempotencyKey: string | number;
  startLocalTime: string;
  timeZone: string;
  weekday: Weekday;
};

export type SaveTeacherProfileInput = {
  idempotencyKey: string | number;
  professionalBiography: string;
  profileImageUrl?: string | null | undefined;
  pronouns?: string | null | undefined;
  teacherUserId: string | number;
  topicKeys: Array<string>;
};

export type SaveUserPreferencesInput = {
  actingRole: UserRole;
  displayTimeZone: string;
  interfaceLocale: InterfaceLocale;
};

export type SessionRatingErrorCode =
  | 'BOOKING_NOT_FOUND'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'INVALID_RATING'
  | 'INVALID_REASON'
  | 'RATING_NOT_FOUND'
  | 'RATING_WINDOW_CLOSED';

export type SessionRatingImprovementTag =
  | 'AUDIO_QUALITY'
  | 'MORE_CORRECTION'
  | 'MORE_SPEAKING_TIME'
  | 'PACING';

export type SessionRatingPositiveTag =
  | 'CLEAR_EXPLANATIONS'
  | 'ENGAGING'
  | 'SUPPORTIVE'
  | 'USEFUL_PRACTICE';

export type SetStudentPlacementInput = {
  curriculumLevel: CurriculumLevel;
  targetLanguage: string;
};

export type SponsorshipBoundaryErrorCode =
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'SPONSORSHIP_ALREADY_ENDED'
  | 'SPONSORSHIP_NOT_FOUND';

export type SponsorshipEndingParty =
  | 'ORGANIZATION'
  | 'STUDENT';

export type SponsorshipInvitationErrorCode =
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'INVITATION_ALREADY_PENDING'
  | 'STUDENT_ALREADY_SPONSORED'
  | 'STUDENT_NOT_FOUND';

export type SponsorshipInvitationResponseErrorCode =
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_NOT_PENDING'
  | 'SPONSORSHIP_ALREADY_ACTIVE';

export type SponsorshipInvitationResponseInput = {
  idempotencyKey: string | number;
  invitationId: string | number;
};

export type SponsorshipInvitationState =
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'PENDING';

export type SponsorshipState =
  | 'ACTIVE'
  | 'ENDED';

export type StructuredTextBlockInput = {
  items?: Array<string> | null | undefined;
  level?: number | null | undefined;
  text?: string | null | undefined;
  type: string;
};

export type SubscriptionLifecycleInput = {
  idempotencyKey: string | number;
};

export type SubscriptionState =
  | 'ACTIVE'
  | 'CANCELLATION_SCHEDULED'
  | 'CANCELLED';

export type SubstituteTeacherInput = {
  absenceRequestId: string | number;
  classSessionId: string | number;
  idempotencyKey: string | number;
  replacementTeacherUserId: string | number;
};

export type UpdateCourseInput = {
  courseId: string | number;
  summary: string;
  title: string;
};

export type UpdateLessonUnitInput = {
  lessonUnitId: string | number;
  objectives: Array<string>;
  summary: string;
  title: string;
  topicKeys: Array<string>;
};

export type UpsertTopicInput = {
  idempotencyKey: string | number;
  key: string;
  labelEn: string;
  labelEs: string;
};

export type UserAccessStatus =
  | 'ACTIVE'
  | 'ANONYMIZATION_PENDING'
  | 'ANONYMIZED'
  | 'FIXTURE_REMOVED'
  | 'SUSPENDED';

export type UserAnonymizationState =
  | 'COMPLETED'
  | 'PENDING';

export type UserRole =
  | 'ORGANIZATION_MANAGER'
  | 'PLATFORM_ADMINISTRATOR'
  | 'STUDENT'
  | 'TEACHER';

export type WaitlistEntryState =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'INELIGIBLE'
  | 'PROMOTED'
  | 'WITHDRAWN';

export type WaitlistErrorCode =
  | 'ALREADY_BOOKED'
  | 'ALREADY_WAITLISTED'
  | 'CLASS_SESSION_NOT_FOUND'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'INSUFFICIENT_CLASS_CREDITS'
  | 'SCHEDULE_CONFLICT'
  | 'SESSION_NOT_FULL'
  | 'WAITLIST_ENTRY_NOT_ACTIVE'
  | 'WAITLIST_ENTRY_NOT_FOUND'
  | 'WAITLIST_NOT_OPEN';

export type WaitlistTerminalReason =
  | 'ALREADY_BOOKED'
  | 'CLASS_SESSION_UNAVAILABLE'
  | 'EXPIRED'
  | 'INSUFFICIENT_CLASS_CREDITS'
  | 'PROMOTED'
  | 'ROLE_ASSIGNMENT_REMOVAL'
  | 'SCHEDULE_CONFLICT'
  | 'WITHDRAWN';

export type Weekday =
  | 'FRIDAY'
  | 'MONDAY'
  | 'SATURDAY'
  | 'SUNDAY'
  | 'THURSDAY'
  | 'TUESDAY'
  | 'WEDNESDAY';

export type WithdrawWaitlistInput = {
  idempotencyKey: string | number;
  waitlistEntryId: string | number;
};

export type WorkspacePlace =
  | 'ADMINISTRATION_OPERATIONS'
  | 'ADMINISTRATION_PEOPLE'
  | 'ADMINISTRATION_REPORTS'
  | 'ORGANIZATION_REPORTS'
  | 'ORGANIZATION_STUDENTS'
  | 'STUDENT_DISCOVERY'
  | 'STUDENT_LEARNING'
  | 'TEACHER_AVAILABILITY'
  | 'TEACHER_SCHEDULE';

export type WorkspaceRelationshipScope =
  | 'ASSIGNED_CLASS_SESSIONS'
  | 'ASSIGNED_ORGANIZATION'
  | 'MARKETPLACE_WIDE'
  | 'SELF';

export type AdministrationClassSessionsQueryVariables = Exact<{
  locale: InterfaceLocale;
}>;


export type AdministrationClassSessionsQuery = { administrationCurriculum: { courses: Array<{ id: string, title: string, lessonUnits: Array<{ id: string, title: string, state: LessonUnitState }> }>, teachers: Array<{ id: string, displayName: string, taughtLanguages: Array<string>, qualifiedCurriculumLevels: Array<CurriculumLevel> }> }, administrationClassSessions: Array<{ id: string, lessonUnitId: string, teacherUserId: string, startsAt: string, endsAt: string, schedulingTimeZone: string, seatCapacity: number, occupiedSeats: number }>, administrationAbsenceRequests: Array<{ id: string, state: AbsenceRequestState, requestedAt: string, classSessions: Array<{ id: string, lessonUnitId: string, teacherUserId: string, startsAt: string, endsAt: string, schedulingTimeZone: string, seatCapacity: number, occupiedSeats: number, state: ClassSessionState, cancellationReason: string | null }> }> };

export type SubstituteTeacherMutationVariables = Exact<{
  input: SubstituteTeacherInput;
}>;


export type SubstituteTeacherMutation = { substituteTeacher:
    | { __typename: 'ClassSessionDisruptionError', code: ClassSessionDisruptionErrorCode, message: string }
    | { __typename: 'SubstituteTeacherSuccess', classSession: { id: string, lessonUnitId: string, teacherUserId: string, startsAt: string, endsAt: string, schedulingTimeZone: string, seatCapacity: number, occupiedSeats: number, state: ClassSessionState, cancellationReason: string | null }, absenceRequest: { id: string, state: AbsenceRequestState } }
   };

export type CancelClassSessionMutationVariables = Exact<{
  input: CancelClassSessionInput;
}>;


export type CancelClassSessionMutation = { cancelClassSession:
    | { __typename: 'CancelClassSessionSuccess', refundedBookingCount: number, removedWaitlistEntryCount: number, classSession: { id: string, lessonUnitId: string, teacherUserId: string, startsAt: string, endsAt: string, schedulingTimeZone: string, seatCapacity: number, occupiedSeats: number, state: ClassSessionState, cancellationReason: string | null }, absenceRequest: { id: string, state: AbsenceRequestState } }
    | { __typename: 'ClassSessionDisruptionError', code: ClassSessionDisruptionErrorCode, message: string }
   };

export type PublishClassSessionMutationVariables = Exact<{
  input: PublishClassSessionInput;
}>;


export type PublishClassSessionMutation = { publishClassSession:
    | { __typename: 'ClassSessionPublicationError', code: ClassSessionPublicationErrorCode, message: string }
    | { __typename: 'CurriculumConflict', message: string, conflictCode: string }
    | { __typename: 'PublishClassSessionSuccess', classSession: { id: string, lessonUnitId: string, teacherUserId: string, startsAt: string, endsAt: string, schedulingTimeZone: string, seatCapacity: number, occupiedSeats: number } }
   };

export type ChangeClassSessionSeatCapacityMutationVariables = Exact<{
  input: ChangeClassSessionSeatCapacityInput;
}>;


export type ChangeClassSessionSeatCapacityMutation = { changeClassSessionSeatCapacity:
    | { __typename: 'ChangeClassSessionSeatCapacitySuccess', classSession: { id: string, lessonUnitId: string, teacherUserId: string, startsAt: string, endsAt: string, schedulingTimeZone: string, seatCapacity: number, occupiedSeats: number } }
    | { __typename: 'ClassSessionSeatCapacityError', code: ClassSessionSeatCapacityErrorCode, message: string }
    | { __typename: 'CurriculumConflict', message: string, conflictCode: string }
   };

export type AdministrationCurriculumQueryVariables = Exact<{
  locale: InterfaceLocale;
}>;


export type AdministrationCurriculumQuery = { administrationCurriculum: { topics: Array<{ key: string, label: string, labelEn: string, labelEs: string }>, courses: Array<{ id: string, targetLanguage: string, curriculumLevel: CurriculumLevel, title: string, summary: string, lessonUnits: Array<{ id: string, title: string, summary: string, order: number, state: LessonUnitState, objectives: Array<string>, topics: Array<{ key: string, label: string }>, materials: Array<{ id: string, kind: LessonMaterialKind, title: string, structuredContent: string | null, httpsUrl: string | null, publisher: string | null }> }> }>, teachers: Array<{ id: string, displayName: string, pronouns: string | null, profileImageUrl: string | null, professionalBiography: string, taughtLanguages: Array<string>, qualifiedCurriculumLevels: Array<CurriculumLevel>, completedSessionCount: number, teachingTopics: Array<{ key: string, label: string }> }> } };

export type CreateCourseMutationVariables = Exact<{
  input: CreateCourseInput;
}>;


export type CreateCourseMutation = { createCourse:
    | { __typename: 'CreateCourseSuccess', course: { id: string, targetLanguage: string, curriculumLevel: CurriculumLevel, title: string, summary: string } }
    | { __typename: 'CurriculumConflict', code: string, message: string }
   };

export type ReviseCourseDetailsMutationVariables = Exact<{
  input: UpdateCourseInput;
}>;


export type ReviseCourseDetailsMutation = { reviseCourseDetails:
    | { __typename: 'CurriculumConflict', code: string, message: string }
    | { __typename: 'UpdateCourseSuccess', course: { id: string, title: string, summary: string } }
   };

export type CreateLessonUnitMutationVariables = Exact<{
  input: CreateLessonUnitInput;
}>;


export type CreateLessonUnitMutation = { createLessonUnit:
    | { __typename: 'CreateLessonUnitSuccess', lessonUnit: { id: string, title: string, order: number, state: LessonUnitState } }
    | { __typename: 'CurriculumConflict', code: string, message: string }
   };

export type ReviseLessonUnitIdentityMutationVariables = Exact<{
  input: UpdateLessonUnitInput;
}>;


export type ReviseLessonUnitIdentityMutation = { reviseLessonUnitIdentity:
    | { __typename: 'CurriculumConflict', code: string, message: string }
    | { __typename: 'InstructionalIdentityLocked', code: string, lessonUnitId: string }
    | { __typename: 'UpdateLessonUnitSuccess', lessonUnit: { id: string, title: string, summary: string, objectives: Array<string>, topics: Array<{ key: string }> } }
   };

export type PlaceLessonUnitInCourseMutationVariables = Exact<{
  input: ReorderLessonUnitInput;
}>;


export type PlaceLessonUnitInCourseMutation = { placeLessonUnitInCourse:
    | { __typename: 'CurriculumConflict', code: string, message: string }
    | { __typename: 'ReorderLessonUnitSuccess', lessonUnit: { id: string, order: number } }
   };

export type RetireLessonUnitMutationVariables = Exact<{
  input: RetireLessonUnitInput;
}>;


export type RetireLessonUnitMutation = { retireLessonUnit:
    | { __typename: 'CurriculumConflict', code: string, message: string }
    | { __typename: 'RetireLessonUnitSuccess', lessonUnit: { id: string, state: LessonUnitState } }
   };

export type SaveLocalizedTopicMutationVariables = Exact<{
  input: UpsertTopicInput;
}>;


export type SaveLocalizedTopicMutation = { saveLocalizedTopic: { topic: { key: string, label: string, labelEn: string, labelEs: string } } };

export type AddLessonMaterialMutationVariables = Exact<{
  input: AddLessonMaterialInput;
}>;


export type AddLessonMaterialMutation = { addLessonMaterial:
    | { __typename: 'AddLessonMaterialSuccess', material: { id: string, kind: LessonMaterialKind, title: string } }
    | { __typename: 'CurriculumConflict', code: string, message: string }
    | { __typename: 'InvalidLessonMaterial', code: string, message: string }
   };

export type ReviseLessonMaterialMutationVariables = Exact<{
  input: ReviseLessonMaterialInput;
}>;


export type ReviseLessonMaterialMutation = { reviseLessonMaterial:
    | { __typename: 'CurriculumConflict', code: string, message: string }
    | { __typename: 'InvalidLessonMaterial', code: string, message: string }
    | { __typename: 'ReviseLessonMaterialSuccess', material: { id: string, kind: LessonMaterialKind, title: string, structuredContent: string | null, httpsUrl: string | null, publisher: string | null } }
   };

export type SaveTeacherProfileMutationVariables = Exact<{
  input: SaveTeacherProfileInput;
}>;


export type SaveTeacherProfileMutation = { saveTeacherProfile: { teacherProfile: { id: string, displayName: string, professionalBiography: string } } };

export type GrantTeacherQualificationMutationVariables = Exact<{
  input: ChangeTeacherQualificationInput;
}>;


export type GrantTeacherQualificationMutation = { grantTeacherQualification:
    | { __typename: 'ChangeTeacherQualificationSuccess', teacherProfile: { id: string, qualifiedCurriculumLevels: Array<CurriculumLevel> } }
    | { __typename: 'CurriculumConflict', code: string, message: string }
   };

export type RemoveTeacherQualificationMutationVariables = Exact<{
  input: ChangeTeacherQualificationInput;
}>;


export type RemoveTeacherQualificationMutation = { removeTeacherQualification:
    | { __typename: 'ChangeTeacherQualificationSuccess', teacherProfile: { id: string, qualifiedCurriculumLevels: Array<CurriculumLevel> } }
    | { __typename: 'CurriculumConflict', code: string, message: string }
    | { __typename: 'TeacherQualificationRemovalBlocked', code: string, classSessionIds: Array<string> }
   };

export type AdministratorTasksQueryVariables = Exact<{ [key: string]: never; }>;


export type AdministratorTasksQuery = { administratorTasks: Array<{ id: string, requiredRole: UserRole, kind: AdministratorTaskKind, state: AdministratorTaskState, correlationReference: string, createdAt: string, resolvedAt: string | null, safeContext: { channel: NotificationChannel | null, messageId: string | null, recipientReference: string | null, classSessionId: string | null, suspendedUserId: string | null, anonymizedUserId: string | null, failureCode: string | null } }> };

export type ResolveAdministratorTaskMutationVariables = Exact<{
  input: ResolveAdministratorTaskInput;
}>;


export type ResolveAdministratorTaskMutation = { resolveAdministratorTask:
    | { __typename: 'AdministratorTaskError', code: string, message: string }
    | { __typename: 'ResolveAdministratorTaskSuccess', task: { id: string, requiredRole: UserRole, kind: AdministratorTaskKind, state: AdministratorTaskState, correlationReference: string, createdAt: string, resolvedAt: string | null, safeContext: { channel: NotificationChannel | null, messageId: string | null, recipientReference: string | null, classSessionId: string | null, suspendedUserId: string | null, anonymizedUserId: string | null, failureCode: string | null } } }
   };

export type StudentAttendanceRecordsQueryVariables = Exact<{ [key: string]: never; }>;


export type StudentAttendanceRecordsQuery = { studentAttendanceRecords: Array<{ bookingId: string, classSessionId: string, classSessionStartsAt: string, teacherDisplayName: string, outcome: AttendanceOutcome, publishedAt: string, correctedAt: string | null, correctionCount: number, reviewDeadline: string, reviewRequestOpen: boolean, reviewRequest: { id: string, bookingId: string, state: AttendanceReviewRequestState, outcomeAtRequest: AttendanceOutcome, effectiveOutcome: AttendanceOutcome, explanation: string, requestedAt: string, decidedAt: string | null, studentVisibleRationale: string | null } | null }> };

export type RequestAttendanceReviewMutationVariables = Exact<{
  input: RequestAttendanceReviewInput;
}>;


export type RequestAttendanceReviewMutation = { requestAttendanceReview:
    | { __typename: 'AttendanceReviewError', code: AttendanceReviewErrorCode, message: string }
    | { __typename: 'RequestAttendanceReviewSuccess', attendanceReviewRequest: { id: string, bookingId: string, state: AttendanceReviewRequestState, outcomeAtRequest: AttendanceOutcome, effectiveOutcome: AttendanceOutcome, explanation: string, requestedAt: string, decidedAt: string | null, studentVisibleRationale: string | null } }
   };

export type AdministrationAttendanceReviewRequestsQueryVariables = Exact<{ [key: string]: never; }>;


export type AdministrationAttendanceReviewRequestsQuery = { administrationAttendanceReviewRequests: Array<{ id: string, bookingId: string, classSessionId: string, studentDisplayName: string, outcomeAtRequest: AttendanceOutcome, effectiveOutcome: AttendanceOutcome, explanation: string, state: AttendanceReviewRequestState, requestedAt: string, decidedAt: string | null, studentVisibleRationale: string | null, privateAdministratorNote: string | null }> };

export type DecideAttendanceReviewMutationVariables = Exact<{
  input: DecideAttendanceReviewInput;
}>;


export type DecideAttendanceReviewMutation = { decideAttendanceReview:
    | { __typename: 'AttendanceReviewError', code: AttendanceReviewErrorCode, message: string }
    | { __typename: 'DecideAttendanceReviewSuccess', attendanceReviewRequest: { id: string, bookingId: string, state: AttendanceReviewRequestState, effectiveOutcome: AttendanceOutcome, decidedAt: string | null, studentVisibleRationale: string | null, privateAdministratorNote: string | null } }
   };

export type AuditLogQueryVariables = Exact<{
  filter?: AuditLogFilterInput | null | undefined;
}>;


export type AuditLogQuery = { auditLog:
    | { __typename: 'AuditLog', scope: AuditLogScope, appliedFilter: { fromLocalDate: string, toLocalDate: string, timeZone: string, outcome: AuditOutcome | null, actingRole: UserRole | null, operation: string | null, actorUserId: string | null, correlationId: string | null }, entries: Array<{ id: string, occurredAt: string, actorUserId: string | null, systemIdentity: string | null, actingRole: UserRole | null, operation: string, targetType: string, targetId: string, outcome: AuditOutcome, reasonCode: string, correlationId: string }>, pageInfo: { endCursor: string | null, hasNextPage: boolean } }
    | { __typename: 'AuditLogError', code: AuditLogErrorCode, message: string }
   };

export type AuditLogExportQueryVariables = Exact<{
  filter?: AuditLogFilterInput | null | undefined;
}>;


export type AuditLogExportQuery = { auditLogExport:
    | { __typename: 'AuditLogError', code: AuditLogErrorCode, message: string }
    | { __typename: 'AuditLogExport', scope: AuditLogScope, schemaVersion: string, exportedAt: string, rowCount: number, fileName: string, contentType: string, csv: string }
   };

export type StudentClassCreditsQueryVariables = Exact<{ [key: string]: never; }>;


export type StudentClassCreditsQuery = { studentClassCredits: { studentUserId: string, availableBalance: number, ledger: Array<{ id: string, amount: number, source: ClassCreditLedgerSource, sourceReference: string, reason: string | null, createdAt: string }> } };

export type AdministrationClassCreditsQueryVariables = Exact<{
  studentUserId: string | number;
}>;


export type AdministrationClassCreditsQuery = { administrationClassCredits: { studentUserId: string, availableBalance: number, ledger: Array<{ id: string, amount: number, source: ClassCreditLedgerSource, sourceReference: string, reason: string | null, createdAt: string }> } | null };

export type AdjustClassCreditsMutationVariables = Exact<{
  input: AdjustClassCreditsInput;
}>;


export type AdjustClassCreditsMutation = { adjustClassCredits:
    | { account: { studentUserId: string, availableBalance: number, ledger: Array<{ id: string, amount: number, source: ClassCreditLedgerSource, sourceReference: string, reason: string | null, createdAt: string }> } }
    | { code: ClassCreditAdjustmentErrorCode, message: string }
    | { message: string, conflictCode: string }
   };

export type StudentSubscriptionQueryVariables = Exact<{ [key: string]: never; }>;


export type StudentSubscriptionQuery = { studentSubscription: { id: string, state: SubscriptionState, anchorDay: number, accountingTimeUtc: string, activatedAt: string, nextAnniversaryAt: string | null, cancellationEffectiveAt: string | null } | null };

export type ScheduleSubscriptionCancellationMutationVariables = Exact<{
  input: SubscriptionLifecycleInput;
}>;


export type ScheduleSubscriptionCancellationMutation = { scheduleSubscriptionCancellation:
    | { subscription: { id: string, state: SubscriptionState, anchorDay: number, accountingTimeUtc: string, activatedAt: string, nextAnniversaryAt: string | null, cancellationEffectiveAt: string | null } }
    | { code: string, message: string }
   };

export type UndoSubscriptionCancellationMutationVariables = Exact<{
  input: SubscriptionLifecycleInput;
}>;


export type UndoSubscriptionCancellationMutation = { undoSubscriptionCancellation:
    | { code: string, message: string }
    | { subscription: { id: string, state: SubscriptionState, anchorDay: number, accountingTimeUtc: string, activatedAt: string, nextAnniversaryAt: string | null, cancellationEffectiveAt: string | null } }
   };

export type CohortDetailsFragment = { id: string, name: string, createdAt: string, organization: { id: string, name: string }, attributedActivity: { attendedCount: number, noShowCount: number }, memberships: Array<{ id: string, cohortId: string, cohortName: string, sponsorshipId: string, studentUserId: string, studentDisplayName: string, effectiveFrom: string, effectiveUntil: string | null, attributedActivity: { attendedCount: number, noShowCount: number } }> } & { ' $fragmentName'?: 'CohortDetailsFragment' };

export type OrganizationCohortsQueryVariables = Exact<{ [key: string]: never; }>;


export type OrganizationCohortsQuery = { organizationCohorts: Array<{ ' $fragmentRefs'?: { 'CohortDetailsFragment': CohortDetailsFragment } }> };

export type CreateCohortMutationVariables = Exact<{
  input: CreateCohortInput;
}>;


export type CreateCohortMutation = { createCohort:
    | { code: CohortErrorCode, message: string }
    | { cohort: { ' $fragmentRefs'?: { 'CohortDetailsFragment': CohortDetailsFragment } } }
   };

export type AddCohortMembershipMutationVariables = Exact<{
  input: AddCohortMembershipInput;
}>;


export type AddCohortMembershipMutation = { addCohortMembership:
    | { code: CohortErrorCode, message: string }
    | { cohort: { ' $fragmentRefs'?: { 'CohortDetailsFragment': CohortDetailsFragment } } }
   };

export type EndCohortMembershipMutationVariables = Exact<{
  input: EndCohortMembershipInput;
}>;


export type EndCohortMembershipMutation = { endCohortMembership:
    | { code: CohortErrorCode, message: string }
    | { cohort: { ' $fragmentRefs'?: { 'CohortDetailsFragment': CohortDetailsFragment } } }
   };

export type EndSponsorshipAsOrganizationMutationVariables = Exact<{
  input: EndSponsorshipAsOrganizationInput;
}>;


export type EndSponsorshipAsOrganizationMutation = { endSponsorshipAsOrganization:
    | { sponsorship: { id: string, studentUserId: string, studentDisplayName: string, acceptedAt: string, nextAnniversaryAt: string | null, state: SponsorshipState, endedAt: string | null, endedByParty: SponsorshipEndingParty | null, reportingFrom: string, reportingUntil: string | null, organization: { id: string, name: string }, progressSnapshots: Array<{ boundary: CourseProgressSnapshotBoundary, courseId: string, courseTitle: string, completedActiveLessonUnitCount: number, activeLessonUnitCount: number, percentage: number, capturedAt: string }> } }
    | { code: SponsorshipBoundaryErrorCode, message: string }
   };

export type EndSponsorshipAsStudentMutationVariables = Exact<{
  input: EndSponsorshipAsStudentInput;
}>;


export type EndSponsorshipAsStudentMutation = { endSponsorshipAsStudent:
    | { sponsorship: { id: string, studentUserId: string, studentDisplayName: string, acceptedAt: string, nextAnniversaryAt: string | null, state: SponsorshipState, endedAt: string | null, endedByParty: SponsorshipEndingParty | null, reportingFrom: string, reportingUntil: string | null, organization: { id: string, name: string } }, account: { studentUserId: string, availableBalance: number } }
    | { code: SponsorshipBoundaryErrorCode, message: string }
   };

export type StudentCourseProgressQueryVariables = Exact<{ [key: string]: never; }>;


export type StudentCourseProgressQuery = { studentCourseProgress: Array<{ courseId: string, title: string, targetLanguage: string, curriculumLevel: CurriculumLevel, activeLessonUnitCount: number, completedActiveLessonUnitCount: number, percentage: number, learningHistory: Array<{ lessonUnitId: string, title: string, state: LessonUnitState, earnedAt: string, countsTowardProgress: boolean }> }> };

export type TeacherFeedbackWorkQueryVariables = Exact<{ [key: string]: never; }>;


export type TeacherFeedbackWorkQuery = { teacherFeedbackWork: Array<{ bookingId: string, classSessionId: string, feedbackDeadline: string, studentDisplayName: string, learningFeedback: { bookingId: string, observedStrengths: Array<FeedbackSkill>, suggestedFocuses: Array<FeedbackSkill>, observations: string, nextPractice: string, state: LearningFeedbackState, submittedAt: string | null, redactedAt: string | null, redactionReason: string | null, updatedAt: string } | null }> };

export type SaveLearningFeedbackMutationVariables = Exact<{
  input: SaveLearningFeedbackInput;
}>;


export type SaveLearningFeedbackMutation = { saveLearningFeedback:
    | { __typename: 'LearningFeedbackError', code: LearningFeedbackErrorCode, message: string }
    | { __typename: 'SaveLearningFeedbackSuccess', feedback: { bookingId: string, observedStrengths: Array<FeedbackSkill>, suggestedFocuses: Array<FeedbackSkill>, observations: string, nextPractice: string, state: LearningFeedbackState, submittedAt: string | null, redactedAt: string | null, redactionReason: string | null, updatedAt: string } }
   };

export type StudentFeedbackAndRatingsQueryVariables = Exact<{ [key: string]: never; }>;


export type StudentFeedbackAndRatingsQuery = { studentFeedbackAndRatings: Array<{ bookingId: string, classSessionId: string, classSessionEndsAt: string, feedbackDeadline: string, ratingDeadline: string, teacherDisplayName: string, learningFeedback: { bookingId: string, observedStrengths: Array<FeedbackSkill>, suggestedFocuses: Array<FeedbackSkill>, observations: string, nextPractice: string, state: LearningFeedbackState, submittedAt: string | null, redactedAt: string | null, redactionReason: string | null, updatedAt: string } | null, sessionRating: { bookingId: string, overallRating: number, positiveTags: Array<SessionRatingPositiveTag>, improvementTags: Array<SessionRatingImprovementTag>, comment: string, redactedAt: string | null, redactionReason: string | null, createdAt: string, updatedAt: string } | null }> };

export type SaveSessionRatingMutationVariables = Exact<{
  input: SaveSessionRatingInput;
}>;


export type SaveSessionRatingMutation = { saveSessionRating:
    | { __typename: 'SaveSessionRatingSuccess', rating: { bookingId: string, overallRating: number, positiveTags: Array<SessionRatingPositiveTag>, improvementTags: Array<SessionRatingImprovementTag>, comment: string, redactedAt: string | null, redactionReason: string | null, createdAt: string, updatedAt: string } }
    | { __typename: 'SessionRatingError', code: SessionRatingErrorCode, message: string }
   };

export type AdministratorFeedbackAndRatingsQueryVariables = Exact<{ [key: string]: never; }>;


export type AdministratorFeedbackAndRatingsQuery = { administratorFeedbackAndRatings: Array<{ bookingId: string, classSessionId: string, studentDisplayName: string, teacherDisplayName: string, learningFeedback: { state: LearningFeedbackState, observedStrengths: Array<FeedbackSkill>, suggestedFocuses: Array<FeedbackSkill>, observations: string, nextPractice: string, redactedAt: string | null, redactionReason: string | null, updatedAt: string } | null, sessionRating: { overallRating: number, positiveTags: Array<SessionRatingPositiveTag>, improvementTags: Array<SessionRatingImprovementTag>, comment: string, redactedAt: string | null, redactionReason: string | null, updatedAt: string } | null }> };

export type RedactLearningFeedbackMutationVariables = Exact<{
  input: RedactLearningFeedbackInput;
}>;


export type RedactLearningFeedbackMutation = { redactLearningFeedback:
    | { __typename: 'LearningFeedbackError', code: LearningFeedbackErrorCode, message: string }
    | { __typename: 'RedactLearningFeedbackSuccess', feedback: { bookingId: string, redactedAt: string | null, redactionReason: string | null } }
   };

export type RedactSessionRatingCommentMutationVariables = Exact<{
  input: RedactSessionRatingCommentInput;
}>;


export type RedactSessionRatingCommentMutation = { redactSessionRatingComment:
    | { __typename: 'RedactSessionRatingCommentSuccess', rating: { bookingId: string, redactedAt: string | null, redactionReason: string | null } }
    | { __typename: 'SessionRatingError', code: SessionRatingErrorCode, message: string }
   };

export type LearningAccessClassSessionsQueryVariables = Exact<{
  actingRole: UserRole;
}>;


export type LearningAccessClassSessionsQuery = { learningAccessLessonUnits: Array<{ id: string, title: string }>, learningAccessClassSessions: Array<{ id: string, lessonUnitId: string, startsAt: string, endsAt: string, schedulingTimeZone: string }> };

export type LessonMaterialsQueryVariables = Exact<{
  lessonUnitId: string | number;
  actingRole: UserRole;
}>;


export type LessonMaterialsQuery = { lessonMaterials: Array<{ id: string, kind: LessonMaterialKind, title: string, structuredContent: string | null, httpsUrl: string | null, publisher: string | null }> | null };

export type EnterClassroomMutationVariables = Exact<{
  input: EnterClassroomInput;
}>;


export type EnterClassroomMutation = { enterClassroom:
    | { __typename: 'ClassroomAccessError', code: ClassroomAccessErrorCode, message: string }
    | { __typename: 'EnterClassroomSuccess', classroom: { classSessionId: string, lessonUnitId: string, teacherUserId: string, simulationStatus: ClassroomSimulationStatus } }
   };

export type MarketplaceOperationalReportQueryVariables = Exact<{
  input?: MarketplaceOperationalReportInput | null | undefined;
}>;


export type MarketplaceOperationalReportQuery = { marketplaceOperationalReport: { generatedAt: string, range: { fromLocalDate: string, toLocalDate: string, timeZone: string }, attendance: { attendedCount: number, noShowCount: number, recordedCount: number, attendanceRatePercentage: number | null, excludedUnrecordedCount: number, correctedCount: number, exceptionCount: number }, cancellations: { studentCancellationCount: number, timelyCount: number, lateCount: number, studentCancellationRatePercentage: number | null, excludedClassSessionCancellationCount: number, excludedRescheduleCount: number, dailyRates: Array<{ localDate: string, studentCancellationCount: number, timelyCount: number, lateCount: number, recordedOutcomeCount: number, excludedUnrecordedCount: number, studentCancellationRatePercentage: number | null }> }, corrections: { correctedAttendanceCount: number, lastCorrectedAt: string | null, pendingAttendanceReviewCount: number }, credits: { creditAdjustmentCount: number, grantedCreditCount: number, refundedCreditCount: number, deductedCreditCount: number, netCreditChange: number, bySource: Array<{ source: ClassCreditLedgerSource, entryCount: number, netAmount: number }> }, courseProgress: Array<{ courseId: string, courseTitle: string, targetLanguage: string, curriculumLevel: CurriculumLevel, activeLessonUnitCount: number, completedActiveLessonUnitCount: number, studentsWithProgressCount: number }>, actionableExceptions: { totalCount: number, items: Array<{ kind: MarketplaceExceptionKind, classSessionId: string, occurredAt: string, courseTitle: string, lessonUnitTitle: string, teacherDisplayName: string, affectedBookingCount: number }> } } };

export type NotificationsQueryVariables = Exact<{ [key: string]: never; }>;


export type NotificationsQuery = { notifications: Array<{ id: string, messageId: string, renderedContent: string, readAt: string | null, archivedAt: string | null, createdAt: string }> };

export type MarkNotificationReadMutationVariables = Exact<{
  id: string | number;
}>;


export type MarkNotificationReadMutation = { markNotificationRead: { id: string, messageId: string, renderedContent: string, readAt: string | null, archivedAt: string | null, createdAt: string } };

export type ArchiveNotificationMutationVariables = Exact<{
  id: string | number;
}>;


export type ArchiveNotificationMutation = { archiveNotification: { id: string, archivedAt: string | null } };

export type OrganizationAttendanceSummaryDetailsFragment = { attendedCount: number, noShowCount: number, recordedCount: number, attendanceRatePercentage: number | null, excludedUnrecordedCount: number, correctedCount: number, exceptionCount: number } & { ' $fragmentName'?: 'OrganizationAttendanceSummaryDetailsFragment' };

export type OrganizationAttendanceAndProgressReportQueryVariables = Exact<{
  cohortId?: string | number | null | undefined;
}>;


export type OrganizationAttendanceAndProgressReportQuery = { organizationAttendanceAndProgressReport: { generatedAt: string, organization: { id: string, name: string }, attendance: { ' $fragmentRefs'?: { 'OrganizationAttendanceSummaryDetailsFragment': OrganizationAttendanceSummaryDetailsFragment } }, cohorts: Array<{ cohortId: string, cohortName: string, sponsoredStudentCount: number, attendance: { ' $fragmentRefs'?: { 'OrganizationAttendanceSummaryDetailsFragment': OrganizationAttendanceSummaryDetailsFragment } } }>, students: Array<{ sponsorshipId: string, studentUserId: string, studentDisplayName: string, state: SponsorshipState, reportingFrom: string, reportingUntil: string | null, cohortNames: Array<string>, attendance: { ' $fragmentRefs'?: { 'OrganizationAttendanceSummaryDetailsFragment': OrganizationAttendanceSummaryDetailsFragment } }, courseProgress: Array<{ courseId: string, courseTitle: string, baselineCapturedAt: string | null, endingSnapshotCapturedAt: string | null, completedLessonUnitGain: number, percentagePointGain: number, snapshotRevisionCount: number, lastRevisedAt: string | null, baseline: { completedActiveLessonUnitCount: number, activeLessonUnitCount: number, percentage: number }, endingSnapshot: { completedActiveLessonUnitCount: number, activeLessonUnitCount: number, percentage: number } | null, currentEffective: { completedActiveLessonUnitCount: number, activeLessonUnitCount: number, percentage: number } | null }> }> } };

export type ReportExportDetailsFragment = { id: string, kind: ReportExportKind, schemaVersion: string, state: ReportExportState, periodStartLocalDate: string, periodEndExclusiveLocalDate: string, timeZone: string, requestedAt: string, completedAt: string | null, expiresAt: string | null, dataAsOf: string | null, rowCount: number | null, contentDigest: string | null, failureReasonCode: ReportExportFailureReason | null, downloadable: boolean } & { ' $fragmentName'?: 'ReportExportDetailsFragment' };

export type ReportExportsQueryVariables = Exact<{ [key: string]: never; }>;


export type ReportExportsQuery = { reportExports: Array<{ ' $fragmentRefs'?: { 'ReportExportDetailsFragment': ReportExportDetailsFragment } }> };

export type ReportExportArtifactQueryVariables = Exact<{
  id: string | number;
}>;


export type ReportExportArtifactQuery = { reportExportArtifact: { fileName: string, contentType: string, csv: string, reportExport: { ' $fragmentRefs'?: { 'ReportExportDetailsFragment': ReportExportDetailsFragment } } } };

export type RequestReportExportMutationVariables = Exact<{
  input: RequestReportExportInput;
}>;


export type RequestReportExportMutation = { requestReportExport:
    | { __typename: 'ReportExportError', code: ReportExportErrorCode, message: string }
    | { __typename: 'RequestReportExportSuccess', reportExport: { ' $fragmentRefs'?: { 'ReportExportDetailsFragment': ReportExportDetailsFragment } } }
   };

export type RoleAssignmentAdministrationQueryVariables = Exact<{ [key: string]: never; }>;


export type RoleAssignmentAdministrationQuery = { roleAssignmentAdministration: { organizations: Array<{ id: string, name: string }>, users: Array<{ id: string, displayName: string, accessStatus: UserAccessStatus, suspensionReason: string | null, roles: Array<UserRole>, roleAssignmentHistory: Array<{ id: string, role: UserRole, action: RoleAssignmentChangeAction, reason: string, changedAt: string }> }> } };

export type GrantRoleAssignmentMutationVariables = Exact<{
  input: ChangeRoleAssignmentInput;
}>;


export type GrantRoleAssignmentMutation = { grantRoleAssignment:
    | { endedBookingCount: number, removedWaitlistEntryCount: number, refundedClassCreditCount: number, subscriptionEnded: boolean, sponsorshipEnded: boolean, user: { id: string, displayName: string, accessStatus: UserAccessStatus, suspensionReason: string | null, roles: Array<UserRole>, roleAssignmentHistory: Array<{ id: string, role: UserRole, action: RoleAssignmentChangeAction, reason: string, changedAt: string }> } }
    | { code: string, message: string, classSessionIds: Array<string> }
   };

export type RemoveRoleAssignmentMutationVariables = Exact<{
  input: ChangeRoleAssignmentInput;
}>;


export type RemoveRoleAssignmentMutation = { removeRoleAssignment:
    | { endedBookingCount: number, removedWaitlistEntryCount: number, refundedClassCreditCount: number, subscriptionEnded: boolean, sponsorshipEnded: boolean, user: { id: string, displayName: string, accessStatus: UserAccessStatus, suspensionReason: string | null, roles: Array<UserRole>, roleAssignmentHistory: Array<{ id: string, role: UserRole, action: RoleAssignmentChangeAction, reason: string, changedAt: string }> } }
    | { code: string, message: string, classSessionIds: Array<string> }
   };

export type SuspendUserMutationVariables = Exact<{
  input: ChangeUserAccessInput;
}>;


export type SuspendUserMutation = { suspendUser:
    | { endedBookingCount: number, removedWaitlistEntryCount: number, refundedClassCreditCount: number, teacherClassSessionIds: Array<string>, user: { id: string, displayName: string, accessStatus: UserAccessStatus, suspensionReason: string | null, roles: Array<UserRole>, roleAssignmentHistory: Array<{ id: string, role: UserRole, action: RoleAssignmentChangeAction, reason: string, changedAt: string }> } }
    | { code: string, message: string }
   };

export type ReactivateUserMutationVariables = Exact<{
  input: ReactivateUserInput;
}>;


export type ReactivateUserMutation = { reactivateUser:
    | { endedBookingCount: number, removedWaitlistEntryCount: number, refundedClassCreditCount: number, teacherClassSessionIds: Array<string>, user: { id: string, displayName: string, accessStatus: UserAccessStatus, suspensionReason: string | null, roles: Array<UserRole>, roleAssignmentHistory: Array<{ id: string, role: UserRole, action: RoleAssignmentChangeAction, reason: string, changedAt: string }> } }
    | { code: string, message: string }
   };

export type AnonymizeUserMutationVariables = Exact<{
  input: AnonymizeUserInput;
}>;


export type AnonymizeUserMutation = { anonymizeUser:
    | { code: string, message: string, classSessionIds: Array<string> }
    | { state: UserAnonymizationState, redactedLearningFeedbackCount: number, redactedSessionRatingCount: number, user: { id: string, displayName: string, accessStatus: UserAccessStatus, suspensionReason: string | null, roles: Array<UserRole>, roleAssignmentHistory: Array<{ id: string, role: UserRole, action: RoleAssignmentChangeAction, reason: string, changedAt: string }> } }
   };

export type StudentSponsorshipQueryVariables = Exact<{ [key: string]: never; }>;


export type StudentSponsorshipQuery = { studentSponsorship: { id: string, studentUserId: string, studentDisplayName: string, acceptedAt: string, nextAnniversaryAt: string | null, state: SponsorshipState, endedAt: string | null, endedByParty: SponsorshipEndingParty | null, reportingFrom: string, reportingUntil: string | null, organization: { id: string, name: string } } | null };

export type StudentSponsorshipInvitationsQueryVariables = Exact<{ [key: string]: never; }>;


export type StudentSponsorshipInvitationsQuery = { studentSponsorshipInvitations: Array<{ id: string, studentUserId: string, studentDisplayName: string, state: SponsorshipInvitationState, expiresAt: string, createdAt: string, decidedAt: string | null, organization: { id: string, name: string }, disclosure: { version: string, benefitDescription: string, organizationVisibleDataDescription: string, excludedPrivateDataDescription: string } }> };

export type OrganizationSponsorshipInvitationsQueryVariables = Exact<{ [key: string]: never; }>;


export type OrganizationSponsorshipInvitationsQuery = { organizationSponsorshipInvitations: Array<{ id: string, studentUserId: string, studentDisplayName: string, state: SponsorshipInvitationState, expiresAt: string, createdAt: string, decidedAt: string | null, organization: { id: string, name: string }, disclosure: { version: string, benefitDescription: string, organizationVisibleDataDescription: string, excludedPrivateDataDescription: string } }> };

export type OrganizationSponsoredStudentsQueryVariables = Exact<{ [key: string]: never; }>;


export type OrganizationSponsoredStudentsQuery = { organizationSponsoredStudents: Array<{ id: string, studentUserId: string, studentDisplayName: string, acceptedAt: string, nextAnniversaryAt: string | null, state: SponsorshipState, endedAt: string | null, endedByParty: SponsorshipEndingParty | null, reportingFrom: string, reportingUntil: string | null, organization: { id: string, name: string }, progressSnapshots: Array<{ boundary: CourseProgressSnapshotBoundary, courseId: string, courseTitle: string, completedActiveLessonUnitCount: number, activeLessonUnitCount: number, percentage: number, capturedAt: string }> }> };

export type InviteToSponsorshipMutationVariables = Exact<{
  input: InviteToSponsorshipInput;
}>;


export type InviteToSponsorshipMutation = { inviteToSponsorship:
    | { invitation: { id: string, studentUserId: string, studentDisplayName: string, state: SponsorshipInvitationState, expiresAt: string, createdAt: string, decidedAt: string | null, organization: { id: string, name: string }, disclosure: { version: string, benefitDescription: string, organizationVisibleDataDescription: string, excludedPrivateDataDescription: string } } }
    | { code: SponsorshipInvitationErrorCode, message: string }
   };

export type AcceptSponsorshipInvitationMutationVariables = Exact<{
  input: SponsorshipInvitationResponseInput;
}>;


export type AcceptSponsorshipInvitationMutation = { acceptSponsorshipInvitation:
    | { sponsorship: { id: string, studentUserId: string, studentDisplayName: string, acceptedAt: string, nextAnniversaryAt: string | null, state: SponsorshipState, endedAt: string | null, endedByParty: SponsorshipEndingParty | null, reportingFrom: string, reportingUntil: string | null, organization: { id: string, name: string } }, account: { studentUserId: string, availableBalance: number } }
    | { code: SponsorshipInvitationResponseErrorCode, message: string }
   };

export type DeclineSponsorshipInvitationMutationVariables = Exact<{
  input: SponsorshipInvitationResponseInput;
}>;


export type DeclineSponsorshipInvitationMutation = { declineSponsorshipInvitation:
    | { invitation: { id: string, studentUserId: string, studentDisplayName: string, state: SponsorshipInvitationState, expiresAt: string, createdAt: string, decidedAt: string | null, organization: { id: string, name: string }, disclosure: { version: string, benefitDescription: string, organizationVisibleDataDescription: string, excludedPrivateDataDescription: string } } }
    | { code: SponsorshipInvitationResponseErrorCode, message: string }
   };

export type StudentWorkspaceQueryVariables = Exact<{ [key: string]: never; }>;


export type StudentWorkspaceQuery = { studentWorkspace: { roles: Array<UserRole>, user: { id: string, displayName: string, interfaceLocale: InterfaceLocale | null, displayTimeZone: string | null } } };

export type RoleWorkspaceQueryVariables = Exact<{
  actingRole: UserRole;
}>;


export type RoleWorkspaceQuery = { roleWorkspace: { actingRole: UserRole, relationshipScope: WorkspaceRelationshipScope, user: { id: string, displayName: string, interfaceLocale: InterfaceLocale | null, displayTimeZone: string | null }, rolePlaces: Array<{ role: UserRole, place: WorkspacePlace }> } };

export type RememberRoleWorkspacePlaceMutationVariables = Exact<{
  input: RememberRoleWorkspacePlaceInput;
}>;


export type RememberRoleWorkspacePlaceMutation = { rememberRoleWorkspacePlace: { role: UserRole, place: WorkspacePlace } };

export type SaveUserPreferencesMutationVariables = Exact<{
  input: SaveUserPreferencesInput;
}>;


export type SaveUserPreferencesMutation = { saveUserPreferences: { user: { id: string, displayName: string, interfaceLocale: InterfaceLocale | null, displayTimeZone: string | null } } };

export type StudentPlacementsQueryVariables = Exact<{ [key: string]: never; }>;


export type StudentPlacementsQuery = { studentPlacements: Array<{ targetLanguage: string, curriculumLevel: CurriculumLevel }> };

export type ClassSessionDiscoveryOptionsQueryVariables = Exact<{ [key: string]: never; }>;


export type ClassSessionDiscoveryOptionsQuery = { classSessionDiscoveryOptions: { targetLanguages: Array<string>, topics: Array<{ key: string, label: string }>, teachers: Array<{ id: string, displayName: string }> } };

export type DiscoverClassSessionsQueryVariables = Exact<{
  input: ClassSessionDiscoveryInput;
}>;


export type DiscoverClassSessionsQuery = { discoverClassSessions: { appliedFilter: { targetLanguage: string, curriculumLevel: CurriculumLevel | null, teacherUserId: string | null, topicKeys: Array<string>, localDate: string | null }, nodes: Array<{ id: string, startsAt: string, endsAt: string, schedulingTimeZone: string, seatCapacity: number, occupiedSeats: number, lessonUnit: { id: string, title: string, summary: string, objectives: Array<string>, topics: Array<{ key: string, label: string }> }, teacherProfile: { id: string, displayName: string, pronouns: string | null, profileImageUrl: string | null, professionalBiography: string, taughtLanguages: Array<string>, qualifiedCurriculumLevels: Array<CurriculumLevel>, completedSessionCount: number, teachingTopics: Array<{ key: string, label: string }> } }>, pageInfo: { endCursor: string | null, hasNextPage: boolean } } };

export type SetStudentPlacementMutationVariables = Exact<{
  input: SetStudentPlacementInput;
}>;


export type SetStudentPlacementMutation = { setStudentPlacement: { targetLanguage: string, curriculumLevel: CurriculumLevel } };

export type BookingFieldsFragment = { id: string, state: BookingState, terminalReason: BookingTerminalReason | null, classCreditRefunded: boolean, bookedAt: string, endedAt: string | null, classSession: { id: string, lessonUnitId: string, startsAt: string, endsAt: string, occupiedSeats: number, seatCapacity: number } } & { ' $fragmentName'?: 'BookingFieldsFragment' };

export type StudentBookingsQueryVariables = Exact<{ [key: string]: never; }>;


export type StudentBookingsQuery = { studentBookings: Array<{ ' $fragmentRefs'?: { 'BookingFieldsFragment': BookingFieldsFragment } }> };

export type BookClassSessionMutationVariables = Exact<{
  input: BookClassSessionInput;
}>;


export type BookClassSessionMutation = { bookClassSession:
    | { __typename: 'BookClassSessionSuccess', booking: { ' $fragmentRefs'?: { 'BookingFieldsFragment': BookingFieldsFragment } }, account: { availableBalance: number } }
    | { __typename: 'BookingError', code: BookingErrorCode, message: string }
   };

export type CancelBookingMutationVariables = Exact<{
  input: CancelBookingInput;
}>;


export type CancelBookingMutation = { cancelBooking:
    | { __typename: 'BookingError', code: BookingErrorCode, message: string }
    | { __typename: 'CancelBookingSuccess', booking: { ' $fragmentRefs'?: { 'BookingFieldsFragment': BookingFieldsFragment } }, account: { availableBalance: number } }
   };

export type RescheduleBookingMutationVariables = Exact<{
  input: RescheduleBookingInput;
}>;


export type RescheduleBookingMutation = { rescheduleBooking:
    | { __typename: 'BookingError', code: BookingErrorCode, message: string }
    | { __typename: 'RescheduleBookingSuccess', originalBooking: { ' $fragmentRefs'?: { 'BookingFieldsFragment': BookingFieldsFragment } }, replacementBooking: { ' $fragmentRefs'?: { 'BookingFieldsFragment': BookingFieldsFragment } }, account: { availableBalance: number } }
   };

export type WaitlistEntryFieldsFragment = { id: string, state: WaitlistEntryState, terminalReason: WaitlistTerminalReason | null, joinedAt: string, expiresAt: string, completedAt: string | null, classSession: { id: string, startsAt: string, endsAt: string, occupiedSeats: number, seatCapacity: number }, resultingBooking: { ' $fragmentRefs'?: { 'BookingFieldsFragment': BookingFieldsFragment } } | null } & { ' $fragmentName'?: 'WaitlistEntryFieldsFragment' };

export type StudentWaitlistEntriesQueryVariables = Exact<{ [key: string]: never; }>;


export type StudentWaitlistEntriesQuery = { studentWaitlistEntries: Array<{ ' $fragmentRefs'?: { 'WaitlistEntryFieldsFragment': WaitlistEntryFieldsFragment } }> };

export type JoinWaitlistMutationVariables = Exact<{
  input: JoinWaitlistInput;
}>;


export type JoinWaitlistMutation = { joinWaitlist:
    | { __typename: 'JoinWaitlistSuccess', entry: { ' $fragmentRefs'?: { 'WaitlistEntryFieldsFragment': WaitlistEntryFieldsFragment } } }
    | { __typename: 'WaitlistError', code: WaitlistErrorCode, message: string }
   };

export type WithdrawWaitlistMutationVariables = Exact<{
  input: WithdrawWaitlistInput;
}>;


export type WithdrawWaitlistMutation = { withdrawWaitlist:
    | { __typename: 'WaitlistError', code: WaitlistErrorCode, message: string }
    | { __typename: 'WaitlistPromotionWon', booking: { ' $fragmentRefs'?: { 'BookingFieldsFragment': BookingFieldsFragment } } }
    | { __typename: 'WithdrawWaitlistSuccess', entry: { ' $fragmentRefs'?: { 'WaitlistEntryFieldsFragment': WaitlistEntryFieldsFragment } } }
   };

export type TeacherAttendanceSessionsQueryVariables = Exact<{ [key: string]: never; }>;


export type TeacherAttendanceSessionsQuery = { teacherAttendanceClassSessions: Array<{ id: string, lessonUnitId: string, teacherUserId: string, startsAt: string, endsAt: string, schedulingTimeZone: string, seatCapacity: number, occupiedSeats: number, state: ClassSessionState, cancellationReason: string | null }> };

export type ClassRosterQueryVariables = Exact<{
  classSessionId: string | number;
}>;


export type ClassRosterQuery = { classRoster: { classSession: { id: string, lessonUnitId: string, teacherUserId: string, startsAt: string, endsAt: string, schedulingTimeZone: string, seatCapacity: number, occupiedSeats: number, state: ClassSessionState, cancellationReason: string | null }, students: Array<{ bookingId: string, studentUserId: string, displayName: string, placement: { targetLanguage: string, curriculumLevel: CurriculumLevel } | null, attendance: { outcome: AttendanceOutcome, submittedAt: string, correctedAt: string | null, correctionCount: number } | null }> } | null };

export type RecordAttendanceMutationVariables = Exact<{
  input: RecordAttendanceInput;
}>;


export type RecordAttendanceMutation = { recordAttendance:
    | { __typename: 'AttendanceError', code: AttendanceErrorCode, message: string }
    | { __typename: 'RecordAttendanceSuccess', classRoster: { classSession: { id: string, lessonUnitId: string, teacherUserId: string, startsAt: string, endsAt: string, schedulingTimeZone: string, seatCapacity: number, occupiedSeats: number, state: ClassSessionState, cancellationReason: string | null }, students: Array<{ bookingId: string, studentUserId: string, displayName: string, placement: { targetLanguage: string, curriculumLevel: CurriculumLevel } | null, attendance: { outcome: AttendanceOutcome, submittedAt: string, correctedAt: string | null, correctionCount: number } | null }> } }
   };

export type TeacherAvailabilityQueryVariables = Exact<{ [key: string]: never; }>;


export type TeacherAvailabilityQuery = { teacherAvailability: { timeZone: string, weeklyRanges: Array<{ id: string, weekday: Weekday, startLocalTime: string, endLocalTime: string, effectiveFrom: string, effectiveUntil: string | null, timeZone: string }>, exceptions: Array<{ id: string, startsAtLocal: string, endsAtLocal: string, startsAt: string, endsAt: string, timeZone: string }> } };

export type SaveTeacherAvailabilityRangeMutationVariables = Exact<{
  input: SaveTeacherAvailabilityRangeInput;
}>;


export type SaveTeacherAvailabilityRangeMutation = { saveTeacherAvailabilityRange:
    | { range: { id: string, weekday: Weekday, startLocalTime: string, endLocalTime: string, effectiveFrom: string, effectiveUntil: string | null, timeZone: string } }
    | { code: string, message: string }
   };

export type AddAvailabilityExceptionMutationVariables = Exact<{
  input: AddAvailabilityExceptionInput;
}>;


export type AddAvailabilityExceptionMutation = { addAvailabilityException:
    | { exception: { id: string, startsAtLocal: string, endsAtLocal: string, startsAt: string, endsAt: string, timeZone: string } }
    | { code: string, message: string, classSessionIds: Array<string>, absenceRequestPath: string }
    | { code: string, message: string }
   };

export type EndTeacherAvailabilityRangeMutationVariables = Exact<{
  input: EndTeacherAvailabilityRangeInput;
}>;


export type EndTeacherAvailabilityRangeMutation = { endTeacherAvailabilityRange:
    | { range: { id: string, weekday: Weekday, startLocalTime: string, endLocalTime: string, effectiveFrom: string, effectiveUntil: string | null, timeZone: string } }
    | { code: string, message: string }
   };

export type RemoveAvailabilityExceptionMutationVariables = Exact<{
  input: RemoveAvailabilityExceptionInput;
}>;


export type RemoveAvailabilityExceptionMutation = { removeAvailabilityException:
    | { exceptionId: string }
    | { code: string, message: string }
   };

export type TeacherScheduleQueryVariables = Exact<{ [key: string]: never; }>;


export type TeacherScheduleQuery = { teacherClassSessions: Array<{ id: string, lessonUnitId: string, teacherUserId: string, startsAt: string, endsAt: string, schedulingTimeZone: string, seatCapacity: number, occupiedSeats: number, state: ClassSessionState, cancellationReason: string | null }>, teacherAbsenceRequests: Array<{ id: string, state: AbsenceRequestState, requestedAt: string, classSessions: Array<{ id: string, startsAt: string, state: ClassSessionState }> }> };

export type ReportAbsenceMutationVariables = Exact<{
  input: ReportAbsenceInput;
}>;


export type ReportAbsenceMutation = { reportAbsence:
    | { __typename: 'ClassSessionDisruptionError', code: ClassSessionDisruptionErrorCode, message: string }
    | { __typename: 'ReportAbsenceSuccess', absenceRequest: { id: string, state: AbsenceRequestState, requestedAt: string, classSessions: Array<{ id: string, lessonUnitId: string, teacherUserId: string, startsAt: string, endsAt: string, schedulingTimeZone: string, seatCapacity: number, occupiedSeats: number, state: ClassSessionState, cancellationReason: string | null }> } }
   };

export const CohortDetailsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CohortDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Cohort"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"memberships"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"cohortId"}},{"kind":"Field","name":{"kind":"Name","value":"cohortName"}},{"kind":"Field","name":{"kind":"Name","value":"sponsorshipId"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}}]}}]}}]} as unknown as DocumentNode<CohortDetailsFragment, unknown>;
export const OrganizationAttendanceSummaryDetailsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OrganizationAttendanceSummaryDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrganizationAttendanceSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}},{"kind":"Field","name":{"kind":"Name","value":"recordedCount"}},{"kind":"Field","name":{"kind":"Name","value":"attendanceRatePercentage"}},{"kind":"Field","name":{"kind":"Name","value":"excludedUnrecordedCount"}},{"kind":"Field","name":{"kind":"Name","value":"correctedCount"}},{"kind":"Field","name":{"kind":"Name","value":"exceptionCount"}}]}}]} as unknown as DocumentNode<OrganizationAttendanceSummaryDetailsFragment, unknown>;
export const ReportExportDetailsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReportExportDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ReportExport"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"periodStartLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"periodEndExclusiveLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"dataAsOf"}},{"kind":"Field","name":{"kind":"Name","value":"rowCount"}},{"kind":"Field","name":{"kind":"Name","value":"contentDigest"}},{"kind":"Field","name":{"kind":"Name","value":"failureReasonCode"}},{"kind":"Field","name":{"kind":"Name","value":"downloadable"}}]}}]} as unknown as DocumentNode<ReportExportDetailsFragment, unknown>;
export const BookingFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Booking"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"classCreditRefunded"}},{"kind":"Field","name":{"kind":"Name","value":"bookedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}}]}}]} as unknown as DocumentNode<BookingFieldsFragment, unknown>;
export const WaitlistEntryFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WaitlistEntryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WaitlistEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"joinedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"resultingBooking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Booking"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"classCreditRefunded"}},{"kind":"Field","name":{"kind":"Name","value":"bookedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}}]}}]} as unknown as DocumentNode<WaitlistEntryFieldsFragment, unknown>;
export const AdministrationClassSessionsDocument = {"__meta__":{"hash":"sha256:9a5b5bfc33f169397498b82fb70948c7f16161d7304b278e4c6973a7d4f60493"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdministrationClassSessions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"locale"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"InterfaceLocale"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"administrationCurriculum"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"locale"},"value":{"kind":"Variable","name":{"kind":"Name","value":"locale"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"teachers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"taughtLanguages"}},{"kind":"Field","name":{"kind":"Name","value":"qualifiedCurriculumLevels"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"administrationClassSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}}]}},{"kind":"Field","name":{"kind":"Name","value":"administrationAbsenceRequests"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationReason"}}]}}]}}]}}]} as unknown as DocumentNode<AdministrationClassSessionsQuery, AdministrationClassSessionsQueryVariables>;
export const SubstituteTeacherDocument = {"__meta__":{"hash":"sha256:6f86fefdce99d893db4b9c2db07dd5986964e5d76d90b038d6c28f26a51d6231"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SubstituteTeacher"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SubstituteTeacherInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"substituteTeacher"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SubstituteTeacherSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationReason"}}]}},{"kind":"Field","name":{"kind":"Name","value":"absenceRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ClassSessionDisruptionError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<SubstituteTeacherMutation, SubstituteTeacherMutationVariables>;
export const CancelClassSessionDocument = {"__meta__":{"hash":"sha256:5bf777ad1140ae5a3b12a1fdd8223bf3ca27e8a41cb5559d1a4607bdae2edac9"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelClassSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CancelClassSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelClassSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CancelClassSessionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationReason"}}]}},{"kind":"Field","name":{"kind":"Name","value":"absenceRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"Field","name":{"kind":"Name","value":"refundedBookingCount"}},{"kind":"Field","name":{"kind":"Name","value":"removedWaitlistEntryCount"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ClassSessionDisruptionError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<CancelClassSessionMutation, CancelClassSessionMutationVariables>;
export const PublishClassSessionDocument = {"__meta__":{"hash":"sha256:99e6cd251f8e5af620c9e04997c0e49609290154deab1546c17696c2dcb24b8b"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PublishClassSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PublishClassSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publishClassSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PublishClassSessionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ClassSessionPublicationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"conflictCode"},"name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<PublishClassSessionMutation, PublishClassSessionMutationVariables>;
export const ChangeClassSessionSeatCapacityDocument = {"__meta__":{"hash":"sha256:182fb43dc8e4c7f8fb2a6a2ab271092e6cb1c2e1c9478b3a5eeec1d73565e1cc"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangeClassSessionSeatCapacity"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeClassSessionSeatCapacityInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changeClassSessionSeatCapacity"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeClassSessionSeatCapacitySuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ClassSessionSeatCapacityError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"conflictCode"},"name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ChangeClassSessionSeatCapacityMutation, ChangeClassSessionSeatCapacityMutationVariables>;
export const AdministrationCurriculumDocument = {"__meta__":{"hash":"sha256:e15b5112fa3c5b6fe83dda99b5c686953947bac5c9153d605a31d6d83ee0c754"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdministrationCurriculum"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"locale"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"InterfaceLocale"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"administrationCurriculum"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"locale"},"value":{"kind":"Variable","name":{"kind":"Name","value":"locale"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"topics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"labelEn"}},{"kind":"Field","name":{"kind":"Name","value":"labelEs"}}]}},{"kind":"Field","name":{"kind":"Name","value":"courses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"objectives"}},{"kind":"Field","name":{"kind":"Name","value":"topics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}}]}},{"kind":"Field","name":{"kind":"Name","value":"materials"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"structuredContent"}},{"kind":"Field","name":{"kind":"Name","value":"httpsUrl"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"teachers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"pronouns"}},{"kind":"Field","name":{"kind":"Name","value":"profileImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"professionalBiography"}},{"kind":"Field","name":{"kind":"Name","value":"taughtLanguages"}},{"kind":"Field","name":{"kind":"Name","value":"qualifiedCurriculumLevels"}},{"kind":"Field","name":{"kind":"Name","value":"teachingTopics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}}]}},{"kind":"Field","name":{"kind":"Name","value":"completedSessionCount"}}]}}]}}]}}]} as unknown as DocumentNode<AdministrationCurriculumQuery, AdministrationCurriculumQueryVariables>;
export const CreateCourseDocument = {"__meta__":{"hash":"sha256:33762ef2ad605006e9d07e972bd2939288672e4350e138096fa694967ba20f9a"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCourse"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCourseInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCourse"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCourseSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"course"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<CreateCourseMutation, CreateCourseMutationVariables>;
export const ReviseCourseDetailsDocument = {"__meta__":{"hash":"sha256:1910abe777573097f9008726516b4f3bcc7037e3eb98e1d5e8dfafe1e4e10ed2"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReviseCourseDetails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateCourseInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reviseCourseDetails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateCourseSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"course"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ReviseCourseDetailsMutation, ReviseCourseDetailsMutationVariables>;
export const CreateLessonUnitDocument = {"__meta__":{"hash":"sha256:ab8538030d45e2dfef24a2218ece60dad70d92a2d054d7656e3f61e0053ac3ef"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateLessonUnit"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateLessonUnitInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createLessonUnit"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CreateLessonUnitSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lessonUnit"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<CreateLessonUnitMutation, CreateLessonUnitMutationVariables>;
export const ReviseLessonUnitIdentityDocument = {"__meta__":{"hash":"sha256:d8a245a3109f1e04aaa005cf568585de08a5502d1a9b2cbc9b0f655fd228cefd"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReviseLessonUnitIdentity"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateLessonUnitInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reviseLessonUnitIdentity"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateLessonUnitSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lessonUnit"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"objectives"}},{"kind":"Field","name":{"kind":"Name","value":"topics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InstructionalIdentityLocked"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ReviseLessonUnitIdentityMutation, ReviseLessonUnitIdentityMutationVariables>;
export const PlaceLessonUnitInCourseDocument = {"__meta__":{"hash":"sha256:b6a33d048bc750d70800433757ef08a091fc2e7d7adc926062e5db49f42ff09c"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PlaceLessonUnitInCourse"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReorderLessonUnitInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"placeLessonUnitInCourse"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ReorderLessonUnitSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lessonUnit"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<PlaceLessonUnitInCourseMutation, PlaceLessonUnitInCourseMutationVariables>;
export const RetireLessonUnitDocument = {"__meta__":{"hash":"sha256:235b0a37acee527c53a6d5d1f934fc249884ae6049186c8562834b069ec951aa"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RetireLessonUnit"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RetireLessonUnitInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"retireLessonUnit"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RetireLessonUnitSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lessonUnit"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<RetireLessonUnitMutation, RetireLessonUnitMutationVariables>;
export const SaveLocalizedTopicDocument = {"__meta__":{"hash":"sha256:888260bf0a6cd4a5ef1b63292157f1f24f82d81a919a3b47093db442e5405f24"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveLocalizedTopic"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpsertTopicInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveLocalizedTopic"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"topic"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"labelEn"}},{"kind":"Field","name":{"kind":"Name","value":"labelEs"}}]}}]}}]}}]} as unknown as DocumentNode<SaveLocalizedTopicMutation, SaveLocalizedTopicMutationVariables>;
export const AddLessonMaterialDocument = {"__meta__":{"hash":"sha256:7f2f7106433d68c8d4f9a68f0bc73a151ad6fcb3acd5c9f729b6cb33a772d0df"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddLessonMaterial"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddLessonMaterialInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addLessonMaterial"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AddLessonMaterialSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"material"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InvalidLessonMaterial"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<AddLessonMaterialMutation, AddLessonMaterialMutationVariables>;
export const ReviseLessonMaterialDocument = {"__meta__":{"hash":"sha256:a4180895eeef810a23da066d7535ba50722dc66348beb23bb6e6256e685c21cb"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReviseLessonMaterial"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReviseLessonMaterialInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reviseLessonMaterial"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ReviseLessonMaterialSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"material"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"structuredContent"}},{"kind":"Field","name":{"kind":"Name","value":"httpsUrl"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InvalidLessonMaterial"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ReviseLessonMaterialMutation, ReviseLessonMaterialMutationVariables>;
export const SaveTeacherProfileDocument = {"__meta__":{"hash":"sha256:2cce88970ac4ccb82f3dd6f19d48e2cacc71b51ab384b6033da38e18c4ca9f1a"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveTeacherProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaveTeacherProfileInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveTeacherProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"professionalBiography"}}]}}]}}]}}]} as unknown as DocumentNode<SaveTeacherProfileMutation, SaveTeacherProfileMutationVariables>;
export const GrantTeacherQualificationDocument = {"__meta__":{"hash":"sha256:d1d7c85c7ae919a31b3bd9b2453aa799e12c7171600653bf283f2a38011b647d"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GrantTeacherQualification"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeTeacherQualificationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"grantTeacherQualification"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeTeacherQualificationSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"qualifiedCurriculumLevels"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<GrantTeacherQualificationMutation, GrantTeacherQualificationMutationVariables>;
export const RemoveTeacherQualificationDocument = {"__meta__":{"hash":"sha256:d73320f1425622fc52f6db2fd3cd73f34ab564255c039c8cd42b6bfddcb5297a"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveTeacherQualification"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeTeacherQualificationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeTeacherQualification"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeTeacherQualificationSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"qualifiedCurriculumLevels"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeacherQualificationRemovalBlocked"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionIds"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveTeacherQualificationMutation, RemoveTeacherQualificationMutationVariables>;
export const AdministratorTasksDocument = {"__meta__":{"hash":"sha256:66e0cc6a8d8c27f8062f3b81a4f95ac96342a3966e1834d30370177b5c122b8e"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdministratorTasks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"administratorTasks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"requiredRole"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"correlationReference"}},{"kind":"Field","name":{"kind":"Name","value":"safeContext"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"channel"}},{"kind":"Field","name":{"kind":"Name","value":"messageId"}},{"kind":"Field","name":{"kind":"Name","value":"recipientReference"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"suspendedUserId"}},{"kind":"Field","name":{"kind":"Name","value":"anonymizedUserId"}},{"kind":"Field","name":{"kind":"Name","value":"failureCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"resolvedAt"}}]}}]}}]} as unknown as DocumentNode<AdministratorTasksQuery, AdministratorTasksQueryVariables>;
export const ResolveAdministratorTaskDocument = {"__meta__":{"hash":"sha256:e4615b88458761c635cb4777d5722b2d3e2b157b660d3696157a87b0d612c824"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResolveAdministratorTask"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ResolveAdministratorTaskInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resolveAdministratorTask"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ResolveAdministratorTaskSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"task"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"requiredRole"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"correlationReference"}},{"kind":"Field","name":{"kind":"Name","value":"safeContext"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"channel"}},{"kind":"Field","name":{"kind":"Name","value":"messageId"}},{"kind":"Field","name":{"kind":"Name","value":"recipientReference"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"suspendedUserId"}},{"kind":"Field","name":{"kind":"Name","value":"anonymizedUserId"}},{"kind":"Field","name":{"kind":"Name","value":"failureCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"resolvedAt"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AdministratorTaskError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ResolveAdministratorTaskMutation, ResolveAdministratorTaskMutationVariables>;
export const StudentAttendanceRecordsDocument = {"__meta__":{"hash":"sha256:39f27f5640974e2574054d48996b39cae6823d069fc5575acf08fb3e936cd850"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentAttendanceRecords"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentAttendanceRecords"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionStartsAt"}},{"kind":"Field","name":{"kind":"Name","value":"teacherDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"correctedAt"}},{"kind":"Field","name":{"kind":"Name","value":"correctionCount"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDeadline"}},{"kind":"Field","name":{"kind":"Name","value":"reviewRequestOpen"}},{"kind":"Field","name":{"kind":"Name","value":"reviewRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"outcomeAtRequest"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveOutcome"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"decidedAt"}},{"kind":"Field","name":{"kind":"Name","value":"studentVisibleRationale"}}]}}]}}]}}]} as unknown as DocumentNode<StudentAttendanceRecordsQuery, StudentAttendanceRecordsQueryVariables>;
export const RequestAttendanceReviewDocument = {"__meta__":{"hash":"sha256:0a5105beea143f74327e3eed4f05a1b7d718217dfdf0dcde7920aba57af1c909"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RequestAttendanceReview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RequestAttendanceReviewInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"requestAttendanceReview"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RequestAttendanceReviewSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendanceReviewRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"outcomeAtRequest"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveOutcome"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"decidedAt"}},{"kind":"Field","name":{"kind":"Name","value":"studentVisibleRationale"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AttendanceReviewError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<RequestAttendanceReviewMutation, RequestAttendanceReviewMutationVariables>;
export const AdministrationAttendanceReviewRequestsDocument = {"__meta__":{"hash":"sha256:72756d53722363f6397dd22be19226ac2417e246d3dc82bf7a7a4731e0426cb4"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdministrationAttendanceReviewRequests"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"administrationAttendanceReviewRequests"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"outcomeAtRequest"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveOutcome"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"decidedAt"}},{"kind":"Field","name":{"kind":"Name","value":"studentVisibleRationale"}},{"kind":"Field","name":{"kind":"Name","value":"privateAdministratorNote"}}]}}]}}]} as unknown as DocumentNode<AdministrationAttendanceReviewRequestsQuery, AdministrationAttendanceReviewRequestsQueryVariables>;
export const DecideAttendanceReviewDocument = {"__meta__":{"hash":"sha256:4db02e1bfaa397bebee4dd1ad103ee55fb4f94d04fa669062076a7f140d035d4"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DecideAttendanceReview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DecideAttendanceReviewInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"decideAttendanceReview"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DecideAttendanceReviewSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendanceReviewRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveOutcome"}},{"kind":"Field","name":{"kind":"Name","value":"decidedAt"}},{"kind":"Field","name":{"kind":"Name","value":"studentVisibleRationale"}},{"kind":"Field","name":{"kind":"Name","value":"privateAdministratorNote"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AttendanceReviewError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<DecideAttendanceReviewMutation, DecideAttendanceReviewMutationVariables>;
export const AuditLogDocument = {"__meta__":{"hash":"sha256:6c2c147c773a0ce948058eac215a4105e8844e040f57ebca48be4bd8dd63d637"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AuditLog"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"AuditLogFilterInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"auditLog"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AuditLog"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"scope"}},{"kind":"Field","name":{"kind":"Name","value":"appliedFilter"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fromLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"toLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"actingRole"}},{"kind":"Field","name":{"kind":"Name","value":"operation"}},{"kind":"Field","name":{"kind":"Name","value":"actorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"correlationId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"occurredAt"}},{"kind":"Field","name":{"kind":"Name","value":"actorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"systemIdentity"}},{"kind":"Field","name":{"kind":"Name","value":"actingRole"}},{"kind":"Field","name":{"kind":"Name","value":"operation"}},{"kind":"Field","name":{"kind":"Name","value":"targetType"}},{"kind":"Field","name":{"kind":"Name","value":"targetId"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"reasonCode"}},{"kind":"Field","name":{"kind":"Name","value":"correlationId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endCursor"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AuditLogError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<AuditLogQuery, AuditLogQueryVariables>;
export const AuditLogExportDocument = {"__meta__":{"hash":"sha256:164a8b1359cd7e4cf1c86ebebfc14e49c20fe4e728746485ddfaa96900740c62"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AuditLogExport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"AuditLogFilterInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"auditLogExport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AuditLogExport"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"scope"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"exportedAt"}},{"kind":"Field","name":{"kind":"Name","value":"rowCount"}},{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"contentType"}},{"kind":"Field","name":{"kind":"Name","value":"csv"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AuditLogError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<AuditLogExportQuery, AuditLogExportQueryVariables>;
export const StudentClassCreditsDocument = {"__meta__":{"hash":"sha256:cfce06eed7cd666a77ec42c5f93dceb7e944867a8fa0b172d3a0af1e88e83d1c"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentClassCredits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentClassCredits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"availableBalance"}},{"kind":"Field","name":{"kind":"Name","value":"ledger"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"sourceReference"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<StudentClassCreditsQuery, StudentClassCreditsQueryVariables>;
export const AdministrationClassCreditsDocument = {"__meta__":{"hash":"sha256:3774d6eab48155ecc0c0c0697ede0c5e406dd70ef05100123f82c03b395dc0b5"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdministrationClassCredits"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"studentUserId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"administrationClassCredits"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"studentUserId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"studentUserId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"availableBalance"}},{"kind":"Field","name":{"kind":"Name","value":"ledger"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"sourceReference"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<AdministrationClassCreditsQuery, AdministrationClassCreditsQueryVariables>;
export const AdjustClassCreditsDocument = {"__meta__":{"hash":"sha256:8318af7c02b245b21bdabd1e2619638678d6ba562870d818272ca3e4f62eedbd"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdjustClassCredits"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AdjustClassCreditsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adjustClassCredits"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AdjustClassCreditsSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"availableBalance"}},{"kind":"Field","name":{"kind":"Name","value":"ledger"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"sourceReference"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ClassCreditAdjustmentError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"conflictCode"},"name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<AdjustClassCreditsMutation, AdjustClassCreditsMutationVariables>;
export const StudentSubscriptionDocument = {"__meta__":{"hash":"sha256:9f8d06e164ae117ec56a5cfdbaad7ca38723302318b5bfe50ed881986adfcd43"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentSubscription"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentSubscription"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"anchorDay"}},{"kind":"Field","name":{"kind":"Name","value":"accountingTimeUtc"}},{"kind":"Field","name":{"kind":"Name","value":"activatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextAnniversaryAt"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationEffectiveAt"}}]}}]}}]} as unknown as DocumentNode<StudentSubscriptionQuery, StudentSubscriptionQueryVariables>;
export const ScheduleSubscriptionCancellationDocument = {"__meta__":{"hash":"sha256:b295170c22b65def8b4210dc12df25bee3648de660ec7e7212e661bb65b68bdc"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ScheduleSubscriptionCancellation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SubscriptionLifecycleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"scheduleSubscriptionCancellation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ScheduleSubscriptionCancellationSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subscription"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"anchorDay"}},{"kind":"Field","name":{"kind":"Name","value":"accountingTimeUtc"}},{"kind":"Field","name":{"kind":"Name","value":"activatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextAnniversaryAt"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationEffectiveAt"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SubscriptionConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ScheduleSubscriptionCancellationMutation, ScheduleSubscriptionCancellationMutationVariables>;
export const UndoSubscriptionCancellationDocument = {"__meta__":{"hash":"sha256:2613e1ba5233d5edddad50c28f43c779975ebbdf27152a2763b3e0ccb77ecd87"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UndoSubscriptionCancellation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SubscriptionLifecycleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"undoSubscriptionCancellation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UndoSubscriptionCancellationSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subscription"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"anchorDay"}},{"kind":"Field","name":{"kind":"Name","value":"accountingTimeUtc"}},{"kind":"Field","name":{"kind":"Name","value":"activatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextAnniversaryAt"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationEffectiveAt"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SubscriptionConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<UndoSubscriptionCancellationMutation, UndoSubscriptionCancellationMutationVariables>;
export const OrganizationCohortsDocument = {"__meta__":{"hash":"sha256:ec138820c62126f649e49e679ac05e2bf772f1a22654bff8863a3bf6cb93b077"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrganizationCohorts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organizationCohorts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CohortDetails"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CohortDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Cohort"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"memberships"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"cohortId"}},{"kind":"Field","name":{"kind":"Name","value":"cohortName"}},{"kind":"Field","name":{"kind":"Name","value":"sponsorshipId"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}}]}}]}}]} as unknown as DocumentNode<OrganizationCohortsQuery, OrganizationCohortsQueryVariables>;
export const CreateCohortDocument = {"__meta__":{"hash":"sha256:e71a98ef105a9c15e6a4e62907c1db4df2b7f91e30ca452eae372fc3b094e53d"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCohort"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCohortInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCohort"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CohortSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cohort"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CohortDetails"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CohortError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CohortDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Cohort"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"memberships"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"cohortId"}},{"kind":"Field","name":{"kind":"Name","value":"cohortName"}},{"kind":"Field","name":{"kind":"Name","value":"sponsorshipId"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}}]}}]}}]} as unknown as DocumentNode<CreateCohortMutation, CreateCohortMutationVariables>;
export const AddCohortMembershipDocument = {"__meta__":{"hash":"sha256:91f846cbcdf26c4fdd9b4cc05836dea9631afd55a346afa12feaa468ad0e4ce2"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddCohortMembership"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddCohortMembershipInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addCohortMembership"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CohortMembershipSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cohort"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CohortDetails"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CohortError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CohortDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Cohort"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"memberships"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"cohortId"}},{"kind":"Field","name":{"kind":"Name","value":"cohortName"}},{"kind":"Field","name":{"kind":"Name","value":"sponsorshipId"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}}]}}]}}]} as unknown as DocumentNode<AddCohortMembershipMutation, AddCohortMembershipMutationVariables>;
export const EndCohortMembershipDocument = {"__meta__":{"hash":"sha256:ef6a81b3caadde32cc63876eb99cf361fa024d4d31b12f247b5b605c432cfc96"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EndCohortMembership"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EndCohortMembershipInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endCohortMembership"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CohortMembershipSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cohort"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CohortDetails"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CohortError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CohortDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Cohort"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"memberships"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"cohortId"}},{"kind":"Field","name":{"kind":"Name","value":"cohortName"}},{"kind":"Field","name":{"kind":"Name","value":"sponsorshipId"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}}]}}]}}]} as unknown as DocumentNode<EndCohortMembershipMutation, EndCohortMembershipMutationVariables>;
export const EndSponsorshipAsOrganizationDocument = {"__meta__":{"hash":"sha256:2b0ee3bcb3aab7b438fee258ffed09a7437024745f59704341226f576e286d7b"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EndSponsorshipAsOrganization"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EndSponsorshipAsOrganizationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endSponsorshipAsOrganization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EndSponsorshipAsOrganizationSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sponsorship"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"acceptedAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextAnniversaryAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedByParty"}},{"kind":"Field","name":{"kind":"Name","value":"reportingFrom"}},{"kind":"Field","name":{"kind":"Name","value":"reportingUntil"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"progressSnapshots"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"boundary"}},{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"courseTitle"}},{"kind":"Field","name":{"kind":"Name","value":"completedActiveLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"activeLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"percentage"}},{"kind":"Field","name":{"kind":"Name","value":"capturedAt"}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SponsorshipBoundaryError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<EndSponsorshipAsOrganizationMutation, EndSponsorshipAsOrganizationMutationVariables>;
export const EndSponsorshipAsStudentDocument = {"__meta__":{"hash":"sha256:9df2c3011f5ae2edd558d77eb3dd007b121c3d518dfab592c9a16163d9ca9e73"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EndSponsorshipAsStudent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EndSponsorshipAsStudentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endSponsorshipAsStudent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EndSponsorshipAsStudentSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sponsorship"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"acceptedAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextAnniversaryAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedByParty"}},{"kind":"Field","name":{"kind":"Name","value":"reportingFrom"}},{"kind":"Field","name":{"kind":"Name","value":"reportingUntil"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"availableBalance"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SponsorshipBoundaryError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<EndSponsorshipAsStudentMutation, EndSponsorshipAsStudentMutationVariables>;
export const StudentCourseProgressDocument = {"__meta__":{"hash":"sha256:d268a4b3711ece42efdd9c1ddc6265fd767e28ff7cc58a99ddbc976be4041397"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentCourseProgress"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentCourseProgress"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}},{"kind":"Field","name":{"kind":"Name","value":"activeLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"completedActiveLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"percentage"}},{"kind":"Field","name":{"kind":"Name","value":"learningHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"earnedAt"}},{"kind":"Field","name":{"kind":"Name","value":"countsTowardProgress"}}]}}]}}]}}]} as unknown as DocumentNode<StudentCourseProgressQuery, StudentCourseProgressQueryVariables>;
export const TeacherFeedbackWorkDocument = {"__meta__":{"hash":"sha256:ef6acd9d1eed0d7e3ee33c61d8585f91a61d1df9c8e3f4f3865181b8ecf947cb"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeacherFeedbackWork"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherFeedbackWork"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackDeadline"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"learningFeedback"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"observedStrengths"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedFocuses"}},{"kind":"Field","name":{"kind":"Name","value":"observations"}},{"kind":"Field","name":{"kind":"Name","value":"nextPractice"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<TeacherFeedbackWorkQuery, TeacherFeedbackWorkQueryVariables>;
export const SaveLearningFeedbackDocument = {"__meta__":{"hash":"sha256:6f94bf0835ce839fbc79329f054dd359041755efecd88ba2a6fea04d5dbbde71"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveLearningFeedback"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaveLearningFeedbackInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveLearningFeedback"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SaveLearningFeedbackSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"feedback"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"observedStrengths"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedFocuses"}},{"kind":"Field","name":{"kind":"Name","value":"observations"}},{"kind":"Field","name":{"kind":"Name","value":"nextPractice"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LearningFeedbackError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<SaveLearningFeedbackMutation, SaveLearningFeedbackMutationVariables>;
export const StudentFeedbackAndRatingsDocument = {"__meta__":{"hash":"sha256:294bf8078c0d01cf00ab815c170d7893108f3ed32cfbb4361251e90f170bc653"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentFeedbackAndRatings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentFeedbackAndRatings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionEndsAt"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackDeadline"}},{"kind":"Field","name":{"kind":"Name","value":"ratingDeadline"}},{"kind":"Field","name":{"kind":"Name","value":"teacherDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"learningFeedback"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"observedStrengths"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedFocuses"}},{"kind":"Field","name":{"kind":"Name","value":"observations"}},{"kind":"Field","name":{"kind":"Name","value":"nextPractice"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sessionRating"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"overallRating"}},{"kind":"Field","name":{"kind":"Name","value":"positiveTags"}},{"kind":"Field","name":{"kind":"Name","value":"improvementTags"}},{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<StudentFeedbackAndRatingsQuery, StudentFeedbackAndRatingsQueryVariables>;
export const SaveSessionRatingDocument = {"__meta__":{"hash":"sha256:052dd04f3f9a10b18807a9bf8d02ccfa09989d06129c78ea2dd5854b66aa8bc1"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveSessionRating"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaveSessionRatingInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveSessionRating"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SaveSessionRatingSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rating"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"overallRating"}},{"kind":"Field","name":{"kind":"Name","value":"positiveTags"}},{"kind":"Field","name":{"kind":"Name","value":"improvementTags"}},{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SessionRatingError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<SaveSessionRatingMutation, SaveSessionRatingMutationVariables>;
export const AdministratorFeedbackAndRatingsDocument = {"__meta__":{"hash":"sha256:d14e0fe24f54d4282fb93e59e5bba09c9693ae54e1196db3b0352c0eb79436c8"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdministratorFeedbackAndRatings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"administratorFeedbackAndRatings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"teacherDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"learningFeedback"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"observedStrengths"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedFocuses"}},{"kind":"Field","name":{"kind":"Name","value":"observations"}},{"kind":"Field","name":{"kind":"Name","value":"nextPractice"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sessionRating"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"overallRating"}},{"kind":"Field","name":{"kind":"Name","value":"positiveTags"}},{"kind":"Field","name":{"kind":"Name","value":"improvementTags"}},{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<AdministratorFeedbackAndRatingsQuery, AdministratorFeedbackAndRatingsQueryVariables>;
export const RedactLearningFeedbackDocument = {"__meta__":{"hash":"sha256:e4c98f390b4cf710f2f82ecc0b9ef2000fc91113d300d672ea4b37f15d37ae3a"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RedactLearningFeedback"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RedactLearningFeedbackInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"redactLearningFeedback"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RedactLearningFeedbackSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"feedback"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LearningFeedbackError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<RedactLearningFeedbackMutation, RedactLearningFeedbackMutationVariables>;
export const RedactSessionRatingCommentDocument = {"__meta__":{"hash":"sha256:d794701c9dcc3bb2eef2b6c2d13c6d661554c63a0dd7bf856ffa726791fb897d"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RedactSessionRatingComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RedactSessionRatingCommentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"redactSessionRatingComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RedactSessionRatingCommentSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rating"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SessionRatingError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<RedactSessionRatingCommentMutation, RedactSessionRatingCommentMutationVariables>;
export const LearningAccessClassSessionsDocument = {"__meta__":{"hash":"sha256:18807202c36a4566be060cfd7aa5b85b16cc71a2e21c2ebbb5836b047c896e4e"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LearningAccessClassSessions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"actingRole"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserRole"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"learningAccessLessonUnits"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"actingRole"},"value":{"kind":"Variable","name":{"kind":"Name","value":"actingRole"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}},{"kind":"Field","name":{"kind":"Name","value":"learningAccessClassSessions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"actingRole"},"value":{"kind":"Variable","name":{"kind":"Name","value":"actingRole"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}}]}}]}}]} as unknown as DocumentNode<LearningAccessClassSessionsQuery, LearningAccessClassSessionsQueryVariables>;
export const LessonMaterialsDocument = {"__meta__":{"hash":"sha256:d3a1223f35148d2aa7e9d5055944f81c3ca669dbadb200cfb1a45a05f46e507f"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LessonMaterials"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"lessonUnitId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"actingRole"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserRole"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lessonMaterials"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"lessonUnitId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"lessonUnitId"}}},{"kind":"Argument","name":{"kind":"Name","value":"actingRole"},"value":{"kind":"Variable","name":{"kind":"Name","value":"actingRole"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"structuredContent"}},{"kind":"Field","name":{"kind":"Name","value":"httpsUrl"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"}}]}}]}}]} as unknown as DocumentNode<LessonMaterialsQuery, LessonMaterialsQueryVariables>;
export const EnterClassroomDocument = {"__meta__":{"hash":"sha256:4e5da73c9d4d19814bf8e5b93d87702e13049c488d7d219dfb9b5f25ac75f275"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EnterClassroom"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EnterClassroomInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"enterClassroom"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EnterClassroomSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classroom"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"simulationStatus"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ClassroomAccessError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<EnterClassroomMutation, EnterClassroomMutationVariables>;
export const MarketplaceOperationalReportDocument = {"__meta__":{"hash":"sha256:240223e47e94a32ee591e70c4a49d73174a40710f5eb783d64cff32a36c590f3"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketplaceOperationalReport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarketplaceOperationalReportInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"marketplaceOperationalReport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"range"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fromLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"toLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attendance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}},{"kind":"Field","name":{"kind":"Name","value":"recordedCount"}},{"kind":"Field","name":{"kind":"Name","value":"attendanceRatePercentage"}},{"kind":"Field","name":{"kind":"Name","value":"excludedUnrecordedCount"}},{"kind":"Field","name":{"kind":"Name","value":"correctedCount"}},{"kind":"Field","name":{"kind":"Name","value":"exceptionCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cancellations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentCancellationCount"}},{"kind":"Field","name":{"kind":"Name","value":"timelyCount"}},{"kind":"Field","name":{"kind":"Name","value":"lateCount"}},{"kind":"Field","name":{"kind":"Name","value":"studentCancellationRatePercentage"}},{"kind":"Field","name":{"kind":"Name","value":"excludedClassSessionCancellationCount"}},{"kind":"Field","name":{"kind":"Name","value":"excludedRescheduleCount"}},{"kind":"Field","name":{"kind":"Name","value":"dailyRates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"localDate"}},{"kind":"Field","name":{"kind":"Name","value":"studentCancellationCount"}},{"kind":"Field","name":{"kind":"Name","value":"timelyCount"}},{"kind":"Field","name":{"kind":"Name","value":"lateCount"}},{"kind":"Field","name":{"kind":"Name","value":"recordedOutcomeCount"}},{"kind":"Field","name":{"kind":"Name","value":"excludedUnrecordedCount"}},{"kind":"Field","name":{"kind":"Name","value":"studentCancellationRatePercentage"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"corrections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"correctedAttendanceCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastCorrectedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pendingAttendanceReviewCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"credits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"creditAdjustmentCount"}},{"kind":"Field","name":{"kind":"Name","value":"grantedCreditCount"}},{"kind":"Field","name":{"kind":"Name","value":"refundedCreditCount"}},{"kind":"Field","name":{"kind":"Name","value":"deductedCreditCount"}},{"kind":"Field","name":{"kind":"Name","value":"netCreditChange"}},{"kind":"Field","name":{"kind":"Name","value":"bySource"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"entryCount"}},{"kind":"Field","name":{"kind":"Name","value":"netAmount"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"courseProgress"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"courseTitle"}},{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}},{"kind":"Field","name":{"kind":"Name","value":"activeLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"completedActiveLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"studentsWithProgressCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actionableExceptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"occurredAt"}},{"kind":"Field","name":{"kind":"Name","value":"courseTitle"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitTitle"}},{"kind":"Field","name":{"kind":"Name","value":"teacherDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"affectedBookingCount"}}]}}]}}]}}]}}]} as unknown as DocumentNode<MarketplaceOperationalReportQuery, MarketplaceOperationalReportQueryVariables>;
export const NotificationsDocument = {"__meta__":{"hash":"sha256:c53a5302c3ef6a4a00acaea898083d0eea44740ee499d5ce465a207694f4300e"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Notifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"messageId"}},{"kind":"Field","name":{"kind":"Name","value":"renderedContent"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"archivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<NotificationsQuery, NotificationsQueryVariables>;
export const MarkNotificationReadDocument = {"__meta__":{"hash":"sha256:731b8614211716a241747a7d978f2a5704adfb4c6551fe93706bbd6ed025f9f4"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkNotificationRead"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markNotificationRead"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"messageId"}},{"kind":"Field","name":{"kind":"Name","value":"renderedContent"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"archivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<MarkNotificationReadMutation, MarkNotificationReadMutationVariables>;
export const ArchiveNotificationDocument = {"__meta__":{"hash":"sha256:7c861f8188f19da51e1f0cee0540410d034ed1db8872ddff32c9b8f45f3f6910"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ArchiveNotification"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"archiveNotification"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"archivedAt"}}]}}]}}]} as unknown as DocumentNode<ArchiveNotificationMutation, ArchiveNotificationMutationVariables>;
export const OrganizationAttendanceAndProgressReportDocument = {"__meta__":{"hash":"sha256:c893a09a20fb0d61fe8112da9a66a09aa92d2bd6d743ad7a455727b61e0a7c32"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrganizationAttendanceAndProgressReport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cohortId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organizationAttendanceAndProgressReport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cohortId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cohortId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"generatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"attendance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OrganizationAttendanceSummaryDetails"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cohorts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cohortId"}},{"kind":"Field","name":{"kind":"Name","value":"cohortName"}},{"kind":"Field","name":{"kind":"Name","value":"sponsoredStudentCount"}},{"kind":"Field","name":{"kind":"Name","value":"attendance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OrganizationAttendanceSummaryDetails"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"students"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sponsorshipId"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"reportingFrom"}},{"kind":"Field","name":{"kind":"Name","value":"reportingUntil"}},{"kind":"Field","name":{"kind":"Name","value":"cohortNames"}},{"kind":"Field","name":{"kind":"Name","value":"attendance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OrganizationAttendanceSummaryDetails"}}]}},{"kind":"Field","name":{"kind":"Name","value":"courseProgress"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"courseTitle"}},{"kind":"Field","name":{"kind":"Name","value":"baseline"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"completedActiveLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"activeLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"percentage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baselineCapturedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endingSnapshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"completedActiveLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"activeLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"percentage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endingSnapshotCapturedAt"}},{"kind":"Field","name":{"kind":"Name","value":"currentEffective"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"completedActiveLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"activeLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"percentage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"completedLessonUnitGain"}},{"kind":"Field","name":{"kind":"Name","value":"percentagePointGain"}},{"kind":"Field","name":{"kind":"Name","value":"snapshotRevisionCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastRevisedAt"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OrganizationAttendanceSummaryDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrganizationAttendanceSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}},{"kind":"Field","name":{"kind":"Name","value":"recordedCount"}},{"kind":"Field","name":{"kind":"Name","value":"attendanceRatePercentage"}},{"kind":"Field","name":{"kind":"Name","value":"excludedUnrecordedCount"}},{"kind":"Field","name":{"kind":"Name","value":"correctedCount"}},{"kind":"Field","name":{"kind":"Name","value":"exceptionCount"}}]}}]} as unknown as DocumentNode<OrganizationAttendanceAndProgressReportQuery, OrganizationAttendanceAndProgressReportQueryVariables>;
export const ReportExportsDocument = {"__meta__":{"hash":"sha256:0c8827e153fca3148496a735ec6fccdb2914c56dad498362182691ae8e597d98"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ReportExports"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reportExports"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReportExportDetails"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReportExportDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ReportExport"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"periodStartLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"periodEndExclusiveLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"dataAsOf"}},{"kind":"Field","name":{"kind":"Name","value":"rowCount"}},{"kind":"Field","name":{"kind":"Name","value":"contentDigest"}},{"kind":"Field","name":{"kind":"Name","value":"failureReasonCode"}},{"kind":"Field","name":{"kind":"Name","value":"downloadable"}}]}}]} as unknown as DocumentNode<ReportExportsQuery, ReportExportsQueryVariables>;
export const ReportExportArtifactDocument = {"__meta__":{"hash":"sha256:7f228a7ddf78f4de6d7f33d70a27dc40b906208a497ff555881990ecff87448c"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ReportExportArtifact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reportExportArtifact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"contentType"}},{"kind":"Field","name":{"kind":"Name","value":"csv"}},{"kind":"Field","name":{"kind":"Name","value":"reportExport"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReportExportDetails"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReportExportDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ReportExport"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"periodStartLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"periodEndExclusiveLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"dataAsOf"}},{"kind":"Field","name":{"kind":"Name","value":"rowCount"}},{"kind":"Field","name":{"kind":"Name","value":"contentDigest"}},{"kind":"Field","name":{"kind":"Name","value":"failureReasonCode"}},{"kind":"Field","name":{"kind":"Name","value":"downloadable"}}]}}]} as unknown as DocumentNode<ReportExportArtifactQuery, ReportExportArtifactQueryVariables>;
export const RequestReportExportDocument = {"__meta__":{"hash":"sha256:39e7d210cfb95c86580e3c7a21dbb608713b484fd46839a456870b126bd5bba8"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RequestReportExport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RequestReportExportInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"requestReportExport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RequestReportExportSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reportExport"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReportExportDetails"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ReportExportError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReportExportDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ReportExport"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"periodStartLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"periodEndExclusiveLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"dataAsOf"}},{"kind":"Field","name":{"kind":"Name","value":"rowCount"}},{"kind":"Field","name":{"kind":"Name","value":"contentDigest"}},{"kind":"Field","name":{"kind":"Name","value":"failureReasonCode"}},{"kind":"Field","name":{"kind":"Name","value":"downloadable"}}]}}]} as unknown as DocumentNode<RequestReportExportMutation, RequestReportExportMutationVariables>;
export const RoleAssignmentAdministrationDocument = {"__meta__":{"hash":"sha256:7ff77a009ad8eaac880705b21d93f83fd65af641a0facfbf5a23a53acb1db1ea"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RoleAssignmentAdministration"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"roleAssignmentAdministration"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"users"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"accessStatus"}},{"kind":"Field","name":{"kind":"Name","value":"suspensionReason"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}},{"kind":"Field","name":{"kind":"Name","value":"roleAssignmentHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"changedAt"}}]}}]}}]}}]}}]} as unknown as DocumentNode<RoleAssignmentAdministrationQuery, RoleAssignmentAdministrationQueryVariables>;
export const GrantRoleAssignmentDocument = {"__meta__":{"hash":"sha256:01a27292b3c0a5216a4069bcb96b5b6d3eb540729667b408677887fca4ace344"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GrantRoleAssignment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeRoleAssignmentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"grantRoleAssignment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RoleAssignmentChangeSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"accessStatus"}},{"kind":"Field","name":{"kind":"Name","value":"suspensionReason"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}},{"kind":"Field","name":{"kind":"Name","value":"roleAssignmentHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"changedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"endedBookingCount"}},{"kind":"Field","name":{"kind":"Name","value":"removedWaitlistEntryCount"}},{"kind":"Field","name":{"kind":"Name","value":"refundedClassCreditCount"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionEnded"}},{"kind":"Field","name":{"kind":"Name","value":"sponsorshipEnded"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RoleAssignmentError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionIds"}}]}}]}}]}}]} as unknown as DocumentNode<GrantRoleAssignmentMutation, GrantRoleAssignmentMutationVariables>;
export const RemoveRoleAssignmentDocument = {"__meta__":{"hash":"sha256:1b5e320b44f46bc92ef6b0b908ccab22c05ca977de05b5a51fb89551fd442c54"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveRoleAssignment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeRoleAssignmentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeRoleAssignment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RoleAssignmentChangeSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"accessStatus"}},{"kind":"Field","name":{"kind":"Name","value":"suspensionReason"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}},{"kind":"Field","name":{"kind":"Name","value":"roleAssignmentHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"changedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"endedBookingCount"}},{"kind":"Field","name":{"kind":"Name","value":"removedWaitlistEntryCount"}},{"kind":"Field","name":{"kind":"Name","value":"refundedClassCreditCount"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionEnded"}},{"kind":"Field","name":{"kind":"Name","value":"sponsorshipEnded"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RoleAssignmentError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionIds"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveRoleAssignmentMutation, RemoveRoleAssignmentMutationVariables>;
export const SuspendUserDocument = {"__meta__":{"hash":"sha256:12e9d5e1e41f7f3e025e97ccf916abc88b988876b917f6e3f9345bc647d9cf44"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SuspendUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeUserAccessInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"suspendUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserAccessChangeSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"accessStatus"}},{"kind":"Field","name":{"kind":"Name","value":"suspensionReason"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}},{"kind":"Field","name":{"kind":"Name","value":"roleAssignmentHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"changedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"endedBookingCount"}},{"kind":"Field","name":{"kind":"Name","value":"removedWaitlistEntryCount"}},{"kind":"Field","name":{"kind":"Name","value":"refundedClassCreditCount"}},{"kind":"Field","name":{"kind":"Name","value":"teacherClassSessionIds"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserAccessError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<SuspendUserMutation, SuspendUserMutationVariables>;
export const ReactivateUserDocument = {"__meta__":{"hash":"sha256:ecb3d40594f45a7d5e80211e5e6b0abbf958ee6622bebe4b3f8ac0414be8d085"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReactivateUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReactivateUserInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reactivateUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserAccessChangeSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"accessStatus"}},{"kind":"Field","name":{"kind":"Name","value":"suspensionReason"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}},{"kind":"Field","name":{"kind":"Name","value":"roleAssignmentHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"changedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"endedBookingCount"}},{"kind":"Field","name":{"kind":"Name","value":"removedWaitlistEntryCount"}},{"kind":"Field","name":{"kind":"Name","value":"refundedClassCreditCount"}},{"kind":"Field","name":{"kind":"Name","value":"teacherClassSessionIds"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserAccessError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ReactivateUserMutation, ReactivateUserMutationVariables>;
export const AnonymizeUserDocument = {"__meta__":{"hash":"sha256:f6a6573c4a23396bb7c219ffe6a460c796da3508c96f705b464d8821a65a8bf8"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AnonymizeUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AnonymizeUserInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"anonymizeUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AnonymizeUserSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"accessStatus"}},{"kind":"Field","name":{"kind":"Name","value":"suspensionReason"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}},{"kind":"Field","name":{"kind":"Name","value":"roleAssignmentHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"changedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"redactedLearningFeedbackCount"}},{"kind":"Field","name":{"kind":"Name","value":"redactedSessionRatingCount"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AnonymizeUserError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionIds"}}]}}]}}]}}]} as unknown as DocumentNode<AnonymizeUserMutation, AnonymizeUserMutationVariables>;
export const StudentSponsorshipDocument = {"__meta__":{"hash":"sha256:1ae5b51bf3c7c13261e53b3c5ee39cb7837a46643e4fe6f298c5b004891076d1"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentSponsorship"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentSponsorship"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"acceptedAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextAnniversaryAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedByParty"}},{"kind":"Field","name":{"kind":"Name","value":"reportingFrom"}},{"kind":"Field","name":{"kind":"Name","value":"reportingUntil"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<StudentSponsorshipQuery, StudentSponsorshipQueryVariables>;
export const StudentSponsorshipInvitationsDocument = {"__meta__":{"hash":"sha256:5074c1e069b29735a89d0d9ace1d5302184f50e6a78ece2fbea54407069837ce"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentSponsorshipInvitations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentSponsorshipInvitations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"decidedAt"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"disclosure"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"benefitDescription"}},{"kind":"Field","name":{"kind":"Name","value":"organizationVisibleDataDescription"}},{"kind":"Field","name":{"kind":"Name","value":"excludedPrivateDataDescription"}}]}}]}}]}}]} as unknown as DocumentNode<StudentSponsorshipInvitationsQuery, StudentSponsorshipInvitationsQueryVariables>;
export const OrganizationSponsorshipInvitationsDocument = {"__meta__":{"hash":"sha256:9e52da1bf08fb6d1da6e7b9ab502af70902ec5bd93a0411b0452c405520668f8"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrganizationSponsorshipInvitations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organizationSponsorshipInvitations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"decidedAt"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"disclosure"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"benefitDescription"}},{"kind":"Field","name":{"kind":"Name","value":"organizationVisibleDataDescription"}},{"kind":"Field","name":{"kind":"Name","value":"excludedPrivateDataDescription"}}]}}]}}]}}]} as unknown as DocumentNode<OrganizationSponsorshipInvitationsQuery, OrganizationSponsorshipInvitationsQueryVariables>;
export const OrganizationSponsoredStudentsDocument = {"__meta__":{"hash":"sha256:29d7940e5feb00266c4983e4a61ffde33950aa2a29edc37e41c32e90e7b4cef7"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrganizationSponsoredStudents"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organizationSponsoredStudents"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"acceptedAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextAnniversaryAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedByParty"}},{"kind":"Field","name":{"kind":"Name","value":"reportingFrom"}},{"kind":"Field","name":{"kind":"Name","value":"reportingUntil"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"progressSnapshots"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"boundary"}},{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"courseTitle"}},{"kind":"Field","name":{"kind":"Name","value":"completedActiveLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"activeLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"percentage"}},{"kind":"Field","name":{"kind":"Name","value":"capturedAt"}}]}}]}}]}}]} as unknown as DocumentNode<OrganizationSponsoredStudentsQuery, OrganizationSponsoredStudentsQueryVariables>;
export const InviteToSponsorshipDocument = {"__meta__":{"hash":"sha256:27e13149ec9396de900a88da3e9bcfc3acd1df985b587725d61d9c849b55160f"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InviteToSponsorship"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"InviteToSponsorshipInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inviteToSponsorship"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InviteToSponsorshipSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"invitation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"decidedAt"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"disclosure"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"benefitDescription"}},{"kind":"Field","name":{"kind":"Name","value":"organizationVisibleDataDescription"}},{"kind":"Field","name":{"kind":"Name","value":"excludedPrivateDataDescription"}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SponsorshipInvitationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<InviteToSponsorshipMutation, InviteToSponsorshipMutationVariables>;
export const AcceptSponsorshipInvitationDocument = {"__meta__":{"hash":"sha256:823feb58e61bd1f205b2be5665b4cdafdac3a7720c77c0454eb346d77dcac92e"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AcceptSponsorshipInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SponsorshipInvitationResponseInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"acceptSponsorshipInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AcceptSponsorshipInvitationSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sponsorship"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"acceptedAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextAnniversaryAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedByParty"}},{"kind":"Field","name":{"kind":"Name","value":"reportingFrom"}},{"kind":"Field","name":{"kind":"Name","value":"reportingUntil"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"availableBalance"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SponsorshipInvitationResponseError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<AcceptSponsorshipInvitationMutation, AcceptSponsorshipInvitationMutationVariables>;
export const DeclineSponsorshipInvitationDocument = {"__meta__":{"hash":"sha256:bcfeed9bb3241b446e15df4b091fcff048f06600eb2f540ada7473518ef1548b"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeclineSponsorshipInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SponsorshipInvitationResponseInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"declineSponsorshipInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DeclineSponsorshipInvitationSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"invitation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"decidedAt"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"disclosure"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"benefitDescription"}},{"kind":"Field","name":{"kind":"Name","value":"organizationVisibleDataDescription"}},{"kind":"Field","name":{"kind":"Name","value":"excludedPrivateDataDescription"}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SponsorshipInvitationResponseError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<DeclineSponsorshipInvitationMutation, DeclineSponsorshipInvitationMutationVariables>;
export const StudentWorkspaceDocument = {"__meta__":{"hash":"sha256:314719417a8aa70108b6e2a54178ec540aa0cd2fda8fadd3fbdfe3053909df36"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentWorkspace"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentWorkspace"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"interfaceLocale"}},{"kind":"Field","name":{"kind":"Name","value":"displayTimeZone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"roles"}}]}}]}}]} as unknown as DocumentNode<StudentWorkspaceQuery, StudentWorkspaceQueryVariables>;
export const RoleWorkspaceDocument = {"__meta__":{"hash":"sha256:fde4df417fe77b924e7c7b9914ade40655ee3657a76d2ff5df96dba1e892445d"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RoleWorkspace"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"actingRole"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserRole"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"roleWorkspace"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"actingRole"},"value":{"kind":"Variable","name":{"kind":"Name","value":"actingRole"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"actingRole"}},{"kind":"Field","name":{"kind":"Name","value":"relationshipScope"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"interfaceLocale"}},{"kind":"Field","name":{"kind":"Name","value":"displayTimeZone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rolePlaces"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"place"}}]}}]}}]}}]} as unknown as DocumentNode<RoleWorkspaceQuery, RoleWorkspaceQueryVariables>;
export const RememberRoleWorkspacePlaceDocument = {"__meta__":{"hash":"sha256:cf804ad108824ab7d33c8ff8d58445f4e32538f3e4e69e6ebdd7e19048a28a27"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RememberRoleWorkspacePlace"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RememberRoleWorkspacePlaceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rememberRoleWorkspacePlace"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"place"}}]}}]}}]} as unknown as DocumentNode<RememberRoleWorkspacePlaceMutation, RememberRoleWorkspacePlaceMutationVariables>;
export const SaveUserPreferencesDocument = {"__meta__":{"hash":"sha256:7a1fb7779838cc83cb184ef6fb827a1333d43ae3b3a05e3796fc8cd199b0baa6"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveUserPreferences"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaveUserPreferencesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveUserPreferences"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"interfaceLocale"}},{"kind":"Field","name":{"kind":"Name","value":"displayTimeZone"}}]}}]}}]}}]} as unknown as DocumentNode<SaveUserPreferencesMutation, SaveUserPreferencesMutationVariables>;
export const StudentPlacementsDocument = {"__meta__":{"hash":"sha256:8639b039ae102220074abe144d5abf22dda23a0e013274302d37053e2442f07e"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentPlacements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentPlacements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}}]}}]}}]} as unknown as DocumentNode<StudentPlacementsQuery, StudentPlacementsQueryVariables>;
export const ClassSessionDiscoveryOptionsDocument = {"__meta__":{"hash":"sha256:3dfb2060e259387f9707ea11a48dc5611b74f6f87e38aab0edd5ffa7dcacf787"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ClassSessionDiscoveryOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classSessionDiscoveryOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetLanguages"}},{"kind":"Field","name":{"kind":"Name","value":"topics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}}]}},{"kind":"Field","name":{"kind":"Name","value":"teachers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}}]}}]} as unknown as DocumentNode<ClassSessionDiscoveryOptionsQuery, ClassSessionDiscoveryOptionsQueryVariables>;
export const DiscoverClassSessionsDocument = {"__meta__":{"hash":"sha256:ea9eb9de649e887a4c4e2cd69fa15a77c13a07867e14d649ae8c209b33708a24"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DiscoverClassSessions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ClassSessionDiscoveryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"discoverClassSessions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"appliedFilter"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"topicKeys"}},{"kind":"Field","name":{"kind":"Name","value":"localDate"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnit"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"objectives"}},{"kind":"Field","name":{"kind":"Name","value":"topics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"teacherProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"pronouns"}},{"kind":"Field","name":{"kind":"Name","value":"profileImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"professionalBiography"}},{"kind":"Field","name":{"kind":"Name","value":"taughtLanguages"}},{"kind":"Field","name":{"kind":"Name","value":"qualifiedCurriculumLevels"}},{"kind":"Field","name":{"kind":"Name","value":"teachingTopics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}}]}},{"kind":"Field","name":{"kind":"Name","value":"completedSessionCount"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endCursor"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}}]}}]} as unknown as DocumentNode<DiscoverClassSessionsQuery, DiscoverClassSessionsQueryVariables>;
export const SetStudentPlacementDocument = {"__meta__":{"hash":"sha256:3481a7bef11039407b7c2bff69be756029641f868adfd63e23da5345390c317d"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetStudentPlacement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetStudentPlacementInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setStudentPlacement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}}]}}]}}]} as unknown as DocumentNode<SetStudentPlacementMutation, SetStudentPlacementMutationVariables>;
export const StudentBookingsDocument = {"__meta__":{"hash":"sha256:2f3445e035809b86c925fa8340803d1b1effeb15cd06edd9d7e102563fb570f6"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentBookings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentBookings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Booking"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"classCreditRefunded"}},{"kind":"Field","name":{"kind":"Name","value":"bookedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}}]}}]} as unknown as DocumentNode<StudentBookingsQuery, StudentBookingsQueryVariables>;
export const BookClassSessionDocument = {"__meta__":{"hash":"sha256:563a019822535214ef94fb111d5ba60d525477671a7031e45e131d1ffb07ae56"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BookClassSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BookClassSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookClassSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BookClassSessionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"booking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"availableBalance"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BookingError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Booking"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"classCreditRefunded"}},{"kind":"Field","name":{"kind":"Name","value":"bookedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}}]}}]} as unknown as DocumentNode<BookClassSessionMutation, BookClassSessionMutationVariables>;
export const CancelBookingDocument = {"__meta__":{"hash":"sha256:4fa1f9114d98c1901bbd52da1da0650bc5cd13eda91466aad25c612ce04823d5"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelBooking"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CancelBookingInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelBooking"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CancelBookingSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"booking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"availableBalance"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BookingError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Booking"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"classCreditRefunded"}},{"kind":"Field","name":{"kind":"Name","value":"bookedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}}]}}]} as unknown as DocumentNode<CancelBookingMutation, CancelBookingMutationVariables>;
export const RescheduleBookingDocument = {"__meta__":{"hash":"sha256:a701e95abf50d2cfbe8e48fa58dc40bf36717d41ebd47980efe92b17747fd9d5"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RescheduleBooking"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RescheduleBookingInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rescheduleBooking"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RescheduleBookingSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"originalBooking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"replacementBooking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"availableBalance"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BookingError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Booking"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"classCreditRefunded"}},{"kind":"Field","name":{"kind":"Name","value":"bookedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}}]}}]} as unknown as DocumentNode<RescheduleBookingMutation, RescheduleBookingMutationVariables>;
export const StudentWaitlistEntriesDocument = {"__meta__":{"hash":"sha256:aee40985ff6df61356a6703f8ce4e84e39c78ecd96c40d7eef1546298984502c"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentWaitlistEntries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentWaitlistEntries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WaitlistEntryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Booking"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"classCreditRefunded"}},{"kind":"Field","name":{"kind":"Name","value":"bookedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WaitlistEntryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WaitlistEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"joinedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"resultingBooking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}}]}}]} as unknown as DocumentNode<StudentWaitlistEntriesQuery, StudentWaitlistEntriesQueryVariables>;
export const JoinWaitlistDocument = {"__meta__":{"hash":"sha256:1ad10f1754191382ee6064325d21e0c7ad80441849a2bb0036a4ba02c3d9f839"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"JoinWaitlist"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JoinWaitlistInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"joinWaitlist"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"JoinWaitlistSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WaitlistEntryFields"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WaitlistError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Booking"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"classCreditRefunded"}},{"kind":"Field","name":{"kind":"Name","value":"bookedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WaitlistEntryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WaitlistEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"joinedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"resultingBooking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}}]}}]} as unknown as DocumentNode<JoinWaitlistMutation, JoinWaitlistMutationVariables>;
export const WithdrawWaitlistDocument = {"__meta__":{"hash":"sha256:a6d031050311bf6943bc56182598c5898d89299ed3d9f234589461f6367c6fed"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"WithdrawWaitlist"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"WithdrawWaitlistInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"withdrawWaitlist"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WithdrawWaitlistSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WaitlistEntryFields"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WaitlistPromotionWon"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"booking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WaitlistError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Booking"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"classCreditRefunded"}},{"kind":"Field","name":{"kind":"Name","value":"bookedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WaitlistEntryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WaitlistEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"joinedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"resultingBooking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}}]}}]} as unknown as DocumentNode<WithdrawWaitlistMutation, WithdrawWaitlistMutationVariables>;
export const TeacherAttendanceSessionsDocument = {"__meta__":{"hash":"sha256:0b07db9e68c62cc2a37b5ddd4ffc92d4ed8384ed3d6da717f4fe82f33f05b870"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeacherAttendanceSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherAttendanceClassSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationReason"}}]}}]}}]} as unknown as DocumentNode<TeacherAttendanceSessionsQuery, TeacherAttendanceSessionsQueryVariables>;
export const ClassRosterDocument = {"__meta__":{"hash":"sha256:3d73df2fb11e033a4e0fc0d1a8200082e81670b483bfd6723bb8317802dade10"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ClassRoster"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"classSessionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classRoster"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"classSessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"classSessionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"actingRole"},"value":{"kind":"EnumValue","value":"TEACHER"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationReason"}}]}},{"kind":"Field","name":{"kind":"Name","value":"students"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"placement"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attendance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"correctedAt"}},{"kind":"Field","name":{"kind":"Name","value":"correctionCount"}}]}}]}}]}}]}}]} as unknown as DocumentNode<ClassRosterQuery, ClassRosterQueryVariables>;
export const RecordAttendanceDocument = {"__meta__":{"hash":"sha256:849f1e3be8d75697477fe701dd667a537f35396ac8596cc5bc3a8fd0665d8b1e"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RecordAttendance"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RecordAttendanceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"recordAttendance"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RecordAttendanceSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classRoster"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationReason"}}]}},{"kind":"Field","name":{"kind":"Name","value":"students"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"placement"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attendance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"correctedAt"}},{"kind":"Field","name":{"kind":"Name","value":"correctionCount"}}]}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AttendanceError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<RecordAttendanceMutation, RecordAttendanceMutationVariables>;
export const TeacherAvailabilityDocument = {"__meta__":{"hash":"sha256:3241bce8792293a3c4fc262e343865a92b9a83e4add48cabdb86d42a04727ad4"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeacherAvailability"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherAvailability"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"timeZone"}},{"kind":"Field","name":{"kind":"Name","value":"weeklyRanges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"weekday"}},{"kind":"Field","name":{"kind":"Name","value":"startLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"endLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"exceptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsAtLocal"}},{"kind":"Field","name":{"kind":"Name","value":"endsAtLocal"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}}]}}]}}]} as unknown as DocumentNode<TeacherAvailabilityQuery, TeacherAvailabilityQueryVariables>;
export const SaveTeacherAvailabilityRangeDocument = {"__meta__":{"hash":"sha256:55d9019a080a9016658c2fd239a1c67251b93fb64516eedecb933805f3a5646f"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveTeacherAvailabilityRange"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaveTeacherAvailabilityRangeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveTeacherAvailabilityRange"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SaveTeacherAvailabilityRangeSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"range"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"weekday"}},{"kind":"Field","name":{"kind":"Name","value":"startLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"endLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeacherAvailabilityValidationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<SaveTeacherAvailabilityRangeMutation, SaveTeacherAvailabilityRangeMutationVariables>;
export const AddAvailabilityExceptionDocument = {"__meta__":{"hash":"sha256:4f9e655dac6e8563a80da854775dfc07f0b97266e899e79e297186197486d0fe"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddAvailabilityException"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddAvailabilityExceptionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addAvailabilityException"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AddAvailabilityExceptionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exception"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsAtLocal"}},{"kind":"Field","name":{"kind":"Name","value":"endsAtLocal"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AvailabilityExceptionSessionConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionIds"}},{"kind":"Field","name":{"kind":"Name","value":"absenceRequestPath"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeacherAvailabilityValidationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<AddAvailabilityExceptionMutation, AddAvailabilityExceptionMutationVariables>;
export const EndTeacherAvailabilityRangeDocument = {"__meta__":{"hash":"sha256:00150f4ce4197aaa4051c5d215f942229eba99e5e33805c98f09df9a71bdbe73"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EndTeacherAvailabilityRange"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EndTeacherAvailabilityRangeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endTeacherAvailabilityRange"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EndTeacherAvailabilityRangeSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"range"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"weekday"}},{"kind":"Field","name":{"kind":"Name","value":"startLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"endLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeacherAvailabilityValidationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<EndTeacherAvailabilityRangeMutation, EndTeacherAvailabilityRangeMutationVariables>;
export const RemoveAvailabilityExceptionDocument = {"__meta__":{"hash":"sha256:40d1db51da42bd167f191e035ee762e875fa2e26134656fe805a74d20a2c921f"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveAvailabilityException"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RemoveAvailabilityExceptionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeAvailabilityException"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RemoveAvailabilityExceptionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exceptionId"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeacherAvailabilityValidationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveAvailabilityExceptionMutation, RemoveAvailabilityExceptionMutationVariables>;
export const TeacherScheduleDocument = {"__meta__":{"hash":"sha256:0b41c8e77e4f9e273162816e0fc26c58d4e4c94e3df93fd8af6d0cf40c309031"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeacherSchedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherClassSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationReason"}}]}},{"kind":"Field","name":{"kind":"Name","value":"teacherAbsenceRequests"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]}}]} as unknown as DocumentNode<TeacherScheduleQuery, TeacherScheduleQueryVariables>;
export const ReportAbsenceDocument = {"__meta__":{"hash":"sha256:dead0308a55ab228d8281c442ab897f464c9666aaa4e37d03902384313b82af6"},"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReportAbsence"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReportAbsenceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reportAbsence"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ReportAbsenceSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"absenceRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationReason"}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ClassSessionDisruptionError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ReportAbsenceMutation, ReportAbsenceMutationVariables>;