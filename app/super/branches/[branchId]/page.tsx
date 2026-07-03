import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Building2, CalendarDays, Presentation } from "lucide-react";
import { BranchCard } from "@/components/admin/BranchCard";
import { DetailTabs } from "@/components/admin/DetailTabs";
import { StatusChip } from "@/components/admin/StatusChip";
import { branches, followUps } from "@/lib/super-data";

const courseSummaries = [
  { name: "Beginner", sections: 2 },
  { name: "Intermediate", sections: 2 },
  { name: "Advance", sections: 2 },
];

const scheduleLines = [
  { section: "Section 101", time: "Mon, Wed (9:00 - 10:00 AM)", teacher: "Ms. Serene" },
  { section: "Section 105", time: "Mon (3:00 - 4:30 PM)", teacher: "Ms. Serene" },
];

const teacherLines = [{ name: "Serene", sections: "Sec101 | Sec301" }];

export default async function BranchDetailPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const branch = branches.find((b) => b.id === branchId);
  if (!branch) notFound();

  const t = await getTranslations("tabs");
  const tb = await getTranslations("branchDetail");
  const tc = await getTranslations("common");

  const listCard = "rounded-card border-2 border-line bg-card p-4 shadow-clay";

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-olive-soft text-olive">
          <Building2 className="size-5" />
        </span>
        <h1 className="font-display text-xl font-semibold text-navy">
          {branch.name}
        </h1>
      </div>
      <DetailTabs
        tabs={[
          {
            key: "overview",
            label: t("overview"),
            content: (
              <div className="max-w-sm">
                <BranchCard branch={branch} linked={false} />
              </div>
            ),
          },
          {
            key: "courses",
            label: t("courses"),
            content: (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {courseSummaries.map((course) => (
                  <div key={course.name} className={listCard}>
                    <p className="text-sm font-bold text-ink">{course.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {tb("sectionsCount", { count: course.sections })}
                    </p>
                  </div>
                ))}
              </div>
            ),
          },
          {
            key: "schedules",
            label: t("schedules"),
            content: (
              <div className="grid gap-3 sm:max-w-md">
                {scheduleLines.map((line) => (
                  <div key={line.section} className={listCard}>
                    <p className="text-sm font-bold text-ink">{line.section}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                      <CalendarDays className="size-3.5" />
                      {line.time}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                      <Presentation className="size-3.5" />
                      {line.teacher}
                    </p>
                  </div>
                ))}
              </div>
            ),
          },
          {
            key: "teachers",
            label: t("teachers"),
            content: (
              <div className="grid gap-3 sm:max-w-xs">
                {teacherLines.map((teacher) => (
                  <div
                    key={teacher.name}
                    className={`${listCard} flex items-center gap-3`}
                  >
                    <span className="grid size-10 place-items-center rounded-full bg-peach font-bold text-peach-ink ring-2 ring-card">
                      {teacher.name[0]}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">{teacher.name}</p>
                      <p className="text-xs text-muted">{teacher.sections}</p>
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
          {
            key: "students",
            label: t("students"),
            content: (
              <div className="grid gap-3 sm:max-w-md">
                {followUps.map((student) => (
                  <div
                    key={student.id}
                    className={`${listCard} flex items-center gap-3`}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy-soft text-xs font-bold text-navy ring-2 ring-card">
                      {student.name[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">
                        {student.name}
                      </p>
                      <p className="truncate text-[11px] text-muted">
                        {tc("idLabel", { id: student.id })} · {student.className}
                      </p>
                    </div>
                    <StatusChip status={student.alert} />
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
