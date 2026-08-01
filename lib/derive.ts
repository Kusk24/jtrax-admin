/**
 * View-model helpers for the JTRAX dashboard.
 *
 * NOTE ON PROVENANCE: the design export we received was truncated at a 256 KiB
 * read cap, cutting off the tail of `renderVals()` — the part that built
 * `followUps`, `kpiCards` and the revenue series. Everything in this module
 * marked RECONSTRUCTED is derived from the seed data and `settingsCreditRules`
 * that *were* present, not copied from the design. If a complete export turns
 * up, these are the functions to check against it.
 */
import type { IconName } from "./icons";
import { COLORS, MONTH_SHORT, TODAY_REF } from "./theme";
import { CHECKIN_DEFS_SEED, PAYMENTS_SEED, STUDENTS_SEED, type Student } from "./data";

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

export type FollowUp = {
  key: FollowUpBucket;
  label: string;
  desc: string;
  count: number;
  icon: IconName;
  color: string;
  bg: string;
  students: Student[];
};

function parseSeedDate(value: string): Date | null {
  /* Seed dates look like "30 Jun 2026". */
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysUntil(value: string): number | null {
  const date = parseSeedDate(value);
  if (!date) return null;
  return Math.round((date.getTime() - TODAY_REF.getTime()) / 86_400_000);
}

/**
 * RECONSTRUCTED. Buckets are assigned by priority (inactive → expiring → low)
 * so a student appears in exactly one row and the counts sum to the number of
 * students actually needing attention.
 */
export function buildFollowUps(
  rules: CreditRules = DEFAULT_CREDIT_RULES,
  students: Student[] = STUDENTS_SEED,
): FollowUp[] {
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
      label: "Low Credit",
      desc: `${rules.lowCredit} or fewer credits remaining`,
      count: low.length,
      icon: "alertTriangle",
      color: COLORS.danger,
      bg: COLORS.dangerBg,
      students: low,
    },
    {
      key: "expiring",
      label: "Expiring Soon",
      desc: `Credits expire within ${rules.expiringDays} days`,
      count: expiring.length,
      icon: "clockSmall",
      color: COLORS.warning,
      bg: COLORS.warningBg,
      students: expiring,
    },
    {
      key: "inactive",
      label: "Inactive Students",
      desc: `No class attended in ${rules.inactiveDays} days`,
      count: inactive.length,
      icon: "userX",
      color: COLORS.textSecondary,
      bg: COLORS.neutralBg,
      students: inactive,
    },
  ];
}

export type Kpi = {
  key: string;
  icon: IconName;
  label: string;
  value: string;
  sub: string;
  color: string;
  bg: string;
};

/* `kpiRevenue` and the first card survived the truncation and are copied
   verbatim; the "Total Students" 33 is likewise the design's own hardcoded
   value (it does not match the 10-row student seed, which is intentional in
   the mockup). */
export function buildKpiCards(): Kpi[] {
  const revenue = PAYMENTS_SEED.filter((p) => p.status === "Paid").reduce(
    (sum, p) => sum + parseInt(p.amount.replace(/[^0-9]/g, ""), 10),
    0,
  );

  return [
    {
      key: "revenue",
      icon: "wallet",
      label: "Revenue This Month",
      value: `${revenue.toLocaleString()} THB`,
      sub: `From ${PAYMENTS_SEED.length} payments`,
      color: COLORS.success,
      bg: COLORS.successBg,
    },
    {
      key: "students",
      icon: "usersPlus",
      label: "Total Students",
      value: "33",
      sub: "Enrolled across all classes",
      color: COLORS.blue,
      bg: COLORS.light,
    },
  ];
}

export type TrendPoint = { month: string; value: number };

/**
 * RECONSTRUCTED. The design renders a 6-month area+line chart but the series
 * itself was in the truncated tail. These are plausible demo figures ending at
 * the 51,200 THB the WCIB tournament seed also quotes.
 */
const REVENUE_SERIES = [38_200, 41_500, 39_800, 46_300, 44_100, 51_200];

export function buildRevenueTrend(): TrendPoint[] {
  return REVENUE_SERIES.map((value, i) => {
    const monthIndex = (TODAY_REF.getMonth() - (REVENUE_SERIES.length - 1 - i) + 12) % 12;
    return { month: MONTH_SHORT[monthIndex], value };
  });
}

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

export type CheckinRow = {
  idx: number;
  name: string;
  initials: string;
  credit: number;
  class: string;
  timeIn: string;
  timeOut: string;
  status: "In class" | "Dismissed";
  displayStatus: string;
  canDismiss: boolean;
};

export function buildCheckins(dismissed: Record<number, string>): CheckinRow[] {
  return CHECKIN_DEFS_SEED.map((def, idx) => {
    const dismissedAt = dismissed[idx];
    const status = dismissedAt ? "Dismissed" : def.status;
    return {
      idx,
      name: def.name,
      initials: def.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      credit: def.credit,
      class: def.class,
      timeIn: def.timeIn,
      timeOut: dismissedAt ?? def.timeOut,
      status,
      displayStatus: status,
      canDismiss: status === "In class",
    };
  });
}

/* Deterministic PRNG (Lehmer), ported verbatim so the student profile's
   attendance and practice strips match the design's demo data exactly. */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export type AttendanceRow = { date: string; className: string; status: "Present" | "Absent" };

/** Ported from buildAttendanceRows: 8 weekly sessions back from TODAY_REF. */
export function buildAttendanceRows(seedIdx: number, className: string): AttendanceRow[] {
  const rand = seededRandom(seedIdx * 97 + 13);
  const rows: AttendanceRow[] = [];
  for (let i = 0; i < 8; i++) {
    const d = new Date(TODAY_REF);
    d.setDate(d.getDate() - i * 7);
    rows.push({
      date: d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }),
      className,
      status: rand() > 0.2 ? "Present" : "Absent",
    });
  }
  return rows;
}

/** Ported from buildPracticeStrip: 35-day heat strip plus the trailing streak. */
export function buildPracticeStrip(seedIdx: number): { days: boolean[]; streak: number } {
  const rand = seededRandom(seedIdx * 53 + 7);
  const days: boolean[] = [];
  for (let i = 0; i < 35; i++) days.push(rand() > 0.28);
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i]) streak++;
    else break;
  }
  return { days, streak };
}

/** Ported from buildStudentPayments: real seed rows if any, else synthesised. */
export function buildStudentPayments(seedIdx: number, name: string, className: string) {
  const matched = PAYMENTS_SEED.filter((p) => p.name === name);
  if (matched.length) return matched;

  const rand = seededRandom(seedIdx * 71 + 29);
  const out = [];
  for (let i = 0; i < 2; i++) {
    const d = new Date(TODAY_REF);
    d.setDate(d.getDate() - (i * 28 + 5));
    out.push({
      name,
      className,
      credits: `+${5 + Math.floor(rand() * 5)}`,
      amount: `${(1800 + Math.floor(rand() * 3) * 1200).toLocaleString()} THB`,
      date: d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }),
      method: ["Credit Card", "Bank Transfer", "PromptPay"][Math.floor(rand() * 3)],
      status: "Paid" as const,
    });
  }
  return out;
}

/** Name or parent-phone match, mirroring the design's "name or phone number" hint. */
export function searchStudents(query: string): Student[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return STUDENTS_SEED.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.parentPhone.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
  );
}
