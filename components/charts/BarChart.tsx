"use client";

/**
 * A column chart with a real axis: gridlines at round numbers, a labelled
 * gutter, and the value written above each bar.
 *
 * The tile sparklines this replaced scaled every series to its own tallest
 * point, so a flat month and a record month drew the same picture. Bars here
 * are measured against a round ceiling from `niceTicks`.
 */

import { useLocale } from "next-intl";
import { COLORS, FONT } from "@/lib/theme";
import { fmtAxis, niceTicks } from "./geometry";

export type Bar = { label: string; value: number; highlight?: boolean };

export function BarChart({
  bars,
  color,
  tint,
  height = 200,
  formatValue,
  label,
}: {
  bars: Bar[];
  color: string;
  /** The colour for bars that are not the highlighted one. */
  tint: string;
  height?: number;
  /** How the value above a bar reads. Defaults to the axis format. */
  formatValue?: (value: number) => string;
  label: string;
}) {
  const locale = useLocale();
  const ticks = niceTicks(Math.max(...bars.map((b) => b.value), 0));
  const ceiling = ticks[ticks.length - 1];
  const fmt = formatValue ?? ((v: number) => fmtAxis(v, locale));

  return (
    <figure style={{ margin: 0 }} role="img" aria-label={label}>
      <div style={{ display: "flex", gap: 10, height }}>
        {/* Axis gutter. Ticks run top-down so they read like the chart. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column-reverse",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingBottom: 22,
            flexShrink: 0,
          }}
          aria-hidden
        >
          {ticks.map((t) => (
            <span key={t} style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textSecondary, lineHeight: 1 }}>
              {fmtAxis(t, locale)}
            </span>
          ))}
        </div>

        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          {/* Gridlines, one per tick, positioned from the bottom. */}
          <div style={{ position: "absolute", inset: "0 0 22px 0" }} aria-hidden>
            {ticks.map((t) => (
              <span
                key={t}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: `${(t / ceiling) * 100}%`,
                  borderTop: `1px ${t === 0 ? "solid" : "dashed"} ${COLORS.border}`,
                }}
              />
            ))}
          </div>

          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: 8 }}>
            {bars.map((bar) => (
              <div
                key={bar.label}
                style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}
              >
                <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
                  <span
                    style={{
                      fontFamily: FONT,
                      fontSize: 11.5,
                      fontWeight: bar.highlight ? 600 : 400,
                      color: bar.highlight ? COLORS.text : COLORS.textSecondary,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmt(bar.value)}
                  </span>
                  <div
                    style={{
                      width: "100%",
                      /* A zero month keeps 2px so the column still exists to
                         be read as zero rather than as missing. */
                      height: `max(2px, ${(bar.value / ceiling) * 100}%)`,
                      background: bar.highlight ? color : tint,
                      borderRadius: "6px 6px 2px 2px",
                    }}
                  />
                </div>
                <span
                  style={{
                    height: 22,
                    display: "flex",
                    alignItems: "center",
                    fontFamily: FONT,
                    fontSize: 12,
                    fontWeight: bar.highlight ? 600 : 400,
                    color: bar.highlight ? COLORS.text : COLORS.textSecondary,
                  }}
                >
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
