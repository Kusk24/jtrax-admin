import { notFound } from "next/navigation";
import { SectionRouter } from "@/components/SectionRouter";
import { NAV_STRUCTURE } from "@/lib/nav";

/* Only the nav's own section ids resolve; anything else is a 404. */
export function generateStaticParams() {
  return NAV_STRUCTURE.filter((item) => item.id !== "home").map((item) => ({ section: item.id }));
}

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ new?: string; status?: string; student?: string; id?: string; tab?: string }>;
}) {
  const { section } = await params;
  const known = NAV_STRUCTURE.some((item) => item.id === section && item.id !== "home");
  if (!known) notFound();

  /* "Register Student" links carry ?new=<typed name> so the wizard opens
     pre-filled, and the dashboard's follow-up cards carry ?status=<condition>
     so the list opens narrowed to what was clicked. Registering a student ends
     on ?student=<id>, which opens the payment form for them. Read here rather
     than with useSearchParams in the client component, which would bail the
     whole route out of server rendering. */
  const { new: newStudentName, status, student, id, tab } = await searchParams;

  return (
    <SectionRouter
      section={section}
      newStudentName={newStudentName}
      status={status}
      studentId={student}
      detailId={id}
      detailTab={tab}
    />
  );
}
