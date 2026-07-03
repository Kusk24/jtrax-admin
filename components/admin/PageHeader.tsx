import { FileDown } from "lucide-react";
import { useTranslations } from "next-intl";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const t = useTranslations("common");
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border-2 border-line bg-card px-4 py-2 text-xs font-bold text-navy shadow-clay transition-colors hover:border-navy/40"
        >
          <FileDown className="size-4" />
          {t("exportPdf")}
        </button>
      </div>
    </div>
  );
}
