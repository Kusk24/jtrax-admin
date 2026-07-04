"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, SquarePen, Trash2, X } from "lucide-react";

/** Chevron trigger + detail modal for a table row. Edit/Remove are visual-only
    until the backend exists. */
export function RowDetails({
  title,
  subtitle,
  fields,
  children,
}: {
  title: string;
  subtitle?: string;
  fields: { label: string; value: string }[];
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const tc = useTranslations("common");

  return (
    <>
      <button
        type="button"
        aria-label={tc("viewDetails")}
        onClick={() => setOpen(true)}
        className="grid size-8 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-cream hover:text-ink"
      >
        <ChevronRight className="size-4" />
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
            className="relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-2 border-line bg-card p-5 shadow-clay-lg sm:rounded-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">
                  {title}
                </h2>
                {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
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
            <dl className="mt-4 grid gap-2.5">
              {fields.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center justify-between gap-3 border-b border-line/60 pb-2 last:border-0"
                >
                  <dt className="text-xs font-bold text-muted">{f.label}</dt>
                  <dd className="text-right text-sm font-bold text-ink">
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
            {children && <div className="mt-4">{children}</div>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-line bg-card px-4 py-2 text-xs font-bold text-ink transition-colors hover:border-navy/40"
              >
                <SquarePen className="size-3.5" />
                {tc("edit")}
              </button>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-brick px-4 py-2 text-xs font-bold text-white shadow-clay transition-colors hover:brightness-110"
              >
                <Trash2 className="size-3.5" />
                {tc("remove")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
