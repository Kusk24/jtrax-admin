import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/LoginScreen";
import { SESSION_COOKIE, findAdminById } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in — JTRAX",
};

/* Outside app/(app), so this is the one route that renders without the shell. */
export default async function LoginPage() {
  const store = await cookies();
  if (findAdminById(store.get(SESSION_COOKIE)?.value)) redirect("/");

  return <LoginScreen />;
}
