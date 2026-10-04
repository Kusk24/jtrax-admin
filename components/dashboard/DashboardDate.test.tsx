/**
 * The dashboard on a day other than today.
 *
 * The top bar's date chip picks the day; the class list and the check-in
 * register follow it. A past day is a record — nothing is checked out on it;
 * a later day shows its classes as Scheduled.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { fmtDate, todayISO } from "@/lib/live";

function shift(days: number): string {
  const [y, m, d] = todayISO().split("-").map(Number);
  const at = new Date(y, m - 1, d + days);
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
}
const PAST = shift(-3);
const FUTURE = shift(3);

const empty: Record<string, unknown>[] = [];
const raw = {
  students: [{ student_id: "mini", name: "Mini" }],
  classes: [
    { class_id: "master", name: "Master", class_type: "Master" },
    { class_id: "slayer", name: "King Slayer", class_type: "Group" },
  ],
  classSessions: [
    { session_id: "p1", class_id: "slayer", session_date: PAST, start_time: "13:30", end_time: "14:45", session_status: "Ongoing" },
    { session_id: "p2", class_id: "master", session_date: PAST, start_time: "15:00", end_time: "17:00", session_status: "Ongoing" },
    { session_id: "f1", class_id: "master", session_date: FUTURE, start_time: "10:00", end_time: "12:00", session_status: "Ongoing" },
  ],
  attendance: [{ attendance_id: "a1", student_id: "mini", session_id: "p2", check_in_time: `${PAST}T08:00:00Z`, check_out_time: null }],
  enrollments: empty, creditTransactions: empty, parents: empty, parentContacts: empty, studentParents: empty,
  creditPackages: empty, payments: empty, teachers: empty, admins: empty, accounts: empty, announcements: empty,
  tournaments: empty, tournamentCategories: empty, tournamentRegistrations: empty, practiceActivities: empty, systemConfig: empty,
};

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("../DataProvider", () => ({
  useData: () => ({
    raw,
    todaysClasses: [],
    checkins: [],
    batch: async (job: () => Promise<unknown>) => job(),
    update: vi.fn(),
    creditRules: { lowCredit: 3, expiringDays: 7, inactiveDays: 30, certSessions: 50, maxNegativeCredit: 0, checkoutRoundMinutes: 15 },
  }),
}));

const { DashboardDateProvider } = await import("../DashboardDate");
const { TodaysClasses } = await import("./TodaysClasses");
const { CheckinTable } = await import("./CheckinTable");
const { ErrorToastProvider } = await import("../ErrorToast");

function onDay(day: string, children: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <DashboardDateProvider initialDay={day}>{children}</DashboardDateProvider>
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
}

describe("the class list on another day", () => {
  it("shows that day's classes, latest first, as Finished on a past day", () => {
    onDay(PAST, <TodaysClasses onViewClass={() => {}} />);

    expect(screen.getByText(`Classes · ${fmtDate(PAST)}`)).toBeTruthy();
    const names = [...document.querySelectorAll(".jt-class-card")].map((card) =>
      within(card as HTMLElement).queryByText("Master") ? "Master" : "King Slayer",
    );
    expect(names).toEqual(["Master", "King Slayer"]);
    expect(screen.queryByText("Ongoing", { selector: ".jt-class-card *" })).toBeNull();
  });

  it("shows a later day's classes as Scheduled", () => {
    onDay(FUTURE, <TodaysClasses onViewClass={() => {}} />);

    expect(screen.getByText(`Classes · ${fmtDate(FUTURE)}`)).toBeTruthy();
    const card = document.querySelector(".jt-class-card") as HTMLElement;
    expect(within(card).getByText("Scheduled")).toBeTruthy();
  });
});

describe("the check-in register on a past day", () => {
  it("lists that day's visits, with nothing to check out", () => {
    onDay(PAST, <CheckinTable />);

    expect(screen.getByText(`Check-ins · ${fmtDate(PAST)}`)).toBeTruthy();
    expect(screen.getByText("Mini")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Check Out/ })).toBeNull();
  });
});
