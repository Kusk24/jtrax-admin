import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Plus,
  Search,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusChip } from "@/components/admin/StatusChip";
import { branchName, branches, followUps } from "@/lib/super-data";

const statusKeys = ["expiring", "lowCredit", "healthy", "expired"] as const;

export default function StudentsPage() {
  const t = useTranslations("studentsPage");
  const td = useTranslations("dash");
  const ts = useTranslations("status");
  const tc = useTranslations("common");

  const filterCls =
    "cursor-pointer appearance-none rounded-full border-2 border-line bg-card py-2 pl-4 pr-9 text-xs font-bold text-ink outline-none transition-colors focus:border-navy/50";

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Link
            href="/super/students/new"
            className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white shadow-clay transition-colors hover:bg-navy-deep"
          >
            <Plus className="size-4" />
            {t("add")}
          </Link>
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
          <span className="sr-only">{td("colBranch")}</span>
          <select className={filterCls}>
            <option>{td("colBranch")}</option>
            {branches.map((b) => (
              <option key={b.id}>{branchName(b.id)}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
        </label>
        <label className="relative block">
          <span className="sr-only">{t("statusFilter")}</span>
          <select className={filterCls}>
            <option>{t("statusFilter")}</option>
            {statusKeys.map((key) => (
              <option key={key}>{ts(key)}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
        </label>
      </div>
      <p className="mt-3 text-right text-xs font-bold text-muted">
        {t("total", { count: 200 })}
      </p>
      <div className="mt-1 overflow-x-auto rounded-card border-2 border-line bg-card shadow-clay">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b-2 border-line text-[11px] uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5 font-bold">{td("colStudent")}</th>
              <th className="px-4 py-2.5 font-bold">{td("colBranch")}</th>
              <th className="px-4 py-2.5 font-bold">{td("colClass")}</th>
              <th className="px-4 py-2.5 font-bold">
                <span className="inline-flex items-center gap-1">
                  {td("colCredit")}
                  <ChevronsUpDown className="size-3" />
                </span>
              </th>
              <th className="px-4 py-2.5 font-bold">{td("colExpired")}</th>
              <th className="px-4 py-2.5 font-bold">{td("colAlerts")}</th>
              <th className="px-4 py-2.5 font-bold">{td("colFollowUp")}</th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {followUps.map((row) => (
              <tr key={row.id} className="border-b border-line/70 last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/super/students/${row.id}`}
                    className="flex items-center gap-2.5"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-soft text-xs font-bold text-navy ring-2 ring-card">
                      {row.name[0]}
                    </span>
                    <span>
                      <span className="block font-bold text-ink hover:underline">
                        {row.name}
                      </span>
                      <span className="block text-[11px] text-muted">
                        {tc("idLabel", { id: row.id })}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">
                  {branchName(row.branchId)}
                </td>
                <td className="px-4 py-3 text-muted">{row.className}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
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
                <td className="px-4 py-3 text-muted">{row.expireDate}</td>
                <td className="px-4 py-3">
                  <StatusChip status={row.alert} />
                </td>
                <td className="px-4 py-3">
                  <StatusChip status={row.followUp} />
                </td>
                <td className="px-2 py-3 text-muted">
                  <ChevronRight className="size-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
