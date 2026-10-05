import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { writeFileSync } from "node:fs";
import en from "@/messages/en.json";
import { RoundingExplainer, roundedMinutes } from "./RoundingExplainer";

function show(step: number) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <RoundingExplainer step={step} onClose={() => {}} />
    </NextIntlClientProvider>,
  );
}

describe("the Attendance Rounding explainer", () => {
  it("rounds the time present to the nearest step, never past the class", () => {
    expect(roundedMinutes(95, 120, 15)).toBe(90);
    expect(roundedMinutes(115, 120, 15)).toBe(120);
    expect(roundedMinutes(95, 120, 0)).toBe(95);
    expect(roundedMinutes(120, 120, 60)).toBe(120);
  });

  it("works both examples at the step being set, on two clocks", () => {
    show(15);
    expect(screen.getAllByText("Present 1 h 35 min")).toHaveLength(2);
    expect(screen.getAllByText("Rounded to nearest 15 min → 1 h 30 min")).toHaveLength(2);
    expect(screen.getAllByText("= 1.5 credits")).toHaveLength(2);
    expect(screen.getAllByRole("img")).toHaveLength(2);
    /* The table: 5 min late or early still charges the full class. */
    const rows = Array.from(document.querySelectorAll("tbody tr")).map((r) => r.textContent);
    expect(rows).toEqual([
      "5 min1h552h2.0", "10 min1h501h451.75", "15 min1h451h451.75", "20 min1h401h451.75", "25 min1h351h301.5",
    ]);
    if (process.env.DUMP_SVG) writeFileSync(process.env.DUMP_SVG, [...document.querySelectorAll("svg[role=img]")].map((x) => x.outerHTML).join("\n"));
  });

  it("follows the value in the field", () => {
    show(60);
    expect(screen.getAllByText("= 2 credits")).toHaveLength(2);
  });
});
