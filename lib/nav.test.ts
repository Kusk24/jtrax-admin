/**
 * Which sections each role gets.
 *
 * Lichess used to be a panel at the bottom of the students list — inside the
 * table's card, and only in list view, so switching to cards made it vanish.
 * It is its own section now, and the front desk needs it too: "how is my child
 * doing at home" is a question asked at the desk as often as in the office.
 */
import { describe, expect, it } from "vitest";
import { canRoleAccess, navItemsForRole } from "./nav";

const idsFor = (role: "Admin" | "Receptionist") => navItemsForRole(role).map((i) => i.id);

describe("the Lichess section", () => {
  it("is its own place in the nav", () => {
    expect(idsFor("Admin")).toContain("lichess");
  });

  it("is there for the receptionist too", () => {
    expect(idsFor("Receptionist")).toContain("lichess");
    expect(canRoleAccess("Receptionist", "lichess")).toBe(true);
  });

  /* It sits with the other chess, not among the office records. */
  it("sits next to Games", () => {
    const ids = idsFor("Admin");
    expect(ids.indexOf("lichess")).toBe(ids.indexOf("games") + 1);
  });
});

describe("what the two roles still differ on", () => {
  it("keeps Admins and Settings away from the receptionist", () => {
    const desk = idsFor("Receptionist");
    expect(desk).not.toContain("admins");
    expect(desk).not.toContain("settings");
    expect(canRoleAccess("Receptionist", "settings")).toBe(false);
  });

  it("keeps Academy away from the receptionist", () => {
    expect(idsFor("Receptionist")).not.toContain("academy");
  });

  it("gives the admin everything", () => {
    const office = idsFor("Admin");
    for (const id of ["admins", "academy", "settings", "lichess", "students"]) {
      expect(office).toContain(id);
    }
  });
});
