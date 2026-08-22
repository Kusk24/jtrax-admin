import { describe, expect, it } from "vitest";
import { planTransfer, ratePerCredit, roundCredits } from "./credit-transfer";

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
    // 8 hours at 600 is 4,800 baht; at 1,000 an hour that is 4.8 hours.
    expect(plan.value).toBe(4800);
    expect(plan.credits).toBe(4.8);
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
    expect(p.credits).toBe(2.4);
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

describe("rounding", () => {
  /* A hundredth of a credit is thirty-six seconds of class. */
  it("keeps two decimal places", () => {
    expect(roundCredits(1 / 3)).toBe(0.33);
    expect(roundCredits(3.5999999999)).toBe(3.6);
  });

  it("leaves a whole number whole", () => {
    expect(roundCredits(10)).toBe(10);
  });

  it("rounds the awkward division rather than storing its tail", () => {
    const plan = planTransfer({ balance: 10, from: BEGINNER, to: { credits: 10, price: 18000 } });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    // 10 at 600 is 6,000; at 1,800 an hour that is 3.333... hours.
    expect(plan.credits).toBe(3.33);
  });
});
