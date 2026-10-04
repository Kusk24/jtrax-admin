import { describe, expect, it } from "vitest";
import { ageCheck, categoryAgeLimit } from "./age-group";

describe("categoryAgeLimit", () => {
  it("reads the age group however the organiser wrote it", () => {
    expect(categoryAgeLimit("U10")).toBe(10);
    expect(categoryAgeLimit("U08")).toBe(8);
    expect(categoryAgeLimit("Under 10")).toBe(10);
    expect(categoryAgeLimit("Open")).toBe(0);
    expect(categoryAgeLimit("Unrated")).toBe(0);
  });

  it("flags an Under 10 entry born too early", () => {
    expect(ageCheck({ category: "Under 10", startDate: "2026-11-01", dateOfBirth: "2015-12-31" })).toBe("tooOld");
    expect(ageCheck({ category: "Under 10", startDate: "2026-11-01", dateOfBirth: "2016-01-01" })).toBeNull();
  });
});
