import { describe, expect, it } from "vitest";
import { entryFee, pricingFromRow } from "./entry-fee";

const row = {
  regular_fee: 500, early_bird_fee: 400, early_bird_deadline: "2026-10-10",
  student_discount_pct: 10, student_gets_discount: 1, student_gets_early_bird: 0,
};
const before = "2026-10-06";
const after = "2026-10-11";

describe("a tournament entry's fee", () => {
  it("is the early-bird price for an outsider while it runs, then the regular", () => {
    const p = pricingFromRow(row);
    expect(entryFee(p, { student: false, today: before })).toEqual({ fee: 400, reason: "earlyBird" });
    expect(entryFee(p, { student: false, today: "2026-10-10" }).fee).toBe(400);
    expect(entryFee(p, { student: false, today: after })).toEqual({ fee: 500, reason: "regular" });
  });

  it("is the student discount off the regular price by default", () => {
    expect(entryFee(pricingFromRow(row), { student: true, today: before })).toEqual({ fee: 450, reason: "student" });
  });

  it("is the discount off the early-bird price when both are on", () => {
    const p = pricingFromRow({ ...row, student_gets_early_bird: 1 });
    expect(entryFee(p, { student: true, today: before })).toEqual({ fee: 360, reason: "studentEarlyBirdDiscount" });
    expect(entryFee(p, { student: true, today: after })).toEqual({ fee: 450, reason: "student" });
  });

  it("is the early-bird price alone when only that is on", () => {
    const p = pricingFromRow({ ...row, student_gets_discount: 0, student_gets_early_bird: 1 });
    expect(entryFee(p, { student: true, today: before })).toEqual({ fee: 400, reason: "studentEarlyBird" });
  });

  it("defaults to the discount alone, as the database does", () => {
    const p = pricingFromRow({ regular_fee: 500, student_discount_pct: 10 });
    expect(entryFee(p, { student: true, today: before })).toEqual({ fee: 450, reason: "student" });
  });

  it("charges the early-bird price as the regular one when that is all there is", () => {
    const p = pricingFromRow({ early_bird_fee: 300 });
    expect(entryFee(p, { student: false, today: before })).toEqual({ fee: 300, reason: "regular" });
  });
});
