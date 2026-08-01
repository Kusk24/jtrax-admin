import type { IconName } from "./icons";
import type { JtraxRole } from "./theme";

export type NavItem = {
  id: string;
  label: string;
  icon: IconName;
  superOnly?: boolean;
  hideForReceptionist?: boolean;
};

/* Ported from NAV_STRUCTURE. `id` doubles as the route segment — 'home' is the
   index route, everything else is /<id>. */
export const NAV_STRUCTURE: NavItem[] = [
  { id: "home", label: "Dashboard", icon: "home" },
  { id: "admins", label: "Admins", icon: "userCheck", superOnly: true },
  { id: "academy", label: "Academy", icon: "book", hideForReceptionist: true },
  { id: "classhistory", label: "Class History", icon: "history" },
  { id: "students", label: "Students", icon: "students" },
  { id: "payment", label: "Payment", icon: "payment" },
  { id: "tournament", label: "Tournament", icon: "tournament" },
  { id: "announcement", label: "Announcement", icon: "announcement" },
  { id: "chat", label: "Messages", icon: "chat" },
  { id: "settings", label: "Settings", icon: "settings", superOnly: true, hideForReceptionist: true },
];

export function navItemsForRole(role: JtraxRole): NavItem[] {
  return NAV_STRUCTURE.filter((item) => {
    if (item.superOnly && role !== "Super Admin") return false;
    if (item.hideForReceptionist && role === "Receptionist") return false;
    return true;
  });
}

/* Mirrors setUserRole's page guards: switching into a weaker role while sitting
   on a page that role can't see bounces you home. */
export function canRoleAccess(role: JtraxRole, sectionId: string): boolean {
  return navItemsForRole(role).some((item) => item.id === sectionId);
}

export const SECTION_META: Record<string, { label: string; sub: string; icon: IconName }> = {
  admins: { label: "Admins", sub: "Manage admin and super admin accounts", icon: "userCheck" },
  academy: { label: "Academy", sub: "Courses and Teachers", icon: "book" },
  classhistory: { label: "Class History", sub: "Past sessions and attendance", icon: "history" },
  students: { label: "Students", sub: "Enrolled students and profiles", icon: "students" },
  payment: { label: "Payment", sub: "Payments and credit packages", icon: "payment" },
  tournament: { label: "Tournament", sub: "Upcoming and past tournaments", icon: "tournament" },
  announcement: { label: "Announcement", sub: "Broadcast to students and parents", icon: "announcement" },
  chat: { label: "Messaging Center", sub: "Reply to parents through LINE Official Account", icon: "chat" },
  settings: { label: "Settings", sub: "Manage system-wide credit warning rules.", icon: "settings" },
};
