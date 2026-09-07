"use client";

import { useTranslations } from "next-intl";
import { fmtTHB } from "@/lib/live";
import { Icon, type IconName } from "@/lib/icons";
import { ACCENTS, ACCENT_TINTS, COLORS, FONT, FONT_DISPLAY } from "@/lib/theme";
import { useData } from "../DataProvider";
import { Card } from "../ui";
import { checkinDots, DOT_CAP, DotRow, MiniBars, SegmentBar, studentMix } from "./KpiVisuals";

/**
 * The four numbers that answer "how is today going" at a glance, across the
 * top of the dashboard. Each tile carries its own accent so the row reads as
 * four separate facts rather than one block of text — and each number is
 * repeated as a shape along the tile's bottom edge, because "12 checked in"
 * says less than twelve dots with four of them already gone home.
 */
type Tile = {
  key: string;
  icon: IconName;
  value: string;
  color: string;
  bg: string;
  visual: React.ReactNode;
};

export function KpiStrip() {
  const t = useTranslations("dashboard");
  const { students, checkins, todaysClasses, monthRevenue, revenueTrend } = useData();
  const ongoing = todaysClasses.filter((c) => c.status === "Ongoing").length;
  const finished = todaysClasses.length - ongoing;

  const mix = studentMix(students);
  const attendance = checkinDots(checkins);
  const attendanceLabel = t("checkinDots", { inClass: attendance.inClass, out: attendance.out });

  const tiles: Tile[] = [
    {
      key: "revenueThisMonth",
      icon: "wallet",
      value: fmtTHB(monthRevenue.total),
      color: ACCENTS.green,
      bg: ACCENT_TINTS.green,
      visual: (
        <MiniBars
          points={revenueTrend}
          color={ACCENTS.green}
          tint={ACCENT_TINTS.green}
          label={t("revenueBars")}
        />
      ),
    },
    {
      key: "totalStudents",
      icon: "students",
      value: String(students.length),
      /* The console's own blue, the one the primary buttons use — navy is a
         near-black next to the green, amber and plum the other three tiles
         carry, and read as a different kind of thing. */
      color: ACCENTS.blue,
      bg: ACCENT_TINTS.blue,
      /* The same three-way cut the follow-up card makes, so the amber and red
         here are the buckets it will list below. */
      visual: (
        <SegmentBar
          parts={[
            { weight: mix.normal, color: ACCENTS.blue },
            { weight: mix.attention, color: ACCENTS.amber },
            { weight: mix.gone, color: ACCENTS.red },
          ]}
          label={t("studentMix", mix)}
        />
      ),
    },
    {
      key: "checkedInToday",
      icon: "userCheck",
      value: String(checkins.length),
      color: ACCENTS.amber,
      bg: ACCENT_TINTS.amber,
      /* One dot per child while they are countable; past that the dots would
         be noise, and the honest shape is a proportion. */
      visual:
        checkins.length <= DOT_CAP ? (
          <DotRow
            dots={attendance.dots}
            color={ACCENTS.amber}
            tint={ACCENT_TINTS.amber}
            label={attendanceLabel}
          />
        ) : (
          <SegmentBar
            parts={[
              { weight: attendance.inClass, color: ACCENTS.amber },
              { weight: attendance.out, color: ACCENT_TINTS.amber },
            ]}
            label={attendanceLabel}
          />
        ),
    },
    {
      key: "classesToday",
      icon: "calendar",
      value: `${ongoing}/${todaysClasses.length}`,
      color: ACCENTS.plum,
      bg: ACCENT_TINTS.plum,
      /* A segment per class, filling in as the day is taught. */
      visual: (
        <SegmentBar
          parts={todaysClasses.map((c) => ({
            weight: 1,
            color: c.status === "Finished" ? ACCENTS.plum : ACCENT_TINTS.plum,
          }))}
          label={t("classDone", { done: finished, total: todaysClasses.length })}
        />
      ),
    },
  ];

  const sub: Record<string, string> = {
    revenueThisMonth: t("fromPayments", { count: monthRevenue.count }),
    totalStudents: t("enrolledAcross"),
    checkedInToday: t("checkedInSub"),
    classesToday: t("classesTodaySub"),
  };

  return (
    <div className="jt-kpi-strip">
      {tiles.map((tile) => (
        <Card
          key={tile.key}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            /* The accent runs down the left edge — colour without tinting the
               whole card, which would fight the tables below. */
            borderLeft: `4px solid ${tile.color}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 42,
                height: 42,
                borderRadius: 12,
                background: tile.bg,
                flexShrink: 0,
              }}
            >
              <Icon name={tile.icon} size={20} color={tile.color} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
                {t(tile.key)}
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 21, fontWeight: 600, color: COLORS.text, lineHeight: 1.2 }}>
                {tile.value}
              </div>
              <div
                /* Wraps rather than truncating — the grid makes every tile as
                   tall as the tallest, so a second line costs nothing. */
                style={{ fontFamily: FONT, fontSize: 12.5, lineHeight: 1.4, color: COLORS.textSecondary }}
              >
                {sub[tile.key]}
              </div>
            </div>
          </div>
          {/* Pinned to the bottom so the four drawings sit on one line across
              the strip, whatever the text above them wrapped to. */}
          <div style={{ marginTop: "auto" }}>{tile.visual}</div>
        </Card>
      ))}
    </div>
  );
}
