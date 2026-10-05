import { describe, expect, it } from "vitest";
import { CLASS_CATEGORY_COLORS, COLORS, classDotColor, setClassLevels } from "./theme";

describe("a course's dot", () => {
  it("takes its level's colour, the same as its Today's Classes card", () => {
    setClassLevels([
      { name: "JCA NXT", level: "Advanced" },
      { name: "JCA Starters", level: "Beginner" },
      { name: "JCA Juniors", level: "Intermediate" },
    ]);
    expect(classDotColor("JCA NXT")).toBe(CLASS_CATEGORY_COLORS.Advanced);
    expect(classDotColor("JCA Starters")).toBe(CLASS_CATEGORY_COLORS.Beginner);
    expect(classDotColor("JCA Juniors")).toBe(CLASS_CATEGORY_COLORS.Intermediate);
  });

  it("falls back to a level word in the name, else grey", () => {
    setClassLevels([]);
    expect(classDotColor("Beginner Chess (Sec 101)")).toBe(CLASS_CATEGORY_COLORS.Beginner);
    expect(classDotColor("Verify Clear Bug")).toBe(COLORS.textSecondary);
  });
});
