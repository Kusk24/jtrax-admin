"use client";

import { useTranslations } from "next-intl";
import { buildKpiCards, buildRevenueTrend, trendPointStrings } from "@/lib/derive";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { Card, SectionTitle } from "../ui";

function RevenueTrend() {
  const t = useTranslations("dashboard");
  const points = buildRevenueTrend();
  const { line, area } = trendPointStrings(points);

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <SectionTitle>{t("revenueTrend")}</SectionTitle>
      <p style={{ margin: 0, fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary }}>
        {t("lastSixMonths")}
      </p>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label={t("revenueChartLabel", {
          from: points[0].value.toLocaleString(),
          to: points[points.length - 1].value.toLocaleString(),
        })}
        style={{ width: "100%", height: 150, marginTop: 10, display: "block", overflow: "visible" }}
      >
        <polygon points={area} fill={COLORS.light} />
        <polyline
          points={line}
          fill="none"
          stroke={COLORS.blue}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        {points.map((p) => (
          <span key={p.month} style={{ fontFamily: FONT, fontSize: 11.5, color: COLORS.textSecondary }}>
            {p.month}
          </span>
        ))}
      </div>
    </Card>
  );
}

function KpiCards() {
  const t = useTranslations("dashboard");
  const kpis = buildKpiCards();
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionTitle>{t("overview")}</SectionTitle>
      {kpis.map((kpi) => (
        <div
          key={kpi.key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "13px 14px",
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: kpi.bg,
              flexShrink: 0,
            }}
          >
            <Icon name={kpi.icon} size={19} color={kpi.color} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary }}>
              {kpi.key === "revenue" ? t("revenueThisMonth") : t("totalStudents")}
            </div>
            <div style={{ fontFamily: FONT, fontSize: 19, fontWeight: 700, color: COLORS.text }}>
              {kpi.value}
            </div>
            <div style={{ fontFamily: FONT, fontSize: 11.5, color: COLORS.textSecondary }}>
              {kpi.key === "revenue" ? t("fromPayments", { count: kpi.count }) : t("enrolledAcross")}
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}

export function Overview() {
  return (
    <div className="jt-duo">
      <RevenueTrend />
      <KpiCards />
    </div>
  );
}
