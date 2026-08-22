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
 */
export function roundCredits(credits: number): number {
  return Math.round(credits * 100) / 100;
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
    credits: roundCredits(value / toRate),
    value,
  };
}
