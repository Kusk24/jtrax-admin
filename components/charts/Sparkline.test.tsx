/**
 * The revenue line's hover reading.
 *
 * The line is deliberately unlabelled at rest, so the tooltip is the only way
 * a month's amount can be read off it — these tests pin that the reading
 * appears where the pointer is, snaps to the nearest month, and leaves no
 * trace once the pointer goes. The snapping maths is pinned separately in
 * lib/derive.test.ts; here the concern is the wiring.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Sparkline } from "./Sparkline";
import { sparklineHitIndex } from "@/lib/derive";

const POINTS = [
  { month: "Apr", value: 4500 },
  { month: "May", value: 6000 },
  { month: "Jun", value: 4000 },
  { month: "Jul", value: 7500 },
  { month: "Aug", value: 9000 },
  { month: "Sep", value: 10500 },
];

function boxOfWidth(width: number) {
  return vi
    .spyOn(HTMLDivElement.prototype, "getBoundingClientRect")
    .mockReturnValue({ left: 0, top: 0, right: width, bottom: 46, width, height: 46, x: 0, y: 0, toJSON: () => ({}) });
}

afterEach(() => vi.restoreAllMocks());

describe("a sparkline without detail", () => {
  it("is inert — the bare svg, no wrapper listening for a pointer", () => {
    const { container } = render(<Sparkline points={POINTS} color="green" fill="honeydew" label="trend" />);
    expect(container.firstElementChild?.tagName).toBe("svg");
  });
});

describe("a sparkline with detail", () => {
  const detail = (p: { month: string; value: number }) => `${p.month} · ${p.value}`;

  it("shows the month under the pointer, and the ends stay reachable", () => {
    boxOfWidth(500);
    render(<Sparkline points={POINTS} color="green" fill="honeydew" label="trend" detail={detail} />);

    fireEvent.pointerMove(screen.getByRole("img").parentElement!, { clientX: 500 });
    expect(screen.getByRole("status").textContent).toBe("Sep · 10500");

    // Past the left edge: clamped to the first month, not lost.
    fireEvent.pointerMove(screen.getByRole("img").parentElement!, { clientX: -40 });
    expect(screen.getByRole("status").textContent).toBe("Apr · 4500");
  });

  it("answers a tap the same way, for a screen with no hover", () => {
    boxOfWidth(500);
    render(<Sparkline points={POINTS} color="green" fill="honeydew" label="trend" detail={detail} />);
    fireEvent.pointerDown(screen.getByRole("img").parentElement!, { clientX: 400 });
    expect(screen.getByRole("status").textContent).toBe(`${POINTS[sparklineHitIndex(400, 500, 6)].month} · 9000`);
  });

  it("clears when the mouse leaves", () => {
    boxOfWidth(500);
    render(<Sparkline points={POINTS} color="green" fill="honeydew" label="trend" detail={detail} />);
    const box = screen.getByRole("img").parentElement!;
    fireEvent.pointerMove(box, { clientX: 250 });
    expect(screen.queryByRole("status")).not.toBeNull();
    fireEvent.pointerLeave(box, { pointerType: "mouse" });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps the reading after a tap — a touch pointer leaves the moment the finger lifts", () => {
    boxOfWidth(500);
    render(<Sparkline points={POINTS} color="green" fill="honeydew" label="trend" detail={detail} />);
    const box = screen.getByRole("img").parentElement!;
    fireEvent.pointerDown(box, { clientX: 250, pointerType: "touch" });
    fireEvent.pointerLeave(box, { pointerType: "touch" });
    expect(screen.queryByRole("status")).not.toBeNull();
  });
});
