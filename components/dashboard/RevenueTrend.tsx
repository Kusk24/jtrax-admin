"use client";

/**
 * Six months of takings as a column chart.
 *
 * It was a bare polyline: no axis, no gridlines, no values, and scaled between
 * its own lowest and highest month — so a flat six months and a record six
 * months drew the same picture, and neither could be read as an amount.
 * Columns, because months are discrete periods rather than a continuous
 * signal, measured against a round ceiling.
 */

import { useTranslations } from "next-intl";
import { fmtTHB } from "@/lib/live";
import { ACCENTS, ACCENT_TINTS, COLORS, FONT } from "@/lib/theme";
import { useData } from "../DataProvider";
import { BarChart } from "../charts";
import { Card, SectionTitle } from "../ui";

export function RevenueTrend() {
  const t = useTranslations("dashboard");
  const { revenueTrend: points } = useData();

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <SectionTitle>{t("revenueTrend")}</SectionTitle>
      <p style={{ margin: "0 0 14px", fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
        {t("lastSixMonths")}
      </p>
      <BarChart
        bars={points.map((p, i) => ({
          label: p.month,
          value: p.value,
          /* The month in progress is the one being asked about; the five
             behind it are the context. */
          highlight: i === points.length - 1,
        }))}
        color={ACCENTS.blue}
        tint={ACCENT_TINTS.blue}
        formatValue={(v) => (v > 0 ? fmtTHB(v) : "—")}
        label={t("revenueChartLabel", {
          from: points[0]?.value.toLocaleString() ?? "0",
          to: points[points.length - 1]?.value.toLocaleString() ?? "0",
        })}
      />
    </Card>
  );
}
