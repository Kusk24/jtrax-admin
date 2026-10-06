import { describe, expect, it } from "vitest";
import { toCheckins, type LiveCollections } from "./live";

const day = "2026-10-06";
const base = {
  students: [{ student_id: "mini", name: "Mini" }],
  classes: [
    { class_id: "starters", name: "JCA Starters", class_type: "Group" },
    { class_id: "nxt", name: "JCA NXT", class_type: "Private" },
  ],
  classSessions: [
    { session_id: "s1", class_id: "starters", session_date: day, start_time: "16:55", end_time: "18:55" },
    { session_id: "s2", class_id: "nxt", session_date: day, start_time: "02:00", end_time: "03:00" },
  ],
  enrollments: [
    { enrollment_id: "e_nxt", student_id: "mini", class_id: "nxt", status: "Active" },
    { enrollment_id: "e_st", student_id: "mini", class_id: "starters", status: "Active" },
  ],
  attendance: [
    { attendance_id: "a1", student_id: "mini", session_id: "s1", check_in_time: `${day}T09:58:00Z` },
    { attendance_id: "a2", student_id: "mini", session_id: "s2", check_in_time: `${day}T19:54:00Z`, check_out_time: `${day}T20:56:00Z` },
  ],
  creditTransactions: [
    { credit_transaction_id: "t1", enrollment_id: "e_st", amount: 20 },
    { credit_transaction_id: "t2", enrollment_id: "e_st", amount: -1.5, attendance_id: "a1" },
    { credit_transaction_id: "t3", enrollment_id: "e_nxt", amount: 10 },
    { credit_transaction_id: "t4", enrollment_id: "e_nxt", amount: -1, attendance_id: "a2" },
  ],
} as unknown as LiveCollections;

describe("a check-in row's credit", () => {
  const rows = toCheckins(base, day);
  const of = (cls: string) => rows.find((r) => r.class === cls)!;

  it("is the balance of the class's own course, not the child's first", () => {
    expect(of("JCA Starters").credit).toBe(18.5);
    expect(of("JCA NXT").credit).toBe(9);
  });

  it("carries what today's class costs", () => {
    expect(of("JCA Starters").charge).toBe(1.5);
    expect(of("JCA NXT").charge).toBe(1);
  });
});
