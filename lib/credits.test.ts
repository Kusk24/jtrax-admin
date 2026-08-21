/**
 * One credit is an hour, so balances are fractional and the arithmetic is
 * binary floating point. These guard the number the desk actually reads.
 */
import { describe, expect, it } from "vitest";
import { fmtCredits } from "./live";

describe("a credit balance as a person would write it", () => {
  it("keeps a half hour", () => {
    expect(fmtCredits(13.5)).toBe("13.5");
  });

  it("drops the decimal from a whole balance", () => {
    expect(fmtCredits(14)).toBe("14");
  });

  /* 14 − 0.1 − 0.2 and friends: the right number, the wrong thing to put on a
     chip. */
  it("does not show floating-point dust", () => {
    expect(fmtCredits(14 - 0.1 - 0.2 - 0.2)).toBe("13.5");
    expect(fmtCredits(0.1 + 0.2)).toBe("0.3");
  });

  /* A twenty-minute make-up lesson is a third of a credit, which no amount of
     arithmetic makes exact. Two places is what the desk can act on. */
  it("rounds a third of an hour to something readable", () => {
    expect(fmtCredits(1 / 3)).toBe("0.33");
    expect(fmtCredits(10 - 1 / 3)).toBe("9.67");
  });

  it("keeps the sign on an overdrawn balance", () => {
    expect(fmtCredits(-1.5)).toBe("-1.5");
  });
});
