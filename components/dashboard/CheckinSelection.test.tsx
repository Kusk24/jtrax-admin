/**
 * Checking a roomful of children out at once.
 *
 * The desk had one button per row, which is right for a child whose parent has
 * arrived and wrong for four o'clock, when a class ends and everyone leaves
 * together. Pressing it eight times is eight writes, and each write refetches
 * every collection — so the honest version of "everyone goes home now" is one
 * selection and one batched act.
 *
 * Same fake backend as DataProvider.test.tsx: the real provider over an
 * in-memory API, because what is being checked is that a tick, a press and a
 * refetch end with the right rows stamped and the right names on screen.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { todayISO } from "@/lib/live";

const today = todayISO();

const db: Record<string, Record<string, unknown>[]> = {};

/* Six in class and one already gone: enough to be over COLLAPSED_ROWS, so the
   "select all reaches the rows you cannot see" case is real rather than
   hypothetical. */
const NAMES = ["Anong", "Boon", "Chai", "Dao", "Eak", "Fon"];

function reset() {
  for (const key of Object.keys(db)) delete db[key];
  Object.assign(db, {
    students: [
      ...NAMES.map((name, i) => ({ student_id: `stu_${i}`, name })),
      { student_id: "stu_gone", name: "Gaew" },
    ],
    classes: [{ class_id: "cls_group", name: "Group Class", class_type: "Group" }],
    "class-sessions": [
      { session_id: "ses_1", class_id: "cls_group", session_date: today, start_time: "09:00", end_time: "10:00" },
    ],
    attendance: [
      ...NAMES.map((_, i) => ({
        attendance_id: `att_${i}`,
        student_id: `stu_${i}`,
        session_id: "ses_1",
        /* Distinct minutes: the table sorts on this, so equal times would make
           the row order depend on the sort's stability. */
        check_in_time: `${today}T02:0${i}:00Z`,
      })),
      {
        attendance_id: "att_gone",
        student_id: "stu_gone",
        session_id: "ses_1",
        check_in_time: `${today}T02:00:00Z`,
        check_out_time: `${today}T03:00:00Z`,
      },
    ],
    enrollments: [],
    "credit-transactions": [],
  });
}

/* Counted rather than mocked away: the point of batching is that six writes
   cost one refetch, and only the provider's own GETs can show that. */
let gets = 0;

vi.mock("@/lib/api", () => ({
  api: {
    get: async (path: string) => {
      if (path === "auth/me") return { userAccountId: "usr_admin" };
      gets += 1;
      return (db[path] ?? []).map((row) => ({ ...row }));
    },
    patch: async (path: string, body: Record<string, unknown>) => {
      const [collection, id] = path.split("/");
      const row = (db[collection] ?? []).find((r) => Object.values(r).includes(id));
      if (row) Object.assign(row, body);
      return row ?? {};
    },
    post: async () => ({}),
    del: async () => ({}),
    put: async () => ({}),
  },
  ApiError: class extends Error {},
}));

const { DataProvider } = await import("../DataProvider");
const { CheckinTable } = await import("./CheckinTable");
const { ErrorToastProvider } = await import("../ErrorToast");

beforeEach(() => {
  reset();
  gets = 0;
});

async function renderTable() {
  const user = userEvent.setup();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <DataProvider>
          <CheckinTable />
        </DataProvider>
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
  await waitFor(() => expect(screen.getByText("Anong")).toBeTruthy());
  /* Whatever is on screen now cost exactly one refetch, so `gets` is the price
     of a round — no need to hard-code how many collections there are. */
  return { user, round: gets };
}

const selectAll = () => screen.getByLabelText(en.dashboard.selectAll) as HTMLInputElement;
const stampedOut = () => db.attendance.filter((a) => a["check_out_time"]).length;

describe("selecting who goes home", () => {
  it("ticks everyone still in class, and nobody who has already gone", async () => {
    const { user } = await renderTable();

    await user.click(selectAll());

    expect(screen.getByText("6 students selected")).toBeTruthy();
    /* Gaew left an hour ago. There is no act left to take on her row, so it
       has no tick box to be swept up by "all". */
    expect(screen.queryByLabelText("Select Gaew")).toBeNull();
  });

  it("opens the list, so nobody is checked out unseen", async () => {
    const { user } = await renderTable();

    /* Collapsed, the table shows five of the six. */
    expect(screen.queryByText("Fon")).toBeNull();

    await user.click(selectAll());

    expect(screen.getByText("Fon")).toBeTruthy();
  });

  it("checks the whole selection out in one act", async () => {
    const { user, round } = await renderTable();
    await user.click(selectAll());

    const before = gets;
    await user.click(screen.getByRole("button", { name: "Check out 6 students" }));

    await waitFor(() => expect(stampedOut()).toBe(7));
    /* One round of GETs for the six writes, not one round each. Unbatched
       this press cost six full reloads of every collection — on the deployed
       backend, a minute of spinner for one act. */
    expect(gets - before).toBeLessThanOrEqual(round);

    await waitFor(() => expect(screen.queryByRole("button", { name: "Check Out" })).toBeNull());
    expect(screen.getAllByText("Checked out").length).toBe(7);
  });

  it("checks out only what was ticked", async () => {
    const { user } = await renderTable();

    await user.click(screen.getByLabelText("Select Anong"));
    await user.click(screen.getByLabelText("Select Chai"));

    expect(screen.getByText("2 students selected")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Check out 2 students" }));

    /* Gaew was already out; Anong and Chai make three. */
    await waitFor(() => expect(stampedOut()).toBe(3));
    expect(db.attendance.find((a) => a["attendance_id"] === "att_1")?.["check_out_time"]).toBeFalsy();
  });

  it("puts the bar away once the selection is cleared", async () => {
    const { user } = await renderTable();
    await user.click(selectAll());
    expect(screen.getByText("6 students selected")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: en.dashboard.clearSelection }));

    expect(screen.queryByText("6 students selected")).toBeNull();
    expect(selectAll().checked).toBe(false);
  });

  it("still checks one child out on their own", async () => {
    const { user } = await renderTable();

    const row = screen.getByText("Boon").closest(".jt-table-row") as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "Check Out" }));

    await waitFor(() => expect(stampedOut()).toBe(2));
    expect(db.attendance.find((a) => a["attendance_id"] === "att_1")?.["check_out_time"]).toBeTruthy();
  });
});
