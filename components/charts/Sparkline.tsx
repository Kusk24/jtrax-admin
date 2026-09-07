"use client";

/**
 * A trend line small enough to sit under a headline number.
 *
 * Deliberately unlabelled: it carries shape, not amounts. The amounts are the
 * column chart further down the page, which has an axis. This is the only
 * place a bare polyline is honest — it is not pretending to be readable.
 */

import { trendPointStrings, type TrendPoint } from "@/lib/derive";

export function Sparkline({
  points,
  color,
  fill,
  height = 46,
  label,
}: {
  points: TrendPoint[];
  color: string;
  fill: string;
  height?: number;
  label: string;
}) {
  if (points.length < 2) return null;
  const { line, area } = trendPointStrings(points);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      style={{ width: "100%", height, display: "block", overflow: "visible" }}
    >
      <polygon points={area} fill={fill} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        /* The viewBox is stretched to the card's width, which would stretch
           the stroke with it. */
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
