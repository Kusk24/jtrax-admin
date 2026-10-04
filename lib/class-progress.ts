/**
 * How far through its slot a class is.
 *
 * `ClassDef.time` is a display string ("1:00 AM – 2:00 AM") because that is
 * what every other screen shows it as. The dashboard's class card needs it as
 * minutes to draw a progress bar, so it is parsed back here rather than
 * widening the shape for one card — the session rows the string is built from
 * are not carried through `lib/live.ts`.
 */
import { useEffect, useState } from "react";

/** Minutes past midnight for "1:00 AM", or null when it is not a clock time. */
export function parseClockTime(text: string): number | null {
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?\s*[Mm]\.?\s*$/.exec(text);
  if (!m) return null;
  const minute = Number(m[2] ?? 0);
  const rawHour = Number(m[1]);
  /* 12 AM is midnight and 12 PM is noon: the 12 wraps to 0 before the PM
     offset, which is why `% 12` comes first. */
  if (rawHour < 1 || rawHour > 12 || minute > 59) return null;
  const hour = (rawHour % 12) + (m[3].toLowerCase() === "p" ? 12 : 0);
  return hour * 60 + minute;
}

export type ClassProgress = {
  /** Minutes run so far, clamped into the slot. */
  elapsed: number;
  /** The slot's full length in minutes. */
  total: number;
  /** `elapsed / total`, so 0…1. */
  fraction: number;
};

/**
 * The slot's length and how much of it has gone, or null when `time` is not a
 * pair of clock times — the string comes from the backend and a card that
 * cannot parse it should show no bar rather than a wrong one.
 *
 * `elapsed` is clamped to the slot: a class that has not started reads 0 and
 * one that has finished reads full, which is what the card should show in both
 * cases. Without the clamp a 9 AM class would report nine hours elapsed at
 * 6 PM and draw a bar nine times too long.
 */
export function classProgress(time: string, now = new Date()): ClassProgress | null {
  /* En dash in practice, but hyphen and em dash cost nothing to accept. */
  const parts = time.split(/\s*[–—-]\s*/);
  if (parts.length !== 2) return null;

  const start = parseClockTime(parts[0]);
  const end = parseClockTime(parts[1]);
  if (start === null || end === null) return null;

  /* A slot that ends when it starts is bad data, not a twenty-four hour
     class — it has to be caught before the midnight wrap below reads it as
     one. */
  if (end === start) return null;
  /* An end before a start ran through midnight. */
  const total = end > start ? end - start : end + 24 * 60 - start;

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const elapsed = Math.max(0, Math.min(total, minutesNow - start));
  return { elapsed, total, fraction: elapsed / total };
}

/** How close to the end a class counts as "ending soon". */
export const ENDING_SOON_MINUTES = 15;

/**
 * Minutes left in a class that has started and not yet ended, when that is
 * `ENDING_SOON_MINUTES` or fewer; otherwise null.
 */
export function endingSoon(time: string, now = new Date()): number | null {
  const p = classProgress(time, now);
  if (!p || p.elapsed <= 0) return null;
  const left = p.total - p.elapsed;
  return left > 0 && left <= ENDING_SOON_MINUTES ? left : null;
}

/**
 * Whether a class's slot has run out, by the wall clock — not by whatever
 * `session_status` the desk last set.
 *
 * A class stays `Ongoing` in the database until someone marks it otherwise;
 * nothing does that automatically. Editing has to stop the moment the clock
 * says the lesson is over regardless, or the desk can add a latecomer, extend
 * the length, or cancel a class that finished an hour ago. False on
 * unparseable input — a card that cannot read the time should not lock
 * editing on data it does not understand.
 */
export function hasClassEnded(time: string, now = new Date()): boolean {
  const progress = classProgress(time, now);
  return progress !== null && progress.fraction >= 1;
}

/**
 * Whether a class's start has been reached, by the wall clock. A class made
 * for later today sat as `Ongoing` from the moment it was created, so a
 * 1:00 AM class read as running at half past midnight. True on unparseable
 * input, which keeps the old reading rather than hiding a running class.
 */
export function hasClassStarted(time: string, now = new Date()): boolean {
  const start = parseClockTime(time.split(/\s*[–—-]\s*/)[0] ?? "");
  if (start === null) return true;
  return now.getHours() * 60 + now.getMinutes() >= start;
}

/**
 * Whether a stored session is over: an earlier day, a Completed status, or
 * today with its "HH:MM" end already passed. What Class History uses to stop
 * a finished class being edited, the same line the dashboard draws.
 */
export function sessionFinished(
  day: string,
  endClock: string,
  status: string,
  now: Date,
  today: string,
): boolean {
  if (status === "Completed") return true;
  if (day < today) return true;
  if (day > today) return false;
  const m = /^(\d{1,2}):(\d{2})/.exec(endClock);
  if (!m) return false;
  return now.getHours() * 60 + now.getMinutes() >= Number(m[1]) * 60 + Number(m[2]);
}

/**
 * The wall clock, to the minute.
 *
 * The dashboard is the screen that stays open all day, so anything computed
 * from `now` at mount — a progress bar, an editable-until check — is wrong
 * within the hour if it never re-reads the clock.
 */
export function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    /* Aligned to the next minute boundary rather than every 60s from mount,
       so every reader of this hook turns over together. */
    let interval: ReturnType<typeof setInterval>;
    const timeout = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);
  return now;
}

/**
 * What a class's status should read as right now, which is not always what
 * the database says. `session_status` stays `Ongoing` until someone sets it
 * otherwise, so a class the clock says has ended still reads `Ongoing` until
 * the desk notices — and a class on another day is simply over, or not yet
 * begun. Every reader of a class's status (the card's chip, the filter pills,
 * the panel's edit gate) goes through this, so they cannot disagree.
 */
export function classStatusNow(
  def: { status: "Ongoing" | "Finished" | "Scheduled" | "Cancelled"; time: string; date?: string },
  now: Date,
  today: string,
): "Ongoing" | "Finished" | "Scheduled" | "Cancelled" {
  /* Called off stays called off, whatever the clock says. */
  if (def.status === "Cancelled") return "Cancelled";
  if (def.status === "Finished") return "Finished";
  if (def.date && def.date < today) return "Finished";
  if (def.date && def.date > today) return "Scheduled";
  if (hasClassEnded(def.time, now)) return "Finished";
  /* Before its start a class is Scheduled, whenever it was created. */
  return hasClassStarted(def.time, now) ? "Ongoing" : "Scheduled";
}
