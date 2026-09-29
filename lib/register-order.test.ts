import { describe, expect, it } from "vitest";
import { byRegisterOrder } from "./live";
import type { CheckinDef } from "./data";

const row = (name: string, checkInAt: string, status: CheckinDef["status"]): CheckinDef => ({
  name,
  class: "Chess",
  timeIn: "",
  timeOut: "",
  checkInAt,
  status,
  credit: 0,
});

describe("the check-in register's order", () => {
  it("puts everyone still in class above those checked out, latest arrival first in each", () => {
    const rows = [
      row("early-out", "2026-09-29T02:00:00Z", "Dismissed"),
      row("early-in", "2026-09-29T02:30:00Z", "In class"),
      row("late-out", "2026-09-29T03:00:00Z", "Dismissed"),
      row("late-in", "2026-09-29T09:05:00Z", "In class"),
    ];
    expect(rows.sort(byRegisterOrder).map((r) => r.name)).toEqual(["late-in", "early-in", "late-out", "early-out"]);
  });
});
