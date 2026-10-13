import { describe, expect, it } from "vitest";
import { hoursJoined } from "./enrolment-stats";

/* Hours are the credits charged for the course's classes. */
const raw = {
  enrollments: [
    { enrollment_id: "e1", student_id: "s1", class_id: "beg" },
    { enrollment_id: "e2", student_id: "s1", class_id: "other" },
    { enrollment_id: "e3", student_id: "s2", class_id: "beg" },
  ],
  deletedEnrollments: [{ enrollment_id: "e0", student_id: "s1", class_id: "beg" }],
  creditTransactions: [
    { enrollment_id: "e1", transaction_type: "purchase", amount: 25 },
    { enrollment_id: "e1", transaction_type: "consumption", amount: -2, attendance_id: "a1" },
    // An early leave, rounded at check-out: 1.25 credits, so 1 h 15 min.
    { enrollment_id: "e1", transaction_type: "consumption", amount: -1.25, attendance_id: "a2" },
    // A desk correction is not time in class.
    { enrollment_id: "e1", transaction_type: "manual_adjustment", amount: -3 },
    // A course left and deleted still counts what it charged.
    { enrollment_id: "e0", transaction_type: "consumption", amount: -1, attendance_id: "a0" },
    { enrollment_id: "e2", transaction_type: "consumption", amount: -2, attendance_id: "a3" },
    { enrollment_id: "e3", transaction_type: "consumption", amount: -1.5, attendance_id: "a4" },
  ],
};

describe("hoursJoined", () => {
  it("adds up the class charges of this course only", () => {
    expect(hoursJoined(raw, "s1", "beg")).toBe(4.25);
    expect(hoursJoined(raw, "s1", "other")).toBe(2);
    expect(hoursJoined(raw, "s2", "beg")).toBe(1.5);
  });

  it("is 0 where nothing was charged", () => {
    expect(hoursJoined(raw, "s2", "other")).toBe(0);
    expect(hoursJoined({}, "s1", "beg")).toBe(0);
  });
});
