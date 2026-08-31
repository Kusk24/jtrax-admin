/**
 * Which courses the Class History filter offers.
 *
 * Reported: every retired course is still in this list, unlike the Students
 * screen's. It read `raw.classes` straight, so it was the last place in the
 * console presenting a course nobody can enrol in as a thing you could pick —
 * on an academy that has retired a few, most of the filter was dead names.
 *
 * They cannot simply go: a retired course keeps its past
 * (`0007-retire-a-row-instead-of-deleting-it`), so its classes are in this
 * history for good. They collect under one Others entry instead.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const today = "2026-08-20";

/* Beginner still runs. Saturday Camp was retired in February, and Old Club's
   course row is gone entirely — two different ways a class ends up with no
   live course, which land in the same place for the same reason. */
const raw = {
  students: [{ student_id: "stu_1", name: "Anong Sri" }],
  parents: [],
  parentContacts: [],
  studentParents: [],
  classes: [
    { class_id: "beg", name: "Beginner" },
    { class_id: "camp", name: "Saturday Camp", archived_at: "2026-02-01" },
  ],
  classSessions: [
    { session_id: "s_beg", class_id: "beg", session_date: today, start_time: "10:00", end_time: "11:00" },
    { session_id: "s_camp", class_id: "camp", session_date: today, start_time: "13:00", end_time: "15:00" },
    { session_id: "s_orphan", class_id: "gone", session_date: today, start_time: "16:00", end_time: "17:00" },
  ],
  attendance: [],
  enrollments: [],
  creditTransactions: [],
  creditPackages: [],
  payments: [],
  teachers: [],
  admins: [],
  accounts: [],
  announcements: [],
  tournaments: [],
  tournamentCategories: [],
  tournamentRegistrations: [],
  practiceActivities: [],
  systemConfig: [],
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/classhistory",
}));

const useDataMock = vi.fn();
vi.mock("@/components/DataProvider", () => ({ useData: () => useDataMock() }));

const { ClassHistoryPage } = await import("./ClassHistoryPage");
const { ErrorToastProvider } = await import("../ErrorToast");

function renderPage(classes = raw.classes) {
  useDataMock.mockReturnValue({
    raw: { ...raw, classes },
    students: [{ id: "stu_1", name: "Anong Sri" }],
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    batch: vi.fn(async (job: () => Promise<unknown>) => job()),
  });
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

const filter = () => screen.getByLabelText(en.classHistory.filterByClass) as HTMLSelectElement;
const optionLabels = () => Array.from(filter().options).map((o) => o.textContent);

/** The value behind an option, found by the label the office reads. */
const valueOf = (label: string) =>
  Array.from(filter().options).find((o) => o.textContent === label)?.value ?? "__missing__";

/* Course names appear twice on this screen — once in the filter, once per row
   — so the rows have to be read as rows rather than as text anywhere. */
const rowNames = () =>
  Array.from(document.querySelectorAll(".jt-table-row")).map((el) => el.textContent ?? "");
const showing = (name: string) => rowNames().some((t) => t.includes(name));

beforeEach(() => useDataMock.mockReset());

describe("the course filter", () => {
  it("offers the courses the academy still runs", () => {
    renderPage();
    expect(optionLabels()).toContain("Beginner");
  });

  it("does not offer a retired course by name", () => {
    renderPage();
    expect(optionLabels()).not.toContain("Saturday Camp");
  });

  it("collects everything else under Others", () => {
    renderPage();
    expect(optionLabels()).toContain(en.classHistory.otherCourses);
  });

  /* An Others that always finds nothing is a dead option, and every academy
     that has never retired a course would be given one. */
  it("leaves Others out when there is nothing in it", () => {
    /* Every class on file belongs to a course that still runs. */
    renderPage([
      { class_id: "beg", name: "Beginner" },
      { class_id: "camp", name: "Saturday Camp" },
      { class_id: "gone", name: "Old Club" },
    ]);
    expect(optionLabels()).not.toContain(en.classHistory.otherCourses);
  });
});

describe("filtering by a course", () => {
  it("narrows to that course's classes", async () => {
    const user = renderPage();
    await user.selectOptions(filter(), "beg");

    expect(showing("Beginner")).toBe(true);
    expect(showing("Saturday Camp")).toBe(false);
  });

  /* The whole point of keeping them reachable: the classes are still in the
     history, and the office still has to be able to find them. */
  it("finds the retired course's classes under Others", async () => {
    const user = renderPage();
    await user.selectOptions(filter(), valueOf(en.classHistory.otherCourses));

    expect(showing("Saturday Camp")).toBe(true);
    expect(showing("Beginner")).toBe(false);
  });

  /* A class whose course row has gone entirely has no live name to file it
     under either, so it lands in the same place. */
  it("puts a class with no course at all under Others too", async () => {
    const user = renderPage();
    await user.selectOptions(filter(), valueOf(en.classHistory.otherCourses));

    expect(rowNames()).toHaveLength(2);
  });

  it("shows every class when nothing is chosen", () => {
    renderPage();
    expect(showing("Beginner")).toBe(true);
    expect(showing("Saturday Camp")).toBe(true);
    expect(rowNames()).toHaveLength(3);
  });
});
