/**
 * Creating a class session: the times, the length, and what it will cost.
 *
 * Times are chosen from lists rather than typed into `<input type="time">`.
 * That input reports `value === ""` until every one of its segments is filled,
 * and how many segments there are is the browser's business — a 12-hour locale
 * wants AM/PM too — so a field reading "03:30" could be empty to the code and
 * the desk was left staring at a Create button that would not press. A pair of
 * selects cannot be half chosen.
 *
 * Any start and any end, in five-minute steps: a class does not run on the
 * hour because a form found that easier, and the desk should not be typing
 * around the software. The one rule is a floor on the length — below half an
 * hour it is not a lesson, and a mistyped end time is far more likely than a
 * twenty-minute class.
 */

/** The smallest session the academy runs, in minutes. */
export const MIN_SESSION_MINUTES = 30;

/** How finely a time can be chosen. */
export const TIME_STEP_MINUTES = 5;

/**
 * The lengths a class is offered in.
 *
 * The desk used to choose two clock times and the software worked out the gap
 * — which is the wrong way round from how the office thinks. Nobody decides a
 * class ends at 17:30; they decide it runs for an hour and a half, starting at
 * four. Asking for the length directly also makes the half-hour floor a
 * property of the list instead of an error message: there is no way to pick
 * twenty minutes, so nobody has to be told off for trying.
 *
 * Quarter-hour steps up to four hours. Finer than that is a timetable nobody
 * runs, and longer is a holiday camp, which is several classes.
 */
export const DURATION_STEP_MINUTES = 15;
export const MAX_SESSION_MINUTES = 240;

/** What a class runs for unless the desk says otherwise — one hour, one credit. */
export const DEFAULT_SESSION_MINUTES = 60;

/**
 * The lengths that still fit in the day from this start.
 *
 * A class cannot run past midnight, so a 23:00 start is offered half an hour
 * and three quarters and nothing else. Offering the full ladder and refusing
 * the choice afterwards would be the Create button that will not press, again.
 */
export function durationOptions(start: string): number[] {
  const from = minutesOf(start);
  const out: number[] = [];
  for (let m = MIN_SESSION_MINUTES; m <= MAX_SESSION_MINUTES; m += DURATION_STEP_MINUTES) {
    if (from !== null && from + m > 24 * 60) break;
    out.push(m);
  }
  return out;
}

/** The clock time a class of this length ends at, or "" if the start is unreadable. */
export function endAfter(start: string, minutes: number): string {
  const from = minutesOf(start);
  if (from === null) return "";
  const end = from + minutes;
  if (end > 24 * 60) return "";
  /* 24:00 is midnight, which no clock shows; a class ending exactly at the end
     of the day reads 00:00 and its date is the day it started. */
  return clockOf(end % (24 * 60));
}

/**
 * The length to offer when a start is chosen and the old one no longer fits.
 *
 * An hour where the day allows it, and the longest that does fit where it does
 * not — a late start should shorten the class, not empty the field.
 */
export function defaultDurationFor(start: string): number {
  const options = durationOptions(start);
  if (options.length === 0) return MIN_SESSION_MINUTES;
  return options.includes(DEFAULT_SESSION_MINUTES)
    ? DEFAULT_SESSION_MINUTES
    : options[options.length - 1];
}

export type TimeOption = { value: string; label: string };

/**
 * Two short lists rather than one long one.
 *
 * Every time of day five minutes apart is 288 options in a single dropdown —
 * correct, and unusable: finding 16:45 meant scrolling past three hundred
 * neighbours. An hour and a minute chosen separately is 24 options and 12,
 * both short enough to see at once, and between them they still reach every
 * five-minute mark the timetable uses.
 */
export function hourOptions(): TimeOption[] {
  return Array.from({ length: 24 }, (_, h) => {
    const value = String(h).padStart(2, "0");
    return { value, label: value };
  });
}

export function minuteOptions(step = TIME_STEP_MINUTES): TimeOption[] {
  const out: TimeOption[] = [];
  for (let m = 0; m < 60; m += step) out.push({ value: String(m).padStart(2, "0"), label: String(m).padStart(2, "0") });
  return out;
}

/** The hour half of "HH:MM", or "" when there is nothing chosen yet. */
export function hourOf(clock: string): string {
  return /^(\d{2}):(\d{2})$/.test(clock) ? clock.slice(0, 2) : "";
}

export function minuteOf(clock: string): string {
  return /^(\d{2}):(\d{2})$/.test(clock) ? clock.slice(3, 5) : "";
}

/**
 * Puts the two halves back together.
 *
 * Half a time is not a time, so an hour with no minute yet reads as ":00" —
 * choosing 4pm should mean 16:00 without also having to say "and no minutes".
 * A minute with no hour is nothing at all, and returns "" rather than
 * inventing midnight.
 */
export function joinClock(hour: string, minute: string): string {
  if (!hour) return "";
  return `${hour}:${minute || "00"}`;
}

function clockOf(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Minutes since midnight, or null when the clock is unreadable. */
export function minutesOf(clock: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** How long the session runs, in minutes; 0 when either end is unreadable. */
export function lengthMinutes(start: string, end: string): number {
  const a = minutesOf(start);
  const b = minutesOf(end);
  if (a === null || b === null || b <= a) return 0;
  return b - a;
}

/**
 * What one student's attendance will cost.
 *
 * One credit is one hour, so the length in hours *is* the price: ninety
 * minutes costs 1.5 and a half hour costs 0.5. The backend works this out
 * again from the session it stores — this is the same sum, shown before the
 * desk commits to it, because a family should not learn the price afterwards.
 */
export function creditCost(start: string, end: string): number {
  return lengthMinutes(start, end) / 60;
}

export type DraftProblem =
  | "noClasses"
  | "noClass"
  | "endBeforeStart"
  | "tooShort"
  | null;

/**
 * What is stopping this session being created, or null when nothing is.
 *
 * Ordered the way a person reads the form: there has to be a class to hold it,
 * then one has to be chosen, then the times have to make sense. Returning the
 * *first* problem rather than a list keeps the footer to one honest sentence.
 */
export function draftProblem(opts: {
  classCount: number;
  classId: string;
  start: string;
  end: string;
}): DraftProblem {
  if (opts.classCount === 0) return "noClasses";
  if (!opts.classId) return "noClass";
  const a = minutesOf(opts.start);
  const b = minutesOf(opts.end);
  if (a === null || b === null || b <= a) return "endBeforeStart";
  if (b - a < MIN_SESSION_MINUTES) return "tooShort";
  return null;
}

/**
 * The end time for a freshly chosen start: the default length, or the longest
 * that fits before midnight.
 */
export function defaultEndFor(start: string): string {
  if (minutesOf(start) === null) return "";
  return endAfter(start, defaultDurationFor(start));
}
