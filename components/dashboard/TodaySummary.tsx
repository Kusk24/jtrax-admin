"use client";

/**
 * The dashboard's headline number: this month's takings and its recent shape.
 *
 * Replaces four equal tiles in a row. Four cards of identical weight say every
 * number matters the same amount, which forces the reader to check all four to
 * find the one that changed. Revenue is the number the office opens the
 * console for, so it is the size it deserves and carries its own trend. The
 * roster now sits beside it as an actionable status chart rather than three
 * more numbers that are repeated elsewhere on the page.
 */

import { useLocale, useTranslations } from "next-intl";
import { monthToDate } from "@/lib/dashboard-charts";
import { fmtTHB } from "@/lib/live";
import { Icon } from "@/lib/icons";
import { ACCENTS, ACCENT_TINTS, COLORS, FONT, FONT_DISPLAY } from "@/lib/theme";
import { useData } from "../DataProvider";
import { Card } from "../ui";
import { Sparkline } from "../charts";

/** The delta arrow. No arrow in the ported icon set, and a caret drawn here
    beats pulling one in for six vertices. */
function DeltaArrow({ up, color }: { up: boolean; color: string }) {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden focusable="false">
      <path d={up ? "M5 1.5 9 7.5H1z" : "M5 8.5 1 2.5h8z"} fill={color} />
    </svg>
  );
}

export function TodaySummary() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { monthRevenue, revenueTrend, payments } = useData();
  const delta = monthToDate(payments);
  const lastMonth = new Intl.DateTimeFormat(locale, { month: "short" }).format(delta.previousMonth);

  const up = (delta.pct ?? 0) >= 0;
  const deltaColor = up ? COLORS.success : COLORS.danger;

  return (
    <Card className="jt-revenue-summary" style={{ display: "flex", flexDirection: "column", gap: 12, borderLeft: `4px solid ${ACCENTS.green}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <span className="jt-revenue-icon" style={{ background: ACCENT_TINTS.green }}>
            <Icon name="wallet" size={20} color={ACCENTS.green} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{t("revenueThisMonth")}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 600, color: COLORS.text, lineHeight: 1.15 }}>
                {fmtTHB(monthRevenue.total)}
              </span>
              {delta.pct !== null && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 9px",
                    borderRadius: 999,
                    background: up ? COLORS.successBg : COLORS.dangerBg,
                    fontFamily: FONT,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: deltaColor,
                  }}
                >
                  <DeltaArrow up={up} color={deltaColor} />
                  {Math.abs(delta.pct)}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12.5, lineHeight: 1.4, color: COLORS.textSecondary }}>
          {t("fromPayments", { count: monthRevenue.count })}
          {delta.pct !== null && <> · {t("vsSamePoint", { month: lastMonth })}</>}
        </div>

        {/* Pushed to the bottom so the card's height is the stat block's, not
            the sparkline's, and it still lines up with the three beside it. */}
        <div style={{ marginTop: "auto" }}>
          <Sparkline
            points={revenueTrend}
            color={ACCENTS.green}
            fill={ACCENT_TINTS.green}
            label={t("revenueChartLabel", {
              from: revenueTrend[0]?.value.toLocaleString() ?? "0",
              to: revenueTrend[revenueTrend.length - 1]?.value.toLocaleString() ?? "0",
            })}
          />
        </div>
    </Card>
  );
}
