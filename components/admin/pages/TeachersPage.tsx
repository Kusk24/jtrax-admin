import { ChevronDown, ChevronsUpDown, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/admin/PageHeader";
import { RowDetails } from "@/components/admin/RowDetails";
import { branchName, branches, teacherRows } from "@/lib/super-data";
import type { BranchId } from "@/lib/admin-types";

export function TeachersPage({ branch }: { branch?: BranchId }) {
  const t = useTranslations("teachersPage");
  const tc = useTranslations("common");
  const rows = branch
    ? teacherRows.filter((r) => r.branchIds.includes(branch))
    : teacherRows;
  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white shadow-clay transition-colors hover:bg-navy-deep"
          >
            <Plus className="size-4" />
            {t("add")}
          </button>
        }
      />
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 sm:max-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            className="w-full rounded-full border-2 border-line bg-card py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-navy/50"
            placeholder={tc("search")}
          />
        </label>
        <label className="relative block">
          <span className="sr-only">{t("colBranch")}</span>
          <select className="cursor-pointer appearance-none rounded-full border-2 border-line bg-card py-2 pl-4 pr-9 text-xs font-bold text-ink outline-none transition-colors focus:border-navy/50">
            <option>{t("colBranch")}</option>
            {branches.map((b) => (
              <option key={b.id}>{branchName(b.id)}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
        </label>
      </div>
      <p className="mt-3 text-right text-xs font-bold text-muted">
        {t("total", { count: rows.length })}
      </p>
      <div className="mt-1 overflow-x-auto rounded-card border-2 border-line bg-card shadow-clay">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b-2 border-line text-[11px] uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5 font-bold">{t("colTeacher")}</th>
              <th className="px-4 py-2.5 font-bold">{t("colBranch")}</th>
              <th className="px-4 py-2.5 font-bold">{t("colClass")}</th>
              <th className="px-4 py-2.5 font-bold">
                <span className="inline-flex items-center gap-1">
                  {t("colWeeklyHours")}
                  <ChevronsUpDown className="size-3" />
                </span>
              </th>
              <th className="px-4 py-2.5 font-bold">
                <span className="inline-flex items-center gap-1">
                  {t("colCredits")}
                  <ChevronsUpDown className="size-3" />
                </span>
              </th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line/70 last:border-0">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-peach text-xs font-bold text-peach-ink ring-2 ring-card">
                      {row.name[0]}
                    </span>
                    <span className="font-bold text-ink">{row.name}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{row.branches}</td>
                <td className="px-4 py-3 text-muted">{row.classes}</td>
                <td className="px-4 py-3 font-bold text-ink">{row.weeklyHours}</td>
                <td className="px-4 py-3 font-bold text-ink">
                  {row.creditsConsumed}
                </td>
                <td className="px-2 py-3">
                  <RowDetails
                    title={row.name}
                    fields={[
                      { label: t("colBranch"), value: row.branches },
                      { label: t("colClass"), value: row.classes },
                      { label: t("colWeeklyHours"), value: row.weeklyHours },
                      { label: t("colCredits"), value: String(row.creditsConsumed) },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
