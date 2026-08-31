import { notFound, redirect } from "next/navigation";
import { SectionRouter } from "@/components/SectionRouter";
import { MERGED_SECTIONS, NAV_STRUCTURE } from "@/lib/nav";

/* The nav's own section ids, plus the ones that were folded into another
   section and now redirect there. Anything else is a 404. */
export function generateStaticParams() {
  return [
    ...NAV_STRUCTURE.filter((item) => item.id !== "home").map((item) => item.id),
    ...Object.keys(MERGED_SECTIONS),
  ].map((section) => ({ section }));
}

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ new?: string; status?: string; student?: string; id?: string; tab?: string }>;
}) {
  const { section } = await params;
  /* Checked before the nav, because a merged id is deliberately no longer in
     it — an old link goes where the screen went rather than to a 404. */
  const movedTo = MERGED_SECTIONS[section];
  if (movedTo) redirect(`/${movedTo}`);
  const known = NAV_STRUCTURE.some((item) => item.id === section && item.id !== "home");
  if (!known) notFound();

  /* ?new= is a Quick Action asking a section to open its create form — the
     value prefills the first field where the form has an obvious one, so the
     dashboard search can hand the registration wizard a typed name. It is
     read present-or-absent, never truthy: `?new=` with nothing typed is still
     a request to open the form.

     The dashboard's follow-up cards carry ?status=<condition> so the list
     opens narrowed to what was clicked, and registering a student ends on
     ?student=<id>, which opens the payment form for them. Read here rather
     than with useSearchParams in the client component, which would bail the
     whole route out of server rendering. */
  const { new: startNew, status, student, id, tab } = await searchParams;

  return (
    <SectionRouter
      section={section}
      startNew={startNew}
      status={status}
      studentId={student}
      detailId={id}
      detailTab={tab}
    />
  );
}
