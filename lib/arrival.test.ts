import { describe, expect, it } from "vitest";
import { arrivalState, reminderDay, reminderDays } from "./arrival";

describe("reminderDays", () => {
  it("is a whole number of days, or null for off", () => {
    expect(reminderDays("5")).toBe(5);
    expect(reminderDays("")).toBeNull();
    expect(reminderDays("0")).toBeNull();
    expect(reminderDays("-3")).toBeNull();
    expect(reminderDays("2.6")).toBe(3);
    expect(reminderDays("900")).toBe(365);
  });
});


describe("arrivalState", () => {
  const now = new Date("2026-10-05T12:00:00Z");
  it("reads the answer first", () => {
    expect(arrivalState("Confirmed", "2026-10-01T00:00:00Z", now)).toBe("attending");
    expect(arrivalState("NotAttending", undefined, now)).toBe("notAttending");
  });
  it("is Not sent until the email goes out", () => {
    expect(arrivalState("Pending", undefined, now)).toBe("notSent");
  });
  it("is Sent for two days, then No response", () => {
    expect(arrivalState("Pending", "2026-10-04T12:00:00Z", now)).toBe("sent");
    expect(arrivalState("Pending", "2026-10-03T12:00:00Z", now)).toBe("noResponse");
  });
});

describe("reminderDay", () => {
  it("is the start less the days, or nothing when off", () => {
    expect(reminderDay("2026-10-08", 5)).toBe("2026-10-03");
    expect(reminderDay("2026-10-08", 0)).toBe("");
    expect(reminderDay("", 5)).toBe("");
  });
});
