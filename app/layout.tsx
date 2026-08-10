import type { Metadata } from "next";
import { DM_Sans, Mitr, Poppins } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
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

  return (
    <html lang={locale}>
      <body className={`jtrax-root ${dmSans.variable} ${poppins.variable} ${mitr.variable}`}>
        {/* The shell lives in app/(app)/layout.tsx, behind the session guard —
            /login renders inside this root layout with no sidebar. */}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
