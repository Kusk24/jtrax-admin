import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SectionRouter } from "@/components/jtrax/SectionRouter";
import { NAV_STRUCTURE } from "@/lib/jtrax/nav";

/* Only the nav's own section ids resolve; anything else is a 404. */
export function generateStaticParams() {
  return NAV_STRUCTURE.filter((item) => item.id !== "home").map((item) => ({ section: item.id }));
}

export default async function JtraxSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const known = NAV_STRUCTURE.some((item) => item.id === section && item.id !== "home");
  if (!known) notFound();

  /* SectionRouter reads searchParams via useSearchParams, which needs a
     Suspense boundary to avoid opting the whole route into client rendering. */
  return (
    <Suspense fallback={null}>
      <SectionRouter section={section} />
    </Suspense>
  );
}
