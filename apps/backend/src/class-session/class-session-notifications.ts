import { interfaceMessages } from "@marketplace/core";
import IntlMessageFormat from "intl-messageformat";

import type { Database } from "../database/database.js";

type TeacherClassSessionMessageId =
  | "class-session.teacher-assigned.teacher"
  | "class-session.reminder.teacher";

export async function notifyClassSessionTeacher(
  db: Database,
  teacherUserId: string,
  messageId: TeacherClassSessionMessageId,
  classSessionId: string,
  startsAt: Date,
  additionalVariables: Record<string, unknown> = {},
) {
  const teacher = await db.selectFrom("users").select(["interface_locale", "display_time_zone"]).where("id", "=", teacherUserId).executeTakeFirstOrThrow();
  const locale = teacher.interface_locale ?? "en";
  const timeZone = teacher.display_time_zone ?? "UTC";
  const variables = { classSessionId, startsAt: startsAt.toISOString(), timeZone, ...additionalVariables };
  const renderedContent = String(new IntlMessageFormat(interfaceMessages[locale][messageId], locale, {
    date: { long: { ...IntlMessageFormat.formats.date.long, timeZone } },
    time: { short: { ...IntlMessageFormat.formats.time.short, timeZone } },
  }).format({ ...variables, startsAt }));
  await db.insertInto("in_app_notifications").values({ recipient_user_id: teacherUserId, message_id: messageId, variables: JSON.stringify(variables) }).execute();
  await db.insertInto("email_notification_intents").values({ recipient_user_id: teacherUserId, message_id: messageId, locale, variables: JSON.stringify(variables), rendered_content: renderedContent }).execute();
}
