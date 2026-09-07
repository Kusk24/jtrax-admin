/**
 * What the dashboard's charts count.
 *
 * Grouping only — no colours and no copy, both of which belong to the
 * component and the message catalogue. Kept out of `derive.ts` because that
 * file is the follow-up buckets and the revenue geometry, and kept pure so
 * each grouping can be checked against a handful of rows.
 */

import type { CheckinDef, Payment, Student } from "./data";

/** The five conditions a student can be in, in the order the donut draws them:
    healthy first, then the two that need a call, then the two that have
    already lapsed. Matches the follow-up card's ordering. */
export const STATUS_ORDER: Student["status"][] = [
  "Normal",
  "Low Credit",
  "Expiring",
  "Expired",
  "Inactive",
];

/** How many students are in each condition. Always returns all five keys, so
    the legend keeps a stable shape as the roster changes. */
export function statusCounts(students: Pick<Student, "status">[]): Record<Student["status"], number> {
  const counts = {
    Normal: 0, "Low Credit": 0, Expiring: 0, Expired: 0, Inactive: 0,
  } as Record<Student["status"], number>;
  for (const s of students) counts[s.status] += 1;
  return counts;
}

export type Grouped = { label: string; value: number };

/** Students per course, biggest first. A student with no course lands under
    `unknownLabel` rather than being dropped — an unenrolled child is a real
    thing the desk should see, not a rounding error. */
export function byCourse(
  students: Pick<Student, "className">[],
  unknownLabel: string,
  limit = 5,
): { rows: Grouped[]; hidden: number } {
  return rank(students.map((s) => s.className?.trim() || unknownLabel), limit);
}

/** Takings per payment method this month, biggest first. Sums money rather
    than counting rows: two card payments of 200 are not "more" than one
    transfer of 9,000. */
export function byMethod(payments: Pick<Payment, "method" | "amount">[], limit = 5): { rows: Grouped[]; hidden: number } {
  const totals = new Map<string, number>();
  for (const p of payments) {
    const key = p.method?.trim() || "—";
    totals.set(key, (totals.get(key) ?? 0) + parseAmount(p.amount));
  }
  return top([...totals].map(([label, value]) => ({ label, value })), limit);
}

/**
 * "1,200 THB" and "฿1,200" and "1200" all have to add up. Payment.amount is a
 * display string, so anything that is not a digit or a decimal point goes —
 * including the thousands separators that would otherwise make 1,200 parse
 * as 1.
 */
export function parseAmount(amount: string | number): number {
  if (typeof amount === "number") return amount;
  const n = Number(String(amount).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Today's attendance, split three ways. `expected` is everyone on today's
    registers; a child who never arrived is the difference. */
export function attendanceSplit(
  checkins: Pick<CheckinDef, "status">[],
  expected: number,
): { inClass: number; left: number; absent: number; arrived: number; expected: number } {
  const inClass = checkins.filter((c) => c.status === "In class").length;
  const left = checkins.length - inClass;
  /* Never negative: a walk-in checked into a class they were not enrolled on
     makes arrivals exceed the register, and a negative slice draws backwards. */
  const total = Math.max(expected, checkins.length);
  return { inClass, left, absent: total - checkins.length, arrived: checkins.length, expected: total };
}

function rank(labels: string[], limit: number): { rows: Grouped[]; hidden: number } {
  const counts = new Map<string, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  return top([...counts].map(([label, value]) => ({ label, value })), limit);
}

/** Biggest first, then cut to `limit`. The tail is returned as a count rather
    than folded into an "Other" bar, which would out-rank real courses. */
function top(rows: Grouped[], limit: number): { rows: Grouped[]; hidden: number } {
  const sorted = rows.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  return { rows: sorted.slice(0, limit), hidden: Math.max(0, sorted.length - limit) };
}

/**
 * This month's takings against the same stretch of last month.
 *
 * Month-to-date on both sides, not this month against all of last month: on
 * the 8th of September, August has had thirty days to accumulate and
 * September has had eight, so a whole-month comparison reports a collapse
 * every month and is right about none of them.
 *
 * `pct` is null when last month took nothing — there is no percentage change
 * from zero, and "+100%" would be an invention.
 */
export function monthToDate(
  payments: Pick<Payment, "amount" | "isoDate" | "status">[],
  now = new Date(),
): { current: number; previous: number; pct: number | null; previousMonth: Date } {
  const day = now.getDate();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const upTo = (year: number, month: number) => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    return payments
      .filter((p) => {
        /* Money the academy has: pending has not cleared, refunded went back
           out. Same rule as the revenue total the tile shows. */
        if ((p.status || "Paid") !== "Paid") return false;
        const iso = p.isoDate ?? "";
        return iso.startsWith(prefix) && Number(iso.slice(8, 10)) <= day;
      })
      .reduce((sum, p) => sum + parseAmount(p.amount), 0);
  };

  const current = upTo(now.getFullYear(), now.getMonth());
  const previous = upTo(previousMonth.getFullYear(), previousMonth.getMonth());
  return {
    current,
    previous,
    pct: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null,
    previousMonth,
  };
}
