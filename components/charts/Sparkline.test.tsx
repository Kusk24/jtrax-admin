import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Sparkline } from "./Sparkline";

const points = [
  { month: "2026-09-01", value: 100 },
  { month: "2026-09-02", value: 300 },
  { month: "2026-09-03", value: 200 },
];

describe("Sparkline hover", () => {
  it("reads out the point nearest the pointer, and clears on leave", () => {
    render(
      <Sparkline points={points} color="blue" fill="lightblue" label="Revenue" describe={(p) => `${p.month}: ${p.value}`} />,
    );
    const chart = screen.getByRole("img", { name: "Revenue" }).parentElement!;
    chart.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 46, right: 200, bottom: 46, x: 0, y: 0, toJSON: () => ({}) });

    fireEvent.pointerMove(chart, { clientX: 105 });
    expect(screen.getByRole("status").textContent).toBe("2026-09-02: 300");

    fireEvent.pointerMove(chart, { clientX: 199 });
    expect(screen.getByRole("status").textContent).toBe("2026-09-03: 200");

    fireEvent.pointerLeave(chart);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("stays silent without a describe", () => {
    render(<Sparkline points={points} color="blue" fill="lightblue" label="Revenue" />);
    const chart = screen.getByRole("img", { name: "Revenue" }).parentElement!;
    fireEvent.pointerMove(chart, { clientX: 50 });
    expect(screen.queryByRole("status")).toBeNull();
  });
});
