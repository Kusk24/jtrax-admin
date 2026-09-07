/**
 * The KPI tiles' small drawings. The maths is what matters — a wrong split
 * here draws a healthy roster over a sick one — so the counting is tested
 * bare, and the components on what a screen reader is told.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CheckinDef, Student } from "@/lib/data";
import { checkinDots, DotRow, MiniBars, SegmentBar, studentMix } from "./KpiVisuals";

/* The helpers only read `status`, and their signatures say so. */
const student = (status: Student["status"]) => ({ status });
const checkin = (status: CheckinDef["status"]) => ({ status });

describe("studentMix", () => {
  it("cuts the roster the same way the follow-up buckets do", () => {
    const mix = studentMix([
      student("Normal"), student("Normal"),
      student("Low Credit"), student("Expiring"),
      student("Expired"), student("Inactive"),
    ]);
    expect(mix).toEqual({ normal: 2, attention: 2, gone: 2 });
  });

  it("holds on an empty roster", () => {
    expect(studentMix([])).toEqual({ normal: 0, attention: 0, gone: 0 });
  });
});

describe("checkinDots", () => {
  it("keeps arrival order and counts who is still in", () => {
    const { dots, inClass, out } = checkinDots([
      checkin("In class"), checkin("Dismissed"), checkin("In class"),
    ]);
    expect(dots).toEqual([true, false, true]);
    expect(inClass).toBe(2);
    expect(out).toBe(1);
  });
});

describe("the drawings", () => {
  it("MiniBars scales to the best month and keeps a stub for an empty one", () => {
    render(
      <MiniBars
        points={[{ month: "Apr", value: 0 }, { month: "May", value: 500 }, { month: "Jun", value: 1000 }]}
        color="green" tint="lightgreen" label="revenue shape"
      />,
    );
    const bars = screen.getByRole("img", { name: "revenue shape" }).children;
    expect((bars[0] as HTMLElement).style.height).toBe("0%"); // minHeight keeps the stub
    expect((bars[1] as HTMLElement).style.height).toBe("50%");
    expect((bars[2] as HTMLElement).style.height).toBe("100%");
    expect((bars[2] as HTMLElement).style.background).toBe("green");
  });

  it("SegmentBar drops empty buckets instead of leaving slivers", () => {
    render(
      <SegmentBar
        parts={[{ weight: 3, color: "blue" }, { weight: 0, color: "amber" }, { weight: 1, color: "red" }]}
        label="roster mix"
      />,
    );
    const segs = screen.getByRole("img", { name: "roster mix" }).children;
    expect(segs).toHaveLength(2);
    expect((segs[0] as HTMLElement).style.flexGrow).toBe("3");
  });

  it("DotRow fills a dot per child still in class", () => {
    render(<DotRow dots={[true, false]} color="orange" tint="wheat" label="2 today" />);
    const dots = screen.getByRole("img", { name: "2 today" }).children;
    expect((dots[0] as HTMLElement).style.background).toBe("orange");
    expect((dots[1] as HTMLElement).style.background).toBe("wheat");
  });
});
