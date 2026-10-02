import { describe, expect, it } from "vitest";
import { classProgress, classStatusNow, endingSoon, parseClockTime, sessionFinished } from "./class-progress";

/** 18 Sep 2026 at the given wall-clock time. */
const at = (hour: number, minute = 0) => new Date(2026, 8, 18, hour, minute);

describe("parseClockTime", () => {
  it("reads the twelve-hour clock the console displays", () => {
    expect(parseClockTime("1:00 AM")).toBe(60);
    expect(parseClockTime("10:30 AM")).toBe(630);
    expect(parseClockTime("1:00 PM")).toBe(780);
  });

  it("puts 12 AM at midnight and 12 PM at noon", () => {
    expect(parseClockTime("12:00 AM")).toBe(0);
    expect(parseClockTime("12:30 AM")).toBe(30);
    expect(parseClockTime("12:00 PM")).toBe(720);
  });

  it("rejects anything that is not a clock time", () => {
    expect(parseClockTime("")).toBeNull();
    expect(parseClockTime("Mornings")).toBeNull();
    expect(parseClockTime("13:00 PM")).toBeNull();
    expect(parseClockTime("10:70 AM")).toBeNull();
  });
});

describe("classProgress", () => {
  it("reports the minutes run out of the slot's length", () => {
    expect(classProgress("1:00 AM – 2:00 AM", at(1, 24))).toEqual({
      elapsed: 24,
      total: 60,
      fraction: 0.4,
    });
  });

  it("reads nothing elapsed before the class starts", () => {
    expect(classProgress("1:00 PM – 2:00 PM", at(9))).toMatchObject({ elapsed: 0, fraction: 0 });
  });

  /* Without the clamp a 9 AM class reports nine hours elapsed at 6 PM and
     draws a bar nine times too long. */
  it("stops at full once the class has finished", () => {
    expect(classProgress("9:00 AM – 10:00 AM", at(18))).toEqual({
      elapsed: 60,
      total: 60,
      fraction: 1,
    });
  });

  it("measures a slot that runs through midnight", () => {
    expect(classProgress("11:00 PM – 12:30 AM", at(23, 30))).toMatchObject({
      elapsed: 30,
      total: 90,
    });
  });

  it("accepts a hyphen as well as the en dash", () => {
    expect(classProgress("1:00 AM - 2:00 AM", at(1, 30))).toMatchObject({ elapsed: 30, total: 60 });
  });

  it("returns null rather than a wrong bar when the time will not parse", () => {
    expect(classProgress("", at(10))).toBeNull();
    expect(classProgress("Afternoons", at(10))).toBeNull();
    expect(classProgress("1:00 AM – 1:00 AM", at(1))).toBeNull();
  });
});

describe("classStatusNow", () => {
  const now = new Date(2026, 8, 27, 10, 15);
  const today = "2026-09-27";
  const def = (date: string, time = "10:00 AM – 11:00 AM") => ({ status: "Ongoing" as const, time, date });

  it("reads a class on an earlier day as Finished", () => {
    expect(classStatusNow(def("2026-09-26"), now, today)).toBe("Finished");
  });
  it("reads a class on a later day as Upcoming", () => {
    expect(classStatusNow(def("2026-09-28"), now, today)).toBe("Upcoming");
  });
  it("follows the clock today", () => {
    expect(classStatusNow(def(today), now, today)).toBe("Ongoing");
    expect(classStatusNow(def(today, "8:00 AM – 9:00 AM"), now, today)).toBe("Finished");
  });
  it("keeps a finished class finished whatever the day", () => {
    expect(classStatusNow({ ...def("2026-09-28"), status: "Finished" }, now, today)).toBe("Finished");
  });
});

describe("endingSoon", () => {
  const at = (h: number, m: number) => new Date(2026, 8, 29, h, m);
  it("gives the minutes left in the last quarter hour", () => {
    expect(endingSoon("4:00 PM – 5:00 PM", at(16, 45))).toBe(15);
    expect(endingSoon("4:00 PM – 5:00 PM", at(16, 58))).toBe(2);
  });
  it("is null earlier, after the end, and before the start", () => {
    expect(endingSoon("4:00 PM – 5:00 PM", at(16, 44))).toBeNull();
    expect(endingSoon("4:00 PM – 5:00 PM", at(17, 0))).toBeNull();
    expect(endingSoon("4:00 PM – 4:10 PM", at(15, 55))).toBeNull();
  });
});

describe("sessionFinished", () => {
  const now = new Date(2026, 8, 29, 11, 30);
  const today = "2026-09-29";
  it("is over on an earlier day, or once Completed", () => {
    expect(sessionFinished("2026-09-28", "23:00", "Ongoing", now, today)).toBe(true);
    expect(sessionFinished("2026-09-30", "12:00", "Completed", now, today)).toBe(true);
  });
  it("is over today once the end has passed", () => {
    expect(sessionFinished(today, "11:30", "Ongoing", now, today)).toBe(true);
    expect(sessionFinished(today, "12:00", "Ongoing", now, today)).toBe(false);
  });
  it("is not over on a later day", () => {
    expect(sessionFinished("2026-09-30", "09:00", "Scheduled", now, today)).toBe(false);
  });
});
