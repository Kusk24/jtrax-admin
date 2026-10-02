"use client";

/**
 * The roster's five credit conditions as one donut, each slice its share of
 * the students. Every legend row is also the shortest path to the matching
 * student list.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { statusCounts, STATUS_ORDER } from "@/lib/dashboard-charts";
import type { Student } from "@/lib/data";
import { COLORS, FONT, FONT_DISPLAY, STUDENT_STATUS_COLOR } from "@/lib/theme";
import { useData } from "../DataProvider";
import { Badge, Card, SectionTitle } from "../ui";

/* Soft fills of their own rather than the text accents, which were too heavy
   as slices — shared with every other place a student's status is shown. */
const STATUS_COLOR: Record<Student["status"], string> = STUDENT_STATUS_COLOR;

const statusKey = (status: Student["status"]) => status.replace(/\s/g, "");

const SIZE = 142;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/* A hairline between slices so neighbours read as two, not one blended arc. */
const GAP = 2;

export function StudentStatus() {
  const t = useTranslations("dashboard");
  const { students } = useData();
  const counts = statusCounts(students);
  const total = students.length;
  const centre = SIZE / 2;

  const present = STATUS_ORDER.filter((status) => counts[status] > 0);
  /* Each slice starts where the one before it ended. */
  const slices = present.reduce<Array<{ status: Student["status"]; dash: number; offset: number; end: number }>>(
    (acc, status) => {
      const offset = acc.at(-1)?.end ?? 0;
      const length = total > 0 ? (counts[status] / total) * CIRCUMFERENCE : 0;
      const gap = present.length > 1 ? Math.min(GAP, length / 2) : 0;
      return [...acc, { status, dash: length - gap, offset, end: offset + length }];
    },
    [],
  );

  return (
    <Card className="jt-student-status" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div>
          <SectionTitle>{t("studentStatus")}</SectionTitle>
          <p style={{ margin: "3px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
            {t("statusFilterHint")}
          </p>
        </div>
        <Badge color={COLORS.blue} bg={COLORS.light}>
          {t("studentCount", { count: total })}
        </Badge>
      </div>

      <div className="jt-status-content">
        <div
          className="jt-status-donut"
          role="img"
          aria-label={t("studentStatusLabel", { count: total })}
          style={{ width: SIZE, height: SIZE }}
        >
          <svg width={SIZE} height={SIZE} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={centre} cy={centre} r={RADIUS} fill="none" stroke={COLORS.light} strokeWidth={STROKE} />
            {slices.map((slice) => (
              <circle
                key={slice.status}
                cx={centre}
                cy={centre}
                r={RADIUS}
                fill="none"
                stroke={STATUS_COLOR[slice.status]}
                strokeWidth={STROKE}
                strokeDasharray={`${slice.dash} ${CIRCUMFERENCE}`}
                strokeDashoffset={-slice.offset}
              />
            ))}
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
