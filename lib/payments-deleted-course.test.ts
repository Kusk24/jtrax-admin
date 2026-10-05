import { describe, expect, it } from "vitest";
import { toPayments, type LiveCollections } from "./live";

/* A course deleted from a student keeps its enrolment in deletedEnrollments.
   A payment for it used to find no course and read "—". */
const base = {
  students: [{ student_id: "stu1", name: "Mini" }],
  classes: [{ class_id: "c1", name: "King Slayer" }],
  creditPackages: [],
  enrollments: [],
  deletedEnrollments: [{ enrollment_id: "enr1", student_id: "stu1", class_id: "c1", deleted_date: "2026-10-01" }],
  payments: [
    { payment_id: "pay1", student_id: "stu1", enrollment_id: "enr1", final_amount: 1000, payment_date: "2026-09-01", status: "Paid" },
  ],
} as unknown as LiveCollections;

describe("toPayments for a deleted course", () => {
  it("names the course and marks it deleted instead of a dash", () => {
    const [p] = toPayments(base);
    expect(p.className).toBe("King Slayer");
    expect(p.courseDeleted).toBe(true);
  });
  it("still marks it deleted when the course itself is gone", () => {
    const [p] = toPayments({ ...base, classes: [] } as LiveCollections);
    expect(p.className).toBe("");
    expect(p.courseDeleted).toBe(true);
  });
  it("leaves a live course alone", () => {
    const live = { ...base, enrollments: base.deletedEnrollments, deletedEnrollments: [] } as unknown as LiveCollections;
    const [p] = toPayments(live);
    expect(p.className).toBe("King Slayer");
    expect(p.courseDeleted).toBe(false);
  });
});

/* Older payments recorded no enrolment, no course name and no payer: the
   table read "—" for both. The package names the course; the student's
   parent stands in for the payer. */
describe("toPayments for an older payment with nothing written on it", () => {
  const old = {
    students: [{ student_id: "stu1", name: "Penny" }],
    classes: [{ class_id: "c1", name: "Beginner Chess" }],
    creditPackages: [{ credit_package_id: "pkg1", class_id: "c1", credit_amount: 20 }],
    enrollments: [],
    parents: [{ parent_id: "par1", name: "Sandy Jones" }],
    studentParents: [{ student_id: "stu1", parent_id: "par1" }],
    payments: [{ payment_id: "pay1", student_id: "stu1", credit_package_id: "pkg1", final_amount: 9000, payment_date: "2026-05-01" }],
  } as unknown as LiveCollections;

  it("names the course from the package bought", () => {
    expect(toPayments(old)[0].className).toBe("Beginner Chess");
  });
  it("names the student's parent as the payer", () => {
    expect(toPayments(old)[0].payer).toBe("Sandy Jones");
  });
  it("keeps what the till wrote when it wrote something", () => {
    const written = {
      ...old,
      payments: [{ ...(old.payments[0] as object), class_name: "Master", parent_name: "Joe" }],
    } as unknown as LiveCollections;
    expect(toPayments(written)[0]).toMatchObject({ className: "Master", payer: "Joe" });
  });
});

/* A course the academy archived is removed too: still named, marked. */
describe("toPayments for a course the academy archived", () => {
  it("marks it removed though the student never left it", () => {
    const archived = {
      ...base,
      classes: [{ class_id: "c1", name: "King Slayer", archived_at: "2026-09-19T14:09:52Z" }],
      enrollments: base.deletedEnrollments,
      deletedEnrollments: [],
    } as unknown as LiveCollections;
    const [p] = toPayments(archived);
    expect(p.className).toBe("King Slayer");
    expect(p.courseDeleted).toBe(true);
  });
});

describe("a public tournament entrant's payment", () => {
  it("is a public entry, not a removed student", () => {
    const [p] = toPayments({
      ...base,
      payments: [
        { payment_id: "pay_pub", student_id: null, student_name: "Outside Player", class_name: "JCA Open",
          tournament_registration_id: "treg_1", final_amount: 500, status: "Pending", payment_date: "2026-10-05" },
      ],
    } as LiveCollections);
    expect(p.publicEntry).toBe(true);
    expect(p.detached).toBe(false);
  });

  it("is a removed student only for a course payment with no student", () => {
    const [p] = toPayments({
      ...base,
      payments: [{ payment_id: "pay_old", student_id: null, student_name: "Gone", class_name: "JCA NXT", final_amount: 600, payment_date: "2026-09-01" }],
    } as LiveCollections);
    expect(p.detached).toBe(true);
    expect(p.publicEntry).toBe(false);
  });
});
