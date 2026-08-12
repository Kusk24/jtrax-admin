/**
 * Design tokens for the admin console.
 *
 * The palette and type are the parent portal's clean-blue design system — the
 * `pp-*` tokens in `jtrax-web-app/app/globals.css` (ink, blue, deep, navy,
 * line, soft, mist) with DM Sans for body and Poppins for display — so the
 * admin app reads as the same product as the parent portal.
 *
 * Components style themselves inline from these tokens; `app/globals.css`
 * carries only what inline styles can't express (hover, focus, keyframes,
 * breakpoints) and mirrors the same values.
 */

export const COLORS = {
  /* pp-blue / pp-deep. */
  blue: "#2E5CB8",
  blueHover: "#234A9F",
  navy: "#1E3A70",
  /* pp-mist rather than the near-white pp-bg: the console is wall-to-wall
     cards, and they need a tinted page behind them to read as cards. */
  bg: "#F0F4FC",
  surface: "#FFFFFF",
  light: "#E8EEFA",
  border: "#E7EBF3",
  text: "#1A2B4A",
  textSecondary: "#5C6880",
  /* The portal's status colours are tuned for dots and fills; as 12.5px bold
     text on their own tint they land at ~4.1:1, so each has a darker step that
     clears 4.5:1. `*Fill` keeps the portal's original for dots and chart marks. */
  success: "#2A7150",
  successBg: "#E6F4EC",
  successFill: "#4CAF7D",
  warning: "#9C5A1B",
  warningBg: "#FBEEDF",
  warningFill: "#C97A2E",
  danger: "#B54040",
  dangerBg: "#FBEAEA",
  dangerFill: "#E0645F",
  neutralBg: "#EEF1F7",
  /* LINE's brand green — a third-party mark, not ours to re-skin. */
  line: "#06C755",
} as const;

/**
 * Categorical accents, all drawn from the parent portal's palette and darkened
 * where needed so they hold up as small text on their own tint.
 */
export const ACCENTS = {
  navy: "#1E3A70",
  blue: "#2E5CB8",
  green: "#2A7150",
  amber: "#9C5A1B",
  red: "#B54040",
  plum: "#5C4A8A",
} as const;

/** Each accent paired with the tint it sits on. */
export const ACCENT_TINTS: Record<keyof typeof ACCENTS, string> = {
  navy: "#E3E9F6",
  blue: "#E8EEFA",
  green: "#E6F4EC",
  amber: "#FBEEDF",
  red: "#FBEAEA",
  plum: "#EAE6F5",
};

/* DM Sans for body copy, matching the parent portal. Thai falls through to
   Mitr — DM Sans and Poppins are both Latin-only. */
export const FONT =
  "var(--font-jtrax-sans), var(--font-jtrax-thai), ui-sans-serif, system-ui, sans-serif";

/** Poppins, for headings and the numbers that carry a card. */
export const FONT_DISPLAY =
  "var(--font-jtrax-display), var(--font-jtrax-thai), ui-sans-serif, system-ui, sans-serif";

/** The two staff roles the backend issues sign-ins for; nothing else reaches
    the console, so there is no third label to keep in step with. */
export type JtraxRole = "Admin" | "Receptionist";

export const ROLE_COLORS: Record<JtraxRole, { color: string; bg: string }> = {
  Admin: { color: ACCENTS.navy, bg: ACCENT_TINTS.navy },
  Receptionist: { color: ACCENTS.amber, bg: ACCENT_TINTS.amber },
};

export const CLASS_CATEGORY_COLORS: Record<string, string> = {
  Master: ACCENTS.navy,
  Intermediate: ACCENTS.amber,
  Beginner: ACCENTS.green,
  Weekend: ACCENTS.plum,
};

/** The tint that goes with a class category, for icon wells and chips. */
export function classCategoryTint(category: string | undefined): string {
  switch (category) {
    case "Master":
      return ACCENT_TINTS.navy;
    case "Intermediate":
      return ACCENT_TINTS.amber;
    case "Beginner":
      return ACCENT_TINTS.green;
    case "Weekend":
      return ACCENT_TINTS.plum;
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
