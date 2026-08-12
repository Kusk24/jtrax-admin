import type { IconName } from "./icons";
import type { JtraxRole } from "./theme";

export type NavItem = {
  id: string;
  label: string;
  icon: IconName;
  adminOnly?: boolean;
  hideForReceptionist?: boolean;
};

/* Ported from NAV_STRUCTURE. `id` doubles as the route segment — 'home' is the
   index route, everything else is /<id>. */
export const NAV_STRUCTURE: NavItem[] = [
  { id: "home", label: "Dashboard", icon: "home" },
  { id: "admins", label: "Admins", icon: "userCheck", adminOnly: true },
  { id: "academy", label: "Academy", icon: "book", hideForReceptionist: true },
  { id: "classhistory", label: "Class History", icon: "history" },
  { id: "students", label: "Students", icon: "students" },
  { id: "parents", label: "Parents", icon: "parents" },
  { id: "payment", label: "Payment", icon: "payment" },
  { id: "tournament", label: "Tournament", icon: "tournament" },
  { id: "announcement", label: "Announcement", icon: "announcement" },
  { id: "chat", label: "Messages", icon: "chat" },
  { id: "settings", label: "Settings", icon: "settings", adminOnly: true, hideForReceptionist: true },
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

