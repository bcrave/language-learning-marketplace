import { interfaceMessages } from "@marketplace/core";
import IntlMessageFormat from "intl-messageformat";

import type { Database } from "../database/database.js";

type FeedbackMessageId =
  | "learning-feedback.submitted.student"
  | "learning-feedback.redacted.teacher"
  | "learning-feedback.redacted.student"
  | "session-rating.comment-redacted.student";

async function notifyUser(db: Database, input: {
  recipientUserId: string;
  messageId: FeedbackMessageId;
  variables: Record<string, unknown>;
  sourceReference: string;
}) {
  const recipient = await db.selectFrom("users").select("interface_locale").where("id", "=", input.recipientUserId).executeTakeFirstOrThrow();
  const locale = recipient.interface_locale ?? "en";
  const renderedContent = String(new IntlMessageFormat(interfaceMessages[locale][input.messageId], locale).format(input.variables));
  await db.insertInto("in_app_notifications").values({ recipient_user_id: input.recipientUserId, message_id: input.messageId, variables: JSON.stringify(input.variables), source_reference: input.sourceReference }).execute();
  await db.insertInto("email_notification_intents").values({ recipient_user_id: input.recipientUserId, message_id: input.messageId, locale, variables: JSON.stringify(input.variables), rendered_content: renderedContent, source_reference: input.sourceReference }).execute();
}

export async function notifyLearningFeedbackSubmitted(
  db: Database,
  studentUserId: string,
  classSessionId: string,
  feedbackId: string,
) {
  await notifyUser(db, {
    recipientUserId: studentUserId,
    messageId: "learning-feedback.submitted.student",
    variables: { classSessionId },
    sourceReference: `learning-feedback.submitted:${feedbackId}`,
  });
}

export async function notifyLearningFeedbackRedactedTeacher(
  db: Database,
  teacherUserId: string,
  classSessionId: string,
  feedbackId: string,
  reason: string,
  stateAtRedaction: "DRAFT" | "SUBMITTED",
) {
  await notifyUser(db, {
    recipientUserId: teacherUserId,
    messageId: "learning-feedback.redacted.teacher",
    variables: { classSessionId, reason, state: stateAtRedaction },
    sourceReference: `learning-feedback.redacted.teacher:${feedbackId}`,
  });
}

export async function notifyLearningFeedbackRedactedStudent(
  db: Database,
  studentUserId: string,
  classSessionId: string,
  feedbackId: string,
  reason: string,
) {
  await notifyUser(db, {
    recipientUserId: studentUserId,
    messageId: "learning-feedback.redacted.student",
    variables: { classSessionId, reason },
    sourceReference: `learning-feedback.redacted.student:${feedbackId}`,
  });
}

export async function notifySessionRatingCommentRedacted(
  db: Database,
  studentUserId: string,
  classSessionId: string,
  ratingId: string,
  reason: string,
) {
  await notifyUser(db, {
    recipientUserId: studentUserId,
    messageId: "session-rating.comment-redacted.student",
    variables: { classSessionId, reason },
    sourceReference: `session-rating.comment-redacted:${ratingId}`,
  });
}
