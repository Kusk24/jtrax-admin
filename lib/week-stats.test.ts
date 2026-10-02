import { describe, expect, it } from "vitest";
import { classesThisWeek, studentsAttendedThisWeek, weekOf } from "./week-stats";

describe("weekOf", () => {
  it("runs Monday to Sunday", () => {
    expect(weekOf("2026-09-29")).toEqual({ start: "2026-09-28", end: "2026-10-04" }); // a Tuesday
    expect(weekOf("2026-10-04")).toEqual({ start: "2026-09-28", end: "2026-10-04" }); // Sunday
  });
});

const raw = {
  classSessions: [
    { session_id: "a", session_date: "2026-09-28" },
    { session_id: "b", session_date: "2026-09-30" },
    { session_id: "c", session_date: "2026-10-03" },
    { session_id: "d", session_date: "2026-09-22" }, // last week
    { session_id: "e", session_date: "2026-09-26" }, // last week
  ],
  attendance: [
    { session_id: "a", student_id: "mini" },
    { session_id: "b", student_id: "mini" },
    { session_id: "b", student_id: "uri" },
    { session_id: "d", student_id: "penny" },
  ],
};

describe("classesThisWeek", () => {
  it("counts this week against last, as a percentage", () => {
    expect(classesThisWeek(raw, "2026-09-29")).toEqual({ count: 3, lastWeek: 2, changePct: 50 });
  });
  it("has no percentage when last week had no classes", () => {
    expect(classesThisWeek({ classSessions: [{ session_id: "a", session_date: "2026-09-28" }] }, "2026-09-29").changePct).toBeNull();
  });
});

describe("studentsAttendedThisWeek", () => {
  it("counts each student once", () => {
    expect(studentsAttendedThisWeek(raw, "2026-09-29")).toBe(2);
  });
});
