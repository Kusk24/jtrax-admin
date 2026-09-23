import { describe, expect, it } from "vitest";
import { classProgress, parseClockTime } from "./class-progress";

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
