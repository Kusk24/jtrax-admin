/**
 * Design tokens ported verbatim from `JTRAX Dashboard.dc.html`.
 *
 * This tree is styled independently of the app's cream/navy "clay" theme in
 * globals.css — the mockup is a flat cool-blue Inter design, so the JTRAX pages
 * use inline styles driven by these tokens rather than the global Tailwind
 * theme. Keeping them in one module is what makes that isolation tractable.
 */

export const COLORS = {
  blue: "#284C8F",
  blueHover: "#1f3d73",
  bg: "#F7FAFF",
  surface: "#FFFFFF",
  light: "#EEF5FF",
  border: "#D9E6F7",
  text: "#243B63",
  textSecondary: "#6B7B93",
  success: "#2F9E63",
  successBg: "#E7F7EF",
  warning: "#B7791F",
  warningBg: "#FDF3E0",
  danger: "#C0392B",
  dangerBg: "#FBEAEA",
  neutralBg: "#EEF1F6",
  line: "#06C755",
} as const;

/* Thai falls through to Noto Sans Thai — Inter carries no Thai glyphs. */
export const FONT =
  "var(--font-jtrax-inter), var(--font-jtrax-thai), 'Inter', system-ui, sans-serif";

export type JtraxRole = "Super Admin" | "Admin" | "Receptionist";

export const ROLE_COLORS: Record<JtraxRole, { color: string; bg: string }> = {
  "Super Admin": { color: "#284C8F", bg: "#EEF5FF" },
  Admin: { color: "#7C4FC2", bg: "#F1EAFA" },
  Receptionist: { color: "#B7911C", bg: "#FBF3D9" },
};

export const CLASS_CATEGORY_COLORS: Record<string, string> = {
  Master: "#5B4B8A",
  Intermediate: "#C1662E",
  Beginner: "#1F9D6B",
  Weekend: "#9A7B2E",
};

export function classDotColor(className: string | undefined): string {
  if (!className) return COLORS.textSecondary;
  const key = Object.keys(CLASS_CATEGORY_COLORS).find((k) => className.includes(k));
  return key ? CLASS_CATEGORY_COLORS[key] : COLORS.textSecondary;
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* The mockup's fixed "today" — all relative date maths key off it so the demo
   data stays deterministic. */
export const TODAY_REF = new Date(2026, 6, 23);

export const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function statusChipColors(status: string): { color: string; bg: string } {
  switch (status) {
    case "Normal":
    case "Paid":
    case "Ongoing":
    case "Active":
      return { color: COLORS.success, bg: COLORS.successBg };
    case "Low Credit":
    case "Expiring":
    case "Pending":
    case "Upcoming":
      return { color: COLORS.warning, bg: COLORS.warningBg };
    case "Expired":
    case "Refunded":
      return { color: COLORS.danger, bg: COLORS.dangerBg };
    default:
      return { color: COLORS.textSecondary, bg: COLORS.neutralBg };
  }
}
