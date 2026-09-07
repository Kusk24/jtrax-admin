"use client";

/**
 * A single-value ring — progress toward a whole, with the fraction in the middle.
 *
 * For "how much of today has happened": one number against one ceiling, where
 * a donut's legend would be three lines of ceremony for a single ratio.
 */

import { COLORS, FONT, FONT_DISPLAY } from "@/lib/theme";

export function ProgressRing({
  value,
  max,
  color,
  track,
  centre,
  caption,
  size = 132,
  thickness = 13,
  label,
}: {
  value: number;
  max: number;
  color: string;
  track: string;
  /** Big text in the hole — usually "3/8" or a percentage. */
  centre: string;
  caption: string;
  size?: number;
  thickness?: number;
  label: string;
}) {
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }} role="img" aria-label={label}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        {fraction > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${circumference * fraction} ${circumference}`}
          />
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, color: COLORS.text, lineHeight: 1.1 }}>
          {centre}
        </span>
        <span style={{ fontFamily: FONT, fontSize: 11.5, color: COLORS.textSecondary, textAlign: "center" }}>
          {caption}
        </span>
      </div>
    </div>
  );
}
