import { interfaceMessages } from "@marketplace/core";
import IntlMessageFormat from "intl-messageformat";

import type { Database } from "../database/database.js";

type AttendanceReviewMessageId =
  | "attendance-review.created.student"
  | "attendance-review.created.administrator"
  | "attendance-review.resolved.student"
  | "attendance-review.upheld.teacher"
  | "attendance-review.corrected.teacher";

/** How the decision moved Lesson Unit Completion, and with it Lesson Material access. */
export type CompletionChange = "EARNED" | "REMOVED" | "UNCHANGED";

/**
 * How the decision moved the Learning Feedback and Session Rating windows. This is
 * independent of {@link CompletionChange}: a correction to Attended reopens both
 * windows from the decision even when another Attended Booking already supported
 * the Lesson Unit Completion.
 */
export type FeedbackWindowChange = "OPENED" | "HIDDEN" | "UNCHANGED";

async function notify(db: Database, input: {
  recipientUserId: string;
  messageId: AttendanceReviewMessageId;
  variables: Record<string, unknown>;
  sourceReference: string;
  channels: "IN_APP" | "BOTH";
}) {
  const recipient = await db.selectFrom("users").select("interface_locale").where("id", "=", input.recipientUserId).executeTakeFirstOrThrow();
  const locale = recipient.interface_locale ?? "en";
  await db.insertInto("in_app_notifications").values({
    recipient_user_id: input.recipientUserId,
    message_id: input.messageId,
    variables: JSON.stringify(input.variables),
    source_reference: input.sourceReference,
  }).execute();
  if (input.channels === "IN_APP") return;
  const renderedContent = String(new IntlMessageFormat(interfaceMessages[locale][input.messageId], locale).format(input.variables));
  await db.insertInto("email_notification_intents").values({
    recipient_user_id: input.recipientUserId,
    message_id: input.messageId,
    locale,
    variables: JSON.stringify(input.variables),
    rendered_content: renderedContent,
    source_reference: input.sourceReference,
  }).execute();
}

export async function notifyAttendanceReviewCreatedStudent(db: Database, studentUserId: string, classSessionId: string, reviewRequestId: string) {
  await notify(db, {
    recipientUserId: studentUserId,
    messageId: "attendance-review.created.student",
    variables: { classSessionId },
    sourceReference: `attendance-review.created.student:${reviewRequestId}`,
    channels: "IN_APP",
  });
}

export async function notifyAttendanceReviewCreatedAdministrators(db: Database, classSessionId: string, reviewRequestId: string) {
  const administrators = await db.selectFrom("role_assignments")
    .select("user_id")
    .where("role", "=", "PLATFORM_ADMINISTRATOR")
    .orderBy("user_id")
    .execute();
  for (const administrator of administrators) {
    await notify(db, {
      recipientUserId: administrator.user_id,
      messageId: "attendance-review.created.administrator",
      variables: { classSessionId, reviewLink: `/administration/operations?attendanceReviewRequestId=${reviewRequestId}` },
      sourceReference: `attendance-review.created.administrator:${reviewRequestId}`,
      channels: "IN_APP",
    });
  }
}

export async function notifyAttendanceReviewResolvedStudent(db: Database, studentUserId: string, input: {
  classSessionId: string;
  reviewRequestId: string;
  state: "UPHELD" | "CORRECTED";
  outcome: "ATTENDED" | "NO_SHOW";
  studentVisibleRationale: string;
  completionChange: CompletionChange;
  windowChange: FeedbackWindowChange;
}) {
  await notify(db, {
    recipientUserId: studentUserId,
    messageId: "attendance-review.resolved.student",
    variables: {
      classSessionId: input.classSessionId,
      state: input.state,
      outcome: input.outcome,
      rationale: input.studentVisibleRationale,
      completionChange: input.completionChange,
      windowChange: input.windowChange,
    },
    sourceReference: `attendance-review.resolved.student:${input.reviewRequestId}`,
    channels: "BOTH",
  });
}

export async function notifyAttendanceReviewDecidedTeacher(db: Database, teacherUserId: string, input: {
  classSessionId: string;
  reviewRequestId: string;
  state: "UPHELD" | "CORRECTED";
  outcome: "ATTENDED" | "NO_SHOW";
}) {
  const upheld = input.state === "UPHELD";
  await notify(db, {
    recipientUserId: teacherUserId,
    messageId: upheld ? "attendance-review.upheld.teacher" : "attendance-review.corrected.teacher",
    variables: { classSessionId: input.classSessionId, outcome: input.outcome },
    sourceReference: `attendance-review.${upheld ? "upheld" : "corrected"}.teacher:${input.reviewRequestId}`,
    channels: upheld ? "IN_APP" : "BOTH",
  });
}
