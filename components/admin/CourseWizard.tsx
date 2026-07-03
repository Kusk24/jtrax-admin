"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Minus,
  Plus,
  Presentation,
} from "lucide-react";
import { PawnIcon } from "./PawnIcon";
import { branches } from "@/lib/super-data";
import type { BranchId } from "@/lib/admin-types";

const inputCls =
  "mt-1 w-full rounded-xl border-2 border-line bg-card px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-navy/50";

const iconTones = [
  "bg-navy-soft text-navy",
  "bg-brick-soft text-maroon",
  "bg-olive-soft text-olive",
];

const teachers = ["Ms. Serene", "Ms. Matalada"];

/* Fake per-branch section numbering to mirror the mock (Bangkok 10x, Onnut 20x, Bangbo 30x). */
const sectionBase: Record<BranchId, number> = {
  bangkok: 104,
  onnut: 204,
  bangbo: 304,
};

interface SectionDraft {
  key: string;
  label: string;
}

export function CourseWizard({
  base = "/super",
  branchScope,
}: {
  base?: string;
  branchScope?: BranchId;
}) {
  const router = useRouter();
  const t = useTranslations("wizard");
  const tc = useTranslations("common");
  const branchOptions = branchScope
    ? branches.filter((b) => b.id === branchScope)
    : branches;

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(0);
  const [counts, setCounts] = useState<Record<BranchId, number>>({
    bangkok: 2,
    onnut: 0,
    bangbo: 0,
  });
  const [setup, setSetup] = useState<
    Record<string, { schedule: string; teacher: string }>
  >({});

  const steps = [
    t("stepBasic"),
    t("stepBranches"),
    t("stepSetup"),
    t("stepConfirm"),
  ];

  const sections: SectionDraft[] = (
    Object.entries(counts) as [BranchId, number][]
  ).flatMap(([branchId, count]) => {
    const branch = branches.find((b) => b.id === branchId);
    if (!branch || count < 1) return [];
    return Array.from({ length: count }, (_, i) => {
      const num = sectionBase[branchId] + i;
      return { key: `${branchId}-${num}`, label: `${branch.name} - Section ${num}` };
    });
  });

  const setCount = (id: BranchId, next: number) =>
    setCounts((c) => ({ ...c, [id]: Math.max(0, Math.min(9, next)) }));

  return (
    <div className="mx-auto max-w-2xl rounded-card border-2 border-line bg-card p-5 shadow-clay sm:p-6">
      <h1 className="font-display text-lg font-semibold text-ink">
        {t("title")}
      </h1>

      <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
        {steps.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`grid size-6 place-items-center rounded-full border-2 text-[11px] font-bold ${
                i < step
                  ? "border-navy bg-navy text-white"
                  : i === step
                    ? "border-navy text-navy"
                    : "border-line text-muted"
              }`}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={`text-xs font-bold ${i === step ? "text-navy" : "text-muted"}`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden className="hidden w-6 border-t-2 border-dashed border-line sm:block" />
            )}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold text-ink">{t("classNameLabel")}</span>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Introduction"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-ink">{t("levelLabel")}</span>
            <span className="relative block">
              <select className={`${inputCls} cursor-pointer appearance-none pr-9`}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advance</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            </span>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-ink">{t("capacityLabel")}</span>
            <input className={inputCls} type="number" defaultValue={20} min={1} />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-ink">{t("descriptionLabel")}</span>
            <input
              className={inputCls}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
            />
          </label>
          <div className="sm:col-span-2">
            <p className="text-xs font-bold text-ink">{t("iconLabel")}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {iconTones.map((tone, i) => (
                <button
                  key={tone}
                  type="button"
                  aria-pressed={icon === i}
                  onClick={() => setIcon(i)}
                  className={`grid size-10 cursor-pointer place-items-center rounded-xl border-2 transition-colors ${tone} ${
                    icon === i ? "border-navy" : "border-line"
                  }`}
                >
                  <PawnIcon className="size-5" />
                </button>
              ))}
              <button
                type="button"
                className="cursor-pointer rounded-xl border-2 border-line px-3 py-2 text-xs font-bold text-muted transition-colors hover:border-navy/40 hover:text-ink"
              >
                {t("custom")}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mt-5">
          <p className="text-xs font-bold text-ink">{t("selectBranches")}</p>
          <div className="mt-3 grid gap-2.5">
            {branchOptions.map((branch) => {
              const count = counts[branch.id];
              return (
                <div
                  key={branch.id}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border-2 px-3 py-2.5 transition-colors ${
                    count > 0 ? "border-navy/50" : "border-line"
                  }`}
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-2.5 text-sm font-bold text-ink">
                    <input
                      type="checkbox"
                      className="size-4 accent-navy"
                      checked={count > 0}
                      onChange={(e) => setCount(branch.id, e.target.checked ? 1 : 0)}
                    />
                    {branch.name}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted">{t("sectionsLabel")}</span>
                    <button
                      type="button"
                      aria-label={t("moreSections", { branch: branch.name })}
                      onClick={() => setCount(branch.id, count + 1)}
                      className="grid size-7 cursor-pointer place-items-center rounded-lg border-2 border-line text-ink transition-colors hover:border-navy/40"
                    >
                      <Plus className="size-3.5" />
                    </button>
                    <span className="grid size-7 place-items-center rounded-lg border-2 border-line text-xs font-bold text-ink">
                      {count || ""}
                    </span>
                    <button
                      type="button"
                      aria-label={t("fewerSections", { branch: branch.name })}
                      onClick={() => setCount(branch.id, count - 1)}
                      className="grid size-7 cursor-pointer place-items-center rounded-lg border-2 border-line text-ink transition-colors hover:border-navy/40"
                    >
                      <Minus className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-5">
          <p className="text-xs font-bold text-ink">{t("stepSetup")}</p>
          <div className="mt-3 grid gap-3 rounded-xl border-2 border-line p-3.5">
            {sections.map((section) => {
              const entry = setup[section.key] ?? { schedule: "", teacher: "" };
              const update = (patch: Partial<typeof entry>) =>
                setSetup((s) => ({ ...s, [section.key]: { ...entry, ...patch } }));
              return (
                <div key={section.key}>
                  <p className="flex items-center gap-2 text-sm font-bold text-ink">
                    <span aria-hidden className="size-2 rounded-full bg-navy" />
                    {section.label}
                  </p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-bold text-muted">
                        {t("scheduleLabel")}
                      </span>
                      <input
                        className={inputCls}
                        value={entry.schedule}
                        onChange={(e) => update({ schedule: e.target.value })}
                        placeholder="Mon, Wed (9:00 - 10:00 AM)"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-muted">
                        {t("assignTeacher")}
                      </span>
                      <span className="relative block">
                        <select
                          className={`${inputCls} cursor-pointer appearance-none pr-9`}
                          value={entry.teacher}
                          onChange={(e) => update({ teacher: e.target.value })}
                        >
                          <option value="">{t("teacherPlaceholder")}</option>
                          {teachers.map((teacher) => (
                            <option key={teacher} value={teacher}>
                              {teacher}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                      </span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-5">
          <p className="text-xs font-bold text-ink">{t("confirmTitle")}</p>
          <div className="mt-3 rounded-xl border-2 border-line p-4">
            <div className="flex items-center gap-2.5">
              <span
                className={`grid size-9 place-items-center rounded-xl ${iconTones[icon]}`}
              >
                <PawnIcon className="size-5" />
              </span>
              <h2 className="text-sm font-bold text-ink">
                {name || "Introduction"}
              </h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {description || t("descriptionPlaceholder")}
            </p>
            <div className="mt-3 grid gap-3">
              {sections.map((section) => {
                const entry = setup[section.key];
                return (
                  <div key={section.key}>
                    <p className="flex items-center gap-2 text-sm font-bold text-ink">
                      <span aria-hidden className="size-2 rounded-full bg-navy" />
                      {section.label}
                    </p>
                    <p className="ml-4 mt-1 flex items-center gap-1.5 text-xs text-muted">
                      <CalendarDays className="size-3.5" />
                      {entry?.schedule || "–"}
                    </p>
                    <p className="ml-4 mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <Presentation className="size-3.5" />
                      {entry?.teacher || "–"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() =>
            step === 0 ? router.push(`${base}/courses`) : setStep(step - 1)
          }
          className="cursor-pointer rounded-full border-2 border-line bg-card px-5 py-2 text-xs font-bold text-ink transition-colors hover:border-navy/40"
        >
          {step === 0 ? tc("cancel") : tc("back")}
        </button>
        <button
          type="button"
          onClick={() =>
            step === 3 ? router.push(`${base}/courses`) : setStep(step + 1)
          }
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-navy px-5 py-2 text-xs font-bold text-white shadow-clay transition-colors hover:bg-navy-deep"
        >
          {step === 3 ? t("confirm") : t("next")}
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
