/**
 * Leaving a class.
 *
 * `student_enrollment.status` has had Active / Completed / Withdrawn since the
 * first migration — a lifecycle built for exactly this — and nothing ever read
 * it. A child who had left a class was still offered its sessions and could
 * still be checked into them, so "withdrawn" meant nothing at all.
 */
import { describe, expect, it } from "vitest";
import { activeEnrolments, isActiveEnrolment } from "./live";

const ENROLMENTS = [
  { enrollment_id: "e1", student_id: "anong", class_id: "cls_group", status: "Active" },
  { enrollment_id: "e2", student_id: "anong", class_id: "cls_master", status: "Withdrawn" },
  { enrollment_id: "e3", student_id: "boon", class_id: "cls_group", status: "Completed" },
];

describe("the classes a child is in right now", () => {
  it("leaves out one they have withdrawn from", () => {
    expect(activeEnrolments(ENROLMENTS).map((e) => e.enrollment_id)).not.toContain("e2");
  });

  /* A finished course is not one they are attending either. */
  it("leaves out one they have completed", () => {
    expect(activeEnrolments(ENROLMENTS).map((e) => e.enrollment_id)).not.toContain("e3");
  });

  it("keeps the active one", () => {
    expect(activeEnrolments(ENROLMENTS).map((e) => e.enrollment_id)).toEqual(["e1"]);
  });
});

describe("a status that was never written", () => {
  /* The column is NOT NULL with an Active default, but a row from before that
     default should not drop a child out of their class on a technicality. */
  it("counts a blank status as active", () => {
    expect(isActiveEnrolment({ enrollment_id: "e", student_id: "s", class_id: "c" })).toBe(true);
    expect(isActiveEnrolment({ enrollment_id: "e", status: "" })).toBe(true);
  });

  it("does not count an unknown status as active", () => {
    expect(isActiveEnrolment({ enrollment_id: "e", status: "Withdrawn" })).toBe(false);
  });
});
