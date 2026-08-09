import { interfaceMessages } from "@marketplace/core";
import IntlMessageFormat from "intl-messageformat";

import type { Database } from "../database/database.js";

type TeacherClassSessionNotification = {
  teacherUserId: string;
  classSessionId: string;
  startsAt: Date;
} & ({
  messageId: "class-session.teacher-assigned.teacher";
  imminent: boolean;
} | {
  messageId: "class-session.reminder.teacher";
});

type ClassSessionNotification = TeacherClassSessionNotification | {
  recipientUserId: string;
  classSessionId: string;
  startsAt: Date;
  messageId: "class-session.reminder.teacher" | "class-session.reminder.student";
};

export async function notifyClassSessionUser(
  db: Database,
  notification: ClassSessionNotification,
) {
  const recipientUserId = "recipientUserId" in notification
    ? notification.recipientUserId
    : notification.teacherUserId;
  const recipient = await db.selectFrom("users").select(["interface_locale", "display_time_zone"]).where("id", "=", recipientUserId).executeTakeFirstOrThrow();
  const locale = recipient.interface_locale ?? "en";
  const timeZone = recipient.display_time_zone ?? "UTC";
  const baseVariables = { classSessionId: notification.classSessionId, startsAt: notification.startsAt.toISOString(), timeZone };
  const variables = notification.messageId === "class-session.teacher-assigned.teacher"
    ? { ...baseVariables, imminent: notification.imminent }
    : baseVariables;
  const renderedContent = String(new IntlMessageFormat(interfaceMessages[locale][notification.messageId], locale, {
    date: { long: { ...IntlMessageFormat.formats.date.long, timeZone } },
    time: { short: { ...IntlMessageFormat.formats.time.short, timeZone } },
  }).format({ ...variables, startsAt: notification.startsAt }));
  await db.insertInto("in_app_notifications").values({ recipient_user_id: recipientUserId, message_id: notification.messageId, variables: JSON.stringify(variables) }).execute();
  await db.insertInto("email_notification_intents").values({ recipient_user_id: recipientUserId, message_id: notification.messageId, locale, variables: JSON.stringify(variables), rendered_content: renderedContent }).execute();
}

export async function notifyClassSessionTeacher(
  db: Database,
  notification: TeacherClassSessionNotification,
) {
  await notifyClassSessionUser(db, notification);
}
