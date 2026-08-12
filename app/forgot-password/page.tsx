import type { Metadata } from "next";
import { ForgotPasswordScreen } from "@/components/AuthScreens";

export const metadata: Metadata = { title: "Reset password — JTRAX" };

/* Outside app/(app), like /login: no session, so no console shell. */
export default function ForgotPasswordPage() {
  return <ForgotPasswordScreen />;
}
