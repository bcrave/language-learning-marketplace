import { interfaceMessages } from "@marketplace/core";
import IntlMessageFormat from "intl-messageformat";

import type { Database } from "../database/database.js";

export async function notifyLearningFeedbackSubmitted(
  db: Database,
  studentUserId: string,
  classSessionId: string,
  feedbackId: string,
) {
  const student = await db.selectFrom("users").select("interface_locale").where("id", "=", studentUserId).executeTakeFirstOrThrow();
  const locale = student.interface_locale ?? "en";
  const messageId = "learning-feedback.submitted.student";
  const variables = { classSessionId };
  const renderedContent = String(new IntlMessageFormat(interfaceMessages[locale][messageId], locale).format(variables));
  const sourceReference = `learning-feedback.submitted:${feedbackId}`;
  await db.insertInto("in_app_notifications").values({ recipient_user_id: studentUserId, message_id: messageId, variables: JSON.stringify(variables), source_reference: sourceReference }).execute();
  await db.insertInto("email_notification_intents").values({ recipient_user_id: studentUserId, message_id: messageId, locale, variables: JSON.stringify(variables), rendered_content: renderedContent, source_reference: sourceReference }).execute();
}
