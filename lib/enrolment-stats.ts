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
