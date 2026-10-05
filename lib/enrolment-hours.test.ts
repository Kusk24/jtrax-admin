import { describe, expect, it } from "vitest";
import { hoursJoined } from "./enrolment-stats";

const raw = {
  classSessions: [
    { session_id: "a", class_id: "beg", session_date: "2026-10-05", start_time: "10:00", end_time: "12:00" },
    { session_id: "b", class_id: "beg", session_date: "2026-10-06", start_time: "10:00", end_time: "11:30" },
    { session_id: "c", class_id: "other", session_date: "2026-10-06", start_time: "13:00", end_time: "15:00" },
  ],
  attendance: [
    { student_id: "s1", session_id: "a", check_in_time: "2026-10-05T02:50:00Z", check_out_time: "2026-10-05T05:10:00Z" },
    // 10:30 – 11:00 Bangkok: half an hour.
    { student_id: "s1", session_id: "b", check_in_time: "2026-10-06T03:30:00Z", check_out_time: "2026-10-06T04:00:00Z" },
    { student_id: "s1", session_id: "c", check_in_time: "2026-10-06T06:00:00Z" },
    { student_id: "s2", session_id: "a", check_in_time: "2026-10-05T03:00:00Z" },
  ],
};

describe("hoursJoined", () => {
  it("adds up the time in this course's classes only", () => {
    expect(hoursJoined(raw, "s1", "beg")).toBe(2.5);
    expect(hoursJoined(raw, "s1", "other")).toBe(2);
    expect(hoursJoined(raw, "s2", "beg")).toBe(2);
  });
});
