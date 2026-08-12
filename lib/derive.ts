/**
 * The follow-up buckets, and the geometry for the revenue chart.
 *
 * Everything else that used to live here — the KPI cards, the revenue series,
 * the check-in list, a student's attendance and payments — read fixtures and
 * has moved to `lib/live.ts`, which reads the same rows as the rest of the
 * console. What is left takes its data as an argument.
 */
import type { IconName } from "./icons";
import { COLORS } from "./theme";
import { type Student } from "./data";

export type CreditRules = {
  lowCredit: number;
  expiringDays: number;
  inactiveDays: number;
};

/* Defaults from the design's `state.settingsCreditRules`. */
export const DEFAULT_CREDIT_RULES: CreditRules = {
  lowCredit: 3,
  expiringDays: 7,
  inactiveDays: 30,
};

export type FollowUpBucket = "low" | "expiring" | "inactive";

/* Copy lives in the message catalogues, keyed off `key` — this layer only
   decides who lands in which bucket. */
export type FollowUp = {
  key: FollowUpBucket;
  count: number;
  icon: IconName;
  color: string;
  bg: string;
  students: Student[];
};

/** Days from today to a formatted date like "30 Jun 2026", or null if unparseable. */
function daysUntil(value: string): number | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((date.getTime() - Date.now()) / 86_400_000);
}

/**
 * Buckets are assigned by priority (inactive → expiring → low)
 * so a student appears in exactly one row and the counts sum to the number of
 * students actually needing attention.
 */
export function buildFollowUps(rules: CreditRules, students: Student[]): FollowUp[] {
  const low: Student[] = [];
  const expiring: Student[] = [];
  const inactive: Student[] = [];

  for (const student of students) {
    const remaining = daysUntil(student.expires);
    const isExpiring =
      student.status === "Expiring" ||
      (remaining !== null && remaining >= 0 && remaining <= rules.expiringDays);

    if (student.status === "Inactive") inactive.push(student);
    else if (isExpiring) expiring.push(student);
    else if (student.credit <= rules.lowCredit) low.push(student);
  }

  return [
    {
      key: "low",
      count: low.length,
      icon: "alertTriangle",
      color: COLORS.danger,
      bg: COLORS.dangerBg,
      students: low,
    },
    {
      key: "expiring",
      count: expiring.length,
      icon: "clockSmall",
      color: COLORS.warning,
      bg: COLORS.warningBg,
      students: expiring,
    },
    {
      key: "inactive",
      count: inactive.length,
      icon: "userX",
      color: COLORS.textSecondary,
      bg: COLORS.neutralBg,
      students: inactive,
    },
  ];
}

export type TrendPoint = { month: string; value: number };

/** Maps a series to `points` strings for the SVG polyline and its fill polygon. */
export function trendPointStrings(points: TrendPoint[]): { line: string; area: string } {
  const max = Math.max(...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const span = max - min || 1;
  /* Inset vertically so the stroke isn't clipped by the viewBox edges. */
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * 100;
    const y = 90 - ((p.value - min) / span) * 80;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return {
    line: coords.join(" "),
    area: `0,100 ${coords.join(" ")} 100,100`,
  };
}
