"use client";

import { useTranslations } from "next-intl";
import { CLASSES_DEFS_REF } from "@/lib/data";
import { buildCheckins, buildKpiCards } from "@/lib/derive";
import { Icon, type IconName } from "@/lib/icons";
import { ACCENTS, ACCENT_TINTS, COLORS, FONT } from "@/lib/theme";
import { Card } from "../ui";

/**
 * The four numbers that answer "how is today going" at a glance, across the
 * top of the dashboard. Each tile carries its own accent so the row reads as
 * four separate facts rather than one block of text.
 */
type Tile = {
  key: string;
  icon: IconName;
  value: string;
  color: string;
  bg: string;
};

export function KpiStrip() {
  const t = useTranslations("dashboard");
  const [revenue, students] = buildKpiCards();
  const checkins = buildCheckins({});
  const ongoing = CLASSES_DEFS_REF.filter((c) => c.status === "Ongoing").length;

  const tiles: Tile[] = [
    {
      key: "revenueThisMonth",
      icon: "wallet",
      value: revenue.value,
      color: ACCENTS.olive,
      bg: ACCENT_TINTS.olive,
    },
    {
      key: "totalStudents",
      icon: "students",
      value: students.value,
      color: ACCENTS.navy,
      bg: ACCENT_TINTS.navy,
    },
    {
      key: "checkedInToday",
      icon: "userCheck",
      value: String(checkins.length),
      color: ACCENTS.rust,
      bg: ACCENT_TINTS.rust,
    },
    {
      key: "classesToday",
      icon: "calendar",
      value: `${ongoing}/${CLASSES_DEFS_REF.length}`,
      color: ACCENTS.maroon,
      bg: ACCENT_TINTS.maroon,
    },
  ];

  const sub: Record<string, string> = {
    revenueThisMonth: t("fromPayments", { count: revenue.count }),
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
            alignItems: "center",
            gap: 13,
            /* The accent runs down the left edge — colour without tinting the
               whole card, which would fight the tables below. */
            borderLeft: `4px solid ${tile.color}`,
          }}
        >
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
            <div style={{ fontFamily: FONT, fontSize: 21, fontWeight: 700, color: COLORS.text, lineHeight: 1.2 }}>
              {tile.value}
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontSize: 12.5,
                color: COLORS.textSecondary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {sub[tile.key]}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
