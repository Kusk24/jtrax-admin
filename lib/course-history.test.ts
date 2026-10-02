/** What happened to each of a child's enrolments, as read off them. */
import { describe, expect, it } from "vitest";
import { byLatestEvent, enrolmentEvents, type HistoryEnrolment } from "./course-history";

const enr = (over: Partial<HistoryEnrolment>): HistoryEnrolment => ({
  id: "e", classId: "c", className: "C", status: "Active", enrolledDate: "2026-01-01",
  endedDate: "", movedFromClassId: "", movedFrom: "", ...over,
});

describe("enrolment events", () => {
  it("reads a move from both sides", () => {
    const events = enrolmentEvents([
      enr({ id: "e_beg", classId: "beg", className: "Beginner", status: "Withdrawn", enrolledDate: "2026-01-06", endedDate: "2026-09-12" }),
      enr({ id: "e_int", classId: "int", className: "Intermediate", enrolledDate: "2026-09-12", movedFromClassId: "beg", movedFrom: "Beginner" }),
    ]);
    expect(events.get("e_int")).toEqual({ kind: "movedFrom", date: "2026-09-12", other: "Beginner" });
    expect(events.get("e_beg")).toEqual({ kind: "movedTo", date: "2026-09-12", other: "Intermediate" });
  });

  it("dates a move by the new course's start when the old one has no end date", () => {
    const events = enrolmentEvents([
      enr({ id: "old", classId: "beg", className: "Beginner", status: "Withdrawn", enrolledDate: "2026-01-06" }),
      enr({ id: "new", classId: "int", className: "Intermediate", enrolledDate: "2026-09-12", movedFromClassId: "beg", movedFrom: "Beginner" }),
    ]);
    expect(events.get("old")).toEqual({ kind: "movedTo", date: "2026-09-12", other: "Intermediate" });
  });

  it("says a course was left, with its day when there is one", () => {
    const events = enrolmentEvents([
      enr({ id: "a", status: "Withdrawn", endedDate: "2026-08-30" }),
      enr({ id: "b", classId: "b", status: "Withdrawn" }),
      enr({ id: "c", classId: "k", enrolledDate: "2026-09-19" }),
    ]);
    expect(events.get("a")).toEqual({ kind: "left", date: "2026-08-30" });
    expect(events.get("b")).toEqual({ kind: "left", date: "" });
    expect(events.get("c")).toEqual({ kind: "joined", date: "2026-09-19" });
  });

  it("orders newest first by what last happened", () => {
    const list = [
      enr({ id: "joined-sep", classId: "k", enrolledDate: "2026-09-19" }),
      enr({ id: "left-aug", classId: "s", status: "Withdrawn", enrolledDate: "2026-05-01", endedDate: "2026-08-30" }),
      enr({ id: "left-undated", classId: "o", status: "Withdrawn", enrolledDate: "2025-05-01" }),
      enr({ id: "joined-jan", classId: "j", enrolledDate: "2026-01-06" }),
    ];
    expect(byLatestEvent(list, enrolmentEvents(list)).map((e) => e.id)).toEqual([
      "joined-sep",
      "left-aug",
      "joined-jan",
      "left-undated",
    ]);
  });
});
