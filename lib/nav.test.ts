/**
 * Which sections each role gets, and where the folded-away ones went.
 *
 * The nav is the console's only grouping — there are no headings — so what it
 * lists, and in what order, is the whole of what says two screens are about the
 * same thing. Two rounds of tidying it: Lichess and Games are one chess
 * section, and staff accounts moved under Settings.
 */
import { describe, expect, it } from "vitest";
import { canRoleAccess, MERGED_SECTIONS, navItemsForRole, REROUTE_WHEN_BLOCKED } from "./nav";

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
    expect(idsFor("Receptionist")).not.toContain("admins");
    expect(canRoleAccess("Receptionist", "admins")).toBe(false);
  });

  /* Settings used to be open to both, for the sake of one theme card sitting
     among three pages of academy configuration. The theme is on Profile now,
     so nothing on Settings is a receptionist's — and a page whose every block
     is gated should not be in their nav. */
  it("keeps Settings away from the receptionist", () => {
    expect(idsFor("Receptionist")).not.toContain("settings");
    expect(canRoleAccess("Receptionist", "settings")).toBe(false);
  });

  it("gives both roles their own Profile", () => {
    for (const role of ["Admin", "Receptionist"] as const) {
      expect(idsFor(role)).toContain("profile");
      expect(canRoleAccess(role, "profile")).toBe(true);
    }
  });

  it("keeps Academy away from the receptionist", () => {
    expect(idsFor("Receptionist")).not.toContain("academy");
  });

  it("gives the admin everything", () => {
    const office = idsFor("Admin");
    for (const id of ["academy", "settings", "profile", "games", "students"]) {
      expect(office).toContain(id);
    }
  });

  /* Profile sits before Settings, so the page both roles have comes first and
     the admin-only one reads as the extra. */
  it("puts Profile before Settings", () => {
    const office = idsFor("Admin");
    expect(office.indexOf("profile")).toBeLessThan(office.indexOf("settings"));
  });
});

/**
 * The front desk could open Settings yesterday, for the theme. The theme moved,
 * so a bookmark or a habit that lands them there is asking for a screen that
 * still exists and is still theirs — "not allowed" would be true and useless.
 */
describe("a receptionist who still goes to Settings", () => {
  it("is sent to Profile rather than refused", () => {
    expect(REROUTE_WHEN_BLOCKED.settings?.Receptionist).toBe("profile");
  });

  it("does not reroute the admin, who can open it", () => {
    expect(REROUTE_WHEN_BLOCKED.settings?.Admin).toBeUndefined();
    expect(canRoleAccess("Admin", "settings")).toBe(true);
  });

  /* A reroute that points somewhere the role cannot open either would loop. */
  it("only ever points at a section that role can actually reach", () => {
    for (const [from, byRole] of Object.entries(REROUTE_WHEN_BLOCKED)) {
      for (const [role, to] of Object.entries(byRole)) {
        const r = role as "Admin" | "Receptionist";
        expect(canRoleAccess(r, from)).toBe(false);
        expect(canRoleAccess(r, to as string)).toBe(true);
      }
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
