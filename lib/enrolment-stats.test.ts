import { describe, expect, it } from "vitest";
import { classesJoined, creditsSinceTopUp } from "./enrolment-stats";

const tx = (transaction_date: string, amount: number) => ({ transaction_date, amount });

describe("credits since the last top-up", () => {
  it("is the balance right after the latest purchase, not everything bought", () => {
    const txs = [tx("2026-08-01", 20), tx("2026-08-10", -15), tx("2026-09-01", 45), tx("2026-09-05", -2)];
    expect(creditsSinceTopUp(txs)).toBe(50);
  });

  it("counts a top-up before a class on the same day", () => {
    expect(creditsSinceTopUp([tx("2026-09-01", -2), tx("2026-09-01", 20)])).toBe(20);
  });

  it("is null with nothing ever added", () => {
    expect(creditsSinceTopUp([])).toBeNull();
  });
});

describe("classes joined", () => {
  const raw = {
    classSessions: [
      { session_id: "s1", class_id: "chess" },
      { session_id: "s2", class_id: "chess" },
      { session_id: "s3", class_id: "other" },
    ],
    attendance: [
      { student_id: "mini", session_id: "s1", check_in_time: "2026-09-01T02:00:00Z" },
      { student_id: "mini", session_id: "s2", check_in_time: "2026-09-08T02:00:00Z" },
      { student_id: "mini", session_id: "s3", check_in_time: "2026-09-09T02:00:00Z" },
      { student_id: "king", session_id: "s1", check_in_time: "2026-09-01T02:00:00Z" },
    ],
  };

  it("counts only this child's check-ins to this course", () => {
    expect(classesJoined(raw, "mini", "chess")).toBe(2);
  });

  it("is zero when the lists are missing", () => {
    expect(classesJoined({}, "mini", "chess")).toBe(0);
  });
});
