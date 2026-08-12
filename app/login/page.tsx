import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/LoginScreen";
import { SESSION_COOKIE, fetchMe } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in — JTRAX",
};

/* Outside app/(app), so this is the one route that renders without the shell. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const store = await cookies();
  if (await fetchMe(store.get(SESSION_COOKIE)?.value)) redirect("/");

  /* ?reset=1 comes from the reset action, which lands here because completing
     a reset revokes every session for the account. */
  const { reset } = await searchParams;
  return <LoginScreen justReset={reset === "1"} />;
}
