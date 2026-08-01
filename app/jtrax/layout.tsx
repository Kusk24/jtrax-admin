import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { JtraxProvider } from "@/components/jtrax/JtraxContext";
import { JtraxShell } from "@/components/jtrax/JtraxShell";
import "./jtrax.css";

/* The mockup is an Inter design; the rest of the admin app is Fredoka/Nunito,
   so the font is scoped to this subtree via its own CSS variable. */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jtrax-inter",
});

export const metadata: Metadata = {
  title: "JTRAX Dashboard",
  description: "JCA Chess School admin dashboard",
};

export default function JtraxLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`jtrax-root ${inter.variable}`}>
      <JtraxProvider>
        <JtraxShell>{children}</JtraxShell>
      </JtraxProvider>
    </div>
  );
}
