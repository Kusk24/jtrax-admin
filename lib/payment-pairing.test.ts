/**
 * The pairing rule on its own: a child has one guardian, a guardian has any
 * number of children, and either side can be linked to nobody.
 *
 * The form's half of it — that changing a field actually calls this — is in
 * `components/pages/PaymentPage.test.tsx`.
 */
import { describe, expect, it } from "vitest";
import { childIdsOf, guardianOf, pairFromPayer, pairFromStudent } from "./payment-pairing";

/* Malee has three children, Nid has one, Wichai has none — and Eak has no
   guardian, which is what deleting a parent leaves behind. */
const LINKS = [
  { studentId: "anong", parentId: "malee" },
  { studentId: "boon", parentId: "malee" },
  { studentId: "chai", parentId: "malee" },
  { studentId: "dao", parentId: "nid" },
];

describe("naming a child", () => {
  it("names their guardian", () => {
    expect(pairFromStudent(LINKS, "boon")).toEqual({ studentId: "boon", payerId: "malee" });
  });

  it("leaves the payer blank when nobody is linked", () => {
    expect(pairFromStudent(LINKS, "eak")).toEqual({ studentId: "eak", payerId: "" });
  });

  it("re-points the payer when another family's child is named", () => {
    expect(pairFromStudent(LINKS, "dao")).toEqual({ studentId: "dao", payerId: "nid" });
  });
});

describe("naming a guardian", () => {
  it("names their only child", () => {
    expect(pairFromPayer(LINKS, "nid", "")).toEqual({ studentId: "dao", payerId: "nid" });
  });

  it("leaves the child blank when there are several to choose between", () => {
    expect(pairFromPayer(LINKS, "malee", "")).toEqual({ studentId: "", payerId: "malee" });
  });

  it("leaves the child blank when nobody is linked", () => {
    expect(pairFromPayer(LINKS, "wichai", "")).toEqual({ studentId: "", payerId: "wichai" });
  });

  it("keeps a child who is one of theirs", () => {
    expect(pairFromPayer(LINKS, "malee", "chai")).toEqual({ studentId: "chai", payerId: "malee" });
  });

  it("drops a child who is not one of theirs", () => {
    expect(pairFromPayer(LINKS, "malee", "dao")).toEqual({ studentId: "", payerId: "malee" });
  });

  it("drops the named child when the guardian has none of their own", () => {
    expect(pairFromPayer(LINKS, "wichai", "boon")).toEqual({ studentId: "", payerId: "wichai" });
  });

  it("clearing the payer keeps the child", () => {
    expect(pairFromPayer(LINKS, "", "boon")).toEqual({ studentId: "boon", payerId: "" });
  });
});

describe("the picker's scope", () => {
  it("is a guardian's children", () => {
    expect(childIdsOf(LINKS, "malee")).toEqual(["anong", "boon", "chai"]);
  });

  /* Empty means "show everyone", not "show nothing" — the form reads it that
     way, and a dropdown narrowed to nothing would be a dead end. */
  it("is empty for a guardian with no children", () => {
    expect(childIdsOf(LINKS, "wichai")).toEqual([]);
  });

  it("is empty when no payer is chosen", () => {
    expect(childIdsOf(LINKS, "")).toEqual([]);
  });

  it("reports no guardian for an unlinked child", () => {
    expect(guardianOf(LINKS, "eak")).toBe("");
  });
});
