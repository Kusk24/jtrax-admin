/**
 * Checking a child out from the record of a class that has already happened.
 *
 * Reported: the dashboard's Check Out button is the only one there is, and the
 * dashboard is built around `todayISO()`. Miss it before midnight and the
 * attendance row keeps the child in the room for good — the office reads its
 * own history and sees children who never went home.
 *
 * So the act moved to where the evidence is: the session detail panel, on the
 * row that is still reporting "still in class".
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

/* Deliberately not today. The whole point is a record the dashboard can no
   longer reach. */
const LONG_AGO = "2026-08-20";

/* Anong was never checked out; Beam was. One of each, because the button has
   to appear on exactly one of them. */
const raw = {
  students: [
    { student_id: "stu_1", name: "Anong Sri" },
    { student_id: "stu_2", name: "Beam Chai" },
  ],
  parents: [],
  parentContacts: [],
  studentParents: [],
  classes: [{ class_id: "beg", name: "Beginner" }],
  classSessions: [
    { session_id: "s_1", class_id: "beg", session_date: LONG_AGO, start_time: "10:00", end_time: "11:00" },
  ],
  attendance: [
    {
      attendance_id: "att_1",
      session_id: "s_1",
      student_id: "stu_1",
      check_in_time: `${LONG_AGO}T10:02:00Z`,
      check_out_time: "",
    },
    {
      attendance_id: "att_2",
      session_id: "s_1",
      student_id: "stu_2",
      check_in_time: `${LONG_AGO}T10:04:00Z`,
      check_out_time: `${LONG_AGO}T11:01:00Z`,
    },
  ],
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

function renderPage(update = vi.fn()) {
  useDataMock.mockReturnValue({
    raw,
    students: [
      { id: "stu_1", name: "Anong Sri" },
      { id: "stu_2", name: "Beam Chai" },
    ],
    create: vi.fn(),
    update,
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
  return { user, update };
}

/** Open the one session's detail panel, the way the office does: click its row. */
async function openDetail(user: ReturnType<typeof userEvent.setup>) {
  const row = document.querySelector(".jt-table-row") as HTMLElement;
  await user.click(row);
  return screen.getByRole("dialog");
}

const checkOutFor = (dialog: HTMLElement, name: string) =>
  within(dialog).queryByLabelText(en.classHistory.checkOutAttendee.replace("{name}", name));

beforeEach(() => useDataMock.mockReset());

describe("checking out from a past class", () => {
  it("offers the act on a child the record still has in the room", async () => {
    const { user } = renderPage();
    const dialog = await openDetail(user);

    expect(checkOutFor(dialog, "Anong Sri")).not.toBeNull();
  });

  /* A row that already has a time is a finished afternoon, not a pending act
     — the same rule the dashboard's tick-boxes follow. Offering the button
     there invites overwriting a real check-out with the time of the press. */
  it("does not offer it on a child who was already checked out", async () => {
    const { user } = renderPage();
    const dialog = await openDetail(user);

    expect(checkOutFor(dialog, "Beam Chai")).toBeNull();
  });

  it("stamps check_out_time on that child's attendance row", async () => {
    const { user, update } = renderPage();
    const dialog = await openDetail(user);

    await user.click(checkOutFor(dialog, "Anong Sri")!);

    expect(update).toHaveBeenCalledTimes(1);
    const [collection, id, patch] = update.mock.calls[0];
    expect(collection).toBe("attendance");
    expect(id).toBe("att_1");
    expect(Object.keys(patch)).toEqual(["check_out_time"]);
    /* The press is the timestamp, so assert it parses as a real instant
       rather than pinning a clock the test does not control. */
    expect(Number.isNaN(Date.parse(patch.check_out_time as string))).toBe(false);
  });

  /* A write here refetches every collection, so a refusal that said nothing
     would read as the panel having simply ignored the press — the freeze this
     console has been bitten by before. */
  it("says so when the write is refused", async () => {
    const update = vi.fn().mockRejectedValue(new Error("nope"));
    const { user } = renderPage(update);
    const dialog = await openDetail(user);

    await user.click(checkOutFor(dialog, "Anong Sri")!);

    expect(await screen.findByText(en.common.saveFailed)).toBeTruthy();
  });
});
