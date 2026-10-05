/**
 * How a class charge was worked out, for the Credits tab's detail: the same
 * rule the backend charges by (credits.go attendedHours). A visit costs the
 * part of the class the student was there for — from when they arrived (or
 * the class began) to when they left (or the class ended) — rounded to the
 * academy's step, never more than the whole class.
 */

/** A stored time as a moment: one with a zone as given, one without in Bangkok time. */
function moment(raw: string): number {
  const v = raw.trim().replace(" ", "T");
  if (!v) return NaN;
  return new Date(/([zZ]|[+-]\d{2}:?\d{2})$/.test(v) ? v : `${v}+07:00`).getTime();
}

function at(day: string, clock: string): number {
  return new Date(`${day.slice(0, 10)}T${clock.slice(0, 5)}:00+07:00`).getTime();
}

/** "10:30" in Bangkok time. */
export function bangkokClock(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok",
  }).format(new Date(ms));
}

export type ChargeExplanation = {
  classStart: string;
  classEnd: string;
  classMinutes: number;
  checkIn: string;
  /** "" while still checked in. */
  checkOut: string;
  /** Minutes after the start they arrived; 0 when on time. */
  lateMinutes: number;
  /** Minutes before the end they left; 0 when they stayed. */
  earlyMinutes: number;
  /** The span charged for. */
  from: string;
  to: string;
  attendedMinutes: number;
  /** After rounding to the step (the full class when nothing was cut short). */
  chargedMinutes: number;
  stepMinutes: number;
  /** chargedMinutes / 60 — the credits this rule gives. */
  credits: number;
};

export function explainCharge(opts: {
  sessionDate: string;
  startTime: string;
  endTime: string;
  checkIn: string;
  checkOut: string;
  stepMinutes: number;
}): ChargeExplanation | null {
  const begin = at(opts.sessionDate, opts.startTime);
  const end = at(opts.sessionDate, opts.endTime);
  if (Number.isNaN(begin) || Number.isNaN(end) || end <= begin) return null;
  const arrived = moment(opts.checkIn);
  const left = moment(opts.checkOut);
  const from = Number.isNaN(arrived) ? begin : Math.max(begin, arrived);
  const to = Number.isNaN(left) ? end : Math.min(end, left);
  const classMinutes = Math.round((end - begin) / 60000);
  const attendedMinutes = Math.max(0, Math.round((to - from) / 60000));
  const whole = from === begin && to === end;
  let charged = attendedMinutes;
  if (!whole && opts.stepMinutes > 0) charged = Math.round(attendedMinutes / opts.stepMinutes) * opts.stepMinutes;
  charged = Math.min(charged, classMinutes);
  return {
    classStart: opts.startTime.slice(0, 5),
    classEnd: opts.endTime.slice(0, 5),
    classMinutes,
    checkIn: Number.isNaN(arrived) ? "" : bangkokClock(arrived),
    checkOut: Number.isNaN(left) ? "" : bangkokClock(left),
    lateMinutes: Math.max(0, Math.round((from - begin) / 60000)),
    earlyMinutes: Math.max(0, Math.round((end - to) / 60000)),
    from: bangkokClock(from),
    to: bangkokClock(to),
    attendedMinutes,
    chargedMinutes: charged,
    stepMinutes: opts.stepMinutes,
    credits: Math.round((charged / 60) * 100) / 100,
  };
}

/** "1 h 15 min", "45 min", "2 h". */
export function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} h ${m} min`;
  return h ? `${h} h` : `${m} min`;
}
