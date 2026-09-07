import { describe, expect, it } from "vitest";
import { CHECK_BELOW, draftFromScan, matchLevel, type ScannedForm } from "./scan-to-draft";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

/** A blank reading, so each test only states the fields it cares about. */
function form(over: Partial<ScannedForm> = {}): ScannedForm {
  const empty = { value: "", confidence: 0 };
  return {
    name: empty, gender: empty, address: empty, dateOfBirth: empty, email: empty,
    currentSchool: empty, contactNumber: empty, chessLevel: empty, fideId: empty,
    fideRating: empty, howDidYouKnow: empty, enrolledBefore: empty,
    previousSchool: empty, coursePackage: empty, courses: [],
    ...over,
  };
}

describe("matchLevel", () => {
  it("matches regardless of case and spacing", () => {
    expect(matchLevel("  beginner ", LEVELS)).toBe("Beginner");
    expect(matchLevel("ADVANCED", LEVELS)).toBe("Advanced");
  });

  it("matches an abbreviation a parent would actually write", () => {
    expect(matchLevel("inter", LEVELS)).toBe("Intermediate");
  });

  it("leaves something unrecognisable for staff rather than guessing", () => {
    expect(matchLevel("quite good really", LEVELS)).toBe("");
    expect(matchLevel("", LEVELS)).toBe("");
  });
});

describe("draftFromScan", () => {
  it("fills the fields that genuinely correspond", () => {
    const { patch } = draftFromScan(form({
      name: { value: "Somchai Jaidee", confidence: 0.95 },
      dateOfBirth: { value: "2016-06-02", confidence: 0.9 },
      chessLevel: { value: "beginner", confidence: 0.8 },
      currentSchool: { value: "Sarasas Witaed", confidence: 0.7 },
      fideId: { value: "6300123", confidence: 0.9 },
      fideRating: { value: "1234", confidence: 0.9 },
    }), LEVELS);

    expect(patch).toMatchObject({
      name: "Somchai Jaidee",
      dateOfBirth: "2016-06-02",
      level: "Beginner",
      school: "Sarasas Witaed",
      fideId: "6300123",
      fideRating: "1234",
    });
  });

  it("puts the form's single email and phone on the guardian", () => {
    const { patch } = draftFromScan(form({
      email: { value: "mum@example.com", confidence: 0.9 },
      contactNumber: { value: "081 234 5678", confidence: 0.9 },
    }), LEVELS);
    expect(patch.parentEmail).toBe("mum@example.com");
    expect(patch.parentPhone).toBe("081 234 5678");
  });

  it("flags a doubtful reading instead of hiding it", () => {
    const { patch, needsCheck } = draftFromScan(form({
      name: { value: "Somchai", confidence: 0.95 },
      fideRating: { value: "1834", confidence: CHECK_BELOW - 0.1 },
    }), LEVELS);
    // Still filled in — staff can see and correct it.
    expect(patch.fideRating).toBe("1834");
    expect(needsCheck).toContain("fideRating");
    expect(needsCheck).not.toContain("name");
  });

  it("refuses a date it cannot put in a date input", () => {
    // The backend sends these through with confidence 0 rather than dropping
    // them, so the console must not push the text into a date field.
    const { patch } = draftFromScan(form({
      dateOfBirth: { value: "02/06/16", confidence: 0 },
    }), LEVELS);
    expect(patch.dateOfBirth).toBeUndefined();
  });

  it("never invents a value for a blank line", () => {
    const { patch, needsCheck } = draftFromScan(form(), LEVELS);
    expect(patch).toEqual({});
    expect(needsCheck).toEqual([]);
  });

  it("reports what it read but cannot place, rather than losing it", () => {
    const { patch, unmapped } = draftFromScan(form({
      gender: { value: "Male", confidence: 0.9 },
      address: { value: "12 Sukhumvit", confidence: 0.8 },
      coursePackage: { value: "20 credits", confidence: 0.7 },
      courses: ["CHESS", "CODING"],
    }), LEVELS);

    // Courses are a different axis from the console's class options, so they
    // must not silently become one.
    expect(patch).toEqual({});
    const labels = unmapped.map((u) => u.label);
    expect(labels).toEqual(
      expect.arrayContaining(["Gender", "Address", "Course package", "Courses ticked"]),
    );
    expect(unmapped.find((u) => u.label === "Courses ticked")?.value).toBe("CHESS, CODING");
  });

  it("keeps Thai text as written", () => {
    const { patch } = draftFromScan(form({
      name: { value: "สมชาย ใจดี", confidence: 0.9 },
    }), LEVELS);
    expect(patch.name).toBe("สมชาย ใจดี");
  });
});
