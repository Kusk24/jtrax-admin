/**
 * The dashboard interactions taken directly from the approved reference:
 * status legends filter the roster, and class scrolling starts after row two.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { ClassDef, Student } from "@/lib/data";

const data = vi.hoisted(() => ({
  students: [] as Student[],
  todaysClasses: [] as ClassDef[],
}));

vi.mock("../DataProvider", () => ({
  useData: () => data,
}));

/**
 * `TodaysClasses` reads "now" from `useMinuteClock`, which reads the real
 * wall clock — right, in the app, and wrong in a test, where a fixture's
 * "10:00 AM – 11:00 AM" is only "Ongoing" for as long as the suite happens to
 * run inside that hour. Mocking the hook's return, rather than faking the
 * system clock, sidesteps a real trap: `userEvent`'s own click delay runs on
 * real timers, so `vi.useFakeTimers()` across a file with `userEvent.click`
 * calls just hangs them.
 */
const clock = vi.hoisted(() => ({ now: new Date(2026, 8, 18, 10, 15) }));

vi.mock("@/lib/class-progress", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/class-progress")>();
  return { ...real, useMinuteClock: () => clock.now };
});

const { StudentStatus } = await import("./StudentStatus");
const { TodaysClasses } = await import("./TodaysClasses");

const student = (status: Student["status"], index: number): Student => ({
  id: `stu_${index}`,
  name: `Student ${index}`,
  branch: "JCA",
  className: "Beginner",
  credit: 8,
  expires: "2026-12-01",
  status,
  age: 8,
  dateOfBirth: "2018-01-01",
  level: "Beginner",
  school: "School",
  fideId: "",
  parentId: "",
  parentName: "Parent",
  parentRelation: "Guardian",
  parentPhone: "",
  parentEmail: "",
  parentLineId: "",
  joinedDate: "2026-01-01",
});

const classDef = (index: number): ClassDef => ({
  id: `ses_${index}`,
  classId: `cls_${index}`,
  category: "Beginner",
  name: `Class ${index}`,
  time: "10:00 AM – 11:00 AM",
  status: "Ongoing",
  students: [],
  more: 0,
  teacher: "Teacher",
  room: "Room 1",
  roster: [],
});

function messages(children: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {children}
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  cleanup();
  data.students = [];
  data.todaysClasses = [];
  /* Inside classDef()'s own 10:00–11:00 AM window by default, so a fixture
     reads Ongoing unless a test deliberately moves the clock past it. */
  clock.now = new Date(2026, 8, 18, 10, 15);
});

describe("student status shortcuts", () => {
  it("links every ring legend to the matching filtered roster", () => {
    data.students = ["Normal", "Low Credit", "Expiring", "Expired", "Inactive"].map(
      (status, index) => student(status as Student["status"], index),
    );
    render(messages(<StudentStatus />));

    expect(screen.getByRole("link", { name: "Show students with status In good standing" }).getAttribute("href"))
      .toBe("/students?status=Normal");
    expect(screen.getByRole("link", { name: "Show students with status Low credit" }).getAttribute("href"))
      .toBe("/students?status=Low%20Credit");
    expect(screen.getAllByRole("link")).toHaveLength(5);
  });

  /* The only way either reminder reaches a family is somebody pressing one of
     these. A dashboard rewrite dropped them once without anyone noticing, and
     for a while the expiry reminder could not be sent at all. */
  it("offers both manual credit reminders", () => {
    data.students = [student("Low Credit", 0)];
    render(messages(<StudentStatus />));
    expect(screen.getByRole("button", { name: /remind: low credit/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /remind: credits expiring/i })).toBeDefined();
  });
});

describe("today's compact class list", () => {
  it("does not scroll a normal two-class day", () => {
    data.todaysClasses = [classDef(1), classDef(2)];
    const { container } = render(messages(<TodaysClasses onViewClass={vi.fn()} />));

    const list = container.querySelector(".jt-class-list")!;
    expect(list.classList.contains("is-scrollable")).toBe(false);
    expect(list.getAttribute("tabindex")).toBeNull();
  });

  it("makes only the class list scroll when a third class is added", () => {
    data.todaysClasses = [classDef(1), classDef(2), classDef(3)];
    const { container } = render(messages(<TodaysClasses onViewClass={vi.fn()} />));

    const list = container.querySelector(".jt-class-list")!;
    expect(list.classList.contains("is-scrollable")).toBe(true);
    expect(list.getAttribute("tabindex")).toBe("0");
  });

  it("shows an explicit empty state when there are no classes", () => {
    render(messages(<TodaysClasses onViewClass={vi.fn()} />));

    expect(screen.getByText("No classes today")).toBeTruthy();
  });

  /* Creating a class moved out to the rail's own card, which sits directly
     above this list — the header button was the same action twice within
     200px. */
  it("leaves creating a class to the rail's card", () => {
    data.todaysClasses = [classDef(1)];
    render(messages(<TodaysClasses onViewClass={vi.fn()} />));

    expect(screen.queryByRole("button", { name: "Create Class" })).toBeNull();
  });
});

describe("today's classes filter", () => {
  const mixed = () => [
    classDef(1),
    { ...classDef(2), status: "Finished" as const },
    { ...classDef(3), status: "Finished" as const },
  ];

  it("counts every state, and starts on All", () => {
    data.todaysClasses = mixed();
    render(messages(<TodaysClasses onViewClass={vi.fn()} />));

    expect(screen.getByRole("radio", { name: "All (3)" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Ongoing (1)" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Finished (2)" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Class \d/ })).toHaveLength(3);
  });

  it("shows only the chosen state", async () => {
    data.todaysClasses = mixed();
    render(messages(<TodaysClasses onViewClass={vi.fn()} />));

    await userEvent.click(screen.getByRole("radio", { name: "Ongoing (1)" }));

    const shown = screen.getAllByRole("button", { name: /Class \d/ });
    expect(shown).toHaveLength(1);
    expect(shown[0].textContent).toContain("Class 1");
  });

  /* The counts describe the day, not the current view, or switching filters
     would renumber the pills you are choosing between. */
  it("keeps the counts on the whole day while a filter is on", async () => {
    data.todaysClasses = mixed();
    render(messages(<TodaysClasses onViewClass={vi.fn()} />));

    await userEvent.click(screen.getByRole("radio", { name: "Finished (2)" }));

    expect(screen.getByRole("radio", { name: "All (3)" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Ongoing (1)" })).toBeTruthy();
  });

  it("says a filter matched nothing without borrowing the empty day's copy", async () => {
    data.todaysClasses = [classDef(1)]; // Ongoing only
    render(messages(<TodaysClasses onViewClass={vi.fn()} />));

    await userEvent.click(screen.getByRole("radio", { name: "Finished (0)" }));

    expect(screen.getByText("No classes match this filter.")).toBeTruthy();
    expect(screen.queryByText("No classes today")).toBeNull();
  });

  it("offers no filter at all on a day with no classes", () => {
    render(messages(<TodaysClasses onViewClass={vi.fn()} />));

    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.getByText("No classes today")).toBeTruthy();
  });
});

describe("a running class shows how far through it is", () => {
  it("measures the bar against the slot, not the clock", () => {
    clock.now = new Date(2026, 8, 18, 10, 15);
    data.todaysClasses = [classDef(1)]; // 10:00 AM – 11:00 AM, Ongoing

    render(messages(<TodaysClasses onViewClass={vi.fn()} />));

    const bar = screen.getByRole("progressbar", { name: "Time passed" });
    expect(bar.getAttribute("aria-valuenow")).toBe("15");
    expect(bar.getAttribute("aria-valuemax")).toBe("60");
    expect(screen.getByText("15 min / 60 min")).toBeTruthy();
  });

  it("shows no bar on a class that has already finished", () => {
    clock.now = new Date(2026, 8, 18, 10, 15);
    data.todaysClasses = [{ ...classDef(1), status: "Finished" as const }];

    render(messages(<TodaysClasses onViewClass={vi.fn()} />));

    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  /**
   * The point of this whole feature: `session_status` stays "Ongoing" in the
   * database until someone sets it otherwise, so a class whose slot has run
   * out is still "Ongoing" by the row's own account. The card has to read the
   * clock instead of trusting that field once the slot is over.
   */
  it("reads as Finished once the slot is over, even while session_status still says Ongoing", () => {
    clock.now = new Date(2026, 8, 18, 11, 5); // 5 minutes past the 11:00 end
    data.todaysClasses = [classDef(1)]; // status: "Ongoing" in the fixture

    const { container } = render(messages(<TodaysClasses onViewClass={vi.fn()} />));

    /* Scoped to the card itself — "Finished" is also a filter pill's label,
       and getByText is not picky about which "Finished" it means. */
    const card = container.querySelector(".jt-class-card")!;
    expect(card.textContent).toContain("Finished");
    expect(card.textContent).not.toContain("Ongoing");
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
