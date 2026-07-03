import { Mail, Phone, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/admin/PageHeader";
import { CardMenu } from "@/components/admin/CardMenu";
import { branchAdmins, branchName } from "@/lib/super-data";

export default function BranchAdminsPage() {
  const t = useTranslations("admins");
  const tc = useTranslations("common");
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
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {branchAdmins.map((admin) => (
          <article
            key={admin.id}
            className="relative rounded-card border-2 border-line bg-card p-5 text-center shadow-clay"
          >
            <div className="absolute right-3 top-3">
              <CardMenu
                label={tc("options")}
                items={[
                  { label: tc("edit"), kind: "edit" },
                  { label: t("remove"), kind: "remove" },
                ]}
              />
            </div>
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-navy-soft font-display text-xl font-semibold text-navy ring-2 ring-card">
              {admin.name.replace("Mr. ", "")[0]}
            </span>
            <h2 className="mt-3 text-sm font-bold text-ink">{admin.name}</h2>
            <p className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-muted">
              <Phone className="size-3" />
              {admin.phone}
              <span aria-hidden>|</span>
              <Mail className="size-3" />
              {admin.email}
            </p>
            <p className="mt-3 rounded-xl border-2 border-line bg-cream px-3 py-2 text-xs font-bold text-ink">
              {t("roleChip", { branch: branchName(admin.branchId) })}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
