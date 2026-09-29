/**
 * One student, one class at a time.
 *
 * A child in King Slayer from 10:00 to 12:00 cannot also sit in Summer
 * Challenger from 11:00 to 12:00. The desk still sees them in the list — so
 * nobody wonders where the child went — but greyed out, with the class they
 * are already in. The backend refuses the same clash
 * (refuseClashingAttendance), so this is the explanation, not the only guard.
 */

import type { Row } from "./live";

type ClashSource = { classSessions?: Row[]; attendance?: Row[]; classes?: Row[] };

/**
 * Every student already in another session that overlaps `start`–`end` on
 * `day`, mapped to the name of that class. Sessions that only touch (one ends
 * at 12:00, the next starts at 12:00) do not clash. `exceptSession` is the
 * session being looked at, which never clashes with itself.
 */
export function busyStudents(
  raw: ClashSource,
  day: string,
  start: string,
  end: string,
  exceptSession?: string,
): Map<string, string> {
  const busy = new Map<string, string>();
  if (!start || !end || start >= end) return busy;

  const className = new Map((raw.classes ?? []).map((c) => [String(c.class_id), String(c.name ?? "")]));
  const overlapping = new Map<string, string>();
  for (const s of raw.classSessions ?? []) {
    const id = String(s.session_id);
    if (id === exceptSession || String(s.session_date ?? "") !== day) continue;
    const from = String(s.start_time ?? "");
    const to = String(s.end_time ?? "");
    if (from && to && from < end && start < to) {
      overlapping.set(id, className.get(String(s.class_id)) ?? "");
    }
  }
  if (overlapping.size === 0) return busy;

  for (const a of raw.attendance ?? []) {
    /* Checked out: that class is over for them, so it holds nobody. */
    if (a.check_out_time) continue;
    const name = overlapping.get(String(a.session_id));
    const student = String(a.student_id ?? "");
    if (name !== undefined && student && !busy.has(student)) busy.set(student, name);
  }
  return busy;
}
