import { interfaceMessages, type ReportExportKind } from "@marketplace/core";
import IntlMessageFormat from "intl-messageformat";

import type { Database } from "../database/database.js";

type ReportExportNotification = {
  recipientUserId: string;
  sourceReference: string;
  kind: ReportExportKind;
  periodStart: string;
  periodEndExclusive: string;
} & (
  | { messageId: "report-export.completed.requester"; rowCount: number; expiresAt: Date }
  | { messageId: "report-export.failed.requester"; guidance: "ROW_LIMIT_EXCEEDED" | "AUTHORIZATION_REVOKED" | "RETRY"; correlationReference: string }
);

/**
 * Both Report Export outcomes are in-app only, and neither reproduces reported data:
 * the completion notice names the scope and points at the authorized download, and
 * the failure notice carries safe retry guidance plus a correlation reference
 * (docs/notification-policy.md). Emailing an export outcome would put the scope of
 * an authorized extract into an inbox that no longer proves authorization.
 */
export async function notifyReportExportRequester(db: Database, notification: ReportExportNotification) {
  const recipient = await db.selectFrom("users")
    .select("interface_locale")
    .where("id", "=", notification.recipientUserId)
    .executeTakeFirstOrThrow();
  const locale = recipient.interface_locale ?? "en";
  const { messageId, recipientUserId, sourceReference, ...rest } = notification;
  const variables = Object.fromEntries(Object.entries(rest).map(([key, value]) => [
    key,
    value instanceof Date ? value.getTime() : value,
  ]));
  // Rendering here proves the message formats with the variables it was given, so a
  // broken catalog entry fails at the source rather than in the recipient's inbox.
  new IntlMessageFormat(interfaceMessages[locale][messageId], locale).format(variables);
  await db.insertInto("in_app_notifications").values({
    recipient_user_id: recipientUserId,
    message_id: messageId,
    variables: JSON.stringify(variables),
    source_reference: sourceReference,
  }).execute();
}
