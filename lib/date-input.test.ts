/**
 * Getting a stored date into `<input type="date">`.
 *
 * That control accepts exactly `YYYY-MM-DD` and renders **blank** for anything
 * else — no warning, no fallback. Every other reader of `date_of_birth` is
 * forgiving, so a row imported with a timestamp or a slashed date looks right
 * on the roster, right in the age beside the name, and *unset* in the one
 * place the office goes to correct it. Which reads as a field that cannot be
 * edited, and was reported as exactly that.
 */
import { describe, expect, it } from "vitest";
import { toDateInput } from "./live";

describe("a stored date on its way into a date field", () => {
  it("passes a plain ISO date straight through", () => {
    expect(toDateInput("2011-05-02")).toBe("2011-05-02");
  });

  /* The shapes a roster import or another system can leave behind. Each one
     used to render as an empty field over a date that was really there. */
  it("takes the date off a timestamp", () => {
    expect(toDateInput("2011-05-02T00:00:00Z")).toBe("2011-05-02");
    expect(toDateInput("2011-05-02T17:30:00+07:00")).toBe("2011-05-02");
    expect(toDateInput("2011-05-02 00:00:00")).toBe("2011-05-02");
  });

  /* Read as written, not through `new Date` — which would turn midnight UTC
     into the previous evening for anyone west of Greenwich and quietly move a
     child's birthday back a day. */
  it("does not shift the day it was given", () => {
    expect(toDateInput("2011-01-01T00:00:00Z")).toBe("2011-01-01");
    expect(toDateInput("2011-12-31T00:00:00Z")).toBe("2011-12-31");
  });

  it("keeps the zero padding a date field insists on", () => {
    expect(toDateInput("2011-05-02T08:00:00Z")).toBe("2011-05-02");
    expect(/^\d{4}-\d{2}-\d{2}$/.test(toDateInput("March 9, 2014"))).toBe(true);
  });

  it("has nothing to show for nothing", () => {
    expect(toDateInput("")).toBe("");
  });

  /* An empty field at least invites a real answer; a date input cannot show
     the nonsense either way. */
  it("gives up on what cannot be read rather than passing it on", () => {
    expect(toDateInput("not a date")).toBe("");
    expect(toDateInput("--")).toBe("");
  });
});
