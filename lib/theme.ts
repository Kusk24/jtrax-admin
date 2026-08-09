/**
 * Design tokens for the admin console.
 *
 * The palette is the shared JTrax one — the same cream / navy / brick / olive /
 * peach tokens the student, parent and teacher portals use in
 * `jtrax-web-app/app/globals.css`, so the admin app reads as part of the same
 * product rather than a separate blue app.
 *
 * Components style themselves inline from these tokens; `app/globals.css`
 * carries only what inline styles can't express (hover, focus, keyframes,
 * breakpoints) and mirrors the same values.
 */

export const COLORS = {
  /* Primary. Still the "blue" of the design, now the JTrax navy. */
  blue: "#2B4380",
  blueHover: "#1F3567",
  bg: "#F7F4EE",
  surface: "#FFFDFA",
  light: "#E6EAF4",
  border: "#E4E0D8",
  text: "#2B2B2B",
  textSecondary: "#7A7872",
  /* Olive reads as success, but the flat olive fails contrast as text on a
     light card — text uses the darkened step, fills use `oliveFill`. */
  success: "#5F7A2E",
  successBg: "#DDE3C4",
  oliveFill: "#8FA653",
  warning: "#8C3A1E",
  warningBg: "#F8E3C9",
  danger: "#C0392B",
  dangerBg: "#F6D7CE",
  maroon: "#7D3C3C",
  neutralBg: "#EDEAE3",
  /* LINE's brand green — a third-party mark, not ours to re-skin. */
  line: "#06C755",
} as const;

/**
 * Categorical accents. These are the derived palette steps that passed the
 * dataviz contrast check on a card surface in the earlier admin portal, so
 * they are safe for chips, dots and chart series alike.
 */
export const ACCENTS = {
  navy: "#4A63A8",
  brick: "#C0392B",
  olive: "#7E9440",
  rust: "#8C3A1E",
  maroon: "#7D3C3C",
  plum: "#6B4A7D",
} as const;

/** Each accent paired with the tint it sits on. */
export const ACCENT_TINTS: Record<keyof typeof ACCENTS, string> = {
  navy: "#E1E6F3",
  brick: "#F6D7CE",
  olive: "#E2E8CB",
  rust: "#F8E3C9",
  maroon: "#F0DEDE",
  plum: "#EBE2F0",
};

/* Thai falls through to Noto Sans Thai — Inter carries no Thai glyphs. */
export const FONT =
  "var(--font-jtrax-inter), var(--font-jtrax-thai), 'Inter', system-ui, sans-serif";

export type JtraxRole = "Super Admin" | "Admin" | "Receptionist";

export const ROLE_COLORS: Record<JtraxRole, { color: string; bg: string }> = {
  "Super Admin": { color: ACCENTS.navy, bg: ACCENT_TINTS.navy },
  Admin: { color: ACCENTS.rust, bg: ACCENT_TINTS.rust },
  Receptionist: { color: ACCENTS.olive, bg: ACCENT_TINTS.olive },
};

export const CLASS_CATEGORY_COLORS: Record<string, string> = {
  Master: ACCENTS.navy,
  Intermediate: ACCENTS.rust,
  Beginner: ACCENTS.olive,
  Weekend: ACCENTS.maroon,
};

/** The tint that goes with a class category, for icon wells and chips. */
export function classCategoryTint(category: string | undefined): string {
  switch (category) {
    case "Master":
      return ACCENT_TINTS.navy;
    case "Intermediate":
      return ACCENT_TINTS.rust;
    case "Beginner":
      return ACCENT_TINTS.olive;
    case "Weekend":
      return ACCENT_TINTS.maroon;
    default:
      return COLORS.light;
  }
}

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
    case "Present":
      return { color: COLORS.success, bg: COLORS.successBg };
    case "Low Credit":
    case "Expiring":
    case "Pending":
    case "Upcoming":
      return { color: COLORS.warning, bg: COLORS.warningBg };
    case "Expired":
    case "Refunded":
    case "Absent":
      return { color: COLORS.danger, bg: COLORS.dangerBg };
    default:
      return { color: COLORS.textSecondary, bg: COLORS.neutralBg };
  }
}
