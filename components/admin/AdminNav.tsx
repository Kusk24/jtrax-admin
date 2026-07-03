"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Presentation,
  Settings,
  TrendingUp,
  UserCog,
  Users,
  X,
} from "lucide-react";

export type AdminRole = "super" | "branch";

const allTabs = [
  { path: "", labelKey: "dashboard", icon: LayoutDashboard, superOnly: false },
  { path: "/admins", labelKey: "branchAdmins", icon: UserCog, superOnly: true },
  { path: "/branches", labelKey: "branches", icon: Building2, superOnly: true },
  { path: "/courses", labelKey: "courses", icon: GraduationCap, superOnly: false },
  { path: "/teachers", labelKey: "teachers", icon: Presentation, superOnly: false },
  { path: "/students", labelKey: "students", icon: Users, superOnly: false },
  { path: "/payments", labelKey: "payments", icon: CreditCard, superOnly: false },
  { path: "/attendance", labelKey: "attendance", icon: ClipboardList, superOnly: false },
  { path: "/reports", labelKey: "reports", icon: TrendingUp, superOnly: false },
  { path: "/settings", labelKey: "system", icon: Settings, superOnly: false },
] as const;

/* Branch names are backend data — they stay English like the rest of the mock data. */
const branchNames = ["Bangkok", "Onnut", "Bangbo"];

function NavList({
  base,
  role,
  onNavigate,
}: {
  base: string;
  role: AdminRole;
  onNavigate?: () => void;
}) {
  const t = useTranslations("adminNav");
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
      {allTabs
        .filter((tab) => role === "super" || !tab.superOnly)
        .map(({ path, labelKey, icon: Icon }) => {
          const href = `${base}${path}`;
          const active = path === "" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                active
                  ? "bg-navy-soft text-navy"
                  : "text-muted hover:bg-cream hover:text-ink"
              }`}
            >
              <Icon className="size-5 shrink-0" />
              {t(labelKey)}
            </Link>
          );
        })}
    </nav>
  );
}

export function AdminNav({
  role,
  branchLabel,
}: {
  role: AdminRole;
  branchLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("adminNav");
  const tc = useTranslations("common");
  const base = `/${role}`;

  const logout = (
    <Link
      href="/"
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-brick transition-colors hover:bg-brick-soft"
    >
      <LogOut className="size-5 shrink-0" />
      {t("logout")}
    </Link>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b-2 border-line bg-card">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("openMenu")}
            className="grid size-10 cursor-pointer place-items-center rounded-xl border-2 border-line text-navy lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <Link href={base} className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brick font-display text-lg font-semibold text-white shadow-clay">
              J
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate font-display text-sm font-semibold text-ink">
                JCA Chess School
              </span>
              <span className="block text-[11px] text-muted">
                {t("adminPanel")}
              </span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            {role === "super" ? (
              <label className="relative block">
                <span className="sr-only">{tc("allBranches")}</span>
                <select
                  defaultValue="all"
                  className="cursor-pointer appearance-none rounded-full border-2 border-line bg-card py-2 pl-4 pr-9 text-xs font-bold text-navy shadow-clay outline-none transition-colors focus:border-navy/50"
                >
                  <option value="all">{tc("allBranches")}</option>
                  {branchNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-navy" />
              </label>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-line bg-card px-4 py-2 text-xs font-bold text-navy shadow-clay">
                <Building2 className="size-3.5" />
                {branchLabel}
              </span>
            )}
            <span
              aria-label={tc("myProfile")}
              className="grid size-10 place-items-center rounded-full bg-peach font-display font-semibold text-peach-ink ring-2 ring-card"
            >
              {role === "super" ? "H" : "S"}
            </span>
          </div>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-16 z-30 hidden w-56 flex-col border-r-2 border-line bg-card px-3 py-4 lg:flex">
        <NavList base={base} role={role} />
        <div className="mt-2 border-t-2 border-line pt-2">{logout}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("closeMenu")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-pointer bg-ink/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col rounded-r-3xl border-r-2 border-line bg-card px-3 py-4 shadow-clay-lg">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="font-display font-semibold text-ink">
                JCA Chess School
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("closeMenu")}
                className="grid size-9 cursor-pointer place-items-center rounded-xl border-2 border-line text-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            <NavList base={base} role={role} onNavigate={() => setOpen(false)} />
            <div className="mt-2 border-t-2 border-line pt-2">{logout}</div>
          </div>
        </div>
      )}
    </>
  );
}
