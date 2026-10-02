/**
 * The Practice tab's numbers. The streak is counted the way the student app
 * counts it, so the office and the child never see two different flames.
 */
import { describe, expect, it } from "vitest";
import {
  currentStreak,
  level,
  minutesBetween,
  monthWeeks,
  overallTotals,
  practiceByDay,
  recentActivity,
  totalsOver,
  weeklyProgress,
  type HistoryEntry,
} from "./practice";

const act = (day: string, puzzles: number, minutes = 0) => ({
  student_id: "stu_mini",
  activity_date: day,
  puzzles_completed: puzzles,
  minutes_practiced: minutes,
});

describe("the streak", () => {
  it("counts back from today", () => {
    const days = practiceByDay([act("2026-09-27", 2), act("2026-09-26", 1), act("2026-09-25", 3)], [], "stu_mini");
    expect(currentStreak(days, "2026-09-27")).toBe(3);
  });

  it("keeps yesterday's run when today has not been practised yet", () => {
    const days = practiceByDay([act("2026-09-26", 1), act("2026-09-25", 3)], [], "stu_mini");
    expect(currentStreak(days, "2026-09-27")).toBe(2);
  });

  it("breaks on a missed day", () => {
    const days = practiceByDay([act("2026-09-27", 1), act("2026-09-25", 3)], [], "stu_mini");
    expect(currentStreak(days, "2026-09-27")).toBe(1);
    expect(currentStreak(days, "2026-09-29")).toBe(0);
  });

  it("counts a day of puzzles with no minutes recorded", () => {
    const days = practiceByDay([act("2026-09-27", 3, 0)], [], "stu_mini");
    expect(currentStreak(days, "2026-09-27")).toBe(1);
  });

  it("ignores other students' practice", () => {
    const days = practiceByDay([{ ...act("2026-09-27", 3), student_id: "stu_other" }], [], "stu_mini");
    expect(currentStreak(days, "2026-09-27")).toBe(0);
  });
});

const game = (day: string, at: string, startedAt?: string): HistoryEntry => ({
  kind: "solo", id: `g-${at}`, at, day, startedAt, against: "novice", moves: 20,
});
const puzzle = (day: string, source: "daily" | "free", solved: boolean, at = `${day} 03:00:00`, startedAt?: string): HistoryEntry => ({
  kind: "puzzle", id: `p-${day}-${source}-${at}`, at, day, source, startedAt, against: "1200", result: solved ? "solved" : "unsolved",
});

describe("each day", () => {
  it("adds games and their length to the puzzles", () => {
    const days = practiceByDay(
      [act("2026-09-27", 2, 10)],
      [game("2026-09-27", "2026-09-27 03:25:00", "2026-09-27T03:00:00Z")],
      "stu_mini",
    );
    expect(days.get("2026-09-27")).toMatchObject({ puzzles: 2, minutes: 10, games: 1, gameMinutes: 25 });
  });

  it("marks the daily challenge done only when every daily puzzle was solved", () => {
    const history = [
      puzzle("2026-09-27", "daily", true),
      puzzle("2026-09-27", "daily", true, "2026-09-27 03:10:00"),
      puzzle("2026-09-26", "daily", true),
      puzzle("2026-09-26", "daily", false, "2026-09-26 03:10:00"),
    ];
    const days = practiceByDay([], history, "stu_mini");
    expect(days.get("2026-09-27")?.dailyDone).toBe(true);
    expect(days.get("2026-09-26")?.dailyDone ?? false).toBe(false);
  });
});

describe("the totals", () => {
  it("sum a run of days", () => {
    const days = practiceByDay([act("2026-09-27", 6), act("2026-09-21", 4), act("2026-09-19", 5)], [], "stu_mini");
    expect(totalsOver(days, "2026-09-27", 7).puzzles).toBe(10);
    expect(totalsOver(days, "2026-09-20", 7).puzzles).toBe(5);
  });

  it("add up everything on record", () => {
    const days = practiceByDay(
      [act("2026-09-27", 6, 20), act("2025-01-05", 4, 10)],
      [game("2026-09-26", "2026-09-26 10:00:00", "2026-09-26T09:30:00Z")],
      "stu_mini",
    );
    expect(overallTotals(days)).toEqual({ puzzles: 10, minutes: 60, games: 1 });
  });
});

describe("the heatmap", () => {
  it("shades 1–2, 3–5 and 6+", () => {
    expect([0, 1, 2, 3, 5, 6, 12].map(level)).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });

  it("lays a month out in Monday-first weeks", () => {
    const weeks = monthWeeks(2026, 8); // September 2026 starts on a Tuesday
    expect(weeks[0]).toEqual([null, "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06"]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });
});

describe("weekly progress", () => {
  it("ends on the current Monday-to-Sunday week", () => {
    const days = practiceByDay([act("2026-09-23", 4), act("2026-09-15", 2)], [], "stu_mini");
    const weeks = weeklyProgress(days, 4, "2026-09-27");
    expect(weeks.map((w) => w.start)).toEqual(["2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21"]);
    expect(weeks.at(-1)).toMatchObject({ end: "2026-09-27", puzzles: 4 });
    expect(weeks[2].puzzles).toBe(2);
  });
});

describe("recent activity", () => {
  it("groups a day's puzzles by kind, lists each game, newest first", () => {
    const rows = recentActivity([
      puzzle("2026-09-27", "daily", true, "2026-09-27 03:05:00", "2026-09-27 03:00:00"),
      puzzle("2026-09-27", "daily", true, "2026-09-27 03:12:00", "2026-09-27 03:05:00"),
      puzzle("2026-09-26", "free", true),
      puzzle("2026-09-25", "daily", false),
      game("2026-09-26", "2026-09-26 10:00:00", "2026-09-26T09:40:00Z"),
    ]);
    expect(rows.map((r) => [r.day, r.kind, r.puzzles, r.minutes])).toEqual([
      ["2026-09-27", "daily", 2, 12],
      ["2026-09-26", "solo", null, 20],
      ["2026-09-26", "free", 1, 0],
    ]);
  });

  it("reads SQLite's zone-less stamps as UTC", () => {
    expect(minutesBetween("2026-09-27T03:00:00Z", "2026-09-27 03:30:00")).toBe(30);
    expect(minutesBetween(undefined, "2026-09-27 03:30:00")).toBe(0);
  });
});
