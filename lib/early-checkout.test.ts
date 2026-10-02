/**
 * The same arithmetic as the backend's attendedHours (credits.go), so the
 * number the desk is asked to confirm is the number that gets charged.
 */
import { describe, expect, it } from "vitest";
import { earlyCheckout } from "./early-checkout";

/* 08:00–10:00 at the academy (UTC+7). */
const session = { session_date: "2026-09-27", start_time: "08:00", end_time: "10:00" };
const at = (clock: string) => new Date(`2026-09-27T${clock}:00+07:00`);
const arrived = (clock: string) => ({ check_in_time: at(clock).toISOString() });

describe("earlyCheckout", () => {
  it("charges the time from arrival to now", () => {
    expect(earlyCheckout(arrived("08:00"), session, at("09:30"), 15)).toEqual({
      attendedMinutes: 90,
      scheduledMinutes: 120,
      credits: 1.5,
    });
  });

  it("counts from the class start for someone who came early", () => {
    expect(earlyCheckout(arrived("07:40"), session, at("09:00"), 15)?.credits).toBe(1);
  });

  it("counts from arrival for someone who came late", () => {
    expect(earlyCheckout(arrived("08:30"), session, at("09:30"), 15)?.credits).toBe(1);
  });

  it("rounds to the nearest step", () => {
    expect(earlyCheckout(arrived("08:00"), session, at("09:22"), 15)?.credits).toBe(1.25);
  });

  it("charges exact minutes when the step is 0", () => {
    expect(earlyCheckout(arrived("08:00"), session, at("09:22"), 0)?.credits).toBeCloseTo(82 / 60, 10);
  });

  it("never rounds up past the whole class", () => {
    const odd = { ...session, end_time: "09:40" }; // 100 minutes
    expect(earlyCheckout(arrived("08:00"), odd, at("09:39"), 15)?.credits).toBeCloseTo(100 / 60, 10);
  });

  it("is not early at or after the scheduled end", () => {
    expect(earlyCheckout(arrived("08:00"), session, at("10:00"), 15)).toBeNull();
    expect(earlyCheckout(arrived("08:00"), session, at("10:20"), 15)).toBeNull();
  });

  it("reads a zone-less check-in as academy time, like the backend", () => {
    expect(earlyCheckout({ check_in_time: "2026-09-27T08:30:00" }, session, at("09:30"), 15)?.credits).toBe(1);
  });

  it("prefers a stored duration over the clock", () => {
    expect(earlyCheckout(arrived("08:00"), { ...session, duration_hours: 3 }, at("10:30"), 15)?.scheduledMinutes).toBe(180);
  });
});
