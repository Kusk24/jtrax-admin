import { describe, expect, it } from "vitest";
import { explainCharge, fmtMinutes } from "./charge-explain";

const cls = { sessionDate: "2026-10-05", startTime: "02:45", endTime: "04:45", stepMinutes: 15 };

describe("explaining a class charge", () => {
  it("charges a full class as its length", () => {
    const e = explainCharge({ ...cls, checkIn: "2026-10-04T19:40:00Z", checkOut: "2026-10-04T21:50:00Z" })!;
    expect([e.lateMinutes, e.earlyMinutes, e.chargedMinutes, e.credits]).toEqual([0, 0, 120, 2]);
  });

  it("charges an early leave for the time there, rounded to the step", () => {
    // In 02:45, out 03:42 Bangkok: 57 min → 60 min at a 15-minute step.
    const e = explainCharge({ ...cls, checkIn: "2026-10-04T19:45:00Z", checkOut: "2026-10-04T20:42:00Z" })!;
    expect([e.checkOut, e.earlyMinutes, e.attendedMinutes, e.chargedMinutes, e.credits]).toEqual(["03:42", 63, 57, 60, 1]);
  });

  it("charges a late arrival from when they came", () => {
    // In 03:15 Bangkok, stayed: 90 minutes.
    const e = explainCharge({ ...cls, checkIn: "2026-10-04T20:15:00Z", checkOut: "2026-10-04T21:50:00Z" })!;
    expect([e.from, e.lateMinutes, e.chargedMinutes, e.credits]).toEqual(["03:15", 30, 90, 1.5]);
  });

  it("reads minutes the way people say them", () => {
    expect(fmtMinutes(75)).toBe("1 h 15 min");
    expect(fmtMinutes(45)).toBe("45 min");
    expect(fmtMinutes(120)).toBe("2 h");
  });
});
