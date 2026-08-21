/**
 * Where a student stands at the front desk today, read from the database
 * rather than remembered in the page.
 *
 * The desk used to keep this in component state: the chip flipped to "Checked
 * in", the credit badge moved, and nothing was written — so the check-in table
 * beside it never saw the student, "Checked in today" never counted them, and
 * a refresh lost the lot. Attendance is the record, so attendance is what the
 * desk writes; every other view of today already reads it.
 *
 * One thing the database decides for us. `attendance` is a student *at a
 * session* — there is no row for "here, but not in a class yet", and inventing
 * one would mean a session-less attendance row, which is not a fact about
 * anything. So checking in and being in a class are the same act: three
 * states, not the four the desk's action matrix allows for.
 */
import type { DeskStatus } from "./desk-actions";

export type AttendanceRow = {
  attendanceId: string;
  studentId: string;
  sessionId: string;
  /** `check_out_time` is set: they have been walked out. */
  checkedOut: boolean;
};

/** One of today's class sessions. */
export type SessionRow = { sessionId: string; classId: string };

export type EnrolmentRow = { studentId: string; classId: string };

/** The row that says this student is at one of today's sessions, if any. */
export function todaysAttendance(
  rows: AttendanceRow[],
  sessions: SessionRow[],
  studentId: string,
): AttendanceRow | undefined {
  if (!studentId) return undefined;
  const today = new Set(sessions.map((s) => s.sessionId));
  return rows.find((r) => r.studentId === studentId && today.has(r.sessionId));
}

/** Which of the three states they are in — the input to the action matrix. */
export function deskStatusOf(
  rows: AttendanceRow[],
  sessions: SessionRow[],
  studentId: string,
): DeskStatus {
  const row = todaysAttendance(rows, sessions, studentId);
  if (!row) return "none";
  return row.checkedOut ? "dismissed" : "in_class";
}

/**
 * Today's sessions this student could be checked in to: the ones for classes
 * they are enrolled in.
 *
 * Falls back to every session running today when they are enrolled in none — a
 * child standing at the desk has to be recordable whatever the paperwork says,
 * and refusing to check them in because their enrolment lapsed would send the
 * receptionist to a different screen mid-queue.
 */
export function candidateSessions(
  sessions: SessionRow[],
  enrolments: EnrolmentRow[],
  studentId: string,
): SessionRow[] {
  const mine = enrolments.filter((e) => e.studentId === studentId).map((e) => e.classId);
  const theirs = sessions.filter((s) => mine.includes(s.classId));
  return theirs.length > 0 ? theirs : sessions;
}

/**
 * What pressing Check In should do.
 *
 * Exactly one candidate and there is nothing to ask, so it is written at once.
 * Several, and the desk has to say which — pressing the button opens the
 * picker rather than guessing, because the wrong class is a wrong attendance
 * record for a real child. None, and there is nothing running today to check
 * anyone in to.
 */
export function checkInIntent(
  sessions: SessionRow[],
  enrolments: EnrolmentRow[],
  studentId: string,
): { kind: "write"; sessionId: string } | { kind: "ask" } | { kind: "noSessions" } {
  const options = candidateSessions(sessions, enrolments, studentId);
  if (options.length === 0) return { kind: "noSessions" };
  if (options.length === 1) return { kind: "write", sessionId: options[0].sessionId };
  return { kind: "ask" };
}
