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
  { id: "admins", icon: "userCheck", adminOnly: true },
  { id: "academy", icon: "book", hideForReceptionist: true },
  { id: "classhistory", icon: "history" },
  { id: "games", icon: "knight" },
  /* No role flags: the front desk is asked "how is my child doing at
     home" as often as the office is. */
  { id: "lichess", icon: "bishop" },
  { id: "students", icon: "students" },
  { id: "parents", icon: "parents" },
  { id: "payment", icon: "payment" },
  { id: "tournament", icon: "tournament" },
  { id: "announcement", icon: "announcement" },
  { id: "chat", icon: "chat" },
  /* Both roles: the theme is a per-account preference and lives here, so a
     receptionist who cannot open Settings cannot change how their own screen
     looks. What is *on* the page is still split by role — the academy's rules
     and the LINE credentials are the admin's. */
  { id: "settings", icon: "settings" },
];

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

