import { describe, expect, it } from "vitest";
import { splitHours } from "./hours";

describe("credits used as hours and minutes", () => {
  it("splits a credit figure into hours and minutes", () => {
    expect(splitHours(9.25)).toEqual({ hours: 9, minutes: 15 });
    expect(splitHours(0.5)).toEqual({ hours: 0, minutes: 30 });
    expect(splitHours(2)).toEqual({ hours: 2, minutes: 0 });
    expect(splitHours(1.9999)).toEqual({ hours: 2, minutes: 0 });
  });

  it("is nothing for nothing", () => {
    expect(splitHours(0)).toEqual({ hours: 0, minutes: 0 });
    expect(splitHours(Number.NaN)).toEqual({ hours: 0, minutes: 0 });
  });
});
