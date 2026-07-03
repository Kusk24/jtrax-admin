"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ChevronDown, Plus } from "lucide-react";

const inputCls =
  "mt-1 w-full rounded-xl border-2 border-line bg-card px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-navy/50";

const children = [
  { id: "u6612127", name: "Penny" },
  { id: "u6612128", name: "Uri" },
];
const courseOptions = ["Chess 1", "Art"];
const sectionOptions = ["Beginner · Section 101", "Foundation Art · Section 201"];

interface Allocation {
  key: number;
  student: string;
  credits: number;
  amount: number;
}

function Field({ label, children: node }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-ink">{label}</span>
      {node}
    </label>
  );
}

function SelectInput({
  value,
  onChange,
  children: options,
}: {
  value?: string;
  onChange?: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <span className="relative block">
      <select
        className={`${inputCls} cursor-pointer appearance-none pr-9`}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      >
        {options}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
    </span>
  );
}

export function AddPaymentForm() {
  const router = useRouter();
  const t = useTranslations("addPayment");
  const tp = useTranslations("paymentsPage");
  const tc = useTranslations("common");

  const [allocations, setAllocations] = useState<Allocation[]>([
    { key: 1, student: "u6612127", credits: 20, amount: 2000 },
    { key: 2, student: "u6612128", credits: 20, amount: 2000 },
  ]);

  const update = (key: number, patch: Partial<Allocation>) =>
    setAllocations((list) =>
      list.map((a) => (a.key === key ? { ...a, ...patch } : a)),
    );

  const totalCredits = allocations.reduce((sum, a) => sum + (a.credits || 0), 0);
  const totalAmount = allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
  const childCount = new Set(allocations.map((a) => a.student)).size;

  const sectionTitle = "text-sm font-semibold text-ink";
  const sectionSub = "text-[11px] text-muted";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/super/payments"
          aria-label={tc("back")}
          className="grid size-9 place-items-center rounded-xl border-2 border-line text-navy transition-colors hover:border-navy/40"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-semibold text-navy">
            {t("title")}
          </h1>
          <p className="text-xs text-muted">{t("subtitle")}</p>
        </div>
      </div>

      <form
        className="mt-5 rounded-card border-2 border-line bg-card p-5 shadow-clay sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          router.push("/super/payments");
        }}
      >
        <h2 className={sectionTitle}>{t("fromTitle")}</h2>
        <p className={sectionSub}>{t("fromSub")}</p>
        <div className="mt-3">
          <Field label={t("paidBy")}>
            <SelectInput>
              <option>Sandy Jones</option>
              <option>Mile Jones</option>
            </SelectInput>
          </Field>
          <p className="mt-1 text-[11px] text-muted">{t("paidByNote")}</p>
        </div>

        <h2 className={`${sectionTitle} mt-6 border-t-2 border-line pt-5`}>
          {t("allocTitle")}
        </h2>
        <p className={sectionSub}>{t("allocSub")}</p>
        <div className="mt-3 grid gap-3">
          {allocations.map((alloc, i) => (
            <div
              key={alloc.key}
              className="rounded-xl border-2 border-line bg-cream/60 p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-xs font-bold text-ink">
                  <span className="grid size-5 place-items-center rounded-full bg-navy text-[10px] text-white">
                    {i + 1}
                  </span>
                  {t("allocLabel")}
                </p>
                {allocations.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setAllocations((list) =>
                        list.filter((a) => a.key !== alloc.key),
                      )
                    }
                    className="cursor-pointer text-[11px] font-bold text-brick hover:underline"
                  >
                    {t("remove")}
                  </button>
                )}
              </div>
              <div className="mt-3 grid gap-3">
                <div>
                  <Field label={t("studentLabel")}>
                    <SelectInput
                      value={alloc.student}
                      onChange={(v) => update(alloc.key, { student: v })}
                    >
                      {children.map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.name} · ID {child.id}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <p className="mt-1 text-[11px] text-muted">{t("studentNote")}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("courseLabel")}>
                    <SelectInput>
                      {courseOptions.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label={t("sectionLabel")}>
                    <SelectInput>
                      {sectionOptions.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </SelectInput>
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label={t("creditsLabel")}>
                    <input
                      className={inputCls}
                      type="number"
                      min={0}
                      value={alloc.credits}
                      onChange={(e) =>
                        update(alloc.key, { credits: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label={t("amountLabel")}>
                    <input
                      className={inputCls}
                      type="number"
                      min={0}
                      value={alloc.amount}
                      onChange={(e) =>
                        update(alloc.key, { amount: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label={t("expirationLabel")}>
                    <input className={inputCls} type="date" />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setAllocations((list) => [
              ...list,
              {
                key: Math.max(...list.map((a) => a.key)) + 1,
                student: children[0].id,
                credits: 20,
                amount: 2000,
              },
            ])
          }
          className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line py-2 text-xs font-bold text-muted transition-colors hover:border-navy/40 hover:text-navy"
        >
          <Plus className="size-3.5" />
          {t("addAlloc")}
        </button>

        <h2 className={`${sectionTitle} mt-6 border-t-2 border-line pt-5`}>
          {t("txTitle")}
        </h2>
        <p className={sectionSub}>{t("txSub")}</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <Field label={t("paymentDate")}>
            <input className={inputCls} type="date" />
          </Field>
          <Field label={t("paymentMethod")}>
            <SelectInput>
              <option>{tp("onlineBanking")}</option>
              <option>{tp("cash")}</option>
              <option>{tp("card")}</option>
            </SelectInput>
          </Field>
          <Field label={t("recordedBy")}>
            <SelectInput>
              <option>Ms. Serene</option>
              <option>Ms. Matalada</option>
            </SelectInput>
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("reference")}>
              <input className={inputCls} placeholder="TXN-20260823-001" />
            </Field>
          </div>
          <Field label={t("note")}>
            <input className={inputCls} placeholder={t("notePlaceholder")} />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-navy-soft px-4 py-3">
          <div>
            <p className="text-xs font-bold text-navy">{t("summaryTitle")}</p>
            <p className="text-[11px] text-navy/80">
              {t("summaryLine", {
                children: childCount,
                courses: allocations.length,
                credits: totalCredits,
              })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-navy/70">
              {t("totalAmount")}
            </p>
            <p className="font-display text-lg font-semibold text-navy">
              ฿{totalAmount.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-between gap-2">
          <Link
            href="/super/payments"
            className="rounded-full border-2 border-line bg-card px-5 py-2 text-xs font-bold text-ink transition-colors hover:border-navy/40"
          >
            {tc("cancel")}
          </Link>
          <button
            type="submit"
            className="cursor-pointer rounded-full bg-navy px-5 py-2 text-xs font-bold text-white shadow-clay transition-colors hover:bg-navy-deep"
          >
            {t("submit")}
          </button>
        </div>
      </form>
    </div>
  );
}
