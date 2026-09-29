/**
 * The Practice tab on a student's profile: streak, the week in numbers, a
 * month of days, weekly progress and recent activity — and no points, which
 * only puzzles earn and games never do.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const practiceActivities = [
  { student_id: "stu_mini", activity_date: "2026-09-27", puzzles_completed: 5, minutes_practiced: 18 },
  { student_id: "stu_mini", activity_date: "2026-09-26", puzzles_completed: 3, minutes_practiced: 12 },
  { student_id: "stu_mini", activity_date: "2026-09-25", puzzles_completed: 5, minutes_practiced: 20 },
];

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({ raw: { practiceActivities } }),
}));

const history = vi.fn();
vi.mock("@/lib/api", () => ({ api: { get: (path: string) => history(path) } }));

const { PracticeTab } = await import("./PracticeTab");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-27T12:00:00"));
  history.mockResolvedValue({
    history: [
      { kind: "puzzle", id: "p1", at: "2026-09-27 03:05:00", startedAt: "2026-09-27 03:00:00", day: "2026-09-27", source: "daily", against: "1200", result: "solved" },
      { kind: "solo", id: "g1", at: "2026-09-26 10:00:00", startedAt: "2026-09-26T09:35:00Z", day: "2026-09-26", against: "novice", result: "1-0", moves: 30 },
    ],
  });
});
afterEach(() => vi.useRealTimers());

function renderTab() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PracticeTab studentId="stu_mini" />
    </NextIntlClientProvider>,
  );
  return userEvent.setup();
}

describe("the practice tab", () => {
  it("shows the streak and the overall totals", async () => {
    renderTab();
    const streakCard = screen.getByText("Day streak").parentElement!;
    expect(within(streakCard).getByText("3")).toBeDefined();
    expect(screen.queryByText(/vs the 7 before/)).toBeNull();
    const puzzlesCard = screen.getByText("Total puzzles solved").parentElement!;
    expect(within(puzzlesCard).getByText("13")).toBeDefined();
    expect(await screen.findByText("1 h 15 min")).toBeDefined(); // 50 puzzle minutes + a 25-minute game
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByText(/points/i)).toBeNull();
  });

  it("reads the history for this student only", () => {
    renderTab();
    expect(history).toHaveBeenCalledWith("students/stu_mini/history");
  });

  it("lists recent activity by kind", async () => {
    renderTab();
    const daily = await screen.findByText("Daily Challenge");
    expect(daily).toBeDefined();
    expect(screen.getByText("Play vs Computer")).toBeDefined();
    expect(screen.getByText("25 min")).toBeDefined();
  });

  it("shows the date on every square", () => {
    renderTab();
    const cells = screen.getAllByRole("gridcell");
    expect(cells).toHaveLength(30); // September
    expect(cells[25].textContent).toBe("26");
  });

  it("shows a day's detail on hover, and nothing until then", async () => {
    const user = renderTab();
    expect(screen.queryByRole("tooltip")).toBeNull();

    await user.hover(await screen.findByRole("gridcell", { name: /^26 Sept? 2026/ }));
    const tip = await screen.findByRole("tooltip");
    expect(within(tip).getByText(/26 Sept? 2026/)).toBeDefined();
    expect(within(tip).getByText("3 puzzles solved")).toBeDefined();
    expect(within(tip).getByText("1 game played")).toBeDefined();

    await user.unhover(screen.getByRole("grid"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("says so on a day with no practice", async () => {
    const user = renderTab();
    await user.hover(screen.getByRole("gridcell", { name: /^20 Sept? 2026/ }));
    expect(within(screen.getByRole("tooltip")).getByText("No practice this day.")).toBeDefined();
  });

  it("does not let the month move past this one", () => {
    renderTab();
    expect((screen.getByRole("button", { name: "Next month" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
