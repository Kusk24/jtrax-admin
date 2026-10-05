import { describe, expect, it } from "vitest";
import { duplicateEntry } from "./duplicate-entry";

const rows = [
  { tournament_registration_id: "r1", tournament_id: "t1", student_id: "stu_penny", contact_email: "sandy@x.th", participant_name: "Penny", participant_date_of_birth: "2018-02-14", status: "Approved" },
  { tournament_registration_id: "r2", tournament_id: "t1", student_id: "", contact_email: "Out@Side.th", participant_name: "Ann", participant_date_of_birth: "2017-01-01", status: "Pending" },
  { tournament_registration_id: "r3", tournament_id: "t1", student_id: "stu_uri", contact_email: "", participant_name: "Uri", status: "Withdrawn" },
  { tournament_registration_id: "r4", tournament_id: "t1", student_id: "stu_mai", contact_email: "", participant_name: "Mai", status: "Rejected" },
  { tournament_registration_id: "r5", tournament_id: "t2", student_id: "stu_bo", contact_email: "", participant_name: "Bo", status: "Approved" },
];

describe("a repeated tournament entry", () => {
  it("is the same JCA student already entered", () => {
    expect(duplicateEntry(rows, { tournamentId: "t1", studentId: "stu_penny" })).toEqual({ state: "entered", name: "Penny" });
  });

  it("is the same player by email, name and date of birth, in any case", () => {
    expect(
      duplicateEntry(rows, { tournamentId: "t1", email: " out@side.TH ", name: " ann ", dateOfBirth: "2017-01-01" }),
    ).toEqual({ state: "pending", name: "Ann" });
  });

  it("lets one email enter another child", () => {
    expect(duplicateEntry(rows, { tournamentId: "t1", email: "out@side.th", name: "Ben", dateOfBirth: "2019-05-06" })).toBeNull();
    expect(duplicateEntry(rows, { tournamentId: "t1", email: "sandy@x.th", name: "Dreamer", dateOfBirth: "2019-06-05" })).toBeNull();
  });

  it("counts a released place", () => {
    expect(duplicateEntry(rows, { tournamentId: "t1", studentId: "stu_uri" })?.state).toBe("released");
  });

  it("ignores a rejected entry, another tournament, and the entry being edited", () => {
    expect(duplicateEntry(rows, { tournamentId: "t1", studentId: "stu_mai" })).toBeNull();
    expect(duplicateEntry(rows, { tournamentId: "t1", studentId: "stu_bo" })).toBeNull();
    expect(duplicateEntry(rows, { tournamentId: "t1", studentId: "stu_penny", id: "r1" })).toBeNull();
  });
});
