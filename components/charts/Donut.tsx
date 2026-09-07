"use client";

/**
 * A donut with its total in the middle and a legend beside it.
 *
 * Part-to-whole, which is what "how does the roster split" actually is. The
 * hole carries the total so the chart answers both questions at once, and the
 * legend carries counts and percentages so nobody has to judge an angle by eye.
 */

import { COLORS, FONT, FONT_DISPLAY } from "@/lib/theme";
import { arcPath, donutSlices, pct } from "./geometry";

export type DonutDatum = { label: string; value: number; color: string };

export function Donut({
  data,
  total,
  centreLabel,
  size = 168,
  thickness = 26,
  emptyLabel,
}: {
  data: DonutDatum[];
  /** Shown in the hole. Defaults to the sum. */
  total?: number;
  centreLabel: string;
  size?: number;
  thickness?: number;
  emptyLabel: string;
}) {
  const { slices, total: sum, full } = donutSlices(data.map((d) => d.value));
  const shown = total ?? sum;
  const c = size / 2;
  const outer = c - 1;
  const inner = outer - thickness;

  return (
    <div className="jt-donut">
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} role="presentation">
          {sum <= 0 ? (
            <circle cx={c} cy={c} r={(outer + inner) / 2} fill="none" stroke={COLORS.light} strokeWidth={thickness} />
          ) : full !== null ? (
            /* One category holding everything — a 360° arc cannot be drawn, so
               the ring is a stroked circle instead. */
            <circle
              cx={c}
              cy={c}
              r={(outer + inner) / 2}
              fill="none"
              stroke={data[full].color}
              strokeWidth={thickness}
            />
          ) : (
            slices.map((s) => (
              <path
                key={s.index}
                d={arcPath(c, c, outer, inner, s.start, s.end)}
                fill={data[s.index].color}
                /* A hairline of page behind each slice, so neighbouring
                   colours stay countable without a legend. */
                stroke={COLORS.surface}
                strokeWidth={2}
              />
            ))
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
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 27, fontWeight: 600, color: COLORS.text, lineHeight: 1.1 }}>
            {shown}
          </span>
          <span style={{ fontFamily: FONT, fontSize: 11.5, color: COLORS.textSecondary, textAlign: "center" }}>
            {centreLabel}
          </span>
        </div>
      </div>

      <ul
        /* A floor rather than `minWidth: 0`: below this the labels ellipsis
           away to "In good…", so the legend wraps under the donut instead. */
        style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 9, flex: 1, minWidth: 200 }}
      >
        {sum <= 0 ? (
          <li style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{emptyLabel}</li>
        ) : (
          data.map((d) => (
            <li key={d.label} style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
              <span
                style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }}
                aria-hidden
              />
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 13,
                  color: COLORS.textSecondary,
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {d.label}
              </span>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text, flexShrink: 0 }}>
                {d.value}
              </span>
              <span
                style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary, flexShrink: 0, width: 34, textAlign: "right" }}
              >
                {pct(d.value, sum)}%
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
