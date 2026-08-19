import { GraphQLResolveInfo } from 'graphql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AbsenceRequest = {
  __typename?: 'AbsenceRequest';
  classSessions: Array<ClassSession>;
  id: Scalars['ID']['output'];
  requestedAt: Scalars['String']['output'];
  state: AbsenceRequestState;
};

export enum AbsenceRequestState {
  Open = 'OPEN',
  Resolved = 'RESOLVED'
}

export type AcceptSponsorshipInvitationResult = AcceptSponsorshipInvitationSuccess | SponsorshipInvitationResponseError;

export type AcceptSponsorshipInvitationSuccess = {
  __typename?: 'AcceptSponsorshipInvitationSuccess';
  account: ClassCreditAccount;
  sponsorship: Sponsorship;
};

export type AddAvailabilityExceptionInput = {
  endDisambiguation: LocalTimeDisambiguation;
  endsAtLocal: Scalars['String']['input'];
  idempotencyKey: Scalars['ID']['input'];
  startDisambiguation: LocalTimeDisambiguation;
  startsAtLocal: Scalars['String']['input'];
};

export type AddAvailabilityExceptionResult = AddAvailabilityExceptionSuccess | AvailabilityExceptionSessionConflict | TeacherAvailabilityValidationError;

export type AddAvailabilityExceptionSuccess = {
  __typename?: 'AddAvailabilityExceptionSuccess';
  exception: AvailabilityException;
};

export type AddCohortMembershipInput = {
  cohortId: Scalars['ID']['input'];
  effectiveFrom?: InputMaybe<Scalars['String']['input']>;
  effectiveUntil?: InputMaybe<Scalars['String']['input']>;
  idempotencyKey: Scalars['ID']['input'];
  sponsorshipId: Scalars['ID']['input'];
};

export type AddCohortMembershipResult = CohortError | CohortMembershipSuccess;

export type AddLessonMaterialInput = {
  httpsUrl?: InputMaybe<Scalars['String']['input']>;
  idempotencyKey: Scalars['ID']['input'];
  kind: LessonMaterialKind;
  lessonUnitId: Scalars['ID']['input'];
  publisher?: InputMaybe<Scalars['String']['input']>;
  structuredContent?: InputMaybe<Array<StructuredTextBlockInput>>;
  title: Scalars['String']['input'];
};

export type AddLessonMaterialResult = AddLessonMaterialSuccess | CurriculumConflict | InvalidLessonMaterial;

export type AddLessonMaterialSuccess = {
  __typename?: 'AddLessonMaterialSuccess';
  material: LessonMaterial;
};

export type AdjustClassCreditsInput = {
  amount: Scalars['Int']['input'];
  idempotencyKey: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
  studentUserId: Scalars['ID']['input'];
};

export type AdjustClassCreditsResult = AdjustClassCreditsSuccess | ClassCreditAdjustmentError | CurriculumConflict;

export type AdjustClassCreditsSuccess = {
  __typename?: 'AdjustClassCreditsSuccess';
  account: ClassCreditAccount;
};

export type AdministrationCurriculum = {
  __typename?: 'AdministrationCurriculum';
  courses: Array<Course>;
  teachers: Array<PublicTeacherProfile>;
  topics: Array<Topic>;
};

export type AdministratorTaskError = {
  __typename?: 'AdministratorTaskError';
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type AdministratorTaskItem = {
  __typename?: 'AdministratorTaskItem';
  correlationReference: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  kind: AdministratorTaskKind;
  requiredRole: UserRole;
  resolvedAt?: Maybe<Scalars['String']['output']>;
  safeContext: AdministratorTaskSafeContext;
  state: AdministratorTaskState;
};

export enum AdministratorTaskKind {
  NotificationDeliveryReconciliation = 'NOTIFICATION_DELIVERY_RECONCILIATION',
  UserSuspensionTeacherAssignment = 'USER_SUSPENSION_TEACHER_ASSIGNMENT'
}

export type AdministratorTaskSafeContext = {
  __typename?: 'AdministratorTaskSafeContext';
  channel?: Maybe<NotificationChannel>;
  classSessionId?: Maybe<Scalars['ID']['output']>;
  messageId?: Maybe<Scalars['String']['output']>;
  recipientReference?: Maybe<Scalars['ID']['output']>;
  suspendedUserId?: Maybe<Scalars['ID']['output']>;
};

export enum AdministratorTaskState {
  Open = 'OPEN',
  Resolved = 'RESOLVED'
}

export type AttendanceError = {
  __typename?: 'AttendanceError';
  code: AttendanceErrorCode;
  message: Scalars['String']['output'];
};

export enum AttendanceErrorCode {
  AttendanceCorrectionReasonRequired = 'ATTENDANCE_CORRECTION_REASON_REQUIRED',
  AttendanceRecordingNotOpen = 'ATTENDANCE_RECORDING_NOT_OPEN',
  AttendanceRecordingWindowClosed = 'ATTENDANCE_RECORDING_WINDOW_CLOSED',
  AttendanceRosterMismatch = 'ATTENDANCE_ROSTER_MISMATCH',
  ClassSessionNotFound = 'CLASS_SESSION_NOT_FOUND',
  IdempotencyKeyReused = 'IDEMPOTENCY_KEY_REUSED'
}

export enum AttendanceOutcome {
  Attended = 'ATTENDED',
  NoShow = 'NO_SHOW'
}

export type AttendanceRecord = {
  __typename?: 'AttendanceRecord';
  correctedAt?: Maybe<Scalars['String']['output']>;
  correctionCount: Scalars['Int']['output'];
  outcome: AttendanceOutcome;
  submittedAt: Scalars['String']['output'];
};

export type AttendanceRecordInput = {
  bookingId: Scalars['ID']['input'];
  correctionReason?: InputMaybe<Scalars['String']['input']>;
  outcome: AttendanceOutcome;
};

export enum AttendanceReviewDecision {
  Correct = 'CORRECT',
  Uphold = 'UPHOLD'
}

export type AttendanceReviewError = {
  __typename?: 'AttendanceReviewError';
  code: AttendanceReviewErrorCode;
  message: Scalars['String']['output'];
};

export enum AttendanceReviewErrorCode {
  AttendanceNotPublished = 'ATTENDANCE_NOT_PUBLISHED',
  BookingNotFound = 'BOOKING_NOT_FOUND',
  IdempotencyKeyReused = 'IDEMPOTENCY_KEY_REUSED',
  InvalidExplanation = 'INVALID_EXPLANATION',
  InvalidReason = 'INVALID_REASON',
  ReviewAlreadyDecided = 'REVIEW_ALREADY_DECIDED',
  ReviewAlreadyRequested = 'REVIEW_ALREADY_REQUESTED',
  ReviewRequestNotFound = 'REVIEW_REQUEST_NOT_FOUND',
  ReviewWindowClosed = 'REVIEW_WINDOW_CLOSED'
}

export type AttendanceReviewRequest = {
  __typename?: 'AttendanceReviewRequest';
  bookingId: Scalars['ID']['output'];
  classSessionId: Scalars['ID']['output'];
  decidedAt?: Maybe<Scalars['String']['output']>;
  effectiveOutcome: AttendanceOutcome;
  explanation: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  outcomeAtRequest: AttendanceOutcome;
  privateAdministratorNote?: Maybe<Scalars['String']['output']>;
  requestedAt: Scalars['String']['output'];
  state: AttendanceReviewRequestState;
  studentDisplayName: Scalars['String']['output'];
  studentVisibleRationale?: Maybe<Scalars['String']['output']>;
};

export enum AttendanceReviewRequestState {
  Corrected = 'CORRECTED',
  Pending = 'PENDING',
  Upheld = 'UPHELD'
}

export type AvailabilityException = {
  __typename?: 'AvailabilityException';
  endsAt: Scalars['String']['output'];
  endsAtLocal: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  startsAt: Scalars['String']['output'];
  startsAtLocal: Scalars['String']['output'];
  timeZone: Scalars['String']['output'];
};

export type AvailabilityExceptionSessionConflict = {
  __typename?: 'AvailabilityExceptionSessionConflict';
  absenceRequestPath: Scalars['String']['output'];
  classSessionIds: Array<Scalars['ID']['output']>;
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type BookClassSessionInput = {
  classSessionId: Scalars['ID']['input'];
  idempotencyKey: Scalars['ID']['input'];
};

export type BookClassSessionResult = BookClassSessionSuccess | BookingError;

export type BookClassSessionSuccess = {
  __typename?: 'BookClassSessionSuccess';
  account: ClassCreditAccount;
  booking: Booking;
};

export type Booking = {
  __typename?: 'Booking';
  bookedAt: Scalars['String']['output'];
  classCreditRefunded: Scalars['Boolean']['output'];
  classSession: ClassSession;
  endedAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  state: BookingState;
  terminalReason?: Maybe<BookingTerminalReason>;
};

export type BookingError = {
  __typename?: 'BookingError';
  code: BookingErrorCode;
  message: Scalars['String']['output'];
};

export enum BookingErrorCode {
  AlreadyBooked = 'ALREADY_BOOKED',
  BookingNotActive = 'BOOKING_NOT_ACTIVE',
  BookingNotFound = 'BOOKING_NOT_FOUND',
  BookingWindowClosed = 'BOOKING_WINDOW_CLOSED',
  CancellationWindowClosed = 'CANCELLATION_WINDOW_CLOSED',
  ClassSessionNotFound = 'CLASS_SESSION_NOT_FOUND',
  IdempotencyKeyReused = 'IDEMPOTENCY_KEY_REUSED',
  InsufficientClassCredits = 'INSUFFICIENT_CLASS_CREDITS',
  LessonUnitMismatch = 'LESSON_UNIT_MISMATCH',
  ScheduleConflict = 'SCHEDULE_CONFLICT',
  SessionFull = 'SESSION_FULL'
}

export enum BookingState {
  Active = 'ACTIVE',
  Ended = 'ENDED'
}

export enum BookingTerminalReason {
  ClassSessionCancellation = 'CLASS_SESSION_CANCELLATION',
  Rescheduled = 'RESCHEDULED',
  RoleAssignmentRemoval = 'ROLE_ASSIGNMENT_REMOVAL',
  StudentCancellation = 'STUDENT_CANCELLATION'
}

export type CancelBookingInput = {
  bookingId: Scalars['ID']['input'];
  idempotencyKey: Scalars['ID']['input'];
};

export type CancelBookingResult = BookingError | CancelBookingSuccess;

export type CancelBookingSuccess = {
  __typename?: 'CancelBookingSuccess';
  account: ClassCreditAccount;
  booking: Booking;
};

export type CancelClassSessionInput = {
  absenceRequestId: Scalars['ID']['input'];
  classSessionId: Scalars['ID']['input'];
  idempotencyKey: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
};

export type CancelClassSessionResult = CancelClassSessionSuccess | ClassSessionDisruptionError;

export type CancelClassSessionSuccess = {
  __typename?: 'CancelClassSessionSuccess';
  absenceRequest: AbsenceRequest;
  classSession: ClassSession;
  refundedBookingCount: Scalars['Int']['output'];
  removedWaitlistEntryCount: Scalars['Int']['output'];
};

export type ChangeClassSessionSeatCapacityInput = {
  classSessionId: Scalars['ID']['input'];
  idempotencyKey: Scalars['ID']['input'];
  seatCapacity: Scalars['Int']['input'];
};

export type ChangeClassSessionSeatCapacityResult = ChangeClassSessionSeatCapacitySuccess | ClassSessionSeatCapacityError | CurriculumConflict;

export type ChangeClassSessionSeatCapacitySuccess = {
  __typename?: 'ChangeClassSessionSeatCapacitySuccess';
  classSession: ClassSession;
};

export type ChangeRoleAssignmentInput = {
  idempotencyKey: Scalars['ID']['input'];
  organizationId?: InputMaybe<Scalars['ID']['input']>;
  reason: Scalars['String']['input'];
  role: UserRole;
  userId: Scalars['ID']['input'];
};

export type ChangeTeacherQualificationInput = {
  curriculumLevel: CurriculumLevel;
  idempotencyKey: Scalars['ID']['input'];
  targetLanguage: Scalars['String']['input'];
  teacherUserId: Scalars['ID']['input'];
};

export type ChangeTeacherQualificationSuccess = {
  __typename?: 'ChangeTeacherQualificationSuccess';
  teacherProfile: PublicTeacherProfile;
};

export type ChangeUserAccessInput = {
  idempotencyKey: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
  userId: Scalars['ID']['input'];
};

export type ClassCreditAccount = {
  __typename?: 'ClassCreditAccount';
  availableBalance: Scalars['Int']['output'];
  ledger: Array<ClassCreditLedgerEntry>;
  studentUserId: Scalars['ID']['output'];
};

export type ClassCreditAdjustmentError = {
  __typename?: 'ClassCreditAdjustmentError';
  code: ClassCreditAdjustmentErrorCode;
  message: Scalars['String']['output'];
};

export enum ClassCreditAdjustmentErrorCode {
  InsufficientClassCredits = 'INSUFFICIENT_CLASS_CREDITS',
  InvalidAdjustment = 'INVALID_ADJUSTMENT',
  InvalidReason = 'INVALID_REASON',
  StudentNotFound = 'STUDENT_NOT_FOUND'
}

export type ClassCreditLedgerEntry = {
  __typename?: 'ClassCreditLedgerEntry';
  amount: Scalars['Int']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  source: ClassCreditLedgerSource;
  sourceReference: Scalars['String']['output'];
};

export enum ClassCreditLedgerSource {
  BookingDeduction = 'BOOKING_DEDUCTION',
  BookingRefund = 'BOOKING_REFUND',
  CreditAdjustment = 'CREDIT_ADJUSTMENT',
  OrganizationCreditGrant = 'ORGANIZATION_CREDIT_GRANT',
  SubscriptionGrant = 'SUBSCRIPTION_GRANT'
}

export type ClassRoster = {
  __typename?: 'ClassRoster';
  classSession: ClassSession;
  students: Array<ClassRosterStudent>;
};

export type ClassRosterStudent = {
  __typename?: 'ClassRosterStudent';
  attendance?: Maybe<AttendanceRecord>;
  bookingId: Scalars['ID']['output'];
  displayName: Scalars['String']['output'];
  placement?: Maybe<StudentPlacement>;
  studentUserId: Scalars['ID']['output'];
};

export type ClassSession = {
  __typename?: 'ClassSession';
  cancellationReason?: Maybe<Scalars['String']['output']>;
  endsAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lessonUnitId: Scalars['ID']['output'];
  occupiedSeats: Scalars['Int']['output'];
  schedulingTimeZone: Scalars['String']['output'];
  seatCapacity: Scalars['Int']['output'];
  startsAt: Scalars['String']['output'];
  state: ClassSessionState;
  teacherUserId: Scalars['ID']['output'];
};

export type ClassSessionDiscoveryConnection = {
  __typename?: 'ClassSessionDiscoveryConnection';
  appliedFilter: ClassSessionDiscoveryFilter;
  nodes: Array<DiscoverableClassSession>;
  pageInfo: ClassSessionDiscoveryPageInfo;
};

export type ClassSessionDiscoveryFilter = {
  __typename?: 'ClassSessionDiscoveryFilter';
  curriculumLevel?: Maybe<CurriculumLevel>;
  localDate?: Maybe<Scalars['String']['output']>;
  targetLanguage: Scalars['String']['output'];
  teacherUserId?: Maybe<Scalars['ID']['output']>;
  topicKeys: Array<Scalars['String']['output']>;
};

export type ClassSessionDiscoveryInput = {
  after?: InputMaybe<Scalars['String']['input']>;
  curriculumLevel?: InputMaybe<CurriculumLevel>;
  localDate?: InputMaybe<Scalars['String']['input']>;
  targetLanguage: Scalars['String']['input'];
  teacherUserId?: InputMaybe<Scalars['ID']['input']>;
  topicKeys?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type ClassSessionDiscoveryOptions = {
  __typename?: 'ClassSessionDiscoveryOptions';
  targetLanguages: Array<Scalars['String']['output']>;
  teachers: Array<ClassSessionDiscoveryTeacherOption>;
  topics: Array<Topic>;
};

export type ClassSessionDiscoveryPageInfo = {
  __typename?: 'ClassSessionDiscoveryPageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
};

export type ClassSessionDiscoveryTeacherOption = {
  __typename?: 'ClassSessionDiscoveryTeacherOption';
  displayName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

export type ClassSessionDisruptionError = {
  __typename?: 'ClassSessionDisruptionError';
  code: ClassSessionDisruptionErrorCode;
  message: Scalars['String']['output'];
};

export enum ClassSessionDisruptionErrorCode {
  AbsenceAlreadyReported = 'ABSENCE_ALREADY_REPORTED',
  AbsenceRequestNotFound = 'ABSENCE_REQUEST_NOT_FOUND',
  AttendanceAlreadySubmitted = 'ATTENDANCE_ALREADY_SUBMITTED',
  ClassSessionAlreadyStarted = 'CLASS_SESSION_ALREADY_STARTED',
  ClassSessionNotAssigned = 'CLASS_SESSION_NOT_ASSIGNED',
  ClassSessionNotFound = 'CLASS_SESSION_NOT_FOUND',
  DisruptionAlreadyResolved = 'DISRUPTION_ALREADY_RESOLVED',
  IdempotencyKeyReused = 'IDEMPOTENCY_KEY_REUSED',
  InvalidClassSessions = 'INVALID_CLASS_SESSIONS',
  InvalidReason = 'INVALID_REASON',
  ReplacementTeacherRequired = 'REPLACEMENT_TEACHER_REQUIRED',
  TeacherQualificationRequired = 'TEACHER_QUALIFICATION_REQUIRED',
  TeacherScheduleConflict = 'TEACHER_SCHEDULE_CONFLICT'
}

export type ClassSessionPublicationError = {
  __typename?: 'ClassSessionPublicationError';
  code: ClassSessionPublicationErrorCode;
  message: Scalars['String']['output'];
};

export enum ClassSessionPublicationErrorCode {
  AvailabilityExceptionConflict = 'AVAILABILITY_EXCEPTION_CONFLICT',
  InvalidLessonUnit = 'INVALID_LESSON_UNIT',
  InvalidLocalDateTime = 'INVALID_LOCAL_DATE_TIME',
  InvalidSchedulingTimeZone = 'INVALID_SCHEDULING_TIME_ZONE',
  InvalidSeatCapacity = 'INVALID_SEAT_CAPACITY',
  LocalTimeFold = 'LOCAL_TIME_FOLD',
  LocalTimeGap = 'LOCAL_TIME_GAP',
  TeacherAvailabilityRequired = 'TEACHER_AVAILABILITY_REQUIRED',
  TeacherQualificationRequired = 'TEACHER_QUALIFICATION_REQUIRED',
  TeacherScheduleConflict = 'TEACHER_SCHEDULE_CONFLICT'
}

export type ClassSessionSeatCapacityError = {
  __typename?: 'ClassSessionSeatCapacityError';
  code: ClassSessionSeatCapacityErrorCode;
  message: Scalars['String']['output'];
};

export enum ClassSessionSeatCapacityErrorCode {
  ClassSessionNotFound = 'CLASS_SESSION_NOT_FOUND',
  InvalidSeatCapacity = 'INVALID_SEAT_CAPACITY',
  SeatCapacityBelowOccupiedSeats = 'SEAT_CAPACITY_BELOW_OCCUPIED_SEATS'
}

export enum ClassSessionState {
  Cancelled = 'CANCELLED',
  Published = 'PUBLISHED'
}

export type Classroom = {
  __typename?: 'Classroom';
  classSessionId: Scalars['ID']['output'];
  lessonUnitId: Scalars['ID']['output'];
  simulationStatus: ClassroomSimulationStatus;
  teacherUserId: Scalars['ID']['output'];
};

export type ClassroomAccessError = {
  __typename?: 'ClassroomAccessError';
  code: ClassroomAccessErrorCode;
  message: Scalars['String']['output'];
};

export enum ClassroomAccessErrorCode {
  ClassroomClosed = 'CLASSROOM_CLOSED',
  ClassroomNotOpen = 'CLASSROOM_NOT_OPEN',
  ClassSessionNotFound = 'CLASS_SESSION_NOT_FOUND'
}

export enum ClassroomSimulationStatus {
  Simulated = 'SIMULATED'
}

export type Cohort = {
  __typename?: 'Cohort';
  attributedActivity: CohortAttributedActivity;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  memberships: Array<CohortMembership>;
  name: Scalars['String']['output'];
  organization: Organization;
};

export type CohortAttributedActivity = {
  __typename?: 'CohortAttributedActivity';
  attendedCount: Scalars['Int']['output'];
  noShowCount: Scalars['Int']['output'];
};

export type CohortError = {
  __typename?: 'CohortError';
  code: CohortErrorCode;
  message: Scalars['String']['output'];
};

export enum CohortErrorCode {
  CohortNameTaken = 'COHORT_NAME_TAKEN',
  CohortNotFound = 'COHORT_NOT_FOUND',
  IdempotencyKeyReused = 'IDEMPOTENCY_KEY_REUSED',
  MembershipAlreadyEnded = 'MEMBERSHIP_ALREADY_ENDED',
  MembershipNotFound = 'MEMBERSHIP_NOT_FOUND',
  MembershipNotProspective = 'MEMBERSHIP_NOT_PROSPECTIVE',
  MembershipWindowInvalid = 'MEMBERSHIP_WINDOW_INVALID',
  MembershipWindowOverlaps = 'MEMBERSHIP_WINDOW_OVERLAPS',
  SponsorshipNotActive = 'SPONSORSHIP_NOT_ACTIVE',
  SponsorshipNotFound = 'SPONSORSHIP_NOT_FOUND'
}

export type CohortMembership = {
  __typename?: 'CohortMembership';
  attributedActivity: CohortAttributedActivity;
  cohortId: Scalars['ID']['output'];
  cohortName: Scalars['String']['output'];
  effectiveFrom: Scalars['String']['output'];
  effectiveUntil?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  sponsorshipId: Scalars['ID']['output'];
  studentDisplayName: Scalars['String']['output'];
  studentUserId: Scalars['ID']['output'];
};

export type CohortMembershipSuccess = {
  __typename?: 'CohortMembershipSuccess';
  cohort: Cohort;
  membership: CohortMembership;
};

export type CohortSuccess = {
  __typename?: 'CohortSuccess';
  cohort: Cohort;
};

export type Course = {
  __typename?: 'Course';
  curriculumLevel: CurriculumLevel;
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  lessonUnits: Array<LessonUnit>;
  summary: Scalars['String']['output'];
  targetLanguage: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type CourseProgress = {
  __typename?: 'CourseProgress';
  activeLessonUnitCount: Scalars['Int']['output'];
  completedActiveLessonUnitCount: Scalars['Int']['output'];
  courseId: Scalars['ID']['output'];
  curriculumLevel: CurriculumLevel;
  learningHistory: Array<CourseProgressLearningHistory>;
  percentage: Scalars['Int']['output'];
  targetLanguage: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type CourseProgressLearningHistory = {
  __typename?: 'CourseProgressLearningHistory';
  countsTowardProgress: Scalars['Boolean']['output'];
  earnedAt: Scalars['String']['output'];
  lessonUnitId: Scalars['ID']['output'];
  state: LessonUnitState;
  title: Scalars['String']['output'];
};

export type CourseProgressSnapshot = {
  __typename?: 'CourseProgressSnapshot';
  activeLessonUnitCount: Scalars['Int']['output'];
  boundary: CourseProgressSnapshotBoundary;
  capturedAt: Scalars['String']['output'];
  completedActiveLessonUnitCount: Scalars['Int']['output'];
  courseId: Scalars['ID']['output'];
  courseTitle: Scalars['String']['output'];
  percentage: Scalars['Int']['output'];
  revisedAt?: Maybe<Scalars['String']['output']>;
  revisionCount: Scalars['Int']['output'];
};

export enum CourseProgressSnapshotBoundary {
  SponsorshipEnd = 'SPONSORSHIP_END',
  SponsorshipStart = 'SPONSORSHIP_START'
}

export type CreateCohortInput = {
  idempotencyKey: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type CreateCohortResult = CohortError | CohortSuccess;

export type CreateCourseInput = {
  curriculumLevel: CurriculumLevel;
  idempotencyKey: Scalars['ID']['input'];
  summary: Scalars['String']['input'];
  targetLanguage: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type CreateCourseResult = CreateCourseSuccess | CurriculumConflict;

export type CreateCourseSuccess = {
  __typename?: 'CreateCourseSuccess';
  course: Course;
};

export type CreateLessonUnitInput = {
  courseId: Scalars['ID']['input'];
  idempotencyKey: Scalars['ID']['input'];
  objectives: Array<Scalars['String']['input']>;
  summary: Scalars['String']['input'];
  title: Scalars['String']['input'];
  topicKeys: Array<Scalars['String']['input']>;
};

export type CreateLessonUnitResult = CreateLessonUnitSuccess | CurriculumConflict;

export type CreateLessonUnitSuccess = {
  __typename?: 'CreateLessonUnitSuccess';
  lessonUnit: LessonUnit;
};

export type CurriculumConflict = {
  __typename?: 'CurriculumConflict';
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export enum CurriculumLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2'
}

export type DecideAttendanceReviewInput = {
  attendanceReviewRequestId: Scalars['ID']['input'];
  decision: AttendanceReviewDecision;
  idempotencyKey: Scalars['ID']['input'];
  privateAdministratorNote?: InputMaybe<Scalars['String']['input']>;
  studentVisibleRationale: Scalars['String']['input'];
};

export type DecideAttendanceReviewResult = AttendanceReviewError | DecideAttendanceReviewSuccess;

export type DecideAttendanceReviewSuccess = {
  __typename?: 'DecideAttendanceReviewSuccess';
  attendanceReviewRequest: AttendanceReviewRequest;
};

export type DeclineSponsorshipInvitationResult = DeclineSponsorshipInvitationSuccess | SponsorshipInvitationResponseError;

export type DeclineSponsorshipInvitationSuccess = {
  __typename?: 'DeclineSponsorshipInvitationSuccess';
  invitation: SponsorshipInvitation;
};

export type DiscoverableClassSession = {
  __typename?: 'DiscoverableClassSession';
  endsAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lessonUnit: DiscoveryLessonUnit;
  occupiedSeats: Scalars['Int']['output'];
  schedulingTimeZone: Scalars['String']['output'];
  seatCapacity: Scalars['Int']['output'];
  startsAt: Scalars['String']['output'];
  teacherProfile: PublicTeacherProfile;
};

export type DiscoveryLessonUnit = {
  __typename?: 'DiscoveryLessonUnit';
  id: Scalars['ID']['output'];
  objectives: Array<Scalars['String']['output']>;
  summary: Scalars['String']['output'];
  title: Scalars['String']['output'];
  topics: Array<Topic>;
};

export type EndCohortMembershipInput = {
  cohortMembershipId: Scalars['ID']['input'];
  effectiveUntil?: InputMaybe<Scalars['String']['input']>;
  idempotencyKey: Scalars['ID']['input'];
};

export type EndCohortMembershipResult = CohortError | CohortMembershipSuccess;

export type EndSponsorshipAsOrganizationInput = {
  idempotencyKey: Scalars['ID']['input'];
  sponsorshipId: Scalars['ID']['input'];
};

export type EndSponsorshipAsOrganizationResult = EndSponsorshipAsOrganizationSuccess | SponsorshipBoundaryError;

export type EndSponsorshipAsOrganizationSuccess = {
  __typename?: 'EndSponsorshipAsOrganizationSuccess';
  sponsorship: Sponsorship;
};

export type EndSponsorshipAsStudentInput = {
  idempotencyKey: Scalars['ID']['input'];
};

export type EndSponsorshipAsStudentResult = EndSponsorshipAsStudentSuccess | SponsorshipBoundaryError;

export type EndSponsorshipAsStudentSuccess = {
  __typename?: 'EndSponsorshipAsStudentSuccess';
  account: ClassCreditAccount;
  sponsorship: Sponsorship;
};

export type EndTeacherAvailabilityRangeInput = {
  effectiveUntil: Scalars['String']['input'];
  idempotencyKey: Scalars['ID']['input'];
  rangeId: Scalars['ID']['input'];
};

export type EndTeacherAvailabilityRangeResult = EndTeacherAvailabilityRangeSuccess | TeacherAvailabilityValidationError;

export type EndTeacherAvailabilityRangeSuccess = {
  __typename?: 'EndTeacherAvailabilityRangeSuccess';
  range: TeacherAvailabilityRange;
};

export type EnterClassroomInput = {
  actingRole: UserRole;
  classSessionId: Scalars['ID']['input'];
};

export type EnterClassroomResult = ClassroomAccessError | EnterClassroomSuccess;

export type EnterClassroomSuccess = {
  __typename?: 'EnterClassroomSuccess';
  classroom: Classroom;
};

export type FeedbackAndRatingItem = {
  __typename?: 'FeedbackAndRatingItem';
  bookingId: Scalars['ID']['output'];
  classSessionEndsAt: Scalars['String']['output'];
  classSessionId: Scalars['ID']['output'];
  feedbackDeadline: Scalars['String']['output'];
  learningFeedback?: Maybe<LearningFeedback>;
  ratingDeadline: Scalars['String']['output'];
  sessionRating?: Maybe<SessionRating>;
  studentDisplayName: Scalars['String']['output'];
  teacherDisplayName: Scalars['String']['output'];
};

export enum FeedbackSkill {
  Grammar = 'GRAMMAR',
  Listening = 'LISTENING',
  Pronunciation = 'PRONUNCIATION',
  Reading = 'READING',
  SpokenInteraction = 'SPOKEN_INTERACTION',
  SpokenProduction = 'SPOKEN_PRODUCTION',
  Vocabulary = 'VOCABULARY',
  Writing = 'WRITING'
}

export type GrantRoleAssignmentResult = RoleAssignmentChangeSuccess | RoleAssignmentError;

export type GrantTeacherQualificationResult = ChangeTeacherQualificationSuccess | CurriculumConflict;

export type InAppNotification = {
  __typename?: 'InAppNotification';
  archivedAt?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  messageId: Scalars['String']['output'];
  readAt?: Maybe<Scalars['String']['output']>;
  renderedContent: Scalars['String']['output'];
};

export type InstructionalIdentityLocked = {
  __typename?: 'InstructionalIdentityLocked';
  code: Scalars['String']['output'];
  lessonUnitId: Scalars['ID']['output'];
};

export enum InterfaceLocale {
  En = 'EN',
  Es = 'ES'
}

export type InvalidLessonMaterial = {
  __typename?: 'InvalidLessonMaterial';
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type InviteToSponsorshipInput = {
  idempotencyKey: Scalars['ID']['input'];
  studentUserId: Scalars['ID']['input'];
};

export type InviteToSponsorshipResult = InviteToSponsorshipSuccess | SponsorshipInvitationError;

export type InviteToSponsorshipSuccess = {
  __typename?: 'InviteToSponsorshipSuccess';
  invitation: SponsorshipInvitation;
};

export type JoinWaitlistInput = {
  classSessionId: Scalars['ID']['input'];
  idempotencyKey: Scalars['ID']['input'];
};

export type JoinWaitlistResult = JoinWaitlistSuccess | WaitlistError;

export type JoinWaitlistSuccess = {
  __typename?: 'JoinWaitlistSuccess';
  entry: WaitlistEntry;
};

export type LearningAccessLessonUnit = {
  __typename?: 'LearningAccessLessonUnit';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
};

export type LearningFeedback = {
  __typename?: 'LearningFeedback';
  bookingId: Scalars['ID']['output'];
  nextPractice: Scalars['String']['output'];
  observations: Scalars['String']['output'];
  observedStrengths: Array<FeedbackSkill>;
  redactedAt?: Maybe<Scalars['String']['output']>;
  redactionReason?: Maybe<Scalars['String']['output']>;
  state: LearningFeedbackState;
  submittedAt?: Maybe<Scalars['String']['output']>;
  suggestedFocuses: Array<FeedbackSkill>;
  updatedAt: Scalars['String']['output'];
};

export type LearningFeedbackError = {
  __typename?: 'LearningFeedbackError';
  code: LearningFeedbackErrorCode;
  message: Scalars['String']['output'];
};

export enum LearningFeedbackErrorCode {
  BookingNotFound = 'BOOKING_NOT_FOUND',
  FeedbackNotFound = 'FEEDBACK_NOT_FOUND',
  FeedbackWindowClosed = 'FEEDBACK_WINDOW_CLOSED',
  IdempotencyKeyReused = 'IDEMPOTENCY_KEY_REUSED',
  InvalidFeedback = 'INVALID_FEEDBACK',
  InvalidReason = 'INVALID_REASON'
}

export enum LearningFeedbackState {
  Draft = 'DRAFT',
  Submitted = 'SUBMITTED'
}

export type LessonMaterial = {
  __typename?: 'LessonMaterial';
  httpsUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  kind: LessonMaterialKind;
  publisher?: Maybe<Scalars['String']['output']>;
  structuredContent?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export enum LessonMaterialKind {
  HttpsReference = 'HTTPS_REFERENCE',
  StructuredText = 'STRUCTURED_TEXT'
}

export type LessonUnit = {
  __typename?: 'LessonUnit';
  courseId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  materials: Array<LessonMaterial>;
  objectives: Array<Scalars['String']['output']>;
  order: Scalars['Int']['output'];
  state: LessonUnitState;
  summary: Scalars['String']['output'];
  title: Scalars['String']['output'];
  topics: Array<Topic>;
};

export enum LessonUnitState {
  Active = 'ACTIVE',
  Retired = 'RETIRED'
}

export enum LocalTimeDisambiguation {
  Earlier = 'EARLIER',
  Later = 'LATER',
  Reject = 'REJECT'
}

export type MarketplaceActionableExceptions = {
  __typename?: 'MarketplaceActionableExceptions';
  items: Array<MarketplaceExceptionItem>;
  totalCount: Scalars['Int']['output'];
};

export type MarketplaceAttendanceSummary = {
  __typename?: 'MarketplaceAttendanceSummary';
  attendanceRatePercentage?: Maybe<Scalars['Int']['output']>;
  attendedCount: Scalars['Int']['output'];
  correctedCount: Scalars['Int']['output'];
  exceptionCount: Scalars['Int']['output'];
  excludedUnrecordedCount: Scalars['Int']['output'];
  noShowCount: Scalars['Int']['output'];
  recordedCount: Scalars['Int']['output'];
};

export type MarketplaceCancellationSummary = {
  __typename?: 'MarketplaceCancellationSummary';
  dailyRates: Array<MarketplaceDailyCancellationRate>;
  excludedClassSessionCancellationCount: Scalars['Int']['output'];
  excludedRescheduleCount: Scalars['Int']['output'];
  lateCount: Scalars['Int']['output'];
  studentCancellationCount: Scalars['Int']['output'];
  studentCancellationRatePercentage?: Maybe<Scalars['Int']['output']>;
  timelyCount: Scalars['Int']['output'];
};

export type MarketplaceCorrectionSummary = {
  __typename?: 'MarketplaceCorrectionSummary';
  correctedAttendanceCount: Scalars['Int']['output'];
  lastCorrectedAt?: Maybe<Scalars['String']['output']>;
  pendingAttendanceReviewCount: Scalars['Int']['output'];
};

export type MarketplaceCourseProgressReport = {
  __typename?: 'MarketplaceCourseProgressReport';
  activeLessonUnitCount: Scalars['Int']['output'];
  completedActiveLessonUnitCount: Scalars['Int']['output'];
  courseId: Scalars['ID']['output'];
  courseTitle: Scalars['String']['output'];
  curriculumLevel: CurriculumLevel;
  studentsWithProgressCount: Scalars['Int']['output'];
  targetLanguage: Scalars['String']['output'];
};

export type MarketplaceCreditSourceTotal = {
  __typename?: 'MarketplaceCreditSourceTotal';
  entryCount: Scalars['Int']['output'];
  netAmount: Scalars['Int']['output'];
  source: ClassCreditLedgerSource;
};

export type MarketplaceCreditSummary = {
  __typename?: 'MarketplaceCreditSummary';
  bySource: Array<MarketplaceCreditSourceTotal>;
  creditAdjustmentCount: Scalars['Int']['output'];
  deductedCreditCount: Scalars['Int']['output'];
  grantedCreditCount: Scalars['Int']['output'];
  netCreditChange: Scalars['Int']['output'];
  refundedCreditCount: Scalars['Int']['output'];
};

export type MarketplaceDailyCancellationRate = {
  __typename?: 'MarketplaceDailyCancellationRate';
  excludedUnrecordedCount: Scalars['Int']['output'];
  lateCount: Scalars['Int']['output'];
  localDate: Scalars['String']['output'];
  recordedOutcomeCount: Scalars['Int']['output'];
  studentCancellationCount: Scalars['Int']['output'];
  studentCancellationRatePercentage?: Maybe<Scalars['Int']['output']>;
  timelyCount: Scalars['Int']['output'];
};

export type MarketplaceExceptionItem = {
  __typename?: 'MarketplaceExceptionItem';
  affectedBookingCount: Scalars['Int']['output'];
  classSessionId: Scalars['ID']['output'];
  courseTitle: Scalars['String']['output'];
  kind: MarketplaceExceptionKind;
  lessonUnitTitle: Scalars['String']['output'];
  occurredAt: Scalars['String']['output'];
  teacherDisplayName: Scalars['String']['output'];
};

export enum MarketplaceExceptionKind {
  PendingAttendanceReview = 'PENDING_ATTENDANCE_REVIEW',
  UnrecordedAttendance = 'UNRECORDED_ATTENDANCE'
}

export type MarketplaceOperationalReport = {
  __typename?: 'MarketplaceOperationalReport';
  actionableExceptions: MarketplaceActionableExceptions;
  attendance: MarketplaceAttendanceSummary;
  cancellations: MarketplaceCancellationSummary;
  corrections: MarketplaceCorrectionSummary;
  courseProgress: Array<MarketplaceCourseProgressReport>;
  credits: MarketplaceCreditSummary;
  generatedAt: Scalars['String']['output'];
  range: MarketplaceReportRange;
};

export type MarketplaceOperationalReportInput = {
  fromLocalDate?: InputMaybe<Scalars['String']['input']>;
  toLocalDate?: InputMaybe<Scalars['String']['input']>;
};

export type MarketplaceReportRange = {
  __typename?: 'MarketplaceReportRange';
  fromLocalDate: Scalars['String']['output'];
  timeZone: Scalars['String']['output'];
  toLocalDate: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  acceptSponsorshipInvitation: AcceptSponsorshipInvitationResult;
  addAvailabilityException: AddAvailabilityExceptionResult;
  addCohortMembership: AddCohortMembershipResult;
  addLessonMaterial: AddLessonMaterialResult;
  adjustClassCredits: AdjustClassCreditsResult;
  administerAttendance: RecordAttendanceResult;
  archiveNotification: InAppNotification;
  bookClassSession: BookClassSessionResult;
  cancelBooking: CancelBookingResult;
  cancelClassSession: CancelClassSessionResult;
  changeClassSessionSeatCapacity: ChangeClassSessionSeatCapacityResult;
  createCohort: CreateCohortResult;
  createCourse: CreateCourseResult;
  createLessonUnit: CreateLessonUnitResult;
  decideAttendanceReview: DecideAttendanceReviewResult;
  declineSponsorshipInvitation: DeclineSponsorshipInvitationResult;
  endCohortMembership: EndCohortMembershipResult;
  endSponsorshipAsOrganization: EndSponsorshipAsOrganizationResult;
  endSponsorshipAsStudent: EndSponsorshipAsStudentResult;
  endTeacherAvailabilityRange: EndTeacherAvailabilityRangeResult;
  enterClassroom: EnterClassroomResult;
  grantRoleAssignment: GrantRoleAssignmentResult;
  grantTeacherQualification: GrantTeacherQualificationResult;
  inviteToSponsorship: InviteToSponsorshipResult;
  joinWaitlist: JoinWaitlistResult;
  markNotificationRead: InAppNotification;
  placeLessonUnitInCourse: ReorderLessonUnitResult;
  processSubscriptionProviderEvent: ProcessSubscriptionProviderEventResult;
  publishClassSession: PublishClassSessionResult;
  reactivateUser: ReactivateUserResult;
  recordAttendance: RecordAttendanceResult;
  redactLearningFeedback: RedactLearningFeedbackResult;
  redactSessionRatingComment: RedactSessionRatingCommentResult;
  rememberRoleWorkspacePlace: RolePlace;
  removeAvailabilityException: RemoveAvailabilityExceptionResult;
  removeRoleAssignment: RemoveRoleAssignmentResult;
  removeTeacherQualification: RemoveTeacherQualificationResult;
  renameCohort: RenameCohortResult;
  reportAbsence: ReportAbsenceResult;
  requestAttendanceReview: RequestAttendanceReviewResult;
  requestReportExport: RequestReportExportResult;
  rescheduleBooking: RescheduleBookingResult;
  resolveAdministratorTask: ResolveAdministratorTaskResult;
  retireLessonUnit: RetireLessonUnitResult;
  reviseCourseDetails: UpdateCourseResult;
  reviseLessonMaterial: ReviseLessonMaterialResult;
  reviseLessonUnitIdentity: UpdateLessonUnitResult;
  saveLearningFeedback: SaveLearningFeedbackResult;
  saveLocalizedTopic: UpsertTopicSuccess;
  saveSessionRating: SaveSessionRatingResult;
  saveTeacherAvailabilityRange: SaveTeacherAvailabilityRangeResult;
  saveTeacherProfile: SaveTeacherProfileSuccess;
  saveUserPreferences: SaveUserPreferencesPayload;
  scheduleSubscriptionCancellation: ScheduleSubscriptionCancellationResult;
  setStudentPlacement: StudentPlacement;
  substituteTeacher: SubstituteTeacherResult;
  suspendUser: SuspendUserResult;
  undoSubscriptionCancellation: UndoSubscriptionCancellationResult;
  withdrawWaitlist: WithdrawWaitlistResult;
};


export type MutationAcceptSponsorshipInvitationArgs = {
  input: SponsorshipInvitationResponseInput;
};


export type MutationAddAvailabilityExceptionArgs = {
  input: AddAvailabilityExceptionInput;
};


export type MutationAddCohortMembershipArgs = {
  input: AddCohortMembershipInput;
};


export type MutationAddLessonMaterialArgs = {
  input: AddLessonMaterialInput;
};


export type MutationAdjustClassCreditsArgs = {
  input: AdjustClassCreditsInput;
};


export type MutationAdministerAttendanceArgs = {
  input: RecordAttendanceInput;
};


export type MutationArchiveNotificationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationBookClassSessionArgs = {
  input: BookClassSessionInput;
};


export type MutationCancelBookingArgs = {
  input: CancelBookingInput;
};


export type MutationCancelClassSessionArgs = {
  input: CancelClassSessionInput;
};


export type MutationChangeClassSessionSeatCapacityArgs = {
  input: ChangeClassSessionSeatCapacityInput;
};


export type MutationCreateCohortArgs = {
  input: CreateCohortInput;
};


export type MutationCreateCourseArgs = {
  input: CreateCourseInput;
};


export type MutationCreateLessonUnitArgs = {
  input: CreateLessonUnitInput;
};


export type MutationDecideAttendanceReviewArgs = {
  input: DecideAttendanceReviewInput;
};


export type MutationDeclineSponsorshipInvitationArgs = {
  input: SponsorshipInvitationResponseInput;
};


export type MutationEndCohortMembershipArgs = {
  input: EndCohortMembershipInput;
};


export type MutationEndSponsorshipAsOrganizationArgs = {
  input: EndSponsorshipAsOrganizationInput;
};


export type MutationEndSponsorshipAsStudentArgs = {
  input: EndSponsorshipAsStudentInput;
};


export type MutationEndTeacherAvailabilityRangeArgs = {
  input: EndTeacherAvailabilityRangeInput;
};


export type MutationEnterClassroomArgs = {
  input: EnterClassroomInput;
};


export type MutationGrantRoleAssignmentArgs = {
  input: ChangeRoleAssignmentInput;
};


export type MutationGrantTeacherQualificationArgs = {
  input: ChangeTeacherQualificationInput;
};


export type MutationInviteToSponsorshipArgs = {
  input: InviteToSponsorshipInput;
};


export type MutationJoinWaitlistArgs = {
  input: JoinWaitlistInput;
};


export type MutationMarkNotificationReadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPlaceLessonUnitInCourseArgs = {
  input: ReorderLessonUnitInput;
};


export type MutationProcessSubscriptionProviderEventArgs = {
  input: ProcessSubscriptionProviderEventInput;
};


export type MutationPublishClassSessionArgs = {
  input: PublishClassSessionInput;
};


export type MutationReactivateUserArgs = {
  input: ReactivateUserInput;
};


export type MutationRecordAttendanceArgs = {
  input: RecordAttendanceInput;
};


export type MutationRedactLearningFeedbackArgs = {
  input: RedactLearningFeedbackInput;
};


export type MutationRedactSessionRatingCommentArgs = {
  input: RedactSessionRatingCommentInput;
};


export type MutationRememberRoleWorkspacePlaceArgs = {
  input: RememberRoleWorkspacePlaceInput;
};


export type MutationRemoveAvailabilityExceptionArgs = {
  input: RemoveAvailabilityExceptionInput;
};


export type MutationRemoveRoleAssignmentArgs = {
  input: ChangeRoleAssignmentInput;
};


export type MutationRemoveTeacherQualificationArgs = {
  input: ChangeTeacherQualificationInput;
};


export type MutationRenameCohortArgs = {
  input: RenameCohortInput;
};


export type MutationReportAbsenceArgs = {
  input: ReportAbsenceInput;
};


export type MutationRequestAttendanceReviewArgs = {
  input: RequestAttendanceReviewInput;
};


export type MutationRequestReportExportArgs = {
  input: RequestReportExportInput;
};


export type MutationRescheduleBookingArgs = {
  input: RescheduleBookingInput;
};


export type MutationResolveAdministratorTaskArgs = {
  input: ResolveAdministratorTaskInput;
};


export type MutationRetireLessonUnitArgs = {
  input: RetireLessonUnitInput;
};


export type MutationReviseCourseDetailsArgs = {
  input: UpdateCourseInput;
};


export type MutationReviseLessonMaterialArgs = {
  input: ReviseLessonMaterialInput;
};


export type MutationReviseLessonUnitIdentityArgs = {
  input: UpdateLessonUnitInput;
};


export type MutationSaveLearningFeedbackArgs = {
  input: SaveLearningFeedbackInput;
};


export type MutationSaveLocalizedTopicArgs = {
  input: UpsertTopicInput;
};


export type MutationSaveSessionRatingArgs = {
  input: SaveSessionRatingInput;
};


export type MutationSaveTeacherAvailabilityRangeArgs = {
  input: SaveTeacherAvailabilityRangeInput;
};


export type MutationSaveTeacherProfileArgs = {
  input: SaveTeacherProfileInput;
};


export type MutationSaveUserPreferencesArgs = {
  input: SaveUserPreferencesInput;
};


export type MutationScheduleSubscriptionCancellationArgs = {
  input: SubscriptionLifecycleInput;
};


export type MutationSetStudentPlacementArgs = {
  input: SetStudentPlacementInput;
};


export type MutationSubstituteTeacherArgs = {
  input: SubstituteTeacherInput;
};


export type MutationSuspendUserArgs = {
  input: ChangeUserAccessInput;
};


export type MutationUndoSubscriptionCancellationArgs = {
  input: SubscriptionLifecycleInput;
};


export type MutationWithdrawWaitlistArgs = {
  input: WithdrawWaitlistInput;
};

export enum NotificationChannel {
  Email = 'EMAIL',
  InApp = 'IN_APP'
}

export type Organization = {
  __typename?: 'Organization';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type OrganizationAttendanceAndProgressReport = {
  __typename?: 'OrganizationAttendanceAndProgressReport';
  attendance: OrganizationAttendanceSummary;
  cohorts: Array<OrganizationCohortReport>;
  generatedAt: Scalars['String']['output'];
  organization: Organization;
  students: Array<OrganizationSponsoredStudentReport>;
};

export type OrganizationAttendanceSummary = {
  __typename?: 'OrganizationAttendanceSummary';
  attendanceRatePercentage?: Maybe<Scalars['Int']['output']>;
  attendedCount: Scalars['Int']['output'];
  correctedCount: Scalars['Int']['output'];
  exceptionCount: Scalars['Int']['output'];
  excludedUnrecordedCount: Scalars['Int']['output'];
  noShowCount: Scalars['Int']['output'];
  recordedCount: Scalars['Int']['output'];
};

export type OrganizationCohortReport = {
  __typename?: 'OrganizationCohortReport';
  attendance: OrganizationAttendanceSummary;
  cohortId: Scalars['ID']['output'];
  cohortName: Scalars['String']['output'];
  sponsoredStudentCount: Scalars['Int']['output'];
};

export type OrganizationCourseProgressReport = {
  __typename?: 'OrganizationCourseProgressReport';
  baseline: OrganizationCourseProgressValue;
  baselineCapturedAt?: Maybe<Scalars['String']['output']>;
  completedLessonUnitGain: Scalars['Int']['output'];
  courseId: Scalars['ID']['output'];
  courseTitle: Scalars['String']['output'];
  currentEffective?: Maybe<OrganizationCourseProgressValue>;
  endingSnapshot?: Maybe<OrganizationCourseProgressValue>;
  endingSnapshotCapturedAt?: Maybe<Scalars['String']['output']>;
  lastRevisedAt?: Maybe<Scalars['String']['output']>;
  percentagePointGain: Scalars['Int']['output'];
  snapshotRevisionCount: Scalars['Int']['output'];
};

export type OrganizationCourseProgressValue = {
  __typename?: 'OrganizationCourseProgressValue';
  activeLessonUnitCount: Scalars['Int']['output'];
  completedActiveLessonUnitCount: Scalars['Int']['output'];
  percentage: Scalars['Int']['output'];
};

export type OrganizationSponsoredStudentReport = {
  __typename?: 'OrganizationSponsoredStudentReport';
  attendance: OrganizationAttendanceSummary;
  cohortNames: Array<Scalars['String']['output']>;
  courseProgress: Array<OrganizationCourseProgressReport>;
  reportingFrom: Scalars['String']['output'];
  reportingUntil?: Maybe<Scalars['String']['output']>;
  sponsorshipId: Scalars['ID']['output'];
  state: SponsorshipState;
  studentDisplayName: Scalars['String']['output'];
  studentUserId: Scalars['ID']['output'];
};

export type ProcessSubscriptionProviderEventInput = {
  effectiveAt: Scalars['String']['input'];
  eventType: SubscriptionProviderEventType;
  idempotencyKey: Scalars['ID']['input'];
  providerEventId: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
  studentUserId: Scalars['ID']['input'];
};

export type ProcessSubscriptionProviderEventResult = ProcessSubscriptionProviderEventSuccess | SubscriptionConflict;

export type ProcessSubscriptionProviderEventSuccess = {
  __typename?: 'ProcessSubscriptionProviderEventSuccess';
  account: ClassCreditAccount;
  subscription: Subscription;
};

export type PublicTeacherProfile = {
  __typename?: 'PublicTeacherProfile';
  completedSessionCount: Scalars['Int']['output'];
  displayName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  professionalBiography: Scalars['String']['output'];
  profileImageUrl?: Maybe<Scalars['String']['output']>;
  pronouns?: Maybe<Scalars['String']['output']>;
  qualifiedCurriculumLevels: Array<CurriculumLevel>;
  taughtLanguages: Array<Scalars['String']['output']>;
  teachingTopics: Array<Topic>;
};

export type PublishClassSessionInput = {
  idempotencyKey: Scalars['ID']['input'];
  lessonUnitId: Scalars['ID']['input'];
  schedulingTimeZone: Scalars['String']['input'];
  seatCapacity?: InputMaybe<Scalars['Int']['input']>;
  startsAtLocal: Scalars['String']['input'];
  teacherUserId: Scalars['ID']['input'];
  timeDisambiguation: LocalTimeDisambiguation;
};

export type PublishClassSessionResult = ClassSessionPublicationError | CurriculumConflict | PublishClassSessionSuccess;

export type PublishClassSessionSuccess = {
  __typename?: 'PublishClassSessionSuccess';
  classSession: ClassSession;
};

export type Query = {
  __typename?: 'Query';
  administrationAbsenceRequests: Array<AbsenceRequest>;
  administrationAttendanceReviewRequests: Array<AttendanceReviewRequest>;
  administrationClassCredits?: Maybe<ClassCreditAccount>;
  administrationClassSessions: Array<ClassSession>;
  administrationCurriculum: AdministrationCurriculum;
  administratorFeedbackAndRatings: Array<FeedbackAndRatingItem>;
  administratorTasks: Array<AdministratorTaskItem>;
  classRoster?: Maybe<ClassRoster>;
  classSessionDiscoveryOptions: ClassSessionDiscoveryOptions;
  discoverClassSessions: ClassSessionDiscoveryConnection;
  learningAccessClassSessions: Array<ClassSession>;
  learningAccessLessonUnits: Array<LearningAccessLessonUnit>;
  lessonMaterials?: Maybe<Array<LessonMaterial>>;
  marketplaceOperationalReport: MarketplaceOperationalReport;
  notifications: Array<InAppNotification>;
  organizationAttendanceAndProgressReport: OrganizationAttendanceAndProgressReport;
  organizationCohorts: Array<Cohort>;
  organizationSponsoredStudents: Array<Sponsorship>;
  organizationSponsorshipInvitations: Array<SponsorshipInvitation>;
  publicTeacherProfile?: Maybe<PublicTeacherProfile>;
  reportExportArtifact: ReportExportArtifact;
  reportExports: Array<ReportExport>;
  roleAssignmentAdministration: RoleAssignmentAdministration;
  roleWorkspace: RoleWorkspace;
  studentAttendanceRecords: Array<StudentAttendanceRecord>;
  studentBookings: Array<Booking>;
  studentClassCredits: ClassCreditAccount;
  studentCourseProgress: Array<CourseProgress>;
  studentFeedbackAndRatings: Array<FeedbackAndRatingItem>;
  studentPlacements: Array<StudentPlacement>;
  studentSponsorship?: Maybe<Sponsorship>;
  studentSponsorshipInvitations: Array<SponsorshipInvitation>;
  studentSubscription?: Maybe<Subscription>;
  studentWaitlistEntries: Array<WaitlistEntry>;
  studentWorkspace: StudentWorkspace;
  teacherAbsenceRequests: Array<AbsenceRequest>;
  teacherAttendanceClassSessions: Array<ClassSession>;
  teacherAvailability: TeacherAvailability;
  teacherAvailabilityPreview: Array<TeacherAvailabilityOccurrence>;
  teacherClassSessions: Array<ClassSession>;
  teacherFeedbackWork: Array<FeedbackAndRatingItem>;
};


export type QueryAdministrationClassCreditsArgs = {
  studentUserId: Scalars['ID']['input'];
};


export type QueryAdministrationCurriculumArgs = {
  locale: InterfaceLocale;
};


export type QueryClassRosterArgs = {
  actingRole: UserRole;
  classSessionId: Scalars['ID']['input'];
};


export type QueryDiscoverClassSessionsArgs = {
  input: ClassSessionDiscoveryInput;
};


export type QueryLearningAccessClassSessionsArgs = {
  actingRole: UserRole;
};


export type QueryLearningAccessLessonUnitsArgs = {
  actingRole: UserRole;
};


export type QueryLessonMaterialsArgs = {
  actingRole: UserRole;
  lessonUnitId: Scalars['ID']['input'];
};


export type QueryMarketplaceOperationalReportArgs = {
  input?: InputMaybe<MarketplaceOperationalReportInput>;
};


export type QueryOrganizationAttendanceAndProgressReportArgs = {
  cohortId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryPublicTeacherProfileArgs = {
  locale: InterfaceLocale;
  teacherUserId: Scalars['ID']['input'];
};


export type QueryReportExportArtifactArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRoleWorkspaceArgs = {
  actingRole: UserRole;
};


export type QueryTeacherAvailabilityPreviewArgs = {
  localDates: Array<Scalars['String']['input']>;
};

export type ReactivateUserInput = {
  idempotencyKey: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type ReactivateUserResult = UserAccessChangeSuccess | UserAccessError;

export type RecordAttendanceInput = {
  classSessionId: Scalars['ID']['input'];
  idempotencyKey: Scalars['ID']['input'];
  records: Array<AttendanceRecordInput>;
};

export type RecordAttendanceResult = AttendanceError | RecordAttendanceSuccess;

export type RecordAttendanceSuccess = {
  __typename?: 'RecordAttendanceSuccess';
  classRoster: ClassRoster;
};

export type RedactLearningFeedbackInput = {
  bookingId: Scalars['ID']['input'];
  idempotencyKey: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
};

export type RedactLearningFeedbackResult = LearningFeedbackError | RedactLearningFeedbackSuccess;

export type RedactLearningFeedbackSuccess = {
  __typename?: 'RedactLearningFeedbackSuccess';
  feedback: LearningFeedback;
};

export type RedactSessionRatingCommentInput = {
  bookingId: Scalars['ID']['input'];
  idempotencyKey: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
};

export type RedactSessionRatingCommentResult = RedactSessionRatingCommentSuccess | SessionRatingError;

export type RedactSessionRatingCommentSuccess = {
  __typename?: 'RedactSessionRatingCommentSuccess';
  rating: SessionRating;
};

export type RememberRoleWorkspacePlaceInput = {
  actingRole: UserRole;
  place: WorkspacePlace;
};

export type RemoveAvailabilityExceptionInput = {
  exceptionId: Scalars['ID']['input'];
  idempotencyKey: Scalars['ID']['input'];
};

export type RemoveAvailabilityExceptionResult = RemoveAvailabilityExceptionSuccess | TeacherAvailabilityValidationError;

export type RemoveAvailabilityExceptionSuccess = {
  __typename?: 'RemoveAvailabilityExceptionSuccess';
  exceptionId: Scalars['ID']['output'];
};

export type RemoveRoleAssignmentResult = RoleAssignmentChangeSuccess | RoleAssignmentError;

export type RemoveTeacherQualificationResult = ChangeTeacherQualificationSuccess | CurriculumConflict | TeacherQualificationRemovalBlocked;

export type RenameCohortInput = {
  cohortId: Scalars['ID']['input'];
  idempotencyKey: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type RenameCohortResult = CohortError | CohortSuccess;

export type ReorderLessonUnitInput = {
  lessonUnitId: Scalars['ID']['input'];
  order: Scalars['Int']['input'];
};

export type ReorderLessonUnitResult = CurriculumConflict | ReorderLessonUnitSuccess;

export type ReorderLessonUnitSuccess = {
  __typename?: 'ReorderLessonUnitSuccess';
  lessonUnit: LessonUnit;
};

export type ReportAbsenceInput = {
  classSessionIds: Array<Scalars['ID']['input']>;
  idempotencyKey: Scalars['ID']['input'];
};

export type ReportAbsenceResult = ClassSessionDisruptionError | ReportAbsenceSuccess;

export type ReportAbsenceSuccess = {
  __typename?: 'ReportAbsenceSuccess';
  absenceRequest: AbsenceRequest;
};

export type ReportExport = {
  __typename?: 'ReportExport';
  actingRole: ReportExportActingRole;
  completedAt?: Maybe<Scalars['String']['output']>;
  contentDigest?: Maybe<Scalars['String']['output']>;
  dataAsOf?: Maybe<Scalars['String']['output']>;
  downloadable: Scalars['Boolean']['output'];
  expiresAt?: Maybe<Scalars['String']['output']>;
  failureReasonCode?: Maybe<ReportExportFailureReason>;
  id: Scalars['ID']['output'];
  kind: ReportExportKind;
  periodEndExclusiveLocalDate: Scalars['String']['output'];
  periodStartLocalDate: Scalars['String']['output'];
  requestedAt: Scalars['String']['output'];
  rowCount?: Maybe<Scalars['Int']['output']>;
  schemaVersion: Scalars['String']['output'];
  startedAt?: Maybe<Scalars['String']['output']>;
  state: ReportExportState;
  timeZone: Scalars['String']['output'];
};

export enum ReportExportActingRole {
  OrganizationManager = 'ORGANIZATION_MANAGER',
  PlatformAdministrator = 'PLATFORM_ADMINISTRATOR'
}

export type ReportExportArtifact = {
  __typename?: 'ReportExportArtifact';
  contentType: Scalars['String']['output'];
  csv: Scalars['String']['output'];
  fileName: Scalars['String']['output'];
  reportExport: ReportExport;
};

export type ReportExportError = {
  __typename?: 'ReportExportError';
  code: ReportExportErrorCode;
  message: Scalars['String']['output'];
};

export enum ReportExportErrorCode {
  CorrectionHistoryNotAuthorized = 'CORRECTION_HISTORY_NOT_AUTHORIZED',
  DisplayTimeZoneRequired = 'DISPLAY_TIME_ZONE_REQUIRED',
  ExportAlreadyInProgress = 'EXPORT_ALREADY_IN_PROGRESS',
  IdempotencyKeyReused = 'IDEMPOTENCY_KEY_REUSED',
  InvalidReportRange = 'INVALID_REPORT_RANGE',
  ReportExportNotDownloadable = 'REPORT_EXPORT_NOT_DOWNLOADABLE',
  ReportExportNotFound = 'REPORT_EXPORT_NOT_FOUND'
}

export enum ReportExportFailureReason {
  AuthorizationRevoked = 'AUTHORIZATION_REVOKED',
  GenerationFailed = 'GENERATION_FAILED',
  RowLimitExceeded = 'ROW_LIMIT_EXCEEDED'
}

export enum ReportExportKind {
  CorrectionHistory = 'CORRECTION_HISTORY',
  Ordinary = 'ORDINARY'
}

export enum ReportExportState {
  Completed = 'COMPLETED',
  Expired = 'EXPIRED',
  Failed = 'FAILED',
  Queued = 'QUEUED',
  Running = 'RUNNING'
}

export type RequestAttendanceReviewInput = {
  bookingId: Scalars['ID']['input'];
  explanation?: InputMaybe<Scalars['String']['input']>;
  idempotencyKey: Scalars['ID']['input'];
};

export type RequestAttendanceReviewResult = AttendanceReviewError | RequestAttendanceReviewSuccess;

export type RequestAttendanceReviewSuccess = {
  __typename?: 'RequestAttendanceReviewSuccess';
  attendanceReviewRequest: AttendanceReviewRequest;
};

export type RequestReportExportInput = {
  fromLocalDate: Scalars['String']['input'];
  idempotencyKey: Scalars['ID']['input'];
  kind: ReportExportKind;
  toLocalDate: Scalars['String']['input'];
};

export type RequestReportExportResult = ReportExportError | RequestReportExportSuccess;

export type RequestReportExportSuccess = {
  __typename?: 'RequestReportExportSuccess';
  reportExport: ReportExport;
};

export type RescheduleBookingInput = {
  bookingId: Scalars['ID']['input'];
  idempotencyKey: Scalars['ID']['input'];
  replacementClassSessionId: Scalars['ID']['input'];
};

export type RescheduleBookingResult = BookingError | RescheduleBookingSuccess;

export type RescheduleBookingSuccess = {
  __typename?: 'RescheduleBookingSuccess';
  account: ClassCreditAccount;
  originalBooking: Booking;
  replacementBooking: Booking;
};

export type ResolveAdministratorTaskInput = {
  idempotencyKey: Scalars['String']['input'];
  reason: Scalars['String']['input'];
  taskId: Scalars['ID']['input'];
};

export type ResolveAdministratorTaskResult = AdministratorTaskError | ResolveAdministratorTaskSuccess;

export type ResolveAdministratorTaskSuccess = {
  __typename?: 'ResolveAdministratorTaskSuccess';
  task: AdministratorTaskItem;
};

export type RetireLessonUnitInput = {
  idempotencyKey: Scalars['ID']['input'];
  lessonUnitId: Scalars['ID']['input'];
  replacementLessonUnitId?: InputMaybe<Scalars['ID']['input']>;
};

export type RetireLessonUnitResult = CurriculumConflict | RetireLessonUnitSuccess;

export type RetireLessonUnitSuccess = {
  __typename?: 'RetireLessonUnitSuccess';
  lessonUnit: LessonUnit;
};

export type ReviseLessonMaterialInput = {
  httpsUrl?: InputMaybe<Scalars['String']['input']>;
  idempotencyKey: Scalars['ID']['input'];
  kind: LessonMaterialKind;
  materialId: Scalars['ID']['input'];
  publisher?: InputMaybe<Scalars['String']['input']>;
  structuredContent?: InputMaybe<Array<StructuredTextBlockInput>>;
  title: Scalars['String']['input'];
};

export type ReviseLessonMaterialResult = CurriculumConflict | InvalidLessonMaterial | ReviseLessonMaterialSuccess;

export type ReviseLessonMaterialSuccess = {
  __typename?: 'ReviseLessonMaterialSuccess';
  material: LessonMaterial;
};

export type RoleAssignmentAdministration = {
  __typename?: 'RoleAssignmentAdministration';
  organizations: Array<Organization>;
  users: Array<RoleAssignmentAdministrationUser>;
};

export type RoleAssignmentAdministrationUser = {
  __typename?: 'RoleAssignmentAdministrationUser';
  accessStatus: UserAccessStatus;
  displayName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  roleAssignmentHistory: Array<RoleAssignmentChange>;
  roles: Array<UserRole>;
  suspensionReason?: Maybe<Scalars['String']['output']>;
};

export type RoleAssignmentChange = {
  __typename?: 'RoleAssignmentChange';
  action: RoleAssignmentChangeAction;
  changedAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  reason: Scalars['String']['output'];
  role: UserRole;
};

export enum RoleAssignmentChangeAction {
  Granted = 'GRANTED',
  Removed = 'REMOVED'
}

export type RoleAssignmentChangeSuccess = {
  __typename?: 'RoleAssignmentChangeSuccess';
  endedBookingCount: Scalars['Int']['output'];
  refundedClassCreditCount: Scalars['Int']['output'];
  removedWaitlistEntryCount: Scalars['Int']['output'];
  sponsorshipEnded: Scalars['Boolean']['output'];
  subscriptionEnded: Scalars['Boolean']['output'];
  user: RoleAssignmentAdministrationUser;
};

export type RoleAssignmentError = {
  __typename?: 'RoleAssignmentError';
  classSessionIds: Array<Scalars['ID']['output']>;
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type RolePlace = {
  __typename?: 'RolePlace';
  place: WorkspacePlace;
  role: UserRole;
};

export type RoleWorkspace = {
  __typename?: 'RoleWorkspace';
  actingRole: UserRole;
  relationshipScope: WorkspaceRelationshipScope;
  rolePlaces: Array<RolePlace>;
  user: User;
};

export type SaveLearningFeedbackInput = {
  bookingId: Scalars['ID']['input'];
  idempotencyKey: Scalars['ID']['input'];
  nextPractice?: InputMaybe<Scalars['String']['input']>;
  observations?: InputMaybe<Scalars['String']['input']>;
  observedStrengths: Array<FeedbackSkill>;
  submit: Scalars['Boolean']['input'];
  suggestedFocuses: Array<FeedbackSkill>;
};

export type SaveLearningFeedbackResult = LearningFeedbackError | SaveLearningFeedbackSuccess;

export type SaveLearningFeedbackSuccess = {
  __typename?: 'SaveLearningFeedbackSuccess';
  feedback: LearningFeedback;
};

export type SaveSessionRatingInput = {
  bookingId: Scalars['ID']['input'];
  comment?: InputMaybe<Scalars['String']['input']>;
  idempotencyKey: Scalars['ID']['input'];
  improvementTags: Array<SessionRatingImprovementTag>;
  overallRating: Scalars['Int']['input'];
  positiveTags: Array<SessionRatingPositiveTag>;
};

export type SaveSessionRatingResult = SaveSessionRatingSuccess | SessionRatingError;

export type SaveSessionRatingSuccess = {
  __typename?: 'SaveSessionRatingSuccess';
  rating: SessionRating;
};

export type SaveTeacherAvailabilityRangeInput = {
  effectiveFrom: Scalars['String']['input'];
  endLocalTime: Scalars['String']['input'];
  idempotencyKey: Scalars['ID']['input'];
  startLocalTime: Scalars['String']['input'];
  timeZone: Scalars['String']['input'];
  weekday: Weekday;
};

export type SaveTeacherAvailabilityRangeResult = SaveTeacherAvailabilityRangeSuccess | TeacherAvailabilityValidationError;

export type SaveTeacherAvailabilityRangeSuccess = {
  __typename?: 'SaveTeacherAvailabilityRangeSuccess';
  range: TeacherAvailabilityRange;
};

export type SaveTeacherProfileInput = {
  idempotencyKey: Scalars['ID']['input'];
  professionalBiography: Scalars['String']['input'];
  profileImageUrl?: InputMaybe<Scalars['String']['input']>;
  pronouns?: InputMaybe<Scalars['String']['input']>;
  teacherUserId: Scalars['ID']['input'];
  topicKeys: Array<Scalars['String']['input']>;
};

export type SaveTeacherProfileSuccess = {
  __typename?: 'SaveTeacherProfileSuccess';
  teacherProfile: PublicTeacherProfile;
};

export type SaveUserPreferencesInput = {
  actingRole: UserRole;
  displayTimeZone: Scalars['String']['input'];
  interfaceLocale: InterfaceLocale;
};

export type SaveUserPreferencesPayload = {
  __typename?: 'SaveUserPreferencesPayload';
  user: User;
};

export type ScheduleSubscriptionCancellationResult = ScheduleSubscriptionCancellationSuccess | SubscriptionConflict;

export type ScheduleSubscriptionCancellationSuccess = {
  __typename?: 'ScheduleSubscriptionCancellationSuccess';
  subscription: Subscription;
};

export type SessionRating = {
  __typename?: 'SessionRating';
  bookingId: Scalars['ID']['output'];
  comment: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  improvementTags: Array<SessionRatingImprovementTag>;
  overallRating: Scalars['Int']['output'];
  positiveTags: Array<SessionRatingPositiveTag>;
  redactedAt?: Maybe<Scalars['String']['output']>;
  redactionReason?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type SessionRatingError = {
  __typename?: 'SessionRatingError';
  code: SessionRatingErrorCode;
  message: Scalars['String']['output'];
};

export enum SessionRatingErrorCode {
  BookingNotFound = 'BOOKING_NOT_FOUND',
  IdempotencyKeyReused = 'IDEMPOTENCY_KEY_REUSED',
  InvalidRating = 'INVALID_RATING',
  InvalidReason = 'INVALID_REASON',
  RatingNotFound = 'RATING_NOT_FOUND',
  RatingWindowClosed = 'RATING_WINDOW_CLOSED'
}

export enum SessionRatingImprovementTag {
  AudioQuality = 'AUDIO_QUALITY',
  MoreCorrection = 'MORE_CORRECTION',
  MoreSpeakingTime = 'MORE_SPEAKING_TIME',
  Pacing = 'PACING'
}

export enum SessionRatingPositiveTag {
  ClearExplanations = 'CLEAR_EXPLANATIONS',
  Engaging = 'ENGAGING',
  Supportive = 'SUPPORTIVE',
  UsefulPractice = 'USEFUL_PRACTICE'
}

export type SetStudentPlacementInput = {
  curriculumLevel: CurriculumLevel;
  targetLanguage: Scalars['String']['input'];
};

export type Sponsorship = {
  __typename?: 'Sponsorship';
  acceptedAt: Scalars['String']['output'];
  endedAt?: Maybe<Scalars['String']['output']>;
  endedByParty?: Maybe<SponsorshipEndingParty>;
  id: Scalars['ID']['output'];
  nextAnniversaryAt?: Maybe<Scalars['String']['output']>;
  organization: Organization;
  progressSnapshots: Array<CourseProgressSnapshot>;
  reportingFrom: Scalars['String']['output'];
  reportingUntil?: Maybe<Scalars['String']['output']>;
  state: SponsorshipState;
  studentDisplayName: Scalars['String']['output'];
  studentUserId: Scalars['ID']['output'];
};

export type SponsorshipBoundaryError = {
  __typename?: 'SponsorshipBoundaryError';
  code: SponsorshipBoundaryErrorCode;
  message: Scalars['String']['output'];
};

export enum SponsorshipBoundaryErrorCode {
  IdempotencyKeyReused = 'IDEMPOTENCY_KEY_REUSED',
  SponsorshipAlreadyEnded = 'SPONSORSHIP_ALREADY_ENDED',
  SponsorshipNotFound = 'SPONSORSHIP_NOT_FOUND'
}

export type SponsorshipDisclosure = {
  __typename?: 'SponsorshipDisclosure';
  benefitDescription: Scalars['String']['output'];
  excludedPrivateDataDescription: Scalars['String']['output'];
  organizationVisibleDataDescription: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

export enum SponsorshipEndingParty {
  Organization = 'ORGANIZATION',
  Student = 'STUDENT'
}

export type SponsorshipInvitation = {
  __typename?: 'SponsorshipInvitation';
  createdAt: Scalars['String']['output'];
  decidedAt?: Maybe<Scalars['String']['output']>;
  disclosure: SponsorshipDisclosure;
  expiresAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  organization: Organization;
  state: SponsorshipInvitationState;
  studentDisplayName: Scalars['String']['output'];
  studentUserId: Scalars['ID']['output'];
};

export type SponsorshipInvitationError = {
  __typename?: 'SponsorshipInvitationError';
  code: SponsorshipInvitationErrorCode;
  message: Scalars['String']['output'];
};

export enum SponsorshipInvitationErrorCode {
  IdempotencyKeyReused = 'IDEMPOTENCY_KEY_REUSED',
  InvitationAlreadyPending = 'INVITATION_ALREADY_PENDING',
  StudentAlreadySponsored = 'STUDENT_ALREADY_SPONSORED',
  StudentNotFound = 'STUDENT_NOT_FOUND'
}

export type SponsorshipInvitationResponseError = {
  __typename?: 'SponsorshipInvitationResponseError';
  code: SponsorshipInvitationResponseErrorCode;
  message: Scalars['String']['output'];
};

export enum SponsorshipInvitationResponseErrorCode {
  IdempotencyKeyReused = 'IDEMPOTENCY_KEY_REUSED',
  InvitationExpired = 'INVITATION_EXPIRED',
  InvitationNotFound = 'INVITATION_NOT_FOUND',
  InvitationNotPending = 'INVITATION_NOT_PENDING',
  SponsorshipAlreadyActive = 'SPONSORSHIP_ALREADY_ACTIVE'
}

export type SponsorshipInvitationResponseInput = {
  idempotencyKey: Scalars['ID']['input'];
  invitationId: Scalars['ID']['input'];
};

export enum SponsorshipInvitationState {
  Accepted = 'ACCEPTED',
  Declined = 'DECLINED',
  Expired = 'EXPIRED',
  Pending = 'PENDING'
}

export enum SponsorshipState {
  Active = 'ACTIVE',
  Ended = 'ENDED'
}

export type StructuredTextBlockInput = {
  items?: InputMaybe<Array<Scalars['String']['input']>>;
  level?: InputMaybe<Scalars['Int']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  type: Scalars['String']['input'];
};

export type StudentAttendanceRecord = {
  __typename?: 'StudentAttendanceRecord';
  bookingId: Scalars['ID']['output'];
  classSessionId: Scalars['ID']['output'];
  classSessionStartsAt: Scalars['String']['output'];
  correctedAt?: Maybe<Scalars['String']['output']>;
  correctionCount: Scalars['Int']['output'];
  outcome: AttendanceOutcome;
  publishedAt: Scalars['String']['output'];
  reviewDeadline: Scalars['String']['output'];
  reviewRequest?: Maybe<AttendanceReviewRequest>;
  reviewRequestOpen: Scalars['Boolean']['output'];
  teacherDisplayName: Scalars['String']['output'];
};

export type StudentPlacement = {
  __typename?: 'StudentPlacement';
  curriculumLevel: CurriculumLevel;
  targetLanguage: Scalars['String']['output'];
};

export type StudentWorkspace = {
  __typename?: 'StudentWorkspace';
  roles: Array<UserRole>;
  user: User;
};

export type Subscription = {
  __typename?: 'Subscription';
  accountingTimeUtc: Scalars['String']['output'];
  activatedAt: Scalars['String']['output'];
  anchorDay: Scalars['Int']['output'];
  cancellationEffectiveAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  nextAnniversaryAt?: Maybe<Scalars['String']['output']>;
  state: SubscriptionState;
  studentUserId: Scalars['ID']['output'];
};

export type SubscriptionConflict = {
  __typename?: 'SubscriptionConflict';
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type SubscriptionLifecycleInput = {
  idempotencyKey: Scalars['ID']['input'];
};

export enum SubscriptionProviderEventType {
  Activated = 'ACTIVATED',
  Cancelled = 'CANCELLED',
  Reactivated = 'REACTIVATED',
  Renewed = 'RENEWED'
}

export enum SubscriptionState {
  Active = 'ACTIVE',
  CancellationScheduled = 'CANCELLATION_SCHEDULED',
  Cancelled = 'CANCELLED'
}

export type SubstituteTeacherInput = {
  absenceRequestId: Scalars['ID']['input'];
  classSessionId: Scalars['ID']['input'];
  idempotencyKey: Scalars['ID']['input'];
  replacementTeacherUserId: Scalars['ID']['input'];
};

export type SubstituteTeacherResult = ClassSessionDisruptionError | SubstituteTeacherSuccess;

export type SubstituteTeacherSuccess = {
  __typename?: 'SubstituteTeacherSuccess';
  absenceRequest: AbsenceRequest;
  classSession: ClassSession;
};

export type SuspendUserResult = UserAccessChangeSuccess | UserAccessError;

export type TeacherAvailability = {
  __typename?: 'TeacherAvailability';
  exceptions: Array<AvailabilityException>;
  timeZone: Scalars['String']['output'];
  weeklyRanges: Array<TeacherAvailabilityRange>;
};

export type TeacherAvailabilityOccurrence = {
  __typename?: 'TeacherAvailabilityOccurrence';
  endLocalTime: Scalars['String']['output'];
  endsAt: Scalars['String']['output'];
  localDate: Scalars['String']['output'];
  rangeId: Scalars['ID']['output'];
  startLocalTime: Scalars['String']['output'];
  startsAt: Scalars['String']['output'];
};

export type TeacherAvailabilityRange = {
  __typename?: 'TeacherAvailabilityRange';
  effectiveFrom: Scalars['String']['output'];
  effectiveUntil?: Maybe<Scalars['String']['output']>;
  endLocalTime: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  startLocalTime: Scalars['String']['output'];
  timeZone: Scalars['String']['output'];
  weekday: Weekday;
};

export type TeacherAvailabilityValidationError = {
  __typename?: 'TeacherAvailabilityValidationError';
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type TeacherQualification = {
  __typename?: 'TeacherQualification';
  curriculumLevel: CurriculumLevel;
  targetLanguage: Scalars['String']['output'];
};

export type TeacherQualificationRemovalBlocked = {
  __typename?: 'TeacherQualificationRemovalBlocked';
  classSessionIds: Array<Scalars['ID']['output']>;
  code: Scalars['String']['output'];
};

export type Topic = {
  __typename?: 'Topic';
  key: Scalars['String']['output'];
  label: Scalars['String']['output'];
  labelEn: Scalars['String']['output'];
  labelEs: Scalars['String']['output'];
};

export type UndoSubscriptionCancellationResult = SubscriptionConflict | UndoSubscriptionCancellationSuccess;

export type UndoSubscriptionCancellationSuccess = {
  __typename?: 'UndoSubscriptionCancellationSuccess';
  subscription: Subscription;
};

export type UpdateCourseInput = {
  courseId: Scalars['ID']['input'];
  summary: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type UpdateCourseResult = CurriculumConflict | UpdateCourseSuccess;

export type UpdateCourseSuccess = {
  __typename?: 'UpdateCourseSuccess';
  course: Course;
};

export type UpdateLessonUnitInput = {
  lessonUnitId: Scalars['ID']['input'];
  objectives: Array<Scalars['String']['input']>;
  summary: Scalars['String']['input'];
  title: Scalars['String']['input'];
  topicKeys: Array<Scalars['String']['input']>;
};

export type UpdateLessonUnitResult = CurriculumConflict | InstructionalIdentityLocked | UpdateLessonUnitSuccess;

export type UpdateLessonUnitSuccess = {
  __typename?: 'UpdateLessonUnitSuccess';
  lessonUnit: LessonUnit;
};

export type UpsertTopicInput = {
  idempotencyKey: Scalars['ID']['input'];
  key: Scalars['String']['input'];
  labelEn: Scalars['String']['input'];
  labelEs: Scalars['String']['input'];
};

export type UpsertTopicSuccess = {
  __typename?: 'UpsertTopicSuccess';
  topic: Topic;
};

export type User = {
  __typename?: 'User';
  displayName: Scalars['String']['output'];
  displayTimeZone?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  interfaceLocale?: Maybe<InterfaceLocale>;
};

export type UserAccessChangeSuccess = {
  __typename?: 'UserAccessChangeSuccess';
  endedBookingCount: Scalars['Int']['output'];
  refundedClassCreditCount: Scalars['Int']['output'];
  removedWaitlistEntryCount: Scalars['Int']['output'];
  teacherClassSessionIds: Array<Scalars['ID']['output']>;
  user: RoleAssignmentAdministrationUser;
};

export type UserAccessError = {
  __typename?: 'UserAccessError';
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export enum UserAccessStatus {
  Active = 'ACTIVE',
  Suspended = 'SUSPENDED'
}

export enum UserRole {
  OrganizationManager = 'ORGANIZATION_MANAGER',
  PlatformAdministrator = 'PLATFORM_ADMINISTRATOR',
  Student = 'STUDENT',
  Teacher = 'TEACHER'
}

export type WaitlistEntry = {
  __typename?: 'WaitlistEntry';
  classSession: ClassSession;
  completedAt?: Maybe<Scalars['String']['output']>;
  expiresAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  joinedAt: Scalars['String']['output'];
  resultingBooking?: Maybe<Booking>;
  state: WaitlistEntryState;
  terminalReason?: Maybe<WaitlistTerminalReason>;
};

export enum WaitlistEntryState {
  Active = 'ACTIVE',
  Expired = 'EXPIRED',
  Ineligible = 'INELIGIBLE',
  Promoted = 'PROMOTED',
  Withdrawn = 'WITHDRAWN'
}

export type WaitlistError = {
  __typename?: 'WaitlistError';
  code: WaitlistErrorCode;
  message: Scalars['String']['output'];
};

export enum WaitlistErrorCode {
  AlreadyBooked = 'ALREADY_BOOKED',
  AlreadyWaitlisted = 'ALREADY_WAITLISTED',
  ClassSessionNotFound = 'CLASS_SESSION_NOT_FOUND',
  IdempotencyKeyReused = 'IDEMPOTENCY_KEY_REUSED',
  InsufficientClassCredits = 'INSUFFICIENT_CLASS_CREDITS',
  ScheduleConflict = 'SCHEDULE_CONFLICT',
  SessionNotFull = 'SESSION_NOT_FULL',
  WaitlistEntryNotActive = 'WAITLIST_ENTRY_NOT_ACTIVE',
  WaitlistEntryNotFound = 'WAITLIST_ENTRY_NOT_FOUND',
  WaitlistNotOpen = 'WAITLIST_NOT_OPEN'
}

export type WaitlistPromotionWon = {
  __typename?: 'WaitlistPromotionWon';
  booking: Booking;
};

export enum WaitlistTerminalReason {
  AlreadyBooked = 'ALREADY_BOOKED',
  ClassSessionUnavailable = 'CLASS_SESSION_UNAVAILABLE',
  Expired = 'EXPIRED',
  InsufficientClassCredits = 'INSUFFICIENT_CLASS_CREDITS',
  Promoted = 'PROMOTED',
  RoleAssignmentRemoval = 'ROLE_ASSIGNMENT_REMOVAL',
  ScheduleConflict = 'SCHEDULE_CONFLICT',
  Withdrawn = 'WITHDRAWN'
}

export enum Weekday {
  Friday = 'FRIDAY',
  Monday = 'MONDAY',
  Saturday = 'SATURDAY',
  Sunday = 'SUNDAY',
  Thursday = 'THURSDAY',
  Tuesday = 'TUESDAY',
  Wednesday = 'WEDNESDAY'
}

export type WithdrawWaitlistInput = {
  idempotencyKey: Scalars['ID']['input'];
  waitlistEntryId: Scalars['ID']['input'];
};

export type WithdrawWaitlistResult = WaitlistError | WaitlistPromotionWon | WithdrawWaitlistSuccess;

export type WithdrawWaitlistSuccess = {
  __typename?: 'WithdrawWaitlistSuccess';
  entry: WaitlistEntry;
};

export enum WorkspacePlace {
  AdministrationOperations = 'ADMINISTRATION_OPERATIONS',
  AdministrationPeople = 'ADMINISTRATION_PEOPLE',
  AdministrationReports = 'ADMINISTRATION_REPORTS',
  OrganizationReports = 'ORGANIZATION_REPORTS',
  OrganizationStudents = 'ORGANIZATION_STUDENTS',
  StudentDiscovery = 'STUDENT_DISCOVERY',
  StudentLearning = 'STUDENT_LEARNING',
  TeacherAvailability = 'TEACHER_AVAILABILITY',
  TeacherSchedule = 'TEACHER_SCHEDULE'
}

export enum WorkspaceRelationshipScope {
  AssignedClassSessions = 'ASSIGNED_CLASS_SESSIONS',
  AssignedOrganization = 'ASSIGNED_ORGANIZATION',
  MarketplaceWide = 'MARKETPLACE_WIDE',
  Self = 'SELF'
}



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping of union types */
export type ResolversUnionTypes<_RefType extends Record<string, unknown>> = {
  AcceptSponsorshipInvitationResult:
    | ( AcceptSponsorshipInvitationSuccess )
    | ( SponsorshipInvitationResponseError )
  ;
  AddAvailabilityExceptionResult:
    | ( AddAvailabilityExceptionSuccess )
    | ( AvailabilityExceptionSessionConflict )
    | ( TeacherAvailabilityValidationError )
  ;
  AddCohortMembershipResult:
    | ( CohortError )
    | ( CohortMembershipSuccess )
  ;
  AddLessonMaterialResult:
    | ( AddLessonMaterialSuccess )
    | ( CurriculumConflict )
    | ( InvalidLessonMaterial )
  ;
  AdjustClassCreditsResult:
    | ( AdjustClassCreditsSuccess )
    | ( ClassCreditAdjustmentError )
    | ( CurriculumConflict )
  ;
  BookClassSessionResult:
    | ( BookClassSessionSuccess )
    | ( BookingError )
  ;
  CancelBookingResult:
    | ( BookingError )
    | ( CancelBookingSuccess )
  ;
  CancelClassSessionResult:
    | ( CancelClassSessionSuccess )
    | ( ClassSessionDisruptionError )
  ;
  ChangeClassSessionSeatCapacityResult:
    | ( ChangeClassSessionSeatCapacitySuccess )
    | ( ClassSessionSeatCapacityError )
    | ( CurriculumConflict )
  ;
  CreateCohortResult:
    | ( CohortError )
    | ( CohortSuccess )
  ;
  CreateCourseResult:
    | ( CreateCourseSuccess )
    | ( CurriculumConflict )
  ;
  CreateLessonUnitResult:
    | ( CreateLessonUnitSuccess )
    | ( CurriculumConflict )
  ;
  DecideAttendanceReviewResult:
    | ( AttendanceReviewError )
    | ( DecideAttendanceReviewSuccess )
  ;
  DeclineSponsorshipInvitationResult:
    | ( DeclineSponsorshipInvitationSuccess )
    | ( SponsorshipInvitationResponseError )
  ;
  EndCohortMembershipResult:
    | ( CohortError )
    | ( CohortMembershipSuccess )
  ;
  EndSponsorshipAsOrganizationResult:
    | ( EndSponsorshipAsOrganizationSuccess )
    | ( SponsorshipBoundaryError )
  ;
  EndSponsorshipAsStudentResult:
    | ( EndSponsorshipAsStudentSuccess )
    | ( SponsorshipBoundaryError )
  ;
  EndTeacherAvailabilityRangeResult:
    | ( EndTeacherAvailabilityRangeSuccess )
    | ( TeacherAvailabilityValidationError )
  ;
  EnterClassroomResult:
    | ( ClassroomAccessError )
    | ( EnterClassroomSuccess )
  ;
  GrantRoleAssignmentResult:
    | ( RoleAssignmentChangeSuccess )
    | ( RoleAssignmentError )
  ;
  GrantTeacherQualificationResult:
    | ( ChangeTeacherQualificationSuccess )
    | ( CurriculumConflict )
  ;
  InviteToSponsorshipResult:
    | ( InviteToSponsorshipSuccess )
    | ( SponsorshipInvitationError )
  ;
  JoinWaitlistResult:
    | ( JoinWaitlistSuccess )
    | ( WaitlistError )
  ;
  ProcessSubscriptionProviderEventResult:
    | ( ProcessSubscriptionProviderEventSuccess )
    | ( SubscriptionConflict )
  ;
  PublishClassSessionResult:
    | ( ClassSessionPublicationError )
    | ( CurriculumConflict )
    | ( PublishClassSessionSuccess )
  ;
  ReactivateUserResult:
    | ( UserAccessChangeSuccess )
    | ( UserAccessError )
  ;
  RecordAttendanceResult:
    | ( AttendanceError )
    | ( RecordAttendanceSuccess )
  ;
  RedactLearningFeedbackResult:
    | ( LearningFeedbackError )
    | ( RedactLearningFeedbackSuccess )
  ;
  RedactSessionRatingCommentResult:
    | ( RedactSessionRatingCommentSuccess )
    | ( SessionRatingError )
  ;
  RemoveAvailabilityExceptionResult:
    | ( RemoveAvailabilityExceptionSuccess )
    | ( TeacherAvailabilityValidationError )
  ;
  RemoveRoleAssignmentResult:
    | ( RoleAssignmentChangeSuccess )
    | ( RoleAssignmentError )
  ;
  RemoveTeacherQualificationResult:
    | ( ChangeTeacherQualificationSuccess )
    | ( CurriculumConflict )
    | ( TeacherQualificationRemovalBlocked )
  ;
  RenameCohortResult:
    | ( CohortError )
    | ( CohortSuccess )
  ;
  ReorderLessonUnitResult:
    | ( CurriculumConflict )
    | ( ReorderLessonUnitSuccess )
  ;
  ReportAbsenceResult:
    | ( ClassSessionDisruptionError )
    | ( ReportAbsenceSuccess )
  ;
  RequestAttendanceReviewResult:
    | ( AttendanceReviewError )
    | ( RequestAttendanceReviewSuccess )
  ;
  RequestReportExportResult:
    | ( ReportExportError )
    | ( RequestReportExportSuccess )
  ;
  RescheduleBookingResult:
    | ( BookingError )
    | ( RescheduleBookingSuccess )
  ;
  ResolveAdministratorTaskResult:
    | ( AdministratorTaskError )
    | ( ResolveAdministratorTaskSuccess )
  ;
  RetireLessonUnitResult:
    | ( CurriculumConflict )
    | ( RetireLessonUnitSuccess )
  ;
  ReviseLessonMaterialResult:
    | ( CurriculumConflict )
    | ( InvalidLessonMaterial )
    | ( ReviseLessonMaterialSuccess )
  ;
  SaveLearningFeedbackResult:
    | ( LearningFeedbackError )
    | ( SaveLearningFeedbackSuccess )
  ;
  SaveSessionRatingResult:
    | ( SaveSessionRatingSuccess )
    | ( SessionRatingError )
  ;
  SaveTeacherAvailabilityRangeResult:
    | ( SaveTeacherAvailabilityRangeSuccess )
    | ( TeacherAvailabilityValidationError )
  ;
  ScheduleSubscriptionCancellationResult:
    | ( ScheduleSubscriptionCancellationSuccess )
    | ( SubscriptionConflict )
  ;
  SubstituteTeacherResult:
    | ( ClassSessionDisruptionError )
    | ( SubstituteTeacherSuccess )
  ;
  SuspendUserResult:
    | ( UserAccessChangeSuccess )
    | ( UserAccessError )
  ;
  UndoSubscriptionCancellationResult:
    | ( SubscriptionConflict )
    | ( UndoSubscriptionCancellationSuccess )
  ;
  UpdateCourseResult:
    | ( CurriculumConflict )
    | ( UpdateCourseSuccess )
  ;
  UpdateLessonUnitResult:
    | ( CurriculumConflict )
    | ( InstructionalIdentityLocked )
    | ( UpdateLessonUnitSuccess )
  ;
  WithdrawWaitlistResult:
    | ( WaitlistError )
    | ( WaitlistPromotionWon )
    | ( WithdrawWaitlistSuccess )
  ;
};


/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AbsenceRequest: ResolverTypeWrapper<AbsenceRequest>;
  AbsenceRequestState: AbsenceRequestState;
  AcceptSponsorshipInvitationResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['AcceptSponsorshipInvitationResult']>;
  AcceptSponsorshipInvitationSuccess: ResolverTypeWrapper<AcceptSponsorshipInvitationSuccess>;
  AddAvailabilityExceptionInput: AddAvailabilityExceptionInput;
  AddAvailabilityExceptionResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['AddAvailabilityExceptionResult']>;
  AddAvailabilityExceptionSuccess: ResolverTypeWrapper<AddAvailabilityExceptionSuccess>;
  AddCohortMembershipInput: AddCohortMembershipInput;
  AddCohortMembershipResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['AddCohortMembershipResult']>;
  AddLessonMaterialInput: AddLessonMaterialInput;
  AddLessonMaterialResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['AddLessonMaterialResult']>;
  AddLessonMaterialSuccess: ResolverTypeWrapper<AddLessonMaterialSuccess>;
  AdjustClassCreditsInput: AdjustClassCreditsInput;
  AdjustClassCreditsResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['AdjustClassCreditsResult']>;
  AdjustClassCreditsSuccess: ResolverTypeWrapper<AdjustClassCreditsSuccess>;
  AdministrationCurriculum: ResolverTypeWrapper<AdministrationCurriculum>;
  AdministratorTaskError: ResolverTypeWrapper<AdministratorTaskError>;
  AdministratorTaskItem: ResolverTypeWrapper<AdministratorTaskItem>;
  AdministratorTaskKind: AdministratorTaskKind;
  AdministratorTaskSafeContext: ResolverTypeWrapper<AdministratorTaskSafeContext>;
  AdministratorTaskState: AdministratorTaskState;
  AttendanceError: ResolverTypeWrapper<AttendanceError>;
  AttendanceErrorCode: AttendanceErrorCode;
  AttendanceOutcome: AttendanceOutcome;
  AttendanceRecord: ResolverTypeWrapper<AttendanceRecord>;
  AttendanceRecordInput: AttendanceRecordInput;
  AttendanceReviewDecision: AttendanceReviewDecision;
  AttendanceReviewError: ResolverTypeWrapper<AttendanceReviewError>;
  AttendanceReviewErrorCode: AttendanceReviewErrorCode;
  AttendanceReviewRequest: ResolverTypeWrapper<AttendanceReviewRequest>;
  AttendanceReviewRequestState: AttendanceReviewRequestState;
  AvailabilityException: ResolverTypeWrapper<AvailabilityException>;
  AvailabilityExceptionSessionConflict: ResolverTypeWrapper<AvailabilityExceptionSessionConflict>;
  BookClassSessionInput: BookClassSessionInput;
  BookClassSessionResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['BookClassSessionResult']>;
  BookClassSessionSuccess: ResolverTypeWrapper<BookClassSessionSuccess>;
  Booking: ResolverTypeWrapper<Booking>;
  BookingError: ResolverTypeWrapper<BookingError>;
  BookingErrorCode: BookingErrorCode;
  BookingState: BookingState;
  BookingTerminalReason: BookingTerminalReason;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CancelBookingInput: CancelBookingInput;
  CancelBookingResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['CancelBookingResult']>;
  CancelBookingSuccess: ResolverTypeWrapper<CancelBookingSuccess>;
  CancelClassSessionInput: CancelClassSessionInput;
  CancelClassSessionResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['CancelClassSessionResult']>;
  CancelClassSessionSuccess: ResolverTypeWrapper<CancelClassSessionSuccess>;
  ChangeClassSessionSeatCapacityInput: ChangeClassSessionSeatCapacityInput;
  ChangeClassSessionSeatCapacityResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['ChangeClassSessionSeatCapacityResult']>;
  ChangeClassSessionSeatCapacitySuccess: ResolverTypeWrapper<ChangeClassSessionSeatCapacitySuccess>;
  ChangeRoleAssignmentInput: ChangeRoleAssignmentInput;
  ChangeTeacherQualificationInput: ChangeTeacherQualificationInput;
  ChangeTeacherQualificationSuccess: ResolverTypeWrapper<ChangeTeacherQualificationSuccess>;
  ChangeUserAccessInput: ChangeUserAccessInput;
  ClassCreditAccount: ResolverTypeWrapper<ClassCreditAccount>;
  ClassCreditAdjustmentError: ResolverTypeWrapper<ClassCreditAdjustmentError>;
  ClassCreditAdjustmentErrorCode: ClassCreditAdjustmentErrorCode;
  ClassCreditLedgerEntry: ResolverTypeWrapper<ClassCreditLedgerEntry>;
  ClassCreditLedgerSource: ClassCreditLedgerSource;
  ClassRoster: ResolverTypeWrapper<ClassRoster>;
  ClassRosterStudent: ResolverTypeWrapper<ClassRosterStudent>;
  ClassSession: ResolverTypeWrapper<ClassSession>;
  ClassSessionDiscoveryConnection: ResolverTypeWrapper<ClassSessionDiscoveryConnection>;
  ClassSessionDiscoveryFilter: ResolverTypeWrapper<ClassSessionDiscoveryFilter>;
  ClassSessionDiscoveryInput: ClassSessionDiscoveryInput;
  ClassSessionDiscoveryOptions: ResolverTypeWrapper<ClassSessionDiscoveryOptions>;
  ClassSessionDiscoveryPageInfo: ResolverTypeWrapper<ClassSessionDiscoveryPageInfo>;
  ClassSessionDiscoveryTeacherOption: ResolverTypeWrapper<ClassSessionDiscoveryTeacherOption>;
  ClassSessionDisruptionError: ResolverTypeWrapper<ClassSessionDisruptionError>;
  ClassSessionDisruptionErrorCode: ClassSessionDisruptionErrorCode;
  ClassSessionPublicationError: ResolverTypeWrapper<ClassSessionPublicationError>;
  ClassSessionPublicationErrorCode: ClassSessionPublicationErrorCode;
  ClassSessionSeatCapacityError: ResolverTypeWrapper<ClassSessionSeatCapacityError>;
  ClassSessionSeatCapacityErrorCode: ClassSessionSeatCapacityErrorCode;
  ClassSessionState: ClassSessionState;
  Classroom: ResolverTypeWrapper<Classroom>;
  ClassroomAccessError: ResolverTypeWrapper<ClassroomAccessError>;
  ClassroomAccessErrorCode: ClassroomAccessErrorCode;
  ClassroomSimulationStatus: ClassroomSimulationStatus;
  Cohort: ResolverTypeWrapper<Cohort>;
  CohortAttributedActivity: ResolverTypeWrapper<CohortAttributedActivity>;
  CohortError: ResolverTypeWrapper<CohortError>;
  CohortErrorCode: CohortErrorCode;
  CohortMembership: ResolverTypeWrapper<CohortMembership>;
  CohortMembershipSuccess: ResolverTypeWrapper<CohortMembershipSuccess>;
  CohortSuccess: ResolverTypeWrapper<CohortSuccess>;
  Course: ResolverTypeWrapper<Course>;
  CourseProgress: ResolverTypeWrapper<CourseProgress>;
  CourseProgressLearningHistory: ResolverTypeWrapper<CourseProgressLearningHistory>;
  CourseProgressSnapshot: ResolverTypeWrapper<CourseProgressSnapshot>;
  CourseProgressSnapshotBoundary: CourseProgressSnapshotBoundary;
  CreateCohortInput: CreateCohortInput;
  CreateCohortResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['CreateCohortResult']>;
  CreateCourseInput: CreateCourseInput;
  CreateCourseResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['CreateCourseResult']>;
  CreateCourseSuccess: ResolverTypeWrapper<CreateCourseSuccess>;
  CreateLessonUnitInput: CreateLessonUnitInput;
  CreateLessonUnitResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['CreateLessonUnitResult']>;
  CreateLessonUnitSuccess: ResolverTypeWrapper<CreateLessonUnitSuccess>;
  CurriculumConflict: ResolverTypeWrapper<CurriculumConflict>;
  CurriculumLevel: CurriculumLevel;
  DecideAttendanceReviewInput: DecideAttendanceReviewInput;
  DecideAttendanceReviewResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['DecideAttendanceReviewResult']>;
  DecideAttendanceReviewSuccess: ResolverTypeWrapper<DecideAttendanceReviewSuccess>;
  DeclineSponsorshipInvitationResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['DeclineSponsorshipInvitationResult']>;
  DeclineSponsorshipInvitationSuccess: ResolverTypeWrapper<DeclineSponsorshipInvitationSuccess>;
  DiscoverableClassSession: ResolverTypeWrapper<DiscoverableClassSession>;
  DiscoveryLessonUnit: ResolverTypeWrapper<DiscoveryLessonUnit>;
  EndCohortMembershipInput: EndCohortMembershipInput;
  EndCohortMembershipResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['EndCohortMembershipResult']>;
  EndSponsorshipAsOrganizationInput: EndSponsorshipAsOrganizationInput;
  EndSponsorshipAsOrganizationResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['EndSponsorshipAsOrganizationResult']>;
  EndSponsorshipAsOrganizationSuccess: ResolverTypeWrapper<EndSponsorshipAsOrganizationSuccess>;
  EndSponsorshipAsStudentInput: EndSponsorshipAsStudentInput;
  EndSponsorshipAsStudentResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['EndSponsorshipAsStudentResult']>;
  EndSponsorshipAsStudentSuccess: ResolverTypeWrapper<EndSponsorshipAsStudentSuccess>;
  EndTeacherAvailabilityRangeInput: EndTeacherAvailabilityRangeInput;
  EndTeacherAvailabilityRangeResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['EndTeacherAvailabilityRangeResult']>;
  EndTeacherAvailabilityRangeSuccess: ResolverTypeWrapper<EndTeacherAvailabilityRangeSuccess>;
  EnterClassroomInput: EnterClassroomInput;
  EnterClassroomResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['EnterClassroomResult']>;
  EnterClassroomSuccess: ResolverTypeWrapper<EnterClassroomSuccess>;
  FeedbackAndRatingItem: ResolverTypeWrapper<FeedbackAndRatingItem>;
  FeedbackSkill: FeedbackSkill;
  GrantRoleAssignmentResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['GrantRoleAssignmentResult']>;
  GrantTeacherQualificationResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['GrantTeacherQualificationResult']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  InAppNotification: ResolverTypeWrapper<InAppNotification>;
  InstructionalIdentityLocked: ResolverTypeWrapper<InstructionalIdentityLocked>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  InterfaceLocale: InterfaceLocale;
  InvalidLessonMaterial: ResolverTypeWrapper<InvalidLessonMaterial>;
  InviteToSponsorshipInput: InviteToSponsorshipInput;
  InviteToSponsorshipResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['InviteToSponsorshipResult']>;
  InviteToSponsorshipSuccess: ResolverTypeWrapper<InviteToSponsorshipSuccess>;
  JoinWaitlistInput: JoinWaitlistInput;
  JoinWaitlistResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['JoinWaitlistResult']>;
  JoinWaitlistSuccess: ResolverTypeWrapper<JoinWaitlistSuccess>;
  LearningAccessLessonUnit: ResolverTypeWrapper<LearningAccessLessonUnit>;
  LearningFeedback: ResolverTypeWrapper<LearningFeedback>;
  LearningFeedbackError: ResolverTypeWrapper<LearningFeedbackError>;
  LearningFeedbackErrorCode: LearningFeedbackErrorCode;
  LearningFeedbackState: LearningFeedbackState;
  LessonMaterial: ResolverTypeWrapper<LessonMaterial>;
  LessonMaterialKind: LessonMaterialKind;
  LessonUnit: ResolverTypeWrapper<LessonUnit>;
  LessonUnitState: LessonUnitState;
  LocalTimeDisambiguation: LocalTimeDisambiguation;
  MarketplaceActionableExceptions: ResolverTypeWrapper<MarketplaceActionableExceptions>;
  MarketplaceAttendanceSummary: ResolverTypeWrapper<MarketplaceAttendanceSummary>;
  MarketplaceCancellationSummary: ResolverTypeWrapper<MarketplaceCancellationSummary>;
  MarketplaceCorrectionSummary: ResolverTypeWrapper<MarketplaceCorrectionSummary>;
  MarketplaceCourseProgressReport: ResolverTypeWrapper<MarketplaceCourseProgressReport>;
  MarketplaceCreditSourceTotal: ResolverTypeWrapper<MarketplaceCreditSourceTotal>;
  MarketplaceCreditSummary: ResolverTypeWrapper<MarketplaceCreditSummary>;
  MarketplaceDailyCancellationRate: ResolverTypeWrapper<MarketplaceDailyCancellationRate>;
  MarketplaceExceptionItem: ResolverTypeWrapper<MarketplaceExceptionItem>;
  MarketplaceExceptionKind: MarketplaceExceptionKind;
  MarketplaceOperationalReport: ResolverTypeWrapper<MarketplaceOperationalReport>;
  MarketplaceOperationalReportInput: MarketplaceOperationalReportInput;
  MarketplaceReportRange: ResolverTypeWrapper<MarketplaceReportRange>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  NotificationChannel: NotificationChannel;
  Organization: ResolverTypeWrapper<Organization>;
  OrganizationAttendanceAndProgressReport: ResolverTypeWrapper<OrganizationAttendanceAndProgressReport>;
  OrganizationAttendanceSummary: ResolverTypeWrapper<OrganizationAttendanceSummary>;
  OrganizationCohortReport: ResolverTypeWrapper<OrganizationCohortReport>;
  OrganizationCourseProgressReport: ResolverTypeWrapper<OrganizationCourseProgressReport>;
  OrganizationCourseProgressValue: ResolverTypeWrapper<OrganizationCourseProgressValue>;
  OrganizationSponsoredStudentReport: ResolverTypeWrapper<OrganizationSponsoredStudentReport>;
  ProcessSubscriptionProviderEventInput: ProcessSubscriptionProviderEventInput;
  ProcessSubscriptionProviderEventResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['ProcessSubscriptionProviderEventResult']>;
  ProcessSubscriptionProviderEventSuccess: ResolverTypeWrapper<ProcessSubscriptionProviderEventSuccess>;
  PublicTeacherProfile: ResolverTypeWrapper<PublicTeacherProfile>;
  PublishClassSessionInput: PublishClassSessionInput;
  PublishClassSessionResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['PublishClassSessionResult']>;
  PublishClassSessionSuccess: ResolverTypeWrapper<PublishClassSessionSuccess>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  ReactivateUserInput: ReactivateUserInput;
  ReactivateUserResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['ReactivateUserResult']>;
  RecordAttendanceInput: RecordAttendanceInput;
  RecordAttendanceResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['RecordAttendanceResult']>;
  RecordAttendanceSuccess: ResolverTypeWrapper<RecordAttendanceSuccess>;
  RedactLearningFeedbackInput: RedactLearningFeedbackInput;
  RedactLearningFeedbackResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['RedactLearningFeedbackResult']>;
  RedactLearningFeedbackSuccess: ResolverTypeWrapper<RedactLearningFeedbackSuccess>;
  RedactSessionRatingCommentInput: RedactSessionRatingCommentInput;
  RedactSessionRatingCommentResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['RedactSessionRatingCommentResult']>;
  RedactSessionRatingCommentSuccess: ResolverTypeWrapper<RedactSessionRatingCommentSuccess>;
  RememberRoleWorkspacePlaceInput: RememberRoleWorkspacePlaceInput;
  RemoveAvailabilityExceptionInput: RemoveAvailabilityExceptionInput;
  RemoveAvailabilityExceptionResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['RemoveAvailabilityExceptionResult']>;
  RemoveAvailabilityExceptionSuccess: ResolverTypeWrapper<RemoveAvailabilityExceptionSuccess>;
  RemoveRoleAssignmentResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['RemoveRoleAssignmentResult']>;
  RemoveTeacherQualificationResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['RemoveTeacherQualificationResult']>;
  RenameCohortInput: RenameCohortInput;
  RenameCohortResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['RenameCohortResult']>;
  ReorderLessonUnitInput: ReorderLessonUnitInput;
  ReorderLessonUnitResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['ReorderLessonUnitResult']>;
  ReorderLessonUnitSuccess: ResolverTypeWrapper<ReorderLessonUnitSuccess>;
  ReportAbsenceInput: ReportAbsenceInput;
  ReportAbsenceResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['ReportAbsenceResult']>;
  ReportAbsenceSuccess: ResolverTypeWrapper<ReportAbsenceSuccess>;
  ReportExport: ResolverTypeWrapper<ReportExport>;
  ReportExportActingRole: ReportExportActingRole;
  ReportExportArtifact: ResolverTypeWrapper<ReportExportArtifact>;
  ReportExportError: ResolverTypeWrapper<ReportExportError>;
  ReportExportErrorCode: ReportExportErrorCode;
  ReportExportFailureReason: ReportExportFailureReason;
  ReportExportKind: ReportExportKind;
  ReportExportState: ReportExportState;
  RequestAttendanceReviewInput: RequestAttendanceReviewInput;
  RequestAttendanceReviewResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['RequestAttendanceReviewResult']>;
  RequestAttendanceReviewSuccess: ResolverTypeWrapper<RequestAttendanceReviewSuccess>;
  RequestReportExportInput: RequestReportExportInput;
  RequestReportExportResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['RequestReportExportResult']>;
  RequestReportExportSuccess: ResolverTypeWrapper<RequestReportExportSuccess>;
  RescheduleBookingInput: RescheduleBookingInput;
  RescheduleBookingResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['RescheduleBookingResult']>;
  RescheduleBookingSuccess: ResolverTypeWrapper<RescheduleBookingSuccess>;
  ResolveAdministratorTaskInput: ResolveAdministratorTaskInput;
  ResolveAdministratorTaskResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['ResolveAdministratorTaskResult']>;
  ResolveAdministratorTaskSuccess: ResolverTypeWrapper<ResolveAdministratorTaskSuccess>;
  RetireLessonUnitInput: RetireLessonUnitInput;
  RetireLessonUnitResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['RetireLessonUnitResult']>;
  RetireLessonUnitSuccess: ResolverTypeWrapper<RetireLessonUnitSuccess>;
  ReviseLessonMaterialInput: ReviseLessonMaterialInput;
  ReviseLessonMaterialResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['ReviseLessonMaterialResult']>;
  ReviseLessonMaterialSuccess: ResolverTypeWrapper<ReviseLessonMaterialSuccess>;
  RoleAssignmentAdministration: ResolverTypeWrapper<RoleAssignmentAdministration>;
  RoleAssignmentAdministrationUser: ResolverTypeWrapper<RoleAssignmentAdministrationUser>;
  RoleAssignmentChange: ResolverTypeWrapper<RoleAssignmentChange>;
  RoleAssignmentChangeAction: RoleAssignmentChangeAction;
  RoleAssignmentChangeSuccess: ResolverTypeWrapper<RoleAssignmentChangeSuccess>;
  RoleAssignmentError: ResolverTypeWrapper<RoleAssignmentError>;
  RolePlace: ResolverTypeWrapper<RolePlace>;
  RoleWorkspace: ResolverTypeWrapper<RoleWorkspace>;
  SaveLearningFeedbackInput: SaveLearningFeedbackInput;
  SaveLearningFeedbackResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['SaveLearningFeedbackResult']>;
  SaveLearningFeedbackSuccess: ResolverTypeWrapper<SaveLearningFeedbackSuccess>;
  SaveSessionRatingInput: SaveSessionRatingInput;
  SaveSessionRatingResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['SaveSessionRatingResult']>;
  SaveSessionRatingSuccess: ResolverTypeWrapper<SaveSessionRatingSuccess>;
  SaveTeacherAvailabilityRangeInput: SaveTeacherAvailabilityRangeInput;
  SaveTeacherAvailabilityRangeResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['SaveTeacherAvailabilityRangeResult']>;
  SaveTeacherAvailabilityRangeSuccess: ResolverTypeWrapper<SaveTeacherAvailabilityRangeSuccess>;
  SaveTeacherProfileInput: SaveTeacherProfileInput;
  SaveTeacherProfileSuccess: ResolverTypeWrapper<SaveTeacherProfileSuccess>;
  SaveUserPreferencesInput: SaveUserPreferencesInput;
  SaveUserPreferencesPayload: ResolverTypeWrapper<SaveUserPreferencesPayload>;
  ScheduleSubscriptionCancellationResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['ScheduleSubscriptionCancellationResult']>;
  ScheduleSubscriptionCancellationSuccess: ResolverTypeWrapper<ScheduleSubscriptionCancellationSuccess>;
  SessionRating: ResolverTypeWrapper<SessionRating>;
  SessionRatingError: ResolverTypeWrapper<SessionRatingError>;
  SessionRatingErrorCode: SessionRatingErrorCode;
  SessionRatingImprovementTag: SessionRatingImprovementTag;
  SessionRatingPositiveTag: SessionRatingPositiveTag;
  SetStudentPlacementInput: SetStudentPlacementInput;
  Sponsorship: ResolverTypeWrapper<Sponsorship>;
  SponsorshipBoundaryError: ResolverTypeWrapper<SponsorshipBoundaryError>;
  SponsorshipBoundaryErrorCode: SponsorshipBoundaryErrorCode;
  SponsorshipDisclosure: ResolverTypeWrapper<SponsorshipDisclosure>;
  SponsorshipEndingParty: SponsorshipEndingParty;
  SponsorshipInvitation: ResolverTypeWrapper<SponsorshipInvitation>;
  SponsorshipInvitationError: ResolverTypeWrapper<SponsorshipInvitationError>;
  SponsorshipInvitationErrorCode: SponsorshipInvitationErrorCode;
  SponsorshipInvitationResponseError: ResolverTypeWrapper<SponsorshipInvitationResponseError>;
  SponsorshipInvitationResponseErrorCode: SponsorshipInvitationResponseErrorCode;
  SponsorshipInvitationResponseInput: SponsorshipInvitationResponseInput;
  SponsorshipInvitationState: SponsorshipInvitationState;
  SponsorshipState: SponsorshipState;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  StructuredTextBlockInput: StructuredTextBlockInput;
  StudentAttendanceRecord: ResolverTypeWrapper<StudentAttendanceRecord>;
  StudentPlacement: ResolverTypeWrapper<StudentPlacement>;
  StudentWorkspace: ResolverTypeWrapper<StudentWorkspace>;
  Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>;
  SubscriptionConflict: ResolverTypeWrapper<SubscriptionConflict>;
  SubscriptionLifecycleInput: SubscriptionLifecycleInput;
  SubscriptionProviderEventType: SubscriptionProviderEventType;
  SubscriptionState: SubscriptionState;
  SubstituteTeacherInput: SubstituteTeacherInput;
  SubstituteTeacherResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['SubstituteTeacherResult']>;
  SubstituteTeacherSuccess: ResolverTypeWrapper<SubstituteTeacherSuccess>;
  SuspendUserResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['SuspendUserResult']>;
  TeacherAvailability: ResolverTypeWrapper<TeacherAvailability>;
  TeacherAvailabilityOccurrence: ResolverTypeWrapper<TeacherAvailabilityOccurrence>;
  TeacherAvailabilityRange: ResolverTypeWrapper<TeacherAvailabilityRange>;
  TeacherAvailabilityValidationError: ResolverTypeWrapper<TeacherAvailabilityValidationError>;
  TeacherQualification: ResolverTypeWrapper<TeacherQualification>;
  TeacherQualificationRemovalBlocked: ResolverTypeWrapper<TeacherQualificationRemovalBlocked>;
  Topic: ResolverTypeWrapper<Topic>;
  UndoSubscriptionCancellationResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['UndoSubscriptionCancellationResult']>;
  UndoSubscriptionCancellationSuccess: ResolverTypeWrapper<UndoSubscriptionCancellationSuccess>;
  UpdateCourseInput: UpdateCourseInput;
  UpdateCourseResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['UpdateCourseResult']>;
  UpdateCourseSuccess: ResolverTypeWrapper<UpdateCourseSuccess>;
  UpdateLessonUnitInput: UpdateLessonUnitInput;
  UpdateLessonUnitResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['UpdateLessonUnitResult']>;
  UpdateLessonUnitSuccess: ResolverTypeWrapper<UpdateLessonUnitSuccess>;
  UpsertTopicInput: UpsertTopicInput;
  UpsertTopicSuccess: ResolverTypeWrapper<UpsertTopicSuccess>;
  User: ResolverTypeWrapper<User>;
  UserAccessChangeSuccess: ResolverTypeWrapper<UserAccessChangeSuccess>;
  UserAccessError: ResolverTypeWrapper<UserAccessError>;
  UserAccessStatus: UserAccessStatus;
  UserRole: UserRole;
  WaitlistEntry: ResolverTypeWrapper<WaitlistEntry>;
  WaitlistEntryState: WaitlistEntryState;
  WaitlistError: ResolverTypeWrapper<WaitlistError>;
  WaitlistErrorCode: WaitlistErrorCode;
  WaitlistPromotionWon: ResolverTypeWrapper<WaitlistPromotionWon>;
  WaitlistTerminalReason: WaitlistTerminalReason;
  Weekday: Weekday;
  WithdrawWaitlistInput: WithdrawWaitlistInput;
  WithdrawWaitlistResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['WithdrawWaitlistResult']>;
  WithdrawWaitlistSuccess: ResolverTypeWrapper<WithdrawWaitlistSuccess>;
  WorkspacePlace: WorkspacePlace;
  WorkspaceRelationshipScope: WorkspaceRelationshipScope;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AbsenceRequest: AbsenceRequest;
  AcceptSponsorshipInvitationResult: ResolversUnionTypes<ResolversParentTypes>['AcceptSponsorshipInvitationResult'];
  AcceptSponsorshipInvitationSuccess: AcceptSponsorshipInvitationSuccess;
  AddAvailabilityExceptionInput: AddAvailabilityExceptionInput;
  AddAvailabilityExceptionResult: ResolversUnionTypes<ResolversParentTypes>['AddAvailabilityExceptionResult'];
  AddAvailabilityExceptionSuccess: AddAvailabilityExceptionSuccess;
  AddCohortMembershipInput: AddCohortMembershipInput;
  AddCohortMembershipResult: ResolversUnionTypes<ResolversParentTypes>['AddCohortMembershipResult'];
  AddLessonMaterialInput: AddLessonMaterialInput;
  AddLessonMaterialResult: ResolversUnionTypes<ResolversParentTypes>['AddLessonMaterialResult'];
  AddLessonMaterialSuccess: AddLessonMaterialSuccess;
  AdjustClassCreditsInput: AdjustClassCreditsInput;
  AdjustClassCreditsResult: ResolversUnionTypes<ResolversParentTypes>['AdjustClassCreditsResult'];
  AdjustClassCreditsSuccess: AdjustClassCreditsSuccess;
  AdministrationCurriculum: AdministrationCurriculum;
  AdministratorTaskError: AdministratorTaskError;
  AdministratorTaskItem: AdministratorTaskItem;
  AdministratorTaskSafeContext: AdministratorTaskSafeContext;
  AttendanceError: AttendanceError;
  AttendanceRecord: AttendanceRecord;
  AttendanceRecordInput: AttendanceRecordInput;
  AttendanceReviewError: AttendanceReviewError;
  AttendanceReviewRequest: AttendanceReviewRequest;
  AvailabilityException: AvailabilityException;
  AvailabilityExceptionSessionConflict: AvailabilityExceptionSessionConflict;
  BookClassSessionInput: BookClassSessionInput;
  BookClassSessionResult: ResolversUnionTypes<ResolversParentTypes>['BookClassSessionResult'];
  BookClassSessionSuccess: BookClassSessionSuccess;
  Booking: Booking;
  BookingError: BookingError;
  Boolean: Scalars['Boolean']['output'];
  CancelBookingInput: CancelBookingInput;
  CancelBookingResult: ResolversUnionTypes<ResolversParentTypes>['CancelBookingResult'];
  CancelBookingSuccess: CancelBookingSuccess;
  CancelClassSessionInput: CancelClassSessionInput;
  CancelClassSessionResult: ResolversUnionTypes<ResolversParentTypes>['CancelClassSessionResult'];
  CancelClassSessionSuccess: CancelClassSessionSuccess;
  ChangeClassSessionSeatCapacityInput: ChangeClassSessionSeatCapacityInput;
  ChangeClassSessionSeatCapacityResult: ResolversUnionTypes<ResolversParentTypes>['ChangeClassSessionSeatCapacityResult'];
  ChangeClassSessionSeatCapacitySuccess: ChangeClassSessionSeatCapacitySuccess;
  ChangeRoleAssignmentInput: ChangeRoleAssignmentInput;
  ChangeTeacherQualificationInput: ChangeTeacherQualificationInput;
  ChangeTeacherQualificationSuccess: ChangeTeacherQualificationSuccess;
  ChangeUserAccessInput: ChangeUserAccessInput;
  ClassCreditAccount: ClassCreditAccount;
  ClassCreditAdjustmentError: ClassCreditAdjustmentError;
  ClassCreditLedgerEntry: ClassCreditLedgerEntry;
  ClassRoster: ClassRoster;
  ClassRosterStudent: ClassRosterStudent;
  ClassSession: ClassSession;
  ClassSessionDiscoveryConnection: ClassSessionDiscoveryConnection;
  ClassSessionDiscoveryFilter: ClassSessionDiscoveryFilter;
  ClassSessionDiscoveryInput: ClassSessionDiscoveryInput;
  ClassSessionDiscoveryOptions: ClassSessionDiscoveryOptions;
  ClassSessionDiscoveryPageInfo: ClassSessionDiscoveryPageInfo;
  ClassSessionDiscoveryTeacherOption: ClassSessionDiscoveryTeacherOption;
  ClassSessionDisruptionError: ClassSessionDisruptionError;
  ClassSessionPublicationError: ClassSessionPublicationError;
  ClassSessionSeatCapacityError: ClassSessionSeatCapacityError;
  Classroom: Classroom;
  ClassroomAccessError: ClassroomAccessError;
  Cohort: Cohort;
  CohortAttributedActivity: CohortAttributedActivity;
  CohortError: CohortError;
  CohortMembership: CohortMembership;
  CohortMembershipSuccess: CohortMembershipSuccess;
  CohortSuccess: CohortSuccess;
  Course: Course;
  CourseProgress: CourseProgress;
  CourseProgressLearningHistory: CourseProgressLearningHistory;
  CourseProgressSnapshot: CourseProgressSnapshot;
  CreateCohortInput: CreateCohortInput;
  CreateCohortResult: ResolversUnionTypes<ResolversParentTypes>['CreateCohortResult'];
  CreateCourseInput: CreateCourseInput;
  CreateCourseResult: ResolversUnionTypes<ResolversParentTypes>['CreateCourseResult'];
  CreateCourseSuccess: CreateCourseSuccess;
  CreateLessonUnitInput: CreateLessonUnitInput;
  CreateLessonUnitResult: ResolversUnionTypes<ResolversParentTypes>['CreateLessonUnitResult'];
  CreateLessonUnitSuccess: CreateLessonUnitSuccess;
  CurriculumConflict: CurriculumConflict;
  DecideAttendanceReviewInput: DecideAttendanceReviewInput;
  DecideAttendanceReviewResult: ResolversUnionTypes<ResolversParentTypes>['DecideAttendanceReviewResult'];
  DecideAttendanceReviewSuccess: DecideAttendanceReviewSuccess;
  DeclineSponsorshipInvitationResult: ResolversUnionTypes<ResolversParentTypes>['DeclineSponsorshipInvitationResult'];
  DeclineSponsorshipInvitationSuccess: DeclineSponsorshipInvitationSuccess;
  DiscoverableClassSession: DiscoverableClassSession;
  DiscoveryLessonUnit: DiscoveryLessonUnit;
  EndCohortMembershipInput: EndCohortMembershipInput;
  EndCohortMembershipResult: ResolversUnionTypes<ResolversParentTypes>['EndCohortMembershipResult'];
  EndSponsorshipAsOrganizationInput: EndSponsorshipAsOrganizationInput;
  EndSponsorshipAsOrganizationResult: ResolversUnionTypes<ResolversParentTypes>['EndSponsorshipAsOrganizationResult'];
  EndSponsorshipAsOrganizationSuccess: EndSponsorshipAsOrganizationSuccess;
  EndSponsorshipAsStudentInput: EndSponsorshipAsStudentInput;
  EndSponsorshipAsStudentResult: ResolversUnionTypes<ResolversParentTypes>['EndSponsorshipAsStudentResult'];
  EndSponsorshipAsStudentSuccess: EndSponsorshipAsStudentSuccess;
  EndTeacherAvailabilityRangeInput: EndTeacherAvailabilityRangeInput;
  EndTeacherAvailabilityRangeResult: ResolversUnionTypes<ResolversParentTypes>['EndTeacherAvailabilityRangeResult'];
  EndTeacherAvailabilityRangeSuccess: EndTeacherAvailabilityRangeSuccess;
  EnterClassroomInput: EnterClassroomInput;
  EnterClassroomResult: ResolversUnionTypes<ResolversParentTypes>['EnterClassroomResult'];
  EnterClassroomSuccess: EnterClassroomSuccess;
  FeedbackAndRatingItem: FeedbackAndRatingItem;
  GrantRoleAssignmentResult: ResolversUnionTypes<ResolversParentTypes>['GrantRoleAssignmentResult'];
  GrantTeacherQualificationResult: ResolversUnionTypes<ResolversParentTypes>['GrantTeacherQualificationResult'];
  ID: Scalars['ID']['output'];
  InAppNotification: InAppNotification;
  InstructionalIdentityLocked: InstructionalIdentityLocked;
  Int: Scalars['Int']['output'];
  InvalidLessonMaterial: InvalidLessonMaterial;
  InviteToSponsorshipInput: InviteToSponsorshipInput;
  InviteToSponsorshipResult: ResolversUnionTypes<ResolversParentTypes>['InviteToSponsorshipResult'];
  InviteToSponsorshipSuccess: InviteToSponsorshipSuccess;
  JoinWaitlistInput: JoinWaitlistInput;
  JoinWaitlistResult: ResolversUnionTypes<ResolversParentTypes>['JoinWaitlistResult'];
  JoinWaitlistSuccess: JoinWaitlistSuccess;
  LearningAccessLessonUnit: LearningAccessLessonUnit;
  LearningFeedback: LearningFeedback;
  LearningFeedbackError: LearningFeedbackError;
  LessonMaterial: LessonMaterial;
  LessonUnit: LessonUnit;
  MarketplaceActionableExceptions: MarketplaceActionableExceptions;
  MarketplaceAttendanceSummary: MarketplaceAttendanceSummary;
  MarketplaceCancellationSummary: MarketplaceCancellationSummary;
  MarketplaceCorrectionSummary: MarketplaceCorrectionSummary;
  MarketplaceCourseProgressReport: MarketplaceCourseProgressReport;
  MarketplaceCreditSourceTotal: MarketplaceCreditSourceTotal;
  MarketplaceCreditSummary: MarketplaceCreditSummary;
  MarketplaceDailyCancellationRate: MarketplaceDailyCancellationRate;
  MarketplaceExceptionItem: MarketplaceExceptionItem;
  MarketplaceOperationalReport: MarketplaceOperationalReport;
  MarketplaceOperationalReportInput: MarketplaceOperationalReportInput;
  MarketplaceReportRange: MarketplaceReportRange;
  Mutation: Record<PropertyKey, never>;
  Organization: Organization;
  OrganizationAttendanceAndProgressReport: OrganizationAttendanceAndProgressReport;
  OrganizationAttendanceSummary: OrganizationAttendanceSummary;
  OrganizationCohortReport: OrganizationCohortReport;
  OrganizationCourseProgressReport: OrganizationCourseProgressReport;
  OrganizationCourseProgressValue: OrganizationCourseProgressValue;
  OrganizationSponsoredStudentReport: OrganizationSponsoredStudentReport;
  ProcessSubscriptionProviderEventInput: ProcessSubscriptionProviderEventInput;
  ProcessSubscriptionProviderEventResult: ResolversUnionTypes<ResolversParentTypes>['ProcessSubscriptionProviderEventResult'];
  ProcessSubscriptionProviderEventSuccess: ProcessSubscriptionProviderEventSuccess;
  PublicTeacherProfile: PublicTeacherProfile;
  PublishClassSessionInput: PublishClassSessionInput;
  PublishClassSessionResult: ResolversUnionTypes<ResolversParentTypes>['PublishClassSessionResult'];
  PublishClassSessionSuccess: PublishClassSessionSuccess;
  Query: Record<PropertyKey, never>;
  ReactivateUserInput: ReactivateUserInput;
  ReactivateUserResult: ResolversUnionTypes<ResolversParentTypes>['ReactivateUserResult'];
  RecordAttendanceInput: RecordAttendanceInput;
  RecordAttendanceResult: ResolversUnionTypes<ResolversParentTypes>['RecordAttendanceResult'];
  RecordAttendanceSuccess: RecordAttendanceSuccess;
  RedactLearningFeedbackInput: RedactLearningFeedbackInput;
  RedactLearningFeedbackResult: ResolversUnionTypes<ResolversParentTypes>['RedactLearningFeedbackResult'];
  RedactLearningFeedbackSuccess: RedactLearningFeedbackSuccess;
  RedactSessionRatingCommentInput: RedactSessionRatingCommentInput;
  RedactSessionRatingCommentResult: ResolversUnionTypes<ResolversParentTypes>['RedactSessionRatingCommentResult'];
  RedactSessionRatingCommentSuccess: RedactSessionRatingCommentSuccess;
  RememberRoleWorkspacePlaceInput: RememberRoleWorkspacePlaceInput;
  RemoveAvailabilityExceptionInput: RemoveAvailabilityExceptionInput;
  RemoveAvailabilityExceptionResult: ResolversUnionTypes<ResolversParentTypes>['RemoveAvailabilityExceptionResult'];
  RemoveAvailabilityExceptionSuccess: RemoveAvailabilityExceptionSuccess;
  RemoveRoleAssignmentResult: ResolversUnionTypes<ResolversParentTypes>['RemoveRoleAssignmentResult'];
  RemoveTeacherQualificationResult: ResolversUnionTypes<ResolversParentTypes>['RemoveTeacherQualificationResult'];
  RenameCohortInput: RenameCohortInput;
  RenameCohortResult: ResolversUnionTypes<ResolversParentTypes>['RenameCohortResult'];
  ReorderLessonUnitInput: ReorderLessonUnitInput;
  ReorderLessonUnitResult: ResolversUnionTypes<ResolversParentTypes>['ReorderLessonUnitResult'];
  ReorderLessonUnitSuccess: ReorderLessonUnitSuccess;
  ReportAbsenceInput: ReportAbsenceInput;
  ReportAbsenceResult: ResolversUnionTypes<ResolversParentTypes>['ReportAbsenceResult'];
  ReportAbsenceSuccess: ReportAbsenceSuccess;
  ReportExport: ReportExport;
  ReportExportArtifact: ReportExportArtifact;
  ReportExportError: ReportExportError;
  RequestAttendanceReviewInput: RequestAttendanceReviewInput;
  RequestAttendanceReviewResult: ResolversUnionTypes<ResolversParentTypes>['RequestAttendanceReviewResult'];
  RequestAttendanceReviewSuccess: RequestAttendanceReviewSuccess;
  RequestReportExportInput: RequestReportExportInput;
  RequestReportExportResult: ResolversUnionTypes<ResolversParentTypes>['RequestReportExportResult'];
  RequestReportExportSuccess: RequestReportExportSuccess;
  RescheduleBookingInput: RescheduleBookingInput;
  RescheduleBookingResult: ResolversUnionTypes<ResolversParentTypes>['RescheduleBookingResult'];
  RescheduleBookingSuccess: RescheduleBookingSuccess;
  ResolveAdministratorTaskInput: ResolveAdministratorTaskInput;
  ResolveAdministratorTaskResult: ResolversUnionTypes<ResolversParentTypes>['ResolveAdministratorTaskResult'];
  ResolveAdministratorTaskSuccess: ResolveAdministratorTaskSuccess;
  RetireLessonUnitInput: RetireLessonUnitInput;
  RetireLessonUnitResult: ResolversUnionTypes<ResolversParentTypes>['RetireLessonUnitResult'];
  RetireLessonUnitSuccess: RetireLessonUnitSuccess;
  ReviseLessonMaterialInput: ReviseLessonMaterialInput;
  ReviseLessonMaterialResult: ResolversUnionTypes<ResolversParentTypes>['ReviseLessonMaterialResult'];
  ReviseLessonMaterialSuccess: ReviseLessonMaterialSuccess;
  RoleAssignmentAdministration: RoleAssignmentAdministration;
  RoleAssignmentAdministrationUser: RoleAssignmentAdministrationUser;
  RoleAssignmentChange: RoleAssignmentChange;
  RoleAssignmentChangeSuccess: RoleAssignmentChangeSuccess;
  RoleAssignmentError: RoleAssignmentError;
  RolePlace: RolePlace;
  RoleWorkspace: RoleWorkspace;
  SaveLearningFeedbackInput: SaveLearningFeedbackInput;
  SaveLearningFeedbackResult: ResolversUnionTypes<ResolversParentTypes>['SaveLearningFeedbackResult'];
  SaveLearningFeedbackSuccess: SaveLearningFeedbackSuccess;
  SaveSessionRatingInput: SaveSessionRatingInput;
  SaveSessionRatingResult: ResolversUnionTypes<ResolversParentTypes>['SaveSessionRatingResult'];
  SaveSessionRatingSuccess: SaveSessionRatingSuccess;
  SaveTeacherAvailabilityRangeInput: SaveTeacherAvailabilityRangeInput;
  SaveTeacherAvailabilityRangeResult: ResolversUnionTypes<ResolversParentTypes>['SaveTeacherAvailabilityRangeResult'];
  SaveTeacherAvailabilityRangeSuccess: SaveTeacherAvailabilityRangeSuccess;
  SaveTeacherProfileInput: SaveTeacherProfileInput;
  SaveTeacherProfileSuccess: SaveTeacherProfileSuccess;
  SaveUserPreferencesInput: SaveUserPreferencesInput;
  SaveUserPreferencesPayload: SaveUserPreferencesPayload;
  ScheduleSubscriptionCancellationResult: ResolversUnionTypes<ResolversParentTypes>['ScheduleSubscriptionCancellationResult'];
  ScheduleSubscriptionCancellationSuccess: ScheduleSubscriptionCancellationSuccess;
  SessionRating: SessionRating;
  SessionRatingError: SessionRatingError;
  SetStudentPlacementInput: SetStudentPlacementInput;
  Sponsorship: Sponsorship;
  SponsorshipBoundaryError: SponsorshipBoundaryError;
  SponsorshipDisclosure: SponsorshipDisclosure;
  SponsorshipInvitation: SponsorshipInvitation;
  SponsorshipInvitationError: SponsorshipInvitationError;
  SponsorshipInvitationResponseError: SponsorshipInvitationResponseError;
  SponsorshipInvitationResponseInput: SponsorshipInvitationResponseInput;
  String: Scalars['String']['output'];
  StructuredTextBlockInput: StructuredTextBlockInput;
  StudentAttendanceRecord: StudentAttendanceRecord;
  StudentPlacement: StudentPlacement;
  StudentWorkspace: StudentWorkspace;
  Subscription: Record<PropertyKey, never>;
  SubscriptionConflict: SubscriptionConflict;
  SubscriptionLifecycleInput: SubscriptionLifecycleInput;
  SubstituteTeacherInput: SubstituteTeacherInput;
  SubstituteTeacherResult: ResolversUnionTypes<ResolversParentTypes>['SubstituteTeacherResult'];
  SubstituteTeacherSuccess: SubstituteTeacherSuccess;
  SuspendUserResult: ResolversUnionTypes<ResolversParentTypes>['SuspendUserResult'];
  TeacherAvailability: TeacherAvailability;
  TeacherAvailabilityOccurrence: TeacherAvailabilityOccurrence;
  TeacherAvailabilityRange: TeacherAvailabilityRange;
  TeacherAvailabilityValidationError: TeacherAvailabilityValidationError;
  TeacherQualification: TeacherQualification;
  TeacherQualificationRemovalBlocked: TeacherQualificationRemovalBlocked;
  Topic: Topic;
  UndoSubscriptionCancellationResult: ResolversUnionTypes<ResolversParentTypes>['UndoSubscriptionCancellationResult'];
  UndoSubscriptionCancellationSuccess: UndoSubscriptionCancellationSuccess;
  UpdateCourseInput: UpdateCourseInput;
  UpdateCourseResult: ResolversUnionTypes<ResolversParentTypes>['UpdateCourseResult'];
  UpdateCourseSuccess: UpdateCourseSuccess;
  UpdateLessonUnitInput: UpdateLessonUnitInput;
  UpdateLessonUnitResult: ResolversUnionTypes<ResolversParentTypes>['UpdateLessonUnitResult'];
  UpdateLessonUnitSuccess: UpdateLessonUnitSuccess;
  UpsertTopicInput: UpsertTopicInput;
  UpsertTopicSuccess: UpsertTopicSuccess;
  User: User;
  UserAccessChangeSuccess: UserAccessChangeSuccess;
  UserAccessError: UserAccessError;
  WaitlistEntry: WaitlistEntry;
  WaitlistError: WaitlistError;
  WaitlistPromotionWon: WaitlistPromotionWon;
  WithdrawWaitlistInput: WithdrawWaitlistInput;
  WithdrawWaitlistResult: ResolversUnionTypes<ResolversParentTypes>['WithdrawWaitlistResult'];
  WithdrawWaitlistSuccess: WithdrawWaitlistSuccess;
};

export type AbsenceRequestResolvers<ContextType = any, ParentType extends ResolversParentTypes['AbsenceRequest'] = ResolversParentTypes['AbsenceRequest']> = {
  classSessions?: Resolver<Array<ResolversTypes['ClassSession']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  requestedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['AbsenceRequestState'], ParentType, ContextType>;
};

export type AcceptSponsorshipInvitationResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['AcceptSponsorshipInvitationResult'] = ResolversParentTypes['AcceptSponsorshipInvitationResult']> = {
  __resolveType: TypeResolveFn<'AcceptSponsorshipInvitationSuccess' | 'SponsorshipInvitationResponseError', ParentType, ContextType>;
};

export type AcceptSponsorshipInvitationSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['AcceptSponsorshipInvitationSuccess'] = ResolversParentTypes['AcceptSponsorshipInvitationSuccess']> = {
  account?: Resolver<ResolversTypes['ClassCreditAccount'], ParentType, ContextType>;
  sponsorship?: Resolver<ResolversTypes['Sponsorship'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AddAvailabilityExceptionResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['AddAvailabilityExceptionResult'] = ResolversParentTypes['AddAvailabilityExceptionResult']> = {
  __resolveType: TypeResolveFn<'AddAvailabilityExceptionSuccess' | 'AvailabilityExceptionSessionConflict' | 'TeacherAvailabilityValidationError', ParentType, ContextType>;
};

export type AddAvailabilityExceptionSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['AddAvailabilityExceptionSuccess'] = ResolversParentTypes['AddAvailabilityExceptionSuccess']> = {
  exception?: Resolver<ResolversTypes['AvailabilityException'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AddCohortMembershipResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['AddCohortMembershipResult'] = ResolversParentTypes['AddCohortMembershipResult']> = {
  __resolveType: TypeResolveFn<'CohortError' | 'CohortMembershipSuccess', ParentType, ContextType>;
};

export type AddLessonMaterialResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['AddLessonMaterialResult'] = ResolversParentTypes['AddLessonMaterialResult']> = {
  __resolveType: TypeResolveFn<'AddLessonMaterialSuccess' | 'CurriculumConflict' | 'InvalidLessonMaterial', ParentType, ContextType>;
};

export type AddLessonMaterialSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['AddLessonMaterialSuccess'] = ResolversParentTypes['AddLessonMaterialSuccess']> = {
  material?: Resolver<ResolversTypes['LessonMaterial'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AdjustClassCreditsResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['AdjustClassCreditsResult'] = ResolversParentTypes['AdjustClassCreditsResult']> = {
  __resolveType: TypeResolveFn<'AdjustClassCreditsSuccess' | 'ClassCreditAdjustmentError' | 'CurriculumConflict', ParentType, ContextType>;
};

export type AdjustClassCreditsSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['AdjustClassCreditsSuccess'] = ResolversParentTypes['AdjustClassCreditsSuccess']> = {
  account?: Resolver<ResolversTypes['ClassCreditAccount'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AdministrationCurriculumResolvers<ContextType = any, ParentType extends ResolversParentTypes['AdministrationCurriculum'] = ResolversParentTypes['AdministrationCurriculum']> = {
  courses?: Resolver<Array<ResolversTypes['Course']>, ParentType, ContextType>;
  teachers?: Resolver<Array<ResolversTypes['PublicTeacherProfile']>, ParentType, ContextType>;
  topics?: Resolver<Array<ResolversTypes['Topic']>, ParentType, ContextType>;
};

export type AdministratorTaskErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['AdministratorTaskError'] = ResolversParentTypes['AdministratorTaskError']> = {
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AdministratorTaskItemResolvers<ContextType = any, ParentType extends ResolversParentTypes['AdministratorTaskItem'] = ResolversParentTypes['AdministratorTaskItem']> = {
  correlationReference?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['AdministratorTaskKind'], ParentType, ContextType>;
  requiredRole?: Resolver<ResolversTypes['UserRole'], ParentType, ContextType>;
  resolvedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  safeContext?: Resolver<ResolversTypes['AdministratorTaskSafeContext'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['AdministratorTaskState'], ParentType, ContextType>;
};

export type AdministratorTaskSafeContextResolvers<ContextType = any, ParentType extends ResolversParentTypes['AdministratorTaskSafeContext'] = ResolversParentTypes['AdministratorTaskSafeContext']> = {
  channel?: Resolver<Maybe<ResolversTypes['NotificationChannel']>, ParentType, ContextType>;
  classSessionId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  messageId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  recipientReference?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  suspendedUserId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
};

export type AttendanceErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['AttendanceError'] = ResolversParentTypes['AttendanceError']> = {
  code?: Resolver<ResolversTypes['AttendanceErrorCode'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AttendanceRecordResolvers<ContextType = any, ParentType extends ResolversParentTypes['AttendanceRecord'] = ResolversParentTypes['AttendanceRecord']> = {
  correctedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  correctionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  outcome?: Resolver<ResolversTypes['AttendanceOutcome'], ParentType, ContextType>;
  submittedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type AttendanceReviewErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['AttendanceReviewError'] = ResolversParentTypes['AttendanceReviewError']> = {
  code?: Resolver<ResolversTypes['AttendanceReviewErrorCode'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AttendanceReviewRequestResolvers<ContextType = any, ParentType extends ResolversParentTypes['AttendanceReviewRequest'] = ResolversParentTypes['AttendanceReviewRequest']> = {
  bookingId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  classSessionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  decidedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  effectiveOutcome?: Resolver<ResolversTypes['AttendanceOutcome'], ParentType, ContextType>;
  explanation?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  outcomeAtRequest?: Resolver<ResolversTypes['AttendanceOutcome'], ParentType, ContextType>;
  privateAdministratorNote?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  requestedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['AttendanceReviewRequestState'], ParentType, ContextType>;
  studentDisplayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  studentVisibleRationale?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type AvailabilityExceptionResolvers<ContextType = any, ParentType extends ResolversParentTypes['AvailabilityException'] = ResolversParentTypes['AvailabilityException']> = {
  endsAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  endsAtLocal?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  startsAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  startsAtLocal?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timeZone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type AvailabilityExceptionSessionConflictResolvers<ContextType = any, ParentType extends ResolversParentTypes['AvailabilityExceptionSessionConflict'] = ResolversParentTypes['AvailabilityExceptionSessionConflict']> = {
  absenceRequestPath?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  classSessionIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BookClassSessionResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['BookClassSessionResult'] = ResolversParentTypes['BookClassSessionResult']> = {
  __resolveType: TypeResolveFn<'BookClassSessionSuccess' | 'BookingError', ParentType, ContextType>;
};

export type BookClassSessionSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['BookClassSessionSuccess'] = ResolversParentTypes['BookClassSessionSuccess']> = {
  account?: Resolver<ResolversTypes['ClassCreditAccount'], ParentType, ContextType>;
  booking?: Resolver<ResolversTypes['Booking'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BookingResolvers<ContextType = any, ParentType extends ResolversParentTypes['Booking'] = ResolversParentTypes['Booking']> = {
  bookedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  classCreditRefunded?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  classSession?: Resolver<ResolversTypes['ClassSession'], ParentType, ContextType>;
  endedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['BookingState'], ParentType, ContextType>;
  terminalReason?: Resolver<Maybe<ResolversTypes['BookingTerminalReason']>, ParentType, ContextType>;
};

export type BookingErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['BookingError'] = ResolversParentTypes['BookingError']> = {
  code?: Resolver<ResolversTypes['BookingErrorCode'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CancelBookingResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['CancelBookingResult'] = ResolversParentTypes['CancelBookingResult']> = {
  __resolveType: TypeResolveFn<'BookingError' | 'CancelBookingSuccess', ParentType, ContextType>;
};

export type CancelBookingSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['CancelBookingSuccess'] = ResolversParentTypes['CancelBookingSuccess']> = {
  account?: Resolver<ResolversTypes['ClassCreditAccount'], ParentType, ContextType>;
  booking?: Resolver<ResolversTypes['Booking'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CancelClassSessionResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['CancelClassSessionResult'] = ResolversParentTypes['CancelClassSessionResult']> = {
  __resolveType: TypeResolveFn<'CancelClassSessionSuccess' | 'ClassSessionDisruptionError', ParentType, ContextType>;
};

export type CancelClassSessionSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['CancelClassSessionSuccess'] = ResolversParentTypes['CancelClassSessionSuccess']> = {
  absenceRequest?: Resolver<ResolversTypes['AbsenceRequest'], ParentType, ContextType>;
  classSession?: Resolver<ResolversTypes['ClassSession'], ParentType, ContextType>;
  refundedBookingCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  removedWaitlistEntryCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ChangeClassSessionSeatCapacityResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['ChangeClassSessionSeatCapacityResult'] = ResolversParentTypes['ChangeClassSessionSeatCapacityResult']> = {
  __resolveType: TypeResolveFn<'ChangeClassSessionSeatCapacitySuccess' | 'ClassSessionSeatCapacityError' | 'CurriculumConflict', ParentType, ContextType>;
};

export type ChangeClassSessionSeatCapacitySuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['ChangeClassSessionSeatCapacitySuccess'] = ResolversParentTypes['ChangeClassSessionSeatCapacitySuccess']> = {
  classSession?: Resolver<ResolversTypes['ClassSession'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ChangeTeacherQualificationSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['ChangeTeacherQualificationSuccess'] = ResolversParentTypes['ChangeTeacherQualificationSuccess']> = {
  teacherProfile?: Resolver<ResolversTypes['PublicTeacherProfile'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ClassCreditAccountResolvers<ContextType = any, ParentType extends ResolversParentTypes['ClassCreditAccount'] = ResolversParentTypes['ClassCreditAccount']> = {
  availableBalance?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  ledger?: Resolver<Array<ResolversTypes['ClassCreditLedgerEntry']>, ParentType, ContextType>;
  studentUserId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type ClassCreditAdjustmentErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['ClassCreditAdjustmentError'] = ResolversParentTypes['ClassCreditAdjustmentError']> = {
  code?: Resolver<ResolversTypes['ClassCreditAdjustmentErrorCode'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ClassCreditLedgerEntryResolvers<ContextType = any, ParentType extends ResolversParentTypes['ClassCreditLedgerEntry'] = ResolversParentTypes['ClassCreditLedgerEntry']> = {
  amount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  source?: Resolver<ResolversTypes['ClassCreditLedgerSource'], ParentType, ContextType>;
  sourceReference?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ClassRosterResolvers<ContextType = any, ParentType extends ResolversParentTypes['ClassRoster'] = ResolversParentTypes['ClassRoster']> = {
  classSession?: Resolver<ResolversTypes['ClassSession'], ParentType, ContextType>;
  students?: Resolver<Array<ResolversTypes['ClassRosterStudent']>, ParentType, ContextType>;
};

export type ClassRosterStudentResolvers<ContextType = any, ParentType extends ResolversParentTypes['ClassRosterStudent'] = ResolversParentTypes['ClassRosterStudent']> = {
  attendance?: Resolver<Maybe<ResolversTypes['AttendanceRecord']>, ParentType, ContextType>;
  bookingId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  placement?: Resolver<Maybe<ResolversTypes['StudentPlacement']>, ParentType, ContextType>;
  studentUserId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type ClassSessionResolvers<ContextType = any, ParentType extends ResolversParentTypes['ClassSession'] = ResolversParentTypes['ClassSession']> = {
  cancellationReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  endsAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lessonUnitId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  occupiedSeats?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  schedulingTimeZone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  seatCapacity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  startsAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['ClassSessionState'], ParentType, ContextType>;
  teacherUserId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type ClassSessionDiscoveryConnectionResolvers<ContextType = any, ParentType extends ResolversParentTypes['ClassSessionDiscoveryConnection'] = ResolversParentTypes['ClassSessionDiscoveryConnection']> = {
  appliedFilter?: Resolver<ResolversTypes['ClassSessionDiscoveryFilter'], ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['DiscoverableClassSession']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['ClassSessionDiscoveryPageInfo'], ParentType, ContextType>;
};

export type ClassSessionDiscoveryFilterResolvers<ContextType = any, ParentType extends ResolversParentTypes['ClassSessionDiscoveryFilter'] = ResolversParentTypes['ClassSessionDiscoveryFilter']> = {
  curriculumLevel?: Resolver<Maybe<ResolversTypes['CurriculumLevel']>, ParentType, ContextType>;
  localDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  targetLanguage?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  teacherUserId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  topicKeys?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

export type ClassSessionDiscoveryOptionsResolvers<ContextType = any, ParentType extends ResolversParentTypes['ClassSessionDiscoveryOptions'] = ResolversParentTypes['ClassSessionDiscoveryOptions']> = {
  targetLanguages?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  teachers?: Resolver<Array<ResolversTypes['ClassSessionDiscoveryTeacherOption']>, ParentType, ContextType>;
  topics?: Resolver<Array<ResolversTypes['Topic']>, ParentType, ContextType>;
};

export type ClassSessionDiscoveryPageInfoResolvers<ContextType = any, ParentType extends ResolversParentTypes['ClassSessionDiscoveryPageInfo'] = ResolversParentTypes['ClassSessionDiscoveryPageInfo']> = {
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type ClassSessionDiscoveryTeacherOptionResolvers<ContextType = any, ParentType extends ResolversParentTypes['ClassSessionDiscoveryTeacherOption'] = ResolversParentTypes['ClassSessionDiscoveryTeacherOption']> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type ClassSessionDisruptionErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['ClassSessionDisruptionError'] = ResolversParentTypes['ClassSessionDisruptionError']> = {
  code?: Resolver<ResolversTypes['ClassSessionDisruptionErrorCode'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ClassSessionPublicationErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['ClassSessionPublicationError'] = ResolversParentTypes['ClassSessionPublicationError']> = {
  code?: Resolver<ResolversTypes['ClassSessionPublicationErrorCode'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ClassSessionSeatCapacityErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['ClassSessionSeatCapacityError'] = ResolversParentTypes['ClassSessionSeatCapacityError']> = {
  code?: Resolver<ResolversTypes['ClassSessionSeatCapacityErrorCode'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ClassroomResolvers<ContextType = any, ParentType extends ResolversParentTypes['Classroom'] = ResolversParentTypes['Classroom']> = {
  classSessionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lessonUnitId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  simulationStatus?: Resolver<ResolversTypes['ClassroomSimulationStatus'], ParentType, ContextType>;
  teacherUserId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type ClassroomAccessErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['ClassroomAccessError'] = ResolversParentTypes['ClassroomAccessError']> = {
  code?: Resolver<ResolversTypes['ClassroomAccessErrorCode'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CohortResolvers<ContextType = any, ParentType extends ResolversParentTypes['Cohort'] = ResolversParentTypes['Cohort']> = {
  attributedActivity?: Resolver<ResolversTypes['CohortAttributedActivity'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  memberships?: Resolver<Array<ResolversTypes['CohortMembership']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  organization?: Resolver<ResolversTypes['Organization'], ParentType, ContextType>;
};

export type CohortAttributedActivityResolvers<ContextType = any, ParentType extends ResolversParentTypes['CohortAttributedActivity'] = ResolversParentTypes['CohortAttributedActivity']> = {
  attendedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  noShowCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type CohortErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['CohortError'] = ResolversParentTypes['CohortError']> = {
  code?: Resolver<ResolversTypes['CohortErrorCode'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CohortMembershipResolvers<ContextType = any, ParentType extends ResolversParentTypes['CohortMembership'] = ResolversParentTypes['CohortMembership']> = {
  attributedActivity?: Resolver<ResolversTypes['CohortAttributedActivity'], ParentType, ContextType>;
  cohortId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  cohortName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  effectiveFrom?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  effectiveUntil?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sponsorshipId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  studentDisplayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  studentUserId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type CohortMembershipSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['CohortMembershipSuccess'] = ResolversParentTypes['CohortMembershipSuccess']> = {
  cohort?: Resolver<ResolversTypes['Cohort'], ParentType, ContextType>;
  membership?: Resolver<ResolversTypes['CohortMembership'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CohortSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['CohortSuccess'] = ResolversParentTypes['CohortSuccess']> = {
  cohort?: Resolver<ResolversTypes['Cohort'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CourseResolvers<ContextType = any, ParentType extends ResolversParentTypes['Course'] = ResolversParentTypes['Course']> = {
  curriculumLevel?: Resolver<ResolversTypes['CurriculumLevel'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lessonUnits?: Resolver<Array<ResolversTypes['LessonUnit']>, ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  targetLanguage?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type CourseProgressResolvers<ContextType = any, ParentType extends ResolversParentTypes['CourseProgress'] = ResolversParentTypes['CourseProgress']> = {
  activeLessonUnitCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  completedActiveLessonUnitCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  courseId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  curriculumLevel?: Resolver<ResolversTypes['CurriculumLevel'], ParentType, ContextType>;
  learningHistory?: Resolver<Array<ResolversTypes['CourseProgressLearningHistory']>, ParentType, ContextType>;
  percentage?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  targetLanguage?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type CourseProgressLearningHistoryResolvers<ContextType = any, ParentType extends ResolversParentTypes['CourseProgressLearningHistory'] = ResolversParentTypes['CourseProgressLearningHistory']> = {
  countsTowardProgress?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  earnedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lessonUnitId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['LessonUnitState'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type CourseProgressSnapshotResolvers<ContextType = any, ParentType extends ResolversParentTypes['CourseProgressSnapshot'] = ResolversParentTypes['CourseProgressSnapshot']> = {
  activeLessonUnitCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  boundary?: Resolver<ResolversTypes['CourseProgressSnapshotBoundary'], ParentType, ContextType>;
  capturedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  completedActiveLessonUnitCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  courseId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  courseTitle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  percentage?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  revisedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  revisionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type CreateCohortResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['CreateCohortResult'] = ResolversParentTypes['CreateCohortResult']> = {
  __resolveType: TypeResolveFn<'CohortError' | 'CohortSuccess', ParentType, ContextType>;
};

export type CreateCourseResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['CreateCourseResult'] = ResolversParentTypes['CreateCourseResult']> = {
  __resolveType: TypeResolveFn<'CreateCourseSuccess' | 'CurriculumConflict', ParentType, ContextType>;
};

export type CreateCourseSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['CreateCourseSuccess'] = ResolversParentTypes['CreateCourseSuccess']> = {
  course?: Resolver<ResolversTypes['Course'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateLessonUnitResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['CreateLessonUnitResult'] = ResolversParentTypes['CreateLessonUnitResult']> = {
  __resolveType: TypeResolveFn<'CreateLessonUnitSuccess' | 'CurriculumConflict', ParentType, ContextType>;
};

export type CreateLessonUnitSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['CreateLessonUnitSuccess'] = ResolversParentTypes['CreateLessonUnitSuccess']> = {
  lessonUnit?: Resolver<ResolversTypes['LessonUnit'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CurriculumConflictResolvers<ContextType = any, ParentType extends ResolversParentTypes['CurriculumConflict'] = ResolversParentTypes['CurriculumConflict']> = {
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DecideAttendanceReviewResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['DecideAttendanceReviewResult'] = ResolversParentTypes['DecideAttendanceReviewResult']> = {
  __resolveType: TypeResolveFn<'AttendanceReviewError' | 'DecideAttendanceReviewSuccess', ParentType, ContextType>;
};

export type DecideAttendanceReviewSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['DecideAttendanceReviewSuccess'] = ResolversParentTypes['DecideAttendanceReviewSuccess']> = {
  attendanceReviewRequest?: Resolver<ResolversTypes['AttendanceReviewRequest'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DeclineSponsorshipInvitationResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['DeclineSponsorshipInvitationResult'] = ResolversParentTypes['DeclineSponsorshipInvitationResult']> = {
  __resolveType: TypeResolveFn<'DeclineSponsorshipInvitationSuccess' | 'SponsorshipInvitationResponseError', ParentType, ContextType>;
};

export type DeclineSponsorshipInvitationSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['DeclineSponsorshipInvitationSuccess'] = ResolversParentTypes['DeclineSponsorshipInvitationSuccess']> = {
  invitation?: Resolver<ResolversTypes['SponsorshipInvitation'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DiscoverableClassSessionResolvers<ContextType = any, ParentType extends ResolversParentTypes['DiscoverableClassSession'] = ResolversParentTypes['DiscoverableClassSession']> = {
  endsAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lessonUnit?: Resolver<ResolversTypes['DiscoveryLessonUnit'], ParentType, ContextType>;
  occupiedSeats?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  schedulingTimeZone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  seatCapacity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  startsAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  teacherProfile?: Resolver<ResolversTypes['PublicTeacherProfile'], ParentType, ContextType>;
};

export type DiscoveryLessonUnitResolvers<ContextType = any, ParentType extends ResolversParentTypes['DiscoveryLessonUnit'] = ResolversParentTypes['DiscoveryLessonUnit']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  objectives?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  topics?: Resolver<Array<ResolversTypes['Topic']>, ParentType, ContextType>;
};

export type EndCohortMembershipResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['EndCohortMembershipResult'] = ResolversParentTypes['EndCohortMembershipResult']> = {
  __resolveType: TypeResolveFn<'CohortError' | 'CohortMembershipSuccess', ParentType, ContextType>;
};

export type EndSponsorshipAsOrganizationResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['EndSponsorshipAsOrganizationResult'] = ResolversParentTypes['EndSponsorshipAsOrganizationResult']> = {
  __resolveType: TypeResolveFn<'EndSponsorshipAsOrganizationSuccess' | 'SponsorshipBoundaryError', ParentType, ContextType>;
};

export type EndSponsorshipAsOrganizationSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['EndSponsorshipAsOrganizationSuccess'] = ResolversParentTypes['EndSponsorshipAsOrganizationSuccess']> = {
  sponsorship?: Resolver<ResolversTypes['Sponsorship'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type EndSponsorshipAsStudentResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['EndSponsorshipAsStudentResult'] = ResolversParentTypes['EndSponsorshipAsStudentResult']> = {
  __resolveType: TypeResolveFn<'EndSponsorshipAsStudentSuccess' | 'SponsorshipBoundaryError', ParentType, ContextType>;
};

export type EndSponsorshipAsStudentSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['EndSponsorshipAsStudentSuccess'] = ResolversParentTypes['EndSponsorshipAsStudentSuccess']> = {
  account?: Resolver<ResolversTypes['ClassCreditAccount'], ParentType, ContextType>;
  sponsorship?: Resolver<ResolversTypes['Sponsorship'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type EndTeacherAvailabilityRangeResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['EndTeacherAvailabilityRangeResult'] = ResolversParentTypes['EndTeacherAvailabilityRangeResult']> = {
  __resolveType: TypeResolveFn<'EndTeacherAvailabilityRangeSuccess' | 'TeacherAvailabilityValidationError', ParentType, ContextType>;
};

export type EndTeacherAvailabilityRangeSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['EndTeacherAvailabilityRangeSuccess'] = ResolversParentTypes['EndTeacherAvailabilityRangeSuccess']> = {
  range?: Resolver<ResolversTypes['TeacherAvailabilityRange'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type EnterClassroomResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['EnterClassroomResult'] = ResolversParentTypes['EnterClassroomResult']> = {
  __resolveType: TypeResolveFn<'ClassroomAccessError' | 'EnterClassroomSuccess', ParentType, ContextType>;
};

export type EnterClassroomSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['EnterClassroomSuccess'] = ResolversParentTypes['EnterClassroomSuccess']> = {
  classroom?: Resolver<ResolversTypes['Classroom'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type FeedbackAndRatingItemResolvers<ContextType = any, ParentType extends ResolversParentTypes['FeedbackAndRatingItem'] = ResolversParentTypes['FeedbackAndRatingItem']> = {
  bookingId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  classSessionEndsAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  classSessionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  feedbackDeadline?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  learningFeedback?: Resolver<Maybe<ResolversTypes['LearningFeedback']>, ParentType, ContextType>;
  ratingDeadline?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sessionRating?: Resolver<Maybe<ResolversTypes['SessionRating']>, ParentType, ContextType>;
  studentDisplayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  teacherDisplayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type GrantRoleAssignmentResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['GrantRoleAssignmentResult'] = ResolversParentTypes['GrantRoleAssignmentResult']> = {
  __resolveType: TypeResolveFn<'RoleAssignmentChangeSuccess' | 'RoleAssignmentError', ParentType, ContextType>;
};

export type GrantTeacherQualificationResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['GrantTeacherQualificationResult'] = ResolversParentTypes['GrantTeacherQualificationResult']> = {
  __resolveType: TypeResolveFn<'ChangeTeacherQualificationSuccess' | 'CurriculumConflict', ParentType, ContextType>;
};

export type InAppNotificationResolvers<ContextType = any, ParentType extends ResolversParentTypes['InAppNotification'] = ResolversParentTypes['InAppNotification']> = {
  archivedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  messageId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  readAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  renderedContent?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type InstructionalIdentityLockedResolvers<ContextType = any, ParentType extends ResolversParentTypes['InstructionalIdentityLocked'] = ResolversParentTypes['InstructionalIdentityLocked']> = {
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lessonUnitId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InvalidLessonMaterialResolvers<ContextType = any, ParentType extends ResolversParentTypes['InvalidLessonMaterial'] = ResolversParentTypes['InvalidLessonMaterial']> = {
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InviteToSponsorshipResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['InviteToSponsorshipResult'] = ResolversParentTypes['InviteToSponsorshipResult']> = {
  __resolveType: TypeResolveFn<'InviteToSponsorshipSuccess' | 'SponsorshipInvitationError', ParentType, ContextType>;
};

export type InviteToSponsorshipSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['InviteToSponsorshipSuccess'] = ResolversParentTypes['InviteToSponsorshipSuccess']> = {
  invitation?: Resolver<ResolversTypes['SponsorshipInvitation'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type JoinWaitlistResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['JoinWaitlistResult'] = ResolversParentTypes['JoinWaitlistResult']> = {
  __resolveType: TypeResolveFn<'JoinWaitlistSuccess' | 'WaitlistError', ParentType, ContextType>;
};

export type JoinWaitlistSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['JoinWaitlistSuccess'] = ResolversParentTypes['JoinWaitlistSuccess']> = {
  entry?: Resolver<ResolversTypes['WaitlistEntry'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LearningAccessLessonUnitResolvers<ContextType = any, ParentType extends ResolversParentTypes['LearningAccessLessonUnit'] = ResolversParentTypes['LearningAccessLessonUnit']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type LearningFeedbackResolvers<ContextType = any, ParentType extends ResolversParentTypes['LearningFeedback'] = ResolversParentTypes['LearningFeedback']> = {
  bookingId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  nextPractice?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  observations?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  observedStrengths?: Resolver<Array<ResolversTypes['FeedbackSkill']>, ParentType, ContextType>;
  redactedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  redactionReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  state?: Resolver<ResolversTypes['LearningFeedbackState'], ParentType, ContextType>;
  submittedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  suggestedFocuses?: Resolver<Array<ResolversTypes['FeedbackSkill']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type LearningFeedbackErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['LearningFeedbackError'] = ResolversParentTypes['LearningFeedbackError']> = {
  code?: Resolver<ResolversTypes['LearningFeedbackErrorCode'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LessonMaterialResolvers<ContextType = any, ParentType extends ResolversParentTypes['LessonMaterial'] = ResolversParentTypes['LessonMaterial']> = {
  httpsUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['LessonMaterialKind'], ParentType, ContextType>;
  publisher?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  structuredContent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type LessonUnitResolvers<ContextType = any, ParentType extends ResolversParentTypes['LessonUnit'] = ResolversParentTypes['LessonUnit']> = {
  courseId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  materials?: Resolver<Array<ResolversTypes['LessonMaterial']>, ParentType, ContextType>;
  objectives?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  order?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['LessonUnitState'], ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  topics?: Resolver<Array<ResolversTypes['Topic']>, ParentType, ContextType>;
};

export type MarketplaceActionableExceptionsResolvers<ContextType = any, ParentType extends ResolversParentTypes['MarketplaceActionableExceptions'] = ResolversParentTypes['MarketplaceActionableExceptions']> = {
  items?: Resolver<Array<ResolversTypes['MarketplaceExceptionItem']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type MarketplaceAttendanceSummaryResolvers<ContextType = any, ParentType extends ResolversParentTypes['MarketplaceAttendanceSummary'] = ResolversParentTypes['MarketplaceAttendanceSummary']> = {
  attendanceRatePercentage?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  attendedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  correctedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  exceptionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  excludedUnrecordedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  noShowCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  recordedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type MarketplaceCancellationSummaryResolvers<ContextType = any, ParentType extends ResolversParentTypes['MarketplaceCancellationSummary'] = ResolversParentTypes['MarketplaceCancellationSummary']> = {
  dailyRates?: Resolver<Array<ResolversTypes['MarketplaceDailyCancellationRate']>, ParentType, ContextType>;
  excludedClassSessionCancellationCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  excludedRescheduleCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lateCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  studentCancellationCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  studentCancellationRatePercentage?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  timelyCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type MarketplaceCorrectionSummaryResolvers<ContextType = any, ParentType extends ResolversParentTypes['MarketplaceCorrectionSummary'] = ResolversParentTypes['MarketplaceCorrectionSummary']> = {
  correctedAttendanceCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lastCorrectedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pendingAttendanceReviewCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type MarketplaceCourseProgressReportResolvers<ContextType = any, ParentType extends ResolversParentTypes['MarketplaceCourseProgressReport'] = ResolversParentTypes['MarketplaceCourseProgressReport']> = {
  activeLessonUnitCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  completedActiveLessonUnitCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  courseId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  courseTitle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  curriculumLevel?: Resolver<ResolversTypes['CurriculumLevel'], ParentType, ContextType>;
  studentsWithProgressCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  targetLanguage?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MarketplaceCreditSourceTotalResolvers<ContextType = any, ParentType extends ResolversParentTypes['MarketplaceCreditSourceTotal'] = ResolversParentTypes['MarketplaceCreditSourceTotal']> = {
  entryCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  netAmount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['ClassCreditLedgerSource'], ParentType, ContextType>;
};

export type MarketplaceCreditSummaryResolvers<ContextType = any, ParentType extends ResolversParentTypes['MarketplaceCreditSummary'] = ResolversParentTypes['MarketplaceCreditSummary']> = {
  bySource?: Resolver<Array<ResolversTypes['MarketplaceCreditSourceTotal']>, ParentType, ContextType>;
  creditAdjustmentCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  deductedCreditCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  grantedCreditCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  netCreditChange?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  refundedCreditCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type MarketplaceDailyCancellationRateResolvers<ContextType = any, ParentType extends ResolversParentTypes['MarketplaceDailyCancellationRate'] = ResolversParentTypes['MarketplaceDailyCancellationRate']> = {
  excludedUnrecordedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lateCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  localDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  recordedOutcomeCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  studentCancellationCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  studentCancellationRatePercentage?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  timelyCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type MarketplaceExceptionItemResolvers<ContextType = any, ParentType extends ResolversParentTypes['MarketplaceExceptionItem'] = ResolversParentTypes['MarketplaceExceptionItem']> = {
  affectedBookingCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  classSessionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  courseTitle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['MarketplaceExceptionKind'], ParentType, ContextType>;
  lessonUnitTitle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  occurredAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  teacherDisplayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MarketplaceOperationalReportResolvers<ContextType = any, ParentType extends ResolversParentTypes['MarketplaceOperationalReport'] = ResolversParentTypes['MarketplaceOperationalReport']> = {
  actionableExceptions?: Resolver<ResolversTypes['MarketplaceActionableExceptions'], ParentType, ContextType>;
  attendance?: Resolver<ResolversTypes['MarketplaceAttendanceSummary'], ParentType, ContextType>;
  cancellations?: Resolver<ResolversTypes['MarketplaceCancellationSummary'], ParentType, ContextType>;
  corrections?: Resolver<ResolversTypes['MarketplaceCorrectionSummary'], ParentType, ContextType>;
  courseProgress?: Resolver<Array<ResolversTypes['MarketplaceCourseProgressReport']>, ParentType, ContextType>;
  credits?: Resolver<ResolversTypes['MarketplaceCreditSummary'], ParentType, ContextType>;
  generatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  range?: Resolver<ResolversTypes['MarketplaceReportRange'], ParentType, ContextType>;
};

export type MarketplaceReportRangeResolvers<ContextType = any, ParentType extends ResolversParentTypes['MarketplaceReportRange'] = ResolversParentTypes['MarketplaceReportRange']> = {
  fromLocalDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timeZone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  toLocalDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  acceptSponsorshipInvitation?: Resolver<ResolversTypes['AcceptSponsorshipInvitationResult'], ParentType, ContextType, RequireFields<MutationAcceptSponsorshipInvitationArgs, 'input'>>;
  addAvailabilityException?: Resolver<ResolversTypes['AddAvailabilityExceptionResult'], ParentType, ContextType, RequireFields<MutationAddAvailabilityExceptionArgs, 'input'>>;
  addCohortMembership?: Resolver<ResolversTypes['AddCohortMembershipResult'], ParentType, ContextType, RequireFields<MutationAddCohortMembershipArgs, 'input'>>;
  addLessonMaterial?: Resolver<ResolversTypes['AddLessonMaterialResult'], ParentType, ContextType, RequireFields<MutationAddLessonMaterialArgs, 'input'>>;
  adjustClassCredits?: Resolver<ResolversTypes['AdjustClassCreditsResult'], ParentType, ContextType, RequireFields<MutationAdjustClassCreditsArgs, 'input'>>;
  administerAttendance?: Resolver<ResolversTypes['RecordAttendanceResult'], ParentType, ContextType, RequireFields<MutationAdministerAttendanceArgs, 'input'>>;
  archiveNotification?: Resolver<ResolversTypes['InAppNotification'], ParentType, ContextType, RequireFields<MutationArchiveNotificationArgs, 'id'>>;
  bookClassSession?: Resolver<ResolversTypes['BookClassSessionResult'], ParentType, ContextType, RequireFields<MutationBookClassSessionArgs, 'input'>>;
  cancelBooking?: Resolver<ResolversTypes['CancelBookingResult'], ParentType, ContextType, RequireFields<MutationCancelBookingArgs, 'input'>>;
  cancelClassSession?: Resolver<ResolversTypes['CancelClassSessionResult'], ParentType, ContextType, RequireFields<MutationCancelClassSessionArgs, 'input'>>;
  changeClassSessionSeatCapacity?: Resolver<ResolversTypes['ChangeClassSessionSeatCapacityResult'], ParentType, ContextType, RequireFields<MutationChangeClassSessionSeatCapacityArgs, 'input'>>;
  createCohort?: Resolver<ResolversTypes['CreateCohortResult'], ParentType, ContextType, RequireFields<MutationCreateCohortArgs, 'input'>>;
  createCourse?: Resolver<ResolversTypes['CreateCourseResult'], ParentType, ContextType, RequireFields<MutationCreateCourseArgs, 'input'>>;
  createLessonUnit?: Resolver<ResolversTypes['CreateLessonUnitResult'], ParentType, ContextType, RequireFields<MutationCreateLessonUnitArgs, 'input'>>;
  decideAttendanceReview?: Resolver<ResolversTypes['DecideAttendanceReviewResult'], ParentType, ContextType, RequireFields<MutationDecideAttendanceReviewArgs, 'input'>>;
  declineSponsorshipInvitation?: Resolver<ResolversTypes['DeclineSponsorshipInvitationResult'], ParentType, ContextType, RequireFields<MutationDeclineSponsorshipInvitationArgs, 'input'>>;
  endCohortMembership?: Resolver<ResolversTypes['EndCohortMembershipResult'], ParentType, ContextType, RequireFields<MutationEndCohortMembershipArgs, 'input'>>;
  endSponsorshipAsOrganization?: Resolver<ResolversTypes['EndSponsorshipAsOrganizationResult'], ParentType, ContextType, RequireFields<MutationEndSponsorshipAsOrganizationArgs, 'input'>>;
  endSponsorshipAsStudent?: Resolver<ResolversTypes['EndSponsorshipAsStudentResult'], ParentType, ContextType, RequireFields<MutationEndSponsorshipAsStudentArgs, 'input'>>;
  endTeacherAvailabilityRange?: Resolver<ResolversTypes['EndTeacherAvailabilityRangeResult'], ParentType, ContextType, RequireFields<MutationEndTeacherAvailabilityRangeArgs, 'input'>>;
  enterClassroom?: Resolver<ResolversTypes['EnterClassroomResult'], ParentType, ContextType, RequireFields<MutationEnterClassroomArgs, 'input'>>;
  grantRoleAssignment?: Resolver<ResolversTypes['GrantRoleAssignmentResult'], ParentType, ContextType, RequireFields<MutationGrantRoleAssignmentArgs, 'input'>>;
  grantTeacherQualification?: Resolver<ResolversTypes['GrantTeacherQualificationResult'], ParentType, ContextType, RequireFields<MutationGrantTeacherQualificationArgs, 'input'>>;
  inviteToSponsorship?: Resolver<ResolversTypes['InviteToSponsorshipResult'], ParentType, ContextType, RequireFields<MutationInviteToSponsorshipArgs, 'input'>>;
  joinWaitlist?: Resolver<ResolversTypes['JoinWaitlistResult'], ParentType, ContextType, RequireFields<MutationJoinWaitlistArgs, 'input'>>;
  markNotificationRead?: Resolver<ResolversTypes['InAppNotification'], ParentType, ContextType, RequireFields<MutationMarkNotificationReadArgs, 'id'>>;
  placeLessonUnitInCourse?: Resolver<ResolversTypes['ReorderLessonUnitResult'], ParentType, ContextType, RequireFields<MutationPlaceLessonUnitInCourseArgs, 'input'>>;
  processSubscriptionProviderEvent?: Resolver<ResolversTypes['ProcessSubscriptionProviderEventResult'], ParentType, ContextType, RequireFields<MutationProcessSubscriptionProviderEventArgs, 'input'>>;
  publishClassSession?: Resolver<ResolversTypes['PublishClassSessionResult'], ParentType, ContextType, RequireFields<MutationPublishClassSessionArgs, 'input'>>;
  reactivateUser?: Resolver<ResolversTypes['ReactivateUserResult'], ParentType, ContextType, RequireFields<MutationReactivateUserArgs, 'input'>>;
  recordAttendance?: Resolver<ResolversTypes['RecordAttendanceResult'], ParentType, ContextType, RequireFields<MutationRecordAttendanceArgs, 'input'>>;
  redactLearningFeedback?: Resolver<ResolversTypes['RedactLearningFeedbackResult'], ParentType, ContextType, RequireFields<MutationRedactLearningFeedbackArgs, 'input'>>;
  redactSessionRatingComment?: Resolver<ResolversTypes['RedactSessionRatingCommentResult'], ParentType, ContextType, RequireFields<MutationRedactSessionRatingCommentArgs, 'input'>>;
  rememberRoleWorkspacePlace?: Resolver<ResolversTypes['RolePlace'], ParentType, ContextType, RequireFields<MutationRememberRoleWorkspacePlaceArgs, 'input'>>;
  removeAvailabilityException?: Resolver<ResolversTypes['RemoveAvailabilityExceptionResult'], ParentType, ContextType, RequireFields<MutationRemoveAvailabilityExceptionArgs, 'input'>>;
  removeRoleAssignment?: Resolver<ResolversTypes['RemoveRoleAssignmentResult'], ParentType, ContextType, RequireFields<MutationRemoveRoleAssignmentArgs, 'input'>>;
  removeTeacherQualification?: Resolver<ResolversTypes['RemoveTeacherQualificationResult'], ParentType, ContextType, RequireFields<MutationRemoveTeacherQualificationArgs, 'input'>>;
  renameCohort?: Resolver<ResolversTypes['RenameCohortResult'], ParentType, ContextType, RequireFields<MutationRenameCohortArgs, 'input'>>;
  reportAbsence?: Resolver<ResolversTypes['ReportAbsenceResult'], ParentType, ContextType, RequireFields<MutationReportAbsenceArgs, 'input'>>;
  requestAttendanceReview?: Resolver<ResolversTypes['RequestAttendanceReviewResult'], ParentType, ContextType, RequireFields<MutationRequestAttendanceReviewArgs, 'input'>>;
  requestReportExport?: Resolver<ResolversTypes['RequestReportExportResult'], ParentType, ContextType, RequireFields<MutationRequestReportExportArgs, 'input'>>;
  rescheduleBooking?: Resolver<ResolversTypes['RescheduleBookingResult'], ParentType, ContextType, RequireFields<MutationRescheduleBookingArgs, 'input'>>;
  resolveAdministratorTask?: Resolver<ResolversTypes['ResolveAdministratorTaskResult'], ParentType, ContextType, RequireFields<MutationResolveAdministratorTaskArgs, 'input'>>;
  retireLessonUnit?: Resolver<ResolversTypes['RetireLessonUnitResult'], ParentType, ContextType, RequireFields<MutationRetireLessonUnitArgs, 'input'>>;
  reviseCourseDetails?: Resolver<ResolversTypes['UpdateCourseResult'], ParentType, ContextType, RequireFields<MutationReviseCourseDetailsArgs, 'input'>>;
  reviseLessonMaterial?: Resolver<ResolversTypes['ReviseLessonMaterialResult'], ParentType, ContextType, RequireFields<MutationReviseLessonMaterialArgs, 'input'>>;
  reviseLessonUnitIdentity?: Resolver<ResolversTypes['UpdateLessonUnitResult'], ParentType, ContextType, RequireFields<MutationReviseLessonUnitIdentityArgs, 'input'>>;
  saveLearningFeedback?: Resolver<ResolversTypes['SaveLearningFeedbackResult'], ParentType, ContextType, RequireFields<MutationSaveLearningFeedbackArgs, 'input'>>;
  saveLocalizedTopic?: Resolver<ResolversTypes['UpsertTopicSuccess'], ParentType, ContextType, RequireFields<MutationSaveLocalizedTopicArgs, 'input'>>;
  saveSessionRating?: Resolver<ResolversTypes['SaveSessionRatingResult'], ParentType, ContextType, RequireFields<MutationSaveSessionRatingArgs, 'input'>>;
  saveTeacherAvailabilityRange?: Resolver<ResolversTypes['SaveTeacherAvailabilityRangeResult'], ParentType, ContextType, RequireFields<MutationSaveTeacherAvailabilityRangeArgs, 'input'>>;
  saveTeacherProfile?: Resolver<ResolversTypes['SaveTeacherProfileSuccess'], ParentType, ContextType, RequireFields<MutationSaveTeacherProfileArgs, 'input'>>;
  saveUserPreferences?: Resolver<ResolversTypes['SaveUserPreferencesPayload'], ParentType, ContextType, RequireFields<MutationSaveUserPreferencesArgs, 'input'>>;
  scheduleSubscriptionCancellation?: Resolver<ResolversTypes['ScheduleSubscriptionCancellationResult'], ParentType, ContextType, RequireFields<MutationScheduleSubscriptionCancellationArgs, 'input'>>;
  setStudentPlacement?: Resolver<ResolversTypes['StudentPlacement'], ParentType, ContextType, RequireFields<MutationSetStudentPlacementArgs, 'input'>>;
  substituteTeacher?: Resolver<ResolversTypes['SubstituteTeacherResult'], ParentType, ContextType, RequireFields<MutationSubstituteTeacherArgs, 'input'>>;
  suspendUser?: Resolver<ResolversTypes['SuspendUserResult'], ParentType, ContextType, RequireFields<MutationSuspendUserArgs, 'input'>>;
  undoSubscriptionCancellation?: Resolver<ResolversTypes['UndoSubscriptionCancellationResult'], ParentType, ContextType, RequireFields<MutationUndoSubscriptionCancellationArgs, 'input'>>;
  withdrawWaitlist?: Resolver<ResolversTypes['WithdrawWaitlistResult'], ParentType, ContextType, RequireFields<MutationWithdrawWaitlistArgs, 'input'>>;
};

export type OrganizationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Organization'] = ResolversParentTypes['Organization']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type OrganizationAttendanceAndProgressReportResolvers<ContextType = any, ParentType extends ResolversParentTypes['OrganizationAttendanceAndProgressReport'] = ResolversParentTypes['OrganizationAttendanceAndProgressReport']> = {
  attendance?: Resolver<ResolversTypes['OrganizationAttendanceSummary'], ParentType, ContextType>;
  cohorts?: Resolver<Array<ResolversTypes['OrganizationCohortReport']>, ParentType, ContextType>;
  generatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  organization?: Resolver<ResolversTypes['Organization'], ParentType, ContextType>;
  students?: Resolver<Array<ResolversTypes['OrganizationSponsoredStudentReport']>, ParentType, ContextType>;
};

export type OrganizationAttendanceSummaryResolvers<ContextType = any, ParentType extends ResolversParentTypes['OrganizationAttendanceSummary'] = ResolversParentTypes['OrganizationAttendanceSummary']> = {
  attendanceRatePercentage?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  attendedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  correctedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  exceptionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  excludedUnrecordedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  noShowCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  recordedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type OrganizationCohortReportResolvers<ContextType = any, ParentType extends ResolversParentTypes['OrganizationCohortReport'] = ResolversParentTypes['OrganizationCohortReport']> = {
  attendance?: Resolver<ResolversTypes['OrganizationAttendanceSummary'], ParentType, ContextType>;
  cohortId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  cohortName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sponsoredStudentCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type OrganizationCourseProgressReportResolvers<ContextType = any, ParentType extends ResolversParentTypes['OrganizationCourseProgressReport'] = ResolversParentTypes['OrganizationCourseProgressReport']> = {
  baseline?: Resolver<ResolversTypes['OrganizationCourseProgressValue'], ParentType, ContextType>;
  baselineCapturedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  completedLessonUnitGain?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  courseId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  courseTitle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  currentEffective?: Resolver<Maybe<ResolversTypes['OrganizationCourseProgressValue']>, ParentType, ContextType>;
  endingSnapshot?: Resolver<Maybe<ResolversTypes['OrganizationCourseProgressValue']>, ParentType, ContextType>;
  endingSnapshotCapturedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastRevisedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  percentagePointGain?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  snapshotRevisionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type OrganizationCourseProgressValueResolvers<ContextType = any, ParentType extends ResolversParentTypes['OrganizationCourseProgressValue'] = ResolversParentTypes['OrganizationCourseProgressValue']> = {
  activeLessonUnitCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  completedActiveLessonUnitCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  percentage?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type OrganizationSponsoredStudentReportResolvers<ContextType = any, ParentType extends ResolversParentTypes['OrganizationSponsoredStudentReport'] = ResolversParentTypes['OrganizationSponsoredStudentReport']> = {
  attendance?: Resolver<ResolversTypes['OrganizationAttendanceSummary'], ParentType, ContextType>;
  cohortNames?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  courseProgress?: Resolver<Array<ResolversTypes['OrganizationCourseProgressReport']>, ParentType, ContextType>;
  reportingFrom?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reportingUntil?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sponsorshipId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['SponsorshipState'], ParentType, ContextType>;
  studentDisplayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  studentUserId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type ProcessSubscriptionProviderEventResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['ProcessSubscriptionProviderEventResult'] = ResolversParentTypes['ProcessSubscriptionProviderEventResult']> = {
  __resolveType: TypeResolveFn<'ProcessSubscriptionProviderEventSuccess' | 'SubscriptionConflict', ParentType, ContextType>;
};

export type ProcessSubscriptionProviderEventSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['ProcessSubscriptionProviderEventSuccess'] = ResolversParentTypes['ProcessSubscriptionProviderEventSuccess']> = {
  account?: Resolver<ResolversTypes['ClassCreditAccount'], ParentType, ContextType>;
  subscription?: Resolver<ResolversTypes['Subscription'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PublicTeacherProfileResolvers<ContextType = any, ParentType extends ResolversParentTypes['PublicTeacherProfile'] = ResolversParentTypes['PublicTeacherProfile']> = {
  completedSessionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  professionalBiography?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  profileImageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pronouns?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  qualifiedCurriculumLevels?: Resolver<Array<ResolversTypes['CurriculumLevel']>, ParentType, ContextType>;
  taughtLanguages?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  teachingTopics?: Resolver<Array<ResolversTypes['Topic']>, ParentType, ContextType>;
};

export type PublishClassSessionResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['PublishClassSessionResult'] = ResolversParentTypes['PublishClassSessionResult']> = {
  __resolveType: TypeResolveFn<'ClassSessionPublicationError' | 'CurriculumConflict' | 'PublishClassSessionSuccess', ParentType, ContextType>;
};

export type PublishClassSessionSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['PublishClassSessionSuccess'] = ResolversParentTypes['PublishClassSessionSuccess']> = {
  classSession?: Resolver<ResolversTypes['ClassSession'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  administrationAbsenceRequests?: Resolver<Array<ResolversTypes['AbsenceRequest']>, ParentType, ContextType>;
  administrationAttendanceReviewRequests?: Resolver<Array<ResolversTypes['AttendanceReviewRequest']>, ParentType, ContextType>;
  administrationClassCredits?: Resolver<Maybe<ResolversTypes['ClassCreditAccount']>, ParentType, ContextType, RequireFields<QueryAdministrationClassCreditsArgs, 'studentUserId'>>;
  administrationClassSessions?: Resolver<Array<ResolversTypes['ClassSession']>, ParentType, ContextType>;
  administrationCurriculum?: Resolver<ResolversTypes['AdministrationCurriculum'], ParentType, ContextType, RequireFields<QueryAdministrationCurriculumArgs, 'locale'>>;
  administratorFeedbackAndRatings?: Resolver<Array<ResolversTypes['FeedbackAndRatingItem']>, ParentType, ContextType>;
  administratorTasks?: Resolver<Array<ResolversTypes['AdministratorTaskItem']>, ParentType, ContextType>;
  classRoster?: Resolver<Maybe<ResolversTypes['ClassRoster']>, ParentType, ContextType, RequireFields<QueryClassRosterArgs, 'actingRole' | 'classSessionId'>>;
  classSessionDiscoveryOptions?: Resolver<ResolversTypes['ClassSessionDiscoveryOptions'], ParentType, ContextType>;
  discoverClassSessions?: Resolver<ResolversTypes['ClassSessionDiscoveryConnection'], ParentType, ContextType, RequireFields<QueryDiscoverClassSessionsArgs, 'input'>>;
  learningAccessClassSessions?: Resolver<Array<ResolversTypes['ClassSession']>, ParentType, ContextType, RequireFields<QueryLearningAccessClassSessionsArgs, 'actingRole'>>;
  learningAccessLessonUnits?: Resolver<Array<ResolversTypes['LearningAccessLessonUnit']>, ParentType, ContextType, RequireFields<QueryLearningAccessLessonUnitsArgs, 'actingRole'>>;
  lessonMaterials?: Resolver<Maybe<Array<ResolversTypes['LessonMaterial']>>, ParentType, ContextType, RequireFields<QueryLessonMaterialsArgs, 'actingRole' | 'lessonUnitId'>>;
  marketplaceOperationalReport?: Resolver<ResolversTypes['MarketplaceOperationalReport'], ParentType, ContextType, Partial<QueryMarketplaceOperationalReportArgs>>;
  notifications?: Resolver<Array<ResolversTypes['InAppNotification']>, ParentType, ContextType>;
  organizationAttendanceAndProgressReport?: Resolver<ResolversTypes['OrganizationAttendanceAndProgressReport'], ParentType, ContextType, Partial<QueryOrganizationAttendanceAndProgressReportArgs>>;
  organizationCohorts?: Resolver<Array<ResolversTypes['Cohort']>, ParentType, ContextType>;
  organizationSponsoredStudents?: Resolver<Array<ResolversTypes['Sponsorship']>, ParentType, ContextType>;
  organizationSponsorshipInvitations?: Resolver<Array<ResolversTypes['SponsorshipInvitation']>, ParentType, ContextType>;
  publicTeacherProfile?: Resolver<Maybe<ResolversTypes['PublicTeacherProfile']>, ParentType, ContextType, RequireFields<QueryPublicTeacherProfileArgs, 'locale' | 'teacherUserId'>>;
  reportExportArtifact?: Resolver<ResolversTypes['ReportExportArtifact'], ParentType, ContextType, RequireFields<QueryReportExportArtifactArgs, 'id'>>;
  reportExports?: Resolver<Array<ResolversTypes['ReportExport']>, ParentType, ContextType>;
  roleAssignmentAdministration?: Resolver<ResolversTypes['RoleAssignmentAdministration'], ParentType, ContextType>;
  roleWorkspace?: Resolver<ResolversTypes['RoleWorkspace'], ParentType, ContextType, RequireFields<QueryRoleWorkspaceArgs, 'actingRole'>>;
  studentAttendanceRecords?: Resolver<Array<ResolversTypes['StudentAttendanceRecord']>, ParentType, ContextType>;
  studentBookings?: Resolver<Array<ResolversTypes['Booking']>, ParentType, ContextType>;
  studentClassCredits?: Resolver<ResolversTypes['ClassCreditAccount'], ParentType, ContextType>;
  studentCourseProgress?: Resolver<Array<ResolversTypes['CourseProgress']>, ParentType, ContextType>;
  studentFeedbackAndRatings?: Resolver<Array<ResolversTypes['FeedbackAndRatingItem']>, ParentType, ContextType>;
  studentPlacements?: Resolver<Array<ResolversTypes['StudentPlacement']>, ParentType, ContextType>;
  studentSponsorship?: Resolver<Maybe<ResolversTypes['Sponsorship']>, ParentType, ContextType>;
  studentSponsorshipInvitations?: Resolver<Array<ResolversTypes['SponsorshipInvitation']>, ParentType, ContextType>;
  studentSubscription?: Resolver<Maybe<ResolversTypes['Subscription']>, ParentType, ContextType>;
  studentWaitlistEntries?: Resolver<Array<ResolversTypes['WaitlistEntry']>, ParentType, ContextType>;
  studentWorkspace?: Resolver<ResolversTypes['StudentWorkspace'], ParentType, ContextType>;
  teacherAbsenceRequests?: Resolver<Array<ResolversTypes['AbsenceRequest']>, ParentType, ContextType>;
  teacherAttendanceClassSessions?: Resolver<Array<ResolversTypes['ClassSession']>, ParentType, ContextType>;
  teacherAvailability?: Resolver<ResolversTypes['TeacherAvailability'], ParentType, ContextType>;
  teacherAvailabilityPreview?: Resolver<Array<ResolversTypes['TeacherAvailabilityOccurrence']>, ParentType, ContextType, RequireFields<QueryTeacherAvailabilityPreviewArgs, 'localDates'>>;
  teacherClassSessions?: Resolver<Array<ResolversTypes['ClassSession']>, ParentType, ContextType>;
  teacherFeedbackWork?: Resolver<Array<ResolversTypes['FeedbackAndRatingItem']>, ParentType, ContextType>;
};

export type ReactivateUserResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['ReactivateUserResult'] = ResolversParentTypes['ReactivateUserResult']> = {
  __resolveType: TypeResolveFn<'UserAccessChangeSuccess' | 'UserAccessError', ParentType, ContextType>;
};

export type RecordAttendanceResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['RecordAttendanceResult'] = ResolversParentTypes['RecordAttendanceResult']> = {
  __resolveType: TypeResolveFn<'AttendanceError' | 'RecordAttendanceSuccess', ParentType, ContextType>;
};

export type RecordAttendanceSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['RecordAttendanceSuccess'] = ResolversParentTypes['RecordAttendanceSuccess']> = {
  classRoster?: Resolver<ResolversTypes['ClassRoster'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RedactLearningFeedbackResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['RedactLearningFeedbackResult'] = ResolversParentTypes['RedactLearningFeedbackResult']> = {
  __resolveType: TypeResolveFn<'LearningFeedbackError' | 'RedactLearningFeedbackSuccess', ParentType, ContextType>;
};

export type RedactLearningFeedbackSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['RedactLearningFeedbackSuccess'] = ResolversParentTypes['RedactLearningFeedbackSuccess']> = {
  feedback?: Resolver<ResolversTypes['LearningFeedback'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RedactSessionRatingCommentResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['RedactSessionRatingCommentResult'] = ResolversParentTypes['RedactSessionRatingCommentResult']> = {
  __resolveType: TypeResolveFn<'RedactSessionRatingCommentSuccess' | 'SessionRatingError', ParentType, ContextType>;
};

export type RedactSessionRatingCommentSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['RedactSessionRatingCommentSuccess'] = ResolversParentTypes['RedactSessionRatingCommentSuccess']> = {
  rating?: Resolver<ResolversTypes['SessionRating'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RemoveAvailabilityExceptionResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['RemoveAvailabilityExceptionResult'] = ResolversParentTypes['RemoveAvailabilityExceptionResult']> = {
  __resolveType: TypeResolveFn<'RemoveAvailabilityExceptionSuccess' | 'TeacherAvailabilityValidationError', ParentType, ContextType>;
};

export type RemoveAvailabilityExceptionSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['RemoveAvailabilityExceptionSuccess'] = ResolversParentTypes['RemoveAvailabilityExceptionSuccess']> = {
  exceptionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RemoveRoleAssignmentResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['RemoveRoleAssignmentResult'] = ResolversParentTypes['RemoveRoleAssignmentResult']> = {
  __resolveType: TypeResolveFn<'RoleAssignmentChangeSuccess' | 'RoleAssignmentError', ParentType, ContextType>;
};

export type RemoveTeacherQualificationResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['RemoveTeacherQualificationResult'] = ResolversParentTypes['RemoveTeacherQualificationResult']> = {
  __resolveType: TypeResolveFn<'ChangeTeacherQualificationSuccess' | 'CurriculumConflict' | 'TeacherQualificationRemovalBlocked', ParentType, ContextType>;
};

export type RenameCohortResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['RenameCohortResult'] = ResolversParentTypes['RenameCohortResult']> = {
  __resolveType: TypeResolveFn<'CohortError' | 'CohortSuccess', ParentType, ContextType>;
};

export type ReorderLessonUnitResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['ReorderLessonUnitResult'] = ResolversParentTypes['ReorderLessonUnitResult']> = {
  __resolveType: TypeResolveFn<'CurriculumConflict' | 'ReorderLessonUnitSuccess', ParentType, ContextType>;
};

export type ReorderLessonUnitSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['ReorderLessonUnitSuccess'] = ResolversParentTypes['ReorderLessonUnitSuccess']> = {
  lessonUnit?: Resolver<ResolversTypes['LessonUnit'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ReportAbsenceResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['ReportAbsenceResult'] = ResolversParentTypes['ReportAbsenceResult']> = {
  __resolveType: TypeResolveFn<'ClassSessionDisruptionError' | 'ReportAbsenceSuccess', ParentType, ContextType>;
};

export type ReportAbsenceSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['ReportAbsenceSuccess'] = ResolversParentTypes['ReportAbsenceSuccess']> = {
  absenceRequest?: Resolver<ResolversTypes['AbsenceRequest'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ReportExportResolvers<ContextType = any, ParentType extends ResolversParentTypes['ReportExport'] = ResolversParentTypes['ReportExport']> = {
  actingRole?: Resolver<ResolversTypes['ReportExportActingRole'], ParentType, ContextType>;
  completedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  contentDigest?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  dataAsOf?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  downloadable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  expiresAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  failureReasonCode?: Resolver<Maybe<ResolversTypes['ReportExportFailureReason']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['ReportExportKind'], ParentType, ContextType>;
  periodEndExclusiveLocalDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  periodStartLocalDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  requestedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  rowCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  schemaVersion?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  startedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  state?: Resolver<ResolversTypes['ReportExportState'], ParentType, ContextType>;
  timeZone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ReportExportArtifactResolvers<ContextType = any, ParentType extends ResolversParentTypes['ReportExportArtifact'] = ResolversParentTypes['ReportExportArtifact']> = {
  contentType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  csv?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fileName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reportExport?: Resolver<ResolversTypes['ReportExport'], ParentType, ContextType>;
};

export type ReportExportErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['ReportExportError'] = ResolversParentTypes['ReportExportError']> = {
  code?: Resolver<ResolversTypes['ReportExportErrorCode'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RequestAttendanceReviewResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['RequestAttendanceReviewResult'] = ResolversParentTypes['RequestAttendanceReviewResult']> = {
  __resolveType: TypeResolveFn<'AttendanceReviewError' | 'RequestAttendanceReviewSuccess', ParentType, ContextType>;
};

export type RequestAttendanceReviewSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['RequestAttendanceReviewSuccess'] = ResolversParentTypes['RequestAttendanceReviewSuccess']> = {
  attendanceReviewRequest?: Resolver<ResolversTypes['AttendanceReviewRequest'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RequestReportExportResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['RequestReportExportResult'] = ResolversParentTypes['RequestReportExportResult']> = {
  __resolveType: TypeResolveFn<'ReportExportError' | 'RequestReportExportSuccess', ParentType, ContextType>;
};

export type RequestReportExportSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['RequestReportExportSuccess'] = ResolversParentTypes['RequestReportExportSuccess']> = {
  reportExport?: Resolver<ResolversTypes['ReportExport'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RescheduleBookingResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['RescheduleBookingResult'] = ResolversParentTypes['RescheduleBookingResult']> = {
  __resolveType: TypeResolveFn<'BookingError' | 'RescheduleBookingSuccess', ParentType, ContextType>;
};

export type RescheduleBookingSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['RescheduleBookingSuccess'] = ResolversParentTypes['RescheduleBookingSuccess']> = {
  account?: Resolver<ResolversTypes['ClassCreditAccount'], ParentType, ContextType>;
  originalBooking?: Resolver<ResolversTypes['Booking'], ParentType, ContextType>;
  replacementBooking?: Resolver<ResolversTypes['Booking'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ResolveAdministratorTaskResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['ResolveAdministratorTaskResult'] = ResolversParentTypes['ResolveAdministratorTaskResult']> = {
  __resolveType: TypeResolveFn<'AdministratorTaskError' | 'ResolveAdministratorTaskSuccess', ParentType, ContextType>;
};

export type ResolveAdministratorTaskSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['ResolveAdministratorTaskSuccess'] = ResolversParentTypes['ResolveAdministratorTaskSuccess']> = {
  task?: Resolver<ResolversTypes['AdministratorTaskItem'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RetireLessonUnitResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['RetireLessonUnitResult'] = ResolversParentTypes['RetireLessonUnitResult']> = {
  __resolveType: TypeResolveFn<'CurriculumConflict' | 'RetireLessonUnitSuccess', ParentType, ContextType>;
};

export type RetireLessonUnitSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['RetireLessonUnitSuccess'] = ResolversParentTypes['RetireLessonUnitSuccess']> = {
  lessonUnit?: Resolver<ResolversTypes['LessonUnit'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ReviseLessonMaterialResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['ReviseLessonMaterialResult'] = ResolversParentTypes['ReviseLessonMaterialResult']> = {
  __resolveType: TypeResolveFn<'CurriculumConflict' | 'InvalidLessonMaterial' | 'ReviseLessonMaterialSuccess', ParentType, ContextType>;
};

export type ReviseLessonMaterialSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['ReviseLessonMaterialSuccess'] = ResolversParentTypes['ReviseLessonMaterialSuccess']> = {
  material?: Resolver<ResolversTypes['LessonMaterial'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RoleAssignmentAdministrationResolvers<ContextType = any, ParentType extends ResolversParentTypes['RoleAssignmentAdministration'] = ResolversParentTypes['RoleAssignmentAdministration']> = {
  organizations?: Resolver<Array<ResolversTypes['Organization']>, ParentType, ContextType>;
  users?: Resolver<Array<ResolversTypes['RoleAssignmentAdministrationUser']>, ParentType, ContextType>;
};

export type RoleAssignmentAdministrationUserResolvers<ContextType = any, ParentType extends ResolversParentTypes['RoleAssignmentAdministrationUser'] = ResolversParentTypes['RoleAssignmentAdministrationUser']> = {
  accessStatus?: Resolver<ResolversTypes['UserAccessStatus'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  roleAssignmentHistory?: Resolver<Array<ResolversTypes['RoleAssignmentChange']>, ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['UserRole']>, ParentType, ContextType>;
  suspensionReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type RoleAssignmentChangeResolvers<ContextType = any, ParentType extends ResolversParentTypes['RoleAssignmentChange'] = ResolversParentTypes['RoleAssignmentChange']> = {
  action?: Resolver<ResolversTypes['RoleAssignmentChangeAction'], ParentType, ContextType>;
  changedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  reason?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['UserRole'], ParentType, ContextType>;
};

export type RoleAssignmentChangeSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['RoleAssignmentChangeSuccess'] = ResolversParentTypes['RoleAssignmentChangeSuccess']> = {
  endedBookingCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  refundedClassCreditCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  removedWaitlistEntryCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sponsorshipEnded?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  subscriptionEnded?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['RoleAssignmentAdministrationUser'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RoleAssignmentErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['RoleAssignmentError'] = ResolversParentTypes['RoleAssignmentError']> = {
  classSessionIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RolePlaceResolvers<ContextType = any, ParentType extends ResolversParentTypes['RolePlace'] = ResolversParentTypes['RolePlace']> = {
  place?: Resolver<ResolversTypes['WorkspacePlace'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['UserRole'], ParentType, ContextType>;
};

export type RoleWorkspaceResolvers<ContextType = any, ParentType extends ResolversParentTypes['RoleWorkspace'] = ResolversParentTypes['RoleWorkspace']> = {
  actingRole?: Resolver<ResolversTypes['UserRole'], ParentType, ContextType>;
  relationshipScope?: Resolver<ResolversTypes['WorkspaceRelationshipScope'], ParentType, ContextType>;
  rolePlaces?: Resolver<Array<ResolversTypes['RolePlace']>, ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
};

export type SaveLearningFeedbackResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['SaveLearningFeedbackResult'] = ResolversParentTypes['SaveLearningFeedbackResult']> = {
  __resolveType: TypeResolveFn<'LearningFeedbackError' | 'SaveLearningFeedbackSuccess', ParentType, ContextType>;
};

export type SaveLearningFeedbackSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['SaveLearningFeedbackSuccess'] = ResolversParentTypes['SaveLearningFeedbackSuccess']> = {
  feedback?: Resolver<ResolversTypes['LearningFeedback'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SaveSessionRatingResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['SaveSessionRatingResult'] = ResolversParentTypes['SaveSessionRatingResult']> = {
  __resolveType: TypeResolveFn<'SaveSessionRatingSuccess' | 'SessionRatingError', ParentType, ContextType>;
};

export type SaveSessionRatingSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['SaveSessionRatingSuccess'] = ResolversParentTypes['SaveSessionRatingSuccess']> = {
  rating?: Resolver<ResolversTypes['SessionRating'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SaveTeacherAvailabilityRangeResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['SaveTeacherAvailabilityRangeResult'] = ResolversParentTypes['SaveTeacherAvailabilityRangeResult']> = {
  __resolveType: TypeResolveFn<'SaveTeacherAvailabilityRangeSuccess' | 'TeacherAvailabilityValidationError', ParentType, ContextType>;
};

export type SaveTeacherAvailabilityRangeSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['SaveTeacherAvailabilityRangeSuccess'] = ResolversParentTypes['SaveTeacherAvailabilityRangeSuccess']> = {
  range?: Resolver<ResolversTypes['TeacherAvailabilityRange'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SaveTeacherProfileSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['SaveTeacherProfileSuccess'] = ResolversParentTypes['SaveTeacherProfileSuccess']> = {
  teacherProfile?: Resolver<ResolversTypes['PublicTeacherProfile'], ParentType, ContextType>;
};

export type SaveUserPreferencesPayloadResolvers<ContextType = any, ParentType extends ResolversParentTypes['SaveUserPreferencesPayload'] = ResolversParentTypes['SaveUserPreferencesPayload']> = {
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
};

export type ScheduleSubscriptionCancellationResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['ScheduleSubscriptionCancellationResult'] = ResolversParentTypes['ScheduleSubscriptionCancellationResult']> = {
  __resolveType: TypeResolveFn<'ScheduleSubscriptionCancellationSuccess' | 'SubscriptionConflict', ParentType, ContextType>;
};

export type ScheduleSubscriptionCancellationSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['ScheduleSubscriptionCancellationSuccess'] = ResolversParentTypes['ScheduleSubscriptionCancellationSuccess']> = {
  subscription?: Resolver<ResolversTypes['Subscription'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SessionRatingResolvers<ContextType = any, ParentType extends ResolversParentTypes['SessionRating'] = ResolversParentTypes['SessionRating']> = {
  bookingId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  comment?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  improvementTags?: Resolver<Array<ResolversTypes['SessionRatingImprovementTag']>, ParentType, ContextType>;
  overallRating?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  positiveTags?: Resolver<Array<ResolversTypes['SessionRatingPositiveTag']>, ParentType, ContextType>;
  redactedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  redactionReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SessionRatingErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['SessionRatingError'] = ResolversParentTypes['SessionRatingError']> = {
  code?: Resolver<ResolversTypes['SessionRatingErrorCode'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SponsorshipResolvers<ContextType = any, ParentType extends ResolversParentTypes['Sponsorship'] = ResolversParentTypes['Sponsorship']> = {
  acceptedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  endedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  endedByParty?: Resolver<Maybe<ResolversTypes['SponsorshipEndingParty']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  nextAnniversaryAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  organization?: Resolver<ResolversTypes['Organization'], ParentType, ContextType>;
  progressSnapshots?: Resolver<Array<ResolversTypes['CourseProgressSnapshot']>, ParentType, ContextType>;
  reportingFrom?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reportingUntil?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  state?: Resolver<ResolversTypes['SponsorshipState'], ParentType, ContextType>;
  studentDisplayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  studentUserId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type SponsorshipBoundaryErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['SponsorshipBoundaryError'] = ResolversParentTypes['SponsorshipBoundaryError']> = {
  code?: Resolver<ResolversTypes['SponsorshipBoundaryErrorCode'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SponsorshipDisclosureResolvers<ContextType = any, ParentType extends ResolversParentTypes['SponsorshipDisclosure'] = ResolversParentTypes['SponsorshipDisclosure']> = {
  benefitDescription?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  excludedPrivateDataDescription?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  organizationVisibleDataDescription?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  version?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SponsorshipInvitationResolvers<ContextType = any, ParentType extends ResolversParentTypes['SponsorshipInvitation'] = ResolversParentTypes['SponsorshipInvitation']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  decidedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  disclosure?: Resolver<ResolversTypes['SponsorshipDisclosure'], ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<ResolversTypes['Organization'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['SponsorshipInvitationState'], ParentType, ContextType>;
  studentDisplayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  studentUserId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type SponsorshipInvitationErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['SponsorshipInvitationError'] = ResolversParentTypes['SponsorshipInvitationError']> = {
  code?: Resolver<ResolversTypes['SponsorshipInvitationErrorCode'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SponsorshipInvitationResponseErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['SponsorshipInvitationResponseError'] = ResolversParentTypes['SponsorshipInvitationResponseError']> = {
  code?: Resolver<ResolversTypes['SponsorshipInvitationResponseErrorCode'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type StudentAttendanceRecordResolvers<ContextType = any, ParentType extends ResolversParentTypes['StudentAttendanceRecord'] = ResolversParentTypes['StudentAttendanceRecord']> = {
  bookingId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  classSessionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  classSessionStartsAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  correctedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  correctionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  outcome?: Resolver<ResolversTypes['AttendanceOutcome'], ParentType, ContextType>;
  publishedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reviewDeadline?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reviewRequest?: Resolver<Maybe<ResolversTypes['AttendanceReviewRequest']>, ParentType, ContextType>;
  reviewRequestOpen?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  teacherDisplayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type StudentPlacementResolvers<ContextType = any, ParentType extends ResolversParentTypes['StudentPlacement'] = ResolversParentTypes['StudentPlacement']> = {
  curriculumLevel?: Resolver<ResolversTypes['CurriculumLevel'], ParentType, ContextType>;
  targetLanguage?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type StudentWorkspaceResolvers<ContextType = any, ParentType extends ResolversParentTypes['StudentWorkspace'] = ResolversParentTypes['StudentWorkspace']> = {
  roles?: Resolver<Array<ResolversTypes['UserRole']>, ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
};

export type SubscriptionResolvers<ContextType = any, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = {
  accountingTimeUtc?: SubscriptionResolver<ResolversTypes['String'], "accountingTimeUtc", ParentType, ContextType>;
  activatedAt?: SubscriptionResolver<ResolversTypes['String'], "activatedAt", ParentType, ContextType>;
  anchorDay?: SubscriptionResolver<ResolversTypes['Int'], "anchorDay", ParentType, ContextType>;
  cancellationEffectiveAt?: SubscriptionResolver<Maybe<ResolversTypes['String']>, "cancellationEffectiveAt", ParentType, ContextType>;
  id?: SubscriptionResolver<ResolversTypes['ID'], "id", ParentType, ContextType>;
  nextAnniversaryAt?: SubscriptionResolver<Maybe<ResolversTypes['String']>, "nextAnniversaryAt", ParentType, ContextType>;
  state?: SubscriptionResolver<ResolversTypes['SubscriptionState'], "state", ParentType, ContextType>;
  studentUserId?: SubscriptionResolver<ResolversTypes['ID'], "studentUserId", ParentType, ContextType>;
};

export type SubscriptionConflictResolvers<ContextType = any, ParentType extends ResolversParentTypes['SubscriptionConflict'] = ResolversParentTypes['SubscriptionConflict']> = {
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubstituteTeacherResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['SubstituteTeacherResult'] = ResolversParentTypes['SubstituteTeacherResult']> = {
  __resolveType: TypeResolveFn<'ClassSessionDisruptionError' | 'SubstituteTeacherSuccess', ParentType, ContextType>;
};

export type SubstituteTeacherSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['SubstituteTeacherSuccess'] = ResolversParentTypes['SubstituteTeacherSuccess']> = {
  absenceRequest?: Resolver<ResolversTypes['AbsenceRequest'], ParentType, ContextType>;
  classSession?: Resolver<ResolversTypes['ClassSession'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SuspendUserResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['SuspendUserResult'] = ResolversParentTypes['SuspendUserResult']> = {
  __resolveType: TypeResolveFn<'UserAccessChangeSuccess' | 'UserAccessError', ParentType, ContextType>;
};

export type TeacherAvailabilityResolvers<ContextType = any, ParentType extends ResolversParentTypes['TeacherAvailability'] = ResolversParentTypes['TeacherAvailability']> = {
  exceptions?: Resolver<Array<ResolversTypes['AvailabilityException']>, ParentType, ContextType>;
  timeZone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  weeklyRanges?: Resolver<Array<ResolversTypes['TeacherAvailabilityRange']>, ParentType, ContextType>;
};

export type TeacherAvailabilityOccurrenceResolvers<ContextType = any, ParentType extends ResolversParentTypes['TeacherAvailabilityOccurrence'] = ResolversParentTypes['TeacherAvailabilityOccurrence']> = {
  endLocalTime?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  endsAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  localDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  rangeId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  startLocalTime?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  startsAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type TeacherAvailabilityRangeResolvers<ContextType = any, ParentType extends ResolversParentTypes['TeacherAvailabilityRange'] = ResolversParentTypes['TeacherAvailabilityRange']> = {
  effectiveFrom?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  effectiveUntil?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  endLocalTime?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  startLocalTime?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timeZone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  weekday?: Resolver<ResolversTypes['Weekday'], ParentType, ContextType>;
};

export type TeacherAvailabilityValidationErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['TeacherAvailabilityValidationError'] = ResolversParentTypes['TeacherAvailabilityValidationError']> = {
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TeacherQualificationResolvers<ContextType = any, ParentType extends ResolversParentTypes['TeacherQualification'] = ResolversParentTypes['TeacherQualification']> = {
  curriculumLevel?: Resolver<ResolversTypes['CurriculumLevel'], ParentType, ContextType>;
  targetLanguage?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type TeacherQualificationRemovalBlockedResolvers<ContextType = any, ParentType extends ResolversParentTypes['TeacherQualificationRemovalBlocked'] = ResolversParentTypes['TeacherQualificationRemovalBlocked']> = {
  classSessionIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TopicResolvers<ContextType = any, ParentType extends ResolversParentTypes['Topic'] = ResolversParentTypes['Topic']> = {
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  labelEn?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  labelEs?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type UndoSubscriptionCancellationResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['UndoSubscriptionCancellationResult'] = ResolversParentTypes['UndoSubscriptionCancellationResult']> = {
  __resolveType: TypeResolveFn<'SubscriptionConflict' | 'UndoSubscriptionCancellationSuccess', ParentType, ContextType>;
};

export type UndoSubscriptionCancellationSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['UndoSubscriptionCancellationSuccess'] = ResolversParentTypes['UndoSubscriptionCancellationSuccess']> = {
  subscription?: Resolver<ResolversTypes['Subscription'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UpdateCourseResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['UpdateCourseResult'] = ResolversParentTypes['UpdateCourseResult']> = {
  __resolveType: TypeResolveFn<'CurriculumConflict' | 'UpdateCourseSuccess', ParentType, ContextType>;
};

export type UpdateCourseSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['UpdateCourseSuccess'] = ResolversParentTypes['UpdateCourseSuccess']> = {
  course?: Resolver<ResolversTypes['Course'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UpdateLessonUnitResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['UpdateLessonUnitResult'] = ResolversParentTypes['UpdateLessonUnitResult']> = {
  __resolveType: TypeResolveFn<'CurriculumConflict' | 'InstructionalIdentityLocked' | 'UpdateLessonUnitSuccess', ParentType, ContextType>;
};

export type UpdateLessonUnitSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['UpdateLessonUnitSuccess'] = ResolversParentTypes['UpdateLessonUnitSuccess']> = {
  lessonUnit?: Resolver<ResolversTypes['LessonUnit'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UpsertTopicSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['UpsertTopicSuccess'] = ResolversParentTypes['UpsertTopicSuccess']> = {
  topic?: Resolver<ResolversTypes['Topic'], ParentType, ContextType>;
};

export type UserResolvers<ContextType = any, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  displayTimeZone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  interfaceLocale?: Resolver<Maybe<ResolversTypes['InterfaceLocale']>, ParentType, ContextType>;
};

export type UserAccessChangeSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['UserAccessChangeSuccess'] = ResolversParentTypes['UserAccessChangeSuccess']> = {
  endedBookingCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  refundedClassCreditCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  removedWaitlistEntryCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  teacherClassSessionIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  user?: Resolver<ResolversTypes['RoleAssignmentAdministrationUser'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserAccessErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['UserAccessError'] = ResolversParentTypes['UserAccessError']> = {
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type WaitlistEntryResolvers<ContextType = any, ParentType extends ResolversParentTypes['WaitlistEntry'] = ResolversParentTypes['WaitlistEntry']> = {
  classSession?: Resolver<ResolversTypes['ClassSession'], ParentType, ContextType>;
  completedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  joinedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  resultingBooking?: Resolver<Maybe<ResolversTypes['Booking']>, ParentType, ContextType>;
  state?: Resolver<ResolversTypes['WaitlistEntryState'], ParentType, ContextType>;
  terminalReason?: Resolver<Maybe<ResolversTypes['WaitlistTerminalReason']>, ParentType, ContextType>;
};

export type WaitlistErrorResolvers<ContextType = any, ParentType extends ResolversParentTypes['WaitlistError'] = ResolversParentTypes['WaitlistError']> = {
  code?: Resolver<ResolversTypes['WaitlistErrorCode'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type WaitlistPromotionWonResolvers<ContextType = any, ParentType extends ResolversParentTypes['WaitlistPromotionWon'] = ResolversParentTypes['WaitlistPromotionWon']> = {
  booking?: Resolver<ResolversTypes['Booking'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type WithdrawWaitlistResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['WithdrawWaitlistResult'] = ResolversParentTypes['WithdrawWaitlistResult']> = {
  __resolveType: TypeResolveFn<'WaitlistError' | 'WaitlistPromotionWon' | 'WithdrawWaitlistSuccess', ParentType, ContextType>;
};

export type WithdrawWaitlistSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['WithdrawWaitlistSuccess'] = ResolversParentTypes['WithdrawWaitlistSuccess']> = {
  entry?: Resolver<ResolversTypes['WaitlistEntry'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  AbsenceRequest?: AbsenceRequestResolvers<ContextType>;
  AcceptSponsorshipInvitationResult?: AcceptSponsorshipInvitationResultResolvers<ContextType>;
  AcceptSponsorshipInvitationSuccess?: AcceptSponsorshipInvitationSuccessResolvers<ContextType>;
  AddAvailabilityExceptionResult?: AddAvailabilityExceptionResultResolvers<ContextType>;
  AddAvailabilityExceptionSuccess?: AddAvailabilityExceptionSuccessResolvers<ContextType>;
  AddCohortMembershipResult?: AddCohortMembershipResultResolvers<ContextType>;
  AddLessonMaterialResult?: AddLessonMaterialResultResolvers<ContextType>;
  AddLessonMaterialSuccess?: AddLessonMaterialSuccessResolvers<ContextType>;
  AdjustClassCreditsResult?: AdjustClassCreditsResultResolvers<ContextType>;
  AdjustClassCreditsSuccess?: AdjustClassCreditsSuccessResolvers<ContextType>;
  AdministrationCurriculum?: AdministrationCurriculumResolvers<ContextType>;
  AdministratorTaskError?: AdministratorTaskErrorResolvers<ContextType>;
  AdministratorTaskItem?: AdministratorTaskItemResolvers<ContextType>;
  AdministratorTaskSafeContext?: AdministratorTaskSafeContextResolvers<ContextType>;
  AttendanceError?: AttendanceErrorResolvers<ContextType>;
  AttendanceRecord?: AttendanceRecordResolvers<ContextType>;
  AttendanceReviewError?: AttendanceReviewErrorResolvers<ContextType>;
  AttendanceReviewRequest?: AttendanceReviewRequestResolvers<ContextType>;
  AvailabilityException?: AvailabilityExceptionResolvers<ContextType>;
  AvailabilityExceptionSessionConflict?: AvailabilityExceptionSessionConflictResolvers<ContextType>;
  BookClassSessionResult?: BookClassSessionResultResolvers<ContextType>;
  BookClassSessionSuccess?: BookClassSessionSuccessResolvers<ContextType>;
  Booking?: BookingResolvers<ContextType>;
  BookingError?: BookingErrorResolvers<ContextType>;
  CancelBookingResult?: CancelBookingResultResolvers<ContextType>;
  CancelBookingSuccess?: CancelBookingSuccessResolvers<ContextType>;
  CancelClassSessionResult?: CancelClassSessionResultResolvers<ContextType>;
  CancelClassSessionSuccess?: CancelClassSessionSuccessResolvers<ContextType>;
  ChangeClassSessionSeatCapacityResult?: ChangeClassSessionSeatCapacityResultResolvers<ContextType>;
  ChangeClassSessionSeatCapacitySuccess?: ChangeClassSessionSeatCapacitySuccessResolvers<ContextType>;
  ChangeTeacherQualificationSuccess?: ChangeTeacherQualificationSuccessResolvers<ContextType>;
  ClassCreditAccount?: ClassCreditAccountResolvers<ContextType>;
  ClassCreditAdjustmentError?: ClassCreditAdjustmentErrorResolvers<ContextType>;
  ClassCreditLedgerEntry?: ClassCreditLedgerEntryResolvers<ContextType>;
  ClassRoster?: ClassRosterResolvers<ContextType>;
  ClassRosterStudent?: ClassRosterStudentResolvers<ContextType>;
  ClassSession?: ClassSessionResolvers<ContextType>;
  ClassSessionDiscoveryConnection?: ClassSessionDiscoveryConnectionResolvers<ContextType>;
  ClassSessionDiscoveryFilter?: ClassSessionDiscoveryFilterResolvers<ContextType>;
  ClassSessionDiscoveryOptions?: ClassSessionDiscoveryOptionsResolvers<ContextType>;
  ClassSessionDiscoveryPageInfo?: ClassSessionDiscoveryPageInfoResolvers<ContextType>;
  ClassSessionDiscoveryTeacherOption?: ClassSessionDiscoveryTeacherOptionResolvers<ContextType>;
  ClassSessionDisruptionError?: ClassSessionDisruptionErrorResolvers<ContextType>;
  ClassSessionPublicationError?: ClassSessionPublicationErrorResolvers<ContextType>;
  ClassSessionSeatCapacityError?: ClassSessionSeatCapacityErrorResolvers<ContextType>;
  Classroom?: ClassroomResolvers<ContextType>;
  ClassroomAccessError?: ClassroomAccessErrorResolvers<ContextType>;
  Cohort?: CohortResolvers<ContextType>;
  CohortAttributedActivity?: CohortAttributedActivityResolvers<ContextType>;
  CohortError?: CohortErrorResolvers<ContextType>;
  CohortMembership?: CohortMembershipResolvers<ContextType>;
  CohortMembershipSuccess?: CohortMembershipSuccessResolvers<ContextType>;
  CohortSuccess?: CohortSuccessResolvers<ContextType>;
  Course?: CourseResolvers<ContextType>;
  CourseProgress?: CourseProgressResolvers<ContextType>;
  CourseProgressLearningHistory?: CourseProgressLearningHistoryResolvers<ContextType>;
  CourseProgressSnapshot?: CourseProgressSnapshotResolvers<ContextType>;
  CreateCohortResult?: CreateCohortResultResolvers<ContextType>;
  CreateCourseResult?: CreateCourseResultResolvers<ContextType>;
  CreateCourseSuccess?: CreateCourseSuccessResolvers<ContextType>;
  CreateLessonUnitResult?: CreateLessonUnitResultResolvers<ContextType>;
  CreateLessonUnitSuccess?: CreateLessonUnitSuccessResolvers<ContextType>;
  CurriculumConflict?: CurriculumConflictResolvers<ContextType>;
  DecideAttendanceReviewResult?: DecideAttendanceReviewResultResolvers<ContextType>;
  DecideAttendanceReviewSuccess?: DecideAttendanceReviewSuccessResolvers<ContextType>;
  DeclineSponsorshipInvitationResult?: DeclineSponsorshipInvitationResultResolvers<ContextType>;
  DeclineSponsorshipInvitationSuccess?: DeclineSponsorshipInvitationSuccessResolvers<ContextType>;
  DiscoverableClassSession?: DiscoverableClassSessionResolvers<ContextType>;
  DiscoveryLessonUnit?: DiscoveryLessonUnitResolvers<ContextType>;
  EndCohortMembershipResult?: EndCohortMembershipResultResolvers<ContextType>;
  EndSponsorshipAsOrganizationResult?: EndSponsorshipAsOrganizationResultResolvers<ContextType>;
  EndSponsorshipAsOrganizationSuccess?: EndSponsorshipAsOrganizationSuccessResolvers<ContextType>;
  EndSponsorshipAsStudentResult?: EndSponsorshipAsStudentResultResolvers<ContextType>;
  EndSponsorshipAsStudentSuccess?: EndSponsorshipAsStudentSuccessResolvers<ContextType>;
  EndTeacherAvailabilityRangeResult?: EndTeacherAvailabilityRangeResultResolvers<ContextType>;
  EndTeacherAvailabilityRangeSuccess?: EndTeacherAvailabilityRangeSuccessResolvers<ContextType>;
  EnterClassroomResult?: EnterClassroomResultResolvers<ContextType>;
  EnterClassroomSuccess?: EnterClassroomSuccessResolvers<ContextType>;
  FeedbackAndRatingItem?: FeedbackAndRatingItemResolvers<ContextType>;
  GrantRoleAssignmentResult?: GrantRoleAssignmentResultResolvers<ContextType>;
  GrantTeacherQualificationResult?: GrantTeacherQualificationResultResolvers<ContextType>;
  InAppNotification?: InAppNotificationResolvers<ContextType>;
  InstructionalIdentityLocked?: InstructionalIdentityLockedResolvers<ContextType>;
  InvalidLessonMaterial?: InvalidLessonMaterialResolvers<ContextType>;
  InviteToSponsorshipResult?: InviteToSponsorshipResultResolvers<ContextType>;
  InviteToSponsorshipSuccess?: InviteToSponsorshipSuccessResolvers<ContextType>;
  JoinWaitlistResult?: JoinWaitlistResultResolvers<ContextType>;
  JoinWaitlistSuccess?: JoinWaitlistSuccessResolvers<ContextType>;
  LearningAccessLessonUnit?: LearningAccessLessonUnitResolvers<ContextType>;
  LearningFeedback?: LearningFeedbackResolvers<ContextType>;
  LearningFeedbackError?: LearningFeedbackErrorResolvers<ContextType>;
  LessonMaterial?: LessonMaterialResolvers<ContextType>;
  LessonUnit?: LessonUnitResolvers<ContextType>;
  MarketplaceActionableExceptions?: MarketplaceActionableExceptionsResolvers<ContextType>;
  MarketplaceAttendanceSummary?: MarketplaceAttendanceSummaryResolvers<ContextType>;
  MarketplaceCancellationSummary?: MarketplaceCancellationSummaryResolvers<ContextType>;
  MarketplaceCorrectionSummary?: MarketplaceCorrectionSummaryResolvers<ContextType>;
  MarketplaceCourseProgressReport?: MarketplaceCourseProgressReportResolvers<ContextType>;
  MarketplaceCreditSourceTotal?: MarketplaceCreditSourceTotalResolvers<ContextType>;
  MarketplaceCreditSummary?: MarketplaceCreditSummaryResolvers<ContextType>;
  MarketplaceDailyCancellationRate?: MarketplaceDailyCancellationRateResolvers<ContextType>;
  MarketplaceExceptionItem?: MarketplaceExceptionItemResolvers<ContextType>;
  MarketplaceOperationalReport?: MarketplaceOperationalReportResolvers<ContextType>;
  MarketplaceReportRange?: MarketplaceReportRangeResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Organization?: OrganizationResolvers<ContextType>;
  OrganizationAttendanceAndProgressReport?: OrganizationAttendanceAndProgressReportResolvers<ContextType>;
  OrganizationAttendanceSummary?: OrganizationAttendanceSummaryResolvers<ContextType>;
  OrganizationCohortReport?: OrganizationCohortReportResolvers<ContextType>;
  OrganizationCourseProgressReport?: OrganizationCourseProgressReportResolvers<ContextType>;
  OrganizationCourseProgressValue?: OrganizationCourseProgressValueResolvers<ContextType>;
  OrganizationSponsoredStudentReport?: OrganizationSponsoredStudentReportResolvers<ContextType>;
  ProcessSubscriptionProviderEventResult?: ProcessSubscriptionProviderEventResultResolvers<ContextType>;
  ProcessSubscriptionProviderEventSuccess?: ProcessSubscriptionProviderEventSuccessResolvers<ContextType>;
  PublicTeacherProfile?: PublicTeacherProfileResolvers<ContextType>;
  PublishClassSessionResult?: PublishClassSessionResultResolvers<ContextType>;
  PublishClassSessionSuccess?: PublishClassSessionSuccessResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  ReactivateUserResult?: ReactivateUserResultResolvers<ContextType>;
  RecordAttendanceResult?: RecordAttendanceResultResolvers<ContextType>;
  RecordAttendanceSuccess?: RecordAttendanceSuccessResolvers<ContextType>;
  RedactLearningFeedbackResult?: RedactLearningFeedbackResultResolvers<ContextType>;
  RedactLearningFeedbackSuccess?: RedactLearningFeedbackSuccessResolvers<ContextType>;
  RedactSessionRatingCommentResult?: RedactSessionRatingCommentResultResolvers<ContextType>;
  RedactSessionRatingCommentSuccess?: RedactSessionRatingCommentSuccessResolvers<ContextType>;
  RemoveAvailabilityExceptionResult?: RemoveAvailabilityExceptionResultResolvers<ContextType>;
  RemoveAvailabilityExceptionSuccess?: RemoveAvailabilityExceptionSuccessResolvers<ContextType>;
  RemoveRoleAssignmentResult?: RemoveRoleAssignmentResultResolvers<ContextType>;
  RemoveTeacherQualificationResult?: RemoveTeacherQualificationResultResolvers<ContextType>;
  RenameCohortResult?: RenameCohortResultResolvers<ContextType>;
  ReorderLessonUnitResult?: ReorderLessonUnitResultResolvers<ContextType>;
  ReorderLessonUnitSuccess?: ReorderLessonUnitSuccessResolvers<ContextType>;
  ReportAbsenceResult?: ReportAbsenceResultResolvers<ContextType>;
  ReportAbsenceSuccess?: ReportAbsenceSuccessResolvers<ContextType>;
  ReportExport?: ReportExportResolvers<ContextType>;
  ReportExportArtifact?: ReportExportArtifactResolvers<ContextType>;
  ReportExportError?: ReportExportErrorResolvers<ContextType>;
  RequestAttendanceReviewResult?: RequestAttendanceReviewResultResolvers<ContextType>;
  RequestAttendanceReviewSuccess?: RequestAttendanceReviewSuccessResolvers<ContextType>;
  RequestReportExportResult?: RequestReportExportResultResolvers<ContextType>;
  RequestReportExportSuccess?: RequestReportExportSuccessResolvers<ContextType>;
  RescheduleBookingResult?: RescheduleBookingResultResolvers<ContextType>;
  RescheduleBookingSuccess?: RescheduleBookingSuccessResolvers<ContextType>;
  ResolveAdministratorTaskResult?: ResolveAdministratorTaskResultResolvers<ContextType>;
  ResolveAdministratorTaskSuccess?: ResolveAdministratorTaskSuccessResolvers<ContextType>;
  RetireLessonUnitResult?: RetireLessonUnitResultResolvers<ContextType>;
  RetireLessonUnitSuccess?: RetireLessonUnitSuccessResolvers<ContextType>;
  ReviseLessonMaterialResult?: ReviseLessonMaterialResultResolvers<ContextType>;
  ReviseLessonMaterialSuccess?: ReviseLessonMaterialSuccessResolvers<ContextType>;
  RoleAssignmentAdministration?: RoleAssignmentAdministrationResolvers<ContextType>;
  RoleAssignmentAdministrationUser?: RoleAssignmentAdministrationUserResolvers<ContextType>;
  RoleAssignmentChange?: RoleAssignmentChangeResolvers<ContextType>;
  RoleAssignmentChangeSuccess?: RoleAssignmentChangeSuccessResolvers<ContextType>;
  RoleAssignmentError?: RoleAssignmentErrorResolvers<ContextType>;
  RolePlace?: RolePlaceResolvers<ContextType>;
  RoleWorkspace?: RoleWorkspaceResolvers<ContextType>;
  SaveLearningFeedbackResult?: SaveLearningFeedbackResultResolvers<ContextType>;
  SaveLearningFeedbackSuccess?: SaveLearningFeedbackSuccessResolvers<ContextType>;
  SaveSessionRatingResult?: SaveSessionRatingResultResolvers<ContextType>;
  SaveSessionRatingSuccess?: SaveSessionRatingSuccessResolvers<ContextType>;
  SaveTeacherAvailabilityRangeResult?: SaveTeacherAvailabilityRangeResultResolvers<ContextType>;
  SaveTeacherAvailabilityRangeSuccess?: SaveTeacherAvailabilityRangeSuccessResolvers<ContextType>;
  SaveTeacherProfileSuccess?: SaveTeacherProfileSuccessResolvers<ContextType>;
  SaveUserPreferencesPayload?: SaveUserPreferencesPayloadResolvers<ContextType>;
  ScheduleSubscriptionCancellationResult?: ScheduleSubscriptionCancellationResultResolvers<ContextType>;
  ScheduleSubscriptionCancellationSuccess?: ScheduleSubscriptionCancellationSuccessResolvers<ContextType>;
  SessionRating?: SessionRatingResolvers<ContextType>;
  SessionRatingError?: SessionRatingErrorResolvers<ContextType>;
  Sponsorship?: SponsorshipResolvers<ContextType>;
  SponsorshipBoundaryError?: SponsorshipBoundaryErrorResolvers<ContextType>;
  SponsorshipDisclosure?: SponsorshipDisclosureResolvers<ContextType>;
  SponsorshipInvitation?: SponsorshipInvitationResolvers<ContextType>;
  SponsorshipInvitationError?: SponsorshipInvitationErrorResolvers<ContextType>;
  SponsorshipInvitationResponseError?: SponsorshipInvitationResponseErrorResolvers<ContextType>;
  StudentAttendanceRecord?: StudentAttendanceRecordResolvers<ContextType>;
  StudentPlacement?: StudentPlacementResolvers<ContextType>;
  StudentWorkspace?: StudentWorkspaceResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  SubscriptionConflict?: SubscriptionConflictResolvers<ContextType>;
  SubstituteTeacherResult?: SubstituteTeacherResultResolvers<ContextType>;
  SubstituteTeacherSuccess?: SubstituteTeacherSuccessResolvers<ContextType>;
  SuspendUserResult?: SuspendUserResultResolvers<ContextType>;
  TeacherAvailability?: TeacherAvailabilityResolvers<ContextType>;
  TeacherAvailabilityOccurrence?: TeacherAvailabilityOccurrenceResolvers<ContextType>;
  TeacherAvailabilityRange?: TeacherAvailabilityRangeResolvers<ContextType>;
  TeacherAvailabilityValidationError?: TeacherAvailabilityValidationErrorResolvers<ContextType>;
  TeacherQualification?: TeacherQualificationResolvers<ContextType>;
  TeacherQualificationRemovalBlocked?: TeacherQualificationRemovalBlockedResolvers<ContextType>;
  Topic?: TopicResolvers<ContextType>;
  UndoSubscriptionCancellationResult?: UndoSubscriptionCancellationResultResolvers<ContextType>;
  UndoSubscriptionCancellationSuccess?: UndoSubscriptionCancellationSuccessResolvers<ContextType>;
  UpdateCourseResult?: UpdateCourseResultResolvers<ContextType>;
  UpdateCourseSuccess?: UpdateCourseSuccessResolvers<ContextType>;
  UpdateLessonUnitResult?: UpdateLessonUnitResultResolvers<ContextType>;
  UpdateLessonUnitSuccess?: UpdateLessonUnitSuccessResolvers<ContextType>;
  UpsertTopicSuccess?: UpsertTopicSuccessResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserAccessChangeSuccess?: UserAccessChangeSuccessResolvers<ContextType>;
  UserAccessError?: UserAccessErrorResolvers<ContextType>;
  WaitlistEntry?: WaitlistEntryResolvers<ContextType>;
  WaitlistError?: WaitlistErrorResolvers<ContextType>;
  WaitlistPromotionWon?: WaitlistPromotionWonResolvers<ContextType>;
  WithdrawWaitlistResult?: WithdrawWaitlistResultResolvers<ContextType>;
  WithdrawWaitlistSuccess?: WithdrawWaitlistSuccessResolvers<ContextType>;
};

