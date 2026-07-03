"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, ChevronDown, Sparkles } from "lucide-react";
import { branchName, branches } from "@/lib/super-data";

const inputCls =
  "mt-1 w-full rounded-xl border-2 border-line bg-card px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-navy/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-ink">{label}</span>
      {children}
    </label>
  );
}

function SelectInput({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative block">
      <select className={`${inputCls} cursor-pointer appearance-none pr-9`}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
    </span>
  );
}

export function AddStudentForm() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const t = useTranslations("addStudent");
  const tc = useTranslations("common");
  const tp = useTranslations("studentProfile");

  const guardianFields = (
    <>
      <Field label={t("phone")}>
        <input className={inputCls} placeholder={t("phonePlaceholder")} />
      </Field>
      <Field label={t("parentName")}>
        <input className={inputCls} placeholder={t("parentNamePlaceholder")} />
      </Field>
      <Field label={t("relationship")}>
        <SelectInput>
          <option value="">{t("relationshipPlaceholder")}</option>
          <option>{t("mother")}</option>
          <option>{t("father")}</option>
          <option>{t("guardian")}</option>
        </SelectInput>
      </Field>
      <Field label={t("email")}>
        <input className={inputCls} type="email" placeholder="name@example.com" />
      </Field>
    </>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/super/students"
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

      {submitted ? (
        <section className="mt-5 rounded-card border-2 border-line bg-card p-6 text-center shadow-clay">
          <span className="relative mx-auto grid size-14 place-items-center rounded-full bg-navy text-white">
            <Check className="size-7" />
            <Sparkles className="absolute -right-3 -top-2 size-5 text-navy" />
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold text-ink">
            {t("successTitle")}
          </h2>
          <div className="mx-auto mt-4 flex max-w-sm items-center gap-3 rounded-xl border-2 border-line bg-cream p-3.5 text-left">
            <span className="grid size-11 place-items-center rounded-full bg-navy-soft font-display font-semibold text-navy ring-2 ring-card">
              P
            </span>
            <div>
              <p className="text-sm font-bold text-ink">Penny</p>
              <p className="text-[11px] text-muted">
                {tc("idLabel", { id: "u6612127" })}
              </p>
              <p className="text-[11px] text-muted">
                {tp("levelAge", { level: "Beginner", age: 8 })}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/super/students")}
              className="cursor-pointer rounded-full border-2 border-line bg-card px-5 py-2 text-xs font-bold text-ink transition-colors hover:border-navy/40"
            >
              {t("finish")}
            </button>
            <Link
              href="/super/payments/new"
              className="rounded-full bg-navy px-5 py-2 text-xs font-bold text-white shadow-clay transition-colors hover:bg-navy-deep"
            >
              {t("recordPayment")}
            </Link>
          </div>
        </section>
      ) : (
        <form
          className="mt-5 rounded-card border-2 border-line bg-card p-5 shadow-clay sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <h2 className="text-sm font-semibold text-ink">{t("studentInfo")}</h2>
          <p className="text-[11px] text-muted">{t("studentInfoSub")}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label={t("studentId")}>
              <input className={inputCls} placeholder={t("studentIdPlaceholder")} />
            </Field>
            <Field label={t("branch")}>
              <SelectInput>
                <option value="">{t("branchPlaceholder")}</option>
                {branches.map((b) => (
                  <option key={b.id}>{branchName(b.id)}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label={t("firstName")}>
              <input className={inputCls} placeholder={t("firstNamePlaceholder")} />
            </Field>
            <Field label={t("lastName")}>
              <input className={inputCls} placeholder={t("lastNamePlaceholder")} />
            </Field>
            <Field label={t("gender")}>
              <SelectInput>
                <option value="">{t("genderPlaceholder")}</option>
                <option>{t("male")}</option>
                <option>{t("female")}</option>
              </SelectInput>
            </Field>
            <Field label={t("dob")}>
              <input className={inputCls} type="date" />
            </Field>
          </div>

          <h2 className="mt-6 border-t-2 border-line pt-5 text-sm font-semibold text-ink">
            {t("parentInfo")}
          </h2>
          <p className="text-[11px] text-muted">{t("parentInfoSub")}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">{guardianFields}</div>

          <h2 className="mt-6 border-t-2 border-line pt-5 text-sm font-semibold text-ink">
            {t("altGuardian")}
          </h2>
          <p className="text-[11px] text-muted">{t("altGuardianSub")}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">{guardianFields}</div>

          <div className="mt-6 flex flex-wrap justify-between gap-2">
            <Link
              href="/super/students"
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
      )}
    </div>
  );
}
