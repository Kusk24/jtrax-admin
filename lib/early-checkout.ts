/**
 * What checking a student out right now would cost, when it is before the
 * class ends.
 *
 * The backend's `attendedHours` (credits.go) is the rule that actually charges;
 * this is the same arithmetic, run before the write so the desk can be told
 * the number and asked to confirm. The two must agree, so they are kept
 * deliberately literal: from arrival (or the class start, if they were early)
 * to now, rounded to the academy's step, never more than the whole class.
 */

type Row = Record<string, unknown>;

/* The academy's clock. Stored clock times ("14:00") and zone-less stamps are
   Bangkok wall time, the same reading the backend's academytime package
   gives them. */
const ACADEMY_OFFSET = "+07:00";

function moment(stamp: string): Date | null {
  if (!stamp) return null;
  const zoned = /(Z|[+-]\d\d:?\d\d)$/.test(stamp) ? stamp : `${stamp}${ACADEMY_OFFSET}`;
  const d = new Date(zoned);
  return Number.isNaN(d.getTime()) ? null : d;
}

function minutesBetweenClocks(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((v) => Number.isNaN(v))) return 0;
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

export type EarlyCheckout = {
  attendedMinutes: number;
  scheduledMinutes: number;
  credits: number;
};

/**
 * Null when checking out now is not early — the class has already ended, or
 * the row has nothing to measure against — so the caller checks out without
 * asking, and the full class is charged.
 */
export function earlyCheckout(
  attendance: Row,
  session: Row | undefined,
  now: Date,
  roundMinutes: number,
): EarlyCheckout | null {
  if (!session) return null;
  const date = String(session["session_date"] ?? "");
  const start = String(session["start_time"] ?? "");
  const begin = moment(`${date}T${start}:00`);
  if (!begin) return null;

  const stored = Number(session["duration_hours"]);
  const scheduledMinutes =
    Number.isFinite(stored) && stored > 0
      ? stored * 60
      : minutesBetweenClocks(start, String(session["end_time"] ?? ""));
  if (scheduledMinutes <= 0) return null;

  const end = new Date(begin.getTime() + scheduledMinutes * 60_000);
  if (now >= end) return null;

  const arrived = moment(String(attendance["check_in_time"] ?? ""));
  const from = arrived && arrived > begin ? arrived : begin;
  const attendedMinutes = Math.max(0, (now.getTime() - from.getTime()) / 60_000);
  const charged = roundMinutes > 0 ? Math.round(attendedMinutes / roundMinutes) * roundMinutes : attendedMinutes;

  return {
    attendedMinutes,
    scheduledMinutes,
    credits: Math.min(charged, scheduledMinutes) / 60,
  };
}
