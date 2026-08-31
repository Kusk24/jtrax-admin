/**
 * Which sections each role gets, and where the folded-away ones went.
 *
 * The nav is the console's only grouping — there are no headings — so what it
 * lists, and in what order, is the whole of what says two screens are about the
 * same thing. Two rounds of tidying it: Lichess and Games are one chess
 * section, and staff accounts moved under Settings.
 */
import { describe, expect, it } from "vitest";
import { canRoleAccess, MERGED_SECTIONS, navItemsForRole } from "./nav";

const idsFor = (role: "Admin" | "Receptionist") => navItemsForRole(role).map((i) => i.id);

describe("the chess section", () => {
  it("is one tab, not two", () => {
    const ids = idsFor("Admin");
    expect(ids).toContain("games");
    expect(ids).not.toContain("lichess");
  });

  /* "How is my child doing at home" is asked at the desk as often as in the
     office, and Lichess is the only screen that answers it. */
  it("is there for the receptionist too", () => {
    expect(idsFor("Receptionist")).toContain("games");
    expect(canRoleAccess("Receptionist", "games")).toBe(true);
  });
});

describe("what the two roles still differ on", () => {
  it("keeps staff accounts away from the receptionist", () => {
    /* Not by hiding a tab any more — Settings is open to both — but by what
       SettingsPage renders inside it. See SettingsPage.test.tsx. */
    expect(idsFor("Receptionist")).not.toContain("admins");
    expect(canRoleAccess("Receptionist", "admins")).toBe(false);
  });

  /* The theme is a per-account preference and it lives on Settings, so a desk
     that cannot open Settings cannot change how its own screen looks. What is
     on the page is split by role instead — see SettingsPage.test.tsx. */
  it("lets the receptionist into Settings, for their own theme", () => {
    expect(idsFor("Receptionist")).toContain("settings");
    expect(canRoleAccess("Receptionist", "settings")).toBe(true);
  });

  it("keeps Academy away from the receptionist", () => {
    expect(idsFor("Receptionist")).not.toContain("academy");
  });

  it("gives the admin everything", () => {
    const office = idsFor("Admin");
    for (const id of ["academy", "settings", "games", "students"]) {
      expect(office).toContain(id);
    }
  });
});

/* A tab that stops existing takes every bookmark pointing at it with it, and
   the route reads NAV_STRUCTURE — so without these the old address 404s. */
describe("the sections that moved", () => {
  it("sends the old addresses where the screens went", () => {
    expect(MERGED_SECTIONS.lichess).toBe("games");
    expect(MERGED_SECTIONS.admins).toBe("settings");
  });

  it("names only ids the nav no longer has", () => {
    const ids = idsFor("Admin");
    for (const gone of Object.keys(MERGED_SECTIONS)) {
      expect(ids).not.toContain(gone);
    }
  });

  it("points every one of them at a section that exists", () => {
    const ids = idsFor("Admin");
    for (const target of Object.values(MERGED_SECTIONS)) {
      expect(ids).toContain(target);
    }
  });
});
