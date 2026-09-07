/* The dashboard's chart primitives. Hand-drawn SVG rather than a charting
   dependency: four shapes, all styled from `lib/theme`, is less code than
   configuring a library out of its own look. */

export { BarChart, type Bar } from "./BarChart";
export { Donut, type DonutDatum } from "./Donut";
export { ProgressRing } from "./ProgressRing";
export { RankedBars, type Ranked } from "./RankedBars";
export { arcPath, donutSlices, fmtAxis, niceTicks, pct, polar, type Slice } from "./geometry";
