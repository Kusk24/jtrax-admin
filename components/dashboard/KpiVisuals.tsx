"use client";

/**
 * The small drawings inside the KPI tiles — each tile's number shown as a
 * shape, from data the provider already holds. The counting is exported bare
 * so tests can check the sums without rendering anything.
 */

import type { CheckinDef, Student } from "@/lib/data";
import type { TrendPoint } from "@/lib/derive";

/** How the roster splits: fine, needs the desk's attention, or gone quiet.
    The same three-way cut the follow-up buckets make, collapsed to a bar. */
export function studentMix(students: Pick<Student, "status">[]): {
  normal: number;
  attention: number;
  gone: number;
} {
  let normal = 0;
  let attention = 0;
  let gone = 0;
  for (const st of students) {
    if (st.status === "Normal") normal += 1;
    else if (st.status === "Low Credit" || st.status === "Expiring") attention += 1;
    else gone += 1;
  }
  return { normal, attention, gone };
}

/** Who is still in the building. Checkins arrive sorted by time in, so the
    dots read left to right as the day happened. */
export function checkinDots(checkins: Pick<CheckinDef, "status">[]): {
  dots: boolean[];
  inClass: number;
  out: number;
} {
  const dots = checkins.map((c) => c.status === "In class");
  const inClass = dots.filter(Boolean).length;
  return { dots, inClass, out: dots.length - inClass };
}

/* Past this many children the dots stop being countable at tile size and the
   strip falls back to a proportional bar. */
export const DOT_CAP = 24;

/** Six months of revenue as bars. Heights are fractions of the best month —
    an empty month keeps a 3px stub so the row still reads as six months. */
export function MiniBars({ points, color, tint, label }: {
  points: TrendPoint[];
  color: string;
  tint: string;
  label: string;
}) {
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div
      role="img"
      aria-label={label}
      style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 30 }}
    >
      {points.map((p, i) => (
        <span
          key={p.month}
          style={{
            flex: 1,
            minHeight: 3,
            height: `${Math.round((p.value / max) * 100)}%`,
            borderRadius: 3,
            /* Only the month in progress carries the accent — the row says
               "here is the shape, and this is where you are in it". */
            background: i === points.length - 1 ? color : tint,
          }}
        />
      ))}
    </div>
  );
}

/** A single bar cut into coloured parts. Zero-weight parts vanish rather than
    leaving a sliver, so an empty bucket costs nothing. */
export function SegmentBar({ parts, label }: {
  parts: { weight: number; color: string }[];
  label: string;
}) {
  const shown = parts.filter((p) => p.weight > 0);
  return (
    <div role="img" aria-label={label} style={{ display: "flex", gap: 3, height: 8 }}>
      {shown.map((p, i) => (
        <span
          key={i}
          style={{ flex: p.weight, borderRadius: 4, background: p.color }}
        />
      ))}
    </div>
  );
}

/** One dot per child checked in today — filled while they are in class,
    hollowed to the tint once they have gone home. */
export function DotRow({ dots, color, tint, label }: {
  dots: boolean[];
  color: string;
  tint: string;
  label: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      style={{ display: "flex", flexWrap: "wrap", gap: 4, minHeight: 8 }}
    >
      {dots.map((filled, i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: filled ? color : tint,
          }}
        />
      ))}
    </div>
  );
}
