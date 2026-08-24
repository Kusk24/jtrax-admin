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
  /* Not a credit rule, but it rides the same machinery: the classes-attended
     milestone at which the academy awards a certificate. The parent portal
     counts toward it. */
  certSessions: number;
};

/* Defaults from the design's `state.settingsCreditRules`; certSessions is the
   academy's stated rule. */
export const DEFAULT_CREDIT_RULES: CreditRules = {
  lowCredit: 3,
  expiringDays: 7,
  inactiveDays: 30,
  certSessions: 50,
};

/** Where the thresholds live in `system_configuration`. */
export const RULE_KEYS: Record<keyof CreditRules, string> = {
  lowCredit: "credit_rule_low_credit",
  expiringDays: "credit_rule_expiring_days",
  inactiveDays: "credit_rule_inactive_days",
  certSessions: "certificate_sessions",
};

export type FollowUpBucket = "low" | "expiring" | "expired" | "inactive";

/** The status each bucket collects. A student has exactly one status, so the
    buckets partition the roster and their counts cannot double-count. */
export const BUCKET_STATUS: Record<FollowUpBucket, Student["status"]> = {
  low: "Low Credit",
  expiring: "Expiring",
  expired: "Expired",
  inactive: "Inactive",
};

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

const BUCKET_STYLE: Record<FollowUpBucket, { icon: IconName; color: string; bg: string }> = {
  low: { icon: "alertTriangle", color: COLORS.warning, bg: COLORS.warningBg },
  expiring: { icon: "clockSmall", color: COLORS.warning, bg: COLORS.warningBg },
  expired: { icon: "alertTriangle", color: COLORS.danger, bg: COLORS.dangerBg },
  inactive: { icon: "userX", color: COLORS.textSecondary, bg: COLORS.neutralBg },
};

/**
 * Groups the roster by the status `lib/live.ts` already worked out.
 *
 * This used to re-derive the buckets from credits and dates with its own
 * priority order, which disagreed with the status chip on the student's own
 * row — the same student could be "Expiring" on the list and counted under
 * "Low Credit" on the dashboard. One rule, applied once, in `studentStatus`.
 */
export function buildFollowUps(students: Student[]): FollowUp[] {
  const keys = Object.keys(BUCKET_STATUS) as FollowUpBucket[];
  return keys.map((key) => {
    const inBucket = students.filter((s) => s.status === BUCKET_STATUS[key]);
    return { key, count: inBucket.length, students: inBucket, ...BUCKET_STYLE[key] };
  });
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
