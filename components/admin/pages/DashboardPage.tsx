import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, CreditCard, TriangleAlert, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusChip } from "@/components/admin/StatusChip";
import {
  CreditTrendChart,
  DistributionChart,
  HorizontalBarsChart,
  WeekAttendanceChart,
} from "@/components/admin/DashboardCharts";
import { branchChartColor, levelChartColor } from "@/lib/chart-colors";
import type { BranchId } from "@/lib/admin-types";
import {
  branchCreditsSold,
  branchDashboardKpis,
  branchName,
  creditTrend,
  dashboardKpis,
  followUps,
  levelDistribution,
  weekAttendanceRates,
} from "@/lib/super-data";

function ChartCard({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-card border-2 border-line bg-card p-4 shadow-clay ${className}`}
    >
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function DashboardPage({
  base = "/super",
  branch,
}: {
  base?: string;
  branch?: BranchId;
}) {
  const t = useTranslations("dash");
  const tc = useTranslations("common");
  const td = useTranslations("days");
  const k = dashboardKpis;
  const kb = branchDashboardKpis;
  const rows = branch
    ? followUps.filter((r) => r.branchId === branch)
    : followUps;

  const kpis = branch
    ? [
        { label: t("totalRevenue"), value: kb.revenue, sub: t("thisMonth", { pct: kb.revenueDelta }) },
        { label: t("totalTeachers"), value: String(kb.teachers), sub: t("activeStaff") },
        { label: t("totalStudents"), value: String(kb.students), sub: t("thisMonth", { pct: kb.studentsDelta }) },
        { label: t("attendanceRate"), value: kb.attendanceRate, sub: t("lastWeek", { pct: kb.attendanceDelta }) },
        { label: t("criticalStudents"), value: String(kb.criticalStudents), sub: t("needAttention") },
      ]
    : [
    { label: t("totalRevenue"), value: k.revenue, sub: t("thisMonth", { pct: k.revenueDelta }) },
    { label: t("totalBranches"), value: String(k.branches), sub: t("inCities", { count: k.cities }) },
    { label: t("totalTeachers"), value: String(k.teachers), sub: t("activeStaff") },
    { label: t("totalStudents"), value: String(k.students), sub: t("thisMonth", { pct: k.studentsDelta }) },
    { label: t("attendanceRate"), value: k.attendanceRate, sub: t("lastWeek", { pct: k.attendanceDelta }) },
    { label: t("criticalStudents"), value: String(k.criticalStudents), sub: t("needAttention") },
      ];

  const branchCredits = branchCreditsSold.map((b) => ({
    name: branchName(b.branchId),
    value: b.credits,
    fill: branchChartColor[b.branchId],
  }));
  const distribution = levelDistribution.map((l) => ({
    name: l.level,
    value: l.students,
    fill: levelChartColor[l.level],
  }));
  const weekRates = weekAttendanceRates.map((d) => ({
    label: td(d.day),
    rate: d.rate,
  }));

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={
          branch
            ? t("subtitleBranch", { branch: branchName(branch) })
            : t("subtitle")
        }
      />

      <div className={`mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 ${branch ? "xl:grid-cols-5" : "xl:grid-cols-6"}`}>
        {kpis.map(({ label, value, sub }) => (
          <div
            key={label}
            className="rounded-card border-2 border-line bg-card p-4 shadow-clay"
          >
            <p className="text-xs font-bold text-muted">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink">
              {value}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">{sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard title={t("creditTrend")} className="lg:col-span-2">
          <CreditTrendChart data={creditTrend} label={t("creditTrend")} />
        </ChartCard>
        <section className="rounded-card border-2 border-line bg-card p-4 shadow-clay">
          <h2 className="text-sm font-semibold text-ink">{t("quickActions")}</h2>
          <div className="mt-3 grid gap-2.5">
            <Link
              href={`${base}/students/new`}
              className="flex items-center gap-3 rounded-xl border-2 border-line px-3.5 py-3 text-sm font-bold text-ink transition-colors hover:border-navy/40 hover:text-navy"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-navy-soft text-navy">
                <UserPlus className="size-4" />
              </span>
              {t("registerStudent")}
              <ChevronRight className="ml-auto size-4 text-muted" />
            </Link>
            <Link
              href={`${base}/payments/new`}
              className="flex items-center gap-3 rounded-xl border-2 border-line px-3.5 py-3 text-sm font-bold text-ink transition-colors hover:border-navy/40 hover:text-navy"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-olive-soft text-olive">
                <CreditCard className="size-4" />
              </span>
              {t("addPayment")}
              <ChevronRight className="ml-auto size-4 text-muted" />
            </Link>
            <Link
              href={`${base}/students`}
              className="flex items-center gap-3 rounded-xl border-2 border-line px-3.5 py-3 text-sm font-bold text-ink transition-colors hover:border-navy/40 hover:text-navy"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brick-soft text-brick">
                <TriangleAlert className="size-4" />
              </span>
              {t("viewCritical")}
              <ChevronRight className="ml-auto size-4 text-muted" />
            </Link>
          </div>
        </section>
      </div>

      <div className={`mt-4 grid gap-4 md:grid-cols-2 ${branch ? "" : "lg:grid-cols-3"}`}>
        {!branch && (
          <ChartCard title={t("branchPerformance")}>
            <HorizontalBarsChart data={branchCredits} />
          </ChartCard>
        )}
        <ChartCard title={t("studentsDistribution")}>
          <DistributionChart data={distribution} />
        </ChartCard>
        <ChartCard
          title={t("weekAttendance")}
          className="md:col-span-2 lg:col-span-1"
        >
          <WeekAttendanceChart data={weekRates} />
        </ChartCard>
      </div>

      <section className="mt-4 rounded-card border-2 border-line bg-card p-4 shadow-clay sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="grid size-8 place-items-center rounded-full bg-brick-soft text-brick">
              <TriangleAlert className="size-4" />
            </span>
            {t("followUp")}
          </h2>
          <p className="text-xs font-bold text-muted">
            {t("totalStudentsCount", {
              count: branch ? kb.criticalStudents : k.criticalStudents,
            })}
          </p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-line text-[11px] uppercase tracking-wide text-muted">
                <th className="px-3 py-2 font-bold">{t("colStudent")}</th>
                <th className="px-3 py-2 font-bold">{t("colBranch")}</th>
                <th className="px-3 py-2 font-bold">{t("colClass")}</th>
                <th className="px-3 py-2 font-bold">{t("colCredit")}</th>
                <th className="px-3 py-2 font-bold">{t("colExpired")}</th>
                <th className="px-3 py-2 font-bold">{t("colAlerts")}</th>
                <th className="px-3 py-2 font-bold">{t("colFollowUp")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line/70 last:border-0">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-soft text-xs font-bold text-navy ring-2 ring-card">
                        {row.name[0]}
                      </span>
                      <div>
                        <p className="font-bold text-ink">{row.name}</p>
                        <p className="text-[11px] text-muted">
                          {tc("idLabel", { id: row.id })}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {branchName(row.branchId)}
                  </td>
                  <td className="px-3 py-3 text-muted">{row.className}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-line">
                        <div
                          className={`h-full rounded-full ${
                            row.creditsLeft / row.creditsTotal < 0.25
                              ? "bg-brick"
                              : "bg-navy"
                          }`}
                          style={{
                            width: `${(row.creditsLeft / row.creditsTotal) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-ink">
                        {row.creditsLeft}/{row.creditsTotal}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted">{row.expireDate}</td>
                  <td className="px-3 py-3">
                    <StatusChip status={row.alert} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusChip status={row.followUp} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-right">
          <Link
            href={`${base}/students`}
            className="inline-flex items-center gap-1 text-xs font-bold text-navy hover:underline"
          >
            {tc("viewAll")}
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </section>
    </>
  );
}
