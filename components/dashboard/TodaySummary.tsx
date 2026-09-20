"use client";

/**
 * The headline: this month's takings, large, with the other three numbers
 * stacked beside it.
 *
 * Replaces four equal tiles in a row. Four cards of identical weight say every
 * number matters the same amount, which forces the reader to check all four to
 * find the one that changed. Revenue is the number the office opens the
 * console for, so it is the size it deserves and carries its own trend; the
 * roster, the register and today's timetable sit alongside as one card.
 */

import { useLocale, useTranslations } from "next-intl";
import { monthToDate } from "@/lib/dashboard-charts";
import { fmtTHB } from "@/lib/live";
import { Icon, type IconName } from "@/lib/icons";
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

function IconChip({ icon, color, bg, size = 42 }: { icon: IconName; color: string; bg: string; size?: number }) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size / 3.4,
        background: bg,
        flexShrink: 0,
      }}
    >
      <Icon name={icon} size={Math.round(size * 0.48)} color={color} />
    </span>
  );
}

export function TodaySummary() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { checkins, students, todaysClasses, monthRevenue, revenueTrend, payments } = useData();

  const ongoing = todaysClasses.filter((c) => c.status === "Ongoing").length;
  const delta = monthToDate(payments);
  const lastMonth = new Intl.DateTimeFormat(locale, { month: "short" }).format(delta.previousMonth);

  const up = (delta.pct ?? 0) >= 0;
  const deltaColor = up ? COLORS.success : COLORS.danger;

  const stats: { key: string; icon: IconName; value: string; color: string; bg: string }[] = [
    {
      key: "totalStudents",
      icon: "students",
      value: String(students.length),
      color: ACCENTS.blue,
      bg: ACCENT_TINTS.blue,
    },
    {
      key: "checkedInToday",
      icon: "userCheck",
      value: String(checkins.length),
      color: ACCENTS.amber,
      bg: ACCENT_TINTS.amber,
    },
    {
      key: "classesToday",
      icon: "calendar",
      value: `${ongoing}/${todaysClasses.length}`,
      color: ACCENTS.plum,
      bg: ACCENT_TINTS.plum,
    },
  ];

  const sub: Record<string, string> = {
    totalStudents: t("enrolledAcross"),
    checkedInToday: t("checkedInSub"),
    classesToday: t("classesTodaySub"),
  };

  return (
    <div className="jt-hero">
      <Card style={{ display: "flex", flexDirection: "column", gap: 14, borderLeft: `4px solid ${ACCENTS.green}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <IconChip icon="wallet" color={ACCENTS.green} bg={ACCENT_TINTS.green} />
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
            /* The trend point carries an English month name; the reader's
               month comes from the locale, the same way `lastMonth` does
               above. Index 5 is the current month, each step back one more. */
            detail={(p, i) =>
              `${new Intl.DateTimeFormat(locale, { month: "short" }).format(
                new Date(new Date().getFullYear(), new Date().getMonth() - (revenueTrend.length - 1 - i), 1),
              )} · ${fmtTHB(p.value)}`
            }
          />
        </div>
      </Card>

      <Card style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
        {stats.map((stat, i) => (
          <div
            key={stat.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 17px",
              flex: 1,
              /* Hairlines between rather than three more cards: the three are
                 one thought, and three bordered boxes would put us back where
                 we started. */
              borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`,
            }}
          >
            <IconChip icon={stat.icon} color={stat.color} bg={stat.bg} size={36} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{t(stat.key)}</div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.35 }}>
                {sub[stat.key]}
              </div>
            </div>
            <span
              style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: COLORS.text, flexShrink: 0 }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
