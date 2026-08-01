import { notFound } from "next/navigation";
import { SectionPlaceholder } from "@/components/jtrax/SectionPlaceholder";
import { NAV_STRUCTURE } from "@/lib/jtrax/nav";

/* Only the nav's own section ids resolve; anything else is a 404 rather than an
   empty placeholder. Role visibility is enforced in the shell/context, not here,
   because the active role lives in client state. */
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

  return <SectionPlaceholder section={section} />;
}
