import { Temporal } from "@js-temporal/polyfill";

export type LocalTimeDisambiguation = "REJECT" | "EARLIER" | "LATER";

export function resolveLocalDateTime(
  localDateTime: string,
  timeZone: string,
  disambiguation: LocalTimeDisambiguation,
): Temporal.Instant {
  const plainDateTime = Temporal.PlainDateTime.from(localDateTime);
  const earlier = plainDateTime.toZonedDateTime(timeZone, {
    disambiguation: "earlier",
  });
  const later = plainDateTime.toZonedDateTime(timeZone, {
    disambiguation: "later",
  });
  const earlierMatches = earlier.toPlainDateTime().equals(plainDateTime);
  const laterMatches = later.toPlainDateTime().equals(plainDateTime);

  if (!earlierMatches && !laterMatches) throw new Error("LOCAL_TIME_GAP");

  const folded = earlier.epochNanoseconds !== later.epochNanoseconds;
  if (folded && disambiguation === "REJECT") throw new Error("LOCAL_TIME_FOLD");

  return (disambiguation === "LATER" ? later : earlier).toInstant();
}

export function localDateDurationHours(localDate: string, timeZone: string) {
  const date = Temporal.PlainDate.from(localDate);
  const start = date.toZonedDateTime({ timeZone, plainTime: "00:00" }).toInstant();
  const end = date.add({ days: 1 })
    .toZonedDateTime({ timeZone, plainTime: "00:00" })
    .toInstant();
  return end.since(start).total({ unit: "hours" });
}

export function resolveWeeklyRangeOccurrence(
  localDate: string,
  startLocalTime: string,
  endLocalTime: string,
  timeZone: string,
) {
  return {
    startsAt: resolveLocalDateTime(`${localDate}T${startLocalTime}`, timeZone, "REJECT"),
    endsAt: resolveLocalDateTime(`${localDate}T${endLocalTime}`, timeZone, "REJECT"),
  };
}
