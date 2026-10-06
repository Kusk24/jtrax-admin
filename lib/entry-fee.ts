/**
 * What a tournament entry costs — the same rule the server charges by
 * (jtrax-backend internal/api/pricing.go), so the desk's form can fill the
 * fee in and say why it is that amount.
 *
 * Somebody from outside JCA pays the early-bird price while its window is
 * open, the regular price after. A JCA student pays by whichever reductions
 * the organiser switched on: the early-bird price, the percentage off, or the
 * percentage off the early-bird price.
 */
type Row = Record<string, unknown>;

export type EntryPricing = {
  regular: number;
  earlyBird: number;
  earlyBirdUntil: string;
  discountPct: number;
  studentDiscount: boolean;
  studentEarlyBird: boolean;
};

export type FeeReason = "regular" | "earlyBird" | "student" | "studentEarlyBird" | "studentEarlyBirdDiscount";

const n = (v: unknown) => (v == null || v === "" ? 0 : Number(v) || 0);
const on = (v: unknown) => v === true || n(v) !== 0;

export function pricingFromRow(row: Row | undefined): EntryPricing {
  const r = row ?? {};
  const earlyBird = n(r["early_bird_fee"]);
  return {
    /* An event with only an early-bird price charges that. */
    regular: n(r["regular_fee"]) || earlyBird,
    earlyBird,
    earlyBirdUntil: String(r["early_bird_deadline"] ?? ""),
    discountPct: n(r["student_discount_pct"]),
    /* The database's defaults (0035): the discount on, the early-bird price off. */
    studentDiscount: r["student_gets_discount"] === undefined ? true : on(r["student_gets_discount"]),
    studentEarlyBird: on(r["student_gets_early_bird"]),
  };
}

/** Whether the early-bird window runs on `today` (YYYY-MM-DD). */
function earlyBirdOpen(p: EntryPricing, today: string): boolean {
  return p.earlyBird > 0 && p.earlyBirdUntil !== "" && today <= p.earlyBirdUntil.slice(0, 10);
}

/** Percentage off, rounded to whole baht. */
function discounted(fee: number, pct: number): number {
  if (pct <= 0 || fee <= 0) return fee;
  return Math.round((fee * (100 - pct)) / 100);
}

export function entryFee(p: EntryPricing, who: { student: boolean; today: string }): { fee: number; reason: FeeReason } {
  const early = earlyBirdOpen(p, who.today);
  if (!who.student) return early ? { fee: p.earlyBird, reason: "earlyBird" } : { fee: p.regular, reason: "regular" };
  const base = p.studentEarlyBird && early ? p.earlyBird : p.regular;
  const off = p.studentDiscount && p.discountPct > 0;
  const fee = off ? discounted(base, p.discountPct) : base;
  if (p.studentEarlyBird && early) return { fee, reason: off ? "studentEarlyBirdDiscount" : "studentEarlyBird" };
  return { fee, reason: off ? "student" : "regular" };
}
