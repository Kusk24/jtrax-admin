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
 *
 * The headline follows the range switch under it: "this month" by default,
 * "this week" or "this year" when that is what is picked, each with its own
 * total and its own comparison to the stretch before it. A label and a number
 * that disagreed — "this week" over a month's takings — would be worse than
 * no range switch at all.
 */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { periodToDate, REVENUE_RANGES, revenueSeries, type RevenueRange } from "@/lib/dashboard-charts";
import { fmtTHB } from "@/lib/live";
import { Icon } from "@/lib/icons";
import { ACCENTS, ACCENT_TINTS, COLORS, FONT, FONT_DISPLAY } from "@/lib/theme";
import { TrendAxis } from "../charts/TrendAxis";
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
  const { payments } = useData();
  const [range, setRange] = useState<RevenueRange>("30D");
  const delta = periodToDate(payments, range);
  /* What "the same point" was measured against, in the period's own terms:
     a month name for 30D, last year's number for Year, and a fixed phrase
     for 7D — a week has no short name the way a month or a year does. */
  const previousPeriod =
    range === "Year"
      ? String(delta.previousStart.getFullYear())
      : range === "7D"
        ? t("lastWeek")
        : new Intl.DateTimeFormat(locale, { month: "short" }).format(delta.previousStart);
  const trend = revenueSeries(payments, range);

  /* "3 Sep" for a day, "Sep 2026" for a month (the Year range). */
  const pointDay = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, (m || 1) - 1, d || 1);
    return new Intl.DateTimeFormat(locale, d ? { day: "numeric", month: "short" } : { month: "short", year: "numeric" }).format(date);
  };

  const up = (delta.pct ?? 0) >= 0;
  const deltaColor = up ? COLORS.success : COLORS.danger;

  return (
    <Card className="jt-revenue-summary" style={{ display: "flex", flexDirection: "column", gap: 12, borderLeft: `4px solid ${ACCENTS.blue}` }}>
        <div className="jt-revenue-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span className="jt-revenue-icon" style={{ background: ACCENT_TINTS.blue }}>
              <Icon name="wallet" size={18} color={ACCENTS.blue} />
            </span>
            <span className="jt-revenue-eyebrow">{t(`revenueHeadline.${range}`)}</span>
          </div>

          {/* Radio group, not buttons: these are three views of one thing and
              exactly one is always on, which is what a screen reader should
              hear when it lands here. */}
          <div className="jt-range-toggle" role="radiogroup" aria-label={t("revenueRangeLabel")}>
            {REVENUE_RANGES.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={option === range}
                className={`jt-range-option${option === range ? " is-on" : ""}`}
                onClick={() => setRange(option)}
              >
                {t(`revenueRange.${option}`)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 600, color: COLORS.text, lineHeight: 1.15 }}>
            {fmtTHB(delta.current)}
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

        <div style={{ fontFamily: FONT, fontSize: 12.5, lineHeight: 1.4, color: COLORS.textSecondary }}>
          {t("fromPayments", { count: delta.count })}
          {delta.pct !== null && <> · {t("vsSamePoint", { period: previousPeriod })}</>}
        </div>

        {/* Pushed to the bottom so the card's height is the stat block's, not
            the sparkline's, and it still lines up with the one beside it. */}
        <div style={{ marginTop: "auto" }}>
          <Sparkline
            points={trend}
            color={ACCENTS.blue}
            fill={ACCENT_TINTS.blue}
            describe={(p) => `${pointDay(p.month)} · ${fmtTHB(p.value)}`}
            label={t("revenueChartRangeLabel", {
              range: t(`revenueRange.${range}`),
              from: trend[0]?.value.toLocaleString() ?? "0",
              to: trend[trend.length - 1]?.value.toLocaleString() ?? "0",
            })}
          />
          <TrendAxis points={trend} range={range} />
        </div>
    </Card>
  );
}
