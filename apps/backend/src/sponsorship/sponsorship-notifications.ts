import { interfaceMessages } from "@marketplace/core";
import IntlMessageFormat from "intl-messageformat";

import type { Database } from "../database/database.js";

type SponsorshipNotification = {
  recipientUserId: string;
  sourceReference: string;
} & (
  | { messageId: "sponsorship-invitation.created.student"; organizationName: string; expiresAt: Date }
  | { messageId: "sponsorship-invitation.created.manager"; studentDisplayName: string; expiresAt: Date }
  | { messageId: "sponsorship-invitation.accepted.student"; organizationName: string; amount: number; availableBalance: number; nextAnniversaryAt: Date }
  | { messageId: "sponsorship-invitation.accepted.manager"; studentDisplayName: string; acceptedAt: Date }
  | { messageId: "sponsorship-invitation.declined.student" }
  | { messageId: "sponsorship-invitation.declined.manager"; studentDisplayName: string }
  | { messageId: "sponsorship-invitation.expired.student"; organizationName: string }
  | { messageId: "sponsorship-invitation.expired.manager"; studentDisplayName: string }
  | { messageId: "organization-credit.granted.student"; amount: number; availableBalance: number; nextAnniversaryAt: Date }
  | { messageId: "sponsorship.terminated.student"; organizationName: string; endedByParty: "STUDENT" | "ORGANIZATION"; endedAt: Date }
  | { messageId: "sponsorship.terminated.manager"; studentDisplayName: string; endedByParty: "STUDENT" | "ORGANIZATION"; endedAt: Date }
);

// In-app-only Sponsored-learning policy IDs from docs/notification-policy.md.
// Every other message id in this module follows the Both channel and also
// creates an Email Notification Intent.
const inAppOnlyMessageIds = new Set<SponsorshipNotification["messageId"]>([
  "sponsorship-invitation.created.manager",
  "sponsorship-invitation.declined.student",
]);

export async function notifySponsorshipUser(db: Database, notification: SponsorshipNotification) {
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
  const renderedContent = String(new IntlMessageFormat(interfaceMessages[locale][messageId], locale).format(variables));
  await db.insertInto("in_app_notifications").values({
    recipient_user_id: recipientUserId,
    message_id: messageId,
    variables: JSON.stringify(variables),
    source_reference: sourceReference,
  }).execute();
  if (!inAppOnlyMessageIds.has(messageId)) {
    await db.insertInto("email_notification_intents").values({
      recipient_user_id: recipientUserId,
      message_id: messageId,
      locale,
      variables: JSON.stringify(variables),
      rendered_content: renderedContent,
      source_reference: sourceReference,
    }).execute();
  }
}
