/**
 * The dashboard's week cards that come from data already loaded: classes this
 * week against last week, and how many students came.
 *
 * A week is Monday to Sunday. Cancelled classes are not in `classSessions`
 * (see DataProvider), so they never count.
 */
type Row = Record<string, unknown>;
type WeekSource = { classSessions?: Row[]; attendance?: Row[] };

/** Monday of the week containing `day` (YYYY-MM-DD), and the Sunday after. */
export function weekOf(day: string): { start: string; end: string } {
  const d = new Date(`${day}T00:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  const start = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + 6);
  return { start, end: d.toISOString().slice(0, 10) };
}

function shift(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function sessionsBetween(raw: WeekSource, start: string, end: string): Row[] {
  return (raw.classSessions ?? []).filter((s) => {
    const day = String(s.session_date ?? "");
    return day >= start && day <= end;
  });
}

export type ClassesThisWeek = {
  count: number;
  lastWeek: number;
  /** Change against last week, rounded; null when last week had none. */
  changePct: number | null;
};

export function classesThisWeek(raw: WeekSource, today: string): ClassesThisWeek {
  const { start, end } = weekOf(today);
  const count = sessionsBetween(raw, start, end).length;
  const lastWeek = sessionsBetween(raw, shift(start, -7), shift(end, -7)).length;
  const changePct = lastWeek === 0 ? null : Math.round(((count - lastWeek) / lastWeek) * 100);
  return { count, lastWeek, changePct };
}

/** Different students who attended a class this week. */
export function studentsAttendedThisWeek(raw: WeekSource, today: string): number {
  const { start, end } = weekOf(today);
  const ids = new Set(sessionsBetween(raw, start, end).map((s) => String(s.session_id)));
  const students = new Set(
    (raw.attendance ?? []).filter((a) => ids.has(String(a.session_id))).map((a) => String(a.student_id)),
  );
  return students.size;
}
