import type { Metadata } from "next";
import { ResetPasswordScreen } from "@/components/AuthScreens";

export const metadata: Metadata = { title: "Reset password — JTRAX" };

/* The token arrives as a query param from the emailed link. Read on the server
   and passed down rather than with useSearchParams, which would opt the route
   out of server rendering. */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordScreen token={token ?? ""} />;
}
