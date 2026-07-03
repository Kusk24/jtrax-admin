"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Copy, Plus, X } from "lucide-react";
import { branchAdmins, branches } from "@/lib/super-data";

const inputCls =
  "mt-1 w-full rounded-xl border-2 border-line bg-card px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-navy/50";
const selectCls = `${inputCls} cursor-pointer appearance-none pr-9`;

function SelectField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-ink">{label}</span>
      <span className="relative block">
        <select className={selectCls}>{children}</select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
      </span>
    </label>
  );
}

export function AddBranchModal() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("branchesPage");
  const tc = useTranslations("common");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white shadow-clay transition-colors hover:bg-navy-deep"
      >
        <Plus className="size-4" />
        {t("add")}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label={tc("cancel")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-pointer bg-ink/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border-2 border-line bg-card p-5 shadow-clay-lg sm:rounded-card sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">
                  {t("modalTitle")}
                </h2>
                <p className="mt-1 text-xs text-muted">{t("modalSubtitle")}</p>
              </div>
              <button
                type="button"
                aria-label={tc("cancel")}
                onClick={() => setOpen(false)}
                className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl border-2 border-line text-muted transition-colors hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>
            <form
              className="mt-4 grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                setOpen(false);
              }}
            >
              <label className="block">
                <span className="text-xs font-bold text-ink">
                  {t("nameLabel")}
                </span>
                <input className={inputCls} placeholder={t("namePlaceholder")} />
              </label>
              <SelectField label={t("managerLabel")}>
                <option value="">{t("managerPlaceholder")}</option>
                {branchAdmins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </SelectField>
              <label className="block">
                <span className="text-xs font-bold text-ink">
                  {t("contactLabel")}
                </span>
                <input className={inputCls} placeholder="+66" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-ink">
                  {t("addressLabel")}
                </span>
                <input className={inputCls} placeholder="Bearing 3" />
              </label>
              <div className="border-t-2 border-line pt-4 sm:col-span-2">
                <div className="grid gap-4 sm:max-w-xs">
                  <SelectField label={t("cloneLabel")}>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                  {(["cloneClasses", "cloneTimetables", "cloneTeachers"] as const).map(
                    (key) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center gap-2 text-sm text-ink"
                      >
                        <input type="checkbox" className="size-4 accent-navy" />
                        {t(key)}
                      </label>
                    ),
                  )}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer rounded-full border-2 border-line bg-card px-4 py-2 text-xs font-bold text-ink transition-colors hover:border-navy/40"
                >
                  {tc("cancel")}
                </button>
                <button
                  type="submit"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white shadow-clay transition-colors hover:bg-navy-deep"
                >
                  <Copy className="size-4" />
                  {t("cloneBranch")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
