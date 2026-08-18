import { Temporal } from "@js-temporal/polyfill";
import { REPORT_EXPORT_MAXIMUM_RANGE_MONTHS } from "@marketplace/core";
import { z } from "zod";

import type { Database } from "../database/database.js";

/**
 * Every bounded report and every Report Export reads the same range: local calendar
 * dates interpreted in the requester's own Display Time Zone, no longer than the
 * 12 months ADR 0056 accepts. It lives in one place so an interactive report and its
 * export can never disagree about how much activity one request may ask for.
 */
const MAXIMUM_RANGE_MONTHS = REPORT_EXPORT_MAXIMUM_RANGE_MONTHS;
const DEFAULT_RANGE_DAYS = 30;

const rangeInputSchema = z.object({
  fromLocalDate: z.iso.date().nullish(),
  toLocalDate: z.iso.date().nullish(),
}).strict();

export type ReportRangeInput = z.input<typeof rangeInputSchema>;

export class InvalidReportRange extends Error {}

/**
 * A Display Time Zone the reader never saved is not a bad range: there is no date to
 * interpret at all. It is separated so the refusal a reader sees, and the Audit Entry
 * behind it, name the thing that is actually missing.
 */
export class MissingDisplayTimeZone extends Error {}

export type ResolvedReportRange = {
  fromLocalDate: string;
  /** The last reported local date, inclusive, as an interactive report presents it. */
  toLocalDate: string;
  /** The same boundary as the exported schema states it: the first excluded date. */
  endExclusiveLocalDate: string;
  timeZone: string;
  startInstant: Date;
  endInstantExclusive: Date;
};

export function resolveReportRange(
  input: ReportRangeInput,
  timeZone: string,
  now: Date,
): ResolvedReportRange {
  const parsed = rangeInputSchema.safeParse(input);
  if (!parsed.success) throw new InvalidReportRange("Choose a valid local date range.");

  let toDate: Temporal.PlainDate;
  let fromDate: Temporal.PlainDate;
  try {
    const today = Temporal.Instant.from(now.toISOString()).toZonedDateTimeISO(timeZone).toPlainDate();
    toDate = parsed.data.toLocalDate ? Temporal.PlainDate.from(parsed.data.toLocalDate) : today;
    fromDate = parsed.data.fromLocalDate
      ? Temporal.PlainDate.from(parsed.data.fromLocalDate)
      : toDate.subtract({ days: DEFAULT_RANGE_DAYS - 1 });
  } catch {
    throw new InvalidReportRange("Choose a valid local date range.");
  }
  if (Temporal.PlainDate.compare(fromDate, toDate) > 0) {
    throw new InvalidReportRange("Choose a range that starts on or before it ends.");
  }
  const lastAllowedDate = fromDate.add({ months: MAXIMUM_RANGE_MONTHS }).subtract({ days: 1 });
  if (Temporal.PlainDate.compare(toDate, lastAllowedDate) > 0) {
    throw new InvalidReportRange(`Choose a range of at most ${MAXIMUM_RANGE_MONTHS} months.`);
  }

  try {
    const endExclusiveDate = toDate.add({ days: 1 });
    return {
      fromLocalDate: fromDate.toString(),
      toLocalDate: toDate.toString(),
      endExclusiveLocalDate: endExclusiveDate.toString(),
      timeZone,
      startInstant: new Date(fromDate.toPlainDateTime("00:00").toZonedDateTime(timeZone, { disambiguation: "compatible" }).epochMilliseconds),
      endInstantExclusive: new Date(endExclusiveDate.toPlainDateTime("00:00").toZonedDateTime(timeZone, { disambiguation: "compatible" }).epochMilliseconds),
    };
  } catch {
    throw new InvalidReportRange("Choose a local date range with valid boundaries in the saved Display Time Zone.");
  }
}

/** The saved Display Time Zone every reported date is read in, or an explicit refusal. */
export async function reportingDisplayTimeZone(db: Database, userId: string) {
  const user = await db.selectFrom("users")
    .select("display_time_zone")
    .where("id", "=", userId)
    .executeTakeFirstOrThrow();
  if (!user.display_time_zone) {
    throw new MissingDisplayTimeZone("A saved Display Time Zone is required to read this report.");
  }
  return user.display_time_zone;
}

/** The last date a range includes, from the first date it excludes. */
export function lastIncludedLocalDate(endExclusiveLocalDate: string) {
  return Temporal.PlainDate.from(endExclusiveLocalDate).subtract({ days: 1 }).toString();
}

/**
 * An instant as the exported schema writes it: ISO 8601 in the requester's Display
 * Time Zone with an explicit offset, so a reader can see which day a value fell on
 * without re-deriving it from the named zone in the neighbouring column.
 */
export function exportInstant(instant: Date, timeZone: string) {
  return Temporal.Instant.from(instant.toISOString())
    .toZonedDateTimeISO(timeZone)
    .toString({ timeZoneName: "never" });
}
