/**
 * Two figures for a course on the student page: the credits the family last
 * had in full (the "50" in "20 / 50"), and how many classes the child has
 * joined in it.
 */
type Row = Record<string, unknown>;
const s = (r: Row | undefined, k: string) => String(r?.[k] ?? "");

/**
 * The balance right after the latest top-up — what the remaining credits count
 * down from. Not everything ever bought, which only grows. Entries carry a
 * day, not a time, so a top-up is taken to come before classes on that day.
 * Null when nothing was ever added.
 */
export function creditsSinceTopUp(txs: Row[]): number | null {
  const sorted = [...txs].sort((a, b) => {
    const day = s(a, "transaction_date").localeCompare(s(b, "transaction_date"));
    if (day !== 0) return day;
    return Number(b.amount ?? 0) - Number(a.amount ?? 0);
  });
  let balance = 0;
  let afterTopUp: number | null = null;
  for (const t of sorted) {
    const amount = Number(t.amount ?? 0);
    balance += amount;
    if (amount > 0) afterTopUp = balance;
  }
  return afterTopUp === null ? null : Math.round(afterTopUp * 100) / 100;
}

/** Classes of this course the child was checked in to. */
export function classesJoined(
  raw: { attendance?: Row[]; classSessions?: Row[] },
  studentId: string,
  classId: string,
): number {
  const sessions = new Set(
    (raw.classSessions ?? []).filter((x) => s(x, "class_id") === classId).map((x) => s(x, "session_id")),
  );
  return (raw.attendance ?? []).filter(
    (a) => s(a, "student_id") === studentId && sessions.has(s(a, "session_id")) && s(a, "check_in_time") !== "",
  ).length;
}

/** A stored time as a moment: one with a zone as given, one without in Bangkok time. */
function moment(raw: string): number {
  const v = raw.trim().replace(" ", "T");
  if (!v) return NaN;
  return new Date(/([zZ]|[+-]\d{2}:?\d{2})$/.test(v) ? v : `${v}+07:00`).getTime();
}

/**
 * Hours of this course the child has attended — what the office reads
 * against the certificate milestone (`certificate_hours`). Each visit counts
 * its time in the class: from arrival (or the start) to departure (or the
 * end), the span a class is charged for; still checked in counts to the end.
 */
export function hoursJoined(
  raw: { attendance?: Row[]; classSessions?: Row[] },
  studentId: string,
  classId: string,
): number {
  const sessions = new Map(
    (raw.classSessions ?? []).filter((x) => s(x, "class_id") === classId).map((x) => [s(x, "session_id"), x]),
  );
  let ms = 0;
  for (const a of raw.attendance ?? []) {
    if (s(a, "student_id") !== studentId || s(a, "check_in_time") === "") continue;
    const ses = sessions.get(s(a, "session_id"));
    if (!ses) continue;
    const day = s(ses, "session_date").slice(0, 10);
    const begin = new Date(`${day}T${s(ses, "start_time").slice(0, 5)}:00+07:00`).getTime();
    const end = new Date(`${day}T${s(ses, "end_time").slice(0, 5)}:00+07:00`).getTime();
    if (Number.isNaN(begin) || Number.isNaN(end) || end <= begin) continue;
    const arrived = moment(s(a, "check_in_time"));
    const left = moment(s(a, "check_out_time"));
    const from = Number.isNaN(arrived) ? begin : Math.max(begin, arrived);
    const to = Number.isNaN(left) ? end : Math.min(end, left);
    if (to > from) ms += to - from;
  }
  return Math.round((ms / 3_600_000) * 100) / 100;
}
