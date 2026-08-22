/**
 * Filtering the roster by the class a child is in.
 *
 * The obvious implementation filters on the student row's `className`, which
 * is only ever the *first* active enrolment — so a child in two classes would
 * be missing from the second one, which is exactly the case a class filter is
 * opened for.
 */
import { describe, expect, it } from "vitest";
import { classFilterOptions, classNamesOfStudent, isInClass } from "./student-classes";

/* Anong is in two classes. Boon left Beginner for Intermediate. Chai finished
   Beginner. Dao is in a class the academy has since retired. */
const CLASSES = [
  { class_id: "beg", name: "Beginner" },
  { class_id: "int", name: "Intermediate" },
  { class_id: "old", name: "Saturday Camp", archived_at: "2026-01-04" },
];

const ENROLMENTS = [
  { enrollment_id: "e1", student_id: "anong", class_id: "beg", status: "Active" },
  { enrollment_id: "e2", student_id: "anong", class_id: "int", status: "Active" },
  { enrollment_id: "e3", student_id: "boon", class_id: "beg", status: "Withdrawn" },
  { enrollment_id: "e4", student_id: "boon", class_id: "int", status: "Active" },
  { enrollment_id: "e5", student_id: "chai", class_id: "beg", status: "Completed" },
  { enrollment_id: "e6", student_id: "dao", class_id: "old", status: "Active" },
  /* A row from before the status column had its default. */
  { enrollment_id: "e7", student_id: "eak", class_id: "beg" },
];

const RAW = { classes: CLASSES, enrollments: ENROLMENTS };
const LISTED = ["anong", "boon", "chai", "dao", "eak"];

describe("who the filter shows", () => {
  it("finds a child under the second class they attend", () => {
    /* The one the roster's Class column does not name. */
    expect(isInClass(ENROLMENTS, "anong", "int")).toBe(true);
    expect(isInClass(ENROLMENTS, "anong", "beg")).toBe(true);
  });

  it("does not show a child under a class they withdrew from", () => {
    expect(isInClass(ENROLMENTS, "boon", "beg")).toBe(false);
    expect(isInClass(ENROLMENTS, "boon", "int")).toBe(true);
  });

  it("does not show one under a course they completed", () => {
    expect(isInClass(ENROLMENTS, "chai", "beg")).toBe(false);
  });

  it("shows one whose enrolment predates the status default", () => {
    expect(isInClass(ENROLMENTS, "eak", "beg")).toBe(true);
  });

  it("shows everyone when no class is chosen", () => {
    for (const id of LISTED) expect(isInClass(ENROLMENTS, id, "")).toBe(true);
  });
});

describe("what the filter offers", () => {
  it("counts the children actually in each class", () => {
    const counts = Object.fromEntries(
      classFilterOptions(RAW, LISTED).map((c) => [c.name, c.count]),
    );
    /* Beginner: Anong and Eak. Boon withdrew, Chai completed. */
    expect(counts).toEqual({ Beginner: 2, Intermediate: 2 });
  });

  it("leaves out a class the academy has retired", () => {
    const names = classFilterOptions(RAW, LISTED).map((c) => c.name);
    expect(names).not.toContain("Saturday Camp");
  });

  /* Deleting a student leaves their enrolments behind for a moment; a class
     whose whole roster has gone should read 0, not 3. */
  it("does not count children who are not on the list", () => {
    const counts = classFilterOptions(RAW, ["boon"]).map((c) => `${c.name}:${c.count}`);
    expect(counts).toEqual(["Beginner:0", "Intermediate:1"]);
  });
});

describe("the Class column", () => {
  it("names every class a child is in", () => {
    expect(classNamesOfStudent(RAW, "anong")).toEqual(["Beginner", "Intermediate"]);
  });

  it("names only the one they are still in", () => {
    expect(classNamesOfStudent(RAW, "boon")).toEqual(["Intermediate"]);
  });

  it("names none for a child who has left them all", () => {
    expect(classNamesOfStudent(RAW, "chai")).toEqual([]);
  });
});
