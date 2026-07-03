import { ClipboardList, CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/admin/PageHeader";

const inputCls =
  "w-20 rounded-xl border-2 border-line bg-card px-3 py-2 text-center text-sm font-bold text-ink outline-none transition-colors focus:border-navy/50";

function RuleRow({
  label,
  stamp,
  defaultValue,
  unit,
}: {
  label: string;
  stamp: string;
  defaultValue: number;
  unit: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-bold text-ink">{label}</p>
        <p className="text-[11px] text-muted">{stamp}</p>
      </div>
      <label className="flex items-center gap-2">
        <span className="sr-only">{label}</span>
        <input className={inputCls} type="number" min={1} defaultValue={defaultValue} />
        <span className="text-xs font-bold text-muted">{unit}</span>
      </label>
    </div>
  );
}

export default function SettingsPage() {
  const t = useTranslations("settingsPage");
  const stamp = t("updatedAt", { stamp: "12.5.26 | 9:10 AM" });

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <section className="mt-5 rounded-card border-2 border-line bg-card p-4 shadow-clay sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <CreditCard className="size-4 text-navy" />
          {t("creditRules")}
        </h2>
        <div className="mt-1 divide-y divide-line/70">
          <RuleRow
            label={t("lowCreditThreshold")}
            stamp={stamp}
            defaultValue={5}
            unit={t("credits")}
          />
          <RuleRow
            label={t("expiryThreshold")}
            stamp={stamp}
            defaultValue={10}
            unit={t("days")}
          />
        </div>
      </section>

      <section className="mt-4 rounded-card border-2 border-line bg-card p-4 shadow-clay sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ClipboardList className="size-4 text-navy" />
          {t("attendancePolicies")}
        </h2>
        <div className="mt-1">
          <RuleRow
            label={t("consecutiveMissed")}
            stamp={stamp}
            defaultValue={5}
            unit={t("classes")}
          />
        </div>
      </section>

      <div className="mt-5 text-right">
        <button
          type="button"
          className="cursor-pointer rounded-full bg-navy px-5 py-2 text-xs font-bold text-white shadow-clay transition-colors hover:bg-navy-deep"
        >
          {t("save")}
        </button>
      </div>
    </>
  );
}
