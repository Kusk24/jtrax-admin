/**
 * A class is over once everyone who came has checked out — whatever the
 * timetable said about its end.
 */
import { describe, expect, it } from "vitest";
import { fmtSessionTime, toTodaysClasses, type LiveCollections } from "./live";

const DAY = "2026-09-27";

function collections(attendance: Record<string, unknown>[]): LiveCollections {
  const empty: Record<string, unknown>[] = [];
  return {
    students: [
      { student_id: "mini", name: "Mini" },
      { student_id: "boon", name: "Boon" },
    ],
    parents: empty, parentContacts: empty, studentParents: empty,
    classes: [{ class_id: "cls", name: "Master", class_type: "Master" }],
    classSessions: [
      { session_id: "ses", class_id: "cls", session_date: DAY, start_time: "15:00", end_time: "17:00", session_status: "Ongoing" },
    ],
    attendance,
    enrollments: empty, creditTransactions: empty, creditPackages: empty, payments: empty,
    teachers: empty, admins: empty, accounts: empty, announcements: empty, tournaments: empty,
    tournamentCategories: empty, tournamentRegistrations: empty, practiceActivities: empty, systemConfig: empty,
  };
}

const visit = (student: string, out: string | null) => ({
  attendance_id: `a_${student}`, student_id: student, session_id: "ses",
  check_in_time: "2026-09-27T08:00:00Z", check_out_time: out,
});

const statusOf = (attendance: Record<string, unknown>[]) => toTodaysClasses(collections(attendance), DAY)[0].status;

describe("a class's status from who is still in it", () => {
  it("is Finished once every student has checked out", () => {
    expect(statusOf([visit("mini", "2026-09-27T09:00:00Z"), visit("boon", "2026-09-27T09:30:00Z")])).toBe("Finished");
  });

  it("stays Ongoing while anyone is still in the room", () => {
    expect(statusOf([visit("mini", "2026-09-27T09:00:00Z"), visit("boon", null)])).toBe("Ongoing");
  });

  it("stays Ongoing with nobody checked in yet — an empty room has not ended", () => {
    expect(statusOf([])).toBe("Ongoing");
  });
});

describe("fmtSessionTime", () => {
  it("names the half of the day once when both ends share it", () => {
    expect(fmtSessionTime("15:00", "17:00")).toBe("3:00–5:00 PM");
  });

  it("names both when the class crosses noon", () => {
    expect(fmtSessionTime("11:30", "13:00")).toBe("11:30 AM–1:00 PM");
  });
});

describe("the order of a day's classes", () => {
  it("puts the latest start first, by the clock rather than the display text", () => {
    const c = collections([]);
    c.classSessions = [
      { session_id: "a", class_id: "cls", session_date: DAY, start_time: "09:00", end_time: "10:00" },
      { session_id: "b", class_id: "cls", session_date: DAY, start_time: "13:30", end_time: "14:45" },
      { session_id: "c", class_id: "cls", session_date: DAY, start_time: "15:00", end_time: "17:00" },
    ];
    expect(toTodaysClasses(c, DAY).map((d) => d.id)).toEqual(["c", "b", "a"]);
  });
});
