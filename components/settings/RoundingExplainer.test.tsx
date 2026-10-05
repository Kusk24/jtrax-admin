import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { writeFileSync } from "node:fs";
import en from "@/messages/en.json";
import { RoundingExplainer, bandsFor, roundedMinutes } from "./RoundingExplainer";

function show(step: number) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <RoundingExplainer step={step} onClose={() => {}} />
    </NextIntlClientProvider>,
  );
}

describe("the Attendance Rounding infographic", () => {
  it("rounds the time present to the nearest step, never past the class", () => {
    expect(roundedMinutes(95, 120, 15)).toBe(90);
    expect(roundedMinutes(115, 120, 15)).toBe(120);
    expect(roundedMinutes(95, 120, 0)).toBe(95);
  });

  it("splits minutes missed into the ranges that charge the same", () => {
    expect(bandsFor(15).map((b) => [b.from, b.to, b.charged])).toEqual([
      [0, 7, 120], [8, 22, 105], [23, 37, 90], [38, 52, 75], [53, 67, 60],
    ]);
  });

  it("shows one ring, the legend and the two examples under one rule", () => {
    show(15);
    expect(screen.getAllByRole("img")).toHaveLength(1);
    const legend = Array.from(document.querySelectorAll("li")).map((li) => li.textContent);
    expect(legend).toEqual([
      "0 – 7 minFull class2 credits",
      "8 – 22 min1 h 45 min1.75 credits",
      "23 – 37 min1 h 30 min1.5 credits",
      "38 – 52 min1 h 15 min1.25 credits",
      "53 – 67 min1 h1 credit",
    ]);
    expect(screen.getByText("Arrived 10:25")).toBeTruthy();
    expect(screen.getByText("Left 11:35")).toBeTruthy();
    expect(screen.getAllByText("→ 1.5 credits")).toHaveLength(2);
    expect(screen.queryByText("Same rule")).toBeNull();
    if (process.env.DUMP_SVG) writeFileSync(process.env.DUMP_SVG, document.querySelector("svg[role=img]")!.outerHTML);
  });

  it("says there is no rounding at 0", () => {
    show(0);
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.getByText(/exact minute/)).toBeTruthy();
  });
});
