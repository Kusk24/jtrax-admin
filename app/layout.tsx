import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { JtraxProvider } from "@/components/JtraxContext";
import { JtraxShell } from "@/components/JtraxShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jtrax-inter",
});

export const metadata: Metadata = {
  title: "JTRAX — JCA Chess School",
  description: "Admin dashboard for JCA Chess School",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`jtrax-root ${inter.variable}`}>
        <JtraxProvider>
          <JtraxShell>{children}</JtraxShell>
        </JtraxProvider>
      </body>
    </html>
  );
}
