/**
 * The maths behind the dashboard's charts — arc paths, axis ticks, layout.
 *
 * Separate from the components and free of React so it can be tested directly:
 * a wrong arc or a mis-scaled axis draws a plausible picture of the wrong
 * numbers, which is worse than drawing nothing.
 */

/** A point on a circle. SVG's 0° points east; charts start at the top, so
    everything is rotated a quarter turn. */
export function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** One ring segment as an SVG path: out along the start edge, round the
    outside, in along the end edge, back round the inside. */
export function arcPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  startDeg: number,
  endDeg: number,
): string {
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const o1 = polar(cx, cy, outer, startDeg);
  const o2 = polar(cx, cy, outer, endDeg);
  const i2 = polar(cx, cy, inner, endDeg);
  const i1 = polar(cx, cy, inner, startDeg);
  return [
    `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export type Slice = { start: number; end: number; value: number; index: number };

/**
 * Values to angles. Zero-value entries are dropped rather than emitted as
 * zero-width slices, which SVG renders as a hairline in the wrong colour.
 *
 * A single non-empty value would need a 360° arc, which cannot be drawn —
 * start and end land on the same point and the path collapses. Callers get
 * `full` and draw a plain circle instead.
 */
export function donutSlices(values: number[]): { slices: Slice[]; total: number; full: number | null } {
  const total = values.reduce((sum, v) => sum + Math.max(0, v), 0);
  if (total <= 0) return { slices: [], total: 0, full: null };

  const present = values.map((v, index) => ({ v: Math.max(0, v), index })).filter((e) => e.v > 0);
  if (present.length === 1) return { slices: [], total, full: present[0].index };

  const slices: Slice[] = [];
  let at = 0;
  for (const { v, index } of present) {
    const sweep = (v / total) * 360;
    slices.push({ start: at, end: at + sweep, value: v, index });
    at += sweep;
  }
  return { slices, total, full: null };
}

/** 1, 2, 2.5, 5 or 10 × a power of ten — the steps a person would have
    chosen for an axis. */
function niceStep(rough: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow;
  if (norm <= 1) return pow;
  if (norm <= 2) return 2 * pow;
  if (norm <= 2.5) return 2.5 * pow;
  if (norm <= 5) return 5 * pow;
  return 10 * pow;
}

/**
 * Gridline values from 0 to at or just above `max`. The top tick is the
 * chart's ceiling, so bars scale against a round number rather than against
 * their own tallest — which would make every chart look equally full.
 */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const step = niceStep(max / count);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) {
    /* Floating point: 0.1+0.2 steps accumulate visible error by the fifth
       tick, and an axis labelled 0.30000000000000004 is not an axis. */
    ticks.push(Math.round(v * 1e6) / 1e6);
  }
  return ticks;
}

/** Axis numbers, short enough to sit in a gutter — 12,000 becomes 12K. */
export function fmtAxis(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** A percentage for a label, rounded but never rounded to 0% for something
    that is actually there. */
export function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  const raw = (value / total) * 100;
  return raw > 0 && raw < 1 ? 1 : Math.round(raw);
}
