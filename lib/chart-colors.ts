import type { BranchId } from "./admin-types";

/* Chart data steps derived from the theme palette, adjusted so the categorical
   set passes the lightness band and 3:1 contrast on the card surface.
   Colors follow the entity (branch/level), never the series rank. */
export const chart = {
  navy: "#4a63a8",
  brick: "#c0392b",
  olive: "#7e9440",
  rust: "#8c3a1e",
  grid: "#e4e0d8",
  tick: "#8a8a86",
  ink: "#2b2b2b",
  surface: "#fffdfa",
  track: "#f2eee6",
} as const;

export const branchChartColor: Record<BranchId, string> = {
  bangkok: chart.brick,
  onnut: chart.olive,
  bangbo: chart.navy,
};

export const levelChartColor: Record<string, string> = {
  Beginner: chart.brick,
  Intermediate: chart.olive,
  Advance: chart.rust,
};
