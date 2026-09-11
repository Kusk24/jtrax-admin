/**
 * The console's practice strip, and what counts as a day practised.
 *
 * It used to require `minutes_practiced > 0`. The backend records a solved
 * puzzle with minutes left at 0 — nothing measures how long a child sits with
 * a position, and inventing ten minutes would put a number in front of a
 * parent that nobody counted — so that test hid every real solve and drew an
 * empty strip for a pupil who had practised all week.
 */
import { describe, expect, it } from "vitest";
import { practiceStrip } from "./live";
import type { LiveCollections } from "./live";

const day = (back: number, now: Date) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function collections(rows: Record<string, unknown>[]): LiveCollections {
  return { practiceActivities: rows } as unknown as LiveCollections;
}

const NOW = new Date(2026, 8, 11);

describe("practiceStrip", () => {
  it("counts a day where puzzles were solved but no minutes were recorded", () => {
    const c = collections([
      { student_id: "stu_penny", activity_date: day(0, NOW), puzzles_completed: 3, minutes_practiced: 0 },
      { student_id: "stu_penny", activity_date: day(1, NOW), puzzles_completed: 1, minutes_practiced: 0 },
    ]);
    expect(practiceStrip(c, "stu_penny", NOW).streak).toBe(2);
  });

  it("still counts a day recorded only as minutes", () => {
    const c = collections([
      { student_id: "stu_penny", activity_date: day(0, NOW), puzzles_completed: 0, minutes_practiced: 20 },
    ]);
    expect(practiceStrip(c, "stu_penny", NOW).streak).toBe(1);
  });

  it("counts nothing for a row with neither", () => {
    const c = collections([
      { student_id: "stu_penny", activity_date: day(0, NOW), puzzles_completed: 0, minutes_practiced: 0 },
    ]);
    expect(practiceStrip(c, "stu_penny", NOW).streak).toBe(0);
  });

  it("stops at a gap and ignores another pupil's practice", () => {
    const c = collections([
      { student_id: "stu_penny", activity_date: day(0, NOW), puzzles_completed: 3, minutes_practiced: 0 },
      { student_id: "stu_penny", activity_date: day(2, NOW), puzzles_completed: 3, minutes_practiced: 0 },
      { student_id: "stu_uri", activity_date: day(1, NOW), puzzles_completed: 3, minutes_practiced: 0 },
    ]);
    expect(practiceStrip(c, "stu_penny", NOW).streak).toBe(1);
  });
});
