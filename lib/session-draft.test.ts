import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  creditCost,
  defaultEndFor,
  draftProblem,
  durationOptions,
  endAfter,
  hourOf,
  hourOptions,
  joinClock,
  lengthMinutes,
  minuteOf,
  minuteOptions,
  minutesOf,
  nowClock,
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
} from "./session-draft";

describe("nowClock", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("rounds down to the picker's five-minute step", () => {
    /* Down, not to nearest: rounding 14:32 up to 14:35 would default the
       start to a class that has not begun yet. */
    vi.setSystemTime(new Date(2026, 8, 19, 14, 32));
    expect(nowClock()).toBe("14:30");
  });

  it("leaves a clock already on the step untouched", () => {
    vi.setSystemTime(new Date(2026, 8, 19, 14, 30));
    expect(nowClock()).toBe("14:30");
  });

  /* Never crosses back into the previous hour: :00 is itself always a valid
     five-minute mark, so the floor of anything just past the hour lands on
     that hour, not the one before it. */
  it("floors to the hour just after it turns", () => {
    vi.setSystemTime(new Date(2026, 8, 19, 15, 2));
    expect(nowClock()).toBe("15:00");
  });

  it("stays on the day it started even a minute before midnight", () => {
    vi.setSystemTime(new Date(2026, 8, 19, 23, 59));
    expect(nowClock()).toBe("23:55");
  });
});

describe("the times on offer", () => {
  /* One list of every five-minute mark is 288 options: correct and unusable,
     since finding 16:45 meant scrolling past three hundred neighbours. */
  it("is two short lists, not one long one", () => {
    expect(hourOptions()).toHaveLength(24);
    expect(minuteOptions()).toHaveLength(12);
  });

  it("covers the whole clock between them", () => {
    expect(hourOptions()[0].value).toBe("00");
    expect(hourOptions().at(-1)?.value).toBe("23");
    expect(minuteOptions()[0].value).toBe("00");
    expect(minuteOptions().at(-1)?.value).toBe("55");
  });

  /* Not "from now": a session is entered when the desk gets to it, which is
     rarely the minute the class began. */
  it("starts at midnight rather than at whatever time it is", () => {
    expect(hourOptions()[0].value).toBe("00");
  });

  it("still reaches the awkward times a real timetable uses", () => {
    expect(joinClock("09", "35")).toBe("09:35");
    expect(joinClock("16", "45")).toBe("16:45");
    expect(minuteOptions().map((o) => o.value)).toContain("35");
  });
});

describe("the two halves of a time", () => {
  it("splits a clock apart", () => {
    expect(hourOf("09:35")).toBe("09");
    expect(minuteOf("09:35")).toBe("35");
  });

  it("has nothing to split when nothing is chosen", () => {
    expect(hourOf("")).toBe("");
    expect(minuteOf("")).toBe("");
  });

  /* Choosing 4pm means 16:00 without also having to say "and no minutes". */
  it("treats an hour alone as a whole time", () => {
    expect(joinClock("16", "")).toBe("16:00");
  });

  /* A minute with no hour is not a time, and must not become midnight. */
  it("refuses a minute with no hour", () => {
    expect(joinClock("", "30")).toBe("");
  });
});

describe("reading a clock", () => {
  it("reads a normal time", () => {
    expect(minutesOf("09:30")).toBe(570);
    expect(minutesOf("00:00")).toBe(0);
    expect(minutesOf("23:55")).toBe(1435);
  });

  it("refuses nonsense rather than guessing", () => {
    expect(minutesOf("")).toBeNull();
    expect(minutesOf("25:00")).toBeNull();
    expect(minutesOf("10:75")).toBeNull();
    expect(minutesOf("half past nine")).toBeNull();
  });
});

describe("how long it runs", () => {
  it("measures the gap", () => {
    expect(lengthMinutes("10:00", "11:30")).toBe(90);
    expect(lengthMinutes("14:00", "14:30")).toBe(30);
  });

  it("is nothing when the end is not after the start", () => {
    expect(lengthMinutes("11:00", "10:00")).toBe(0);
    expect(lengthMinutes("10:00", "10:00")).toBe(0);
  });
});

describe("what it will cost each student", () => {
  /* One credit is one hour, and the desk sees the price before committing. */
  it("charges an hour for an hour", () => {
    expect(creditCost("10:00", "11:00")).toBe(1);
  });

  it("charges half a credit for half an hour", () => {
    expect(creditCost("14:00", "14:30")).toBe(0.5);
  });

  it("charges one and a half for ninety minutes", () => {
    expect(creditCost("09:00", "10:30")).toBe(1.5);
  });

  it("charges a third of a credit for twenty minutes, if one ever ran", () => {
    expect(creditCost("09:00", "09:20")).toBeCloseTo(1 / 3, 10);
  });
});

describe("what is stopping it being created", () => {
  const ok = { classCount: 2, classId: "cls_group", start: "10:00", end: "11:00" };

  it("is nothing when the form is complete", () => {
    expect(draftProblem(ok)).toBeNull();
  });

  it("names the missing class list before anything else", () => {
    expect(draftProblem({ ...ok, classCount: 0, classId: "", start: "", end: "" })).toBe("noClasses");
  });

  it("asks for a class before it looks at the times", () => {
    expect(draftProblem({ ...ok, classId: "", start: "11:00", end: "10:00" })).toBe("noClass");
  });

  it("catches an end before the start", () => {
    expect(draftProblem({ ...ok, start: "11:00", end: "10:00" })).toBe("endBeforeStart");
  });

  it("catches an end equal to the start", () => {
    expect(draftProblem({ ...ok, start: "10:00", end: "10:00" })).toBe("endBeforeStart");
  });

  /* A mistyped end is far likelier than a twenty-minute lesson. */
  it("refuses anything under half an hour", () => {
    expect(draftProblem({ ...ok, start: "10:00", end: "10:25" })).toBe("tooShort");
  });

  it("allows exactly half an hour", () => {
    expect(draftProblem({ ...ok, start: "10:00", end: "10:30" })).toBeNull();
    expect(MIN_SESSION_MINUTES).toBe(30);
  });

  it("allows a long one", () => {
    expect(draftProblem({ ...ok, start: "09:00", end: "17:00" })).toBeNull();
  });
});

describe("moving the end when the start moves", () => {
  /* An hour, because that is what a class is and what a credit buys. */
  it("puts it the usual length later", () => {
    expect(defaultEndFor("10:00")).toBe("12:00");
    expect(defaultEndFor("16:45")).toBe("18:45");
  });

  /* A class cannot run past midnight, so a late start shortens it rather than
     wrapping round to the small hours. */
  it("shortens rather than wrapping at the end of the day", () => {
    /* The default two hours still fits here, with fifteen minutes to spare. */
    expect(defaultEndFor("21:45")).toBe("23:45");
    /* Here it does not, so it falls back to the longest that does — 45
       minutes, landing on midnight. Unaffected by the default length: 120
       minutes was never going to fit in either case. */
    expect(defaultEndFor("23:15")).toBe("00:00");
    /* And here nothing fits at all, not even the half-hour floor. */
    expect(defaultEndFor("23:50")).toBe("");
  });

  it("gives nothing for an unreadable start", () => {
    expect(defaultEndFor("")).toBe("");
  });
});

/**
 * The lengths on offer.
 *
 * Asked for directly, because the office decides a class runs for an hour and
 * a half from four — not that it ends at 17:30. It also puts the half-hour
 * floor in the list rather than in an error message.
 */
describe("how long a class runs", () => {
  it("starts at the floor and climbs in quarter hours", () => {
    const options = durationOptions("10:00");
    expect(options[0]).toBe(MIN_SESSION_MINUTES);
    expect(options[1]).toBe(45);
    expect(options[2]).toBe(60);
    expect(options.at(-1)).toBe(MAX_SESSION_MINUTES);
  });

  it("never offers anything under half an hour", () => {
    for (const start of ["00:00", "10:00", "23:00"]) {
      for (const m of durationOptions(start)) expect(m).toBeGreaterThanOrEqual(MIN_SESSION_MINUTES);
    }
  });

  /* Offering four hours from 23:00 and refusing it afterwards is the Create
     button that will not press, all over again. */
  it("offers only what fits before midnight", () => {
    /* An hour from 23:00 lands exactly on midnight, which is a class that ends
       when the day does — allowed. Anything past it is not. */
    expect(durationOptions("23:00")).toEqual([30, 45, 60]);
    expect(durationOptions("22:30")).toEqual([30, 45, 60, 75, 90]);
  });

  it("offers nothing at all when not even the floor fits", () => {
    expect(durationOptions("23:45")).toEqual([]);
  });

  /* No start yet is not the same as a late one: the list is the full ladder
     until the desk says when it begins. */
  it("offers every length before a start is chosen", () => {
    expect(durationOptions("")[0]).toBe(MIN_SESSION_MINUTES);
    expect(durationOptions("").at(-1)).toBe(MAX_SESSION_MINUTES);
  });
});

describe("where a length lands", () => {
  it("adds the length to the start", () => {
    expect(endAfter("16:00", 90)).toBe("17:30");
    expect(endAfter("09:15", 30)).toBe("09:45");
  });

  /* Midnight is 00:00 on a clock, not 24:00 — the class still belongs to the
     day it started. */
  it("reads a class that ends at midnight as 00:00", () => {
    expect(endAfter("23:30", 30)).toBe("00:00");
  });

  it("refuses to run past midnight", () => {
    expect(endAfter("23:30", 60)).toBe("");
  });

  it("has nowhere to land without a start", () => {
    expect(endAfter("", 60)).toBe("");
  });
});
