"use client";

/**
 * A trend line small enough to sit under a headline number.
 *
 * Unlabelled at rest: it carries shape, not amounts — the amounts live in the
 * column chart further down the page. With `detail` it answers on demand
 * instead: pointing at (or tapping) the line shows the nearest month's value
 * in a small tooltip, so the detail exists without ever adding ink to the
 * card.
 */

import { useRef, useState } from "react";
import { sparklineHitIndex, trendPointCoords, trendPointStrings, type TrendPoint } from "@/lib/derive";
import { COLORS, FONT } from "@/lib/theme";

export function Sparkline({
  points,
  color,
  fill,
  height = 46,
  label,
  detail,
}: {
  points: TrendPoint[];
  color: string;
  fill: string;
  height?: number;
  label: string;
  /** What the tooltip says for a point. Omit it and the line is inert. */
  detail?: (point: TrendPoint, index: number) => string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  if (points.length < 2) return null;
  const { line, area } = trendPointStrings(points);

  const chart = (
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

  if (!detail) return chart;

  const coords = trendPointCoords(points);
  const at = active !== null ? coords[active] : null;

  /* Reads the pointer, snaps to the nearest point. pointermove covers the
     mouse; pointerdown makes a tap on a phone give the same reading. */
  const read = (e: React.PointerEvent) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    setActive(sparklineHitIndex(e.clientX - box.left, box.width, points.length));
  };

  return (
    <div
      ref={boxRef}
      onPointerMove={read}
      onPointerDown={read}
      /* A touch pointer "leaves" the moment the finger lifts, which would
         wipe the reading the tap just made — so only a mouse clears on the
         way out. A tapped tooltip stays until the next tap moves it. */
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setActive(null); }}
      onPointerCancel={() => setActive(null)}
      style={{ position: "relative", touchAction: "pan-y" }}
    >
      {chart}
      {at !== null && active !== null && (
        <>
          {/* The dot is a div, not an SVG circle: the viewBox is stretched to
              the card's width, which would smear a circle into an ellipse. */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: `${at.x}%`,
              top: `${(at.y / 100) * height}px`,
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: color,
              border: `2px solid ${COLORS.surface}`,
              boxShadow: "0 1px 3px rgba(16, 24, 40, 0.2)",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}
          />
          <div
            role="status"
            style={{
              position: "absolute",
              left: `${at.x}%`,
              bottom: `calc(100% - ${(at.y / 100) * height}px + 9px)`,
              /* Slide rather than clip at the card's edges. */
              transform: at.x < 12 ? "none" : at.x > 88 ? "translateX(-100%)" : "translateX(-50%)",
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(16, 24, 40, 0.12)",
              padding: "5px 10px",
              fontFamily: FONT,
              fontSize: 12.5,
              color: COLORS.text,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {detail(points[active], active)}
          </div>
        </>
      )}
    </div>
  );
}
