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
export const AdministrationClassSessionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdministrationClassSessions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"locale"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"InterfaceLocale"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"administrationCurriculum"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"locale"},"value":{"kind":"Variable","name":{"kind":"Name","value":"locale"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"teachers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"taughtLanguages"}},{"kind":"Field","name":{"kind":"Name","value":"qualifiedCurriculumLevels"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"administrationClassSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}}]}},{"kind":"Field","name":{"kind":"Name","value":"administrationAbsenceRequests"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationReason"}}]}}]}}]}}]} as unknown as DocumentNode<AdministrationClassSessionsQuery, AdministrationClassSessionsQueryVariables>;
export const SubstituteTeacherDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SubstituteTeacher"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SubstituteTeacherInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"substituteTeacher"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SubstituteTeacherSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationReason"}}]}},{"kind":"Field","name":{"kind":"Name","value":"absenceRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ClassSessionDisruptionError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<SubstituteTeacherMutation, SubstituteTeacherMutationVariables>;
export const CancelClassSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelClassSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CancelClassSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelClassSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CancelClassSessionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationReason"}}]}},{"kind":"Field","name":{"kind":"Name","value":"absenceRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"Field","name":{"kind":"Name","value":"refundedBookingCount"}},{"kind":"Field","name":{"kind":"Name","value":"removedWaitlistEntryCount"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ClassSessionDisruptionError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<CancelClassSessionMutation, CancelClassSessionMutationVariables>;
export const PublishClassSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PublishClassSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PublishClassSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publishClassSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PublishClassSessionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ClassSessionPublicationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"conflictCode"},"name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<PublishClassSessionMutation, PublishClassSessionMutationVariables>;
export const ChangeClassSessionSeatCapacityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangeClassSessionSeatCapacity"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeClassSessionSeatCapacityInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changeClassSessionSeatCapacity"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeClassSessionSeatCapacitySuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ClassSessionSeatCapacityError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"conflictCode"},"name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ChangeClassSessionSeatCapacityMutation, ChangeClassSessionSeatCapacityMutationVariables>;
export const AdministrationCurriculumDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdministrationCurriculum"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"locale"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"InterfaceLocale"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"administrationCurriculum"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"locale"},"value":{"kind":"Variable","name":{"kind":"Name","value":"locale"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"topics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"labelEn"}},{"kind":"Field","name":{"kind":"Name","value":"labelEs"}}]}},{"kind":"Field","name":{"kind":"Name","value":"courses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"objectives"}},{"kind":"Field","name":{"kind":"Name","value":"topics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}}]}},{"kind":"Field","name":{"kind":"Name","value":"materials"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"structuredContent"}},{"kind":"Field","name":{"kind":"Name","value":"httpsUrl"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"teachers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"pronouns"}},{"kind":"Field","name":{"kind":"Name","value":"profileImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"professionalBiography"}},{"kind":"Field","name":{"kind":"Name","value":"taughtLanguages"}},{"kind":"Field","name":{"kind":"Name","value":"qualifiedCurriculumLevels"}},{"kind":"Field","name":{"kind":"Name","value":"teachingTopics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}}]}},{"kind":"Field","name":{"kind":"Name","value":"completedSessionCount"}}]}}]}}]}}]} as unknown as DocumentNode<AdministrationCurriculumQuery, AdministrationCurriculumQueryVariables>;
export const CreateCourseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCourse"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCourseInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCourse"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCourseSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"course"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<CreateCourseMutation, CreateCourseMutationVariables>;
export const ReviseCourseDetailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReviseCourseDetails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateCourseInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reviseCourseDetails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateCourseSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"course"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ReviseCourseDetailsMutation, ReviseCourseDetailsMutationVariables>;
export const CreateLessonUnitDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateLessonUnit"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateLessonUnitInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createLessonUnit"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CreateLessonUnitSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lessonUnit"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<CreateLessonUnitMutation, CreateLessonUnitMutationVariables>;
export const ReviseLessonUnitIdentityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReviseLessonUnitIdentity"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateLessonUnitInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reviseLessonUnitIdentity"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateLessonUnitSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lessonUnit"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"objectives"}},{"kind":"Field","name":{"kind":"Name","value":"topics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InstructionalIdentityLocked"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ReviseLessonUnitIdentityMutation, ReviseLessonUnitIdentityMutationVariables>;
export const PlaceLessonUnitInCourseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PlaceLessonUnitInCourse"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReorderLessonUnitInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"placeLessonUnitInCourse"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ReorderLessonUnitSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lessonUnit"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<PlaceLessonUnitInCourseMutation, PlaceLessonUnitInCourseMutationVariables>;
export const RetireLessonUnitDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RetireLessonUnit"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RetireLessonUnitInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"retireLessonUnit"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RetireLessonUnitSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lessonUnit"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<RetireLessonUnitMutation, RetireLessonUnitMutationVariables>;
export const SaveLocalizedTopicDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveLocalizedTopic"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpsertTopicInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveLocalizedTopic"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"topic"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"labelEn"}},{"kind":"Field","name":{"kind":"Name","value":"labelEs"}}]}}]}}]}}]} as unknown as DocumentNode<SaveLocalizedTopicMutation, SaveLocalizedTopicMutationVariables>;
export const AddLessonMaterialDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddLessonMaterial"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddLessonMaterialInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addLessonMaterial"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AddLessonMaterialSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"material"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InvalidLessonMaterial"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<AddLessonMaterialMutation, AddLessonMaterialMutationVariables>;
export const ReviseLessonMaterialDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReviseLessonMaterial"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReviseLessonMaterialInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reviseLessonMaterial"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ReviseLessonMaterialSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"material"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"structuredContent"}},{"kind":"Field","name":{"kind":"Name","value":"httpsUrl"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InvalidLessonMaterial"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ReviseLessonMaterialMutation, ReviseLessonMaterialMutationVariables>;
export const SaveTeacherProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveTeacherProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaveTeacherProfileInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveTeacherProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"professionalBiography"}}]}}]}}]}}]} as unknown as DocumentNode<SaveTeacherProfileMutation, SaveTeacherProfileMutationVariables>;
export const GrantTeacherQualificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GrantTeacherQualification"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeTeacherQualificationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"grantTeacherQualification"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeTeacherQualificationSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"qualifiedCurriculumLevels"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<GrantTeacherQualificationMutation, GrantTeacherQualificationMutationVariables>;
export const RemoveTeacherQualificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveTeacherQualification"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeTeacherQualificationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeTeacherQualification"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeTeacherQualificationSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"qualifiedCurriculumLevels"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeacherQualificationRemovalBlocked"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionIds"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveTeacherQualificationMutation, RemoveTeacherQualificationMutationVariables>;
export const AdministratorTasksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdministratorTasks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"administratorTasks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"requiredRole"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"correlationReference"}},{"kind":"Field","name":{"kind":"Name","value":"safeContext"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"channel"}},{"kind":"Field","name":{"kind":"Name","value":"messageId"}},{"kind":"Field","name":{"kind":"Name","value":"recipientReference"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"suspendedUserId"}},{"kind":"Field","name":{"kind":"Name","value":"anonymizedUserId"}},{"kind":"Field","name":{"kind":"Name","value":"failureCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"resolvedAt"}}]}}]}}]} as unknown as DocumentNode<AdministratorTasksQuery, AdministratorTasksQueryVariables>;
export const ResolveAdministratorTaskDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResolveAdministratorTask"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ResolveAdministratorTaskInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resolveAdministratorTask"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ResolveAdministratorTaskSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"task"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"requiredRole"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"correlationReference"}},{"kind":"Field","name":{"kind":"Name","value":"safeContext"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"channel"}},{"kind":"Field","name":{"kind":"Name","value":"messageId"}},{"kind":"Field","name":{"kind":"Name","value":"recipientReference"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"suspendedUserId"}},{"kind":"Field","name":{"kind":"Name","value":"anonymizedUserId"}},{"kind":"Field","name":{"kind":"Name","value":"failureCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"resolvedAt"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AdministratorTaskError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ResolveAdministratorTaskMutation, ResolveAdministratorTaskMutationVariables>;
export const StudentAttendanceRecordsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentAttendanceRecords"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentAttendanceRecords"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionStartsAt"}},{"kind":"Field","name":{"kind":"Name","value":"teacherDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"correctedAt"}},{"kind":"Field","name":{"kind":"Name","value":"correctionCount"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDeadline"}},{"kind":"Field","name":{"kind":"Name","value":"reviewRequestOpen"}},{"kind":"Field","name":{"kind":"Name","value":"reviewRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"outcomeAtRequest"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveOutcome"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"decidedAt"}},{"kind":"Field","name":{"kind":"Name","value":"studentVisibleRationale"}}]}}]}}]}}]} as unknown as DocumentNode<StudentAttendanceRecordsQuery, StudentAttendanceRecordsQueryVariables>;
export const RequestAttendanceReviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RequestAttendanceReview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RequestAttendanceReviewInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"requestAttendanceReview"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RequestAttendanceReviewSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendanceReviewRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"outcomeAtRequest"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveOutcome"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"decidedAt"}},{"kind":"Field","name":{"kind":"Name","value":"studentVisibleRationale"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AttendanceReviewError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<RequestAttendanceReviewMutation, RequestAttendanceReviewMutationVariables>;
export const AdministrationAttendanceReviewRequestsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdministrationAttendanceReviewRequests"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"administrationAttendanceReviewRequests"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"outcomeAtRequest"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveOutcome"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"decidedAt"}},{"kind":"Field","name":{"kind":"Name","value":"studentVisibleRationale"}},{"kind":"Field","name":{"kind":"Name","value":"privateAdministratorNote"}}]}}]}}]} as unknown as DocumentNode<AdministrationAttendanceReviewRequestsQuery, AdministrationAttendanceReviewRequestsQueryVariables>;
export const DecideAttendanceReviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DecideAttendanceReview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DecideAttendanceReviewInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"decideAttendanceReview"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DecideAttendanceReviewSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendanceReviewRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveOutcome"}},{"kind":"Field","name":{"kind":"Name","value":"decidedAt"}},{"kind":"Field","name":{"kind":"Name","value":"studentVisibleRationale"}},{"kind":"Field","name":{"kind":"Name","value":"privateAdministratorNote"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AttendanceReviewError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<DecideAttendanceReviewMutation, DecideAttendanceReviewMutationVariables>;
export const AuditLogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AuditLog"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"AuditLogFilterInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"auditLog"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AuditLog"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"scope"}},{"kind":"Field","name":{"kind":"Name","value":"appliedFilter"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fromLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"toLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"actingRole"}},{"kind":"Field","name":{"kind":"Name","value":"operation"}},{"kind":"Field","name":{"kind":"Name","value":"actorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"correlationId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"occurredAt"}},{"kind":"Field","name":{"kind":"Name","value":"actorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"systemIdentity"}},{"kind":"Field","name":{"kind":"Name","value":"actingRole"}},{"kind":"Field","name":{"kind":"Name","value":"operation"}},{"kind":"Field","name":{"kind":"Name","value":"targetType"}},{"kind":"Field","name":{"kind":"Name","value":"targetId"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"reasonCode"}},{"kind":"Field","name":{"kind":"Name","value":"correlationId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endCursor"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AuditLogError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<AuditLogQuery, AuditLogQueryVariables>;
export const AuditLogExportDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AuditLogExport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"AuditLogFilterInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"auditLogExport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AuditLogExport"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"scope"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"exportedAt"}},{"kind":"Field","name":{"kind":"Name","value":"rowCount"}},{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"contentType"}},{"kind":"Field","name":{"kind":"Name","value":"csv"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AuditLogError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<AuditLogExportQuery, AuditLogExportQueryVariables>;
export const StudentClassCreditsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentClassCredits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentClassCredits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"availableBalance"}},{"kind":"Field","name":{"kind":"Name","value":"ledger"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"sourceReference"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<StudentClassCreditsQuery, StudentClassCreditsQueryVariables>;
export const AdministrationClassCreditsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdministrationClassCredits"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"studentUserId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"administrationClassCredits"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"studentUserId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"studentUserId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"availableBalance"}},{"kind":"Field","name":{"kind":"Name","value":"ledger"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"sourceReference"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<AdministrationClassCreditsQuery, AdministrationClassCreditsQueryVariables>;
export const AdjustClassCreditsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdjustClassCredits"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AdjustClassCreditsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adjustClassCredits"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AdjustClassCreditsSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"availableBalance"}},{"kind":"Field","name":{"kind":"Name","value":"ledger"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"sourceReference"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ClassCreditAdjustmentError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurriculumConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"conflictCode"},"name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<AdjustClassCreditsMutation, AdjustClassCreditsMutationVariables>;
export const StudentSubscriptionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentSubscription"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentSubscription"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"anchorDay"}},{"kind":"Field","name":{"kind":"Name","value":"accountingTimeUtc"}},{"kind":"Field","name":{"kind":"Name","value":"activatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextAnniversaryAt"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationEffectiveAt"}}]}}]}}]} as unknown as DocumentNode<StudentSubscriptionQuery, StudentSubscriptionQueryVariables>;
export const ScheduleSubscriptionCancellationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ScheduleSubscriptionCancellation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SubscriptionLifecycleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"scheduleSubscriptionCancellation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ScheduleSubscriptionCancellationSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subscription"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"anchorDay"}},{"kind":"Field","name":{"kind":"Name","value":"accountingTimeUtc"}},{"kind":"Field","name":{"kind":"Name","value":"activatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextAnniversaryAt"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationEffectiveAt"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SubscriptionConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ScheduleSubscriptionCancellationMutation, ScheduleSubscriptionCancellationMutationVariables>;
export const UndoSubscriptionCancellationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UndoSubscriptionCancellation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SubscriptionLifecycleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"undoSubscriptionCancellation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UndoSubscriptionCancellationSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subscription"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"anchorDay"}},{"kind":"Field","name":{"kind":"Name","value":"accountingTimeUtc"}},{"kind":"Field","name":{"kind":"Name","value":"activatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextAnniversaryAt"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationEffectiveAt"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SubscriptionConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<UndoSubscriptionCancellationMutation, UndoSubscriptionCancellationMutationVariables>;
export const OrganizationCohortsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrganizationCohorts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organizationCohorts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CohortDetails"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CohortDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Cohort"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"memberships"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"cohortId"}},{"kind":"Field","name":{"kind":"Name","value":"cohortName"}},{"kind":"Field","name":{"kind":"Name","value":"sponsorshipId"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}}]}}]}}]} as unknown as DocumentNode<OrganizationCohortsQuery, OrganizationCohortsQueryVariables>;
export const CreateCohortDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCohort"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCohortInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCohort"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CohortSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cohort"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CohortDetails"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CohortError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CohortDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Cohort"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"memberships"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"cohortId"}},{"kind":"Field","name":{"kind":"Name","value":"cohortName"}},{"kind":"Field","name":{"kind":"Name","value":"sponsorshipId"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}}]}}]}}]} as unknown as DocumentNode<CreateCohortMutation, CreateCohortMutationVariables>;
export const AddCohortMembershipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddCohortMembership"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddCohortMembershipInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addCohortMembership"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CohortMembershipSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cohort"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CohortDetails"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CohortError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CohortDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Cohort"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"memberships"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"cohortId"}},{"kind":"Field","name":{"kind":"Name","value":"cohortName"}},{"kind":"Field","name":{"kind":"Name","value":"sponsorshipId"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}}]}}]}}]} as unknown as DocumentNode<AddCohortMembershipMutation, AddCohortMembershipMutationVariables>;
export const EndCohortMembershipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EndCohortMembership"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EndCohortMembershipInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endCohortMembership"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CohortMembershipSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cohort"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CohortDetails"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CohortError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CohortDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Cohort"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"memberships"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"cohortId"}},{"kind":"Field","name":{"kind":"Name","value":"cohortName"}},{"kind":"Field","name":{"kind":"Name","value":"sponsorshipId"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"attributedActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}}]}}]}}]}}]} as unknown as DocumentNode<EndCohortMembershipMutation, EndCohortMembershipMutationVariables>;
export const EndSponsorshipAsOrganizationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EndSponsorshipAsOrganization"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EndSponsorshipAsOrganizationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endSponsorshipAsOrganization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EndSponsorshipAsOrganizationSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sponsorship"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"acceptedAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextAnniversaryAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedByParty"}},{"kind":"Field","name":{"kind":"Name","value":"reportingFrom"}},{"kind":"Field","name":{"kind":"Name","value":"reportingUntil"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"progressSnapshots"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"boundary"}},{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"courseTitle"}},{"kind":"Field","name":{"kind":"Name","value":"completedActiveLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"activeLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"percentage"}},{"kind":"Field","name":{"kind":"Name","value":"capturedAt"}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SponsorshipBoundaryError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<EndSponsorshipAsOrganizationMutation, EndSponsorshipAsOrganizationMutationVariables>;
export const EndSponsorshipAsStudentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EndSponsorshipAsStudent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EndSponsorshipAsStudentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endSponsorshipAsStudent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EndSponsorshipAsStudentSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sponsorship"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"acceptedAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextAnniversaryAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedByParty"}},{"kind":"Field","name":{"kind":"Name","value":"reportingFrom"}},{"kind":"Field","name":{"kind":"Name","value":"reportingUntil"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"availableBalance"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SponsorshipBoundaryError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<EndSponsorshipAsStudentMutation, EndSponsorshipAsStudentMutationVariables>;
export const StudentCourseProgressDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentCourseProgress"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentCourseProgress"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}},{"kind":"Field","name":{"kind":"Name","value":"activeLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"completedActiveLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"percentage"}},{"kind":"Field","name":{"kind":"Name","value":"learningHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"earnedAt"}},{"kind":"Field","name":{"kind":"Name","value":"countsTowardProgress"}}]}}]}}]}}]} as unknown as DocumentNode<StudentCourseProgressQuery, StudentCourseProgressQueryVariables>;
export const TeacherFeedbackWorkDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeacherFeedbackWork"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherFeedbackWork"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackDeadline"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"learningFeedback"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"observedStrengths"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedFocuses"}},{"kind":"Field","name":{"kind":"Name","value":"observations"}},{"kind":"Field","name":{"kind":"Name","value":"nextPractice"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<TeacherFeedbackWorkQuery, TeacherFeedbackWorkQueryVariables>;
export const SaveLearningFeedbackDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveLearningFeedback"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaveLearningFeedbackInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveLearningFeedback"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SaveLearningFeedbackSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"feedback"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"observedStrengths"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedFocuses"}},{"kind":"Field","name":{"kind":"Name","value":"observations"}},{"kind":"Field","name":{"kind":"Name","value":"nextPractice"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LearningFeedbackError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<SaveLearningFeedbackMutation, SaveLearningFeedbackMutationVariables>;
export const StudentFeedbackAndRatingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentFeedbackAndRatings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentFeedbackAndRatings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionEndsAt"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackDeadline"}},{"kind":"Field","name":{"kind":"Name","value":"ratingDeadline"}},{"kind":"Field","name":{"kind":"Name","value":"teacherDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"learningFeedback"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"observedStrengths"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedFocuses"}},{"kind":"Field","name":{"kind":"Name","value":"observations"}},{"kind":"Field","name":{"kind":"Name","value":"nextPractice"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sessionRating"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"overallRating"}},{"kind":"Field","name":{"kind":"Name","value":"positiveTags"}},{"kind":"Field","name":{"kind":"Name","value":"improvementTags"}},{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<StudentFeedbackAndRatingsQuery, StudentFeedbackAndRatingsQueryVariables>;
export const SaveSessionRatingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveSessionRating"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaveSessionRatingInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveSessionRating"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SaveSessionRatingSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rating"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"overallRating"}},{"kind":"Field","name":{"kind":"Name","value":"positiveTags"}},{"kind":"Field","name":{"kind":"Name","value":"improvementTags"}},{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SessionRatingError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<SaveSessionRatingMutation, SaveSessionRatingMutationVariables>;
export const AdministratorFeedbackAndRatingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdministratorFeedbackAndRatings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"administratorFeedbackAndRatings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"teacherDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"learningFeedback"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"observedStrengths"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedFocuses"}},{"kind":"Field","name":{"kind":"Name","value":"observations"}},{"kind":"Field","name":{"kind":"Name","value":"nextPractice"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sessionRating"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"overallRating"}},{"kind":"Field","name":{"kind":"Name","value":"positiveTags"}},{"kind":"Field","name":{"kind":"Name","value":"improvementTags"}},{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<AdministratorFeedbackAndRatingsQuery, AdministratorFeedbackAndRatingsQueryVariables>;
export const RedactLearningFeedbackDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RedactLearningFeedback"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RedactLearningFeedbackInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"redactLearningFeedback"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RedactLearningFeedbackSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"feedback"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LearningFeedbackError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<RedactLearningFeedbackMutation, RedactLearningFeedbackMutationVariables>;
export const RedactSessionRatingCommentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RedactSessionRatingComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RedactSessionRatingCommentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"redactSessionRatingComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RedactSessionRatingCommentSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rating"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"redactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"redactionReason"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SessionRatingError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<RedactSessionRatingCommentMutation, RedactSessionRatingCommentMutationVariables>;
export const LearningAccessClassSessionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LearningAccessClassSessions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"actingRole"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserRole"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"learningAccessLessonUnits"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"actingRole"},"value":{"kind":"Variable","name":{"kind":"Name","value":"actingRole"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}},{"kind":"Field","name":{"kind":"Name","value":"learningAccessClassSessions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"actingRole"},"value":{"kind":"Variable","name":{"kind":"Name","value":"actingRole"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}}]}}]}}]} as unknown as DocumentNode<LearningAccessClassSessionsQuery, LearningAccessClassSessionsQueryVariables>;
export const LessonMaterialsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LessonMaterials"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"lessonUnitId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"actingRole"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserRole"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lessonMaterials"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"lessonUnitId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"lessonUnitId"}}},{"kind":"Argument","name":{"kind":"Name","value":"actingRole"},"value":{"kind":"Variable","name":{"kind":"Name","value":"actingRole"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"structuredContent"}},{"kind":"Field","name":{"kind":"Name","value":"httpsUrl"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"}}]}}]}}]} as unknown as DocumentNode<LessonMaterialsQuery, LessonMaterialsQueryVariables>;
export const EnterClassroomDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EnterClassroom"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EnterClassroomInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"enterClassroom"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EnterClassroomSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classroom"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"simulationStatus"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ClassroomAccessError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<EnterClassroomMutation, EnterClassroomMutationVariables>;
export const MarketplaceOperationalReportDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketplaceOperationalReport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarketplaceOperationalReportInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"marketplaceOperationalReport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"range"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fromLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"toLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attendance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}},{"kind":"Field","name":{"kind":"Name","value":"recordedCount"}},{"kind":"Field","name":{"kind":"Name","value":"attendanceRatePercentage"}},{"kind":"Field","name":{"kind":"Name","value":"excludedUnrecordedCount"}},{"kind":"Field","name":{"kind":"Name","value":"correctedCount"}},{"kind":"Field","name":{"kind":"Name","value":"exceptionCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cancellations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentCancellationCount"}},{"kind":"Field","name":{"kind":"Name","value":"timelyCount"}},{"kind":"Field","name":{"kind":"Name","value":"lateCount"}},{"kind":"Field","name":{"kind":"Name","value":"studentCancellationRatePercentage"}},{"kind":"Field","name":{"kind":"Name","value":"excludedClassSessionCancellationCount"}},{"kind":"Field","name":{"kind":"Name","value":"excludedRescheduleCount"}},{"kind":"Field","name":{"kind":"Name","value":"dailyRates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"localDate"}},{"kind":"Field","name":{"kind":"Name","value":"studentCancellationCount"}},{"kind":"Field","name":{"kind":"Name","value":"timelyCount"}},{"kind":"Field","name":{"kind":"Name","value":"lateCount"}},{"kind":"Field","name":{"kind":"Name","value":"recordedOutcomeCount"}},{"kind":"Field","name":{"kind":"Name","value":"excludedUnrecordedCount"}},{"kind":"Field","name":{"kind":"Name","value":"studentCancellationRatePercentage"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"corrections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"correctedAttendanceCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastCorrectedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pendingAttendanceReviewCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"credits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"creditAdjustmentCount"}},{"kind":"Field","name":{"kind":"Name","value":"grantedCreditCount"}},{"kind":"Field","name":{"kind":"Name","value":"refundedCreditCount"}},{"kind":"Field","name":{"kind":"Name","value":"deductedCreditCount"}},{"kind":"Field","name":{"kind":"Name","value":"netCreditChange"}},{"kind":"Field","name":{"kind":"Name","value":"bySource"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"entryCount"}},{"kind":"Field","name":{"kind":"Name","value":"netAmount"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"courseProgress"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"courseTitle"}},{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}},{"kind":"Field","name":{"kind":"Name","value":"activeLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"completedActiveLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"studentsWithProgressCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actionableExceptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionId"}},{"kind":"Field","name":{"kind":"Name","value":"occurredAt"}},{"kind":"Field","name":{"kind":"Name","value":"courseTitle"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitTitle"}},{"kind":"Field","name":{"kind":"Name","value":"teacherDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"affectedBookingCount"}}]}}]}}]}}]}}]} as unknown as DocumentNode<MarketplaceOperationalReportQuery, MarketplaceOperationalReportQueryVariables>;
export const NotificationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Notifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"messageId"}},{"kind":"Field","name":{"kind":"Name","value":"renderedContent"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"archivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<NotificationsQuery, NotificationsQueryVariables>;
export const MarkNotificationReadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkNotificationRead"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markNotificationRead"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"messageId"}},{"kind":"Field","name":{"kind":"Name","value":"renderedContent"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"archivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<MarkNotificationReadMutation, MarkNotificationReadMutationVariables>;
export const ArchiveNotificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ArchiveNotification"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"archiveNotification"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"archivedAt"}}]}}]}}]} as unknown as DocumentNode<ArchiveNotificationMutation, ArchiveNotificationMutationVariables>;
export const OrganizationAttendanceAndProgressReportDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrganizationAttendanceAndProgressReport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cohortId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organizationAttendanceAndProgressReport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cohortId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cohortId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"generatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"attendance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OrganizationAttendanceSummaryDetails"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cohorts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cohortId"}},{"kind":"Field","name":{"kind":"Name","value":"cohortName"}},{"kind":"Field","name":{"kind":"Name","value":"sponsoredStudentCount"}},{"kind":"Field","name":{"kind":"Name","value":"attendance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OrganizationAttendanceSummaryDetails"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"students"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sponsorshipId"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"reportingFrom"}},{"kind":"Field","name":{"kind":"Name","value":"reportingUntil"}},{"kind":"Field","name":{"kind":"Name","value":"cohortNames"}},{"kind":"Field","name":{"kind":"Name","value":"attendance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OrganizationAttendanceSummaryDetails"}}]}},{"kind":"Field","name":{"kind":"Name","value":"courseProgress"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"courseTitle"}},{"kind":"Field","name":{"kind":"Name","value":"baseline"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"completedActiveLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"activeLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"percentage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baselineCapturedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endingSnapshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"completedActiveLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"activeLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"percentage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endingSnapshotCapturedAt"}},{"kind":"Field","name":{"kind":"Name","value":"currentEffective"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"completedActiveLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"activeLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"percentage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"completedLessonUnitGain"}},{"kind":"Field","name":{"kind":"Name","value":"percentagePointGain"}},{"kind":"Field","name":{"kind":"Name","value":"snapshotRevisionCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastRevisedAt"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OrganizationAttendanceSummaryDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrganizationAttendanceSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendedCount"}},{"kind":"Field","name":{"kind":"Name","value":"noShowCount"}},{"kind":"Field","name":{"kind":"Name","value":"recordedCount"}},{"kind":"Field","name":{"kind":"Name","value":"attendanceRatePercentage"}},{"kind":"Field","name":{"kind":"Name","value":"excludedUnrecordedCount"}},{"kind":"Field","name":{"kind":"Name","value":"correctedCount"}},{"kind":"Field","name":{"kind":"Name","value":"exceptionCount"}}]}}]} as unknown as DocumentNode<OrganizationAttendanceAndProgressReportQuery, OrganizationAttendanceAndProgressReportQueryVariables>;
export const ReportExportsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ReportExports"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reportExports"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReportExportDetails"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReportExportDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ReportExport"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"periodStartLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"periodEndExclusiveLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"dataAsOf"}},{"kind":"Field","name":{"kind":"Name","value":"rowCount"}},{"kind":"Field","name":{"kind":"Name","value":"contentDigest"}},{"kind":"Field","name":{"kind":"Name","value":"failureReasonCode"}},{"kind":"Field","name":{"kind":"Name","value":"downloadable"}}]}}]} as unknown as DocumentNode<ReportExportsQuery, ReportExportsQueryVariables>;
export const ReportExportArtifactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ReportExportArtifact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reportExportArtifact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"contentType"}},{"kind":"Field","name":{"kind":"Name","value":"csv"}},{"kind":"Field","name":{"kind":"Name","value":"reportExport"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReportExportDetails"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReportExportDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ReportExport"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"periodStartLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"periodEndExclusiveLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"dataAsOf"}},{"kind":"Field","name":{"kind":"Name","value":"rowCount"}},{"kind":"Field","name":{"kind":"Name","value":"contentDigest"}},{"kind":"Field","name":{"kind":"Name","value":"failureReasonCode"}},{"kind":"Field","name":{"kind":"Name","value":"downloadable"}}]}}]} as unknown as DocumentNode<ReportExportArtifactQuery, ReportExportArtifactQueryVariables>;
export const RequestReportExportDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RequestReportExport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RequestReportExportInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"requestReportExport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RequestReportExportSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reportExport"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReportExportDetails"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ReportExportError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReportExportDetails"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ReportExport"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"periodStartLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"periodEndExclusiveLocalDate"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"dataAsOf"}},{"kind":"Field","name":{"kind":"Name","value":"rowCount"}},{"kind":"Field","name":{"kind":"Name","value":"contentDigest"}},{"kind":"Field","name":{"kind":"Name","value":"failureReasonCode"}},{"kind":"Field","name":{"kind":"Name","value":"downloadable"}}]}}]} as unknown as DocumentNode<RequestReportExportMutation, RequestReportExportMutationVariables>;
export const RoleAssignmentAdministrationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RoleAssignmentAdministration"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"roleAssignmentAdministration"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"users"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"accessStatus"}},{"kind":"Field","name":{"kind":"Name","value":"suspensionReason"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}},{"kind":"Field","name":{"kind":"Name","value":"roleAssignmentHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"changedAt"}}]}}]}}]}}]}}]} as unknown as DocumentNode<RoleAssignmentAdministrationQuery, RoleAssignmentAdministrationQueryVariables>;
export const GrantRoleAssignmentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GrantRoleAssignment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeRoleAssignmentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"grantRoleAssignment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RoleAssignmentChangeSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"accessStatus"}},{"kind":"Field","name":{"kind":"Name","value":"suspensionReason"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}},{"kind":"Field","name":{"kind":"Name","value":"roleAssignmentHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"changedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"endedBookingCount"}},{"kind":"Field","name":{"kind":"Name","value":"removedWaitlistEntryCount"}},{"kind":"Field","name":{"kind":"Name","value":"refundedClassCreditCount"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionEnded"}},{"kind":"Field","name":{"kind":"Name","value":"sponsorshipEnded"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RoleAssignmentError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionIds"}}]}}]}}]}}]} as unknown as DocumentNode<GrantRoleAssignmentMutation, GrantRoleAssignmentMutationVariables>;
export const RemoveRoleAssignmentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveRoleAssignment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeRoleAssignmentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeRoleAssignment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RoleAssignmentChangeSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"accessStatus"}},{"kind":"Field","name":{"kind":"Name","value":"suspensionReason"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}},{"kind":"Field","name":{"kind":"Name","value":"roleAssignmentHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"changedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"endedBookingCount"}},{"kind":"Field","name":{"kind":"Name","value":"removedWaitlistEntryCount"}},{"kind":"Field","name":{"kind":"Name","value":"refundedClassCreditCount"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionEnded"}},{"kind":"Field","name":{"kind":"Name","value":"sponsorshipEnded"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RoleAssignmentError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionIds"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveRoleAssignmentMutation, RemoveRoleAssignmentMutationVariables>;
export const SuspendUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SuspendUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeUserAccessInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"suspendUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserAccessChangeSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"accessStatus"}},{"kind":"Field","name":{"kind":"Name","value":"suspensionReason"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}},{"kind":"Field","name":{"kind":"Name","value":"roleAssignmentHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"changedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"endedBookingCount"}},{"kind":"Field","name":{"kind":"Name","value":"removedWaitlistEntryCount"}},{"kind":"Field","name":{"kind":"Name","value":"refundedClassCreditCount"}},{"kind":"Field","name":{"kind":"Name","value":"teacherClassSessionIds"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserAccessError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<SuspendUserMutation, SuspendUserMutationVariables>;
export const ReactivateUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReactivateUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReactivateUserInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reactivateUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserAccessChangeSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"accessStatus"}},{"kind":"Field","name":{"kind":"Name","value":"suspensionReason"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}},{"kind":"Field","name":{"kind":"Name","value":"roleAssignmentHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"changedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"endedBookingCount"}},{"kind":"Field","name":{"kind":"Name","value":"removedWaitlistEntryCount"}},{"kind":"Field","name":{"kind":"Name","value":"refundedClassCreditCount"}},{"kind":"Field","name":{"kind":"Name","value":"teacherClassSessionIds"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UserAccessError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ReactivateUserMutation, ReactivateUserMutationVariables>;
export const AnonymizeUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AnonymizeUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AnonymizeUserInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"anonymizeUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AnonymizeUserSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"accessStatus"}},{"kind":"Field","name":{"kind":"Name","value":"suspensionReason"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}},{"kind":"Field","name":{"kind":"Name","value":"roleAssignmentHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"changedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"redactedLearningFeedbackCount"}},{"kind":"Field","name":{"kind":"Name","value":"redactedSessionRatingCount"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AnonymizeUserError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionIds"}}]}}]}}]}}]} as unknown as DocumentNode<AnonymizeUserMutation, AnonymizeUserMutationVariables>;
export const StudentSponsorshipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentSponsorship"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentSponsorship"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"acceptedAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextAnniversaryAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedByParty"}},{"kind":"Field","name":{"kind":"Name","value":"reportingFrom"}},{"kind":"Field","name":{"kind":"Name","value":"reportingUntil"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<StudentSponsorshipQuery, StudentSponsorshipQueryVariables>;
export const StudentSponsorshipInvitationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentSponsorshipInvitations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentSponsorshipInvitations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"decidedAt"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"disclosure"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"benefitDescription"}},{"kind":"Field","name":{"kind":"Name","value":"organizationVisibleDataDescription"}},{"kind":"Field","name":{"kind":"Name","value":"excludedPrivateDataDescription"}}]}}]}}]}}]} as unknown as DocumentNode<StudentSponsorshipInvitationsQuery, StudentSponsorshipInvitationsQueryVariables>;
export const OrganizationSponsorshipInvitationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrganizationSponsorshipInvitations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organizationSponsorshipInvitations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"decidedAt"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"disclosure"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"benefitDescription"}},{"kind":"Field","name":{"kind":"Name","value":"organizationVisibleDataDescription"}},{"kind":"Field","name":{"kind":"Name","value":"excludedPrivateDataDescription"}}]}}]}}]}}]} as unknown as DocumentNode<OrganizationSponsorshipInvitationsQuery, OrganizationSponsorshipInvitationsQueryVariables>;
export const OrganizationSponsoredStudentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrganizationSponsoredStudents"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organizationSponsoredStudents"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"acceptedAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextAnniversaryAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedByParty"}},{"kind":"Field","name":{"kind":"Name","value":"reportingFrom"}},{"kind":"Field","name":{"kind":"Name","value":"reportingUntil"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"progressSnapshots"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"boundary"}},{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"courseTitle"}},{"kind":"Field","name":{"kind":"Name","value":"completedActiveLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"activeLessonUnitCount"}},{"kind":"Field","name":{"kind":"Name","value":"percentage"}},{"kind":"Field","name":{"kind":"Name","value":"capturedAt"}}]}}]}}]}}]} as unknown as DocumentNode<OrganizationSponsoredStudentsQuery, OrganizationSponsoredStudentsQueryVariables>;
export const InviteToSponsorshipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InviteToSponsorship"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"InviteToSponsorshipInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inviteToSponsorship"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InviteToSponsorshipSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"invitation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"decidedAt"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"disclosure"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"benefitDescription"}},{"kind":"Field","name":{"kind":"Name","value":"organizationVisibleDataDescription"}},{"kind":"Field","name":{"kind":"Name","value":"excludedPrivateDataDescription"}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SponsorshipInvitationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<InviteToSponsorshipMutation, InviteToSponsorshipMutationVariables>;
export const AcceptSponsorshipInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AcceptSponsorshipInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SponsorshipInvitationResponseInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"acceptSponsorshipInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AcceptSponsorshipInvitationSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sponsorship"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"acceptedAt"}},{"kind":"Field","name":{"kind":"Name","value":"nextAnniversaryAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedByParty"}},{"kind":"Field","name":{"kind":"Name","value":"reportingFrom"}},{"kind":"Field","name":{"kind":"Name","value":"reportingUntil"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"availableBalance"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SponsorshipInvitationResponseError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<AcceptSponsorshipInvitationMutation, AcceptSponsorshipInvitationMutationVariables>;
export const DeclineSponsorshipInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeclineSponsorshipInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SponsorshipInvitationResponseInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"declineSponsorshipInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DeclineSponsorshipInvitationSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"invitation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"studentDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"decidedAt"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"disclosure"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"benefitDescription"}},{"kind":"Field","name":{"kind":"Name","value":"organizationVisibleDataDescription"}},{"kind":"Field","name":{"kind":"Name","value":"excludedPrivateDataDescription"}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SponsorshipInvitationResponseError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<DeclineSponsorshipInvitationMutation, DeclineSponsorshipInvitationMutationVariables>;
export const StudentWorkspaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentWorkspace"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentWorkspace"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"interfaceLocale"}},{"kind":"Field","name":{"kind":"Name","value":"displayTimeZone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"roles"}}]}}]}}]} as unknown as DocumentNode<StudentWorkspaceQuery, StudentWorkspaceQueryVariables>;
export const RoleWorkspaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RoleWorkspace"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"actingRole"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserRole"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"roleWorkspace"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"actingRole"},"value":{"kind":"Variable","name":{"kind":"Name","value":"actingRole"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"actingRole"}},{"kind":"Field","name":{"kind":"Name","value":"relationshipScope"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"interfaceLocale"}},{"kind":"Field","name":{"kind":"Name","value":"displayTimeZone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rolePlaces"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"place"}}]}}]}}]}}]} as unknown as DocumentNode<RoleWorkspaceQuery, RoleWorkspaceQueryVariables>;
export const RememberRoleWorkspacePlaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RememberRoleWorkspacePlace"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RememberRoleWorkspacePlaceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rememberRoleWorkspacePlace"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"place"}}]}}]}}]} as unknown as DocumentNode<RememberRoleWorkspacePlaceMutation, RememberRoleWorkspacePlaceMutationVariables>;
export const SaveUserPreferencesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveUserPreferences"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaveUserPreferencesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveUserPreferences"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"interfaceLocale"}},{"kind":"Field","name":{"kind":"Name","value":"displayTimeZone"}}]}}]}}]}}]} as unknown as DocumentNode<SaveUserPreferencesMutation, SaveUserPreferencesMutationVariables>;
export const StudentPlacementsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentPlacements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentPlacements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}}]}}]}}]} as unknown as DocumentNode<StudentPlacementsQuery, StudentPlacementsQueryVariables>;
export const ClassSessionDiscoveryOptionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ClassSessionDiscoveryOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classSessionDiscoveryOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetLanguages"}},{"kind":"Field","name":{"kind":"Name","value":"topics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}}]}},{"kind":"Field","name":{"kind":"Name","value":"teachers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}}]}}]} as unknown as DocumentNode<ClassSessionDiscoveryOptionsQuery, ClassSessionDiscoveryOptionsQueryVariables>;
export const DiscoverClassSessionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DiscoverClassSessions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ClassSessionDiscoveryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"discoverClassSessions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"appliedFilter"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"topicKeys"}},{"kind":"Field","name":{"kind":"Name","value":"localDate"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnit"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"objectives"}},{"kind":"Field","name":{"kind":"Name","value":"topics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"teacherProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"pronouns"}},{"kind":"Field","name":{"kind":"Name","value":"profileImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"professionalBiography"}},{"kind":"Field","name":{"kind":"Name","value":"taughtLanguages"}},{"kind":"Field","name":{"kind":"Name","value":"qualifiedCurriculumLevels"}},{"kind":"Field","name":{"kind":"Name","value":"teachingTopics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}}]}},{"kind":"Field","name":{"kind":"Name","value":"completedSessionCount"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endCursor"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}}]}}]} as unknown as DocumentNode<DiscoverClassSessionsQuery, DiscoverClassSessionsQueryVariables>;
export const SetStudentPlacementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetStudentPlacement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetStudentPlacementInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setStudentPlacement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}}]}}]}}]} as unknown as DocumentNode<SetStudentPlacementMutation, SetStudentPlacementMutationVariables>;
export const StudentBookingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentBookings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentBookings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Booking"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"classCreditRefunded"}},{"kind":"Field","name":{"kind":"Name","value":"bookedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}}]}}]} as unknown as DocumentNode<StudentBookingsQuery, StudentBookingsQueryVariables>;
export const BookClassSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BookClassSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BookClassSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookClassSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BookClassSessionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"booking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"availableBalance"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BookingError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Booking"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"classCreditRefunded"}},{"kind":"Field","name":{"kind":"Name","value":"bookedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}}]}}]} as unknown as DocumentNode<BookClassSessionMutation, BookClassSessionMutationVariables>;
export const CancelBookingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelBooking"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CancelBookingInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelBooking"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CancelBookingSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"booking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"availableBalance"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BookingError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Booking"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"classCreditRefunded"}},{"kind":"Field","name":{"kind":"Name","value":"bookedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}}]}}]} as unknown as DocumentNode<CancelBookingMutation, CancelBookingMutationVariables>;
export const RescheduleBookingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RescheduleBooking"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RescheduleBookingInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rescheduleBooking"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RescheduleBookingSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"originalBooking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"replacementBooking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"availableBalance"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BookingError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Booking"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"classCreditRefunded"}},{"kind":"Field","name":{"kind":"Name","value":"bookedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}}]}}]} as unknown as DocumentNode<RescheduleBookingMutation, RescheduleBookingMutationVariables>;
export const StudentWaitlistEntriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentWaitlistEntries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentWaitlistEntries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WaitlistEntryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Booking"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"classCreditRefunded"}},{"kind":"Field","name":{"kind":"Name","value":"bookedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WaitlistEntryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WaitlistEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"joinedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"resultingBooking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}}]}}]} as unknown as DocumentNode<StudentWaitlistEntriesQuery, StudentWaitlistEntriesQueryVariables>;
export const JoinWaitlistDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"JoinWaitlist"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JoinWaitlistInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"joinWaitlist"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"JoinWaitlistSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WaitlistEntryFields"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WaitlistError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Booking"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"classCreditRefunded"}},{"kind":"Field","name":{"kind":"Name","value":"bookedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WaitlistEntryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WaitlistEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"joinedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"resultingBooking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}}]}}]} as unknown as DocumentNode<JoinWaitlistMutation, JoinWaitlistMutationVariables>;
export const WithdrawWaitlistDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"WithdrawWaitlist"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"WithdrawWaitlistInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"withdrawWaitlist"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WithdrawWaitlistSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WaitlistEntryFields"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WaitlistPromotionWon"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"booking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WaitlistError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Booking"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"classCreditRefunded"}},{"kind":"Field","name":{"kind":"Name","value":"bookedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WaitlistEntryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WaitlistEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"terminalReason"}},{"kind":"Field","name":{"kind":"Name","value":"joinedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"resultingBooking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookingFields"}}]}}]}}]} as unknown as DocumentNode<WithdrawWaitlistMutation, WithdrawWaitlistMutationVariables>;
export const TeacherAttendanceSessionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeacherAttendanceSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherAttendanceClassSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationReason"}}]}}]}}]} as unknown as DocumentNode<TeacherAttendanceSessionsQuery, TeacherAttendanceSessionsQueryVariables>;
export const ClassRosterDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ClassRoster"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"classSessionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classRoster"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"classSessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"classSessionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"actingRole"},"value":{"kind":"EnumValue","value":"TEACHER"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationReason"}}]}},{"kind":"Field","name":{"kind":"Name","value":"students"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"placement"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attendance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"correctedAt"}},{"kind":"Field","name":{"kind":"Name","value":"correctionCount"}}]}}]}}]}}]}}]} as unknown as DocumentNode<ClassRosterQuery, ClassRosterQueryVariables>;
export const RecordAttendanceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RecordAttendance"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RecordAttendanceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"recordAttendance"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RecordAttendanceSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classRoster"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationReason"}}]}},{"kind":"Field","name":{"kind":"Name","value":"students"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookingId"}},{"kind":"Field","name":{"kind":"Name","value":"studentUserId"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"placement"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"curriculumLevel"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attendance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"correctedAt"}},{"kind":"Field","name":{"kind":"Name","value":"correctionCount"}}]}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AttendanceError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<RecordAttendanceMutation, RecordAttendanceMutationVariables>;
export const TeacherAvailabilityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeacherAvailability"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherAvailability"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"timeZone"}},{"kind":"Field","name":{"kind":"Name","value":"weeklyRanges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"weekday"}},{"kind":"Field","name":{"kind":"Name","value":"startLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"endLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"exceptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsAtLocal"}},{"kind":"Field","name":{"kind":"Name","value":"endsAtLocal"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}}]}}]}}]} as unknown as DocumentNode<TeacherAvailabilityQuery, TeacherAvailabilityQueryVariables>;
export const SaveTeacherAvailabilityRangeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveTeacherAvailabilityRange"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaveTeacherAvailabilityRangeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveTeacherAvailabilityRange"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SaveTeacherAvailabilityRangeSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"range"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"weekday"}},{"kind":"Field","name":{"kind":"Name","value":"startLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"endLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeacherAvailabilityValidationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<SaveTeacherAvailabilityRangeMutation, SaveTeacherAvailabilityRangeMutationVariables>;
export const AddAvailabilityExceptionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddAvailabilityException"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddAvailabilityExceptionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addAvailabilityException"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AddAvailabilityExceptionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exception"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsAtLocal"}},{"kind":"Field","name":{"kind":"Name","value":"endsAtLocal"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AvailabilityExceptionSessionConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionIds"}},{"kind":"Field","name":{"kind":"Name","value":"absenceRequestPath"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeacherAvailabilityValidationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<AddAvailabilityExceptionMutation, AddAvailabilityExceptionMutationVariables>;
export const EndTeacherAvailabilityRangeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EndTeacherAvailabilityRange"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EndTeacherAvailabilityRangeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endTeacherAvailabilityRange"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EndTeacherAvailabilityRangeSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"range"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"weekday"}},{"kind":"Field","name":{"kind":"Name","value":"startLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"endLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeacherAvailabilityValidationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<EndTeacherAvailabilityRangeMutation, EndTeacherAvailabilityRangeMutationVariables>;
export const RemoveAvailabilityExceptionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveAvailabilityException"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RemoveAvailabilityExceptionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeAvailabilityException"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RemoveAvailabilityExceptionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exceptionId"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeacherAvailabilityValidationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveAvailabilityExceptionMutation, RemoveAvailabilityExceptionMutationVariables>;
export const TeacherScheduleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeacherSchedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherClassSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationReason"}}]}},{"kind":"Field","name":{"kind":"Name","value":"teacherAbsenceRequests"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]}}]} as unknown as DocumentNode<TeacherScheduleQuery, TeacherScheduleQueryVariables>;
export const ReportAbsenceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReportAbsence"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReportAbsenceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reportAbsence"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ReportAbsenceSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"absenceRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"cancellationReason"}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ClassSessionDisruptionError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ReportAbsenceMutation, ReportAbsenceMutationVariables>;