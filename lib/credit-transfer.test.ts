import { describe, expect, it } from "vitest";
import {
  creditsForValue,
  planTransfer,
  ratePerCredit,
  roundCredits,
  floorToHalfCredit,
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
    // which no session can spend, so it lands on the half below: 4.5.
    // Not 5: that would be 5,000 baht of teaching for 4,800 paid.
    expect(plan.value).toBe(4800);
    expect(plan.credits).toBe(4.5);
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
    // 4,800 baht at 2,000 an hour is 2.4 hours → the half below is 2.
    expect(p.credits).toBe(2);
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

/**
 * Where a converted balance lands.
 *
 * A session costs 0.5 or 1 — the academy has no smaller unit of teaching, so a
 * converted balance must land where it can actually be spent. The result is
 * rounded, never the rates.
 *
 * **Down**, and the direction has now been changed twice. Up was rejected for
 * handing out free hours. Nearest replaced it and was reported from the desk:
 * twenty hours of a 600/hr course moved to a 900/hr course and back came out
 * at twenty and a half. Rounding a rate conversion up creates money nobody
 * paid, and each hop compounds the last.
 */
describe("the conversion lands on the half-credit grid", () => {
  it("takes the half below, never the one above", () => {
    const plan = planTransfer({ balance: 10, from: BEGINNER, to: { credits: 10, price: 18000 } });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    // 10 at 600 is 6,000; at 1,800 an hour that is 3.333… hours → 3, not 3.5.
    expect(plan.credits).toBe(3);
  });

  it("gives nothing away on a near-miss", () => {
    // 4,800 baht at 4,700 an hour is 1.02 hours: 1, not 1.5.
    const plan = planTransfer({ balance: 8, from: BEGINNER, to: { credits: 1, price: 4700 } });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.credits).toBe(1);
  });

  it("13.2, 13.3 and 13.4 are all 13", () => {
    expect(floorToHalfCredit(13.2)).toBe(13);
    expect(floorToHalfCredit(13.3)).toBe(13);
    expect(floorToHalfCredit(13.4)).toBe(13);
    expect(floorToHalfCredit(13.6)).toBe(13.5);
  });

  it("leaves a balance already on the grid alone", () => {
    expect(floorToHalfCredit(16.5)).toBe(16.5);
    expect(floorToHalfCredit(7)).toBe(7);
  });

  /* 12000/900*2 is 26.666666666666668, and 19.5*2 is 38.99999999999999 —
     flooring the second raw would cost half a credit that is really there. */
  it("is not fooled by floating-point dust", () => {
    expect(floorToHalfCredit(16.500000000000004)).toBe(16.5);
    expect(floorToHalfCredit(19.499999999999996)).toBe(19.5);
    expect(floorToHalfCredit(0.1 + 0.2 + 0.2)).toBe(0.5);
  });
});

/**
 * The property the direction exists for.
 *
 * Reported from the desk: 20 credits of Beginner moved to Master came back as
 * 20.5, so the academy handed over half an hour it had never been paid for.
 *
 * A conversion is an exchange, not a measurement. What lands must be worth no
 * more than what left — otherwise a balance grows by being moved, and a
 * patient office could mint hours by moving one back and forth.
 */
describe("a conversion never creates value", () => {
  const MASTER = { credits: 20, price: 18000 }; // 900 an hour

  it("does not give half an hour away on the reported round trip", () => {
    const there = planTransfer({ balance: 20, from: BEGINNER, to: MASTER });
    expect(there.ok && there.credits).toBe(13);

    const back = planTransfer({ balance: 13, from: MASTER, to: BEGINNER });
    /* 13 at 900 is 11,700; at 600 an hour that is 19.5 exactly. */
    expect(back.ok && back.credits).toBe(19.5);
    /* And the thing that matters: not more than the twenty that went in. */
    expect(back.ok && back.credits).toBeLessThanOrEqual(20);
  });

  /* Across every pair of rates the academy could plausibly set, and every
     balance it could hold, converting must never be worth more than holding. */
  it("holds for any rates and any balance", () => {
    const rates = [
      { credits: 20, price: 12000 }, { credits: 20, price: 14000 },
      { credits: 20, price: 18000 }, { credits: 20, price: 20000 },
      { credits: 10, price: 9500 }, { credits: 1, price: 4700 },
      { credits: 8, price: 16000 },
    ];
    for (const from of rates) {
      for (const to of rates) {
        for (const balance of [0.5, 1, 4, 7.5, 13, 16.5, 20, 33.5, 100]) {
          const plan = planTransfer({ balance, from, to });
          if (!plan.ok) continue;
          expect(plan.credits * plan.toRate).toBeLessThanOrEqual(plan.value + 1e-9);
        }
      }
    }
  });

  /* Moving a balance around cannot grow it, however many hops. */
  it("cannot be pumped by moving a balance back and forth", () => {
    let credits = 20;
    let rate = BEGINNER;
    for (let hop = 0; hop < 12; hop += 1) {
      const to = rate === BEGINNER ? MASTER : BEGINNER;
      const plan = planTransfer({ balance: credits, from: rate, to });
      if (!plan.ok) break;
      credits = plan.credits;
      rate = to;
      expect(credits * plan.toRate).toBeLessThanOrEqual(12000 + 1e-9);
    }
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
