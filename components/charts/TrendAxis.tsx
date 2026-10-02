"use client";

import { useLocale } from "next-intl";
import type { TrendPoint } from "@/lib/derive";
import { axisTicks, type RevenueRange } from "@/lib/dashboard-charts";
import { COLORS, FONT } from "@/lib/theme";

/** "Sep 8" for a day key, "Sep" for a month key, in the reader's language. */
function tickLabel(key: string, locale: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return new Intl.DateTimeFormat(
    locale,
    d ? { month: "short", day: "numeric" } : { month: "short" },
  ).format(date);
}

/**
 * The dates under a sparkline: small, muted, and placed exactly under the
 * points they name — the line spreads its points evenly edge to edge, so a
 * label's position is its index's share of the width. The end labels are held
 * inside the card rather than centred off its edge.
 */
export function TrendAxis({ points, range }: { points: TrendPoint[]; range: RevenueRange }) {
  const locale = useLocale();
  const last = points.length - 1;
  if (last < 1) return null;

  return (
    <div aria-hidden style={{ position: "relative", height: 16, marginTop: 6 }}>
      {axisTicks(points, range).map((i) => {
        const at = (i / last) * 100;
        const shift = i === 0 ? "0" : i === last ? "-100%" : "-50%";
        return (
          <span
            key={points[i].month}
            style={{
              position: "absolute",
              left: `${at}%`,
              transform: `translateX(${shift})`,
              fontFamily: FONT,
              fontSize: 10.5,
              lineHeight: "16px",
              color: COLORS.textSecondary,
              opacity: 0.85,
              whiteSpace: "nowrap",
            }}
          >
            {tickLabel(points[i].month, locale)}
          </span>
        );
      })}
    </div>
  );
}
