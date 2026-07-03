"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";

export type PortalTab = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  /** Match this tab only on an exact path (used for the portal home tab). */
  exact?: boolean;
  /** Extra path prefixes that should also highlight this tab. */
  activeAliases?: string[];
};

function isActive(pathname: string, tab: PortalTab) {
  if (tab.activeAliases?.some((alias) => pathname.startsWith(alias))) return true;
  return tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
}

export function PortalBottomNav({ tabs }: { tabs: PortalTab[] }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  return (
    <nav className="fixed inset-x-3 bottom-3 z-20 rounded-3xl border-2 border-line bg-card px-2 py-1.5 shadow-clay-lg lg:hidden">
      <ul className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-4 py-1.5 text-[10px] ${
                  active ? "animate-pop bg-navy-soft/50 font-bold text-navy" : "text-muted"
                }`}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
                {t(tab.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function PortalSideNav({
  tabs,
  portalLabelKey,
}: {
  tabs: PortalTab[];
  portalLabelKey: string;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r-2 border-line bg-card px-4 py-6 lg:flex">
      <Link href="/" className="mb-8 px-2">
        <span className="text-2xl font-extrabold tracking-tight text-navy">JTrax</span>
        <span className="mt-0.5 block text-xs text-muted">{t(portalLabelKey)}</span>
      </Link>
      <ul className="flex flex-col gap-1">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                  active
                    ? "bg-navy-soft/50 font-semibold text-navy"
                    : "text-muted hover:bg-cream hover:text-ink"
                }`}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
                {t(tab.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href="/"
        className="mt-auto rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-cream hover:text-ink"
      >
        {t("switchRole")}
      </Link>
    </aside>
  );
}
