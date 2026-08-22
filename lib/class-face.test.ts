/**
 * What a class is drawn and labelled with when nobody has chosen yet.
 *
 * Reported: changing the icon or the badge in Academy does nothing. Both were
 * derived from `class_type` on every render, so the picker set state the next
 * render discarded — and neither was ever sent to the backend. They are stored
 * now; these are the fallbacks for the classes that predate the columns.
 */
import { describe, expect, it } from "vitest";
import { CLASS_ICONS, CLASS_TYPES, badgeOf, classTypeOf, iconOf } from "./class-face";

describe("the icon", () => {
  it("is whatever was chosen", () => {
    expect(iconOf("rook", "Group")).toBe("rook");
    expect(iconOf("pawn", "Master")).toBe("pawn");
  });

  /* The bug, stated as a rule: a stored choice must beat the guess, or the
     picker is decoration. */
  it("beats the guess its type would make", () => {
    expect(iconOf("bishop", "Master")).not.toBe("trophy");
    expect(iconOf("bishop", "Master")).toBe("bishop");
  });

  it("falls back to what the console used to draw", () => {
    /* Exactly the old three-way derivation, so a class from before the column
       existed looks the way it always has. */
    expect(iconOf(null, "Master")).toBe("trophy");
    expect(iconOf(null, "Private")).toBe("king");
    expect(iconOf(null, "Group")).toBe("queen");
    expect(iconOf("", "Group")).toBe("queen");
    expect(iconOf(undefined, "")).toBe("queen");
  });

  /* The set belongs to the console and moves with the design. A retired name
     must not draw an empty box: the picker cannot offer a piece it no longer
     has, so nobody could pick their way back out of one. */
  it("falls back for a piece the picker no longer offers", () => {
    expect(iconOf("unicorn", "Private")).toBe("king");
    expect(CLASS_ICONS).not.toContain("unicorn");
  });

  it("only ever returns something the picker can show", () => {
    for (const stored of ["rook", "unicorn", "", null, 42]) {
      expect(CLASS_ICONS).toContain(iconOf(stored, "Group"));
    }
  });
});

describe("the badge", () => {
  it("is whatever was typed", () => {
    expect(badgeOf("Weekend", "Group")).toBe("Weekend");
  });

  /* It used to *be* class_type under a different label, so the field read
     "Group" back however it was filled in. */
  it("is not the class type when one was typed", () => {
    expect(badgeOf("Exam prep", "Group")).toBe("Exam prep");
  });

  it("falls back to the class type when there is none", () => {
    expect(badgeOf(null, "Master")).toBe("Master");
    expect(badgeOf("", "Private")).toBe("Private");
  });

  /* An empty chip reads as a rendering fault rather than a deliberate blank. */
  it("treats whitespace as none", () => {
    expect(badgeOf("   ", "Group")).toBe("Group");
  });
});

/**
 * The class type — what the screen called "Category".
 *
 * `class.class_type` is NOT NULL with a three-value CHECK and has been since
 * the first migration. The console never asked for it, and its draft seeded
 * the field with "Beginner", which is a *level* and not one of the three — so
 * the guard on save fell through to "Group" every single time. Every class the
 * academy created is a Group class whatever it actually is.
 */
describe("the class type", () => {
  it("is one of the three the database allows", () => {
    expect(CLASS_TYPES).toEqual(["Private", "Group", "Master"]);
  });

  it("keeps a stored one", () => {
    expect(classTypeOf("Private")).toBe("Private");
    expect(classTypeOf("Master")).toBe("Master");
  });

  /* The exact value the old form put in its draft. It looks like an answer and
     is not one, which is how every class ended up a Group. */
  it("does not accept a level as a type", () => {
    expect(classTypeOf("Beginner")).toBe("Group");
  });

  it("falls back to what the column would default to", () => {
    expect(classTypeOf(null)).toBe("Group");
    expect(classTypeOf("")).toBe("Group");
    expect(classTypeOf(undefined)).toBe("Group");
  });

  /* A form that opens on a value its picker cannot offer rewrites that value
     the moment anybody presses Save. */
  it("only ever returns something the picker can show", () => {
    for (const stored of ["Private", "Beginner", "", null, 7]) {
      expect(CLASS_TYPES).toContain(classTypeOf(stored));
    }
  });
});
