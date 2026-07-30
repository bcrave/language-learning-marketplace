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

export enum InterfaceLocale {
  En = 'EN',
  Es = 'ES'
}

export type Mutation = {
  __typename?: 'Mutation';
  saveUserPreferences: SaveUserPreferencesPayload;
};


export type MutationSaveUserPreferencesArgs = {
  input: SaveUserPreferencesInput;
};

export type Query = {
  __typename?: 'Query';
  studentWorkspace: StudentWorkspace;
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

export type StudentWorkspace = {
  __typename?: 'StudentWorkspace';
  roles: Array<UserRole>;
  user: User;
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





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  InterfaceLocale: InterfaceLocale;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  SaveUserPreferencesInput: SaveUserPreferencesInput;
  SaveUserPreferencesPayload: ResolverTypeWrapper<SaveUserPreferencesPayload>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  StudentWorkspace: ResolverTypeWrapper<StudentWorkspace>;
  User: ResolverTypeWrapper<User>;
  UserRole: UserRole;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Boolean: Scalars['Boolean']['output'];
  ID: Scalars['ID']['output'];
  Mutation: Record<PropertyKey, never>;
  Query: Record<PropertyKey, never>;
  SaveUserPreferencesInput: SaveUserPreferencesInput;
  SaveUserPreferencesPayload: SaveUserPreferencesPayload;
  String: Scalars['String']['output'];
  StudentWorkspace: StudentWorkspace;
  User: User;
};

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  saveUserPreferences?: Resolver<ResolversTypes['SaveUserPreferencesPayload'], ParentType, ContextType, RequireFields<MutationSaveUserPreferencesArgs, 'input'>>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  studentWorkspace?: Resolver<ResolversTypes['StudentWorkspace'], ParentType, ContextType>;
};

export type SaveUserPreferencesPayloadResolvers<ContextType = any, ParentType extends ResolversParentTypes['SaveUserPreferencesPayload'] = ResolversParentTypes['SaveUserPreferencesPayload']> = {
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
};

export type StudentWorkspaceResolvers<ContextType = any, ParentType extends ResolversParentTypes['StudentWorkspace'] = ResolversParentTypes['StudentWorkspace']> = {
  roles?: Resolver<Array<ResolversTypes['UserRole']>, ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
};

export type UserResolvers<ContextType = any, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  displayTimeZone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  interfaceLocale?: Resolver<Maybe<ResolversTypes['InterfaceLocale']>, ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  SaveUserPreferencesPayload?: SaveUserPreferencesPayloadResolvers<ContextType>;
  StudentWorkspace?: StudentWorkspaceResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
};

