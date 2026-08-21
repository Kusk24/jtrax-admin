/**
 * Retiring a class.
 *
 * A class is never deleted: `class_id` is NOT NULL on enrolments, sessions and
 * packages, so the row has to stay for last term's attendance and a year of
 * receipts to keep naming it. Archiving is what "delete" means here — gone
 * from everywhere a class is *chosen*, still there everywhere one is *named*.
 */
import { describe, expect, it } from "vitest";
import { isArchived, liveClasses, livePackages } from "./live";

const CLASSES = [
  { class_id: "cls_group", name: "Group Class" },
  { class_id: "cls_old", name: "Saturday Beginners", archived_at: "2026-08-21T10:00:00Z" },
  { class_id: "cls_master", name: "Master Class" },
];

describe("the classes a screen may offer", () => {
  it("leaves out the retired one", () => {
    expect(liveClasses({ classes: CLASSES }).map((c) => c.class_id)).toEqual([
      "cls_group",
      "cls_master",
    ]);
  });

  it("keeps everything when none is retired", () => {
    const running = CLASSES.filter((c) => !c.archived_at);
    expect(liveClasses({ classes: running })).toHaveLength(2);
  });

  /* An empty string is what a cleared column comes back as through the API,
     and it means running — not retired at an unknown time. */
  it("treats a blank archived_at as still running", () => {
    expect(liveClasses({ classes: [{ class_id: "c", name: "n", archived_at: "" }] })).toHaveLength(1);
  });
});

describe("naming a class, as opposed to choosing one", () => {
  /* The whole point of keeping the row: an enrolment or a finished session
     still has to be able to say which class it was. */
  it("still finds a retired class by id", () => {
    const found = CLASSES.find((c) => c.class_id === "cls_old");
    expect(found?.name).toBe("Saturday Beginners");
    expect(isArchived(found)).toBe(true);
  });

  it("reports a running class as not archived", () => {
    expect(isArchived(CLASSES.find((c) => c.class_id === "cls_group"))).toBe(false);
  });

  it("is safe on a class that cannot be found at all", () => {
    expect(isArchived(undefined)).toBe(false);
  });
});

/* A package cannot be deleted once it has been sold: a payment points at it,
   and the console reads it to say what that payment bought. Retiring it takes
   it off the price list and leaves the receipt adding up. */
const PACKAGES = [
  { credit_package_id: "pkg_now", class_id: "cls_group", credit_amount: 20 },
  { credit_package_id: "pkg_old", class_id: "cls_group", credit_amount: 20, archived_at: "2026-08-21T10:00:00Z" },
  { credit_package_id: "pkg_of_retired_class", class_id: "cls_old", credit_amount: 10 },
];

describe("the packages the till may sell", () => {
  it("leaves out a retired package", () => {
    const sellable = livePackages({ creditPackages: PACKAGES, classes: CLASSES });
    expect(sellable.map((p) => p.credit_package_id)).not.toContain("pkg_old");
  });

  /* The class is not on offer, so neither is its price — without the package
     itself having to be retired one by one. */
  it("leaves out a package whose class was retired", () => {
    const sellable = livePackages({ creditPackages: PACKAGES, classes: CLASSES });
    expect(sellable.map((p) => p.credit_package_id)).not.toContain("pkg_of_retired_class");
  });

  it("keeps the one still on sale", () => {
    const sellable = livePackages({ creditPackages: PACKAGES, classes: CLASSES });
    expect(sellable.map((p) => p.credit_package_id)).toEqual(["pkg_now"]);
  });

  /* The whole reason the row is kept: a receipt has to keep adding up. */
  it("still finds a retired package by id, to say what a payment bought", () => {
    const bought = PACKAGES.find((p) => p.credit_package_id === "pkg_old");
    expect(bought?.credit_amount).toBe(20);
    expect(isArchived(bought)).toBe(true);
  });
});
