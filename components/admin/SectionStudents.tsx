"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Presentation,
  TriangleAlert,
  Users,
} from "lucide-react";
import { PawnIcon } from "./PawnIcon";
import { StatusChip } from "./StatusChip";
import { branchName, courseSections, followUps } from "@/lib/super-data";

/* Which mock students sit in which section. */
const sectionStudentIds: Record<string, string[]> = {
  sec101: ["u6612128", "u6612129", "u6612130"],
  sec301: ["u6612127"],
};

const sectionTone: Record<string, string> = {
  sec101: "bg-navy-soft text-navy",
  sec301: "bg-olive-soft text-olive",
};

export function SectionStudents() {
  const [active, setActive] = useState(courseSections[0].id);
  const t = useTranslations("courseDetail");
  const tdash = useTranslations("dash");
  const tc = useTranslations("common");

  const section = courseSections.find((s) => s.id === active) ?? courseSections[0];
  const students = followUps.filter((f) =>
    (sectionStudentIds[section.id] ?? []).includes(f.id),
  );

  return (
    <div>
      <p className="text-xs font-bold text-ink">{t("selectSection")}</p>
      <div className="mt-2 flex flex-wrap gap-2.5">
        {courseSections.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={s.id === active}
            onClick={() => setActive(s.id)}
            className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 bg-card px-3.5 py-2.5 text-left shadow-clay transition-colors ${
              s.id === active ? "border-navy/60" : "border-line hover:border-navy/30"
            }`}
          >
            <span
              className={`grid size-8 place-items-center rounded-lg ${sectionTone[s.id] ?? "bg-navy-soft text-navy"}`}
            >
              <PawnIcon className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-bold text-ink">{s.name}</span>
              <span className="block text-[11px] text-muted">
                Ms. {s.teacher} | {branchName(s.branchId)}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-card border-2 border-navy-soft bg-card p-3.5 shadow-clay">
        <div className="flex items-center gap-2.5">
          <span
            className={`grid size-8 place-items-center rounded-lg ${sectionTone[section.id] ?? "bg-navy-soft text-navy"}`}
          >
            <PawnIcon className="size-4" />
          </span>
          <div>
            <p className="text-xs font-bold text-ink">
              {branchName(section.branchId)} Branch - {section.name}
            </p>
            <p className="flex items-center gap-1.5 text-[11px] text-muted">
              <CalendarDays className="size-3" />
              {section.schedule}
            </p>
            <p className="flex items-center gap-1.5 text-[11px] text-muted">
              <Presentation className="size-3" />
              Ms. {section.teacher}
            </p>
          </div>
        </div>
        <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
          <Users className="size-4 text-navy" />
          {t("studentsOf", { count: section.students, capacity: section.capacity })}
        </p>
        <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
          <ClipboardList className="size-4 text-navy" />
          {t("avgAttendance", { pct: 90 })}
        </p>
        <div className="flex items-center gap-1.5">
          <TriangleAlert className="size-4 text-brick" />
          <div>
            <p className="text-xs font-bold text-ink">
              {t("highRisk", { count: 3 })}
            </p>
            <p className="text-[11px] text-muted">
              {t("highRiskDetail", { expiring: 1, lowCredits: 2 })}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-right text-xs font-bold text-muted">
        {tdash("totalStudentsCount", { count: section.students })}
      </p>
      <div className="mt-1 overflow-x-auto rounded-card border-2 border-line bg-card shadow-clay">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b-2 border-line text-[11px] uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5 font-bold">{tdash("colStudent")}</th>
              <th className="px-4 py-2.5 font-bold">{tdash("colBranch")}</th>
              <th className="px-4 py-2.5 font-bold">{tdash("colClass")}</th>
              <th className="px-4 py-2.5 font-bold">{tdash("colCredit")}</th>
              <th className="px-4 py-2.5 font-bold">{tdash("colExpired")}</th>
              <th className="px-4 py-2.5 font-bold">{t("colStatus")}</th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {students.map((row) => (
              <tr key={row.id} className="border-b border-line/70 last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-soft text-xs font-bold text-navy ring-2 ring-card">
                      {row.name[0]}
                    </span>
                    <div>
                      <p className="font-bold text-ink">{row.name}</p>
                      <p className="text-[11px] text-muted">
                        {tc("idLabel", { id: row.id })}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">{branchName(row.branchId)}</td>
                <td className="px-4 py-3 text-muted">{row.className}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
                      <div
                        className={`h-full rounded-full ${
                          row.creditsLeft / row.creditsTotal < 0.25
                            ? "bg-brick"
                            : "bg-navy"
                        }`}
                        style={{
                          width: `${(row.creditsLeft / row.creditsTotal) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-ink">
                      {row.creditsLeft}/{row.creditsTotal}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">{row.expireDate}</td>
                <td className="px-4 py-3">
                  <StatusChip status={row.alert} />
                </td>
                <td className="px-2 py-3 text-muted">
                  <ChevronRight className="size-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
