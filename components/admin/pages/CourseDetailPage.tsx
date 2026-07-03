import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  CalendarDays,
  ChevronDown,
  ChevronsUpDown,
  Plus,
  Presentation,
  Search,
} from "lucide-react";
import { DetailTabs } from "@/components/admin/DetailTabs";
import { PawnIcon } from "@/components/admin/PawnIcon";
import { SectionStudents } from "@/components/admin/SectionStudents";
import { WeekCalendar } from "@/components/admin/WeekCalendar";
import { branchName, branches, courseSections, courses } from "@/lib/super-data";
import type { BranchId, CourseLevel } from "@/lib/admin-types";

const levelTone: Record<CourseLevel, { icon: string; bar: string }> = {
  Beginner: { icon: "bg-brick-soft text-brick", bar: "bg-brick" },
  Intermediate: { icon: "bg-olive-soft text-olive", bar: "bg-olive" },
  Advance: { icon: "bg-peach text-peach-ink", bar: "bg-peach-ink" },
};

export async function CourseDetailPage({
  courseId,
  branch,
}: {
  courseId: string;
  branch?: BranchId;
}) {
  const course = courses.find((c) => c.id === courseId);
  if (!course) notFound();
  const sections = branch
    ? courseSections.filter((s) => s.branchId === branch)
    : courseSections;
  const tone = levelTone[course.level];

  const t = await getTranslations("tabs");
  const tcd = await getTranslations("courseDetail");
  const tcp = await getTranslations("coursesPage");
  const tc = await getTranslations("common");

  const stats = [
    { label: tcp("activeSections"), value: String(course.activeSections) },
    { label: tcp("totalStudents"), value: String(course.students) },
    { label: tcp("creditsSold"), value: course.creditsSold },
    { label: tcp("capacity"), value: String(course.capacity) },
  ];

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <span className={`grid size-11 place-items-center rounded-2xl ${tone.icon}`}>
          <PawnIcon className="size-6" />
        </span>
        <h1 className="font-display text-xl font-semibold text-navy">
          {course.name}
        </h1>
      </div>
      <DetailTabs
        tabs={[
          {
            key: "overview",
            label: t("overview"),
            content: (
              <div className="max-w-md rounded-card border-2 border-line bg-card p-4 shadow-clay">
                <p className="text-[10px] font-bold text-muted">
                  {tcp("description")}
                </p>
                <p className="mt-1 rounded-xl border-2 border-line bg-cream px-3 py-2 text-xs leading-relaxed text-muted">
                  {course.description}
                </p>
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {stats.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl bg-cream px-1.5 py-2 text-center"
                    >
                      <p className="text-[9px] font-bold text-muted">{s.label}</p>
                      <p className="font-display text-sm font-semibold text-ink">
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[10px] font-bold text-muted">
                  {tcp("fillRate")}
                </p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full rounded-full ${tone.bar}`}
                    style={{ width: `${course.fillPct}%` }}
                  />
                </div>
              </div>
            ),
          },
          {
            key: "sections",
            label: t("sections"),
            content: (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="relative min-w-0 flex-1 sm:max-w-56">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <input
                      className="w-full rounded-full border-2 border-line bg-card py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-navy/50"
                      placeholder={tc("search")}
                    />
                  </label>
                  <label className="relative block">
                    <span className="sr-only">{tcd("branchFilter")}</span>
                    <select className="cursor-pointer appearance-none rounded-full border-2 border-line bg-card py-2 pl-4 pr-9 text-xs font-bold text-ink outline-none transition-colors focus:border-navy/50">
                      <option>{tcd("branchFilter")}</option>
                      {branches.map((b) => (
                        <option key={b.id}>{branchName(b.id)}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                  </label>
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white shadow-clay transition-colors hover:bg-navy-deep"
                  >
                    <Plus className="size-4" />
                    {tcd("addSection")}
                  </button>
                </div>
                <p className="mt-3 text-right text-xs font-bold text-muted">
                  {tcd("totalSections", { count: sections.length })}
                </p>
                <div className="mt-1 overflow-x-auto rounded-card border-2 border-line bg-card shadow-clay">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b-2 border-line text-[11px] uppercase tracking-wide text-muted">
                        <th className="px-4 py-2.5 font-bold">{tcd("colSection")}</th>
                        <th className="px-4 py-2.5 font-bold">{tcd("colBranch")}</th>
                        <th className="px-4 py-2.5 font-bold">{tcd("colSchedule")}</th>
                        <th className="px-4 py-2.5 font-bold">{tcd("colTeacher")}</th>
                        <th className="px-4 py-2.5 font-bold">
                          <span className="inline-flex items-center gap-1">
                            {tcd("colStudents")}
                            <ChevronsUpDown className="size-3" />
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.map((section) => (
                        <tr
                          key={section.id}
                          className="border-b border-line/70 last:border-0"
                        >
                          <td className="px-4 py-3 font-bold text-ink">
                            {section.name}
                          </td>
                          <td className="px-4 py-3 text-muted">
                            {branchName(section.branchId)}
                          </td>
                          <td className="px-4 py-3 text-muted">
                            {section.schedule}
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-2">
                              <span className="grid size-7 place-items-center rounded-full bg-peach text-[10px] font-bold text-peach-ink ring-2 ring-card">
                                {section.teacher[0]}
                              </span>
                              <span className="text-muted">{section.teacher}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-ink">
                            {section.students}/{section.capacity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ),
          },
          {
            key: "schedules",
            label: t("schedules"),
            content: (
              <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
                <WeekCalendar branch={branch ? branchName(branch) : undefined} />
                <div className="rounded-card border-2 border-line bg-card p-4 shadow-clay">
                  <h2 className="text-sm font-semibold text-ink">
                    {tcd("schedulesTitle")}
                  </h2>
                  <div className="mt-3 grid gap-4">
                    {sections.map((section) => (
                      <div key={section.id}>
                        <p className="border-l-4 border-navy pl-2 text-xs font-bold text-ink">
                          {branchName(section.branchId)} Branch - {section.name}
                        </p>
                        <p className="mt-1.5 flex items-center gap-1.5 pl-3 text-[11px] text-muted">
                          <CalendarDays className="size-3" />
                          {section.schedule}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 pl-3 text-[11px] text-muted">
                          <Presentation className="size-3" />
                          Ms. {section.teacher}
                        </p>
                        <button
                          type="button"
                          className="mt-2 w-full cursor-pointer rounded-full bg-navy px-4 py-2 text-xs font-bold text-white shadow-clay transition-colors hover:bg-navy-deep"
                        >
                          {tcd("addSchedule")}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "teachers",
            label: t("teachers"),
            content: (
              <div className="flex max-w-xs items-center gap-3 rounded-card border-2 border-line bg-card p-4 shadow-clay">
                <span className="grid size-10 place-items-center rounded-full bg-peach font-bold text-peach-ink ring-2 ring-card">
                  S
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Serene</p>
                  <p className="text-xs text-muted">Sec101 | Sec301</p>
                </div>
              </div>
            ),
          },
          {
            key: "students",
            label: t("students"),
            content: <SectionStudents branch={branch} />,
          },
        ]}
      />
    </>
  );
}
