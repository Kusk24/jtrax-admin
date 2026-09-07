/**
 * What the dashboard's charts count. A mis-grouping here draws a confident
 * picture of numbers nobody has — worse than an empty card — so each grouping
 * is checked against rows small enough to add up by hand.
 */
import { describe, expect, it } from "vitest";
import {
  attendanceSplit, byCourse, byMethod, monthToDate, parseAmount, STATUS_ORDER, statusCounts,
} from "./dashboard-charts";
import { arcPath, donutSlices, niceTicks, pct } from "@/components/charts/geometry";

describe("statusCounts", () => {
  it("returns all five conditions even when nobody is in them", () => {
    expect(statusCounts([])).toEqual({
      Normal: 0, "Low Credit": 0, Expiring: 0, Expired: 0, Inactive: 0,
    });
  });

  it("counts each student exactly once", () => {
    const counts = statusCounts([
      { status: "Normal" }, { status: "Normal" }, { status: "Expired" },
    ]);
    expect(counts.Normal).toBe(2);
    expect(counts.Expired).toBe(1);
    expect(STATUS_ORDER.reduce((sum, k) => sum + counts[k], 0)).toBe(3);
  });
});

describe("byCourse", () => {
  it("ranks courses by headcount, biggest first", () => {
    const { rows } = byCourse([
      { className: "Beginner" }, { className: "Master" },
      { className: "Beginner" }, { className: "Beginner" }, { className: "Master" },
    ], "No course");
    expect(rows).toEqual([
      { label: "Beginner", value: 3 },
      { label: "Master", value: 2 },
    ]);
  });

  it("keeps an unenrolled child visible rather than dropping them", () => {
    const { rows } = byCourse([{ className: "" }, { className: "  " }], "No course");
    expect(rows).toEqual([{ label: "No course", value: 2 }]);
  });

  it("reports the tail it cut instead of folding it into an Other bar", () => {
    const students = ["a", "b", "c", "d", "e", "f", "g"].map((className) => ({ className }));
    const { rows, hidden } = byCourse(students, "No course", 5);
    expect(rows).toHaveLength(5);
    expect(hidden).toBe(2);
  });
});

describe("byMethod", () => {
  it("sums money rather than counting rows", () => {
    const { rows } = byMethod([
      { method: "Cash", amount: "200" },
      { method: "Cash", amount: "200" },
      { method: "BankTransfer", amount: "9,000" },
    ]);
    expect(rows).toEqual([
      { label: "BankTransfer", value: 9000 },
      { label: "Cash", value: 400 },
    ]);
  });
});

describe("parseAmount", () => {
  it("survives the shapes a display string actually takes", () => {
    expect(parseAmount("1,200")).toBe(1200);       // separators must not truncate
    expect(parseAmount("฿1,200.50")).toBe(1200.5);
    expect(parseAmount("1200 THB")).toBe(1200);
    expect(parseAmount(1200)).toBe(1200);
    expect(parseAmount("")).toBe(0);
  });
});

describe("attendanceSplit", () => {
  it("counts who is in, who left, and who never came", () => {
    const split = attendanceSplit(
      [{ status: "In class" }, { status: "In class" }, { status: "Dismissed" }],
      5,
    );
    expect(split).toEqual({ inClass: 2, left: 1, absent: 2, arrived: 3, expected: 5 });
  });

  it("never draws a negative slice when a walk-in beats the register", () => {
    const split = attendanceSplit([{ status: "In class" }, { status: "In class" }], 1);
    expect(split.absent).toBe(0);
    expect(split.expected).toBe(2);
  });
});

describe("chart geometry", () => {
  it("turns values into angles that close the circle", () => {
    const { slices, total } = donutSlices([1, 1, 2]);
    expect(total).toBe(4);
    expect(slices.map((s) => s.end - s.start)).toEqual([90, 90, 180]);
    expect(slices[slices.length - 1].end).toBeCloseTo(360);
  });

  it("drops zero-value slices rather than drawing a hairline", () => {
    const { slices } = donutSlices([3, 0, 1]);
    expect(slices.map((s) => s.index)).toEqual([0, 2]);
  });

  it("flags a single category, which cannot be drawn as a 360 degree arc", () => {
    const { slices, full } = donutSlices([0, 7, 0]);
    expect(slices).toEqual([]);
    expect(full).toBe(1);
  });

  it("has nothing to draw for an empty roster", () => {
    expect(donutSlices([0, 0])).toEqual({ slices: [], total: 0, full: null });
  });

  it("draws an arc that starts at the top of the circle", () => {
    // 0 degrees is 12 o'clock: same x as the centre, above it.
    const d = arcPath(50, 50, 40, 20, 0, 90);
    expect(d.startsWith("M 50.00 10.00")).toBe(true);
  });

  it("picks round axis ceilings, not the tallest bar", () => {
    expect(niceTicks(10500)).toEqual([0, 5000, 10000, 15000]);
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(0)).toEqual([0, 1]);
  });

  it("never rounds a real value down to 0%", () => {
    expect(pct(1, 500)).toBe(1);
    expect(pct(0, 500)).toBe(0);
    expect(pct(1, 4)).toBe(25);
  });
});

describe("monthToDate", () => {
  const now = new Date(2026, 8, 8); // 8 September 2026
  const paid = (isoDate: string, amount: string) => ({ isoDate, amount, status: "Paid" as const });

  it("compares like for like — both sides cut at today's day of the month", () => {
    const d = monthToDate([
      paid("2026-09-02", "4000"),
      paid("2026-09-20", "9999"), // later this month: cannot have happened yet
      paid("2026-08-03", "1000"),
      paid("2026-08-25", "5000"), // after the 8th of August: not comparable
    ], now);
    expect(d.current).toBe(4000);
    expect(d.previous).toBe(1000);
    expect(d.pct).toBe(300);
  });

  it("counts only money the academy actually has", () => {
    const d = monthToDate([
      paid("2026-09-01", "1000"),
      { isoDate: "2026-09-02", amount: "500", status: "Pending" as const },
      { isoDate: "2026-09-03", amount: "700", status: "Refunded" as const },
    ], now);
    expect(d.current).toBe(1000);
  });

  it("has no percentage to report when last month took nothing", () => {
    // "+100%" from zero would be an invention, not a measurement.
    expect(monthToDate([paid("2026-09-01", "5000")], now).pct).toBeNull();
  });

  it("crosses the year boundary into December", () => {
    const jan = new Date(2026, 0, 10);
    const d = monthToDate([paid("2026-01-05", "200"), paid("2025-12-04", "100")], jan);
    expect(d.previous).toBe(100);
    expect(d.previousMonth.getFullYear()).toBe(2025);
    expect(d.previousMonth.getMonth()).toBe(11);
  });
});
