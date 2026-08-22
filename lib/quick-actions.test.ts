/**
 * A Quick Action opens the act, not the tab it lives on.
 *
 * "Register Student" used to land on the students list, where the desk still
 * had to find the button that registers one. The pills are named after acts,
 * so each carries `?new=` and the section opens its form.
 *
 * The bug this file exists to catch is a two-ended one: the dashboard builds
 * a link, some other file reads it, and nothing connects them at compile
 * time. So the tests below walk the real hrefs through the real reader rather
 * than asserting a string on each side and hoping they agree.
 */
import { describe, expect, it } from "vitest";
import { ADMIN_QUICK_ACTIONS, RECEPTIONIST_QUICK_ACTIONS } from "@/components/dashboard/QuickActions";
import { createHref, createParamOf, opensCreate } from "./quick-actions";

describe("every quick action", () => {
  it("asks its section to open the create form", () => {
    for (const action of ADMIN_QUICK_ACTIONS) {
      expect(opensCreate(createParamOf(action.href)), action.key).toBe(true);
    }
  });

  /* The front desk's two are the same links, so they open the same forms. */
  it("does the same at the front desk", () => {
    for (const action of RECEPTIONIST_QUICK_ACTIONS) {
      expect(opensCreate(createParamOf(action.href)), action.key).toBe(true);
    }
  });

  it("still points at the section it is named for", () => {
    const sections = ADMIN_QUICK_ACTIONS.map((a) => a.href.split("?")[0]);
    expect(sections).toEqual(["/students", "/payment", "/announcement", "/tournament"]);
  });
});

describe("reading the request at the other end", () => {
  /* The whole trap: `?new=` is a request with nothing typed yet, and "" is
     falsy. A section that asks `if (param)` sends every quick action straight
     back to the list it was meant to skip. */
  it("treats a blank one as a request to open the form", () => {
    expect(opensCreate("")).toBe(true);
  });

  it("leaves a section alone when nobody asked", () => {
    expect(opensCreate(undefined)).toBe(false);
    expect(createParamOf("/students")).toBeUndefined();
    expect(createParamOf("/students?status=Expired")).toBeUndefined();
  });

  it("carries a typed name through to the form", () => {
    /* The desk searches the dashboard for a child, finds nobody, and
       registers them without typing the name a second time. */
    expect(createParamOf(createHref("students", "Anong Suk"))).toBe("Anong Suk");
  });

  it("survives a name with characters a URL cares about", () => {
    expect(createParamOf(createHref("students", "Ann & Bee?"))).toBe("Ann & Bee?");
  });
});
