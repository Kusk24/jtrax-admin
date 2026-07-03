import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  CalendarDays,
  GraduationCap,
  Info,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { branchName, followUps } from "@/lib/super-data";

/* Shared mock family/enrollment details until the backend owns student records. */
const parents = [
  { name: "Sandy Jones", relation: "mother" as const },
  { name: "Mile Jones", relation: "father" as const },
];

export default async function AdminStudentProfilePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const student = followUps.find((f) => f.id === studentId);
  if (!student) notFound();

  const t = await getTranslations("studentProfile");
  const tc = await getTranslations("common");

  const card = "rounded-card border-2 border-line bg-card p-4 shadow-clay";

  return (
    <div className="mx-auto max-w-md">
      <div className="flex items-center gap-3">
        <Link
          href="/super/students"
          aria-label={tc("back")}
          className="grid size-9 place-items-center rounded-xl border-2 border-line text-navy transition-colors hover:border-navy/40"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-xl font-semibold text-navy">
          {t("title")}
        </h1>
      </div>

      <section className={`${card} mt-4`}>
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-navy-soft font-display font-semibold text-navy ring-2 ring-card">
            {student.name[0]}
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">{student.name}</h2>
            <p className="text-[11px] text-muted">
              {tc("idLabel", { id: student.id })}
            </p>
            <p className="text-[11px] text-muted">
              {t("levelAge", { level: "Beginner", age: 8 })}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-brick-soft px-3.5 py-2.5">
          <div>
            <p className="text-xs font-bold text-maroon">
              {t("remainingCredits")}
            </p>
            <p className="text-[11px] text-maroon/80">
              {t("validUntil", { date: "20 May 2026" })}
            </p>
          </div>
          <p className="font-display text-sm font-semibold text-maroon">
            {t("creditsOf", {
              left: student.creditsLeft,
              total: student.creditsTotal,
            })}
          </p>
        </div>
      </section>

      <section className={`${card} mt-4`}>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Info className="size-4 text-navy" />
          {t("parentsContact")}
        </h2>
        <div className="mt-3 grid gap-2.5">
          {parents.map((parent) => (
            <div key={parent.name} className="flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-peach text-xs font-bold text-peach-ink ring-2 ring-card">
                {parent.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">
                  {parent.name}
                </p>
                <p className="text-[11px] text-muted">{t(parent.relation)}</p>
              </div>
              <a
                href="tel:+661234567"
                aria-label={t("callTo", { name: parent.name })}
                className="grid size-8 place-items-center rounded-full bg-navy-soft text-navy transition-colors hover:bg-navy hover:text-white"
              >
                <Phone className="size-3.5" />
              </a>
              <a
                href="mailto:parent@example.com"
                aria-label={t("emailTo", { name: parent.name })}
                className="grid size-8 place-items-center rounded-full bg-navy-soft text-navy transition-colors hover:bg-navy hover:text-white"
              >
                <Mail className="size-3.5" />
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className={`${card} mt-4`}>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <GraduationCap className="size-4 text-navy" />
          {t("enrolledClasses")}
        </h2>
        <div className="mt-3 rounded-xl border-2 border-line p-3">
          <p className="text-sm font-bold text-ink">{student.className}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
            <CalendarDays className="size-3" />
            Mon, Wed 9:00 AM - 10:00 AM
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
            <MapPin className="size-3" />
            {branchName(student.branchId)}
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
              <div className="h-full w-[90%] rounded-full bg-navy" />
            </div>
            <span className="text-[11px] font-bold text-ink">90%</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {t("classesOf", { attended: 18, total: 20 })}
          </p>
        </div>
      </section>
    </div>
  );
}
