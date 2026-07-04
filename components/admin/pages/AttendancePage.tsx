import {
  CalendarDays,
  ChevronsUpDown,
  Clock,
  RefreshCw,
  Search,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/admin/PageHeader";
import { RowDetails } from "@/components/admin/RowDetails";
import { DetailTabs } from "@/components/admin/DetailTabs";
import { AlertsPanel } from "@/components/admin/AlertsPanel";
import { GroupedBarsChart } from "@/components/admin/DashboardCharts";
import { PawnIcon } from "@/components/admin/PawnIcon";
import { branchChartColor } from "@/lib/chart-colors";
import {
  attendanceHistory,
  branchName,
  dailyAttendance,
} from "@/lib/super-data";
import type { BranchId } from "@/lib/admin-types";

export function AttendancePage({ branch }: { branch?: BranchId }) {
  const t = useTranslations("attendancePage");
  const td = useTranslations("days");
  const tc = useTranslations("common");

  const kpis = [
    { value: "91%", label: t("overallRate"), sub: t("thisWeek", { pct: "+10%" }) },
    { value: "20", label: t("sessions"), sub: td("today") },
    { value: "2", label: t("absentStudents"), sub: t("needAttention") },
  ];

  const chartData = dailyAttendance.map((d) => ({ ...d, label: td(d.day) }));
  const historyRows = branch
    ? attendanceHistory.filter((r) => r.branchId === branch)
    : attendanceHistory;
  const branchIds: BranchId[] = branch ? [branch] : ["onnut", "bangkok", "bangbo"];
  const series = branchIds.map((id) => ({
    key: id,
    label: branchName(id),
    color: branchChartColor[id],
  }));

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {kpis.map(({ value, label, sub }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-card border-2 border-line bg-card p-4 shadow-clay"
          >
            <p className="font-display text-2xl font-semibold text-ink">
              {value}
            </p>
            <div>
              <p className="text-xs font-bold text-ink">{label}</p>
              <p className="text-[11px] text-muted">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <DetailTabs
          tabs={[
            {
              key: "overview",
              label: t("tabOverview"),
              content: (
                <section className="rounded-card border-2 border-line bg-card p-4 shadow-clay">
                  <h2 className="text-sm font-semibold text-ink">
                    {t("dailyAttendance")}
                  </h2>
                  <div className="mt-3">
                    <GroupedBarsChart data={chartData} series={series} />
                  </div>
                </section>
              ),
            },
            {
              key: "history",
              label: t("tabHistory"),
              content: (
                <div>
                  <div>
                    <label className="relative block sm:max-w-56">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                      <input
                        className="w-full rounded-full border-2 border-line bg-card py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-navy/50"
                        placeholder={tc("search")}
                      />
                    </label>
                    <div className="mt-3 overflow-x-auto rounded-card border-2 border-line bg-card shadow-clay">
                      <table className="w-full min-w-[560px] text-left text-sm">
                        <thead>
                          <tr className="border-b-2 border-line text-[11px] uppercase tracking-wide text-muted">
                            <th className="px-4 py-2.5 font-bold">{t("colDate")}</th>
                            <th className="px-4 py-2.5 font-bold">
                              {t("colBranch")}
                            </th>
                            <th className="px-4 py-2.5 font-bold">{t("colClass")}</th>
                            <th className="px-4 py-2.5 font-bold">
                              {t("colPresent")}
                            </th>
                            <th className="px-4 py-2.5 font-bold">
                              {t("colAbsent")}
                            </th>
                            <th className="px-4 py-2.5 font-bold">
                              <span className="inline-flex items-center gap-1">
                                {t("colRate")}
                                <ChevronsUpDown className="size-3" />
                              </span>
                            </th>
                            <th className="px-2 py-2.5" />
                          </tr>
                        </thead>
                        <tbody>
                          {historyRows.map((row) => (
                            <tr
                              key={row.id}
                              className="border-b border-line/70 last:border-0"
                            >
                              <td className="px-4 py-3 text-muted">{row.date}</td>
                              <td className="px-4 py-3 text-muted">
                                {branchName(row.branchId)}
                              </td>
                              <td className="px-4 py-3 text-muted">
                                {row.className}
                              </td>
                              <td className="px-4 py-3 font-bold text-ink">
                                {row.present}
                              </td>
                              <td className="px-4 py-3 font-bold text-ink">
                                {row.absent}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                    row.rate >= 80
                                      ? "bg-olive-soft text-ink"
                                      : "bg-brick-soft text-maroon"
                                  }`}
                                >
                                  {row.rate}%
                                </span>
                              </td>
                              <td className="px-2 py-3">
                                <RowDetails
                                  title={`${row.className}`}
                                  subtitle={`${branchName(row.branchId)} · ${row.date}`}
                                  fields={[
                                    { label: t("colPresent"), value: String(row.present) },
                                    { label: t("colAbsent"), value: String(row.absent) },
                                    { label: t("colRate"), value: `${row.rate}%` },
                                  ]}
                                >
                                  <div className="rounded-xl border-2 border-line p-3.5">
                                    <p className="flex items-center gap-2 text-xs font-bold text-ink">
                                      <span className="grid size-8 place-items-center rounded-lg bg-brick-soft text-brick">
                                        <PawnIcon className="size-4" />
                                      </span>
                                      Ms. Serene
                                      <span className="rounded-full bg-navy-soft px-1.5 py-0.5 text-[10px] font-bold text-navy">
                                        {t("teacherChip")}
                                      </span>
                                    </p>
                                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                                      <CalendarDays className="size-3" />
                                      Mon 22 Mar 2026
                                    </p>
                                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                                      <Clock className="size-3" />
                                      9:00 AM - 10:00 AM
                                    </p>
                                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                                      <RefreshCw className="size-3" />
                                      {t("updatedAt", { time: "9:15 AM" })}
                                    </p>
                                    <p className="mt-3 text-xs font-bold text-olive">
                                      {t("presentCount", { count: row.present })}
                                    </p>
                                    <div className="mt-1.5 rounded-xl border-2 border-olive-soft p-2.5">
                                      <p className="flex items-center gap-2 text-xs font-bold text-ink">
                                        <span className="grid size-7 place-items-center rounded-full bg-navy-soft text-[10px] font-bold text-navy ring-2 ring-card">
                                          S
                                        </span>
                                        Scarlet
                                      </p>
                                      <p className="mt-1.5 text-right text-[11px] font-bold text-navy">
                                        {tc("viewAll")}
                                      </p>
                                    </div>
                                    <p className="mt-3 text-xs font-bold text-brick">
                                      {t("absentCount", { count: row.absent })}
                                    </p>
                                    <div className="mt-1.5 rounded-xl border-2 border-brick-soft p-2.5">
                                      <p className="flex items-center gap-2 text-xs font-bold text-ink">
                                        <span className="grid size-7 place-items-center rounded-full bg-brick-soft text-[10px] font-bold text-maroon ring-2 ring-card">
                                          P
                                        </span>
                                        Penny
                                      </p>
                                    </div>
                                  </div>
                                </RowDetails>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "alerts",
              label: t("tabAlerts"),
              content: <AlertsPanel branch={branch} />,
            },
          ]}
        />
      </div>
    </>
  );
}
