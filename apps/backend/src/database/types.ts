import type { Generated, JSONColumnType } from "kysely";

import type { UserRole } from "@marketplace/core";

export interface UsersTable {
  id: string;
  identity_issuer: string;
  identity_subject: string;
  display_name: string;
  interface_locale: "en" | "es" | null;
  display_time_zone: string | null;
  created_at: Generated<Date>;
}

export interface RoleAssignmentsTable {
  user_id: string;
  role: UserRole;
  created_at: Generated<Date>;
}

export type WorkspacePlace =
  | "STUDENT_DISCOVERY"
  | "STUDENT_LEARNING"
  | "TEACHER_SCHEDULE"
  | "TEACHER_AVAILABILITY"
  | "ORGANIZATION_STUDENTS"
  | "ORGANIZATION_REPORTS"
  | "ADMINISTRATION_OPERATIONS"
  | "ADMINISTRATION_PEOPLE";

export interface RoleWorkspacePlacesTable {
  user_id: string;
  role: UserRole;
  place: WorkspacePlace;
  updated_at: Generated<Date>;
}

export interface AuditEntriesTable {
  id: Generated<string>;
  actor_user_id: string | null;
  system_identity: "CLASS_SESSION_REMINDER_WORKER" | "WAITLIST_WORKER" | null;
  acting_role: UserRole | null;
  operation: string;
  target_type: string;
  target_id: string;
  outcome: "SUCCEEDED" | "DENIED" | "FAILED";
  reason_code: string;
  correlation_id: string;
  occurred_at: Generated<Date>;
}

export interface SchemaMigrationsTable {
  name: string;
  applied_at: Generated<Date>;
}

export type CurriculumLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type StructuredContent = Array<Record<string, unknown>>;

export interface CurriculumLevelsTable { code: CurriculumLevel; sort_order: number }
export interface StudentPlacementsTable { student_user_id: string; target_language: string; curriculum_level: CurriculumLevel; updated_at: Generated<Date> }
export interface CoursesTable { id: Generated<string>; stable_key: string; target_language: string; curriculum_level: CurriculumLevel; title: string; summary: string; created_at: Generated<Date> }
export interface TopicsTable { id: Generated<string>; key: string; label_en: string; label_es: string; created_at: Generated<Date> }
export interface LessonUnitsTable { id: Generated<string>; stable_key: string; course_id: string; title: string; summary: string; objectives: JSONColumnType<string[]>; sort_order: number; state: "ACTIVE" | "RETIRED"; replacement_lesson_unit_id: string | null; retired_at: Date | null; created_at: Generated<Date> }
export interface LessonUnitTopicsTable { lesson_unit_id: string; topic_key: string }
export interface LessonMaterialsTable { id: Generated<string>; lesson_unit_id: string; kind: "STRUCTURED_TEXT" | "HTTPS_REFERENCE"; title: string; structured_content: JSONColumnType<StructuredContent> | null; https_url: string | null; publisher: string | null; created_at: Generated<Date> }
export interface TeacherProfilesTable { teacher_user_id: string; pronouns: string | null; profile_image_url: string | null; professional_bio: string; updated_at: Generated<Date> }
export interface TeacherProfileTopicsTable { teacher_user_id: string; topic_key: string }
export interface TeacherQualificationsTable { id: Generated<string>; teacher_user_id: string; target_language: string; curriculum_level: CurriculumLevel; granted_by_user_id: string; granted_at: Generated<Date> }
export interface ClassSessionsTable { id: Generated<string>; lesson_unit_id: string; teacher_user_id: string; starts_at: Date; scheduling_time_zone: string; seat_capacity: Generated<number>; occupied_seats: Generated<number>; state: "PUBLISHED" | "CANCELLED" }
export interface ScheduleCommitmentsTable { id: Generated<string>; user_id: string; class_session_id: string; commitment_role: "STUDENT" | "TEACHER"; starts_at: Date; ends_at: Date; active: Generated<boolean> }
export interface BookingsTable { id: Generated<string>; student_user_id: string; class_session_id: string; teacher_user_id_at_booking: string; state: Generated<"ACTIVE" | "ENDED">; terminal_reason: "STUDENT_CANCELLATION" | "RESCHEDULED" | null; class_credit_refunded: Generated<boolean>; late_cancellation_refund_until: Date | null; rescheduled_from_booking_id: Generated<string | null>; booked_at: Generated<Date>; ended_at: Date | null }
export type WaitlistTerminalReason = "WITHDRAWN" | "PROMOTED" | "EXPIRED" | "CLASS_SESSION_UNAVAILABLE" | "INSUFFICIENT_CLASS_CREDITS" | "SCHEDULE_CONFLICT" | "ALREADY_BOOKED";
export interface WaitlistEntriesTable { id: Generated<string>; student_user_id: string; class_session_id: string; state: "ACTIVE" | "WITHDRAWN" | "PROMOTED" | "EXPIRED" | "INELIGIBLE"; terminal_reason: WaitlistTerminalReason | null; joined_at: Date; expires_at: Date; completed_at: Date | null; promoted_booking_id: string | null }
export interface WaitlistPromotionRequestsTable { class_session_id: string; requested_at: Generated<Date>; request_version: Generated<number>; processed_at: Date | null }
export interface ClassSessionRemindersTable { id: Generated<string>; class_session_id: string; recipient_user_id: string; commitment_role: "STUDENT" | "TEACHER"; due_at: Date; terminal_outcome: "DELIVERED" | "SUPPRESSED" | null; completed_at: Date | null }
export interface InAppNotificationsTable { id: Generated<string>; recipient_user_id: string; message_id: string; variables: JSONColumnType<Record<string, unknown>>; source_reference: Generated<string | null>; created_at: Generated<Date> }
export interface EmailNotificationIntentsTable { id: Generated<string>; recipient_user_id: string; message_id: string; locale: "en" | "es"; variables: JSONColumnType<Record<string, unknown>>; rendered_content: string; source_reference: Generated<string | null>; created_at: Generated<Date> }
export interface MutationIdempotencyRecordsTable { actor_user_id: string; operation: string; idempotency_key: string; input_fingerprint: string; outcome: JSONColumnType<Record<string, unknown>>; created_at: Generated<Date> }
export interface ClassCreditAccountsTable { student_user_id: string; available_balance: Generated<number>; updated_at: Generated<Date> }
export interface ClassCreditLedgerEntriesTable { id: Generated<string>; student_user_id: string; amount: number; source: "CREDIT_ADJUSTMENT" | "SUBSCRIPTION_GRANT" | "ORGANIZATION_CREDIT_GRANT" | "BOOKING_DEDUCTION" | "BOOKING_REFUND"; source_reference: string; reason: string | null; created_at: Generated<Date> }
export interface SubscriptionsTable { id: Generated<string>; student_user_id: string; state: "ACTIVE" | "CANCELLATION_SCHEDULED" | "CANCELLED"; activated_at: Date; anchor_day: number; accounting_time_utc: string; renewal_count: Generated<number>; next_anniversary_at: Date | null; cancellation_effective_at: Date | null; updated_at: Generated<Date> }
export interface SubscriptionProviderEventsTable { provider_event_id: string; student_user_id: string; event_type: "ACTIVATED" | "RENEWED" | "CANCELLED" | "REACTIVATED"; effective_at: Date; reason: string; input_fingerprint: string; outcome: JSONColumnType<Record<string, unknown>>; created_at: Generated<Date> }
export interface TeacherAvailabilitySettingsTable { teacher_user_id: string; time_zone: string; updated_at: Generated<Date> }
export interface TeacherAvailabilityRangesTable { id: Generated<string>; teacher_user_id: string; weekday: number; start_local_time: string; end_local_time: string; effective_from: string; effective_until: string | null; time_zone: string; created_at: Generated<Date> }
export interface AvailabilityExceptionsTable { id: Generated<string>; teacher_user_id: string; starts_at_local: string; ends_at_local: string; starts_at: Date; ends_at: Date; time_zone: string; removed_at: Date | null; created_at: Generated<Date> }

export interface DatabaseSchema {
  users: UsersTable;
  role_assignments: RoleAssignmentsTable;
  role_workspace_places: RoleWorkspacePlacesTable;
  audit_entries: AuditEntriesTable;
  schema_migrations: SchemaMigrationsTable;
  curriculum_levels: CurriculumLevelsTable;
  student_placements: StudentPlacementsTable;
  courses: CoursesTable;
  topics: TopicsTable;
  lesson_units: LessonUnitsTable;
  lesson_unit_topics: LessonUnitTopicsTable;
  lesson_materials: LessonMaterialsTable;
  teacher_profiles: TeacherProfilesTable;
  teacher_profile_topics: TeacherProfileTopicsTable;
  teacher_qualifications: TeacherQualificationsTable;
  class_sessions: ClassSessionsTable;
  schedule_commitments: ScheduleCommitmentsTable;
  bookings: BookingsTable;
  waitlist_entries: WaitlistEntriesTable;
  waitlist_promotion_requests: WaitlistPromotionRequestsTable;
  class_session_reminders: ClassSessionRemindersTable;
  in_app_notifications: InAppNotificationsTable;
  email_notification_intents: EmailNotificationIntentsTable;
  mutation_idempotency_records: MutationIdempotencyRecordsTable;
  class_credit_accounts: ClassCreditAccountsTable;
  class_credit_ledger_entries: ClassCreditLedgerEntriesTable;
  subscriptions: SubscriptionsTable;
  subscription_provider_events: SubscriptionProviderEventsTable;
  teacher_availability_settings: TeacherAvailabilitySettingsTable;
  teacher_availability_ranges: TeacherAvailabilityRangesTable;
  availability_exceptions: AvailabilityExceptionsTable;
}
