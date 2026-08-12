import { attendanceReviewDeadline, interfaceMessages, sessionRatingDeadline } from "@marketplace/core";
import IntlMessageFormat from "intl-messageformat";

import type { Database } from "../database/database.js";
import { classSessionEndsAt } from "./attendance-reconciliation.js";

type AttendanceMessageId = "attendance.corrected.student" | "attendance.corrected.teacher" | "attendance.published.student";

async function persistAttendanceNotification(db: Database, input: {
  recipientUserId: string;
  messageId: AttendanceMessageId;
  locale: "en" | "es";
  variables: Record<string, unknown>;
  renderedContent: string;
  sourceReference: string;
}) {
  await db.insertInto("in_app_notifications").values({ recipient_user_id: input.recipientUserId, message_id: input.messageId, variables: JSON.stringify(input.variables), source_reference: input.sourceReference }).execute();
  await db.insertInto("email_notification_intents").values({ recipient_user_id: input.recipientUserId, message_id: input.messageId, locale: input.locale, variables: JSON.stringify(input.variables), rendered_content: input.renderedContent, source_reference: input.sourceReference }).execute();
}

async function notifyCorrection(db: Database, input: {
  recipientUserId: string;
  messageId: "attendance.corrected.student" | "attendance.corrected.teacher";
  classSessionId: string;
  outcome: "ATTENDED" | "NO_SHOW";
  sourceReference: string;
}) {
  const recipient = await db.selectFrom("users").select("interface_locale").where("id", "=", input.recipientUserId).executeTakeFirstOrThrow();
  const locale = recipient.interface_locale ?? "en";
  const variables = { classSessionId: input.classSessionId, outcome: input.outcome };
  await persistAttendanceNotification(db, { ...input, locale, variables, renderedContent: String(new IntlMessageFormat(interfaceMessages[locale][input.messageId], locale).format(variables)) });
}

export async function notifyTeacherAttendanceCorrected(db: Database, teacherUserId: string, classSessionId: string, outcome: "ATTENDED" | "NO_SHOW", correctionId: string) {
  await notifyCorrection(db, { recipientUserId: teacherUserId, messageId: "attendance.corrected.teacher", classSessionId, outcome, sourceReference: `attendance.corrected.teacher:${correctionId}` });
}

export async function notifyAttendanceCorrected(db: Database, studentUserId: string, classSessionId: string, outcome: "ATTENDED" | "NO_SHOW", correctionId: string) {
  await notifyCorrection(db, { recipientUserId: studentUserId, messageId: "attendance.corrected.student", classSessionId, outcome, sourceReference: `attendance.corrected:${correctionId}` });
}

export async function notifyAttendancePublished(db: Database, studentUserId: string, classSessionId: string, bookingId: string, outcome: "ATTENDED" | "NO_SHOW", publishedAt: Date) {
  const student = await db.selectFrom("users").select(["interface_locale", "display_time_zone"]).where("id", "=", studentUserId).executeTakeFirstOrThrow();
  const classSession = await db.selectFrom("class_sessions").select("starts_at").where("id", "=", classSessionId).executeTakeFirstOrThrow();
  const locale = student.interface_locale ?? "en";
  const timeZone = student.display_time_zone ?? "UTC";
  const reviewDeadline = attendanceReviewDeadline(publishedAt);
  const ratingDeadline = outcome === "ATTENDED" ? sessionRatingDeadline(classSessionEndsAt(classSession.starts_at)) : null;
  const variables = { classSessionId, outcome, reviewDeadline: reviewDeadline.toISOString(), ratingDeadline: ratingDeadline?.toISOString() ?? "", timeZone };
  const renderedContent = String(new IntlMessageFormat(interfaceMessages[locale]["attendance.published.student"], locale, {
    date: { long: { ...IntlMessageFormat.formats.date.long, timeZone } },
    time: { short: { ...IntlMessageFormat.formats.time.short, timeZone } },
  }).format({ ...variables, reviewDeadline, ratingDeadline }));
  await persistAttendanceNotification(db, { recipientUserId: studentUserId, messageId: "attendance.published.student", locale, variables, renderedContent, sourceReference: `attendance.published:${bookingId}` });
}
