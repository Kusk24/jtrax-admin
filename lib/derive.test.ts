/**
 * The sparkline's coordinate and hit maths.
 *
 * The hover dot is positioned with trendPointCoords and the pointer snaps
 * with sparklineHitIndex; if either drifts from the polyline's own numbers
 * the dot floats beside the line it claims to mark. So the tests pin the two
 * to each other, and pin the clamping that keeps a pointer past the edge on
 * the end month.
 */
import { describe, expect, it } from "vitest";
import { sparklineHitIndex, trendPointCoords, trendPointStrings, type TrendPoint } from "./derive";

const SERIES: TrendPoint[] = [
  { month: "Apr", value: 4500 },
  { month: "May", value: 6000 },
  { month: "Jun", value: 4000 },
  { month: "Jul", value: 7500 },
  { month: "Aug", value: 9000 },
  { month: "Sep", value: 10500 },
];

describe("trendPointCoords", () => {
  it("spans the box: first point at the left edge, last at the right", () => {
    const coords = trendPointCoords(SERIES);
    expect(coords[0].x).toBe(0);
    expect(coords[coords.length - 1].x).toBe(100);
  });

  it("puts the highest month at the top inset and the lowest at the bottom inset", () => {
    const coords = trendPointCoords(SERIES);
    expect(coords[5].y).toBe(10); // 10,500 — the max
    expect(coords[2].y).toBe(90); // 4,000 — the min
  });

  it("is the same maths the polyline draws with", () => {
    const coords = trendPointCoords(SERIES);
    const { line } = trendPointStrings(SERIES);
    expect(line).toBe(coords.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" "));
  });
});

describe("sparklineHitIndex", () => {
  it("snaps to the nearest of the evenly spaced points", () => {
    expect(sparklineHitIndex(0, 500, 6)).toBe(0);
    expect(sparklineHitIndex(500, 500, 6)).toBe(5);
    // 210px on a 500px line: 210/500 * 5 = 2.1 → the third point.
    expect(sparklineHitIndex(210, 500, 6)).toBe(2);
  });

  it("clamps a pointer past either edge to the end point", () => {
    expect(sparklineHitIndex(-30, 500, 6)).toBe(0);
    expect(sparklineHitIndex(640, 500, 6)).toBe(5);
  });

  it("survives the degenerate boxes jsdom and a zero-width flex child produce", () => {
    expect(sparklineHitIndex(120, 0, 6)).toBe(0);
    expect(sparklineHitIndex(120, 500, 0)).toBe(0);
  });
});
