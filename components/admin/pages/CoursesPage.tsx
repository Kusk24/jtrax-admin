import Link from "next/link";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/admin/PageHeader";
import { CardMenu } from "@/components/admin/CardMenu";
import { PawnIcon } from "@/components/admin/PawnIcon";
import { courses } from "@/lib/super-data";
import type { CourseLevel } from "@/lib/admin-types";

const levelTone: Record<CourseLevel, { icon: string; bar: string }> = {
  Beginner: { icon: "bg-brick-soft text-brick", bar: "bg-brick" },
  Intermediate: { icon: "bg-olive-soft text-olive", bar: "bg-olive" },
  Advance: { icon: "bg-peach text-peach-ink", bar: "bg-peach-ink" },
};

export function CoursesPage({ base = "/super" }: { base?: string }) {
  const t = useTranslations("coursesPage");
  const tc = useTranslations("common");
  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Link
            href={`${base}/courses/new`}
            className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white shadow-clay transition-colors hover:bg-navy-deep"
          >
            <Plus className="size-4" />
            {t("add")}
          </Link>
        }
      />
      <p className="mt-5 text-right text-xs font-bold text-muted">
        {t("totalClasses", { count: courses.length })}
      </p>
      <div className="mt-2 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => {
          const tone = levelTone[course.level];
          const stats = [
            { label: t("activeSections"), value: String(course.activeSections) },
            { label: t("totalStudents"), value: String(course.students) },
            { label: t("creditsSold"), value: course.creditsSold },
            { label: t("capacity"), value: String(course.capacity) },
          ];
          return (
            <article
              key={course.id}
              className="rounded-card border-2 border-line bg-card p-4 shadow-clay"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-2xl ${tone.icon}`}
                >
                  <PawnIcon className="size-6" />
                </span>
                <h2 className="min-w-0 flex-1 truncate pt-2 text-sm font-bold text-ink">
                  <Link
                    href={`${base}/courses/${course.id}`}
                    className="hover:underline"
                  >
                    {course.name}
                  </Link>
                </h2>
                <CardMenu
                  label={tc("options")}
                  items={[
                    { label: t("edit"), kind: "edit" },
                    { label: t("remove"), kind: "remove" },
                  ]}
                />
              </div>
              <p className="mt-3 text-[10px] font-bold text-muted">
                {t("description")}
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
                {t("fillRate")}
              </p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full ${tone.bar}`}
                  style={{ width: `${course.fillPct}%` }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
