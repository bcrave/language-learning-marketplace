/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type AddAvailabilityExceptionInput = {
  endDisambiguation: LocalTimeDisambiguation;
  endsAtLocal: string;
  idempotencyKey: string | number;
  startDisambiguation: LocalTimeDisambiguation;
  startsAtLocal: string;
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

export type ChangeClassSessionSeatCapacityInput = {
  classSessionId: string | number;
  idempotencyKey: string | number;
  seatCapacity: number;
};

export type ChangeTeacherQualificationInput = {
  curriculumLevel: CurriculumLevel;
  idempotencyKey: string | number;
  targetLanguage: string;
  teacherUserId: string | number;
};

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

export type EndTeacherAvailabilityRangeInput = {
  effectiveUntil: string;
  idempotencyKey: string | number;
  rangeId: string | number;
};

export type InterfaceLocale =
  | 'EN'
  | 'ES';

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

export type PublishClassSessionInput = {
  idempotencyKey: string | number;
  lessonUnitId: string | number;
  schedulingTimeZone: string;
  seatCapacity?: number | null | undefined;
  startsAtLocal: string;
  teacherUserId: string | number;
  timeDisambiguation: LocalTimeDisambiguation;
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

export type StructuredTextBlockInput = {
  items?: Array<string> | null | undefined;
  level?: number | null | undefined;
  text?: string | null | undefined;
  type: string;
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

export type UserRole =
  | 'ORGANIZATION_MANAGER'
  | 'PLATFORM_ADMINISTRATOR'
  | 'STUDENT'
  | 'TEACHER';

export type Weekday =
  | 'FRIDAY'
  | 'MONDAY'
  | 'SATURDAY'
  | 'SUNDAY'
  | 'THURSDAY'
  | 'TUESDAY'
  | 'WEDNESDAY';

export type WorkspacePlace =
  | 'ADMINISTRATION_OPERATIONS'
  | 'ADMINISTRATION_PEOPLE'
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


export type AdministrationClassSessionsQuery = { administrationCurriculum: { courses: Array<{ id: string, title: string, lessonUnits: Array<{ id: string, title: string, state: LessonUnitState }> }>, teachers: Array<{ id: string, displayName: string, taughtLanguages: Array<string>, qualifiedCurriculumLevels: Array<CurriculumLevel> }> }, administrationClassSessions: Array<{ id: string, lessonUnitId: string, teacherUserId: string, startsAt: string, endsAt: string, schedulingTimeZone: string, seatCapacity: number, occupiedSeats: number }> };

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


export const AdministrationClassSessionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdministrationClassSessions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"locale"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"InterfaceLocale"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"administrationCurriculum"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"locale"},"value":{"kind":"Variable","name":{"kind":"Name","value":"locale"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"teachers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"taughtLanguages"}},{"kind":"Field","name":{"kind":"Name","value":"qualifiedCurriculumLevels"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"administrationClassSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lessonUnitId"}},{"kind":"Field","name":{"kind":"Name","value":"teacherUserId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"schedulingTimeZone"}},{"kind":"Field","name":{"kind":"Name","value":"seatCapacity"}},{"kind":"Field","name":{"kind":"Name","value":"occupiedSeats"}}]}}]}}]} as unknown as DocumentNode<AdministrationClassSessionsQuery, AdministrationClassSessionsQueryVariables>;
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
export const StudentWorkspaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentWorkspace"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentWorkspace"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"interfaceLocale"}},{"kind":"Field","name":{"kind":"Name","value":"displayTimeZone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"roles"}}]}}]}}]} as unknown as DocumentNode<StudentWorkspaceQuery, StudentWorkspaceQueryVariables>;
export const RoleWorkspaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RoleWorkspace"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"actingRole"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserRole"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"roleWorkspace"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"actingRole"},"value":{"kind":"Variable","name":{"kind":"Name","value":"actingRole"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"actingRole"}},{"kind":"Field","name":{"kind":"Name","value":"relationshipScope"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"interfaceLocale"}},{"kind":"Field","name":{"kind":"Name","value":"displayTimeZone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rolePlaces"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"place"}}]}}]}}]}}]} as unknown as DocumentNode<RoleWorkspaceQuery, RoleWorkspaceQueryVariables>;
export const RememberRoleWorkspacePlaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RememberRoleWorkspacePlace"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RememberRoleWorkspacePlaceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rememberRoleWorkspacePlace"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"place"}}]}}]}}]} as unknown as DocumentNode<RememberRoleWorkspacePlaceMutation, RememberRoleWorkspacePlaceMutationVariables>;
export const SaveUserPreferencesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveUserPreferences"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaveUserPreferencesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveUserPreferences"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"interfaceLocale"}},{"kind":"Field","name":{"kind":"Name","value":"displayTimeZone"}}]}}]}}]}}]} as unknown as DocumentNode<SaveUserPreferencesMutation, SaveUserPreferencesMutationVariables>;
export const TeacherAvailabilityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeacherAvailability"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherAvailability"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"timeZone"}},{"kind":"Field","name":{"kind":"Name","value":"weeklyRanges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"weekday"}},{"kind":"Field","name":{"kind":"Name","value":"startLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"endLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"exceptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsAtLocal"}},{"kind":"Field","name":{"kind":"Name","value":"endsAtLocal"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}}]}}]}}]} as unknown as DocumentNode<TeacherAvailabilityQuery, TeacherAvailabilityQueryVariables>;
export const SaveTeacherAvailabilityRangeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveTeacherAvailabilityRange"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaveTeacherAvailabilityRangeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveTeacherAvailabilityRange"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SaveTeacherAvailabilityRangeSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"range"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"weekday"}},{"kind":"Field","name":{"kind":"Name","value":"startLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"endLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeacherAvailabilityValidationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<SaveTeacherAvailabilityRangeMutation, SaveTeacherAvailabilityRangeMutationVariables>;
export const AddAvailabilityExceptionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddAvailabilityException"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddAvailabilityExceptionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addAvailabilityException"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AddAvailabilityExceptionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exception"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsAtLocal"}},{"kind":"Field","name":{"kind":"Name","value":"endsAtLocal"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AvailabilityExceptionSessionConflict"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"classSessionIds"}},{"kind":"Field","name":{"kind":"Name","value":"absenceRequestPath"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeacherAvailabilityValidationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<AddAvailabilityExceptionMutation, AddAvailabilityExceptionMutationVariables>;
export const EndTeacherAvailabilityRangeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EndTeacherAvailabilityRange"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EndTeacherAvailabilityRangeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endTeacherAvailabilityRange"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EndTeacherAvailabilityRangeSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"range"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"weekday"}},{"kind":"Field","name":{"kind":"Name","value":"startLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"endLocalTime"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeacherAvailabilityValidationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<EndTeacherAvailabilityRangeMutation, EndTeacherAvailabilityRangeMutationVariables>;
export const RemoveAvailabilityExceptionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveAvailabilityException"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RemoveAvailabilityExceptionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeAvailabilityException"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RemoveAvailabilityExceptionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exceptionId"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeacherAvailabilityValidationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveAvailabilityExceptionMutation, RemoveAvailabilityExceptionMutationVariables>;