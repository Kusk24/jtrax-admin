"use client";

/**
 * The roster's five credit conditions as compact concentric rings.
 * Every legend row is also the shortest path to the matching student list.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { statusCounts, STATUS_ORDER } from "@/lib/dashboard-charts";
import type { Student } from "@/lib/data";
import { ACCENTS, COLORS, FONT, FONT_DISPLAY } from "@/lib/theme";
import { useData } from "../DataProvider";
import { Card, SectionTitle } from "../ui";
import { CreditReminders } from "./CreditReminders";

const STATUS_COLOR: Record<Student["status"], string> = {
  Normal: ACCENTS.green,
  "Low Credit": ACCENTS.amber,
  Expiring: ACCENTS.plum,
  Expired: ACCENTS.red,
  Inactive: COLORS.disabled,
};

const statusKey = (status: Student["status"]) => status.replace(/\s/g, "");

export function StudentStatus() {
  const t = useTranslations("dashboard");
  const { students } = useData();
  const counts = statusCounts(students);
  const total = students.length;
  const size = 142;
  const centre = size / 2;

  return (
    <Card className="jt-student-status" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <SectionTitle>{t("rosterHealth")}</SectionTitle>
          <p style={{ margin: "3px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
            {t("statusFilterHint")}
          </p>
        </div>
        {/* The action lives on the card that shows who needs it: the amber and
            plum rings are the families this reaches. */}
        <CreditReminders />
      </div>

      <div className="jt-status-content">
        <div
          className="jt-status-rings"
          role="img"
          aria-label={t("studentStatusLabel", { count: total })}
          style={{ width: size, height: size }}
        >
          <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
            {STATUS_ORDER.map((status, index) => {
              const radius = 61 - index * 10;
              const circumference = 2 * Math.PI * radius;
              const fraction = total > 0 ? counts[status] / total : 0;
              return (
                <g key={status}>
                  <circle
                    cx={centre}
                    cy={centre}
                    r={radius}
                    fill="none"
                    stroke={COLORS.light}
                    strokeWidth={6}
                  />
                  {fraction > 0 && (
                    <circle
                      cx={centre}
                      cy={centre}
                      r={radius}
                      fill="none"
                      stroke={STATUS_COLOR[status]}
                      strokeWidth={6}
                      strokeLinecap="round"
                      strokeDasharray={`${circumference * fraction} ${circumference}`}
                    />
                  )}
                </g>
              );
            })}
          </svg>
          <span className="jt-status-centre">
            <strong style={{ fontFamily: FONT_DISPLAY, fontSize: 25, lineHeight: 1, color: COLORS.text }}>
              {total}
            </strong>
            <span style={{ fontFamily: FONT, fontSize: 10.5, color: COLORS.textSecondary }}>
              {t("students")}
            </span>
          </span>
        </div>

        <div className="jt-status-legend">
          {STATUS_ORDER.map((status) => (
            <Link
              key={status}
              href={`/students?status=${encodeURIComponent(status)}`}
              className="jt-status-link"
              aria-label={t("filterStudentsByStatus", { status: t(`status.${statusKey(status)}`) })}
            >
              <span
                aria-hidden
                style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[status], flexShrink: 0 }}
              />
              <span className="jt-status-label">{t(`status.${statusKey(status)}`)}</span>
              <strong>{counts[status]}</strong>
              <span className="jt-status-arrow" aria-hidden>›</span>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
