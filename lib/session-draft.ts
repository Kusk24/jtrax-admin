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

export type TimeOption = { value: string; label: string };

/** "HH:MM" for every step of the day, oldest trick and the clearest one. */
export function timeOptions(step = TIME_STEP_MINUTES): TimeOption[] {
  const out: TimeOption[] = [];
  for (let m = 0; m < 24 * 60; m += step) {
    out.push({ value: clockOf(m), label: clockOf(m) });
  }
  return out;
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
 * An end time a half hour after the start, for when the desk has picked a
 * start and the old end no longer makes sense. Clamped to the end of the day:
 * a session cannot run past midnight, and silently wrapping to 00:15 would be
 * worse than refusing to move.
 */
export function defaultEndFor(start: string): string {
  const a = minutesOf(start);
  if (a === null) return "";
  const end = a + MIN_SESSION_MINUTES;
  if (end > 24 * 60 - TIME_STEP_MINUTES) return clockOf(24 * 60 - TIME_STEP_MINUTES);
  return clockOf(end);
}
