import { describe, expect, it } from "vitest";
import {
  creditCost,
  defaultEndFor,
  draftProblem,
  lengthMinutes,
  minutesOf,
  MIN_SESSION_MINUTES,
  timeOptions,
} from "./session-draft";

describe("the times on offer", () => {
  it("covers the whole day in five-minute steps", () => {
    const options = timeOptions();
    expect(options).toHaveLength((24 * 60) / 5);
    expect(options[0].value).toBe("00:00");
    expect(options.at(-1)?.value).toBe("23:55");
  });

  /* Not "from now": a session is entered when the desk gets to it, which is
     rarely the minute the class began, and often the day it is planned. */
  it("starts at midnight rather than at whatever time it is", () => {
    expect(timeOptions()[0].value).toBe("00:00");
  });

  it("offers the awkward times a real timetable uses", () => {
    const values = timeOptions().map((o) => o.value);
    expect(values).toContain("09:35");
    expect(values).toContain("16:45");
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
  it("puts it the minimum length later", () => {
    expect(defaultEndFor("10:00")).toBe("10:30");
    expect(defaultEndFor("16:45")).toBe("17:15");
  });

  /* A session cannot run past midnight, and wrapping round to 00:15 would be
     worse than refusing to move. */
  it("clamps at the end of the day rather than wrapping", () => {
    expect(defaultEndFor("23:50")).toBe("23:55");
  });

  it("gives nothing for an unreadable start", () => {
    expect(defaultEndFor("")).toBe("");
  });
});
