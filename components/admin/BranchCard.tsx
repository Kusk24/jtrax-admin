import Link from "next/link";
import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { CardMenu } from "./CardMenu";
import type { Branch } from "@/lib/admin-types";

export function BranchCard({
  branch,
  linked = true,
}: {
  branch: Branch;
  linked?: boolean;
}) {
  const t = useTranslations("branchesPage");
  const tc = useTranslations("common");
  const stats = [
    { label: t("totalStudents"), value: String(branch.students) },
    { label: t("totalTeachers"), value: String(branch.teachers) },
    { label: t("creditSold"), value: branch.creditsSold },
    { label: t("revenue"), value: branch.revenue },
  ];
  return (
    <article className="rounded-card border-2 border-line bg-card p-4 shadow-clay">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-olive-soft text-olive">
          <Building2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold text-ink">
            {linked ? (
              <Link
                href={`/super/branches/${branch.id}`}
                className="hover:underline"
              >
                {branch.name}
              </Link>
            ) : (
              branch.name
            )}
          </h2>
          <p className="text-[11px] text-muted">
            {t("manager", { name: branch.managerName })}
          </p>
        </div>
        <CardMenu
          label={tc("options")}
          items={[
            { label: t("edit"), kind: "edit" },
            { label: t("remove"), kind: "remove" },
          ]}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-cream px-3 py-2.5 text-center">
            <p className="text-[10px] font-bold text-muted">{s.label}</p>
            <p className="font-display text-lg font-semibold text-ink">
              {s.value}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-bold text-muted">{t("managedBy")}</p>
      <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border-2 border-navy-soft p-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-soft text-xs font-bold text-navy ring-2 ring-card">
          {branch.managerName.replace("Mr. ", "")[0]}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">
            {branch.managerName}
          </p>
          <p className="truncate text-[11px] text-muted">
            {branch.phone} · {branch.email}
          </p>
        </div>
      </div>
    </article>
  );
}
