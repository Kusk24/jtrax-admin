import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { JtraxProvider } from "@/components/JtraxContext";
import { JtraxShell } from "@/components/JtraxShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jtrax-inter",
});

/* Inter has no Thai glyphs, so Thai text falls through to Noto Sans Thai —
   the closest neutral companion to Inter's tone. */
const notoThai = Noto_Sans_Thai({
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
      <body className={`jtrax-root ${inter.variable} ${notoThai.variable}`}>
        <NextIntlClientProvider>
          <JtraxProvider>
            <JtraxShell>{children}</JtraxShell>
          </JtraxProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
