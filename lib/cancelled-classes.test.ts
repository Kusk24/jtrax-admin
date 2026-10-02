import { describe, expect, it } from "vitest";
import { classStatusNow } from "./class-progress";
import { toCancelledClasses, type LiveCollections } from "./live";

const base = {
  students: [], parents: [], parentContacts: [], studentParents: [], attendance: [], enrollments: [],
  creditTransactions: [], creditPackages: [], payments: [], teachers: [], admins: [], accounts: [],
  announcements: [], tournaments: [], tournamentCategories: [], tournamentRegistrations: [],
  practiceActivities: [], systemConfig: [], classSessions: [],
  classes: [{ class_id: "c1", name: "Summer Challenger", class_type: "Group" }],
  cancelledSessions: [
    { session_id: "s1", class_id: "c1", session_date: "2026-09-28", start_time: "11:00", end_time: "12:00", cancelled_at: "2026-09-28T02:00:00Z" },
    { session_id: "s2", class_id: "c1", session_date: "2026-09-29", start_time: "11:00", end_time: "12:00", cancelled_at: "2026-09-28T02:00:00Z" },
  ],
} as unknown as LiveCollections;

describe("cancelled classes", () => {
  it("lists only the day's cancelled sessions, marked Cancelled", () => {
    const cards = toCancelledClasses(base, "2026-09-28");
    expect(cards.map((c) => [c.id, c.name, c.status])).toEqual([["s1", "Summer Challenger", "Cancelled"]]);
  });
  it("stays Cancelled whatever the clock says", () => {
    const [card] = toCancelledClasses(base, "2026-09-28");
    expect(classStatusNow(card, new Date("2026-09-28T23:00:00"), "2026-09-28")).toBe("Cancelled");
    expect(classStatusNow(card, new Date("2026-09-30T10:00:00"), "2026-09-30")).toBe("Cancelled");
  });
  it("is empty when nothing was cancelled", () => {
    expect(toCancelledClasses({ ...base, cancelledSessions: undefined }, "2026-09-28")).toEqual([]);
  });
});
