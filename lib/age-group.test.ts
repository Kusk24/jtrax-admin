import { describe, expect, it } from "vitest";
import { ageCheck, categoryAgeLimit, dobTooYoung, latestBirthDate, suggestCategory } from "./age-group";

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

describe("the category suggested for a date of birth", () => {
  const cats = [
    { id: "u8", name: "U8" }, { id: "u10", name: "Under 10" }, { id: "u12", name: "U12" }, { id: "open", name: "Open" },
  ];
  it("is the youngest group the player can enter, by birth year", () => {
    expect(suggestCategory(cats, "2018-12-31", "2026-11-01")).toBe("u8");
    expect(suggestCategory(cats, "2017-01-01", "2026-11-01")).toBe("u10");
    expect(suggestCategory(cats, "2015-06-01", "2026-11-01")).toBe("u12");
  });
  it("is the open group when no age group fits", () => {
    expect(suggestCategory(cats, "2005-01-01", "2026-11-01")).toBe("open");
  });
  it("is nothing when two groups tie, or there is no date of birth", () => {
    const split = [{ id: "b", name: "U8 Boys" }, { id: "g", name: "U8 Girls" }];
    expect(suggestCategory(split, "2019-01-01", "2026-11-01")).toBe("");
    expect(suggestCategory(cats, "", "2026-11-01")).toBe("");
  });
});

describe("a date of birth's minimum age", () => {
  it("is a year before today", () => {
    expect(latestBirthDate("2026-10-06")).toBe("2025-10-06");
    expect(latestBirthDate("2028-02-29")).toBe("2027-02-28");
  });
  it("refuses less than a year old, and the future", () => {
    expect(dobTooYoung("2025-10-07", "2026-10-06")).toBe(true);
    expect(dobTooYoung("2030-01-01", "2026-10-06")).toBe(true);
    expect(dobTooYoung("2025-10-06", "2026-10-06")).toBe(false);
    expect(dobTooYoung("", "2026-10-06")).toBe(false);
  });
});
