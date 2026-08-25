import type { Metadata } from "next";
import { DM_Sans, Mitr, Poppins } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, fetchIdentity } from "@/lib/auth";
import "./globals.css";

/* The parent portal's pairing: DM Sans for body copy, Poppins for display. */
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-jtrax-sans",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jtrax-display",
});

/* Both are Latin-only, so Thai falls through to Mitr — the project's Thai
   face across the portals. */
const mitr = Mitr({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jtrax-thai",
});

export const metadata: Metadata = {
  title: "JTRAX — JCA Chess School",
  description: "Admin dashboard for JCA Chess School",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  /* The account's theme, rendered onto <html> before anything paints.
     It used to be applied by the toggle's own effect, which meant it only
     ran on the screen the toggle was on — after the picker moved to
     Settings, refreshing anywhere else fell back to the OS. Server-side
     also kills the flash of the wrong theme.

     `fetchIdentity` returns immediately when there is no cookie, so /login
     costs nothing here. */
  const store = await cookies();
  const me = await fetchIdentity(store.get(SESSION_COOKIE)?.value);
  /* Signed out — sign-in, forgot- and reset-password — is always light. There
     is no account yet whose preference could be honoured, and following the
     machine's dark mode gave the academy a dark front door nobody asked for.
     Auto still means the OS once somebody is signed in. */
  const theme = !me ? "light"
    : me.themePreference === "Dark" ? "dark"
    : me.themePreference === "Light" ? "light"
    : undefined;

  return (
    <html lang={locale} data-theme={theme}>
      <body className={`jtrax-root ${dmSans.variable} ${poppins.variable} ${mitr.variable}`}>
        {/* The shell lives in app/(app)/layout.tsx, behind the session guard —
            /login renders inside this root layout with no sidebar. */}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
