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

/**
 * Hours of this course the child has attended — what the office reads
 * against the certificate milestone (`certificate_hours`). They are the
 * credits charged for the course's classes (one credit is one hour), so the
 * hours and the credits used never disagree: an early leave rounded at
 * check-out moves both alike. Only class charges count — a top-up, a desk
 * adjustment or a transfer is not time in class — and a visit nothing was
 * charged for adds nothing. The backend counts certificate hours the same way.
 */
export function hoursJoined(
  raw: { creditTransactions?: Row[]; enrollments?: Row[]; deletedEnrollments?: Row[] },
  studentId: string,
  classId: string,
): number {
  const enrolments = new Set(
    [...(raw.enrollments ?? []), ...(raw.deletedEnrollments ?? [])]
      .filter((e) => s(e, "student_id") === studentId && s(e, "class_id") === classId)
      .map((e) => s(e, "enrollment_id")),
  );
  let used = 0;
  for (const tx of raw.creditTransactions ?? []) {
    if (s(tx, "transaction_type") !== "consumption" || s(tx, "attendance_id") === "") continue;
    /* A course deleted from the child detaches its entries rather than
       removing them (StudentsPage's deleteEnrolment): no enrolment, but still
       their student and class, so the hours stay with the course. */
    const detachedHere =
      s(tx, "enrollment_id") === "" && s(tx, "student_id") === studentId && s(tx, "class_id") === classId;
    if (!enrolments.has(s(tx, "enrollment_id")) && !detachedHere) continue;
    used -= Number(tx.amount ?? 0);
  }
  return Math.max(0, Math.round(used * 100) / 100);
}
