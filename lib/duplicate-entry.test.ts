import { describe, expect, it } from "vitest";
import { duplicateEntry } from "./duplicate-entry";

const rows = [
  { tournament_registration_id: "r1", tournament_id: "t1", student_id: "stu_penny", contact_email: "sandy@x.th", participant_name: "Penny", status: "Approved" },
  { tournament_registration_id: "r2", tournament_id: "t1", student_id: "", contact_email: "Out@Side.th", participant_name: "Ann", status: "Pending" },
  { tournament_registration_id: "r3", tournament_id: "t1", student_id: "stu_uri", contact_email: "", participant_name: "Uri", status: "Withdrawn" },
  { tournament_registration_id: "r4", tournament_id: "t1", student_id: "stu_mai", contact_email: "", participant_name: "Mai", status: "Rejected" },
  { tournament_registration_id: "r5", tournament_id: "t2", student_id: "stu_bo", contact_email: "", participant_name: "Bo", status: "Approved" },
];

describe("a repeated tournament entry", () => {
  it("is the same child already entered", () => {
    expect(duplicateEntry(rows, { tournamentId: "t1", studentId: "stu_penny" })).toEqual({ by: "student", state: "entered", name: "Penny" });
  });

  it("is the same email, in any case, still waiting for approval", () => {
    expect(duplicateEntry(rows, { tournamentId: "t1", email: " out@side.TH " })).toEqual({ by: "email", state: "pending", name: "Ann" });
  });

  it("counts a released place", () => {
    expect(duplicateEntry(rows, { tournamentId: "t1", studentId: "stu_uri" })?.state).toBe("released");
  });

  it("ignores a rejected entry, another tournament, and the entry being edited", () => {
    expect(duplicateEntry(rows, { tournamentId: "t1", studentId: "stu_mai" })).toBeNull();
    expect(duplicateEntry(rows, { tournamentId: "t1", studentId: "stu_bo" })).toBeNull();
    expect(duplicateEntry(rows, { tournamentId: "t1", studentId: "stu_penny", email: "sandy@x.th", id: "r1" })).toBeNull();
  });
});
