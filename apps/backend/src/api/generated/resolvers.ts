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
  Rescheduled = 'RESCHEDULED',
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

export type ClassSession = {
  __typename?: 'ClassSession';
  endsAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lessonUnitId: Scalars['ID']['output'];
  occupiedSeats: Scalars['Int']['output'];
  schedulingTimeZone: Scalars['String']['output'];
  seatCapacity: Scalars['Int']['output'];
  startsAt: Scalars['String']['output'];
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

export type GrantTeacherQualificationResult = ChangeTeacherQualificationSuccess | CurriculumConflict;

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

export type JoinWaitlistInput = {
  classSessionId: Scalars['ID']['input'];
  idempotencyKey: Scalars['ID']['input'];
};

export type JoinWaitlistResult = JoinWaitlistSuccess | WaitlistError;

export type JoinWaitlistSuccess = {
  __typename?: 'JoinWaitlistSuccess';
  entry: WaitlistEntry;
};

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

export type Mutation = {
  __typename?: 'Mutation';
  addAvailabilityException: AddAvailabilityExceptionResult;
  addLessonMaterial: AddLessonMaterialResult;
  adjustClassCredits: AdjustClassCreditsResult;
  bookClassSession: BookClassSessionResult;
  cancelBooking: CancelBookingResult;
  changeClassSessionSeatCapacity: ChangeClassSessionSeatCapacityResult;
  createCourse: CreateCourseResult;
  createLessonUnit: CreateLessonUnitResult;
  endTeacherAvailabilityRange: EndTeacherAvailabilityRangeResult;
  grantTeacherQualification: GrantTeacherQualificationResult;
  joinWaitlist: JoinWaitlistResult;
  placeLessonUnitInCourse: ReorderLessonUnitResult;
  processSubscriptionProviderEvent: ProcessSubscriptionProviderEventResult;
  publishClassSession: PublishClassSessionResult;
  rememberRoleWorkspacePlace: RolePlace;
  removeAvailabilityException: RemoveAvailabilityExceptionResult;
  removeTeacherQualification: RemoveTeacherQualificationResult;
  rescheduleBooking: RescheduleBookingResult;
  retireLessonUnit: RetireLessonUnitResult;
  reviseCourseDetails: UpdateCourseResult;
  reviseLessonMaterial: ReviseLessonMaterialResult;
  reviseLessonUnitIdentity: UpdateLessonUnitResult;
  saveLocalizedTopic: UpsertTopicSuccess;
  saveTeacherAvailabilityRange: SaveTeacherAvailabilityRangeResult;
  saveTeacherProfile: SaveTeacherProfileSuccess;
  saveUserPreferences: SaveUserPreferencesPayload;
  scheduleSubscriptionCancellation: ScheduleSubscriptionCancellationResult;
  setStudentPlacement: StudentPlacement;
  undoSubscriptionCancellation: UndoSubscriptionCancellationResult;
  withdrawWaitlist: WithdrawWaitlistResult;
};


export type MutationAddAvailabilityExceptionArgs = {
  input: AddAvailabilityExceptionInput;
};


export type MutationAddLessonMaterialArgs = {
  input: AddLessonMaterialInput;
};


export type MutationAdjustClassCreditsArgs = {
  input: AdjustClassCreditsInput;
};


export type MutationBookClassSessionArgs = {
  input: BookClassSessionInput;
};


export type MutationCancelBookingArgs = {
  input: CancelBookingInput;
};


export type MutationChangeClassSessionSeatCapacityArgs = {
  input: ChangeClassSessionSeatCapacityInput;
};


export type MutationCreateCourseArgs = {
  input: CreateCourseInput;
};


export type MutationCreateLessonUnitArgs = {
  input: CreateLessonUnitInput;
};


export type MutationEndTeacherAvailabilityRangeArgs = {
  input: EndTeacherAvailabilityRangeInput;
};


export type MutationGrantTeacherQualificationArgs = {
  input: ChangeTeacherQualificationInput;
};


export type MutationJoinWaitlistArgs = {
  input: JoinWaitlistInput;
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


export type MutationRememberRoleWorkspacePlaceArgs = {
  input: RememberRoleWorkspacePlaceInput;
};


export type MutationRemoveAvailabilityExceptionArgs = {
  input: RemoveAvailabilityExceptionInput;
};


export type MutationRemoveTeacherQualificationArgs = {
  input: ChangeTeacherQualificationInput;
};


export type MutationRescheduleBookingArgs = {
  input: RescheduleBookingInput;
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


export type MutationSaveLocalizedTopicArgs = {
  input: UpsertTopicInput;
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


export type MutationUndoSubscriptionCancellationArgs = {
  input: SubscriptionLifecycleInput;
};


export type MutationWithdrawWaitlistArgs = {
  input: WithdrawWaitlistInput;
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
  administrationClassCredits?: Maybe<ClassCreditAccount>;
  administrationClassSessions: Array<ClassSession>;
  administrationCurriculum: AdministrationCurriculum;
  classSessionDiscoveryOptions: ClassSessionDiscoveryOptions;
  discoverClassSessions: ClassSessionDiscoveryConnection;
  publicTeacherProfile?: Maybe<PublicTeacherProfile>;
  roleWorkspace: RoleWorkspace;
  studentBookings: Array<Booking>;
  studentClassCredits: ClassCreditAccount;
  studentPlacements: Array<StudentPlacement>;
  studentSubscription?: Maybe<Subscription>;
  studentWaitlistEntries: Array<WaitlistEntry>;
  studentWorkspace: StudentWorkspace;
  teacherAvailability: TeacherAvailability;
  teacherAvailabilityPreview: Array<TeacherAvailabilityOccurrence>;
};


export type QueryAdministrationClassCreditsArgs = {
  studentUserId: Scalars['ID']['input'];
};


export type QueryAdministrationCurriculumArgs = {
  locale: InterfaceLocale;
};


export type QueryDiscoverClassSessionsArgs = {
  input: ClassSessionDiscoveryInput;
};


export type QueryPublicTeacherProfileArgs = {
  locale: InterfaceLocale;
  teacherUserId: Scalars['ID']['input'];
};


export type QueryRoleWorkspaceArgs = {
  actingRole: UserRole;
};


export type QueryTeacherAvailabilityPreviewArgs = {
  localDates: Array<Scalars['String']['input']>;
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

export type RemoveTeacherQualificationResult = ChangeTeacherQualificationSuccess | CurriculumConflict | TeacherQualificationRemovalBlocked;

export type ReorderLessonUnitInput = {
  lessonUnitId: Scalars['ID']['input'];
  order: Scalars['Int']['input'];
};

export type ReorderLessonUnitResult = CurriculumConflict | ReorderLessonUnitSuccess;

export type ReorderLessonUnitSuccess = {
  __typename?: 'ReorderLessonUnitSuccess';
  lessonUnit: LessonUnit;
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

export type SetStudentPlacementInput = {
  curriculumLevel: CurriculumLevel;
  targetLanguage: Scalars['String']['input'];
};

export type StructuredTextBlockInput = {
  items?: InputMaybe<Array<Scalars['String']['input']>>;
  level?: InputMaybe<Scalars['Int']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  type: Scalars['String']['input'];
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
  AddAvailabilityExceptionResult:
    | ( AddAvailabilityExceptionSuccess )
    | ( AvailabilityExceptionSessionConflict )
    | ( TeacherAvailabilityValidationError )
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
  ChangeClassSessionSeatCapacityResult:
    | ( ChangeClassSessionSeatCapacitySuccess )
    | ( ClassSessionSeatCapacityError )
    | ( CurriculumConflict )
  ;
  CreateCourseResult:
    | ( CreateCourseSuccess )
    | ( CurriculumConflict )
  ;
  CreateLessonUnitResult:
    | ( CreateLessonUnitSuccess )
    | ( CurriculumConflict )
  ;
  EndTeacherAvailabilityRangeResult:
    | ( EndTeacherAvailabilityRangeSuccess )
    | ( TeacherAvailabilityValidationError )
  ;
  GrantTeacherQualificationResult:
    | ( ChangeTeacherQualificationSuccess )
    | ( CurriculumConflict )
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
  RemoveAvailabilityExceptionResult:
    | ( RemoveAvailabilityExceptionSuccess )
    | ( TeacherAvailabilityValidationError )
  ;
  RemoveTeacherQualificationResult:
    | ( ChangeTeacherQualificationSuccess )
    | ( CurriculumConflict )
    | ( TeacherQualificationRemovalBlocked )
  ;
  ReorderLessonUnitResult:
    | ( CurriculumConflict )
    | ( ReorderLessonUnitSuccess )
  ;
  RescheduleBookingResult:
    | ( BookingError )
    | ( RescheduleBookingSuccess )
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
  SaveTeacherAvailabilityRangeResult:
    | ( SaveTeacherAvailabilityRangeSuccess )
    | ( TeacherAvailabilityValidationError )
  ;
  ScheduleSubscriptionCancellationResult:
    | ( ScheduleSubscriptionCancellationSuccess )
    | ( SubscriptionConflict )
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
  AddAvailabilityExceptionInput: AddAvailabilityExceptionInput;
  AddAvailabilityExceptionResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['AddAvailabilityExceptionResult']>;
  AddAvailabilityExceptionSuccess: ResolverTypeWrapper<AddAvailabilityExceptionSuccess>;
  AddLessonMaterialInput: AddLessonMaterialInput;
  AddLessonMaterialResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['AddLessonMaterialResult']>;
  AddLessonMaterialSuccess: ResolverTypeWrapper<AddLessonMaterialSuccess>;
  AdjustClassCreditsInput: AdjustClassCreditsInput;
  AdjustClassCreditsResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['AdjustClassCreditsResult']>;
  AdjustClassCreditsSuccess: ResolverTypeWrapper<AdjustClassCreditsSuccess>;
  AdministrationCurriculum: ResolverTypeWrapper<AdministrationCurriculum>;
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
  ChangeClassSessionSeatCapacityInput: ChangeClassSessionSeatCapacityInput;
  ChangeClassSessionSeatCapacityResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['ChangeClassSessionSeatCapacityResult']>;
  ChangeClassSessionSeatCapacitySuccess: ResolverTypeWrapper<ChangeClassSessionSeatCapacitySuccess>;
  ChangeTeacherQualificationInput: ChangeTeacherQualificationInput;
  ChangeTeacherQualificationSuccess: ResolverTypeWrapper<ChangeTeacherQualificationSuccess>;
  ClassCreditAccount: ResolverTypeWrapper<ClassCreditAccount>;
  ClassCreditAdjustmentError: ResolverTypeWrapper<ClassCreditAdjustmentError>;
  ClassCreditAdjustmentErrorCode: ClassCreditAdjustmentErrorCode;
  ClassCreditLedgerEntry: ResolverTypeWrapper<ClassCreditLedgerEntry>;
  ClassCreditLedgerSource: ClassCreditLedgerSource;
  ClassSession: ResolverTypeWrapper<ClassSession>;
  ClassSessionDiscoveryConnection: ResolverTypeWrapper<ClassSessionDiscoveryConnection>;
  ClassSessionDiscoveryFilter: ResolverTypeWrapper<ClassSessionDiscoveryFilter>;
  ClassSessionDiscoveryInput: ClassSessionDiscoveryInput;
  ClassSessionDiscoveryOptions: ResolverTypeWrapper<ClassSessionDiscoveryOptions>;
  ClassSessionDiscoveryPageInfo: ResolverTypeWrapper<ClassSessionDiscoveryPageInfo>;
  ClassSessionDiscoveryTeacherOption: ResolverTypeWrapper<ClassSessionDiscoveryTeacherOption>;
  ClassSessionPublicationError: ResolverTypeWrapper<ClassSessionPublicationError>;
  ClassSessionPublicationErrorCode: ClassSessionPublicationErrorCode;
  ClassSessionSeatCapacityError: ResolverTypeWrapper<ClassSessionSeatCapacityError>;
  ClassSessionSeatCapacityErrorCode: ClassSessionSeatCapacityErrorCode;
  Course: ResolverTypeWrapper<Course>;
  CreateCourseInput: CreateCourseInput;
  CreateCourseResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['CreateCourseResult']>;
  CreateCourseSuccess: ResolverTypeWrapper<CreateCourseSuccess>;
  CreateLessonUnitInput: CreateLessonUnitInput;
  CreateLessonUnitResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['CreateLessonUnitResult']>;
  CreateLessonUnitSuccess: ResolverTypeWrapper<CreateLessonUnitSuccess>;
  CurriculumConflict: ResolverTypeWrapper<CurriculumConflict>;
  CurriculumLevel: CurriculumLevel;
  DiscoverableClassSession: ResolverTypeWrapper<DiscoverableClassSession>;
  DiscoveryLessonUnit: ResolverTypeWrapper<DiscoveryLessonUnit>;
  EndTeacherAvailabilityRangeInput: EndTeacherAvailabilityRangeInput;
  EndTeacherAvailabilityRangeResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['EndTeacherAvailabilityRangeResult']>;
  EndTeacherAvailabilityRangeSuccess: ResolverTypeWrapper<EndTeacherAvailabilityRangeSuccess>;
  GrantTeacherQualificationResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['GrantTeacherQualificationResult']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  InstructionalIdentityLocked: ResolverTypeWrapper<InstructionalIdentityLocked>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  InterfaceLocale: InterfaceLocale;
  InvalidLessonMaterial: ResolverTypeWrapper<InvalidLessonMaterial>;
  JoinWaitlistInput: JoinWaitlistInput;
  JoinWaitlistResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['JoinWaitlistResult']>;
  JoinWaitlistSuccess: ResolverTypeWrapper<JoinWaitlistSuccess>;
  LessonMaterial: ResolverTypeWrapper<LessonMaterial>;
  LessonMaterialKind: LessonMaterialKind;
  LessonUnit: ResolverTypeWrapper<LessonUnit>;
  LessonUnitState: LessonUnitState;
  LocalTimeDisambiguation: LocalTimeDisambiguation;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  ProcessSubscriptionProviderEventInput: ProcessSubscriptionProviderEventInput;
  ProcessSubscriptionProviderEventResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['ProcessSubscriptionProviderEventResult']>;
  ProcessSubscriptionProviderEventSuccess: ResolverTypeWrapper<ProcessSubscriptionProviderEventSuccess>;
  PublicTeacherProfile: ResolverTypeWrapper<PublicTeacherProfile>;
  PublishClassSessionInput: PublishClassSessionInput;
  PublishClassSessionResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['PublishClassSessionResult']>;
  PublishClassSessionSuccess: ResolverTypeWrapper<PublishClassSessionSuccess>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  RememberRoleWorkspacePlaceInput: RememberRoleWorkspacePlaceInput;
  RemoveAvailabilityExceptionInput: RemoveAvailabilityExceptionInput;
  RemoveAvailabilityExceptionResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['RemoveAvailabilityExceptionResult']>;
  RemoveAvailabilityExceptionSuccess: ResolverTypeWrapper<RemoveAvailabilityExceptionSuccess>;
  RemoveTeacherQualificationResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['RemoveTeacherQualificationResult']>;
  ReorderLessonUnitInput: ReorderLessonUnitInput;
  ReorderLessonUnitResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['ReorderLessonUnitResult']>;
  ReorderLessonUnitSuccess: ResolverTypeWrapper<ReorderLessonUnitSuccess>;
  RescheduleBookingInput: RescheduleBookingInput;
  RescheduleBookingResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['RescheduleBookingResult']>;
  RescheduleBookingSuccess: ResolverTypeWrapper<RescheduleBookingSuccess>;
  RetireLessonUnitInput: RetireLessonUnitInput;
  RetireLessonUnitResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['RetireLessonUnitResult']>;
  RetireLessonUnitSuccess: ResolverTypeWrapper<RetireLessonUnitSuccess>;
  ReviseLessonMaterialInput: ReviseLessonMaterialInput;
  ReviseLessonMaterialResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['ReviseLessonMaterialResult']>;
  ReviseLessonMaterialSuccess: ResolverTypeWrapper<ReviseLessonMaterialSuccess>;
  RolePlace: ResolverTypeWrapper<RolePlace>;
  RoleWorkspace: ResolverTypeWrapper<RoleWorkspace>;
  SaveTeacherAvailabilityRangeInput: SaveTeacherAvailabilityRangeInput;
  SaveTeacherAvailabilityRangeResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['SaveTeacherAvailabilityRangeResult']>;
  SaveTeacherAvailabilityRangeSuccess: ResolverTypeWrapper<SaveTeacherAvailabilityRangeSuccess>;
  SaveTeacherProfileInput: SaveTeacherProfileInput;
  SaveTeacherProfileSuccess: ResolverTypeWrapper<SaveTeacherProfileSuccess>;
  SaveUserPreferencesInput: SaveUserPreferencesInput;
  SaveUserPreferencesPayload: ResolverTypeWrapper<SaveUserPreferencesPayload>;
  ScheduleSubscriptionCancellationResult: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['ScheduleSubscriptionCancellationResult']>;
  ScheduleSubscriptionCancellationSuccess: ResolverTypeWrapper<ScheduleSubscriptionCancellationSuccess>;
  SetStudentPlacementInput: SetStudentPlacementInput;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  StructuredTextBlockInput: StructuredTextBlockInput;
  StudentPlacement: ResolverTypeWrapper<StudentPlacement>;
  StudentWorkspace: ResolverTypeWrapper<StudentWorkspace>;
  Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>;
  SubscriptionConflict: ResolverTypeWrapper<SubscriptionConflict>;
  SubscriptionLifecycleInput: SubscriptionLifecycleInput;
  SubscriptionProviderEventType: SubscriptionProviderEventType;
  SubscriptionState: SubscriptionState;
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
  AddAvailabilityExceptionInput: AddAvailabilityExceptionInput;
  AddAvailabilityExceptionResult: ResolversUnionTypes<ResolversParentTypes>['AddAvailabilityExceptionResult'];
  AddAvailabilityExceptionSuccess: AddAvailabilityExceptionSuccess;
  AddLessonMaterialInput: AddLessonMaterialInput;
  AddLessonMaterialResult: ResolversUnionTypes<ResolversParentTypes>['AddLessonMaterialResult'];
  AddLessonMaterialSuccess: AddLessonMaterialSuccess;
  AdjustClassCreditsInput: AdjustClassCreditsInput;
  AdjustClassCreditsResult: ResolversUnionTypes<ResolversParentTypes>['AdjustClassCreditsResult'];
  AdjustClassCreditsSuccess: AdjustClassCreditsSuccess;
  AdministrationCurriculum: AdministrationCurriculum;
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
  ChangeClassSessionSeatCapacityInput: ChangeClassSessionSeatCapacityInput;
  ChangeClassSessionSeatCapacityResult: ResolversUnionTypes<ResolversParentTypes>['ChangeClassSessionSeatCapacityResult'];
  ChangeClassSessionSeatCapacitySuccess: ChangeClassSessionSeatCapacitySuccess;
  ChangeTeacherQualificationInput: ChangeTeacherQualificationInput;
  ChangeTeacherQualificationSuccess: ChangeTeacherQualificationSuccess;
  ClassCreditAccount: ClassCreditAccount;
  ClassCreditAdjustmentError: ClassCreditAdjustmentError;
  ClassCreditLedgerEntry: ClassCreditLedgerEntry;
  ClassSession: ClassSession;
  ClassSessionDiscoveryConnection: ClassSessionDiscoveryConnection;
  ClassSessionDiscoveryFilter: ClassSessionDiscoveryFilter;
  ClassSessionDiscoveryInput: ClassSessionDiscoveryInput;
  ClassSessionDiscoveryOptions: ClassSessionDiscoveryOptions;
  ClassSessionDiscoveryPageInfo: ClassSessionDiscoveryPageInfo;
  ClassSessionDiscoveryTeacherOption: ClassSessionDiscoveryTeacherOption;
  ClassSessionPublicationError: ClassSessionPublicationError;
  ClassSessionSeatCapacityError: ClassSessionSeatCapacityError;
  Course: Course;
  CreateCourseInput: CreateCourseInput;
  CreateCourseResult: ResolversUnionTypes<ResolversParentTypes>['CreateCourseResult'];
  CreateCourseSuccess: CreateCourseSuccess;
  CreateLessonUnitInput: CreateLessonUnitInput;
  CreateLessonUnitResult: ResolversUnionTypes<ResolversParentTypes>['CreateLessonUnitResult'];
  CreateLessonUnitSuccess: CreateLessonUnitSuccess;
  CurriculumConflict: CurriculumConflict;
  DiscoverableClassSession: DiscoverableClassSession;
  DiscoveryLessonUnit: DiscoveryLessonUnit;
  EndTeacherAvailabilityRangeInput: EndTeacherAvailabilityRangeInput;
  EndTeacherAvailabilityRangeResult: ResolversUnionTypes<ResolversParentTypes>['EndTeacherAvailabilityRangeResult'];
  EndTeacherAvailabilityRangeSuccess: EndTeacherAvailabilityRangeSuccess;
  GrantTeacherQualificationResult: ResolversUnionTypes<ResolversParentTypes>['GrantTeacherQualificationResult'];
  ID: Scalars['ID']['output'];
  InstructionalIdentityLocked: InstructionalIdentityLocked;
  Int: Scalars['Int']['output'];
  InvalidLessonMaterial: InvalidLessonMaterial;
  JoinWaitlistInput: JoinWaitlistInput;
  JoinWaitlistResult: ResolversUnionTypes<ResolversParentTypes>['JoinWaitlistResult'];
  JoinWaitlistSuccess: JoinWaitlistSuccess;
  LessonMaterial: LessonMaterial;
  LessonUnit: LessonUnit;
  Mutation: Record<PropertyKey, never>;
  ProcessSubscriptionProviderEventInput: ProcessSubscriptionProviderEventInput;
  ProcessSubscriptionProviderEventResult: ResolversUnionTypes<ResolversParentTypes>['ProcessSubscriptionProviderEventResult'];
  ProcessSubscriptionProviderEventSuccess: ProcessSubscriptionProviderEventSuccess;
  PublicTeacherProfile: PublicTeacherProfile;
  PublishClassSessionInput: PublishClassSessionInput;
  PublishClassSessionResult: ResolversUnionTypes<ResolversParentTypes>['PublishClassSessionResult'];
  PublishClassSessionSuccess: PublishClassSessionSuccess;
  Query: Record<PropertyKey, never>;
  RememberRoleWorkspacePlaceInput: RememberRoleWorkspacePlaceInput;
  RemoveAvailabilityExceptionInput: RemoveAvailabilityExceptionInput;
  RemoveAvailabilityExceptionResult: ResolversUnionTypes<ResolversParentTypes>['RemoveAvailabilityExceptionResult'];
  RemoveAvailabilityExceptionSuccess: RemoveAvailabilityExceptionSuccess;
  RemoveTeacherQualificationResult: ResolversUnionTypes<ResolversParentTypes>['RemoveTeacherQualificationResult'];
  ReorderLessonUnitInput: ReorderLessonUnitInput;
  ReorderLessonUnitResult: ResolversUnionTypes<ResolversParentTypes>['ReorderLessonUnitResult'];
  ReorderLessonUnitSuccess: ReorderLessonUnitSuccess;
  RescheduleBookingInput: RescheduleBookingInput;
  RescheduleBookingResult: ResolversUnionTypes<ResolversParentTypes>['RescheduleBookingResult'];
  RescheduleBookingSuccess: RescheduleBookingSuccess;
  RetireLessonUnitInput: RetireLessonUnitInput;
  RetireLessonUnitResult: ResolversUnionTypes<ResolversParentTypes>['RetireLessonUnitResult'];
  RetireLessonUnitSuccess: RetireLessonUnitSuccess;
  ReviseLessonMaterialInput: ReviseLessonMaterialInput;
  ReviseLessonMaterialResult: ResolversUnionTypes<ResolversParentTypes>['ReviseLessonMaterialResult'];
  ReviseLessonMaterialSuccess: ReviseLessonMaterialSuccess;
  RolePlace: RolePlace;
  RoleWorkspace: RoleWorkspace;
  SaveTeacherAvailabilityRangeInput: SaveTeacherAvailabilityRangeInput;
  SaveTeacherAvailabilityRangeResult: ResolversUnionTypes<ResolversParentTypes>['SaveTeacherAvailabilityRangeResult'];
  SaveTeacherAvailabilityRangeSuccess: SaveTeacherAvailabilityRangeSuccess;
  SaveTeacherProfileInput: SaveTeacherProfileInput;
  SaveTeacherProfileSuccess: SaveTeacherProfileSuccess;
  SaveUserPreferencesInput: SaveUserPreferencesInput;
  SaveUserPreferencesPayload: SaveUserPreferencesPayload;
  ScheduleSubscriptionCancellationResult: ResolversUnionTypes<ResolversParentTypes>['ScheduleSubscriptionCancellationResult'];
  ScheduleSubscriptionCancellationSuccess: ScheduleSubscriptionCancellationSuccess;
  SetStudentPlacementInput: SetStudentPlacementInput;
  String: Scalars['String']['output'];
  StructuredTextBlockInput: StructuredTextBlockInput;
  StudentPlacement: StudentPlacement;
  StudentWorkspace: StudentWorkspace;
  Subscription: Record<PropertyKey, never>;
  SubscriptionConflict: SubscriptionConflict;
  SubscriptionLifecycleInput: SubscriptionLifecycleInput;
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
  WaitlistEntry: WaitlistEntry;
  WaitlistError: WaitlistError;
  WaitlistPromotionWon: WaitlistPromotionWon;
  WithdrawWaitlistInput: WithdrawWaitlistInput;
  WithdrawWaitlistResult: ResolversUnionTypes<ResolversParentTypes>['WithdrawWaitlistResult'];
  WithdrawWaitlistSuccess: WithdrawWaitlistSuccess;
};

export type AddAvailabilityExceptionResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['AddAvailabilityExceptionResult'] = ResolversParentTypes['AddAvailabilityExceptionResult']> = {
  __resolveType: TypeResolveFn<'AddAvailabilityExceptionSuccess' | 'AvailabilityExceptionSessionConflict' | 'TeacherAvailabilityValidationError', ParentType, ContextType>;
};

export type AddAvailabilityExceptionSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['AddAvailabilityExceptionSuccess'] = ResolversParentTypes['AddAvailabilityExceptionSuccess']> = {
  exception?: Resolver<ResolversTypes['AvailabilityException'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
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

export type ClassSessionResolvers<ContextType = any, ParentType extends ResolversParentTypes['ClassSession'] = ResolversParentTypes['ClassSession']> = {
  endsAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lessonUnitId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  occupiedSeats?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  schedulingTimeZone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  seatCapacity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  startsAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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

export type CourseResolvers<ContextType = any, ParentType extends ResolversParentTypes['Course'] = ResolversParentTypes['Course']> = {
  curriculumLevel?: Resolver<ResolversTypes['CurriculumLevel'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lessonUnits?: Resolver<Array<ResolversTypes['LessonUnit']>, ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  targetLanguage?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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

export type EndTeacherAvailabilityRangeResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['EndTeacherAvailabilityRangeResult'] = ResolversParentTypes['EndTeacherAvailabilityRangeResult']> = {
  __resolveType: TypeResolveFn<'EndTeacherAvailabilityRangeSuccess' | 'TeacherAvailabilityValidationError', ParentType, ContextType>;
};

export type EndTeacherAvailabilityRangeSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['EndTeacherAvailabilityRangeSuccess'] = ResolversParentTypes['EndTeacherAvailabilityRangeSuccess']> = {
  range?: Resolver<ResolversTypes['TeacherAvailabilityRange'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type GrantTeacherQualificationResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['GrantTeacherQualificationResult'] = ResolversParentTypes['GrantTeacherQualificationResult']> = {
  __resolveType: TypeResolveFn<'ChangeTeacherQualificationSuccess' | 'CurriculumConflict', ParentType, ContextType>;
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

export type JoinWaitlistResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['JoinWaitlistResult'] = ResolversParentTypes['JoinWaitlistResult']> = {
  __resolveType: TypeResolveFn<'JoinWaitlistSuccess' | 'WaitlistError', ParentType, ContextType>;
};

export type JoinWaitlistSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['JoinWaitlistSuccess'] = ResolversParentTypes['JoinWaitlistSuccess']> = {
  entry?: Resolver<ResolversTypes['WaitlistEntry'], ParentType, ContextType>;
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

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  addAvailabilityException?: Resolver<ResolversTypes['AddAvailabilityExceptionResult'], ParentType, ContextType, RequireFields<MutationAddAvailabilityExceptionArgs, 'input'>>;
  addLessonMaterial?: Resolver<ResolversTypes['AddLessonMaterialResult'], ParentType, ContextType, RequireFields<MutationAddLessonMaterialArgs, 'input'>>;
  adjustClassCredits?: Resolver<ResolversTypes['AdjustClassCreditsResult'], ParentType, ContextType, RequireFields<MutationAdjustClassCreditsArgs, 'input'>>;
  bookClassSession?: Resolver<ResolversTypes['BookClassSessionResult'], ParentType, ContextType, RequireFields<MutationBookClassSessionArgs, 'input'>>;
  cancelBooking?: Resolver<ResolversTypes['CancelBookingResult'], ParentType, ContextType, RequireFields<MutationCancelBookingArgs, 'input'>>;
  changeClassSessionSeatCapacity?: Resolver<ResolversTypes['ChangeClassSessionSeatCapacityResult'], ParentType, ContextType, RequireFields<MutationChangeClassSessionSeatCapacityArgs, 'input'>>;
  createCourse?: Resolver<ResolversTypes['CreateCourseResult'], ParentType, ContextType, RequireFields<MutationCreateCourseArgs, 'input'>>;
  createLessonUnit?: Resolver<ResolversTypes['CreateLessonUnitResult'], ParentType, ContextType, RequireFields<MutationCreateLessonUnitArgs, 'input'>>;
  endTeacherAvailabilityRange?: Resolver<ResolversTypes['EndTeacherAvailabilityRangeResult'], ParentType, ContextType, RequireFields<MutationEndTeacherAvailabilityRangeArgs, 'input'>>;
  grantTeacherQualification?: Resolver<ResolversTypes['GrantTeacherQualificationResult'], ParentType, ContextType, RequireFields<MutationGrantTeacherQualificationArgs, 'input'>>;
  joinWaitlist?: Resolver<ResolversTypes['JoinWaitlistResult'], ParentType, ContextType, RequireFields<MutationJoinWaitlistArgs, 'input'>>;
  placeLessonUnitInCourse?: Resolver<ResolversTypes['ReorderLessonUnitResult'], ParentType, ContextType, RequireFields<MutationPlaceLessonUnitInCourseArgs, 'input'>>;
  processSubscriptionProviderEvent?: Resolver<ResolversTypes['ProcessSubscriptionProviderEventResult'], ParentType, ContextType, RequireFields<MutationProcessSubscriptionProviderEventArgs, 'input'>>;
  publishClassSession?: Resolver<ResolversTypes['PublishClassSessionResult'], ParentType, ContextType, RequireFields<MutationPublishClassSessionArgs, 'input'>>;
  rememberRoleWorkspacePlace?: Resolver<ResolversTypes['RolePlace'], ParentType, ContextType, RequireFields<MutationRememberRoleWorkspacePlaceArgs, 'input'>>;
  removeAvailabilityException?: Resolver<ResolversTypes['RemoveAvailabilityExceptionResult'], ParentType, ContextType, RequireFields<MutationRemoveAvailabilityExceptionArgs, 'input'>>;
  removeTeacherQualification?: Resolver<ResolversTypes['RemoveTeacherQualificationResult'], ParentType, ContextType, RequireFields<MutationRemoveTeacherQualificationArgs, 'input'>>;
  rescheduleBooking?: Resolver<ResolversTypes['RescheduleBookingResult'], ParentType, ContextType, RequireFields<MutationRescheduleBookingArgs, 'input'>>;
  retireLessonUnit?: Resolver<ResolversTypes['RetireLessonUnitResult'], ParentType, ContextType, RequireFields<MutationRetireLessonUnitArgs, 'input'>>;
  reviseCourseDetails?: Resolver<ResolversTypes['UpdateCourseResult'], ParentType, ContextType, RequireFields<MutationReviseCourseDetailsArgs, 'input'>>;
  reviseLessonMaterial?: Resolver<ResolversTypes['ReviseLessonMaterialResult'], ParentType, ContextType, RequireFields<MutationReviseLessonMaterialArgs, 'input'>>;
  reviseLessonUnitIdentity?: Resolver<ResolversTypes['UpdateLessonUnitResult'], ParentType, ContextType, RequireFields<MutationReviseLessonUnitIdentityArgs, 'input'>>;
  saveLocalizedTopic?: Resolver<ResolversTypes['UpsertTopicSuccess'], ParentType, ContextType, RequireFields<MutationSaveLocalizedTopicArgs, 'input'>>;
  saveTeacherAvailabilityRange?: Resolver<ResolversTypes['SaveTeacherAvailabilityRangeResult'], ParentType, ContextType, RequireFields<MutationSaveTeacherAvailabilityRangeArgs, 'input'>>;
  saveTeacherProfile?: Resolver<ResolversTypes['SaveTeacherProfileSuccess'], ParentType, ContextType, RequireFields<MutationSaveTeacherProfileArgs, 'input'>>;
  saveUserPreferences?: Resolver<ResolversTypes['SaveUserPreferencesPayload'], ParentType, ContextType, RequireFields<MutationSaveUserPreferencesArgs, 'input'>>;
  scheduleSubscriptionCancellation?: Resolver<ResolversTypes['ScheduleSubscriptionCancellationResult'], ParentType, ContextType, RequireFields<MutationScheduleSubscriptionCancellationArgs, 'input'>>;
  setStudentPlacement?: Resolver<ResolversTypes['StudentPlacement'], ParentType, ContextType, RequireFields<MutationSetStudentPlacementArgs, 'input'>>;
  undoSubscriptionCancellation?: Resolver<ResolversTypes['UndoSubscriptionCancellationResult'], ParentType, ContextType, RequireFields<MutationUndoSubscriptionCancellationArgs, 'input'>>;
  withdrawWaitlist?: Resolver<ResolversTypes['WithdrawWaitlistResult'], ParentType, ContextType, RequireFields<MutationWithdrawWaitlistArgs, 'input'>>;
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
  administrationClassCredits?: Resolver<Maybe<ResolversTypes['ClassCreditAccount']>, ParentType, ContextType, RequireFields<QueryAdministrationClassCreditsArgs, 'studentUserId'>>;
  administrationClassSessions?: Resolver<Array<ResolversTypes['ClassSession']>, ParentType, ContextType>;
  administrationCurriculum?: Resolver<ResolversTypes['AdministrationCurriculum'], ParentType, ContextType, RequireFields<QueryAdministrationCurriculumArgs, 'locale'>>;
  classSessionDiscoveryOptions?: Resolver<ResolversTypes['ClassSessionDiscoveryOptions'], ParentType, ContextType>;
  discoverClassSessions?: Resolver<ResolversTypes['ClassSessionDiscoveryConnection'], ParentType, ContextType, RequireFields<QueryDiscoverClassSessionsArgs, 'input'>>;
  publicTeacherProfile?: Resolver<Maybe<ResolversTypes['PublicTeacherProfile']>, ParentType, ContextType, RequireFields<QueryPublicTeacherProfileArgs, 'locale' | 'teacherUserId'>>;
  roleWorkspace?: Resolver<ResolversTypes['RoleWorkspace'], ParentType, ContextType, RequireFields<QueryRoleWorkspaceArgs, 'actingRole'>>;
  studentBookings?: Resolver<Array<ResolversTypes['Booking']>, ParentType, ContextType>;
  studentClassCredits?: Resolver<ResolversTypes['ClassCreditAccount'], ParentType, ContextType>;
  studentPlacements?: Resolver<Array<ResolversTypes['StudentPlacement']>, ParentType, ContextType>;
  studentSubscription?: Resolver<Maybe<ResolversTypes['Subscription']>, ParentType, ContextType>;
  studentWaitlistEntries?: Resolver<Array<ResolversTypes['WaitlistEntry']>, ParentType, ContextType>;
  studentWorkspace?: Resolver<ResolversTypes['StudentWorkspace'], ParentType, ContextType>;
  teacherAvailability?: Resolver<ResolversTypes['TeacherAvailability'], ParentType, ContextType>;
  teacherAvailabilityPreview?: Resolver<Array<ResolversTypes['TeacherAvailabilityOccurrence']>, ParentType, ContextType, RequireFields<QueryTeacherAvailabilityPreviewArgs, 'localDates'>>;
};

export type RemoveAvailabilityExceptionResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['RemoveAvailabilityExceptionResult'] = ResolversParentTypes['RemoveAvailabilityExceptionResult']> = {
  __resolveType: TypeResolveFn<'RemoveAvailabilityExceptionSuccess' | 'TeacherAvailabilityValidationError', ParentType, ContextType>;
};

export type RemoveAvailabilityExceptionSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['RemoveAvailabilityExceptionSuccess'] = ResolversParentTypes['RemoveAvailabilityExceptionSuccess']> = {
  exceptionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RemoveTeacherQualificationResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['RemoveTeacherQualificationResult'] = ResolversParentTypes['RemoveTeacherQualificationResult']> = {
  __resolveType: TypeResolveFn<'ChangeTeacherQualificationSuccess' | 'CurriculumConflict' | 'TeacherQualificationRemovalBlocked', ParentType, ContextType>;
};

export type ReorderLessonUnitResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['ReorderLessonUnitResult'] = ResolversParentTypes['ReorderLessonUnitResult']> = {
  __resolveType: TypeResolveFn<'CurriculumConflict' | 'ReorderLessonUnitSuccess', ParentType, ContextType>;
};

export type ReorderLessonUnitSuccessResolvers<ContextType = any, ParentType extends ResolversParentTypes['ReorderLessonUnitSuccess'] = ResolversParentTypes['ReorderLessonUnitSuccess']> = {
  lessonUnit?: Resolver<ResolversTypes['LessonUnit'], ParentType, ContextType>;
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
  AddAvailabilityExceptionResult?: AddAvailabilityExceptionResultResolvers<ContextType>;
  AddAvailabilityExceptionSuccess?: AddAvailabilityExceptionSuccessResolvers<ContextType>;
  AddLessonMaterialResult?: AddLessonMaterialResultResolvers<ContextType>;
  AddLessonMaterialSuccess?: AddLessonMaterialSuccessResolvers<ContextType>;
  AdjustClassCreditsResult?: AdjustClassCreditsResultResolvers<ContextType>;
  AdjustClassCreditsSuccess?: AdjustClassCreditsSuccessResolvers<ContextType>;
  AdministrationCurriculum?: AdministrationCurriculumResolvers<ContextType>;
  AvailabilityException?: AvailabilityExceptionResolvers<ContextType>;
  AvailabilityExceptionSessionConflict?: AvailabilityExceptionSessionConflictResolvers<ContextType>;
  BookClassSessionResult?: BookClassSessionResultResolvers<ContextType>;
  BookClassSessionSuccess?: BookClassSessionSuccessResolvers<ContextType>;
  Booking?: BookingResolvers<ContextType>;
  BookingError?: BookingErrorResolvers<ContextType>;
  CancelBookingResult?: CancelBookingResultResolvers<ContextType>;
  CancelBookingSuccess?: CancelBookingSuccessResolvers<ContextType>;
  ChangeClassSessionSeatCapacityResult?: ChangeClassSessionSeatCapacityResultResolvers<ContextType>;
  ChangeClassSessionSeatCapacitySuccess?: ChangeClassSessionSeatCapacitySuccessResolvers<ContextType>;
  ChangeTeacherQualificationSuccess?: ChangeTeacherQualificationSuccessResolvers<ContextType>;
  ClassCreditAccount?: ClassCreditAccountResolvers<ContextType>;
  ClassCreditAdjustmentError?: ClassCreditAdjustmentErrorResolvers<ContextType>;
  ClassCreditLedgerEntry?: ClassCreditLedgerEntryResolvers<ContextType>;
  ClassSession?: ClassSessionResolvers<ContextType>;
  ClassSessionDiscoveryConnection?: ClassSessionDiscoveryConnectionResolvers<ContextType>;
  ClassSessionDiscoveryFilter?: ClassSessionDiscoveryFilterResolvers<ContextType>;
  ClassSessionDiscoveryOptions?: ClassSessionDiscoveryOptionsResolvers<ContextType>;
  ClassSessionDiscoveryPageInfo?: ClassSessionDiscoveryPageInfoResolvers<ContextType>;
  ClassSessionDiscoveryTeacherOption?: ClassSessionDiscoveryTeacherOptionResolvers<ContextType>;
  ClassSessionPublicationError?: ClassSessionPublicationErrorResolvers<ContextType>;
  ClassSessionSeatCapacityError?: ClassSessionSeatCapacityErrorResolvers<ContextType>;
  Course?: CourseResolvers<ContextType>;
  CreateCourseResult?: CreateCourseResultResolvers<ContextType>;
  CreateCourseSuccess?: CreateCourseSuccessResolvers<ContextType>;
  CreateLessonUnitResult?: CreateLessonUnitResultResolvers<ContextType>;
  CreateLessonUnitSuccess?: CreateLessonUnitSuccessResolvers<ContextType>;
  CurriculumConflict?: CurriculumConflictResolvers<ContextType>;
  DiscoverableClassSession?: DiscoverableClassSessionResolvers<ContextType>;
  DiscoveryLessonUnit?: DiscoveryLessonUnitResolvers<ContextType>;
  EndTeacherAvailabilityRangeResult?: EndTeacherAvailabilityRangeResultResolvers<ContextType>;
  EndTeacherAvailabilityRangeSuccess?: EndTeacherAvailabilityRangeSuccessResolvers<ContextType>;
  GrantTeacherQualificationResult?: GrantTeacherQualificationResultResolvers<ContextType>;
  InstructionalIdentityLocked?: InstructionalIdentityLockedResolvers<ContextType>;
  InvalidLessonMaterial?: InvalidLessonMaterialResolvers<ContextType>;
  JoinWaitlistResult?: JoinWaitlistResultResolvers<ContextType>;
  JoinWaitlistSuccess?: JoinWaitlistSuccessResolvers<ContextType>;
  LessonMaterial?: LessonMaterialResolvers<ContextType>;
  LessonUnit?: LessonUnitResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  ProcessSubscriptionProviderEventResult?: ProcessSubscriptionProviderEventResultResolvers<ContextType>;
  ProcessSubscriptionProviderEventSuccess?: ProcessSubscriptionProviderEventSuccessResolvers<ContextType>;
  PublicTeacherProfile?: PublicTeacherProfileResolvers<ContextType>;
  PublishClassSessionResult?: PublishClassSessionResultResolvers<ContextType>;
  PublishClassSessionSuccess?: PublishClassSessionSuccessResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RemoveAvailabilityExceptionResult?: RemoveAvailabilityExceptionResultResolvers<ContextType>;
  RemoveAvailabilityExceptionSuccess?: RemoveAvailabilityExceptionSuccessResolvers<ContextType>;
  RemoveTeacherQualificationResult?: RemoveTeacherQualificationResultResolvers<ContextType>;
  ReorderLessonUnitResult?: ReorderLessonUnitResultResolvers<ContextType>;
  ReorderLessonUnitSuccess?: ReorderLessonUnitSuccessResolvers<ContextType>;
  RescheduleBookingResult?: RescheduleBookingResultResolvers<ContextType>;
  RescheduleBookingSuccess?: RescheduleBookingSuccessResolvers<ContextType>;
  RetireLessonUnitResult?: RetireLessonUnitResultResolvers<ContextType>;
  RetireLessonUnitSuccess?: RetireLessonUnitSuccessResolvers<ContextType>;
  ReviseLessonMaterialResult?: ReviseLessonMaterialResultResolvers<ContextType>;
  ReviseLessonMaterialSuccess?: ReviseLessonMaterialSuccessResolvers<ContextType>;
  RolePlace?: RolePlaceResolvers<ContextType>;
  RoleWorkspace?: RoleWorkspaceResolvers<ContextType>;
  SaveTeacherAvailabilityRangeResult?: SaveTeacherAvailabilityRangeResultResolvers<ContextType>;
  SaveTeacherAvailabilityRangeSuccess?: SaveTeacherAvailabilityRangeSuccessResolvers<ContextType>;
  SaveTeacherProfileSuccess?: SaveTeacherProfileSuccessResolvers<ContextType>;
  SaveUserPreferencesPayload?: SaveUserPreferencesPayloadResolvers<ContextType>;
  ScheduleSubscriptionCancellationResult?: ScheduleSubscriptionCancellationResultResolvers<ContextType>;
  ScheduleSubscriptionCancellationSuccess?: ScheduleSubscriptionCancellationSuccessResolvers<ContextType>;
  StudentPlacement?: StudentPlacementResolvers<ContextType>;
  StudentWorkspace?: StudentWorkspaceResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  SubscriptionConflict?: SubscriptionConflictResolvers<ContextType>;
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
  WaitlistEntry?: WaitlistEntryResolvers<ContextType>;
  WaitlistError?: WaitlistErrorResolvers<ContextType>;
  WaitlistPromotionWon?: WaitlistPromotionWonResolvers<ContextType>;
  WithdrawWaitlistResult?: WithdrawWaitlistResultResolvers<ContextType>;
  WithdrawWaitlistSuccess?: WithdrawWaitlistSuccessResolvers<ContextType>;
};

