import type { IconName } from "./icons";
import type { JtraxRole } from "./theme";

/* No `label` here on purpose: the shell renders `t(item.id)`, so the visible
   name comes from messages/{en,th}.json. A label field would be English text
   that nothing renders — and the next person to add a breadcrumb would use it. */
export type NavItem = {
  id: string;
  icon: IconName;
  adminOnly?: boolean;
  hideForReceptionist?: boolean;
};

/* Ported from NAV_STRUCTURE. `id` doubles as the route segment — 'home' is the
   index route, everything else is /<id>. */
export const NAV_STRUCTURE: NavItem[] = [
  { id: "home", icon: "home" },
  { id: "academy", icon: "book", hideForReceptionist: true },
  { id: "classhistory", icon: "history" },
  /* One chess section, not two. Lichess and the console's own boards are the
     same question asked of two places — what a pupil is playing — and splitting
     them across adjacent tabs made the nav longer without making either easier
     to find. Lichess leads the page: it is the half the academy never sees. */
  { id: "games", icon: "knight" },
  { id: "students", icon: "students" },
  { id: "parents", icon: "parents" },
  { id: "payment", icon: "payment" },
  { id: "tournament", icon: "tournament" },
  { id: "announcement", icon: "announcement" },
  { id: "chat", icon: "chat" },
  /* Two pages, the way the parent portal divides them: Profile is who you are,
     Settings is what the academy runs on.
     
     Profile is for both roles — the theme is a per-account preference, and a
     desk that cannot reach it cannot change how its own screen looks. That one
     card was the whole reason Settings used to be open to the front desk, and
     it held the door open on the academy's rules, the LINE credentials and the
     staff accounts. Now nothing on Settings is a receptionist's, so the tab is
     not theirs either — a page whose every block is gated is a page that
     should not be in the nav. */
  { id: "profile", icon: "parents" },
  { id: "settings", icon: "settings", adminOnly: true },
];

/**
 * Sections that were folded into another one, and where they went.
 *
 * A tab that stops existing takes every bookmark, typed URL and stale browser
 * tab pointing at it down with it — and `generateStaticParams` reads
 * NAV_STRUCTURE, so the route 404s rather than landing anywhere useful. These
 * ids still resolve; they just resolve somewhere else.
 */
export const MERGED_SECTIONS: Record<string, string> = {
  lichess: "games",
  admins: "settings",
};

/**
 * Where a role that cannot open a section should be sent instead, when there
 * is somewhere better than a refusal.
 *
 * Only Settings, and only for the front desk. They could open it yesterday —
 * for the theme — and the theme is now on Profile, so a bookmark or a habit
 * that lands them on /settings is asking for a screen that still exists and is
 * still theirs. Telling them "not allowed" would be true and useless.
 *
 * Deliberately not a general redirect table. Every other refusal in the
 * console is a section with no counterpart for that role, and quietly landing
 * somebody somewhere they did not ask for is worse than saying no.
 */
export const REROUTE_WHEN_BLOCKED: Record<string, Partial<Record<JtraxRole, string>>> = {
  settings: { Receptionist: "profile" },
};

export function navItemsForRole(role: JtraxRole): NavItem[] {
  return NAV_STRUCTURE.filter((item) => {
    if (item.adminOnly && role !== "Admin") return false;
    if (item.hideForReceptionist && role === "Receptionist") return false;
    return true;
  });
}

/* The nav hides what a role can't use; this is what stops a hand-typed URL
   from reaching the same page anyway. */
export function canRoleAccess(role: JtraxRole, sectionId: string): boolean {
  return navItemsForRole(role).some((item) => item.id === sectionId);
}

