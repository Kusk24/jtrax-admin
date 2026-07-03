import { TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/admin/PageHeader";

export default function ReportsPage() {
  const t = useTranslations("reportsPage");
  return (
    <>
      <PageHeader title={t("title")} />
      <div className="mt-5 grid place-items-center rounded-card border-2 border-dashed border-line bg-card p-10 text-center shadow-clay">
        <span className="grid size-12 place-items-center rounded-2xl bg-navy-soft text-navy">
          <TrendingUp className="size-6" />
        </span>
        <p className="mt-3 max-w-sm text-sm text-muted">{t("comingSoon")}</p>
      </div>
    </>
  );
}
