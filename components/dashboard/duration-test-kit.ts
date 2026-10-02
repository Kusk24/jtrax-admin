/**
 * Driving the Duration control from a test the way the desk does: open a
 * half, pick a preset; or read what the two halves hold.
 */
import { screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

type User = ReturnType<typeof userEvent.setup>;
type Part = "Hours" | "Minutes";

export const durationPart = (part: Part) =>
  screen.getByRole("button", { name: new RegExp(`^${part}:`) }) as HTMLButtonElement;

export const queryDurationPart = (part: Part) =>
  screen.queryByRole("button", { name: new RegExp(`^${part}:`) }) as HTMLButtonElement | null;

/** The length the two halves hold, in minutes. */
export function durationMinutes(): number {
  const number = (part: Part) => Number(/(\d+)/.exec(durationPart(part).getAttribute("aria-label") ?? "")?.[1] ?? NaN);
  return number("Hours") * 60 + number("Minutes");
}

export async function pickDuration(user: User, part: Part, value: number) {
  await user.click(durationPart(part));
  await user.click(screen.getByRole("option", { name: `${value} ${part === "Hours" ? "hr" : "min"}` }));
}

/** Sets a whole length the way the desk would: hours, then minutes. */
export async function chooseLength(user: User, total: number) {
  await pickDuration(user, "Hours", Math.floor(total / 60));
  await pickDuration(user, "Minutes", total % 60);
}

/** The presets a half offers once opened, and which can be picked. */
export async function presetsOf(user: User, part: Part): Promise<{ label: string; allowed: boolean }[]> {
  await user.click(durationPart(part));
  return within(screen.getByRole("listbox", { name: part })).getAllByRole("option").map((o) => ({
    label: o.textContent ?? "",
    allowed: o.getAttribute("aria-disabled") !== "true",
  }));
}
