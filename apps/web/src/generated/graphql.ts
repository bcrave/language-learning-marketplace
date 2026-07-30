/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type InterfaceLocale =
  | 'EN'
  | 'ES';

export type SaveUserPreferencesInput = {
  actingRole: UserRole;
  displayTimeZone: string;
  interfaceLocale: InterfaceLocale;
};

export type UserRole =
  | 'ORGANIZATION_MANAGER'
  | 'PLATFORM_ADMINISTRATOR'
  | 'STUDENT'
  | 'TEACHER';

export type StudentWorkspaceQueryVariables = Exact<{ [key: string]: never; }>;


export type StudentWorkspaceQuery = { studentWorkspace: { roles: Array<UserRole>, user: { id: string, displayName: string, interfaceLocale: InterfaceLocale | null, displayTimeZone: string | null } } };

export type SaveUserPreferencesMutationVariables = Exact<{
  input: SaveUserPreferencesInput;
}>;


export type SaveUserPreferencesMutation = { saveUserPreferences: { user: { id: string, displayName: string, interfaceLocale: InterfaceLocale | null, displayTimeZone: string | null } } };


export const StudentWorkspaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentWorkspace"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentWorkspace"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"interfaceLocale"}},{"kind":"Field","name":{"kind":"Name","value":"displayTimeZone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"roles"}}]}}]}}]} as unknown as DocumentNode<StudentWorkspaceQuery, StudentWorkspaceQueryVariables>;
export const SaveUserPreferencesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveUserPreferences"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaveUserPreferencesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveUserPreferences"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"interfaceLocale"}},{"kind":"Field","name":{"kind":"Name","value":"displayTimeZone"}}]}}]}}]}}]} as unknown as DocumentNode<SaveUserPreferencesMutation, SaveUserPreferencesMutationVariables>;