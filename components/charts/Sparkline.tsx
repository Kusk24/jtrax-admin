"use client";

/**
 * A trend line small enough to sit under a headline number.
 *
 * Unlabelled at rest: it carries shape. With `describe`, hovering reads out
 * the point under the pointer — a guide, a dot on the line, and its amount.
 */

import { useState, type PointerEvent } from "react";
import { trendPointStrings, trendPointY, type TrendPoint } from "@/lib/derive";
import { COLORS, FONT } from "@/lib/theme";

export function Sparkline({
  points,
  color,
  fill,
  height = 46,
  label,
  describe,
}: {
  points: TrendPoint[];
  color: string;
  fill: string;
  height?: number;
  label: string;
  /** What the hover readout says for a point, e.g. "3 Sep · 12,000 THB". */
  describe?: (point: TrendPoint) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return null;
  const { line, area } = trendPointStrings(points);
  const ys = trendPointY(points);

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    if (box.width <= 0) return;
    const fraction = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    setHover(Math.round(fraction * (points.length - 1)));
  }

  const x = hover === null ? 0 : (hover / (points.length - 1)) * 100;
  /* Keep the readout inside the card at either end. */
  const shift = x < 15 ? "0%" : x > 85 ? "-100%" : "-50%";

  return (
    <div
      style={{ position: "relative", cursor: describe ? "crosshair" : undefined }}
      onPointerMove={describe ? onMove : undefined}
      onPointerLeave={describe ? () => setHover(null) : undefined}
    >
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
        {hover !== null && (
          <line
            x1={x}
            x2={x}
            y1={0}
            y2={100}
            stroke={color}
            strokeOpacity={0.35}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {hover !== null && describe && (
        <>
          {/* The dot is HTML, not SVG: the stretched viewBox would draw a circle as an ellipse. */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${(ys[hover] / 100) * height}px`,
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: color,
              border: `2px solid ${COLORS.surface}`,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}
          />
          <span
            role="status"
            style={{
              position: "absolute",
              left: `${x}%`,
              bottom: `calc(100% + 6px)`,
              transform: `translateX(${shift})`,
              padding: "4px 8px",
              borderRadius: 8,
              background: COLORS.text,
              color: COLORS.surface,
              fontFamily: FONT,
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              boxShadow: "0 6px 16px rgb(16 24 40 / 0.18)",
            }}
          >
            {describe(points[hover])}
          </span>
        </>
      )}
    </div>
  );
}
