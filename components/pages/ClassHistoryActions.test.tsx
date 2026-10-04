/* Class History: Add and Edit use the dashboard's class panel, and only a
   cancelled class can be removed. */
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const day = "2026-08-20";
const raw = {
  students: [], parents: [], parentContacts: [], studentParents: [], enrollments: [],
  creditTransactions: [], creditPackages: [], payments: [], teachers: [], admins: [], accounts: [],
  announcements: [], tournaments: [], tournamentCategories: [], tournamentRegistrations: [],
  practiceActivities: [], systemConfig: [], attendance: [],
  classes: [
    { class_id: "beg", name: "Beginner" },
    { class_id: "king", name: "King Slayer" },
    { class_id: "master", name: "Master" },
  ],
  classSessions: [
    /* Still to come: editable. */
    { session_id: "s_live", class_id: "beg", session_date: "2099-01-10", start_time: "10:00", end_time: "11:00" },
    /* Already over: read-only, like the dashboard. */
    { session_id: "s_done", class_id: "master", session_date: day, start_time: "09:00", end_time: "10:00" },
  ],
  cancelledSessions: [
    { session_id: "s_off", class_id: "king", session_date: day, start_time: "13:00", end_time: "14:00", cancelled_at: "2026-08-19T00:00:00Z" },
  ],
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/classhistory",
}));
vi.mock("@/components/DataProvider", () => ({
  useData: () => ({
    raw,
    students: [],
    todaysClasses: [],
    creditRules: { lowCredit: 3, expiringDays: 7, inactiveDays: 30, certSessions: 50, maxNegativeCredit: 0 },
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    refresh: vi.fn(),
    batch: vi.fn(async (job: () => Promise<unknown>) => job()),
  }),
}));

const { ClassHistoryPage } = await import("./ClassHistoryPage");
const { ErrorToastProvider } = await import("../ErrorToast");

function renderPage() {
  const user = userEvent.setup();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <ClassHistoryPage />
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
  return user;
}

describe("class history actions", () => {
  it("edits only a class not yet over, and removes only a cancelled one", () => {
    renderPage();
    expect(screen.getAllByRole("button", { name: /^Delete / })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /^Delete .*King Slayer/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Edit .*King Slayer/ })).toBeNull();
    expect(screen.getByRole("button", { name: /^Edit .*Beginner/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Edit .*Master/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Delete .*Master/ })).toBeNull();
  });

  it("adds a class on the dashboard's panel, with a date from today on", async () => {
    const user = renderPage();
    await user.click(screen.getByRole("button", { name: en.classHistory.addSession }));
    const date = screen.getByLabelText(/^Date( \*)?$/) as HTMLInputElement;
    expect(date.min).toBe(date.value);
    expect(screen.getByLabelText(/^Course( \*)?$/)).toBeTruthy();
    expect(within(document.body).getAllByRole("button", { name: "Create Class" }).length).toBeGreaterThan(0);
  });
});

describe("a cancelled class in the table", () => {
  it("is tagged after its name, with no attendance count", () => {
    renderPage();
    const tag = screen.getByText("Cancelled");
    expect(tag.closest("span")?.parentElement?.textContent).toContain("King Slayer");
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
