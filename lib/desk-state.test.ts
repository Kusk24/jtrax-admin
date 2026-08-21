import { describe, expect, it } from "vitest";
import {
  candidateSessions,
  checkInIntent,
  deskStatusOf,
  todaysAttendance,
  type AttendanceRow,
  type EnrolmentRow,
  type SessionRow,
} from "./desk-state";

/* Two sessions today: Group at 10, Master at 14. */
const SESSIONS: SessionRow[] = [
  { sessionId: "ses_group", classId: "cls_group" },
  { sessionId: "ses_master", classId: "cls_master" },
];

const ENROLMENTS: EnrolmentRow[] = [
  { studentId: "anong", classId: "cls_group" },
  { studentId: "boon", classId: "cls_group" },
  { studentId: "boon", classId: "cls_master" },
  // "chai" is enrolled in nothing.
];

const rows = (...rs: Partial<AttendanceRow>[]): AttendanceRow[] =>
  rs.map((r, i) => ({
    attendanceId: `att_${i}`,
    studentId: "anong",
    sessionId: "ses_group",
    checkedOut: false,
    ...r,
  }));

describe("where a student stands today", () => {
  it("is 'none' with no attendance row", () => {
    expect(deskStatusOf([], SESSIONS, "anong")).toBe("none");
  });

  it("is 'in_class' once checked in", () => {
    expect(deskStatusOf(rows({}), SESSIONS, "anong")).toBe("in_class");
  });

  it("is 'dismissed' once walked out", () => {
    expect(deskStatusOf(rows({ checkedOut: true }), SESSIONS, "anong")).toBe("dismissed");
  });
});

describe("yesterday's attendance is not today's", () => {
  it("ignores a row for a session that is not running today", () => {
    const old = rows({ sessionId: "ses_last_week" });
    expect(todaysAttendance(old, SESSIONS, "anong")).toBeUndefined();
    expect(deskStatusOf(old, SESSIONS, "anong")).toBe("none");
  });
});

describe("which class to check them in to", () => {
  it("is the one they are enrolled in", () => {
    expect(candidateSessions(SESSIONS, ENROLMENTS, "anong").map((s) => s.sessionId)).toEqual([
      "ses_group",
    ]);
  });

  it("is all of them when they are enrolled in several", () => {
    expect(candidateSessions(SESSIONS, ENROLMENTS, "boon")).toHaveLength(2);
  });

  /* No fallback to "everything running today". Credits hang off an enrolment,
     so checking a child into a class they do not belong to records an hour
     that either comes off a class they did not attend or off nothing at all.
     An unenrolled child is an enrolment problem, fixed on their own page. */
  it("is nothing when they are enrolled in nothing", () => {
    expect(candidateSessions(SESSIONS, ENROLMENTS, "chai")).toEqual([]);
  });

  it("never offers a class they are not enrolled in", () => {
    const offered = candidateSessions(SESSIONS, ENROLMENTS, "anong").map((s) => s.sessionId);
    expect(offered).not.toContain("ses_master");
  });
});

describe("what pressing Check In does", () => {
  it("writes at once when there is only one candidate", () => {
    expect(checkInIntent(SESSIONS, ENROLMENTS, "anong")).toEqual({
      kind: "write",
      sessionId: "ses_group",
    });
  });

  it("asks when there is more than one", () => {
    expect(checkInIntent(SESSIONS, ENROLMENTS, "boon")).toEqual({ kind: "ask" });
  });

  it("reports that nothing is running when no session is scheduled", () => {
    expect(checkInIntent([], ENROLMENTS, "anong")).toEqual({ kind: "noSessions" });
  });

  /* Sessions are running, just none of theirs — the desk must not check them
     into somebody else's class to get past it. */
  it("reports the same when none of today's classes are theirs", () => {
    expect(checkInIntent(SESSIONS, ENROLMENTS, "chai")).toEqual({ kind: "noSessions" });
  });
});
