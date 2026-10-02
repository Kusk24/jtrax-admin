import { describe, expect, it } from "vitest";
import { busyStudents } from "./class-clash";

const raw = {
  classes: [
    { class_id: "c1", name: "King Slayer" },
    { class_id: "c2", name: "Summer Challenger" },
  ],
  classSessions: [
    { session_id: "s1", class_id: "c1", session_date: "2026-09-28", start_time: "10:00", end_time: "12:00" },
    { session_id: "s2", class_id: "c2", session_date: "2026-09-28", start_time: "11:00", end_time: "12:00" },
    { session_id: "s3", class_id: "c1", session_date: "2026-09-29", start_time: "10:00", end_time: "12:00" },
  ],
  attendance: [
    { student_id: "mini", session_id: "s1" },
    { student_id: "tom", session_id: "s3" },
  ],
};

describe("busyStudents", () => {
  it("names the class a student is already in at an overlapping time", () => {
    expect(busyStudents(raw, "2026-09-28", "11:00", "12:00").get("mini")).toBe("King Slayer");
  });
  it("does not count classes that only touch", () => {
    expect(busyStudents(raw, "2026-09-28", "12:00", "13:00").has("mini")).toBe(false);
    expect(busyStudents(raw, "2026-09-28", "09:00", "10:00").has("mini")).toBe(false);
  });
  it("ignores other days", () => {
    expect(busyStudents(raw, "2026-09-28", "10:00", "12:00").has("tom")).toBe(false);
  });
  it("frees a student who has checked out", () => {
    const left = { ...raw, attendance: [{ student_id: "mini", session_id: "s1", check_out_time: "2026-09-28T04:00:00Z" }] };
    expect(busyStudents(left, "2026-09-28", "11:00", "12:00").has("mini")).toBe(false);
  });
  it("never clashes a session with itself", () => {
    expect(busyStudents(raw, "2026-09-28", "10:00", "12:00", "s1").has("mini")).toBe(false);
  });
});
