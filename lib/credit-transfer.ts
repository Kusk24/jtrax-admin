/**
 * Carrying credits from a class a child has left into one they have joined.
 *
 * A credit is an hour, and every class charges the same hour differently. So
 * moving a balance is not moving a number: eight credits from a class where
 * twenty cost 12,000 are 4,800 baht of teaching, which in a class where twenty
 * cost 20,000 buys 4.8 hours. The hours change; the money does not.
 *
 * Both rates are read from the two classes' own credit packages, so a level
 * the academy adds next term converts correctly the day it exists. Nothing
 * here knows the name of a class or holds a rate of its own.
 *
 * Credits hang off an enrolment rather than a student, so without this a
 * withdrawn class keeps its balance and a new one starts at nothing — the
 * money is still on the books and the child cannot spend it.
 */

/**
 * A class's price list entry: what a block of credits costs there.
 *
 * The rate comes from the packages, not from a figure typed anywhere. Every
 * class carries one from the moment it is created, so "what is an hour worth
 * here" is answerable for a class the academy invented last week — a private
 * class, a new level — without anyone maintaining a table of conversions.
 */
export type CreditRate = { credits: number; price: number };

/** Money per credit, or null when the package cannot say. */
export function ratePerCredit(rate: CreditRate): number | null {
  if (rate.credits <= 0 || rate.price <= 0) return null;
  return rate.price / rate.credits;
}

/**
 * Rounded to the hundredth of a credit.
 *
 * A third of an hour does not divide, and a ledger full of 3.3333333333333335
 * is unreadable. A hundredth of a credit is thirty-six seconds of class, which
 * is below anything the academy can teach or bill for — and rounding at the
 * point of writing keeps the sum on screen equal to the sum in the database.
 *
 * This is for a figure the office typed. A *computed* conversion goes through
 * roundToHalfCredit instead — see there for why.
 */
export function roundCredits(credits: number): number {
  return Math.round(credits * 100) / 100;
}

/**
 * Rounded to the nearest half credit.
 *
 * A session costs 0.5 for a half hour or 1 for a full one — nothing at the
 * academy ever charges 0.29 of a credit, so a balance like 16.29 is not
 * spendable down to zero: the dust below a half step could never be used.
 * The *result* of the conversion therefore lands on the half-credit grid;
 * the rates themselves are never rounded, or the sum would drift.
 *
 * Nearest, not up: 13.2 becomes 13 and 13.3 becomes 13.5. Rounding up was
 * tried and rejected by the academy — it hands out up to half an hour free
 * on every single move. Nearest caps what either side gives at a quarter
 * credit, and it evens out across moves instead of always costing the
 * academy.
 */
export function roundToHalfCredit(credits: number): number {
  return Math.round(credits * 2) / 2;
}

export type TransferPlan =
  | {
      ok: true;
      /** What is left on the old enrolment, all of which moves. */
      balance: number;
      fromRate: number;
      toRate: number;
      /** What lands on the new enrolment. */
      credits: number;
      /** The money the two sides have in common — the thing being preserved. */
      value: number;
    }
  | { ok: false; problem: "nothingToMove" | "rateUnknown" };

/**
 * Works out what moving a balance would produce, without moving it.
 *
 * The desk sees this before it commits: a conversion nobody was shown is a
 * balance that changed on its own, which is the one thing a family will
 * argue about.
 */
export function planTransfer(opts: {
  balance: number;
  from: CreditRate;
  to: CreditRate;
}): TransferPlan {
  if (opts.balance <= 0) return { ok: false, problem: "nothingToMove" };
  const fromRate = ratePerCredit(opts.from);
  const toRate = ratePerCredit(opts.to);
  /* Without both rates there is no conversion, only a guess — and guessing
     here either hands a family free hours or takes paid ones away. */
  if (fromRate === null || toRate === null) return { ok: false, problem: "rateUnknown" };

  const value = opts.balance * fromRate;
  return {
    ok: true,
    balance: opts.balance,
    fromRate,
    toRate,
    credits: roundToHalfCredit(value / toRate),
    value,
  };
}

/**
 * One part of a loose balance: some hours, and the course they were bought in.
 *
 * A balance held outside any course is rarely one purchase. A child who bought
 * twenty hours of Beginner, moved to Intermediate at a different rate, and then
 * had both enrolments deleted holds three entries: +20 Beginner, −20 Beginner,
 * +16.5 Intermediate. The *number* left is 16.5; what those 16.5 are worth
 * depends on which course each entry was priced in, and the two are not the
 * same question.
 */
export type CreditLot = { credits: number; rate: CreditRate };

/**
 * What a set of lots is worth, each priced in its own course.
 *
 * This is the thing that survives a move — the money — and summing the credit
 * *counts* instead is how a balance silently changes value. Taking the whole
 * balance to be one course's is worse: the console did that, reading the class
 * off whichever entry happened to be last, so a child holding Intermediate
 * hours converted into Beginner at Beginner's own rate and got the same number
 * back rather than the larger one their money bought.
 *
 * Null when any lot has no rate. A total that quietly skipped an entry would
 * convert a family's hours into fewer hours, and a wrong number that looks
 * right is worse here than no number at all.
 */
export function valueOfLots(lots: CreditLot[]): number | null {
  let total = 0;
  for (const lot of lots) {
    const rate = ratePerCredit(lot.rate);
    if (rate === null) return null;
    total += lot.credits * rate;
  }
  return total;
}

/**
 * What that money buys in a course, on the half-credit grid.
 *
 * Same rounding as every other conversion — the academy charges in half hours,
 * so a balance that cannot be spent down to zero is dust nobody can use.
 */
export function creditsForValue(value: number, to: CreditRate): number | null {
  const rate = ratePerCredit(to);
  if (rate === null) return null;
  return roundToHalfCredit(value / rate);
}
