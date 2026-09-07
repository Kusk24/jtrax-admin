"use client";

/**
 * Horizontal bars, longest first — the right shape for comparing named things
 * (courses, payment methods) rather than a series over time.
 *
 * Horizontal because the labels are words: "Intermediate Chess (Sec 101)"
 * under a vertical column either truncates or turns sideways, and neither is
 * readable at a glance.
 */

import { COLORS, FONT } from "@/lib/theme";

export type Ranked = { label: string; value: number; color: string };

export function RankedBars({
  rows,
  formatValue,
  emptyLabel,
  max,
}: {
  rows: Ranked[];
  formatValue?: (value: number) => string;
  emptyLabel: string;
  /** Scale ceiling. Defaults to the largest row, so the leader fills the track. */
  max?: number;
}) {
  const ceiling = max ?? Math.max(...rows.map((r) => r.value), 1);
  const fmt = formatValue ?? ((v: number) => String(v));

  if (rows.length === 0) {
    return <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{emptyLabel}</p>;
  }

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 13 }}>
      {rows.map((row) => (
        <li key={row.label} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
            <span
              style={{
                fontFamily: FONT,
                fontSize: 13,
                color: COLORS.text,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.label}
            </span>
            <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text, flexShrink: 0 }}>
              {fmt(row.value)}
            </span>
          </div>
          {/* The track is drawn even when the bar is short, so a small value
              reads as "little of the whole" rather than as a stray mark. */}
          <div style={{ height: 10, borderRadius: 5, background: COLORS.light, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.max(2, (row.value / ceiling) * 100)}%`,
                background: row.color,
                borderRadius: 5,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
