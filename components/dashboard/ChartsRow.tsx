"use client";

/**
 * The dashboard's four charts: how the roster is doing, how today is going,
 * where the students are, and where the money came from.
 *
 * A separate row from the KPI strip on purpose. The strip answers "what is the
 * number"; these answer "what is it made of", which needs room — a donut and a
 * legend squeezed under a tile is neither.
 */

import { useTranslations } from "next-intl";
import { attendanceSplit, byCourse, byMethod, STATUS_ORDER, statusCounts } from "@/lib/dashboard-charts";
import { expectedToday, fmtTHB } from "@/lib/live";
import { ACCENTS, ACCENT_TINTS, COLORS, FONT } from "@/lib/theme";
import type { Student } from "@/lib/data";
import { useData } from "../DataProvider";
import { Card, SectionTitle } from "../ui";
import { Donut, ProgressRing, RankedBars } from "../charts";

/** The donut's colours, matched to the status chips students already wear on
    their own rows — green fine, amber needs a call, red lapsed. */
const STATUS_COLOR: Record<Student["status"], string> = {
  Normal: ACCENTS.green,
  "Low Credit": ACCENTS.amber,
  Expiring: ACCENTS.plum,
  Expired: ACCENTS.red,
  Inactive: COLORS.disabled,
};

/** Courses share one accent: the comparison is between lengths, and five
    different hues would imply a meaning the categories do not have. */
const COURSE_COLORS = [ACCENTS.blue, ACCENTS.blue, ACCENTS.blue, ACCENTS.blue, ACCENTS.blue];

function ChartCard({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <SectionTitle>{title}</SectionTitle>
      <p style={{ margin: "0 0 10px", fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{sub}</p>
      <div style={{ marginTop: "auto" }}>{children}</div>
    </Card>
  );
}

export function ChartsRow() {
  const t = useTranslations("dashboard");
  const { students, checkins, payments, raw } = useData();

  const counts = statusCounts(students);
  const statusData = STATUS_ORDER.map((status) => ({
    label: t(`status.${status.replace(/\s/g, "")}`),
    value: counts[status],
    color: STATUS_COLOR[status],
  }));

  const attendance = attendanceSplit(checkins, expectedToday(raw));
  const courses = byCourse(students, t("noCourse"));

  /* This month's payments only — the card sits under a revenue chart that is
     also this month, and mixing a lifetime total in would not be comparable. */
  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = payments.filter((p) => (p.isoDate ?? "").startsWith(month));
  const methods = byMethod(thisMonth);

  return (
    <div className="jt-chart-grid">
      <ChartCard title={t("rosterHealth")} sub={t("rosterHealthSub")}>
        <Donut
          data={statusData}
          centreLabel={t("students")}
          emptyLabel={t("noStudents")}
        />
      </ChartCard>

      <ChartCard title={t("attendanceToday")} sub={t("attendanceTodaySub")}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <ProgressRing
            value={attendance.arrived}
            max={attendance.expected}
            color={ACCENTS.amber}
            track={COLORS.light}
            centre={`${attendance.arrived}/${attendance.expected}`}
            caption={t("arrived")}
            label={t("attendanceLabel", attendance)}
          />
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 9, flex: 1, minWidth: 130 }}>
            {[
              { key: "inClass", value: attendance.inClass, color: ACCENTS.amber },
              { key: "goneHome", value: attendance.left, color: ACCENT_TINTS.amber },
              { key: "notArrived", value: attendance.absent, color: COLORS.light },
            ].map((row) => (
              <li key={row.key} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: row.color, flexShrink: 0 }} aria-hidden />
                <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary, flex: 1 }}>{t(row.key)}</span>
                <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text }}>{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </ChartCard>

      <ChartCard
        title={t("studentsByCourse")}
        sub={courses.hidden > 0 ? t("plusMoreCourses", { count: courses.hidden }) : t("studentsByCourseSub")}
      >
        <RankedBars
          rows={courses.rows.map((r, i) => ({ ...r, color: COURSE_COLORS[i % COURSE_COLORS.length] }))}
          emptyLabel={t("noStudents")}
        />
      </ChartCard>

      <ChartCard
        title={t("howTheyPaid")}
        sub={methods.hidden > 0 ? t("plusMoreMethods", { count: methods.hidden }) : t("howTheyPaidSub")}
      >
        <RankedBars
          rows={methods.rows.map((r) => ({ ...r, color: ACCENTS.green }))}
          formatValue={(v) => fmtTHB(v)}
          emptyLabel={t("noPaymentsThisMonth")}
        />
      </ChartCard>
    </div>
  );
}
