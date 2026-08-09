"use client";

/**
 * Six-month revenue line for the dashboard. The KPI numbers that used to sit
 * beside it now live in the full-width `KpiStrip`.
 */

import { useTranslations } from "next-intl";
import { buildRevenueTrend, trendPointStrings } from "@/lib/derive";
import { COLORS, FONT } from "@/lib/theme";
import { Card, SectionTitle } from "../ui";

export function RevenueTrend() {
  const t = useTranslations("dashboard");
  const points = buildRevenueTrend();
  const { line, area } = trendPointStrings(points);

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <SectionTitle>{t("revenueTrend")}</SectionTitle>
      <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
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
          <span key={p.month} style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
            {p.month}
          </span>
        ))}
      </div>
    </Card>
  );
}
