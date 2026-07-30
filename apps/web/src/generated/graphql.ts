/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type InterfaceLocale =
  | 'EN'
  | 'ES';

export type UserRole =
  | 'ORGANIZATION_MANAGER'
  | 'PLATFORM_ADMINISTRATOR'
  | 'STUDENT'
  | 'TEACHER';

export type StudentWorkspaceQueryVariables = Exact<{ [key: string]: never; }>;


export type StudentWorkspaceQuery = { studentWorkspace: { roles: Array<UserRole>, user: { id: string, displayName: string, interfaceLocale: InterfaceLocale, displayTimeZone: string } } };


export const StudentWorkspaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentWorkspace"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentWorkspace"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"interfaceLocale"}},{"kind":"Field","name":{"kind":"Name","value":"displayTimeZone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"roles"}}]}}]}}]} as unknown as DocumentNode<StudentWorkspaceQuery, StudentWorkspaceQueryVariables>;