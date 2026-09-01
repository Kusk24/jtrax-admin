import { describe, expect, it } from "vitest";
import {
  creditsForValue,
  planTransfer,
  ratePerCredit,
  roundCredits,
  roundToHalfCredit,
  valueOfLots,
} from "./credit-transfer";

/* Two classes' own packages. Beginner sells 20 credits for 12,000 — 600 an
   hour — and Intermediate 20 for 20,000, which is 1,000. Nothing here is a
   rate anyone typed: it is what each class charges. */
const BEGINNER = { credits: 20, price: 12000 };
const INTERMEDIATE = { credits: 20, price: 20000 };

describe("what a credit was worth", () => {
  it("is the package price over the credits it buys", () => {
    expect(ratePerCredit(BEGINNER)).toBe(600);
    expect(ratePerCredit(INTERMEDIATE)).toBe(1000);
  });

  /* A class the academy adds next term prices itself the day it exists. */
  it("works for any package, not a fixed list of classes", () => {
    expect(ratePerCredit({ credits: 8, price: 16000 })).toBe(2000);
    expect(ratePerCredit({ credits: 1, price: 950 })).toBe(950);
  });

  it("is unknown for a free class", () => {
    expect(ratePerCredit({ credits: 20, price: 0 })).toBeNull();
  });

  it("is unknown for a package that buys nothing", () => {
    expect(ratePerCredit({ credits: 0, price: 12000 })).toBeNull();
  });
});

describe("moving a balance to a dearer class", () => {
  /* The case as reported: a child leaves Beginner with 8 credits left and
     moves up to Intermediate. */
  const plan = planTransfer({ balance: 8, from: BEGINNER, to: INTERMEDIATE });

  it("keeps the money, not the hours", () => {
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    // 8 hours at 600 is 4,800 baht; at 1,000 an hour that is 4.8 hours —
    // which no session can spend, so it lands on the next half: 5.
    expect(plan.value).toBe(4800);
    expect(plan.credits).toBe(5);
  });

  it("reports both rates, so the desk can see the sum", () => {
    if (!plan.ok) return;
    expect(plan.fromRate).toBe(600);
    expect(plan.toRate).toBe(1000);
    expect(plan.balance).toBe(8);
  });

  /* A private class invented after all this was written, at 2,000 an hour. */
  it("converts into a class that did not exist when this was written", () => {
    const p = planTransfer({ balance: 8, from: BEGINNER, to: { credits: 5, price: 10000 } });
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.toRate).toBe(2000);
    // 4,800 baht at 2,000 an hour is 2.4 hours → the next half is 2.5.
    expect(p.credits).toBe(2.5);
  });
});

describe("moving a balance to a cheaper class", () => {
  it("buys more hours for the same money", () => {
    const plan = planTransfer({ balance: 3, from: INTERMEDIATE, to: BEGINNER });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    // 3 hours at 1,000 is 3,000 baht; at 600 an hour that is 5 hours.
    expect(plan.credits).toBe(5);
  });
});

describe("moving between classes that cost the same", () => {
  it("changes nothing", () => {
    const plan = planTransfer({ balance: 7.5, from: BEGINNER, to: { credits: 10, price: 6000 } });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.credits).toBe(7.5);
  });
});

describe("a half credit survives the trip", () => {
  it("moves fractions as readily as whole hours", () => {
    const plan = planTransfer({ balance: 0.5, from: BEGINNER, to: { credits: 10, price: 3000 } });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    // 0.5 at 600 is 300 baht; at 300 an hour that is 1 hour.
    expect(plan.credits).toBe(1);
  });
});

describe("what cannot be moved", () => {
  it("refuses an empty balance", () => {
    const plan = planTransfer({ balance: 0, from: BEGINNER, to: INTERMEDIATE });
    expect(plan).toEqual({ ok: false, problem: "nothingToMove" });
  });

  /* A balance already overdrawn is a debt, and moving a debt to another class
     is not what anyone means by carrying credits over. */
  it("refuses a negative balance", () => {
    const plan = planTransfer({ balance: -2, from: BEGINNER, to: INTERMEDIATE });
    expect(plan).toEqual({ ok: false, problem: "nothingToMove" });
  });

  /* A class with no package priced, or a free one, has no rate. Guessing one
     either hands out free hours or takes paid ones away. */
  it("refuses when either rate is unknown", () => {
    expect(planTransfer({ balance: 5, from: { credits: 5, price: 0 }, to: INTERMEDIATE })).toEqual({
      ok: false,
      problem: "rateUnknown",
    });
    expect(planTransfer({ balance: 5, from: BEGINNER, to: { credits: 0, price: 0 } })).toEqual({
      ok: false,
      problem: "rateUnknown",
    });
  });
});

describe("rounding a typed figure", () => {
  /* A hundredth of a credit is thirty-six seconds of class. */
  it("keeps two decimal places", () => {
    expect(roundCredits(1 / 3)).toBe(0.33);
    expect(roundCredits(3.5999999999)).toBe(3.6);
  });

  it("leaves a whole number whole", () => {
    expect(roundCredits(10)).toBe(10);
  });
});

/* A session costs 0.5 or 1 — the academy has no smaller unit of teaching, so
   a converted balance must land where it can actually be spent. The result is
   rounded, never the rates, and to the NEAREST half: rounding up was tried
   and rejected, because it hands out up to half an hour free on every move. */
describe("the conversion lands on the half-credit grid", () => {
  it("rounds the awkward division to the nearest half", () => {
    const plan = planTransfer({ balance: 10, from: BEGINNER, to: { credits: 10, price: 18000 } });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    // 10 at 600 is 6,000; at 1,800 an hour that is 3.333... hours → 3.5.
    expect(plan.credits).toBe(3.5);
  });

  it("rounds down when down is nearer — nothing is given away", () => {
    // 4,800 baht at 4,700 an hour is 1.02 hours: 1, not 1.5.
    const plan = planTransfer({ balance: 8, from: BEGINNER, to: { credits: 1, price: 4700 } });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.credits).toBe(1);
  });

  /* The rule as the academy stated it. */
  it("13.2 is 13; 13.3 and 13.4 are 13.5", () => {
    expect(roundToHalfCredit(13.2)).toBe(13);
    expect(roundToHalfCredit(13.3)).toBe(13.5);
    expect(roundToHalfCredit(13.4)).toBe(13.5);
  });

  it("leaves a balance already on the grid alone", () => {
    expect(roundToHalfCredit(16.5)).toBe(16.5);
    expect(roundToHalfCredit(7)).toBe(7);
  });

  it("is not fooled by floating-point dust", () => {
    expect(roundToHalfCredit(16.500000000000004)).toBe(16.5);
    expect(roundToHalfCredit(0.1 + 0.2 + 0.2)).toBe(0.5);
  });
});

/**
 * A balance held outside any course.
 *
 * Reported: a child bought twenty hours of Beginner, moved to Intermediate and
 * became 16.5, had every course deleted, then rejoined Beginner — and was
 * given 16.5 back instead of the ~19.5 their money was worth. The console read
 * the course off whichever ledger entry happened to be last, so Intermediate
 * hours were priced as Beginner ones and the conversion was a no-op.
 *
 * The number left is one question; what it is worth is another, and only the
 * second one survives a move.
 */
describe("a balance made of several courses", () => {
  /* The reported ledger exactly: bought 20 of Beginner, moved out, landed as
     16.5 of Intermediate, then both enrolments deleted. */
  const lots = [
    { credits: 20, rate: BEGINNER },
    { credits: -20, rate: BEGINNER },
    { credits: 16.5, rate: INTERMEDIATE },
  ];

  it("is worth what the surviving hours cost, not what the count suggests", () => {
    /* 16.5 hours of Intermediate at 1,000 = 16,500. The two Beginner entries
       cancel, as they should — the move already spent them. */
    expect(valueOfLots(lots)).toBe(16500);
  });

  it("buys back the hours that money is worth in a cheaper course", () => {
    /* 16,500 at Beginner's 600 an hour is 27.5 — more hours, because the
       course is cheaper. Not 16.5, which is what pricing Intermediate hours as
       Beginner ones produced. */
    expect(creditsForValue(valueOfLots(lots)!, BEGINNER)).toBe(27.5);
  });

  it("is not simply the number of credits left", () => {
    const left = lots.reduce((sum, l) => sum + l.credits, 0);
    expect(left).toBe(16.5);
    expect(creditsForValue(valueOfLots(lots)!, BEGINNER)).not.toBe(left);
  });

  /* Round-tripping through a dearer course and back should return roughly what
     was bought — the only loss is the half-credit rounding of each hop. */
  it("returns close to the original purchase after a round trip", () => {
    const there = creditsForValue(valueOfLots([{ credits: 20, rate: BEGINNER }])!, INTERMEDIATE)!;
    const back = creditsForValue(valueOfLots([{ credits: there, rate: INTERMEDIATE }])!, BEGINNER)!;
    expect(back).toBe(20);
  });

  it("has no value when one of its lots has no rate", () => {
    expect(valueOfLots([...lots, { credits: 3, rate: { credits: 0, price: 0 } }])).toBeNull();
  });

  it("cannot be converted into a course with no rate", () => {
    expect(creditsForValue(16500, { credits: 20, price: 0 })).toBeNull();
  });
});
